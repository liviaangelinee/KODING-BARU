"""Reset data aplikasi CPLRekap agar mulai dari nol.

Menghapus: transaksi, PO pabrik, pengeluaran, setoran, produk, dan customer.
TIDAK menghapus akun login (users) supaya pemilik tetap bisa masuk.

Pemakaian:
    cd /app/backend && python scripts/reset_data.py --yes
"""
import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

COLLECTIONS = ["transactions", "purchase_orders", "expenses", "deposits", "products", "customers"]


async def main(confirmed: bool):
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "cplrekap")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    before = {c: await db[c].count_documents({}) for c in COLLECTIONS}
    print("Jumlah data saat ini:")
    for c, n in before.items():
        print(f"  - {c}: {n}")

    if not confirmed:
        print("\nBatal. Jalankan ulang dengan flag --yes untuk benar-benar menghapus.")
        client.close()
        return

    for c in COLLECTIONS:
        res = await db[c].delete_many({})
        print(f"Dihapus {res.deleted_count} dokumen dari {c}")

    # Tandai bahwa produk contoh tidak perlu dibuat ulang saat backend restart.
    await db.meta.update_one(
        {"key": "products_seeded"},
        {"$set": {"key": "products_seeded", "at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    print("Selesai. Akun login tetap aman.")
    client.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true", help="konfirmasi penghapusan")
    args = ap.parse_args()
    asyncio.run(main(args.yes))
    sys.exit(0)
