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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, FileSpreadsheet, FileText, Filter, X, Gift } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL = { lunas: "Lunas", kredit: "Kredit", free: "Free" };
const STATUS_BADGE = {
  lunas: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200",
  kredit: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200",
  free: "bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200",
};

function StatusBadge({ status, className = "" }) {
  const s = status === "belum_lunas" ? "kredit" : status || "lunas";
  return (
    <Badge className={`${STATUS_BADGE[s] || STATUS_BADGE.lunas} ${className}`}>
      {STATUS_LABEL[s] || s}
    </Badge>
  );
}

function emptyItem() {
  return { product_id: "", product_nama: "", variant_label: "", harga_satuan: 0, qty: 1 };
}

export default function Transaksi() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [txns, setTxns] = useState([]);

  const [tanggal, setTanggal] = useState(today());
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("lunas");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState([emptyItem()]);

  const [filter, setFilter] = useState({ date_from: "", date_to: "", customer_id: "all", status: "all" });
  const [deleteId, setDeleteId] = useState(null);

  const loadTxns = () => {
    const params = {};
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    if (filter.customer_id && filter.customer_id !== "all") params.customer_id = filter.customer_id;
    if (filter.status && filter.status !== "all") params.status = filter.status;
    return api.get("/transactions", { params }).then((r) => setTxns(r.data));
  };

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
  }, []);
  useEffect(() => {
    loadTxns();
    // eslint-disable-next-line
  }, [filter]);

  const setItem = (i, patch) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const onProduct = (i, pid) => {
    const p = products.find((x) => x.id === pid);
    setItem(i, { product_id: pid, product_nama: p?.nama || "", variant_label: "", harga_satuan: 0 });
  };

  const onVariant = (i, label) => {
    const it = items[i];
    const p = products.find((x) => x.id === it.product_id);
    const v = p?.variants.find((vv) => vv.label === label);
    // Harga SO dipakai sebagai harga jual, tetap bisa diubah manual bila perlu.
    setItem(i, { variant_label: label, harga_satuan: v?.harga_so || 0 });
  };

  const total = useMemo(
    () =>
      status === "free"
        ? 0
        : items.reduce((s, it) => s + Number(it.harga_satuan || 0) * Number(it.qty || 0), 0),
    [items, status]
  );

  const resetForm = () => {
    setTanggal(today());
    setCustomerId("");
    setStatus("lunas");
    setCatatan("");
    setItems([emptyItem()]);
  };

  const save = async () => {
    const isFree = status === "free";
    const c = customers.find((x) => x.id === customerId);
    if (!c && !isFree) return toast.error("Pilih customer terlebih dahulu");
    const validItems = items.filter((it) => it.product_id && it.variant_label && Number(it.qty) > 0);
    if (!validItems.length) return toast.error("Tambahkan minimal satu item produk");
    const payload = {
      tanggal,
      customer_id: customerId,
      customer_nama: c ? c.nama : "Pemakaian Sendiri",
      status,
      catatan,
      items: validItems.map((it) => ({
        product_id: it.product_id,
        product_nama: it.product_nama,
        variant_label: it.variant_label,
        harga_satuan: Number(it.harga_satuan),
        qty: Number(it.qty),
        subtotal: Number(it.harga_satuan) * Number(it.qty),
      })),
    };
    try {
      await api.post("/transactions", payload);
      toast.success("Transaksi berhasil disimpan");
      resetForm();
      loadTxns();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan transaksi");
    }
  };

  const changeStatus = async (t, next) => {
    if (t.status === next) return;
    try {
      await api.patch(`/transactions/${t.id}/status`, { status: next });
      toast.success(`Status diubah menjadi ${STATUS_LABEL[next]}`);
      loadTxns();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal mengubah status");
    }
  };

  const doDelete = async () => {
    await api.delete(`/transactions/${deleteId}`);
    setDeleteId(null);
    toast.success("Transaksi dihapus");
    loadTxns();
  };

  const download = async (kind) => {
    const params = {};
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to) params.date_to = filter.date_to;
    if (filter.customer_id && filter.customer_id !== "all") params.customer_id = filter.customer_id;
    if (filter.status && filter.status !== "all") params.status = filter.status;
    try {
      const res = await api.get(`/export/${kind}`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "excel" ? "rekap_penjualan.xlsx" : "rekap_penjualan.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mengekspor");
    }
  };

  const perProduct = useMemo(() => {
    const map = {};
    txns.forEach((t) =>
      t.items.forEach((it) => {
        const key = `${it.product_nama} ${it.variant_label}`;
        if (!map[key]) map[key] = { nama: key, qty: 0, omset: 0 };
        map[key].qty += it.qty;
        map[key].omset += it.subtotal;
      })
    );
    return Object.values(map).sort((a, b) => b.omset - a.omset);
  }, [txns]);

  const totalOmset = txns.reduce((s, t) => s + t.total, 0);
  const totalLaba = txns.reduce((s, t) => s + Number(t.laba_kotor || 0), 0);

  return (
    <div className="space-y-6" data-testid="transaksi-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Transaksi</h1>
        <p className="text-sm text-slate-500 mt-1">Input transaksi baru dan lihat rekap penjualan.</p>
      </div>

      {/* Input form */}
      <Card className="p-6 border-slate-200 shadow-none rounded-lg" data-testid="txn-form">
        <h3 className="font-heading font-semibold text-slate-800 mb-4">Input Transaksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1.5" data-testid="txn-tanggal" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer {status === "free" && <span className="normal-case font-normal text-slate-400">(opsional)</span>}
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="mt-1.5" data-testid="txn-customer"><SelectValue placeholder="Pilih customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Pembayaran</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1.5" data-testid="txn-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lunas">Lunas (sudah dibayar)</SelectItem>
                <SelectItem value="kredit">Kredit (belum dibayar)</SelectItem>
                <SelectItem value="free">Free (gratis / promo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {status === "free" && (
          <div
            className="flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5 mb-4 text-sm text-violet-800"
            data-testid="free-info"
          >
            <Gift className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Transaksi <b>Free</b>: omset dicatat <b>Rp 0</b>, tetapi modal/HPP dari pabrik tetap dihitung
              sehingga mengurangi laba. Customer boleh dikosongkan (akan tercatat sebagai
              &quot;Pemakaian Sendiri&quot;).
            </span>
          </div>
        )}

        {/* items */}
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs uppercase text-slate-400 px-1">
            <div className="col-span-4">Produk</div>
            <div className="col-span-2">Varian</div>
            <div className="col-span-2">Harga SO</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-3">Subtotal</div>
          </div>
          {items.map((it, i) => {
            const p = products.find((x) => x.id === it.product_id);
            return (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b border-slate-100 pb-2 md:border-0 md:pb-0">
                <div className="md:col-span-4">
                  <Select value={it.product_id} onValueChange={(v) => onProduct(i, v)}>
                    <SelectTrigger data-testid={`item-product-${i}`}><SelectValue placeholder="Produk" /></SelectTrigger>
                    <SelectContent>
                      {products.map((pr) => (<SelectItem key={pr.id} value={pr.id}>{pr.nama}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Select value={it.variant_label} onValueChange={(v) => onVariant(i, v)} disabled={!p}>
                    <SelectTrigger data-testid={`item-variant-${i}`}><SelectValue placeholder="Varian" /></SelectTrigger>
                    <SelectContent>
                      {p?.variants.map((v) => (<SelectItem key={v.label} value={v.label}>{v.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Input type="number" value={it.harga_satuan} onChange={(e) => setItem(i, { harga_satuan: e.target.value })} data-testid={`item-harga-${i}`} />
                </div>
                <div className="md:col-span-1">
                  <Input type="number" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} data-testid={`item-qty-${i}`} />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <span className="text-sm font-semibold tabular text-slate-700 flex-1">{rupiah(Number(it.harga_satuan || 0) * Number(it.qty || 0))}</span>
                  <Button size="icon" variant="ghost" onClick={() => setItems((p2) => p2.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyItem()])} data-testid="add-item-btn">
            <Plus className="h-4 w-4 mr-1" /> Tambah Item
          </Button>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="text-2xl font-heading font-bold text-blue-600 tabular" data-testid="txn-total">{rupiah(total)}</p>
            </div>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98]" data-testid="save-txn-btn">Simpan Transaksi</Button>
          </div>
        </div>
        <div className="mt-4">
          <Input placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} data-testid="txn-catatan" />
        </div>
      </Card>

      {/* Filters + export */}
      <Card className="p-5 border-slate-200 shadow-none rounded-lg">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-slate-600 mr-2">
            <Filter className="h-4 w-4" /> <span className="text-sm font-medium">Filter</span>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Dari</Label>
            <Input type="date" value={filter.date_from} onChange={(e) => setFilter({ ...filter, date_from: e.target.value })} className="mt-1 w-40" data-testid="filter-from" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Sampai</Label>
            <Input type="date" value={filter.date_to} onChange={(e) => setFilter({ ...filter, date_to: e.target.value })} className="mt-1 w-40" data-testid="filter-to" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Customer</Label>
            <Select value={filter.customer_id} onValueChange={(v) => setFilter({ ...filter, customer_id: v })}>
              <SelectTrigger className="mt-1 w-44" data-testid="filter-customer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Customer</SelectItem>
                {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
              <SelectTrigger className="mt-1 w-40" data-testid="filter-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
                <SelectItem value="kredit">Kredit</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilter({ date_from: "", date_to: "", customer_id: "all", status: "all" })}>
            <X className="h-4 w-4 mr-1" /> Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => download("excel")} data-testid="export-excel-btn" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={() => download("pdf")} data-testid="export-pdf-btn" className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </Card>

      {/* Total per produk */}
      {perProduct.length > 0 && (
        <Card className="p-5 border-slate-200 shadow-none rounded-lg" data-testid="per-product-summary">
          <h3 className="font-heading font-semibold text-slate-800 mb-3">Total per Produk</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {perProduct.map((p) => (
              <div key={p.nama} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-700 truncate">{p.nama}</p>
                <p className="text-xs text-slate-500 mt-0.5">Qty: <span className="tabular">{p.qty}</span></p>
                <p className="text-base font-bold text-blue-600 tabular">{rupiah(p.omset)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recap table */}
      <Card className="border-slate-200 shadow-none rounded-lg overflow-hidden" data-testid="rekap-table">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h3 className="font-heading font-semibold text-slate-800">Tabel Rekap</h3>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <span>Total Omset: <span className="font-bold text-slate-900 tabular">{rupiah(totalOmset)}</span></span>
            <span>Laba Kotor: <span className={`font-bold tabular ${totalLaba >= 0 ? "text-emerald-600" : "text-red-600"}`}>{rupiah(totalLaba)}</span></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="text-left py-2.5 px-3">Tanggal</th>
                <th className="text-left py-2.5 px-3">Customer</th>
                <th className="text-left py-2.5 px-3">Produk</th>
                <th className="text-right py-2.5 px-3">Total</th>
                <th className="text-right py-2.5 px-3">HPP</th>
                <th className="text-right py-2.5 px-3">Laba Kotor</th>
                <th className="text-center py-2.5 px-3">Status</th>
                <th className="text-center py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`txn-row-${t.id}`}>
                  <td className="py-2.5 px-3 tabular text-slate-600">{t.tanggal}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{t.customer_nama}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {t.items.map((it, idx) => (
                      <span key={idx} className="inline-block mr-2 whitespace-nowrap">
                        {it.product_nama} {it.variant_label} <span className="text-slate-400">×{it.qty}</span>{idx < t.items.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular text-slate-900">{rupiah(t.total)}</td>
                  <td className="py-2.5 px-3 text-right tabular text-amber-600">{rupiah(t.total_hpp || 0)}</td>
                  <td className={`py-2.5 px-3 text-right font-semibold tabular ${(t.laba_kotor || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {rupiah(t.laba_kotor || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger data-testid={`status-toggle-${t.id}`} className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md">
                        <StatusBadge status={t.status} className="cursor-pointer" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {["lunas", "kredit", "free"].map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => changeStatus(t, s)}
                            data-testid={`set-status-${s}-${t.id}`}
                          >
                            {STATUS_LABEL[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)} data-testid={`delete-txn-${t.id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {txns.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Belum ada transaksi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-txn">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
