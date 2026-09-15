import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupiah } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Wallet,
  Package,
  TrendingUp,
  TrendingDown,
  Receipt,
  PiggyBank,
  Factory,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Percent,
  Info,
  CalendarRange,
  Trophy,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function StatCard({ icon: Icon, label, value, tone = "default", sub, testid }) {
  const tones = {
    default: "text-slate-900",
    danger: "text-red-600",
    success: "text-emerald-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
  };
  const bg = {
    default: "bg-slate-100 text-slate-600",
    danger: "bg-red-100 text-red-600",
    success: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
  };
  return (
    <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-heading font-bold tabular ${tones[tone]}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${bg[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* ------------------------- Tab: Per Bulan ------------------------- */

function LabaBulanan({ year, month, setYear, setMonth, years }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get("/laba", { params: { year, month } }).then((r) => setData(r.data));
  }, [year, month]);

  const download = async (kind) => {
    try {
      const res = await api.get(`/export/laba/${kind}`, {
        params: { year, month },
        responseType: "blob",
      });
      const mm = String(month).padStart(2, "0");
      downloadBlob(res, kind === "excel" ? `laporan_laba_${year}_${mm}.xlsx` : `laporan_laba_${year}_${mm}.pdf`);
    } catch (e) {
      toast.error("Gagal mengekspor laporan");
    }
  };

  if (!data) return <div className="text-slate-500">Memuat laporan...</div>;

  const untung = data.laba_bersih >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40" data-testid="laba-month"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28" data-testid="laba-year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => download("excel")} data-testid="laba-export-excel" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={() => download("pdf")} data-testid="laba-export-pdf" className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {data.varian_tanpa_harga_pabrik.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50 shadow-none rounded-lg" data-testid="laba-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">
                {data.varian_tanpa_harga_pabrik.length} varian belum punya Harga Pabrik
              </p>
              <p className="text-amber-800 mt-0.5">
                Laba kotor belum akurat untuk varian tersebut karena HPP dihitung Rp 0. Isi kolom{" "}
                <span className="font-semibold">Harga Pabrik</span> di menu{" "}
                <Link to="/produk" className="underline font-semibold hover:text-amber-950">Produk</Link>.
              </p>
              <p className="text-amber-700 text-xs mt-1.5">
                {data.varian_tanpa_harga_pabrik
                  .slice(0, 12)
                  .map((v) => `${v.produk} ${v.varian}`)
                  .join(" \u00b7 ")}
                {data.varian_tanpa_harga_pabrik.length > 12 ? " \u00b7 ..." : ""}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Omset Penjualan" value={rupiah(data.omset)} tone="blue" sub={`${data.total_txn} transaksi`} testid="laba-omset" />
        <StatCard icon={Package} label="HPP (Harga Pabrik Terjual)" value={rupiah(data.hpp)} tone="amber" sub="Modal barang yang terjual" testid="laba-hpp" />
        <StatCard icon={TrendingUp} label="Laba Kotor" value={rupiah(data.laba_kotor)} tone={data.laba_kotor >= 0 ? "success" : "danger"} sub={`Margin ${data.margin_kotor_pct}%`} testid="laba-kotor" />
        <StatCard icon={Receipt} label="Pengeluaran Operasional" value={rupiah(data.pengeluaran)} tone="danger" sub="BBM, armada, lain-lain" testid="laba-pengeluaran" />
        <StatCard icon={PiggyBank} label="Laba Bersih" value={rupiah(data.laba_bersih)} tone={untung ? "success" : "danger"} sub={untung ? "Untung" : "Rugi"} testid="laba-bersih" />
        <StatCard icon={Percent} label="Margin Bersih" value={`${data.margin_bersih_pct}%`} tone={untung ? "success" : "danger"} sub="Laba bersih / omset" testid="laba-margin" />
      </div>

      <Card className="p-6 border-slate-200 shadow-none rounded-lg" data-testid="laba-breakdown">
        <h3 className="font-heading font-semibold text-slate-800 mb-4">
          Rincian Perhitungan — {MONTHS[month - 1]} {year}
        </h3>
        <div className="space-y-0 text-sm max-w-2xl">
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-600">Omset Penjualan</span>
            <span className="font-semibold tabular text-slate-900">{rupiah(data.omset)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-600">HPP — harga pabrik barang yang terjual</span>
            <span className="font-semibold tabular text-amber-600">&minus; {rupiah(data.hpp)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b-2 border-slate-300 bg-slate-50 px-2 -mx-2">
            <span className="font-semibold text-slate-800">LABA KOTOR</span>
            <span className={`font-bold tabular ${data.laba_kotor >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {rupiah(data.laba_kotor)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-600">Pengeluaran Operasional</span>
            <span className="font-semibold tabular text-red-600">&minus; {rupiah(data.pengeluaran)}</span>
          </div>
          <div className={`flex items-center justify-between py-3 px-2 -mx-2 rounded-md mt-1 ${untung ? "bg-emerald-50" : "bg-red-50"}`}>
            <span className="font-bold text-slate-900 flex items-center gap-2">
              {untung ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              LABA BERSIH
            </span>
            <span className={`text-lg font-bold tabular ${untung ? "text-emerald-700" : "text-red-700"}`}>
              {rupiah(data.laba_bersih)}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <h3 className="font-heading font-semibold text-slate-800 mb-4">
          Omset, HPP &amp; Laba Harian — {MONTHS[month - 1]} {year}
        </h3>
        {data.per_day.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Belum ada data bulan ini.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.per_day} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} width={50} />
              <Tooltip formatter={(v) => rupiah(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="omset" name="Omset" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hpp" name="HPP" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="laba" name="Laba" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="laba-per-produk">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-heading font-semibold text-slate-800">Laba per Produk</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="text-left py-2.5 px-3">Produk</th>
                  <th className="text-right py-2.5 px-3">Qty</th>
                  <th className="text-right py-2.5 px-3">Omset</th>
                  <th className="text-right py-2.5 px-3">HPP</th>
                  <th className="text-right py-2.5 px-3">Laba</th>
                </tr>
              </thead>
              <tbody>
                {data.per_product.map((p) => (
                  <tr key={p.nama} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{p.nama}</td>
                    <td className="py-2.5 px-3 text-right tabular text-slate-600">{p.qty}</td>
                    <td className="py-2.5 px-3 text-right tabular text-slate-600">{rupiah(p.omset)}</td>
                    <td className="py-2.5 px-3 text-right tabular text-amber-600">{rupiah(p.hpp)}</td>
                    <td className={`py-2.5 px-3 text-right font-semibold tabular ${p.laba >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {rupiah(p.laba)}
                    </td>
                  </tr>
                ))}
                {data.per_product.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400">Belum ada penjualan bulan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="laba-per-kategori">
            <h3 className="font-heading font-semibold text-slate-800 mb-3">Pengeluaran per Kategori</h3>
            {data.per_kategori.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Belum ada pengeluaran.</p>
            ) : (
              <div className="space-y-2">
                {data.per_kategori.map((k) => (
                  <div key={k.kategori} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700 truncate pr-2">{k.kategori}</span>
                    <span className="text-sm font-bold text-red-600 tabular shrink-0">{rupiah(k.jumlah)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 pt-2 border-t border-slate-200">
                  <span className="text-sm font-semibold text-slate-800">Total</span>
                  <span className="text-sm font-bold text-red-700 tabular">{rupiah(data.pengeluaran)}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="laba-po-pabrik">
            <div className="flex items-center gap-2 mb-3">
              <Factory className="h-4 w-4 text-amber-600" />
              <h3 className="font-heading font-semibold text-slate-800">Pembelian ke Pabrik</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Total PO bulan ini</span>
                <span className="text-sm font-bold text-slate-900 tabular">{rupiah(data.total_po_pabrik)}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Jumlah PO</span>
                <span className="text-sm font-bold text-slate-900 tabular">{data.jumlah_po}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <span className="text-sm text-slate-800">Hutang ke pabrik</span>
                <span className="text-sm font-bold text-red-700 tabular">{rupiah(data.hutang_pabrik)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-3 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                Total PO <span className="font-semibold">tidak</span> langsung mengurangi laba. Yang mengurangi
                laba adalah HPP, yaitu harga pabrik dari barang yang benar-benar sudah terjual. Stok yang masih
                di gudang belum dihitung sebagai biaya.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Tab: Per Tahun ------------------------- */

function LabaTahunan({ year, setYear, years, onPilihBulan }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get("/laba/yearly", { params: { year } }).then((r) => setData(r.data));
  }, [year]);

  const download = async (kind) => {
    try {
      const res = await api.get(`/export/laba/yearly/${kind}`, {
        params: { year },
        responseType: "blob",
      });
      downloadBlob(res, kind === "excel" ? `laporan_tahunan_${year}.xlsx` : `laporan_tahunan_${year}.pdf`);
    } catch (e) {
      toast.error("Gagal mengekspor laporan tahunan");
    }
  };

  if (!data) return <div className="text-slate-500">Memuat laporan tahunan...</div>;

  const untung = data.total_laba_bersih >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32" data-testid="tahunan-year"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => download("excel")} data-testid="tahunan-export-excel" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={() => download("pdf")} data-testid="tahunan-export-pdf" className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Ringkasan setahun */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label={`Omset ${year}`} value={rupiah(data.total_omset)} tone="blue" sub={`${data.total_txn} transaksi`} testid="tahunan-omset" />
        <StatCard icon={Package} label="HPP Setahun" value={rupiah(data.total_hpp)} tone="amber" testid="tahunan-hpp" />
        <StatCard icon={Receipt} label="Pengeluaran Setahun" value={rupiah(data.total_pengeluaran)} tone="danger" testid="tahunan-pengeluaran" />
        <StatCard
          icon={PiggyBank}
          label="Laba Bersih Setahun"
          value={rupiah(data.total_laba_bersih)}
          tone={untung ? "success" : "danger"}
          sub={`Margin ${data.margin_bersih_pct}%`}
          testid="tahunan-laba-bersih"
        />
      </div>

      {data.bulan_aktif === 0 ? (
        <Card className="p-12 border-slate-200 shadow-none rounded-lg text-center" data-testid="tahunan-empty">
          <CalendarRange className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Belum ada data untuk tahun {year}</p>
          <p className="text-sm text-slate-400 mt-1">
            Mulai input transaksi, PO pabrik, dan pengeluaran untuk melihat perbandingan laba antar bulan.
          </p>
        </Card>
      ) : (
        <>
          {/* Sorotan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-emerald-200 bg-emerald-50 shadow-none rounded-lg" data-testid="tahunan-terbaik">
              <div className="flex items-center gap-2 mb-1.5">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Bulan Paling Untung</p>
              </div>
              <p className="font-heading font-bold text-lg text-slate-900">{data.bulan_terbaik?.nama_bulan}</p>
              <p className="text-xl font-bold text-emerald-700 tabular">{rupiah(data.bulan_terbaik?.laba_bersih)}</p>
            </Card>
            <Card className="p-5 border-red-200 bg-red-50 shadow-none rounded-lg" data-testid="tahunan-terburuk">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Bulan Paling Rendah</p>
              </div>
              <p className="font-heading font-bold text-lg text-slate-900">{data.bulan_terburuk?.nama_bulan}</p>
              <p className="text-xl font-bold text-red-700 tabular">{rupiah(data.bulan_terburuk?.laba_bersih)}</p>
            </Card>
            <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="tahunan-rata">
              <div className="flex items-center gap-2 mb-1.5">
                <Calculator className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rata-rata per Bulan</p>
              </div>
              <p className="font-heading font-bold text-lg text-slate-900">{data.bulan_aktif} bulan aktif</p>
              <p className={`text-xl font-bold tabular ${data.rata_laba_bersih >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {rupiah(data.rata_laba_bersih)}
              </p>
            </Card>
          </div>

          {/* Grafik tren */}
          <Card className="p-5 border-slate-200 shadow-none rounded-lg">
            <h3 className="font-heading font-semibold text-slate-800 mb-1">Tren Laba Bersih per Bulan — {year}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Batang hijau = bulan untung, merah = bulan rugi. Garis biru menunjukkan omset.
            </p>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data.per_bulan} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nama_singkat" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} width={55} />
                <Tooltip formatter={(v) => rupiah(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="laba_bersih" name="Laba Bersih" fill="#059669" radius={[4, 4, 0, 0]}>
                  {data.per_bulan.map((b, i) => (
                    <Cell key={i} fill={b.laba_bersih >= 0 ? "#059669" : "#ef4444"} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="omset" name="Omset" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Grafik komposisi */}
          <Card className="p-5 border-slate-200 shadow-none rounded-lg">
            <h3 className="font-heading font-semibold text-slate-800 mb-4">Omset, HPP &amp; Pengeluaran per Bulan — {year}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data.per_bulan} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nama_singkat" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} width={55} />
                <Tooltip formatter={(v) => rupiah(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="omset" name="Omset" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hpp" name="HPP" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Tabel 12 bulan */}
          <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="tahunan-table">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-heading font-semibold text-slate-800">Perbandingan Bulanan {year}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Klik nama bulan untuk melihat rinciannya.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="text-left py-2.5 px-3">Bulan</th>
                    <th className="text-right py-2.5 px-3">Omset</th>
                    <th className="text-right py-2.5 px-3">HPP</th>
                    <th className="text-right py-2.5 px-3">Laba Kotor</th>
                    <th className="text-right py-2.5 px-3">Pengeluaran</th>
                    <th className="text-right py-2.5 px-3">Laba Bersih</th>
                    <th className="text-right py-2.5 px-3">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_bulan.map((b) => {
                    const kosong = !b.omset && !b.pengeluaran;
                    return (
                      <tr
                        key={b.bulan}
                        className={`border-t border-slate-100 hover:bg-slate-50 ${kosong ? "text-slate-400" : ""}`}
                        data-testid={`tahunan-row-${b.bulan}`}
                      >
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => onPilihBulan(b.bulan)}
                            className="font-medium text-blue-600 hover:underline"
                            data-testid={`tahunan-goto-${b.bulan}`}
                          >
                            {b.nama_bulan}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular">{rupiah(b.omset)}</td>
                        <td className={`py-2.5 px-3 text-right tabular ${kosong ? "" : "text-amber-600"}`}>{rupiah(b.hpp)}</td>
                        <td className="py-2.5 px-3 text-right tabular">{rupiah(b.laba_kotor)}</td>
                        <td className={`py-2.5 px-3 text-right tabular ${kosong ? "" : "text-red-600"}`}>{rupiah(b.pengeluaran)}</td>
                        <td className={`py-2.5 px-3 text-right font-semibold tabular ${kosong ? "" : b.laba_bersih >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {rupiah(b.laba_bersih)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular">{b.margin_bersih_pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td className="py-3 px-3 text-slate-900">TOTAL {year}</td>
                    <td className="py-3 px-3 text-right tabular text-slate-900">{rupiah(data.total_omset)}</td>
                    <td className="py-3 px-3 text-right tabular text-amber-700">{rupiah(data.total_hpp)}</td>
                    <td className="py-3 px-3 text-right tabular text-slate-900">{rupiah(data.total_laba_kotor)}</td>
                    <td className="py-3 px-3 text-right tabular text-red-700">{rupiah(data.total_pengeluaran)}</td>
                    <td className={`py-3 px-3 text-right tabular ${untung ? "text-emerald-700" : "text-red-700"}`}>
                      {rupiah(data.total_laba_bersih)}
                    </td>
                    <td className="py-3 px-3 text-right tabular text-slate-900">{data.margin_bersih_pct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------- Halaman ------------------------- */

export default function Laba() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState("bulanan");

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y--) years.push(y);

  const pilihBulan = (m) => {
    setMonth(m);
    setTab("bulanan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6" data-testid="laba-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Laba &amp; Keuangan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Laba kotor, pengeluaran operasional, dan laba bersih — per bulan maupun perbandingan setahun.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="laba-tabs">
          <TabsTrigger value="bulanan" data-testid="tab-bulanan">Per Bulan</TabsTrigger>
          <TabsTrigger value="tahunan" data-testid="tab-tahunan">Laporan Tahunan</TabsTrigger>
        </TabsList>

        <TabsContent value="bulanan" className="mt-6">
          <LabaBulanan year={year} month={month} setYear={setYear} setMonth={setMonth} years={years} />
        </TabsContent>

        <TabsContent value="tahunan" className="mt-6">
          <LabaTahunan year={year} setYear={setYear} years={years} onPilihBulan={pilihBulan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
