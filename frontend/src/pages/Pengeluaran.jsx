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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Filter, X, Pencil, Wallet, Fuel, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

const kategoriIcon = (k) =>
  k && k.toLowerCase().includes("bbm") ? Fuel : MoreHorizontal;

export default function Pengeluaran() {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);

  const [editing, setEditing] = useState(null);
  const [tanggal, setTanggal] = useState(today());
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [jumlah, setJumlah] = useState("");

  const [filter, setFilter] = useState({ date_from: "", date_to: "", kategori: "all" });
  const [deleteId, setDeleteId] = useState(null);

  const loadRows = () => {
    const params = {};
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    if (filter.kategori && filter.kategori !== "all") params.kategori = filter.kategori;
    return api.get("/expenses", { params }).then((r) => setRows(r.data));
  };

  useEffect(() => {
    api.get("/expenses/categories").then((r) => {
      setCategories(r.data);
      if (r.data.length && !kategori) setKategori(r.data[0]);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line
  }, [filter]);

  const resetForm = () => {
    setEditing(null);
    setTanggal(today());
    setKategori(categories[0] || "");
    setDeskripsi("");
    setJumlah("");
  };

  const startEdit = (e) => {
    setEditing(e);
    setTanggal(e.tanggal);
    setKategori(e.kategori);
    setDeskripsi(e.deskripsi || "");
    setJumlah(String(e.jumlah));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!kategori) return toast.error("Pilih kategori pengeluaran");
    if (!Number(jumlah) || Number(jumlah) <= 0) return toast.error("Jumlah harus lebih dari 0");
    const payload = {
      tanggal,
      kategori,
      deskripsi,
      jumlah: Number(jumlah),
    };
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload);
        toast.success("Pengeluaran diperbarui");
      } else {
        await api.post("/expenses", payload);
        toast.success("Pengeluaran dicatat");
      }
      resetForm();
      loadRows();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menyimpan pengeluaran");
    }
  };

  const doDelete = async () => {
    await api.delete(`/expenses/${deleteId}`);
    setDeleteId(null);
    toast.success("Pengeluaran dihapus");
    loadRows();
  };

  const total = rows.reduce((s, r) => s + Number(r.jumlah || 0), 0);

  const perKategori = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      map[r.kategori] = (map[r.kategori] || 0) + Number(r.jumlah || 0);
    });
    return Object.entries(map)
      .map(([k, v]) => ({ kategori: k, jumlah: v }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [rows]);

  return (
    <div className="space-y-6" data-testid="pengeluaran-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Pengeluaran</h1>
        <p className="text-sm text-slate-500 mt-1">
          Catat biaya operasional. Total pengeluaran akan dikurangkan dari laba kotor di menu Laba.
        </p>
      </div>

      {/* Form */}
      <Card className="p-6 border-slate-200 shadow-none rounded-lg" data-testid="expense-form">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-slate-800">
            {editing ? "Edit Pengeluaran" : "Catat Pengeluaran"}
          </h3>
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetForm} data-testid="cancel-edit-expense">
              <X className="h-4 w-4 mr-1" /> Batal Edit
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1.5" data-testid="expense-tanggal" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger className="mt-1.5" data-testid="expense-kategori"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</Label>
            <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="mis. Solar armada L300" className="mt-1.5" data-testid="expense-deskripsi" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah (Rp)</Label>
            <Input type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="250000" className="mt-1.5" data-testid="expense-jumlah" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98]" data-testid="save-expense-btn">
            {editing ? "Update Pengeluaran" : "Simpan Pengeluaran"}
          </Button>
        </div>
      </Card>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="expense-stat-total">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Pengeluaran</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-red-600">{rupiah(total)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </Card>
        {perKategori.slice(0, 2).map((k) => {
          const Icon = kategoriIcon(k.kategori);
          return (
            <Card key={k.kategori} className="p-5 border-slate-200 shadow-none rounded-lg" data-testid={`expense-stat-${k.kategori}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{k.kategori}</p>
                  <p className="mt-2 text-2xl font-heading font-bold tabular text-slate-900">{rupiah(k.jumlah)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-slate-600 mr-2">
            <Filter className="h-4 w-4" /> <span className="text-sm font-medium">Filter</span>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Dari</Label>
            <Input type="date" value={filter.date_from} onChange={(e) => setFilter({ ...filter, date_from: e.target.value })} className="mt-1 w-40" data-testid="expense-filter-from" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Sampai</Label>
            <Input type="date" value={filter.date_to} onChange={(e) => setFilter({ ...filter, date_to: e.target.value })} className="mt-1 w-40" data-testid="expense-filter-to" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Kategori</Label>
            <Select value={filter.kategori} onValueChange={(v) => setFilter({ ...filter, kategori: v })}>
              <SelectTrigger className="mt-1 w-56" data-testid="expense-filter-kategori"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilter({ date_from: "", date_to: "", kategori: "all" })} data-testid="expense-filter-reset">
            <X className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>
      </Card>

      {/* Tabel */}
      <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="expense-table">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-heading font-semibold text-slate-800">Daftar Pengeluaran</h3>
          <div className="text-sm text-slate-500">
            Total: <span className="font-bold text-red-600 tabular">{rupiah(total)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="text-left py-2.5 px-3">Tanggal</th>
                <th className="text-left py-2.5 px-3">Kategori</th>
                <th className="text-left py-2.5 px-3">Keterangan</th>
                <th className="text-right py-2.5 px-3">Jumlah</th>
                <th className="text-center py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`expense-row-${r.id}`}>
                  <td className="py-2.5 px-3 tabular text-slate-600">{r.tanggal}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className="border-slate-200 text-slate-700 font-normal">{r.kategori}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.deskripsi || "-"}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular text-red-600">{rupiah(r.jumlah)}</td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(r)} data-testid={`edit-expense-${r.id}`}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)} data-testid={`delete-expense-${r.id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">Belum ada pengeluaran.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengeluaran ini?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-expense">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
