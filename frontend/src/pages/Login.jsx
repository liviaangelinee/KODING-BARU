import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("liviaangeline@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1584968124544-d10ce10dd21f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGZsdWlkJTIwYmx1ZXxlbnwwfHx8fDE3ODcyODA1NzZ8MA&ixlib=rb-4.1.0&q=85"
          alt="latar"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-blue-900/40" />
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
          <div className="flex items-center gap-2">
            <Droplets className="h-7 w-7" />
            <span className="font-heading font-bold text-xl tracking-tight">CPLRekap</span>
          </div>
          <div>
            <h1 className="font-heading text-4xl font-bold leading-tight">
              Rekapan Penjualan
            </h1>
            <p className="mt-3 text-blue-100 text-base max-w-md">
              Kelola transaksi, pantau omset, dan lacak sisa tagihan customer dalam satu dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <div className="lg:hidden flex items-center gap-2 mb-8 text-blue-600">
            <Droplets className="h-7 w-7 shrink-0" />
            <span className="font-heading font-bold text-xl">CPLRekap</span>
          </div>
          <h2 className="font-heading text-2xl font-semibold text-slate-900">Masuk</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Silakan masuk untuk melanjutkan.</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </Label>
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </Label>
              <Input
                id="password"
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="login-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-transform"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Masuk
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
