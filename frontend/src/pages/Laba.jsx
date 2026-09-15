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

export default function Laba() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get("/laba", { params: { year, month } }).then((r) => setData(r.data));
  }, [year, month]);

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y--) years.push(y);

  const download = async (kind) => {
    try {
      const res = await api.get(`/export/laba/${kind}`, {
        params: { year, month },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      const mm = String(month).padStart(2, "0");
      a.download = kind === "excel" ? `laporan_laba_${year}_${mm}.xlsx` : `laporan_laba_${year}_${mm}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mengekspor laporan");
    }
  };

  const untung = data && data.laba_bersih >= 0;

  return (
    <div className="space-y-6" data-testid="laba-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Laba &amp; Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Laba kotor, pengeluaran operasional, dan laba bersih per bulan.
          </p>
        </div>
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
          <Button variant="outline" onClick={() => download("excel")} data-testid="laba-export-excel" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={() => download("pdf")} data-testid="laba-export-pdf" className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {!data ? (
        <div className="text-slate-500">Memuat laporan...</div>
      ) : (
        <>
          {/* Peringatan harga pabrik belum lengkap */}
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

          {/* Kartu utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Wallet} label="Omset Penjualan" value={rupiah(data.omset)} tone="blue" sub={`${data.total_txn} transaksi`} testid="laba-omset" />
            <StatCard icon={Package} label="HPP (Harga Pabrik Terjual)" value={rupiah(data.hpp)} tone="amber" sub="Modal barang yang terjual" testid="laba-hpp" />
            <StatCard icon={TrendingUp} label="Laba Kotor" value={rupiah(data.laba_kotor)} tone={data.laba_kotor >= 0 ? "success" : "danger"} sub={`Margin ${data.margin_kotor_pct}%`} testid="laba-kotor" />
            <StatCard icon={Receipt} label="Pengeluaran Operasional" value={rupiah(data.pengeluaran)} tone="danger" sub="BBM, armada, lain-lain" testid="laba-pengeluaran" />
            <StatCard icon={PiggyBank} label="Laba Bersih" value={rupiah(data.laba_bersih)} tone={untung ? "success" : "danger"} sub={untung ? "Untung" : "Rugi"} testid="laba-bersih" />
            <StatCard icon={Percent} label="Margin Bersih" value={`${data.margin_bersih_pct}%`} tone={untung ? "success" : "danger"} sub="Laba bersih / omset" testid="laba-margin" />
          </div>

          {/* Rincian perhitungan */}
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

          {/* Grafik harian */}
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
            {/* Laba per produk */}
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

            {/* Pengeluaran per kategori + PO pabrik */}
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
        </>
      )}
    </div>
  );
}
