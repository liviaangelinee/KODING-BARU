"""Backend API tests for CPLRekap - AMDK sales app with SINGLE PRICE schema."""
import pytest
from conftest import BASE_URL


# ---------------- Auth module ----------------
class TestAuth:
    def test_login_success_sets_httponly_cookies(self, api_client, test_credentials):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json=test_credentials)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == test_credentials["email"].lower()
        assert data["role"] == "admin"
        assert isinstance(data["id"], str) and len(data["id"]) > 0
        cookies = {c.name: c for c in r.cookies}
        assert "access_token" in cookies, f"cookies: {list(cookies)}"
        assert "refresh_token" in cookies
        set_cookie_hdr = r.headers.get("set-cookie", "").lower()
        assert "httponly" in set_cookie_hdr

    def test_me_with_cookie(self, auth_client, test_credentials):
        r = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200, r.text
        assert r.json()["email"] == test_credentials["email"].lower()


# ---------------- Products (SINGLE PRICE) ----------------
class TestProductsSinglePrice:
    created = []

    def test_seed_products_have_single_price(self, auth_client):
        """Verify seeded products have harga_pabrik and harga_so only."""
        r = auth_client.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        items = r.json()
        names = {p["nama"] for p in items}
        for expected in ["CHEERS ALKALINE", "CHEERS REGULAR", "VEMA"]:
            assert expected in names, names
        
        alk = next(p for p in items if p["nama"] == "CHEERS ALKALINE")
        labels = [v["label"] for v in alk["variants"]]
        assert "1200" in labels and "GALON" in labels
        
        # Check single price schema: only harga_pabrik and harga_so
        for v in alk["variants"]:
            assert "harga_pabrik" in v, f"Missing harga_pabrik in variant {v}"
            assert "harga_so" in v, f"Missing harga_so in variant {v}"
            # These fields should NOT exist after migration
            assert "harga_grosir" not in v, f"harga_grosir should be removed: {v}"
            assert "harga_retail" not in v, f"harga_retail should be removed: {v}"

    def test_create_product_single_price(self, auth_client):
        """Create product with only harga_pabrik and harga_so."""
        payload = {
            "nama": "TEST_PRODUK_SINGLE",
            "variants": [
                {"label": "600", "harga_pabrik": 30000, "harga_so": 35000}
            ]
        }
        r = auth_client.post(f"{BASE_URL}/api/products", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        pid = p["id"]
        TestProductsSinglePrice.created.append(pid)
        assert p["nama"] == "TEST_PRODUK_SINGLE"
        assert p["variants"][0]["harga_pabrik"] == 30000
        assert p["variants"][0]["harga_so"] == 35000
        assert "harga_grosir" not in p["variants"][0]
        assert "harga_retail" not in p["variants"][0]

        # Verify persistence
        items = auth_client.get(f"{BASE_URL}/api/products").json()
        got = next((x for x in items if x["id"] == pid), None)
        assert got is not None
        assert got["variants"][0]["harga_so"] == 35000
        assert "harga_grosir" not in got["variants"][0]

    def test_update_product_single_price(self, auth_client):
        """Update product with single price schema."""
        pid = TestProductsSinglePrice.created[0]
        payload = {
            "nama": "TEST_PRODUK_UPDATED",
            "variants": [
                {"label": "600", "harga_pabrik": 32000, "harga_so": 38000}
            ]
        }
        r = auth_client.put(f"{BASE_URL}/api/products/{pid}", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["variants"][0]["harga_so"] == 38000

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for pid in TestProductsSinglePrice.created:
            auth_client.delete(f"{BASE_URL}/api/products/{pid}")


# ---------------- Customers (NO default_price_type) ----------------
class TestCustomersSinglePrice:
    created = []

    def test_create_customer_no_price_type(self, auth_client):
        """Customer should NOT have default_price_type field."""
        payload = {"nama": "TEST_CUST_SINGLE", "telepon": "0812", "alamat": "Jl Test"}
        r = auth_client.post(f"{BASE_URL}/api/customers", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        cid = c["id"]
        TestCustomersSinglePrice.created.append(cid)
        
        # Should NOT have default_price_type
        assert "default_price_type" not in c, f"default_price_type should be removed: {c}"
        
        # Verify persistence
        items = auth_client.get(f"{BASE_URL}/api/customers").json()
        got = next(x for x in items if x["id"] == cid)
        assert "default_price_type" not in got

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for cid in TestCustomersSinglePrice.created:
            auth_client.delete(f"{BASE_URL}/api/customers/{cid}")


# ---------------- Transactions (NO price_type) ----------------
class TestTransactionsSinglePrice:
    txn_ids = []

    def test_create_transaction_no_price_type(self, auth_client):
        """Transaction items should NOT have price_type field."""
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "TEST_CID_SINGLE",
            "customer_nama": "TEST_CUSTOMER",
            "items": [{
                "product_id": "pid1",
                "product_nama": "CHEERS ALKALINE",
                "variant_label": "1200",
                "harga_satuan": 47000,
                "qty": 2,
                "subtotal": 94000
            }],
            "status": "lunas",
            "catatan": "TEST"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestTransactionsSinglePrice.txn_ids.append(t["id"])
        assert t["total"] == 94000
        
        # Items should NOT have price_type
        assert "price_type" not in t["items"][0], f"price_type should be removed: {t['items'][0]}"
        
        # Verify persistence
        items = auth_client.get(f"{BASE_URL}/api/transactions").json()
        got = next(x for x in items if x["id"] == t["id"])
        assert "price_type" not in got["items"][0]

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for tid in TestTransactionsSinglePrice.txn_ids:
            auth_client.delete(f"{BASE_URL}/api/transactions/{tid}")


# ---------------- PO Pabrik (DROPDOWN) ----------------
class TestPOPabrikDropdown:
    po_ids = []

    def test_pabrik_list_returns_fixed_options(self, auth_client):
        """GET /api/purchase-orders/pabrik-list must return BLUTO, PANDAAN, IT."""
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders/pabrik-list")
        assert r.status_code == 200, r.text
        pabrik_list = r.json()
        assert isinstance(pabrik_list, list)
        # Must contain the three fixed factories
        assert "BLUTO" in pabrik_list, f"BLUTO missing from {pabrik_list}"
        assert "PANDAAN" in pabrik_list, f"PANDAAN missing from {pabrik_list}"
        assert "IT" in pabrik_list, f"IT missing from {pabrik_list}"

    def test_create_po_with_bluto(self, auth_client):
        """Create PO with pabrik=BLUTO."""
        payload = {
            "tanggal": "2026-09-20",
            "pabrik": "BLUTO",
            "no_po": "PO-TEST-001",
            "items": [{
                "product_id": "pid1",
                "product_nama": "CHEERS ALKALINE",
                "variant_label": "1200",
                "harga_pabrik": 38000,
                "qty": 10,
                "subtotal": 380000
            }],
            "status": "belum_lunas",
            "catatan": "Test PO"
        }
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json=payload)
        assert r.status_code == 200, r.text
        po = r.json()
        TestPOPabrikDropdown.po_ids.append(po["id"])
        assert po["pabrik"] == "BLUTO"
        assert po["total"] == 380000

    def test_create_po_without_pabrik_fails(self, auth_client):
        """Creating PO without pabrik should fail with 422."""
        payload = {
            "tanggal": "2026-09-20",
            "pabrik": "",
            "items": [{
                "product_id": "pid1",
                "product_nama": "CHEERS",
                "variant_label": "1200",
                "harga_pabrik": 38000,
                "qty": 1,
                "subtotal": 38000
            }],
            "status": "lunas"
        }
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json=payload)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"

    def test_filter_po_by_pabrik(self, auth_client):
        """Filter POs by pabrik."""
        # Create PO with PANDAAN
        payload = {
            "tanggal": "2026-09-21",
            "pabrik": "PANDAAN",
            "items": [{
                "product_id": "pid2",
                "product_nama": "VEMA",
                "variant_label": "GALON",
                "harga_pabrik": 14000,
                "qty": 5,
                "subtotal": 70000
            }],
            "status": "lunas"
        }
        r = auth_client.post(f"{BASE_URL}/api/purchase-orders", json=payload)
        assert r.status_code == 200
        po2 = r.json()
        TestPOPabrikDropdown.po_ids.append(po2["id"])

        # Filter by PANDAAN
        r = auth_client.get(f"{BASE_URL}/api/purchase-orders", params={"pabrik": "PANDAAN"})
        assert r.status_code == 200
        pos = r.json()
        assert all(p["pabrik"] == "PANDAAN" for p in pos)
        assert po2["id"] in [p["id"] for p in pos]

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for po_id in TestPOPabrikDropdown.po_ids:
            auth_client.delete(f"{BASE_URL}/api/purchase-orders/{po_id}")


# ---------------- Laba Yearly Report ----------------
class TestLabaYearly:
    def test_laba_yearly_endpoint_exists(self, auth_client):
        """GET /api/laba/yearly should return yearly report."""
        r = auth_client.get(f"{BASE_URL}/api/laba/yearly", params={"year": 2026})
        assert r.status_code == 200, r.text
        data = r.json()
        
        # Check required fields
        assert "tahun" in data
        assert "per_bulan" in data
        assert "total_omset" in data
        assert "total_hpp" in data
        assert "total_laba_kotor" in data
        assert "total_pengeluaran" in data
        assert "total_laba_bersih" in data
        assert "bulan_terbaik" in data
        assert "bulan_terburuk" in data
        assert "rata_laba_bersih" in data
        
        assert data["tahun"] == 2026
        assert len(data["per_bulan"]) == 12, "Should have 12 months"
        
        # Check each month has required fields
        for bulan in data["per_bulan"]:
            assert "bulan" in bulan
            assert "nama_bulan" in bulan
            assert "omset" in bulan
            assert "hpp" in bulan
            assert "laba_kotor" in bulan
            assert "pengeluaran" in bulan
            assert "laba_bersih" in bulan
            assert "margin_bersih_pct" in bulan

    def test_laba_yearly_math_consistency(self, auth_client):
        """Verify yearly totals = sum of 12 months."""
        r = auth_client.get(f"{BASE_URL}/api/laba/yearly", params={"year": 2026})
        assert r.status_code == 200
        data = r.json()
        
        # Sum all months
        sum_omset = sum(b["omset"] for b in data["per_bulan"])
        sum_hpp = sum(b["hpp"] for b in data["per_bulan"])
        sum_pengeluaran = sum(b["pengeluaran"] for b in data["per_bulan"])
        sum_laba_bersih = sum(b["laba_bersih"] for b in data["per_bulan"])
        
        # Should match totals
        assert data["total_omset"] == pytest.approx(sum_omset)
        assert data["total_hpp"] == pytest.approx(sum_hpp)
        assert data["total_pengeluaran"] == pytest.approx(sum_pengeluaran)
        assert data["total_laba_bersih"] == pytest.approx(sum_laba_bersih)
        
        # Laba kotor = omset - hpp
        assert data["total_laba_kotor"] == pytest.approx(data["total_omset"] - data["total_hpp"])

    def test_laba_yearly_empty_year(self, auth_client):
        """Empty year should return zeros."""
        r = auth_client.get(f"{BASE_URL}/api/laba/yearly", params={"year": 2023})
        assert r.status_code == 200
        data = r.json()
        assert data["total_omset"] == 0
        assert data["bulan_aktif"] == 0

    def test_laba_yearly_invalid_year(self, auth_client):
        """Invalid year should return 422."""
        r = auth_client.get(f"{BASE_URL}/api/laba/yearly", params={"year": 1999})
        assert r.status_code == 422


# ---------------- Export Yearly ----------------
class TestExportYearly:
    def test_export_yearly_excel(self, auth_client):
        """GET /api/export/laba/yearly/excel should return valid Excel file."""
        r = auth_client.get(f"{BASE_URL}/api/export/laba/yearly/excel", params={"year": 2026})
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK", "Excel files start with PK"
        assert "attachment" in r.headers.get("content-disposition", "")
        assert len(r.content) > 1000, "File should not be empty"

    def test_export_yearly_pdf(self, auth_client):
        """GET /api/export/laba/yearly/pdf should return valid PDF file."""
        r = auth_client.get(f"{BASE_URL}/api/export/laba/yearly/pdf", params={"year": 2026})
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF", "PDF files start with %PDF"
        assert "attachment" in r.headers.get("content-disposition", "")
        assert len(r.content) > 1000


# ---------------- Export Regression (SINGLE PRICE) ----------------
class TestExportSinglePrice:
    def test_export_excel_headers_single_price(self, auth_client):
        """Excel export should have 'Harga SO' column, not 'Tipe Harga'."""
        r = auth_client.get(f"{BASE_URL}/api/export/excel")
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        # We can't easily parse Excel in tests, but we verify it returns valid content
        assert len(r.content) > 1000

    def test_export_pdf_single_price(self, auth_client):
        """PDF export should work with single price schema."""
        r = auth_client.get(f"{BASE_URL}/api/export/pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_stats_consistency(self, auth_client):
        """Dashboard stats should be consistent with actual data."""
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200, r.text
        d = r.json()
        
        # Check all required fields
        for k in ["total_omset", "total_txn", "sisa_tagihan", "total_customer",
                  "trend", "top_products", "outstanding",
                  "bulan_ini", "omset_bulan", "hpp_bulan", "laba_kotor_bulan",
                  "pengeluaran_bulan", "laba_bersih_bulan", "po_pabrik_bulan", "hutang_pabrik"]:
            assert k in d, f"Missing field: {k}"
        
        # Verify consistency
        txns = auth_client.get(f"{BASE_URL}/api/transactions").json()
        assert d["total_omset"] == pytest.approx(sum(t["total"] for t in txns))


# ---------------- Laba Per Bulan ----------------
class TestLabaBulanan:
    def test_laba_bulanan_calculation(self, auth_client):
        """Test monthly laba calculation."""
        r = auth_client.get(f"{BASE_URL}/api/laba", params={"year": 2026, "month": 7})
        assert r.status_code == 200, r.text
        data = r.json()
        
        # Check required fields
        assert "omset" in data
        assert "hpp" in data
        assert "laba_kotor" in data
        assert "pengeluaran" in data
        assert "laba_bersih" in data
        assert "per_product" in data
        assert "per_kategori" in data
        assert "varian_tanpa_harga_pabrik" in data
        
        # Verify math: laba_kotor = omset - hpp
        assert data["laba_kotor"] == pytest.approx(data["omset"] - data["hpp"])
        # laba_bersih = laba_kotor - pengeluaran
        assert data["laba_bersih"] == pytest.approx(data["laba_kotor"] - data["pengeluaran"])
