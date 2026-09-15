"""Backend API tests for Iteration 4: Kredit/Free status, Setoran, Laporan Harian."""
import contextlib
from typing import ClassVar

import pytest

from conftest import BASE_URL


# ---------------- Transaction Status: Kredit & Free ----------------
class TestTransactionStatus:
    txn_ids: ClassVar[list] = []

    def test_create_transaction_status_kredit(self, auth_client):
        """Create transaction with status='kredit' (unpaid)."""
        # Get a real product first
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in products if p["nama"] == "CHEERS ALKALINE"), products[0])
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer Kredit",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),
                "qty": 2,
                "subtotal": variant.get("harga_so", 47000) * 2,
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "kredit",
            "catatan": "Belum dibayar"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestTransactionStatus.txn_ids.append(t["id"])
        assert t["status"] == "kredit"
        assert t["total"] > 0
        assert t["total_hpp"] > 0, "HPP should be calculated"
        print(f"✅ Created kredit transaction: {t['id']}")

    def test_create_transaction_status_free_with_customer(self, auth_client):
        """Create transaction with status='free' (promo/free goods) with customer."""
        # Get a real product first
        products = auth_client.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in products if p["nama"] == "CHEERS ALKALINE"), products[0])
        variant = prod["variants"][0]
        
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer Free",
            "items": [{
                "product_id": prod["id"],
                "product_nama": prod["nama"],
                "variant_label": variant["label"],
                "harga_satuan": variant.get("harga_so", 47000),  # Will be forced to 0 by backend
                "qty": 1,
                "subtotal": variant.get("harga_so", 47000),  # Will be forced to 0
                "harga_pabrik": variant.get("harga_pabrik", 38000)
            }],
            "status": "free",
            "catatan": "Promo gratis"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestTransactionStatus.txn_ids.append(t["id"])
        assert t["status"] == "free"
        assert t["total"] == 0, "Free transaction should have total=0"
        assert t["total_hpp"] > 0, "HPP should still be calculated for free items"
        assert t["laba_kotor"] < 0, "Free transaction should have negative profit"
        assert t["items"][0]["harga_satuan"] == 0, "Free items should have price=0"
        print(f"✅ Created free transaction with customer: {t['id']}, HPP={t['total_hpp']}, Laba={t['laba_kotor']}")

    def test_create_transaction_status_free_without_customer(self, auth_client):
        """Create transaction with status='free' without customer (Pemakaian Sendiri)."""
        # Get a real product first
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
            "catatan": "Pemakaian sendiri"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        TestTransactionStatus.txn_ids.append(t["id"])
        assert t["status"] == "free"
        assert t["customer_nama"] == "Pemakaian Sendiri", "Should auto-fill customer name"
        assert t["total"] == 0
        assert t["total_hpp"] > 0
        print(f"✅ Created free transaction without customer: {t['customer_nama']}")

    def test_filter_transactions_by_status(self, auth_client):
        """Filter transactions by status."""
        # Filter kredit
        r = auth_client.get(f"{BASE_URL}/api/transactions", params={"status": "kredit"})
        assert r.status_code == 200
        txns = r.json()
        assert all(t["status"] == "kredit" for t in txns)
        print(f"✅ Filtered kredit transactions: {len(txns)} found")

        # Filter free
        r = auth_client.get(f"{BASE_URL}/api/transactions", params={"status": "free"})
        assert r.status_code == 200
        txns = r.json()
        assert all(t["status"] == "free" for t in txns)
        print(f"✅ Filtered free transactions: {len(txns)} found")

    def test_change_status_lunas_to_kredit(self, auth_client):
        """Change transaction status from lunas to kredit."""
        # Create lunas transaction
        payload = {
            "tanggal": "2026-09-15",
            "customer_id": "test_cid",
            "customer_nama": "Test Customer",
            "items": [{
                "product_id": "pid1",
                "product_nama": "CHEERS",
                "variant_label": "1200",
                "harga_satuan": 47000,
                "qty": 1,
                "subtotal": 47000
            }],
            "status": "lunas"
        }
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert r.status_code == 200
        tid = r.json()["id"]
        TestTransactionStatus.txn_ids.append(tid)

        # Change to kredit
        r = auth_client.patch(f"{BASE_URL}/api/transactions/{tid}/status", json={"status": "kredit"})
        assert r.status_code == 200, r.text
        print("✅ Changed status lunas -> kredit")

    def test_change_status_free_to_lunas_should_fail(self, auth_client):
        """Changing free transaction to lunas/kredit should fail."""
        # Get a free transaction
        free_id = TestTransactionStatus.txn_ids[1]  # Second one is free
        
        # Try to change to lunas
        r = auth_client.patch(f"{BASE_URL}/api/transactions/{free_id}/status", json={"status": "lunas"})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        assert "tidak bisa diubah" in r.json()["detail"].lower() or "free" in r.json()["detail"].lower()
        print(f"✅ Correctly rejected changing free -> lunas: {r.json()['detail']}")

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for tid in TestTransactionStatus.txn_ids:
            with contextlib.suppress(Exception):
                auth_client.delete(f"{BASE_URL}/api/transactions/{tid}")


# ---------------- Setoran (Deposits) ----------------
class TestSetoran:
    deposit_ids: ClassVar[list] = []

    def test_create_deposit(self, auth_client):
        """Create a deposit record."""
        payload = {
            "tanggal": "2026-09-15",
            "jumlah": 1500000,
            "catatan": "Setoran tunai sore"
        }
        r = auth_client.post(f"{BASE_URL}/api/deposits", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        TestSetoran.deposit_ids.append(d["id"])
        assert d["jumlah"] == 1500000
        assert d["catatan"] == "Setoran tunai sore"
        print(f"✅ Created deposit: {d['id']}, Rp {d['jumlah']}")

    def test_create_deposit_zero_amount_fails(self, auth_client):
        """Creating deposit with jumlah=0 should fail."""
        payload = {
            "tanggal": "2026-09-15",
            "jumlah": 0,
            "catatan": "Invalid"
        }
        r = auth_client.post(f"{BASE_URL}/api/deposits", json=payload)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        assert "lebih dari 0" in r.json()["detail"].lower()
        print("✅ Correctly rejected zero amount deposit")

    def test_list_deposits(self, auth_client):
        """List all deposits."""
        r = auth_client.get(f"{BASE_URL}/api/deposits")
        assert r.status_code == 200, r.text
        deposits = r.json()
        assert isinstance(deposits, list)
        print(f"✅ Listed deposits: {len(deposits)} found")

    def test_filter_deposits_by_date(self, auth_client):
        """Filter deposits by date range."""
        r = auth_client.get(f"{BASE_URL}/api/deposits", params={
            "date_from": "2026-09-01",
            "date_to": "2026-09-30"
        })
        assert r.status_code == 200
        deposits = r.json()
        for d in deposits:
            assert "2026-09" in d["tanggal"]
        print(f"✅ Filtered deposits by date: {len(deposits)} found")

    def test_update_deposit(self, auth_client):
        """Update a deposit."""
        dep_id = TestSetoran.deposit_ids[0]
        payload = {
            "tanggal": "2026-09-15",
            "jumlah": 2000000,
            "catatan": "Updated amount"
        }
        r = auth_client.put(f"{BASE_URL}/api/deposits/{dep_id}", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["jumlah"] == 2000000
        assert d["catatan"] == "Updated amount"
        print(f"✅ Updated deposit: {dep_id}")

    def test_delete_deposit(self, auth_client):
        """Delete a deposit."""
        # Create one to delete
        payload = {"tanggal": "2026-09-15", "jumlah": 500000, "catatan": "To delete"}
        r = auth_client.post(f"{BASE_URL}/api/deposits", json=payload)
        dep_id = r.json()["id"]
        
        r = auth_client.delete(f"{BASE_URL}/api/deposits/{dep_id}")
        assert r.status_code == 200, r.text
        
        # Verify deleted
        r = auth_client.get(f"{BASE_URL}/api/deposits")
        deposits = r.json()
        assert dep_id not in [d["id"] for d in deposits]
        print(f"✅ Deleted deposit: {dep_id}")

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for dep_id in TestSetoran.deposit_ids:
            with contextlib.suppress(Exception):
                auth_client.delete(f"{BASE_URL}/api/deposits/{dep_id}")


# ---------------- Laporan Harian ----------------
class TestLaporanHarian:
    def test_laporan_harian_by_month(self, auth_client):
        """Get daily report for a specific month."""
        r = auth_client.get(f"{BASE_URL}/api/laporan/harian", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200, r.text
        data = r.json()
        
        # Check structure
        assert "date_from" in data
        assert "date_to" in data
        assert "per_hari" in data
        assert "total" in data
        
        # Check total fields
        t = data["total"]
        required_fields = [
            "penjualan", "kas_masuk", "kredit", "free_hpp", "hpp", "laba_kotor",
            "pembelian", "pembayaran_pabrik", "operasional", "laba_bersih",
            "seharusnya_disetor", "disetor", "selisih", "jumlah_txn", "hari_aktif"
        ]
        for field in required_fields:
            assert field in t, f"Missing field: {field}"
        
        print(f"✅ Laporan harian by month: {data['date_from']} to {data['date_to']}")
        print(f"   Total penjualan: Rp {t['penjualan']}, Laba bersih: Rp {t['laba_bersih']}")

    def test_laporan_harian_by_date_range(self, auth_client):
        """Get daily report for a date range."""
        r = auth_client.get(f"{BASE_URL}/api/laporan/harian", params={
            "date_from": "2026-09-01",
            "date_to": "2026-09-15"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["date_from"] == "2026-09-01"
        assert data["date_to"] == "2026-09-15"
        print(f"✅ Laporan harian by date range: {len(data['per_hari'])} days")

    def test_laporan_harian_calculations(self, auth_client):
        """Verify calculations in daily report."""
        r = auth_client.get(f"{BASE_URL}/api/laporan/harian", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200
        data = r.json()
        t = data["total"]
        
        # Verify math
        # Laba kotor = penjualan - hpp
        assert t["laba_kotor"] == pytest.approx(t["penjualan"] - t["hpp"])
        
        # Laba bersih = laba kotor - operasional
        assert t["laba_bersih"] == pytest.approx(t["laba_kotor"] - t["operasional"])
        
        # Seharusnya disetor = kas masuk - operasional - pembayaran pabrik
        assert t["seharusnya_disetor"] == pytest.approx(
            t["kas_masuk"] - t["operasional"] - t["pembayaran_pabrik"]
        )
        
        # Selisih = disetor - seharusnya disetor
        assert t["selisih"] == pytest.approx(t["disetor"] - t["seharusnya_disetor"])
        
        print("✅ Laporan harian calculations verified")
        print(f"   Laba bersih = (Penjualan {t['penjualan']} - HPP {t['hpp']}) - Operasional {t['operasional']} = {t['laba_bersih']}")

    def test_laporan_harian_invalid_date_range(self, auth_client):
        """Invalid date range should return 422."""
        r = auth_client.get(f"{BASE_URL}/api/laporan/harian", params={
            "date_from": "2026-09-30",
            "date_to": "2026-09-01"
        })
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        print("✅ Correctly rejected invalid date range")


# ---------------- Export Laporan Harian ----------------
class TestExportLaporanHarian:
    def test_export_harian_excel_by_month(self, auth_client):
        """Export daily report as Excel by month."""
        r = auth_client.get(f"{BASE_URL}/api/export/harian/excel", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK", "Excel files start with PK"
        assert len(r.content) > 1000
        print(f"✅ Exported harian Excel by month: {len(r.content)} bytes")

    def test_export_harian_pdf_by_month(self, auth_client):
        """Export daily report as PDF by month."""
        r = auth_client.get(f"{BASE_URL}/api/export/harian/pdf", params={
            "year": 2026,
            "month": 9
        })
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1000
        print(f"✅ Exported harian PDF by month: {len(r.content)} bytes")

    def test_export_harian_excel_by_date_range(self, auth_client):
        """Export daily report as Excel by date range."""
        r = auth_client.get(f"{BASE_URL}/api/export/harian/excel", params={
            "date_from": "2026-09-01",
            "date_to": "2026-09-15"
        })
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        print("✅ Exported harian Excel by date range")

    def test_export_harian_pdf_by_date_range(self, auth_client):
        """Export daily report as PDF by date range."""
        r = auth_client.get(f"{BASE_URL}/api/export/harian/pdf", params={
            "date_from": "2026-09-01",
            "date_to": "2026-09-15"
        })
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        print("✅ Exported harian PDF by date range")


# ---------------- Dashboard Stats (New Fields) ----------------
class TestDashboardNewFields:
    def test_dashboard_stats_new_fields(self, auth_client):
        """Verify dashboard stats has new fields for iteration 4."""
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200, r.text
        d = r.json()
        
        # Check new fields
        new_fields = [
            "setoran_hari_ini",
            "setoran_bulan",
            "free_hpp_bulan",
            "tanggal_hari_ini",
            "sisa_tagihan"
        ]
        for field in new_fields:
            assert field in d, f"Missing new field: {field}"
        
        # Verify types
        assert isinstance(d["setoran_hari_ini"], (int, float))
        assert isinstance(d["setoran_bulan"], (int, float))
        assert isinstance(d["free_hpp_bulan"], (int, float))
        assert isinstance(d["tanggal_hari_ini"], str)
        assert isinstance(d["sisa_tagihan"], (int, float))
        
        # Verify date format
        assert len(d["tanggal_hari_ini"]) == 10  # YYYY-MM-DD
        assert d["tanggal_hari_ini"].count("-") == 2
        
        print("✅ Dashboard stats has all new fields:")
        print(f"   Setoran hari ini: Rp {d['setoran_hari_ini']}")
        print(f"   Setoran bulan: Rp {d['setoran_bulan']}")
        print(f"   Free HPP bulan: Rp {d['free_hpp_bulan']}")
        print(f"   Tanggal hari ini: {d['tanggal_hari_ini']}")
        print(f"   Sisa tagihan (kredit): Rp {d['sisa_tagihan']}")

    def test_sisa_tagihan_equals_kredit_total(self, auth_client):
        """Verify sisa_tagihan equals total of kredit transactions."""
        # Get dashboard stats
        r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
        stats = r.json()
        sisa_tagihan = stats["sisa_tagihan"]
        
        # Get all kredit transactions
        r = auth_client.get(f"{BASE_URL}/api/transactions", params={"status": "kredit"})
        kredit_txns = r.json()
        kredit_total = sum(t["total"] for t in kredit_txns)
        
        assert sisa_tagihan == pytest.approx(kredit_total), \
            f"sisa_tagihan ({sisa_tagihan}) should equal kredit total ({kredit_total})"
        print(f"✅ sisa_tagihan matches kredit total: Rp {sisa_tagihan}")
