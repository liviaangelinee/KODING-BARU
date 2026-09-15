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
import {
  Plus,
  Trash2,
  Filter,
  X,
  Factory,
  FileSpreadsheet,
  FileText,
  Pencil,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

function emptyItem() {
  return { product_id: "", product_nama: "", variant_label: "", harga_pabrik: 0, qty: 1 };
}

export default function POPabrik() {
  const [products, setProducts] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [pos, setPos] = useState([]);

  const [editing, setEditing] = useState(null);
  const [tanggal, setTanggal] = useState(today());
  const [pabrik, setPabrik] = useState("");
  const [noPo, setNoPo] = useState("");
  const [status, setStatus] = useState("belum_lunas");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState([emptyItem()]);

  const [filter, setFilter] = useState({ date_from: "", date_to: "", pabrik: "all", status: "all" });
  const [deleteId, setDeleteId] = useState(null);

  const loadPos = () => {
    const params = {};
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    if (filter.pabrik && filter.pabrik !== "all") params.pabrik = filter.pabrik;
    if (filter.status && filter.status !== "all") params.status = filter.status;
    return api.get("/purchase-orders", { params }).then((r) => setPos(r.data));
  };

  const loadPabrik = () => api.get("/purchase-orders/pabrik-list").then((r) => setPabrikList(r.data));

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
    loadPabrik();
  }, []);

  useEffect(() => {
    loadPos();
    // eslint-disable-next-line
  }, [filter]);

  const setItem = (i, patch) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const onProduct = (i, pid) => {
    const p = products.find((x) => x.id === pid);
    setItem(i, { product_id: pid, product_nama: p?.nama || "", variant_label: "", harga_pabrik: 0 });
  };

  const onVariant = (i, label) => {
    const it = items[i];
    const p = products.find((x) => x.id === it.product_id);
    const v = p?.variants.find((vv) => vv.label === label);
    // Harga pabrik default diambil dari menu Produk, tetap bisa diubah manual di sini.
    setItem(i, { variant_label: label, harga_pabrik: v?.harga_pabrik || 0 });
  };

  const total = useMemo(
    () => items.reduce((s, it) => s + Number(it.harga_pabrik || 0) * Number(it.qty || 0), 0),
    [items]
  );

  const resetForm = () => {
    setEditing(null);
    setTanggal(today());
    setPabrik("");
    setNoPo("");
    setStatus("belum_lunas");
    setCatatan("");
    setItems([emptyItem()]);
  };

  const startEdit = (po) => {
    setEditing(po);
    setTanggal(po.tanggal);
    setPabrik(po.pabrik || "");
    setNoPo(po.no_po || "");
    setStatus(po.status);
    setCatatan(po.catatan || "");
    setItems(
      (po.items || []).map((it) => ({
        product_id: it.product_id || "",
        product_nama: it.product_nama || "",
        variant_label: it.variant_label || "",
        harga_pabrik: it.harga_pabrik || 0,
        qty: it.qty || 0,
      }))
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!pabrik.trim()) return toast.error("Pilih pabrik terlebih dahulu");
    const validItems = items.filter(
      (it) => it.product_id && it.variant_label && Number(it.qty) > 0
    );
    if (!validItems.length) return toast.error("Tambahkan minimal satu item pembelian");
    const payload = {
      tanggal,
      pabrik: pabrik.trim(),
      no_po: noPo.trim(),
      status,
      catatan,
      items: validItems.map((it) => ({
        product_id: it.product_id,
        product_nama: it.product_nama,
        variant_label: it.variant_label,
        harga_pabrik: Number(it.harga_pabrik) || 0,
        qty: Number(it.qty),
        subtotal: (Number(it.harga_pabrik) || 0) * Number(it.qty),
      })),
    };
    try {
      if (editing) {
        await api.put(`/purchase-orders/${editing.id}`, payload);
        toast.success("PO berhasil diperbarui");
      } else {
        await api.post("/purchase-orders", payload);
        toast.success("PO pabrik berhasil disimpan");
      }
      resetForm();
      loadPos();
      loadPabrik();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan PO");
    }
  };

  const toggleStatus = async (po) => {
    const next = po.status === "lunas" ? "belum_lunas" : "lunas";
    await api.patch(`/purchase-orders/${po.id}/status`, { status: next });
    toast.success(next === "lunas" ? "Ditandai sudah dibayar" : "Ditandai belum dibayar");
    loadPos();
  };

  const doDelete = async () => {
    await api.delete(`/purchase-orders/${deleteId}`);
    setDeleteId(null);
    toast.success("PO dihapus");
    loadPos();
  };

  const download = async (kind) => {
    const params = {};
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    if (filter.pabrik && filter.pabrik !== "all") params.pabrik = filter.pabrik;
    if (filter.status && filter.status !== "all") params.status = filter.status;
    try {
      const res = await api.get(`/export/purchases/${kind}`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "excel" ? "laporan_pembelian.xlsx" : "laporan_pembelian.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mengekspor");
    }
  };

  const totalPembelian = pos.reduce((s, p) => s + Number(p.total || 0), 0);
  const hutang = pos
    .filter((p) => p.status === "belum_lunas")
    .reduce((s, p) => s + Number(p.total || 0), 0);

  const perProduk = useMemo(() => {
    const map = {};
    pos.forEach((p) =>
      (p.items || []).forEach((it) => {
        const key = `${it.product_nama} ${it.variant_label}`;
        if (!map[key]) map[key] = { nama: key, qty: 0, total: 0 };
        map[key].qty += Number(it.qty || 0);
        map[key].total += Number(it.subtotal || 0);
      })
    );
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [pos]);

  return (
    <div className="space-y-6" data-testid="po-pabrik-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">PO ke Pabrik</h1>
        <p className="text-sm text-slate-500 mt-1">
          Catat pembelian barang dari pabrik (harga pabrik) dan pantau hutang yang belum dibayar.
        </p>
      </div>

      {/* Form PO */}
      <Card className="p-6 border-slate-200 shadow-none rounded-lg" data-testid="po-form">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-slate-800">
            {editing ? `Edit PO ${editing.no_po || ""}`.trim() : "Input PO Baru"}
          </h3>
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetForm} data-testid="cancel-edit-po">
              <X className="h-4 w-4 mr-1" /> Batal Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1.5" data-testid="po-tanggal" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pabrik</Label>
            <Select value={pabrik} onValueChange={setPabrik}>
              <SelectTrigger className="mt-1.5" data-testid="po-pabrik"><SelectValue placeholder="Pilih pabrik" /></SelectTrigger>
              <SelectContent>
                {pabrikList.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">No. PO (opsional)</Label>
            <Input value={noPo} onChange={(e) => setNoPo(e.target.value)} placeholder="PO-001" className="mt-1.5" data-testid="po-nomor" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Pembayaran</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1.5" data-testid="po-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="belum_lunas">Belum Bayar</SelectItem>
                <SelectItem value="lunas">Sudah Bayar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs uppercase text-slate-400 px-1">
            <div className="col-span-4">Produk</div>
            <div className="col-span-2">Varian</div>
            <div className="col-span-2">Harga Pabrik</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-3">Subtotal</div>
          </div>
          {items.map((it, i) => {
            const p = products.find((x) => x.id === it.product_id);
            return (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b border-slate-100 pb-2 md:border-0 md:pb-0">
                <div className="md:col-span-4">
                  <Select value={it.product_id} onValueChange={(v) => onProduct(i, v)}>
                    <SelectTrigger data-testid={`po-item-product-${i}`}><SelectValue placeholder="Produk" /></SelectTrigger>
                    <SelectContent>
                      {products.map((pr) => (<SelectItem key={pr.id} value={pr.id}>{pr.nama}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Select value={it.variant_label} onValueChange={(v) => onVariant(i, v)} disabled={!p}>
                    <SelectTrigger data-testid={`po-item-variant-${i}`}><SelectValue placeholder="Varian" /></SelectTrigger>
                    <SelectContent>
                      {p?.variants.map((v) => (<SelectItem key={v.label} value={v.label}>{v.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Input type="number" value={it.harga_pabrik} onChange={(e) => setItem(i, { harga_pabrik: e.target.value })} data-testid={`po-item-harga-${i}`} />
                </div>
                <div className="md:col-span-1">
                  <Input type="number" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} data-testid={`po-item-qty-${i}`} />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <span className="text-sm font-semibold tabular text-slate-700 flex-1">
                    {rupiah(Number(it.harga_pabrik || 0) * Number(it.qty || 0))}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => setItems((p2) => p2.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyItem()])} data-testid="po-add-item-btn">
            <Plus className="h-4 w-4 mr-1" /> Tambah Item
          </Button>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total PO</p>
              <p className="text-2xl font-heading font-bold text-amber-600 tabular" data-testid="po-total">{rupiah(total)}</p>
            </div>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98]" data-testid="save-po-btn">
              {editing ? "Update PO" : "Simpan PO"}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <Input placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} data-testid="po-catatan" />
        </div>
      </Card>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="po-stat-total">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Pembelian</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-slate-900">{rupiah(totalPembelian)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="po-stat-hutang">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hutang ke Pabrik</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-red-600">{rupiah(hutang)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="po-stat-jumlah">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah PO</p>
              <p className="mt-2 text-2xl font-heading font-bold tabular text-slate-900">{pos.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Factory className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter + export */}
      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-slate-600 mr-2">
            <Filter className="h-4 w-4" /> <span className="text-sm font-medium">Filter</span>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Dari</Label>
            <Input type="date" value={filter.date_from} onChange={(e) => setFilter({ ...filter, date_from: e.target.value })} className="mt-1 w-40" data-testid="po-filter-from" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Sampai</Label>
            <Input type="date" value={filter.date_to} onChange={(e) => setFilter({ ...filter, date_to: e.target.value })} className="mt-1 w-40" data-testid="po-filter-to" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Pabrik</Label>
            <Select value={filter.pabrik} onValueChange={(v) => setFilter({ ...filter, pabrik: v })}>
              <SelectTrigger className="mt-1 w-52" data-testid="po-filter-pabrik"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pabrik</SelectItem>
                {pabrikList.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
              <SelectTrigger className="mt-1 w-40" data-testid="po-filter-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="lunas">Sudah Bayar</SelectItem>
                <SelectItem value="belum_lunas">Belum Bayar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilter({ date_from: "", date_to: "", pabrik: "all", status: "all" })} data-testid="po-filter-reset">
            <X className="h-4 w-4 mr-1" /> Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => download("excel")} data-testid="po-export-excel" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={() => download("pdf")} data-testid="po-export-pdf" className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </Card>

      {/* Pembelian per produk */}
      {perProduk.length > 0 && (
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="po-per-produk">
          <h3 className="font-heading font-semibold text-slate-800 mb-3">Pembelian per Produk</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {perProduk.map((p) => (
              <div key={p.nama} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-700 truncate">{p.nama}</p>
                <p className="text-xs text-slate-500 mt-0.5">Qty: <span className="tabular">{p.qty}</span></p>
                <p className="text-base font-bold text-amber-600 tabular">{rupiah(p.total)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabel PO */}
      <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="po-table">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-heading font-semibold text-slate-800">Daftar PO Pabrik</h3>
          <div className="text-sm text-slate-500">
            Total: <span className="font-bold text-slate-900 tabular">{rupiah(totalPembelian)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="text-left py-2.5 px-3">Tanggal</th>
                <th className="text-left py-2.5 px-3">No PO</th>
                <th className="text-left py-2.5 px-3">Pabrik</th>
                <th className="text-left py-2.5 px-3">Barang</th>
                <th className="text-right py-2.5 px-3">Total</th>
                <th className="text-center py-2.5 px-3">Status Bayar</th>
                <th className="text-center py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`po-row-${p.id}`}>
                  <td className="py-2.5 px-3 tabular text-slate-600">{p.tanggal}</td>
                  <td className="py-2.5 px-3 text-slate-600">{p.no_po || "-"}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{p.pabrik}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {(p.items || []).map((it, idx) => (
                      <span key={idx} className="inline-block mr-2 whitespace-nowrap">
                        {it.product_nama} {it.variant_label} <span className="text-slate-400">×{it.qty}</span>
                        {idx < p.items.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular text-slate-900">{rupiah(p.total)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button onClick={() => toggleStatus(p)} data-testid={`po-status-toggle-${p.id}`}>
                      {p.status === "lunas" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 cursor-pointer">Sudah Bayar</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 cursor-pointer">Belum Bayar</Badge>
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(p)} data-testid={`edit-po-${p.id}`}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} data-testid={`delete-po-${p.id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Belum ada PO ke pabrik.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus PO ini?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-po">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
