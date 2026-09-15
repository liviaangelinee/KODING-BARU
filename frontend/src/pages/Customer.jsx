import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama: "", telepon: "", alamat: "" });
  const [deleteId, setDeleteId] = useState(null);

  const load = () => api.get("/customers").then((r) => setCustomers(r.data));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nama: "", telepon: "", alamat: "" });
    setOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ nama: c.nama, telepon: c.telepon || "", alamat: c.alamat || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nama.trim()) return toast.error("Nama customer wajib diisi");
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post("/customers", form);
      toast.success("Customer disimpan");
      setOpen(false);
      load();
    } catch (e) {
      toast.error("Gagal menyimpan customer");
    }
  };

  const doDelete = async () => {
    await api.delete(`/customers/${deleteId}`);
    setDeleteId(null);
    toast.success("Customer dihapus");
    load();
  };

  return (
    <div className="space-y-6" data-testid="customer-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Manajemen Customer</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data customer.</p>
        </div>
        <Button onClick={openNew} data-testid="add-customer-btn" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Tambah Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <Card key={c.id} className="p-5 border-slate-200 shadow-none rounded-lg" data-testid={`customer-card-${c.nama}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-semibold text-slate-800">{c.nama}</h3>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`edit-customer-${c.nama}`}>
                  <Pencil className="h-4 w-4 text-slate-500" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)} data-testid={`delete-customer-${c.nama}`}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              {c.telepon && (
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {c.telepon}</p>
              )}
              {c.alamat && (
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {c.alamat}</p>
              )}
            </div>
          </Card>
        ))}
        {customers.length === 0 && (
          <p className="text-sm text-slate-400 col-span-full py-12 text-center">Belum ada customer.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Tambah Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="mt-1.5" data-testid="customer-nama-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telepon</Label>
              <Input value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} className="mt-1.5" data-testid="customer-telepon-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</Label>
              <Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="mt-1.5" data-testid="customer-alamat-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700" data-testid="save-customer-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus customer?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-customer">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
