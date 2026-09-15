import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Wallet, Receipt, AlertTriangle, CheckCircle2 } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function RekapBulanan() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/rekap/monthly", { params: { year, month } }).then((r) => setData(r.data));
  }, [year, month]);

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y--) years.push(y);

  return (
    <div className="space-y-6" data-testid="rekap-bulanan-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Rekap Bulanan</h1>
          <p className="text-sm text-slate-500 mt-1">Ringkasan penjualan per bulan.</p>
        </div>
        <div className="flex gap-3">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40" data-testid="rekap-month"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28" data-testid="rekap-year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!data ? (
        <div className="text-slate-500">Memuat...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 border-slate-200 shadow-none rounded-lg">
              <div className="flex items-center gap-2 text-blue-600"><Wallet className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Omset</span></div>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-slate-900">{rupiah(data.total_omset)}</p>
            </Card>
            <Card className="p-5 border-slate-200 shadow-none rounded-lg">
              <div className="flex items-center gap-2 text-slate-600"><Receipt className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transaksi</span></div>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-slate-900">{data.total_txn}</p>
            </Card>
            <Card className="p-5 border-slate-200 shadow-none rounded-lg">
              <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lunas</span></div>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-emerald-600">{rupiah(data.lunas)}</p>
            </Card>
            <Card className="p-5 border-slate-200 shadow-none rounded-lg">
              <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sisa Tagihan</span></div>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-red-600">{rupiah(data.sisa_tagihan)}</p>
            </Card>
          </div>

          <Card className="p-5 border-slate-200 shadow-none rounded-lg">
            <h3 className="font-heading font-semibold text-slate-800 mb-4">Omset Harian — {MONTHS[month - 1]} {year}</h3>
            {data.per_day.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Belum ada transaksi bulan ini.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.per_day} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} width={45} />
                  <Tooltip formatter={(v) => rupiah(v)} />
                  <Bar dataKey="omset" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200"><h3 className="font-heading font-semibold text-slate-800">Rekap per Produk</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="text-left py-2.5 px-3">Produk</th>
                      <th className="text-right py-2.5 px-3">Qty</th>
                      <th className="text-right py-2.5 px-3">Omset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_product.map((p) => (
                      <tr key={p.nama} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-700">{p.nama}</td>
                        <td className="py-2.5 px-3 text-right tabular text-slate-600">{p.qty}</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular text-slate-900">{rupiah(p.omset)}</td>
                      </tr>
                    ))}
                    {data.per_product.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200"><h3 className="font-heading font-semibold text-slate-800">Rekap per Customer</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="text-left py-2.5 px-3">Customer</th>
                      <th className="text-right py-2.5 px-3">Omset</th>
                      <th className="text-right py-2.5 px-3">Sisa Tagihan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_customer.map((c) => (
                      <tr key={c.customer} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-700">{c.customer}</td>
                        <td className="py-2.5 px-3 text-right tabular text-slate-900">{rupiah(c.omset)}</td>
                        <td className="py-2.5 px-3 text-right tabular">
                          {c.sisa > 0 ? <Badge className="bg-red-100 text-red-700 border-red-200">{rupiah(c.sisa)}</Badge> : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {data.per_customer.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
