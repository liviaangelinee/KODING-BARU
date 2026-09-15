"""Backend API tests for new features: PO Pabrik, Pengeluaran, Laba, HPP snapshot."""
import pytest
from conftest import BASE_URL


class TestHargaPabrik:
    """Test that products have harga_pabrik field in variants."""
    
    def test_products_have_harga_pabrik_field(self, auth_client):
        """All product variants must have harga_pabrik field."""
        r = auth_client.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        products = r.json()
        assert len(products) > 0, "No products found"
        
        for p in products:
            assert "variants" in p
            for v in p["variants"]:
                assert "harga_pabrik" in v, f"Missing harga_pabrik in {p['nama']} {v['label']}"
                assert isinstance(v["harga_pabrik"], (int, float))
    
    def test_create_product_with_harga_pabrik(self, auth_client):
        """Can create product with harga_pabrik."""
        payload = {
            "nama": "TEST_HARGA_PABRIK",
            "variants": [{
                "label": "TEST_VAR",
                "harga_pabrik": 35000,
                "harga_grosir": 45000,
                "harga_so": 47000,
                "harga_retail": 50000
            }]
        }
        r = auth_client.post(f"{BASE_URL}/api/products", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["variants"][0]["harga_pabrik"] == 35000
        
        # Cleanup
        auth_client.delete(f"{BASE_URL}/api/products/{p['id']}")


class TestHPPSnapshot:
    """Test the critical HPP snapshot logic."""
    
    def test_transaction_captures_hpp_at_creation(self, auth_client):
        """Transaction must snapshot harga_pabrik at creation time."""
        # Create a product with harga_pabrik
        prod_payload = {
            "nama": "TEST_HPP_PRODUCT",
            "variants": [{
                "label": "1000",
                "harga_pabrik": 30000,
                "harga_grosir": 40000,
                "harga_so": 42000,
                "harga_retail": 45000
            }]
        }
        r = auth_client.post(f"{BASE_URL}/api/products", json=prod_payload)
        assert r.status_code == 200
        product = r.json()
        pid = product["id"]
        
        # Create a customer
        cust_payload = {"nama": "TEST_HPP_CUST", "default_price_type": "retail"}
        r = auth_client.post(f"{BASE_URL}/api/customers", json=cust_payload)
        assert r.status_code == 200
        customer = r.json()
        cid = customer["id"]
        
        # Create transaction
        txn_payload = {
            "tanggal": "2026-09-15",
            "customer_id": cid,
            "customer_nama": "TEST_HPP_CUST",
            "items": [{
                "product_id": pid,
                "product_nama": "TEST_HPP_PRODUCT",
                "variant_label": "1000",
                "price_type": "retail",
                "harga_satuan": 45000,
                "qty": 10,
                "subtotal": 450000
            }],
            "status": "lunas",
            "catatan": ""
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=txn_payload)
        assert r.status_code == 200, r.text
        txn = r.json()
        tid = txn["id"]
        
        # Verify HPP snapshot
        assert "total_hpp" in txn, "Missing total_hpp in transaction response"
        assert "laba_kotor" in txn, "Missing laba_kotor in transaction response"
        assert txn["items"][0]["harga_pabrik"] == 30000, "HPP not captured"
        assert txn["items"][0]["hpp_subtotal"] == 300000, "HPP subtotal incorrect"
        assert txn["total_hpp"] == 300000, "Total HPP incorrect"
        assert txn["laba_kotor"] == 150000, "Laba kotor = 450000 - 300000 should be 150000"
        
        # NOW CHANGE the product's harga_pabrik
        prod_payload["variants"][0]["harga_pabrik"] = 35000  # Changed from 30000 to 35000
        r = auth_client.put(f"{BASE_URL}/api/products/{pid}", json=prod_payload)
        assert r.status_code == 200
        
        # Verify the EXISTING transaction's HPP did NOT change
        r = auth_client.get(f"{BASE_URL}/api/transactions")
        assert r.status_code == 200
        txns = r.json()
        saved_txn = next((t for t in txns if t["id"] == tid), None)
        assert saved_txn is not None
        assert saved_txn["total_hpp"] == 300000, "Historic HPP changed! Should stay frozen at 300000"
        assert saved_txn["laba_kotor"] == 150000, "Historic laba_kotor changed! Should stay frozen"
        
        # Create a NEW transaction with the same product
        txn_payload2 = {
            "tanggal": "2026-09-16",
            "customer_id": cid,
            "customer_nama": "TEST_HPP_CUST",
            "items": [{
                "product_id": pid,
                "product_nama": "TEST_HPP_PRODUCT",
                "variant_label": "1000",
                "price_type": "retail",
                "harga_satuan": 45000,
                "qty": 10,
                "subtotal": 450000
            }],
            "status": "lunas",
            "catatan": ""
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=txn_payload2)
        assert r.status_code == 200
        txn2 = r.json()
        
        # New transaction should use the NEW harga_pabrik (35000)
        assert txn2["items"][0]["harga_pabrik"] == 35000, "New transaction should use updated price"
        assert txn2["total_hpp"] == 350000, "New HPP should be 35000 * 10 = 350000"
        assert txn2["laba_kotor"] == 100000, "New laba = 450000 - 350000 = 100000"
        
        # Cleanup
        auth_client.delete(f"{BASE_URL}/api/transactions/{tid}")
        auth_client.delete(f"{BASE_URL}/api/transactions/{txn2['id']}")
        auth_client.delete(f"{BASE_URL}/api/products/{pid}")
        auth_client.delete(f"{BASE_URL}/api/customers/{cid}")


class TestPOPabrik:
    """Test Purchase Order to factory endpoints."""
    po_ids = []
    
    def test_create_po(self, auth_client):
        """Create a purchase order."""
        payload = {
            "tanggal": "2026-09-10",
            "pabrik": "TEST_PABRIK_A",
            "no_po": "PO-TEST-001",
            "items": [{
                "product_id": "test_pid",
                "product_nama": "TEST_PRODUCT",
                "variant_label": "1000",
                "harga_pabrik": 30000,
                "qty": 100,
                "subtotal": 3000000
            }],
            "status": "belum_lunas",
            "catatan": "Test PO"
        }
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json=payload)
        assert r.status_code == 200, r.text
        po = r.json()
        TestPOPabrik.po_ids.append(po["id"])
        
        assert po["pabrik"] == "TEST_PABRIK_A"
        assert po["total"] == 3000000
        assert po["status"] == "belum_lunas"
        assert "_id" not in po
    
    def test_list_po(self, auth_client):
        """List purchase orders."""
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders")
        assert r.status_code == 200
        pos = r.json()
        assert isinstance(pos, list)
        assert any(p["id"] == TestPOPabrik.po_ids[0] for p in pos)
    
    def test_po_filters(self, auth_client):
        """Test PO filters: date, pabrik, status."""
        # Create another PO
        payload = {
            "tanggal": "2026-09-20",
            "pabrik": "TEST_PABRIK_B",
            "no_po": "PO-TEST-002",
            "items": [{
                "product_nama": "TEST_PRODUCT_2",
                "variant_label": "500",
                "harga_pabrik": 25000,
                "qty": 50,
                "subtotal": 1250000
            }],
            "status": "lunas",
            "catatan": ""
        }
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json=payload)
        assert r.status_code == 200
        po2 = r.json()
        TestPOPabrik.po_ids.append(po2["id"])
        
        # Filter by date
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders", 
                           params={"date_from": "2026-09-15", "date_to": "2026-09-25"})
        assert r.status_code == 200
        pos = r.json()
        assert po2["id"] in [p["id"] for p in pos]
        assert all("2026-09-15" <= p["tanggal"] <= "2026-09-25" for p in pos)
        
        # Filter by pabrik
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders", params={"pabrik": "TEST_PABRIK_B"})
        assert r.status_code == 200
        pos = r.json()
        assert all(p["pabrik"] == "TEST_PABRIK_B" for p in pos)
        
        # Filter by status
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders", params={"status": "lunas"})
        assert r.status_code == 200
        pos = r.json()
        assert all(p["status"] == "lunas" for p in pos)
    
    def test_po_status_toggle(self, auth_client):
        """Toggle PO payment status."""
        po_id = TestPOPabrik.po_ids[0]
        
        # Toggle to lunas
        r = auth_client.patch(f"{BASE_URL}/api/purchase-orders/{po_id}/status", 
                             json={"status": "lunas"})
        assert r.status_code == 200, r.text
        
        # Verify
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders")
        pos = r.json()
        po = next(p for p in pos if p["id"] == po_id)
        assert po["status"] == "lunas"
        
        # Toggle back
        r = auth_client.patch(f"{BASE_URL}/api/purchase-orders/{po_id}/status", 
                             json={"status": "belum_lunas"})
        assert r.status_code == 200
    
    def test_update_po(self, auth_client):
        """Update a purchase order."""
        po_id = TestPOPabrik.po_ids[0]
        payload = {
            "tanggal": "2026-09-11",
            "pabrik": "TEST_PABRIK_A_UPDATED",
            "no_po": "PO-TEST-001-EDIT",
            "items": [{
                "product_nama": "TEST_PRODUCT",
                "variant_label": "1000",
                "harga_pabrik": 32000,
                "qty": 120,
                "subtotal": 3840000
            }],
            "status": "lunas",
            "catatan": "Updated"
        }
        r = auth_client.put(f"{BASE_URL}/api/purchase-orders/{po_id}", json=payload)
        assert r.status_code == 200, r.text
        po = r.json()
        assert po["pabrik"] == "TEST_PABRIK_A_UPDATED"
        assert po["total"] == 3840000
    
    def test_delete_po(self, auth_client):
        """Delete a purchase order."""
        po_id = TestPOPabrik.po_ids.pop()
        r = auth_client.delete(f"{BASE_URL}/api/purchase-orders/{po_id}")
        assert r.status_code == 200
        
        # Verify deleted
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders")
        pos = r.json()
        assert all(p["id"] != po_id for p in pos)
    
    def test_pabrik_list(self, auth_client):
        """Get list of factory names."""
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders/pabrik-list")
        assert r.status_code == 200
        names = r.json()
        assert isinstance(names, list)
        assert "TEST_PABRIK_A_UPDATED" in names
    
    def test_po_validation(self, auth_client):
        """Test PO validation."""
        # Empty pabrik
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json={
            "tanggal": "2026-09-10",
            "pabrik": "",
            "items": [],
            "status": "lunas"
        })
        assert r.status_code == 422
        
        # No items
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json={
            "tanggal": "2026-09-10",
            "pabrik": "TEST",
            "items": [],
            "status": "lunas"
        })
        assert r.status_code == 422
    
    def test_export_purchases_excel(self, auth_client):
        """Export purchases to Excel."""
        r = auth_client.get(f"{BASE_URL}/api/export/purchases/excel")
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK"
        assert len(r.content) > 1000
    
    def test_export_purchases_pdf(self, auth_client):
        """Export purchases to PDF."""
        r = auth_client.get(f"{BASE_URL}/api/export/purchases/pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for po_id in TestPOPabrik.po_ids:
            auth_client.delete(f"{BASE_URL}/api/purchase-orders/{po_id}")


class TestPengeluaran:
    """Test expense tracking endpoints."""
    expense_ids = []
    
    def test_expense_categories(self, auth_client):
        """Get expense categories."""
        r = auth_client.get(f"{BASE_URL}/api/expenses/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert "BBM / Transport / Armada" in cats
        assert "Lain-lain" in cats
    
    def test_create_expense(self, auth_client):
        """Create an expense."""
        payload = {
            "tanggal": "2026-09-12",
            "kategori": "BBM / Transport / Armada",
            "deskripsi": "Solar untuk armada",
            "jumlah": 500000
        }
        r = auth_client.post(f"{BASE_URL}/api/expenses", json=payload)
        assert r.status_code == 200, r.text
        exp = r.json()
        TestPengeluaran.expense_ids.append(exp["id"])
        
        assert exp["kategori"] == "BBM / Transport / Armada"
        assert exp["jumlah"] == 500000
        assert "_id" not in exp
    
    def test_list_expenses(self, auth_client):
        """List expenses."""
        r = auth_client.get(f"{BASE_URL}/api/expenses")
        assert r.status_code == 200
        exps = r.json()
        assert isinstance(exps, list)
        assert any(e["id"] == TestPengeluaran.expense_ids[0] for e in exps)
    
    def test_expense_filters(self, auth_client):
        """Test expense filters."""
        # Create another expense
        payload = {
            "tanggal": "2026-09-20",
            "kategori": "Lain-lain",
            "deskripsi": "Biaya lain",
            "jumlah": 300000
        }
        r = auth_client.post(f"{BASE_URL}/api/expenses", json=payload)
        assert r.status_code == 200
        exp2 = r.json()
        TestPengeluaran.expense_ids.append(exp2["id"])
        
        # Filter by date
        r = auth_client.get(f"{BASE_URL}/api/expenses", 
                           params={"date_from": "2026-09-15", "date_to": "2026-09-25"})
        assert r.status_code == 200
        exps = r.json()
        assert exp2["id"] in [e["id"] for e in exps]
        
        # Filter by kategori
        r = auth_client.get(f"{BASE_URL}/api/expenses", params={"kategori": "Lain-lain"})
        assert r.status_code == 200
        exps = r.json()
        assert all(e["kategori"] == "Lain-lain" for e in exps)
    
    def test_update_expense(self, auth_client):
        """Update an expense."""
        exp_id = TestPengeluaran.expense_ids[0]
        payload = {
            "tanggal": "2026-09-13",
            "kategori": "BBM / Transport / Armada",
            "deskripsi": "Solar updated",
            "jumlah": 550000
        }
        r = auth_client.put(f"{BASE_URL}/api/expenses/{exp_id}", json=payload)
        assert r.status_code == 200, r.text
        exp = r.json()
        assert exp["jumlah"] == 550000
        assert exp["deskripsi"] == "Solar updated"
    
    def test_delete_expense(self, auth_client):
        """Delete an expense."""
        exp_id = TestPengeluaran.expense_ids.pop()
        r = auth_client.delete(f"{BASE_URL}/api/expenses/{exp_id}")
        assert r.status_code == 200
        
        # Verify deleted
        r = auth_client.get(f"{BASE_URL}/api/expenses")
        exps = r.json()
        assert all(e["id"] != exp_id for e in exps)
    
    def test_expense_validation(self, auth_client):
        """Test expense validation."""
        # Zero amount
        r = auth_client.post(f"{BASE_URL}/api/expenses", json={
            "tanggal": "2026-09-10",
            "kategori": "BBM / Transport / Armada",
            "deskripsi": "Test",
            "jumlah": 0
        })
        assert r.status_code == 422
        
        # Negative amount
        r = auth_client.post(f"{BASE_URL}/api/expenses", json={
            "tanggal": "2026-09-10",
            "kategori": "BBM / Transport / Armada",
            "deskripsi": "Test",
            "jumlah": -1000
        })
        assert r.status_code == 422
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for exp_id in TestPengeluaran.expense_ids:
            auth_client.delete(f"{BASE_URL}/api/expenses/{exp_id}")


class TestLaba:
    """Test profit/loss report endpoints."""
    
    def test_laba_report(self, auth_client):
        """Get laba report for a month."""
        r = auth_client.get(f"{BASE_URL}/api/laba", params={"year": 2026, "month": 9})
        assert r.status_code == 200, r.text
        data = r.json()
        
        # Check all required fields
        required_fields = [
            "omset", "hpp", "laba_kotor", "pengeluaran", "laba_bersih",
            "margin_kotor_pct", "margin_bersih_pct", "total_txn",
            "total_po_pabrik", "jumlah_po", "hutang_pabrik",
            "per_kategori", "per_product", "per_day", "varian_tanpa_harga_pabrik"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify calculation: laba_kotor = omset - hpp
        assert data["laba_kotor"] == pytest.approx(data["omset"] - data["hpp"])
        
        # Verify calculation: laba_bersih = laba_kotor - pengeluaran
        assert data["laba_bersih"] == pytest.approx(data["laba_kotor"] - data["pengeluaran"])
        
        # Verify margin calculations
        if data["omset"] > 0:
            expected_margin_kotor = round(data["laba_kotor"] / data["omset"] * 100, 2)
            assert data["margin_kotor_pct"] == pytest.approx(expected_margin_kotor, abs=0.1)
            
            expected_margin_bersih = round(data["laba_bersih"] / data["omset"] * 100, 2)
            assert data["margin_bersih_pct"] == pytest.approx(expected_margin_bersih, abs=0.1)
    
    def test_laba_empty_month(self, auth_client):
        """Laba report for empty month."""
        r = auth_client.get(f"{BASE_URL}/api/laba", params={"year": 2020, "month": 1})
        assert r.status_code == 200
        data = r.json()
        assert data["omset"] == 0
        assert data["hpp"] == 0
        assert data["laba_kotor"] == 0
        assert data["pengeluaran"] == 0
        assert data["laba_bersih"] == 0
    
    def test_laba_validation(self, auth_client):
        """Test laba validation."""
        # Invalid month
        r = auth_client.get(f"{BASE_URL}/api/laba", params={"year": 2026, "month": 13})
        assert r.status_code == 422
        
        # Invalid year (too old)
        r = auth_client.get(f"{BASE_URL}/api/laba", params={"year": 1999, "month": 1})
        assert r.status_code == 422
        
        # Invalid year (too far in future)
        r = auth_client.get(f"{BASE_URL}/api/laba", params={"year": 2101, "month": 1})
        assert r.status_code == 422
    
    def test_export_laba_excel(self, auth_client):
        """Export laba to Excel."""
        r = auth_client.get(f"{BASE_URL}/api/export/laba/excel", 
                           params={"year": 2026, "month": 9})
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK"
        assert len(r.content) > 1000
    
    def test_export_laba_pdf(self, auth_client):
        """Export laba to PDF."""
        r = auth_client.get(f"{BASE_URL}/api/export/laba/pdf", 
                           params={"year": 2026, "month": 9})
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"


class TestDashboardNewFeatures:
    """Test new dashboard financial cards."""
    
    def test_dashboard_has_financial_data(self, auth_client):
        """Dashboard should include current month financial data."""
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200, r.text
        data = r.json()
        
        # Check new financial fields
        new_fields = [
            "bulan_ini", "omset_bulan", "hpp_bulan", "laba_kotor_bulan",
            "pengeluaran_bulan", "laba_bersih_bulan", "po_pabrik_bulan", "hutang_pabrik"
        ]
        for field in new_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify bulan_ini format (YYYY-MM)
        import re
        assert re.match(r"\d{4}-\d{2}", data["bulan_ini"])
        
        # Verify laba calculation
        assert data["laba_kotor_bulan"] == pytest.approx(
            data["omset_bulan"] - data["hpp_bulan"], abs=1)
        assert data["laba_bersih_bulan"] == pytest.approx(
            data["laba_kotor_bulan"] - data["pengeluaran_bulan"], abs=1)


class TestPurchasesReport:
    """Test purchases report endpoint."""
    
    def test_purchases_report(self, auth_client):
        """Get purchases report for a month."""
        r = auth_client.get(f"{BASE_URL}/api/purchases/report", 
                           params={"year": 2026, "month": 9})
        assert r.status_code == 200, r.text
        data = r.json()
        
        required_fields = [
            "total_pembelian", "jumlah_po", "belum_bayar", "sudah_bayar",
            "hutang_total", "per_product", "per_pabrik", "per_day"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify calculation
        assert data["total_pembelian"] == pytest.approx(
            data["belum_bayar"] + data["sudah_bayar"], abs=1)
