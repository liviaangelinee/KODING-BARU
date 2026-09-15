import { useEffect, useMemo, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trash2, Filter, X, Pencil, HandCoins, CalendarDays, Hash } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

function monthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  const p = (n) => String(n).padStart(2, "0");
  return { date_from: `${y}-${p(m)}-01`, date_to: `${y}-${p(m)}-${p(last)}` };
}

export default function Setoran() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);
  const [tanggal, setTanggal] = useState(today());
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");

  const [filter, setFilter] = useState(monthRange());
  const [deleteId, setDeleteId] = useState(null);

  const loadRows = () => {
    setLoading(true);
    const params = {};
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    return api
      .get("/deposits", { params })
      .then((r) => setRows(r.data))
      .catch(() => toast.error("Gagal memuat data setoran"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line
  }, [filter]);

  const resetForm = () => {
    setEditing(null);
    setTanggal(today());
    setJumlah("");
    setCatatan("");
  };

  const startEdit = (s) => {
    setEditing(s);
    setTanggal(s.tanggal);
    setJumlah(String(s.jumlah));
    setCatatan(s.catatan || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!Number(jumlah) || Number(jumlah) <= 0) return toast.error("Jumlah setoran harus lebih dari 0");
    const payload = { tanggal, jumlah: Number(jumlah), catatan };
    try {
      if (editing) {
        await api.put(`/deposits/${editing.id}`, payload);
        toast.success("Setoran diperbarui");
      } else {
        await api.post("/deposits", payload);
        toast.success("Setoran dicatat");
      }
      resetForm();
      loadRows();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan setoran");
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/deposits/${deleteId}`);
      toast.success("Setoran dihapus");
    } catch (e) {
      toast.error("Gagal menghapus setoran");
    }
    setDeleteId(null);
    loadRows();
  };

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.jumlah || 0), 0), [rows]);
  const totalHariIni = useMemo(
    () => rows.filter((r) => r.tanggal === today()).reduce((s, r) => s + Number(r.jumlah || 0), 0),
    [rows]
  );

  return (
    <div className="space-y-6" data-testid="setoran-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Setoran</h1>
        <p className="text-sm text-slate-500 mt-1">
          Catat uang yang disetorkan ke pemilik setiap hari. Jumlah setoran akan dibandingkan dengan
          laporan harian.
        </p>
      </div>

      {/* Form */}
      <Card className="p-6 border-slate-200 shadow-none rounded-lg" data-testid="setoran-form">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-slate-800">
            {editing ? "Edit Setoran" : "Catat Setoran"}
          </h3>
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetForm} data-testid="cancel-edit-setoran">
              <X className="h-4 w-4 mr-1" /> Batal Edit
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="mt-1.5"
              data-testid="setoran-tanggal"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah (Rp)</Label>
            <Input
              type="number"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="1500000"
              className="mt-1.5"
              data-testid="setoran-jumlah"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan</Label>
            <Input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="mis. setoran tunai sore"
              className="mt-1.5"
              data-testid="setoran-catatan"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
            data-testid="save-setoran-btn"
          >
            {editing ? "Update Setoran" : "Simpan Setoran"}
          </Button>
        </div>
      </Card>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="setoran-stat-total">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Setoran Periode</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-blue-600">{rupiah(total)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <HandCoins className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="setoran-stat-hari-ini">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Setoran Hari Ini</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-emerald-600">{rupiah(totalHariIni)}</p>
              <p className="text-xs text-slate-400 mt-1 tabular">{today()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="setoran-stat-jumlah">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Transaksi Setoran</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-slate-900">{rows.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Hash className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-slate-600 mr-2">
            <Filter className="h-4 w-4" /> <span className="text-sm font-medium">Filter</span>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Dari</Label>
            <Input
              type="date"
              value={filter.date_from}
              onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
              className="mt-1 w-40"
              data-testid="setoran-filter-from"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Sampai</Label>
            <Input
              type="date"
              value={filter.date_to}
              onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
              className="mt-1 w-40"
              data-testid="setoran-filter-to"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilter(monthRange())} data-testid="setoran-filter-reset">
            <X className="h-4 w-4 mr-1" /> Bulan Ini
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ date_from: "", date_to: "" })}
            data-testid="setoran-filter-all"
          >
            Semua Data
          </Button>
        </div>
      </Card>

      {/* Tabel */}
      <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="setoran-table">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-heading font-semibold text-slate-800">Daftar Setoran</h3>
          <div className="text-sm text-slate-500">
            Total: <span className="font-bold text-blue-600 tabular" data-testid="setoran-total-text">{rupiah(total)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="text-left py-2.5 px-3">Tanggal</th>
                <th className="text-left py-2.5 px-3">Catatan</th>
                <th className="text-right py-2.5 px-3">Jumlah</th>
                <th className="text-center py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">Memuat...</td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`setoran-row-${r.id}`}>
                    <td className="py-2.5 px-3 tabular text-slate-600">{r.tanggal}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.catatan || "-"}</td>
                    <td className="py-2.5 px-3 text-right font-semibold tabular text-blue-600">{rupiah(r.jumlah)}</td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(r)} data-testid={`edit-setoran-${r.id}`}>
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)} data-testid={`delete-setoran-${r.id}`}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Belum ada setoran pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus setoran ini?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-setoran">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
