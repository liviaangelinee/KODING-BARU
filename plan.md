# Rencana Pekerjaan (Updated) — CPLRekap

## 0) Ringkasan Status Saat Ini
- **Repo/Branch**: `liviaangelinee/blank-app` (branch: `conflict_150926_1313`)
- **Stack**: React (Shadcn UI + Tailwind + Recharts) + FastAPI + MongoDB.
- **Backend**:
  - Fitur **Kredit/Free**, **Setoran**, **Laporan Harian**, dan **Export Harian** sudah **selesai & teruji**.
  - **Dashboard stats** sudah ditambah field:
    - `setoran_hari_ini`
    - `setoran_bulan`
    - `free_hpp_bulan`
    - `tanggal_hari_ini`
  - **Alasan Barang Free** sudah ditambahkan:
    - Field transaksi: `free_alasan` (default **Pemakaian Sendiri** bila status `free`)
    - Endpoint: `GET /api/transactions/free-reasons`
    - Laporan harian: `free_per_alasan`
    - Export harian: sheet/tabel "Barang Free"
    - Export penjualan: status menjadi teks seperti **"Free (Promo)"**
  - **Reset Data** sudah dilakukan dan dipastikan **produk contoh tidak muncul lagi** setelah restart.
- **Frontend**:
  - UI untuk **Kredit/Free**, **Setoran**, **Laporan Harian**, Dashboard & Navigasi sudah **selesai**.
  - UI **Alasan Barang Free** sudah **selesai**:
    - Dropdown alasan + input manual
    - Alasan tampil di tabel transaksi
    - Tabel "Rincian Barang Free" di Laporan Harian
- **Testing**:
  - Iterasi 4: `testing_agent_v3` lulus (backend 22/22 + semua skenario frontend lulus, 0 bug).
  - Iterasi 5 (Alasan Barang Free): `testing_agent_v3` lulus (backend 19/19 + semua UI flow lulus).
- **Status fase**:
  - Implementasi Frontend UI fitur terbaru => **COMPLETED**.
  - Implementasi **Alasan Barang Free** + **Reset Data** => **COMPLETED**.
- **Catatan kondisi sistem setelah reset**:
  - Koleksi data (transactions, purchase_orders, expenses, deposits, products, customers) = **0**.
  - Akun login (**users**) tetap ada.

---

## 1) Tujuan (Objectives)
1. **Transaksi**: Mendukung status **Lunas / Kredit / Free** + pelacakan **alasan Free**.
2. **Setoran**: Ada pencatatan setoran harian (CRUD), filter tanggal, ringkasan.
3. **Laporan Harian**: Rekap harian lengkap + export Excel/PDF, termasuk ringkasan **barang free per alasan**.
4. **Dashboard & Navigasi**: Menampilkan ringkasan Kredit, Setoran, dan Modal Free.
5. **Go-Live**: Database sudah **bersih**. User bisa mulai input data real dari nol.
6. **(DIBATALKAN)** Rekap WhatsApp: tidak dikerjakan karena user membatalkan.

---

## 2) Cakupan Fitur (Scope)

### 2.1 Transaksi: Kredit & Free
**Status: DONE**
- Dropdown status pada form transaksi: `lunas | kredit | free`.
- Saat status **Free** dipilih:
  - UI menampilkan info box penjelasan (omset Rp 0 tapi HPP tetap dihitung).
  - Total form otomatis menjadi Rp 0.
  - Customer menjadi **opsional** (backend mengisi `Pemakaian Sendiri`).
- Tabel transaksi:
  - Badge status warna (Lunas/Kredit/Free).
  - Ubah status via dropdown pada badge yang memanggil `PATCH /transactions/{id}/status`.
  - Jika mencoba Free → Lunas/Kredit: UI menampilkan error sesuai backend (tidak crash).
- Filter status transaksi mendukung `all|lunas|kredit|free`.

### 2.2 Alasan Barang Free (Promo/Sampel/Pemakaian Sendiri/Lainnya + Manual)
**Status: DONE**
- Backend:
  - Field `free_alasan` pada transaksi.
  - Default bila status `free` dan alasan kosong: **"Pemakaian Sendiri"**.
  - Bila status bukan `free`, `free_alasan` dikosongkan.
  - Endpoint `GET /api/transactions/free-reasons`:
    - Mengembalikan default: `Promo`, `Sampel`, `Pemakaian Sendiri`, `Lainnya`
    - + alasan manual yang pernah dipakai (agar muncul sebagai pilihan berikutnya).
  - Laporan harian mengembalikan `free_per_alasan`.
  - Export harian:
    - Excel: sheet "Barang Free"
    - PDF: tabel rincian "Rincian Barang Free"
  - Export penjualan (Excel/PDF): kolom status menampilkan **"Free (ALASAN)"**.
- Frontend:
  - Pada status Free, muncul dropdown **Alasan Barang Free**.
  - Jika pilih **Lainnya**, muncul input manual.
  - Alasan tampil di bawah badge status Free pada tabel transaksi.
  - Laporan Harian menampilkan tabel "Rincian Barang Free".

### 2.3 Setoran (baru)
**Status: DONE**
- Page: `/setoran`
- Fitur:
  - Form input setoran: tanggal, jumlah, catatan.
  - CRUD: tambah, edit, hapus.
  - Filter: default **bulan berjalan** + bisa rentang tanggal, serta opsi “Semua Data”.
  - Ringkasan: total periode, setoran hari ini, jumlah transaksi setoran.
- Endpoint:
  - `GET /api/deposits?date_from=&date_to=`
  - `POST /api/deposits`
  - `PUT /api/deposits/{id}`
  - `DELETE /api/deposits/{id}`

### 2.4 Laporan Harian (baru)
**Status: DONE**
- Page: `/laporan-harian`
- Default tampilan: **bulan berjalan** (year+month).
- Filter:
  - Mode bulan (year+month)
  - Mode rentang tanggal (date_from+date_to)
- Komponen utama:
  - 6 kartu ringkasan: Penjualan, Pembelian Pabrik, Operasional, Laba Bersih, Disetor, Selisih Setoran.
  - Tabel per hari + baris TOTAL.
  - Tabel tambahan: **Rincian Barang Free** per alasan.
  - Kartu “Cara Hitung” untuk menjelaskan rumus.
- Export:
  - `GET /api/export/harian/excel`
  - `GET /api/export/harian/pdf`

### 2.5 Dashboard Enhancement
**Status: DONE**
- Backend `GET /api/dashboard/stats` berisi:
  - `setoran_hari_ini`, `setoran_bulan`, `free_hpp_bulan`, `tanggal_hari_ini`
- Dashboard UI menampilkan kartu:
  - Kredit belum tertagih
  - Setoran hari ini
  - Setoran bulan ini
  - Modal barang Free (bulan ini)

### 2.6 Reset Data (Mulai dari Nol)
**Status: DONE**
- Script: `/app/backend/scripts/reset_data.py`
  - Menghapus: `transactions`, `purchase_orders`, `expenses`, `deposits`, `products`, `customers`
  - Tidak menghapus: `users` (akun login tetap ada)
- Ditambahkan flag meta `products_seeded` agar produk seed **tidak dibuat ulang** setelah reset dan restart backend.
- Verifikasi pasca reset:
  - Semua koleksi terkait = 0
  - Dashboard & halaman lain menampilkan empty state dengan normal

---

## 3) Progress & Pekerjaan yang Sudah Selesai

### 3.1 Selesai (Done)
- Backend:
  - Status transaksi: **lunas/kredit/free** + aturan Free.
  - CRUD Setoran (`/api/deposits`).
  - Laporan Harian (`/api/laporan/harian`) + `free_per_alasan`.
  - Export Harian Excel/PDF (`/api/export/harian/*`) + rincian Barang Free.
  - Export penjualan Excel/PDF: status menampilkan **Free (Alasan)**.
  - Dashboard stats: `setoran_hari_ini`, `setoran_bulan`, `free_hpp_bulan`, `tanggal_hari_ini`.
  - Endpoint alasan free: `GET /api/transactions/free-reasons`.
  - Script reset data: `backend/scripts/reset_data.py`.
  - Seed produk tidak muncul lagi setelah reset (via meta `products_seeded`).
- Frontend:
  - Transaksi: status Lunas/Kredit/Free, info Free, total Rp 0 saat Free, customer opsional, ubah status via dropdown badge, filter status.
  - Input alasan Free: dropdown + input manual jika "Lainnya".
  - Tabel transaksi: menampilkan alasan di bawah badge Free.
  - Halaman Setoran `/setoran`: CRUD + filter + ringkasan.
  - Halaman Laporan Harian `/laporan-harian`: mode Per Bulan & Rentang, ringkasan, tabel + TOTAL, export, “Cara Hitung”, dan tabel "Rincian Barang Free".
  - Navigasi sidebar: menu Setoran & Laporan Harian.
  - Dashboard: kartu setoran/free/kredit.
- Testing:
  - Iterasi 4 lulus.
  - Iterasi 5 (alasan free) lulus.
- Data:
  - Reset total sudah dijalankan sesuai permintaan user (termasuk produk & customer).

### 3.2 Sedang Berjalan (In Progress)
- Tidak ada pekerjaan teknis yang aktif.
- Sistem siap dipakai input data real.

---

## 4) Langkah Implementasi (Implementation Steps)

### Langkah 1 — Backend minor update (Dashboard stats)
**Status: DONE**
- Menambahkan `setoran_hari_ini`, `setoran_bulan`, `free_hpp_bulan`, `tanggal_hari_ini` ke `/api/dashboard/stats`.

### Langkah 2 — Update Transaksi.jsx (Kredit/Free)
**Status: DONE**
- Status pembayaran: Lunas/Kredit/Free.
- Info box Free + total Rp 0.
- Customer opsional untuk Free.
- Ubah status via dropdown badge.
- Filter status mendukung 4 opsi.

### Langkah 3 — Implementasi Alasan Barang Free
**Status: DONE**
- Backend:
  - Tambah `free_alasan` di transaksi (create/update/patch status).
  - Tambah endpoint `GET /api/transactions/free-reasons`.
  - Tambah agregasi `free_per_alasan` di laporan harian.
  - Tambah rincian barang free ke export Excel/PDF harian.
  - Update export penjualan agar status = `Free (alasan)`.
- Frontend:
  - Dropdown alasan Free + input manual bila "Lainnya".
  - Tampilkan alasan pada tabel transaksi.
  - Tampilkan tabel rincian barang free pada laporan harian.

### Langkah 4 — Buat halaman Setoran (Setoran.jsx)
**Status: DONE**
- CRUD setoran + filter + ringkasan.

### Langkah 5 — Buat halaman LaporanHarian (LaporanHarian.jsx)
**Status: DONE**
- Mode bulan & rentang tanggal.
- Ringkasan, tabel + TOTAL.
- Export Excel/PDF.
- Kartu “Cara Hitung”.
- Tabel rincian barang free per alasan.

### Langkah 6 — Routing, Navigasi, dan Dashboard
**Status: DONE**
- Routes baru di `App.js`: `/setoran`, `/laporan-harian`.
- Menu baru di `Layout.jsx`: Setoran, Laporan Harian.
- Kartu dashboard untuk setoran/free/kredit.

### Langkah 7 — Reset Data (mulai dari nol)
**Status: DONE**
- Jalankan `python backend/scripts/reset_data.py --yes`.
- Konfirmasi hasil: semua koleksi terkait jadi 0.

### Langkah 8 — (DIBATALKAN) Rekap WhatsApp
**Status: CANCELED**
- User menyatakan tidak jadi.

---

## 5) Testing & Verifikasi (Wajib)

### 5.1 Manual smoke test (developer)
**Status: DONE**
- Flow Transaksi (Lunas/Kredit/Free) + ubah status.
- Flow Setoran CRUD.
- Flow Laporan Harian + export.
- Flow Alasan Free (dropdown + manual + tampil di laporan dan export).
- Dashboard & navigasi.

### 5.2 Otomatis: `testing_agent_v3`
**Status: DONE**
- Iterasi 4: lulus.
- Iterasi 5 (alasan free): lulus.

---

## 6) Deployment/Runbook (Lokal)
- Backend: jalankan FastAPI sesuai instruksi repo.
- Frontend: `npm/yarn install` lalu `npm/yarn start`.
- Pastikan env `REACT_APP_BACKEND_URL` mengarah ke backend yang benar.

---

## 7) Post-Implementation / Go-Live Checklist
- **PENTING (setelah reset data)**: sebelum mulai input transaksi, user perlu:
  1) Tambah **Produk** (beserta varian) dan isi:
     - **Harga Pabrik** (untuk HPP)
     - **Harga SO** (harga jual)
  2) Tambah **Customer**
  3) Baru input **Transaksi**, **PO Pabrik**, **Pengeluaran**, **Setoran**

---

## 8) Risiko & Catatan
- **Free flow**: status Free tidak bisa dipulihkan menjadi Lunas/Kredit oleh backend; UI sudah menampilkan error dengan jelas.
- **Konsistensi angka**: seluruh perhitungan rekap/keuangan memakai endpoint backend (tanpa mock data).
- **Seed produk**: setelah reset, produk seed tidak dibuat ulang (via meta `products_seeded`). Jika suatu saat butuh seed ulang, harus dilakukan manual.
- **Ekspor**: export harian Excel/PDF kini berisi rincian barang free per alasan; export penjualan menampilkan status "Free (alasan)".