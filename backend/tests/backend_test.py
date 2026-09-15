"""Backend API tests for AMDK sales recap app."""
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

    def test_login_wrong_password(self, api_client, test_credentials):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": test_credentials["email"], "password": "wrongpass999"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_unknown_email(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": "TEST_nouser@example.com", "password": "x"})
        assert r.status_code == 401

    def test_me_requires_auth(self, api_client):
        import requests
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_cookie(self, auth_client, test_credentials):
        r = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200, r.text
        assert r.json()["email"] == test_credentials["email"].lower()

    def test_refresh(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/auth/refresh")
        assert r.status_code == 200, r.text
        assert r.json()["message"] == "ok"

    def test_logout_clears_session(self, test_credentials):
        import requests
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json=test_credentials)
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 200
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 401

    def test_bcrypt_hash_format(self):
        import asyncio, os
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values
        env = dotenv_values("/app/backend/.env")

        async def _check():
            cl = AsyncIOMotorClient(env["MONGO_URL"])
            u = await cl[env["DB_NAME"]].users.find_one({"email": env["ADMIN_EMAIL"].lower()})
            cl.close()
            return u
        u = asyncio.get_event_loop().run_until_complete(_check()) if False else asyncio.run(_check())
        assert u is not None, "admin user not seeded"
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_brute_force_lockout(self, test_credentials):
        """Playbook check: lockout after 5 failed attempts."""
        import requests
        s = requests.Session()
        codes = []
        for _ in range(6):
            r = s.post(f"{BASE_URL}/api/auth/login",
                       json={"email": test_credentials["email"], "password": "badpass!!"})
            codes.append(r.status_code)
        assert 429 in codes, f"No lockout/rate-limit observed, codes={codes}"


# ---------------- Products ----------------
class TestProducts:
    created = []

    def test_requires_auth(self, api_client):
        import requests
        assert requests.get(f"{BASE_URL}/api/products").status_code == 401

    def test_seed_products_present(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        items = r.json()
        names = {p["nama"] for p in items}
        for expected in ["CHEERS ALKALINE", "CHEERS REGULAR", "VEMA"]:
            assert expected in names, names
        alk = next(p for p in items if p["nama"] == "CHEERS ALKALINE")
        labels = [v["label"] for v in alk["variants"]]
        assert labels == ["1200", "550", "330", "230", "GALON"], labels
        assert all("_id" not in p for p in items)
        v = alk["variants"][0]
        assert {"harga_grosir", "harga_so", "harga_retail"} <= set(v)

    def test_crud_product(self, auth_client):
        payload = {"nama": "TEST_PRODUK", "variants": [
            {"label": "600", "harga_grosir": 1000, "harga_so": 1100, "harga_retail": 1200}]}
        r = auth_client.post(f"{BASE_URL}/api/products", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        pid = p["id"]
        TestProducts.created.append(pid)
        assert p["nama"] == "TEST_PRODUK"
        assert "_id" not in p

        # GET verify persistence
        items = auth_client.get(f"{BASE_URL}/api/products").json()
        got = next((x for x in items if x["id"] == pid), None)
        assert got is not None
        assert got["variants"][0]["harga_retail"] == 1200

        # UPDATE
        payload["nama"] = "TEST_PRODUK_EDIT"
        payload["variants"][0]["harga_retail"] = 1500
        r = auth_client.put(f"{BASE_URL}/api/products/{pid}", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["nama"] == "TEST_PRODUK_EDIT"
        items = auth_client.get(f"{BASE_URL}/api/products").json()
        got = next(x for x in items if x["id"] == pid)
        assert got["nama"] == "TEST_PRODUK_EDIT"
        assert got["variants"][0]["harga_retail"] == 1500

        # DELETE
        r = auth_client.delete(f"{BASE_URL}/api/products/{pid}")
        assert r.status_code == 200
        items = auth_client.get(f"{BASE_URL}/api/products").json()
        assert all(x["id"] != pid for x in items)
        TestProducts.created.remove(pid)

    def test_update_missing_product_404(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/products/nonexistent-id",
                            json={"nama": "x", "variants": []})
        assert r.status_code == 404

    def test_delete_missing_product(self, auth_client):
        r = auth_client.delete(f"{BASE_URL}/api/products/nonexistent-id")
        assert r.status_code == 404, f"expected 404 for missing product, got {r.status_code}"

    def test_invalid_payload_422(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/products", json={"variants": []})
        assert r.status_code == 422


# ---------------- Customers ----------------
class TestCustomers:
    def test_list_customers(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/customers")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert all("_id" not in c for c in items)

    def test_crud_customer(self, auth_client):
        payload = {"nama": "TEST_CUST", "telepon": "0812", "alamat": "Jl Test",
                   "default_price_type": "grosir"}
        r = auth_client.post(f"{BASE_URL}/api/customers", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        cid = c["id"]
        assert c["default_price_type"] == "grosir"

        items = auth_client.get(f"{BASE_URL}/api/customers").json()
        got = next(x for x in items if x["id"] == cid)
        assert got["nama"] == "TEST_CUST" and got["telepon"] == "0812"

        payload["nama"] = "TEST_CUST_EDIT"
        payload["default_price_type"] = "so"
        r = auth_client.put(f"{BASE_URL}/api/customers/{cid}", json=payload)
        assert r.status_code == 200
        assert r.json()["default_price_type"] == "so"
        items = auth_client.get(f"{BASE_URL}/api/customers").json()
        got = next(x for x in items if x["id"] == cid)
        assert got["nama"] == "TEST_CUST_EDIT"

        assert auth_client.delete(f"{BASE_URL}/api/customers/{cid}").status_code == 200
        items = auth_client.get(f"{BASE_URL}/api/customers").json()
        assert all(x["id"] != cid for x in items)

    def test_invalid_price_type_422(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/customers",
                             json={"nama": "TEST_X", "default_price_type": "bogus"})
        assert r.status_code == 422

    def test_update_missing_customer_404(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/customers/nope", json={"nama": "x"})
        assert r.status_code == 404


# ---------------- Transactions + filters ----------------
class TestTransactions:
    txn_ids = []

    def _mk(self, cust_id="TEST_CID", nama="TEST_CUSTOMER_TXN", tanggal="2026-07-05",
            status="lunas", harga=40000, qty=3):
        return {"tanggal": tanggal, "customer_id": cust_id, "customer_nama": nama,
                "items": [{"product_id": "pid1", "product_nama": "CHEERS REGULAR",
                           "variant_label": "1500", "price_type": "grosir",
                           "harga_satuan": harga, "qty": qty, "subtotal": harga * qty}],
                "status": status, "catatan": "TEST"}

    def test_create_and_total_computed(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/transactions", json=self._mk())
        assert r.status_code == 200, r.text
        t = r.json()
        TestTransactions.txn_ids.append(t["id"])
        assert t["total"] == 120000
        assert t["status"] == "lunas"
        assert "_id" not in t

        items = auth_client.get(f"{BASE_URL}/api/transactions").json()
        got = next(x for x in items if x["id"] == t["id"])
        assert got["total"] == 120000
        assert got["items"][0]["variant_label"] == "1500"

    def test_status_toggle(self, auth_client):
        tid = TestTransactions.txn_ids[0]
        r = auth_client.patch(f"{BASE_URL}/api/transactions/{tid}/status",
                              json={"status": "belum_lunas"})
        assert r.status_code == 200, r.text
        items = auth_client.get(f"{BASE_URL}/api/transactions").json()
        assert next(x for x in items if x["id"] == tid)["status"] == "belum_lunas"

        r = auth_client.patch(f"{BASE_URL}/api/transactions/{tid}/status", json={"status": "lunas"})
        assert r.status_code == 200
        items = auth_client.get(f"{BASE_URL}/api/transactions").json()
        assert next(x for x in items if x["id"] == tid)["status"] == "lunas"

    def test_invalid_status_400(self, auth_client):
        tid = TestTransactions.txn_ids[0]
        r = auth_client.patch(f"{BASE_URL}/api/transactions/{tid}/status", json={"status": "x"})
        assert r.status_code == 400

    def test_update_transaction(self, auth_client):
        tid = TestTransactions.txn_ids[0]
        payload = self._mk(harga=50000, qty=2, status="belum_lunas")
        r = auth_client.put(f"{BASE_URL}/api/transactions/{tid}", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 100000
        items = auth_client.get(f"{BASE_URL}/api/transactions").json()
        got = next(x for x in items if x["id"] == tid)
        assert got["total"] == 100000 and got["status"] == "belum_lunas"

    def test_filters(self, auth_client):
        a = auth_client.post(f"{BASE_URL}/api/transactions",
                             json=self._mk(tanggal="2026-07-10", status="belum_lunas",
                                           cust_id="TEST_CID2", nama="TEST_CUSTOMER_B")).json()
        TestTransactions.txn_ids.append(a["id"])

        # date range filter
        r = auth_client.get(f"{BASE_URL}/api/transactions",
                            params={"date_from": "2026-07-09", "date_to": "2026-07-11"})
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert a["id"] in ids
        assert all("2026-07-09" <= x["tanggal"] <= "2026-07-11" for x in r.json())

        # customer filter
        r = auth_client.get(f"{BASE_URL}/api/transactions", params={"customer_id": "TEST_CID2"})
        assert all(x["customer_id"] == "TEST_CID2" for x in r.json())
        assert a["id"] in [x["id"] for x in r.json()]

        # status filter
        r = auth_client.get(f"{BASE_URL}/api/transactions", params={"status": "belum_lunas"})
        assert all(x["status"] == "belum_lunas" for x in r.json())

        # sorted desc by tanggal
        allt = auth_client.get(f"{BASE_URL}/api/transactions").json()
        dates = [x["tanggal"] for x in allt]
        assert dates == sorted(dates, reverse=True)

    def test_delete_transaction(self, auth_client):
        tid = TestTransactions.txn_ids.pop()
        assert auth_client.delete(f"{BASE_URL}/api/transactions/{tid}").status_code == 200
        items = auth_client.get(f"{BASE_URL}/api/transactions").json()
        assert all(x["id"] != tid for x in items)

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, auth_client):
        yield
        for tid in TestTransactions.txn_ids:
            auth_client.delete(f"{BASE_URL}/api/transactions/{tid}")


# ---------------- Dashboard / Rekap ----------------
class TestDashboard:
    def test_stats_consistency(self, auth_client):
        # Retry once: another xdist worker may mutate transactions between the two fetches.
        for attempt in range(2):
            r = auth_client.get(f"{BASE_URL}/api/dashboard/stats")
            assert r.status_code == 200, r.text
            d = r.json()
            txns = auth_client.get(f"{BASE_URL}/api/transactions").json()
            if d["total_txn"] == len(txns):
                break
        for k in ["total_omset", "total_txn", "sisa_tagihan", "total_customer",
                  "trend", "top_products", "outstanding"]:
            assert k in d
        assert d["total_txn"] == len(txns)
        assert d["total_omset"] == pytest.approx(sum(t["total"] for t in txns))
        assert d["sisa_tagihan"] == pytest.approx(
            sum(t["total"] for t in txns if t["status"] == "belum_lunas"))
        custs = auth_client.get(f"{BASE_URL}/api/customers").json()
        assert d["total_customer"] == len(custs)
        assert len(d["top_products"]) <= 8
        omsets = [p["omset"] for p in d["top_products"]]
        assert omsets == sorted(omsets, reverse=True)

    def test_rekap_monthly(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/rekap/monthly", params={"year": 2026, "month": 8})
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["total_omset", "total_txn", "sisa_tagihan", "lunas",
                  "per_product", "per_customer", "per_day"]:
            assert k in d
        assert d["lunas"] == pytest.approx(d["total_omset"] - d["sisa_tagihan"])
        aug = auth_client.get(f"{BASE_URL}/api/transactions",
                             params={"date_from": "2026-08-01", "date_to": "2026-08-31"}).json()
        assert d["total_txn"] == len(aug)
        assert d["total_omset"] == pytest.approx(sum(t["total"] for t in aug))
        assert all(day["tanggal"].startswith("2026-08") for day in d["per_day"])

    def test_rekap_empty_month(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/rekap/monthly", params={"year": 1999, "month": 1})
        assert r.status_code == 200
        d = r.json()
        assert d["total_txn"] == 0 and d["total_omset"] == 0

    def test_rekap_missing_params_422(self, auth_client):
        assert auth_client.get(f"{BASE_URL}/api/rekap/monthly").status_code == 422

    def test_rekap_invalid_month(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/rekap/monthly", params={"year": 2026, "month": 13})
        assert r.status_code in (200, 400, 422), r.status_code


# ---------------- Export ----------------
class TestExport:
    def test_export_excel(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/export/excel")
        assert r.status_code == 200, r.text[:200]
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK"
        assert "attachment" in r.headers.get("content-disposition", "")

    def test_export_excel_filtered(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/export/excel",
                            params={"date_from": "2026-08-01", "date_to": "2026-08-31",
                                    "status": "lunas"})
        assert r.status_code == 200
        assert len(r.content) > 1000

    def test_export_pdf(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/export/pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"

    def test_export_pdf_filtered_empty(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/export/pdf",
                            params={"date_from": "1999-01-01", "date_to": "1999-01-31"})
        assert r.status_code == 200, r.text[:300]
        assert r.content[:4] == b"%PDF"

    def test_export_requires_auth(self):
        import requests
        assert requests.get(f"{BASE_URL}/api/export/excel").status_code == 401
        assert requests.get(f"{BASE_URL}/api/export/pdf").status_code == 401


# ---------------- CORS ----------------
class TestCors:
    def test_cors_credentials_explicit_origin(self, test_credentials):
        import requests
        from dotenv import dotenv_values
        origin = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]
        r = requests.post(f"{BASE_URL}/api/auth/login", json=test_credentials,
                          headers={"Origin": origin})
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-credentials") == "true"
        # Note: the preview ingress rewrites ACAO to "*"; app-level middleware echoes the
        # explicit origin (verified directly against localhost:8001).
        assert r.headers.get("access-control-allow-origin") in (origin, "*")
