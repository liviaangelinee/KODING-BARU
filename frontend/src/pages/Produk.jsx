import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
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
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

const emptyVariant = () => ({ label: "", harga_grosir: 0, harga_so: 0, harga_retail: 0 });

export default function Produk() {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nama, setNama] = useState("");
  const [variants, setVariants] = useState([emptyVariant()]);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => api.get("/products").then((r) => setProducts(r.data));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setNama("");
    setVariants([emptyVariant()]);
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setNama(p.nama);
    setVariants(p.variants.length ? p.variants.map((v) => ({ ...v })) : [emptyVariant()]);
    setOpen(true);
  };

  const setV = (i, key, val) => {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, [key]: val } : v)));
  };

  const save = async () => {
    if (!nama.trim()) return toast.error("Nama produk wajib diisi");
    const clean = variants
      .filter((v) => v.label.trim())
      .map((v) => ({
        label: v.label.trim(),
        harga_grosir: Number(v.harga_grosir) || 0,
        harga_so: Number(v.harga_so) || 0,
        harga_retail: Number(v.harga_retail) || 0,
      }));
    if (!clean.length) return toast.error("Minimal satu varian");
    const payload = { nama: nama.trim(), variants: clean };
    try {
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post("/products", payload);
      toast.success("Produk disimpan");
      setOpen(false);
      load();
    } catch (e) {
      toast.error("Gagal menyimpan produk");
    }
  };

  const doDelete = async () => {
    await api.delete(`/products/${deleteId}`);
    setDeleteId(null);
    toast.success("Produk dihapus");
    load();
  };

  return (
    <div className="space-y-6" data-testid="produk-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Manajemen Produk</h1>
          <p className="text-sm text-slate-500 mt-1">Atur produk, varian, dan harga (Grosir / SO / Retail).</p>
        </div>
        <Button onClick={openNew} data-testid="add-product-btn" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Tambah Produk
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {products.map((p) => (
          <Card key={p.id} className="p-5 border-slate-200 shadow-none rounded-lg" data-testid={`product-card-${p.nama}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <h3 className="font-heading font-semibold text-slate-800">{p.nama}</h3>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`edit-product-${p.nama}`}>
                  <Pencil className="h-4 w-4 text-slate-500" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} data-testid={`delete-product-${p.nama}`}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="text-left py-1.5">Varian</th>
                    <th className="text-right py-1.5">Grosir</th>
                    <th className="text-right py-1.5">SO</th>
                    <th className="text-right py-1.5">Retail</th>
                  </tr>
                </thead>
                <tbody>
                  {p.variants.map((v) => (
                    <tr key={v.label} className="border-b border-slate-100">
                      <td className="py-1.5 font-medium text-slate-700">{v.label}</td>
                      <td className="py-1.5 text-right tabular text-slate-600">{rupiah(v.harga_grosir)}</td>
                      <td className="py-1.5 text-right tabular text-slate-600">{rupiah(v.harga_so)}</td>
                      <td className="py-1.5 text-right tabular text-slate-600">{rupiah(v.harga_retail)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Produk</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} className="mt-1.5" data-testid="product-nama-input" placeholder="mis. CHEERS ALKALINE" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Varian & Harga</Label>
                <Button size="sm" variant="outline" onClick={() => setVariants((p) => [...p, emptyVariant()])} data-testid="add-variant-btn">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Varian
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs uppercase text-slate-400 px-1">
                  <div className="col-span-3">Label</div>
                  <div className="col-span-3">Grosir</div>
                  <div className="col-span-2">SO</div>
                  <div className="col-span-3">Retail</div>
                </div>
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-3" value={v.label} onChange={(e) => setV(i, "label", e.target.value)} placeholder="1200" data-testid={`variant-label-${i}`} />
                    <Input className="col-span-3" type="number" value={v.harga_grosir} onChange={(e) => setV(i, "harga_grosir", e.target.value)} data-testid={`variant-grosir-${i}`} />
                    <Input className="col-span-2" type="number" value={v.harga_so} onChange={(e) => setV(i, "harga_so", e.target.value)} data-testid={`variant-so-${i}`} />
                    <Input className="col-span-3" type="number" value={v.harga_retail} onChange={(e) => setV(i, "harga_retail", e.target.value)} data-testid={`variant-retail-${i}`} />
                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setVariants((p) => p.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700" data-testid="save-product-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-product">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
