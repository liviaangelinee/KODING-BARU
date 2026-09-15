import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Receipt,
  CalendarRange,
  Package,
  Users,
  Droplets,
  LogOut,
  UserCog,
  Factory,
  Wallet,
  PiggyBank,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/transaksi", label: "Transaksi", icon: Receipt, testid: "nav-transaksi" },
  { to: "/po-pabrik", label: "PO Pabrik", icon: Factory, testid: "nav-po-pabrik" },
  { to: "/pengeluaran", label: "Pengeluaran", icon: Wallet, testid: "nav-pengeluaran" },
  { to: "/laba", label: "Laba & Keuangan", icon: PiggyBank, testid: "nav-laba" },
  { to: "/rekap-bulanan", label: "Rekap Bulanan", icon: CalendarRange, testid: "nav-rekap" },
  { to: "/produk", label: "Produk", icon: Package, testid: "nav-produk" },
  { to: "/customer", label: "Customer", icon: Users, testid: "nav-customer" },
  { to: "/profil", label: "Profil", icon: UserCog, testid: "nav-profil" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col fixed h-screen">
        <div className="min-h-16 py-3 flex items-center gap-2.5 px-5 border-b border-slate-200 text-blue-600">
          <Droplets className="h-7 w-7 shrink-0" />
          <div className="leading-tight">
            <span className="block font-heading font-bold text-lg tracking-tight text-slate-900">CPLRekap</span>
            <span className="block text-[11px] text-slate-400">CV Citra Pangan Lestari</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-8 max-w-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
