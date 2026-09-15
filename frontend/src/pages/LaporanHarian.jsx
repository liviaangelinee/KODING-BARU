import { useEffect, useMemo, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSpreadsheet,
  FileText,
  Wallet,
  Factory,
  Receipt,
  PiggyBank,
  HandCoins,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const p2 = (n) => String(n).padStart(2, "0");

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

export default function LaporanHarian() {
  const now = new Date();
  const [mode, setMode] = useState("bulan");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dateFrom, setDateFrom] = useState(
    `${now.getFullYear()}-${p2(now.getMonth() + 1)}-01`
  );
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    if (mode === "bulan") return { year, month };
    return { date_from: dateFrom, date_to: dateTo };
  }, [mode, year, month, dateFrom, dateTo]);

  const load = () => {
    if (mode === "rentang" && (!dateFrom || !dateTo)) return;
    setLoading(true);
    api
      .get("/laporan/harian", { params })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.detail || "Gagal memuat laporan harian"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [params]);

  const download = async (kind) => {
    try {
      const res = await api.get(`/export/harian/${kind}`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "excel" ? "laporan_harian.xlsx" : "laporan_harian.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Laporan berhasil diunduh");
    } catch (e) {
      toast.error("Gagal mengekspor laporan");
    }
  };

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 5; y--) years.push(y);

  const t = data?.total;
  const rows = data?.per_hari || [];

  return (
    <div className="space-y-6" data-testid="laporan-harian-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Laporan Harian</h1>
        <p className="text-sm text-slate-500 mt-1">
          Rekap per hari: penjualan, pembelian ke pabrik, operasional, laba bersih, dan setoran ke pemilik.
        </p>
      </div>

      {/* Filter */}
      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <div className="flex flex-wrap items-end gap-3">
          <Tabs value={mode} onValueChange={setMode} className="mr-2">
            <TabsList data-testid="harian-mode-tabs">
              <TabsTrigger value="bulan" data-testid="harian-mode-bulan">Per Bulan</TabsTrigger>
              <TabsTrigger value="rentang" data-testid="harian-mode-rentang">Rentang Tanggal</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "bulan" ? (
            <>
              <div>
                <Label className="text-xs text-slate-500">Bulan</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="mt-1 w-40" data-testid="harian-bulan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BULAN.map((b, i) => (
                      <SelectItem key={b} value={String(i + 1)}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Tahun</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="mt-1 w-32" data-testid="harian-tahun"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs text-slate-500">Dari</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-40" data-testid="harian-from" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Sampai</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-40" data-testid="harian-to" />
              </div>
            </>
          )}

          <div className="flex-1" />
          <Button variant="outline" onClick={() => download("excel")} data-testid="harian-export-excel" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={() => download("pdf")} data-testid="harian-export-pdf" className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </Card>

      {/* Ringkasan periode */}
      {t && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Wallet} label="Penjualan" value={rupiah(t.penjualan)} tone="blue" sub={`Kas masuk ${rupiah(t.kas_masuk)}`} testid="harian-total-penjualan" />
          <StatCard icon={Factory} label="Pembelian Pabrik" value={rupiah(t.pembelian)} tone="amber" sub={`Dibayar ${rupiah(t.pembayaran_pabrik)}`} testid="harian-total-pembelian" />
          <StatCard icon={Receipt} label="Operasional" value={rupiah(t.operasional)} tone="danger" testid="harian-total-operasional" />
          <StatCard
            icon={PiggyBank}
            label="Laba Bersih"
            value={rupiah(t.laba_bersih)}
            tone={t.laba_bersih >= 0 ? "success" : "danger"}
            sub={`HPP ${rupiah(t.hpp)}`}
            testid="harian-total-laba"
          />
          <StatCard icon={HandCoins} label="Disetor" value={rupiah(t.disetor)} tone="blue" sub={`Seharusnya ${rupiah(t.seharusnya_disetor)}`} testid="harian-total-disetor" />
          <StatCard
            icon={Scale}
            label="Selisih Setoran"
            value={rupiah(t.selisih)}
            tone={t.selisih >= 0 ? "success" : "danger"}
            sub={t.selisih >= 0 ? "Sesuai / lebih" : "Masih kurang disetor"}
            testid="harian-total-selisih"
          />
        </div>
      )}

      {/* Tabel harian */}
      <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="harian-table">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h3 className="font-heading font-semibold text-slate-800">Rincian per Hari</h3>
          {data && (
            <span className="text-sm text-slate-500 tabular">
              {data.date_from} s/d {data.date_to} &middot; {t?.hari_aktif || 0} hari aktif
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="text-left py-2.5 px-3">Tanggal</th>
                <th className="text-right py-2.5 px-3">Penjualan</th>
                <th className="text-right py-2.5 px-3">Kas Masuk</th>
                <th className="text-right py-2.5 px-3">Kredit</th>
                <th className="text-right py-2.5 px-3">Pembelian</th>
                <th className="text-right py-2.5 px-3">Operasional</th>
                <th className="text-right py-2.5 px-3">Laba Bersih</th>
                <th className="text-right py-2.5 px-3">Seharusnya Disetor</th>
                <th className="text-right py-2.5 px-3">Disetor</th>
                <th className="text-right py-2.5 px-3">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="py-12 text-center text-slate-400">Memuat laporan...</td></tr>
              )}
              {!loading &&
                rows.map((d) => (
                  <tr key={d.tanggal} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`harian-row-${d.tanggal}`}>
                    <td className="py-2.5 px-3 tabular text-slate-700 font-medium">{d.tanggal}</td>
                    <td className="py-2.5 px-3 text-right tabular text-slate-900">{rupiah(d.penjualan)}</td>
                    <td className="py-2.5 px-3 text-right tabular text-blue-600">{rupiah(d.kas_masuk)}</td>
                    <td className="py-2.5 px-3 text-right tabular text-amber-700">{rupiah(d.kredit)}</td>
                    <td className="py-2.5 px-3 text-right tabular text-slate-600">{rupiah(d.pembelian)}</td>
                    <td className="py-2.5 px-3 text-right tabular text-red-600">{rupiah(d.operasional)}</td>
                    <td className={`py-2.5 px-3 text-right font-semibold tabular ${d.laba_bersih >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {rupiah(d.laba_bersih)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular text-slate-600">{rupiah(d.seharusnya_disetor)}</td>
                    <td className="py-2.5 px-3 text-right tabular text-blue-600">{rupiah(d.disetor)}</td>
                    <td className={`py-2.5 px-3 text-right font-semibold tabular ${d.selisih >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {rupiah(d.selisih)}
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-slate-400">Belum ada data pada periode ini.</td></tr>
              )}
            </tbody>
            {!loading && rows.length > 0 && t && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold" data-testid="harian-total-row">
                  <td className="py-3 px-3 text-slate-800">TOTAL</td>
                  <td className="py-3 px-3 text-right tabular text-slate-900">{rupiah(t.penjualan)}</td>
                  <td className="py-3 px-3 text-right tabular text-blue-600">{rupiah(t.kas_masuk)}</td>
                  <td className="py-3 px-3 text-right tabular text-amber-700">{rupiah(t.kredit)}</td>
                  <td className="py-3 px-3 text-right tabular text-slate-600">{rupiah(t.pembelian)}</td>
                  <td className="py-3 px-3 text-right tabular text-red-600">{rupiah(t.operasional)}</td>
                  <td className={`py-3 px-3 text-right tabular ${t.laba_bersih >= 0 ? "text-emerald-600" : "text-red-600"}`}>{rupiah(t.laba_bersih)}</td>
                  <td className="py-3 px-3 text-right tabular text-slate-600">{rupiah(t.seharusnya_disetor)}</td>
                  <td className="py-3 px-3 text-right tabular text-blue-600">{rupiah(t.disetor)}</td>
                  <td className={`py-3 px-3 text-right tabular ${t.selisih >= 0 ? "text-emerald-600" : "text-red-600"}`}>{rupiah(t.selisih)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Keterangan rumus */}
      <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="harian-rumus">
        <h3 className="font-heading font-semibold text-slate-800 mb-2">Cara Hitung</h3>
        <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li><b>Penjualan</b> = semua transaksi Lunas + Kredit (transaksi Free dihitung Rp 0).</li>
          <li><b>Kas Masuk</b> = hanya transaksi Lunas (uang yang benar-benar diterima).</li>
          <li><b>Laba Bersih</b> = (Penjualan &minus; HPP/modal pabrik) &minus; Operasional.</li>
          <li><b>Seharusnya Disetor</b> = Kas Masuk &minus; Operasional &minus; Pembayaran ke Pabrik.</li>
          <li><b>Selisih</b> = Disetor &minus; Seharusnya Disetor. Negatif berarti masih ada uang yang belum disetor.</li>
        </ul>
      </Card>
    </div>
  );
}
