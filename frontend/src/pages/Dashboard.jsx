import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Wallet,
  Receipt,
  AlertTriangle,
  Users,
  TrendingUp,
  Factory,
  PiggyBank,
  Package,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
  }, []);

  if (!stats) return <div className="text-slate-500">Memuat dashboard...</div>;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Ringkasan penjualan dan tagihan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Total Omset" value={rupiah(stats.total_omset)} tone="blue" testid="stat-omset" />
        <StatCard icon={Receipt} label="Total Transaksi" value={stats.total_txn} testid="stat-txn" />
        <StatCard icon={AlertTriangle} label="Sisa Tagihan" value={rupiah(stats.sisa_tagihan)} tone="danger" testid="stat-sisa" />
        <StatCard icon={Users} label="Total Customer" value={stats.total_customer} tone="success" testid="stat-customer" />
      </div>

      {/* Ringkasan keuangan bulan berjalan */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="h-4 w-4 text-emerald-600" />
          <h2 className="font-heading font-semibold text-slate-800">
            Keuangan Bulan Ini
            <span className="ml-2 text-xs font-normal text-slate-400 tabular">{stats.bulan_ini}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Wallet} label="Omset" value={rupiah(stats.omset_bulan)} tone="blue" testid="stat-omset-bulan" />
          <StatCard icon={Package} label="HPP" value={rupiah(stats.hpp_bulan)} tone="amber" sub="Modal barang terjual" testid="stat-hpp-bulan" />
          <StatCard icon={Receipt} label="Pengeluaran" value={rupiah(stats.pengeluaran_bulan)} tone="danger" testid="stat-pengeluaran-bulan" />
          <StatCard
            icon={PiggyBank}
            label="Laba Bersih"
            value={rupiah(stats.laba_bersih_bulan)}
            tone={stats.laba_bersih_bulan >= 0 ? "success" : "danger"}
            sub={stats.laba_bersih_bulan >= 0 ? "Untung" : "Rugi"}
            testid="stat-laba-bersih-bulan"
          />
          <StatCard icon={Factory} label="Hutang ke Pabrik" value={rupiah(stats.hutang_pabrik)} tone="danger" sub={`PO bulan ini ${rupiah(stats.po_pabrik_bulan)}`} testid="stat-hutang-pabrik" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-slate-200 shadow-none rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h3 className="font-heading font-semibold text-slate-800">Tren Omset</h3>
          </div>
          {stats.trend.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Belum ada data transaksi.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.trend} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="omsetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} width={45} />
                <Tooltip formatter={(v) => rupiah(v)} />
                <Area type="monotone" dataKey="omset" stroke="#2563eb" strokeWidth={2} fill="url(#omsetGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="outstanding-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="font-heading font-semibold text-slate-800">Sisa Tagihan per Customer</h3>
          </div>
          {stats.outstanding.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Tidak ada tagihan tertunggak. 🎉</p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
              {stats.outstanding.map((o) => (
                <div
                  key={o.customer}
                  className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-800 truncate">{o.customer}</span>
                  <span className="text-sm font-bold text-red-700 tabular">{rupiah(o.sisa)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <h3 className="font-heading font-semibold text-slate-800 mb-4">Produk Terlaris (Omset)</h3>
        {stats.top_products.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Belum ada data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.top_products} margin={{ left: 10, right: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="nama" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-25} textAnchor="end" interval={0} height={60} />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} width={45} />
              <Tooltip formatter={(v) => rupiah(v)} />
              <Bar dataKey="omset" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
