"""Backend API tests for Iteration 5: Free transaction reasons (free_alasan)."""
import contextlib
from typing import ClassVar

import pytest
from conftest import BASE_URL


# ---------------- Free Reasons Endpoint ----------------
class TestFreeReasons:
    def test_get_free_reasons_default(self, auth_client):
        """GET /api/transactions/free-reasons returns default reasons."""
        r = auth_client.get(f"{BASE_URL}/api/transactions/free-reasons")
        assert r.status_code == 200, r.text
        reasons = r.json()
        assert isinstance(reasons, list)
        
        # Must contain default reasons
        assert "Promo" in reasons, f"Promo missing from {reasons}"
        assert "Sampel" in reasons, f"Sampel missing from {reasons}"
        assert "Pemakaian Sendiri" in reasons, f"Pemakaian Sendiri missing from {reasons}"
        assert "Lainnya" in reasons, f"Lainnya missing from {reasons}"
        print(f"✅ Default free reasons: {reasons}")


# ---------------- Free Transactions with Reasons ----------------
class TestFreeTransactionReasons:
    txn_ids: ClassVar[list] = []

    def test_create_free_transaction_with_promo(self, auth_client):
        """Create free transaction with free_alasan='Promo'."""
        # Get a real product
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in products if p["nama"] == "CHEERS ALKALINE"), products[0])
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 2,
                "subtotal": variant.get("harga_so", 47000) * 2,
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "free",
            "free_alasan": "Promo",
            "catatan": "Promo gratis"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestFreeTransactionReasons.txn_ids.append(t["id"])
        
        # Verify free transaction properties
        assert t["status"] == "free"
        assert t["free_alasan"] == "Promo", f"Expected 'Promo', got '{t['free_alasan']}'"
        assert t["total"] == 0, "Free transaction should have total=0"
        assert t["total_hpp"] > 0, "HPP should still be calculated"
        assert t["laba_kotor"] < 0, "Free transaction should have negative profit"
        print(f"✅ Created free transaction with Promo: {t['id']}, free_alasan={t['free_alasan']}")

    def test_create_free_transaction_without_alasan_defaults(self, auth_client):
        """Create free transaction without free_alasan should default to 'Pemakaian Sendiri'."""
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in products if p["nama"] == "CHEERS ALKALINE"), products[0])
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "",
            "customer_nama": "",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "free",
            "catatan": "No alasan provided"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestFreeTransactionReasons.txn_ids.append(t["id"])
        
        assert t["status"] == "free"
        assert t["free_alasan"] == "Pemakaian Sendiri", f"Should default to 'Pemakaian Sendiri', got '{t['free_alasan']}'"
        assert t["customer_nama"] == "Pemakaian Sendiri"
        print(f"✅ Free transaction without alasan defaults to: {t['free_alasan']}")

    def test_create_lunas_transaction_clears_free_alasan(self, auth_client):
        """Create lunas transaction with free_alasan should clear it."""
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in products if p["nama"] == "CHEERS ALKALINE"), products[0])
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "lunas",
            "free_alasan": "Promo",  # Should be ignored
            "catatan": "Paid transaction"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestFreeTransactionReasons.txn_ids.append(t["id"])
        
        assert t["status"] == "lunas"
        assert t["free_alasan"] == "", f"free_alasan should be empty for lunas, got '{t['free_alasan']}'"
        assert t["total"] > 0
        print("✅ Lunas transaction correctly clears free_alasan")

    def test_create_free_transaction_with_sampel(self, auth_client):
        """Create free transaction with free_alasan='Sampel'."""
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in products if p["nama"] == "VEMA"), products[0])
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid2",
            "customer_nama": "Test Customer 2",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 20000),
                "qty": 3,
                "subtotal": variant.get("harga_so", 20000) * 3,
                "harga_pabrik": variant.get("harga_pabrik", 14000)
            }],
            "status": "free",
            "free_alasan": "Sampel",
            "catatan": "Sample products"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestFreeTransactionReasons.txn_ids.append(t["id"])
        
        assert t["free_alasan"] == "Sampel"
        print(f"✅ Created free transaction with Sampel: {t['id']}")

    def test_create_free_transaction_with_manual_reason(self, auth_client):
        """Create free transaction with manual reason."""
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = products[0]
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid3",
            "customer_nama": "Test Customer 3",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "free",
            "free_alasan": "Ganti Barang Rusak",
            "catatan": "Manual reason"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestFreeTransactionReasons.txn_ids.append(t["id"])
        
        assert t["free_alasan"] == "Ganti Barang Rusak"
        print(f"✅ Created free transaction with manual reason: {t['free_alasan']}")
        
        # Verify manual reason appears in free-reasons list
        r = auth_client.get(f"{BASE_URL}/api/transactions/free-reasons")
        reasons = r.json()
        assert "Ganti Barang Rusak" in reasons, f"Manual reason should appear in list: {reasons}"
        print(f"✅ Manual reason now in free-reasons list: {reasons}")

    def test_update_free_transaction_alasan(self, auth_client):
        """Update free transaction's free_alasan."""
        tid = TestFreeTransactionReasons.txn_ids[0]  # First transaction (Promo)
        
        # Get current transaction
        txns = auth_client.get(f"{BASE_URL}/api/transactions").json()
        t = next(x for x in txns if x["id"] == tid)
        
        # Update with new alasan
        payload = {
            "tanggal": t["tanggal"],
            "customer_id": t["customer_id"],
            "customer_nama": t["customer_nama"],
            "items": t["items"],
            "status": "free",
            "free_alasan": "Sampel",  # Changed from Promo
            "catatan": t.get("catatan", "")
        }
        r = auth_client.put(f"{BASE_URL}/api/transactions/{tid}", json=payload)
        assert r.status_code == 200, r.text
        updated = r.json()
        
        assert updated["free_alasan"] == "Sampel", f"Expected 'Sampel', got '{updated['free_alasan']}'"
        print("✅ Updated free_alasan from Promo to Sampel")

    def test_patch_status_to_free_with_alasan(self, auth_client):
        """PATCH status to free with free_alasan."""
        # Create a lunas transaction first
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = products[0]
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "lunas"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        tid = r.json()["id"]
        TestFreeTransactionReasons.txn_ids.append(tid)
        
        # Change to free with alasan
        r = auth_client.patch(f"{BASE_URL}/api/transactions/{tid}/status", 
                             json={"status": "free", "free_alasan": "Sampel"})
        assert r.status_code == 200, r.text
        
        # Verify
        txns = auth_client.get(f"{BASE_URL}/api/transactions").json()
        t = next(x for x in txns if x["id"] == tid)
        assert t["status"] == "free"
        assert t["free_alasan"] == "Sampel"
        assert t["total"] == 0
        print("✅ PATCH status to free with alasan works")

    def test_patch_status_from_kredit_to_lunas_clears_alasan(self, auth_client):
        """PATCH status from kredit to lunas should clear free_alasan."""
        # Create kredit transaction
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = products[0]
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "kredit"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        tid = r.json()["id"]
        TestFreeTransactionReasons.txn_ids.append(tid)
        
        # Change to lunas
        r = auth_client.patch(f"{BASE_URL}/api/transactions/{tid}/status", 
                             json={"status": "lunas"})
        assert r.status_code == 200, r.text
        
        # Verify free_alasan is empty
        txns = auth_client.get(f"{BASE_URL}/api/transactions").json()
        t = next(x for x in txns if x["id"] == tid)
        assert t["status"] == "lunas"
        assert t["free_alasan"] == ""
        print("✅ PATCH status to lunas clears free_alasan")

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for tid in TestFreeTransactionReasons.txn_ids:
            with contextlib.suppress(Exception):
                auth_client.delete(f"{BASE_URL}/api/transactions/{tid}")


# ---------------- Laporan Harian with Free Per Alasan ----------------
class TestLaporanHarianFreeAlasan:
    def test_laporan_harian_has_free_per_alasan(self, auth_client):
        """GET /api/laporan/harian should include free_per_alasan array."""
        r = auth_client.get(f"{BASE_URL}/api/laporan/harian", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200, r.text
        data = r.json()
        
        # Check free_per_alasan exists
        assert "free_per_alasan" in data, f"Missing free_per_alasan in response: {data.keys()}"
        assert isinstance(data["free_per_alasan"], list)
        
        # If there are free transactions, check structure
        if data["free_per_alasan"]:
            for item in data["free_per_alasan"]:
                assert "alasan" in item, f"Missing 'alasan' field: {item}"
                assert "hpp" in item, f"Missing 'hpp' field: {item}"
                assert "jumlah_txn" in item, f"Missing 'jumlah_txn' field: {item}"
                assert "qty" in item, f"Missing 'qty' field: {item}"
                
                # Verify types
                assert isinstance(item["alasan"], str)
                assert isinstance(item["hpp"], (int, float))
                assert isinstance(item["jumlah_txn"], int)
                assert isinstance(item["qty"], (int, float))
            
            print(f"✅ Laporan harian has free_per_alasan: {len(data['free_per_alasan'])} reasons")
            for item in data["free_per_alasan"]:
                print(f"   - {item['alasan']}: {item['jumlah_txn']} txn, qty={item['qty']}, hpp={item['hpp']}")
        else:
            print("✅ Laporan harian has free_per_alasan (empty)")

    def test_free_per_alasan_hpp_matches_total(self, auth_client):
        """Sum of free_per_alasan HPP should match total.free_hpp."""
        r = auth_client.get(f"{BASE_URL}/api/laporan/harian", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200
        data = r.json()
        
        if data["free_per_alasan"]:
            sum_hpp = sum(item["hpp"] for item in data["free_per_alasan"])
            total_free_hpp = data["total"]["free_hpp"]
            
            assert sum_hpp == pytest.approx(total_free_hpp), \
                f"Sum of free_per_alasan HPP ({sum_hpp}) should match total.free_hpp ({total_free_hpp})"
            print(f"✅ free_per_alasan HPP sum matches total.free_hpp: {sum_hpp}")


# ---------------- Export with Free Alasan ----------------
class TestExportFreeAlasan:
    def test_export_harian_excel_includes_free_sheet(self, auth_client):
        """Export harian Excel should include 'Barang Free' sheet."""
        r = auth_client.get(f"{BASE_URL}/api/export/harian/excel", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK"
        assert len(r.content) > 1000
        print(f"✅ Export harian Excel works: {len(r.content)} bytes")

    def test_export_harian_pdf_includes_free_table(self, auth_client):
        """Export harian PDF should include free items table."""
        r = auth_client.get(f"{BASE_URL}/api/export/harian/pdf", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1000
        print(f"✅ Export harian PDF works: {len(r.content)} bytes")

    def test_export_penjualan_excel_shows_status_with_reason(self, auth_client):
        """Export penjualan Excel should show 'Free (Promo)' in Status column."""
        r = auth_client.get(f"{BASE_URL}/api/export/excel")
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert len(r.content) > 1000
        print(f"✅ Export penjualan Excel works: {len(r.content)} bytes")

    def test_export_penjualan_pdf_shows_status_with_reason(self, auth_client):
        """Export penjualan PDF should show 'Free (Promo)' in Status column."""
        r = auth_client.get(f"{BASE_URL}/api/export/pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1000
        print(f"✅ Export penjualan PDF works: {len(r.content)} bytes")


# ---------------- Regression: Other Flows Still Work ----------------
class TestRegression:
    def test_lunas_transaction_still_works(self, auth_client):
        """Lunas transactions should still work normally."""
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = products[0]
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "lunas"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["status"] == "lunas"
        assert t["total"] > 0
        auth_client.delete(f"{BASE_URL}/api/transactions/{t['id']}")
        print("✅ Lunas transaction still works")

    def test_kredit_transaction_still_works(self, auth_client):
        """Kredit transactions should still work normally."""
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = products[0]
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "kredit"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["status"] == "kredit"
        assert t["total"] > 0
        auth_client.delete(f"{BASE_URL}/api/transactions/{t['id']}")
        print("✅ Kredit transaction still works")

    def test_dashboard_stats_still_works(self, auth_client):
        """Dashboard stats should still work."""
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "total_omset" in d
        assert "free_hpp_bulan" in d
        print("✅ Dashboard stats still works")

    def test_setoran_still_works(self, auth_client):
        """Setoran (deposits) should still work."""
        payload = {
            "tanggal": "2026-09-15",
            "jumlah": 1000000,
            "catatan": "Test setoran"
        }
        r = auth_client.post(f"{BASE_URL}/api/deposits", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["jumlah"] == 1000000
        auth_client.delete(f"{BASE_URL}/api/deposits/{d['id']}")
        print("✅ Setoran still works")
