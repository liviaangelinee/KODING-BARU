# Rencana Pekerjaan (Updated) — CPLRekap

## 0) Ringkasan Status Saat Ini
- **Repo/Branch**: `liviaangelinee/blank-app` (branch: `conflict_150926_1313`)
- **Stack**: React (Shadcn UI + Tailwind + Recharts) + FastAPI + MongoDB.
- **Backend**:
  - Fitur **Kredit/Free**, **Setoran**, **Laporan Harian**, dan **Export Harian** sudah **selesai & teruji**.
  - **Dashboard stats** sudah ditambah field baru:
    - `setoran_hari_ini`
    - `setoran_bulan`
    - `free_hpp_bulan`
    - `tanggal_hari_ini`
  - Endpoint terkait fitur terbaru siap:
    - `GET/POST/PUT/DELETE /api/deposits`
    - `GET /api/laporan/harian` (mode bulan atau rentang tanggal)
    - `GET /api/export/harian/excel` dan `GET /api/export/harian/pdf`
    - `PATCH /api/transactions/{id}/status` menerima `lunas|kredit|free` (aturan: **Free tidak bisa diubah kembali**)
- **Frontend**:
  - UI untuk **Kredit/Free**, **Setoran**, **Laporan Harian**, serta update **Dashboard & Navigasi** sudah **selesai** dan terhubung ke backend.
  - Halaman baru tersedia:
    - `/setoran`
    - `/laporan-harian`
- **Testing**:
  - **testing_agent_v3 lulus** (backend 22/22 + semua skenario frontend lulus, 0 bug).
  - **Data uji otomatis sudah dibersihkan**.
- **Status fase**: Implementasi Frontend UI fitur terbaru => **COMPLETED**.

---

## 1) Tujuan (Objectives)
1. **Transaksi**: Mendukung status **Lunas / Kredit / Free** secara end-to-end dan mudah dipahami user.
2. **Setoran**: Ada halaman pencatatan setoran harian (CRUD), filter tanggal, dan ringkasan.
3. **Laporan Harian**: Menampilkan rekap harian lengkap (penjualan, pembelian, operasional, laba, setoran) + export Excel/PDF.
4. **Dashboard & Navigasi**: Menampilkan ringkasan Kredit, Setoran, dan Modal Free; navigasi ke halaman terkait.
5. **Tahap berikutnya**: Menunggu keputusan user untuk **reset semua data contoh** agar aplikasi mulai dari kondisi bersih.

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

### 2.2 Setoran (baru)
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

### 2.3 Laporan Harian (baru)
**Status: DONE**
- Page: `/laporan-harian`
- Default tampilan: **bulan berjalan** (year+month).
- Filter:
  - Mode bulan (year+month)
  - Mode rentang tanggal (date_from+date_to)
- Komponen utama:
  - 6 kartu ringkasan: Penjualan, Pembelian Pabrik, Operasional, Laba Bersih, Disetor, Selisih Setoran.
  - Tabel per hari + baris TOTAL.
  - Kartu “Cara Hitung” untuk menjelaskan rumus.
- Export:
  - Tombol export Excel/PDF terhubung ke:
    - `GET /api/export/harian/excel`
    - `GET /api/export/harian/pdf`

### 2.4 Dashboard Enhancement
**Status: DONE**
- Backend `GET /api/dashboard/stats` sudah ditambah:
  - `setoran_hari_ini`
  - `setoran_bulan`
  - `free_hpp_bulan`
  - `tanggal_hari_ini`
- Dashboard UI menampilkan kartu:
  - Kredit belum tertagih
  - Setoran hari ini
  - Setoran bulan ini
  - Modal barang Free (bulan ini)

---

## 3) Progress & Pekerjaan yang Sudah Selesai

### 3.1 Selesai (Done)
- Backend:
  - Status transaksi: **lunas/kredit/free** + aturan Free.
  - CRUD Setoran (`/api/deposits`).
  - Laporan Harian (`/api/laporan/harian`).
  - Export Harian Excel/PDF (`/api/export/harian/*`).
  - Dashboard stats: penambahan `setoran_hari_ini`, `setoran_bulan`, `free_hpp_bulan`, `tanggal_hari_ini`.
- Frontend:
  - Transaksi: status Lunas/Kredit/Free, info Free, total Rp 0 saat Free, customer opsional, ubah status via dropdown badge, filter status.
  - Halaman Setoran `/setoran`: CRUD + filter + ringkasan.
  - Halaman Laporan Harian `/laporan-harian`: mode Per Bulan & Rentang, ringkasan, tabel + TOTAL, export, “Cara Hitung”.
  - Navigasi sidebar: menu Setoran & Laporan Harian.
  - Dashboard: kartu setoran/free/kredit.
- Testing:
  - `testing_agent_v3` lulus (backend 22/22 + verifikasi UI frontend, tanpa bug).
  - Data uji otomatis sudah dibersihkan.

### 3.2 Sedang Berjalan (In Progress)
- Tidak ada pekerjaan teknis yang aktif.
- Menunggu keputusan user untuk **reset semua data contoh** (opsional, tergantung kebutuhan user).

---

## 4) Langkah Implementasi (Implementation Steps)

### Langkah 1 — Backend minor update (Dashboard stats)
**Status: DONE**
- Sudah menambahkan `setoran_hari_ini`, `setoran_bulan`, `free_hpp_bulan`, `tanggal_hari_ini` ke `/api/dashboard/stats`.

### Langkah 2 — Update Transaksi.jsx (Kredit/Free)
**Status: DONE**
- Status pembayaran: Lunas/Kredit/Free.
- Info box Free + total Rp 0.
- Customer opsional untuk Free.
- Ubah status via dropdown badge.
- Filter status mendukung 4 opsi.

### Langkah 3 — Buat halaman Setoran (Setoran.jsx)
**Status: DONE**
- CRUD setoran + filter + ringkasan.

### Langkah 4 — Buat halaman LaporanHarian (LaporanHarian.jsx)
**Status: DONE**
- Mode bulan & rentang tanggal.
- Ringkasan 
- Tabel + TOTAL.
- Export Excel/PDF.
- Kartu “Cara Hitung”.

### Langkah 5 — Routing, Navigasi, dan Dashboard
**Status: DONE**
- Routes baru di `App.js`: `/setoran`, `/laporan-harian`.
- Menu baru di `Layout.jsx`: Setoran, Laporan Harian.
- Kartu dashboard untuk setoran/free/kredit.

### Langkah 6 — Data Hygiene (opsional, menunggu persetujuan user)
**Status: PENDING (menunggu keputusan user)**
- Opsi 1: Biarkan data contoh yang sudah ada.
- Opsi 2: Reset total agar mulai bersih (hapus data contoh):
  - transaksi, PO pabrik, pengeluaran, setoran (dan data lain jika diinginkan).
- Jika user setuju:
  - Buat/ jalankan skrip pembersihan database dengan konfirmasi koleksi mana yang dihapus.

---

## 5) Testing & Verifikasi (Wajib)

### 5.1 Manual smoke test (developer)
**Status: DONE**
- Flow Transaksi (Lunas/Kredit/Free) + ubah status.
- Flow Setoran CRUD.
- Flow Laporan Harian + export.
- Dashboard & navigasi.

### 5.2 Otomatis: `testing_agent_v3`
**Status: DONE**
- Lulus (backend 22/22 + seluruh skenario UI penting, 0 bug).

---

## 6) Deployment/Runbook (Lokal)
- Backend: jalankan FastAPI sesuai instruksi repo.
- Frontend: `npm/yarn install` lalu `npm/yarn start`.
- Pastikan env `REACT_APP_BACKEND_URL` mengarah ke backend yang benar.

---

## 7) Post-Implementation / Data Hygiene
- **Menunggu keputusan user**: apakah ingin reset semua data contoh agar penggunaan dimulai dari nol.
- Jika disetujui, lakukan pembersihan data dengan aman (konfirmasi koleksi yang dihapus).

---

## 8) Risiko & Catatan
- **Free flow**: status Free tidak bisa dipulihkan menjadi Lunas/Kredit oleh backend; UI sudah menampilkan error dengan jelas.
- **Konsistensi angka**: seluruh perhitungan rekap/keuangan memakai endpoint backend (tanpa mock data).
- **Catatan perubahan dashboard**: field `setoran_bulan` digunakan (bukan `setoran_bulan_ini`). Pastikan konsisten jika ada dokumentasi/komunikasi ke user.