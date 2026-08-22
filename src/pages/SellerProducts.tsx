import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package, Plus, Loader2, Trash2, Copy, Pencil, Eye, EyeOff, ImagePlus,
  Download, Users, TrendingUp, Wallet, CreditCard, FileUp, Video,
} from "lucide-react";
import ProductVideo from "@/components/directory/ProductVideo";
import { slugify } from "@/lib/seo";

const DELIVERY_METHODS = [
  { value: "file", label: "Secure file upload" },
  { value: "download_url", label: "External download URL" },
  { value: "course_url", label: "Course access URL" },
  { value: "google_drive", label: "Google Drive" },
  { value: "dropbox", label: "Dropbox" },
  { value: "onedrive", label: "OneDrive" },
  { value: "github", label: "GitHub repository" },
  { value: "private_site", label: "Private website link" },
  { value: "other_url", label: "Other secure URL" },
];

const emptyForm = {
  id: "", name: "", description: "", price: "", category_id: "", product_type: "digital",
  delivery_method: "file", delivery_url: "", delivery_file_path: "", video_url: "",
  cover_image: "", status: "published",
};

export default function SellerProducts() {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [gallery, setGallery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
      supabase.from("directory_products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("product_purchases").select("*, directory_products(name)").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").in("type", ["product", "business"]).order("name"),
    ]);
    setProducts(p ?? []);
    setSales(s ?? []);
    setCategories(c ?? []);
    const { data: acc } = await supabase.functions.invoke("seller-paystack", { body: { action: "status" } });
    setAccount(acc?.account ?? null);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const stats = useMemo(() => {
    const paid = sales.filter((s) => s.status === "paid");
    return {
      revenue: paid.reduce((t, s) => t + Number(s.amount || 0), 0),
      sales: paid.length,
      customers: new Set(paid.map((s) => s.buyer_email)).size,
      downloads: products.reduce((t, p) => t + (p.downloads_count || 0), 0),
    };
  }, [sales, products]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login?redirect=/dashboard/products" replace />;

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `products/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("supplier-logos").upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); continue; }
      urls.push(supabase.storage.from("supplier-logos").getPublicUrl(path).data.publicUrl);
    }
    setUploading(false);
    if (!form.cover_image && urls[0]) setForm((f) => ({ ...f, cover_image: urls[0] }));
    setGallery((g) => [...g, ...urls]);
  };

  const uploadDigitalFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("digital-products").upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, delivery_file_path: path, delivery_method: "file" }));
    toast.success("File uploaded securely");
  };

  const openNew = () => { setForm({ ...emptyForm }); setGallery([]); setOpen(true); };
  const openEdit = (p: any) => {
    setForm({
      id: p.id, name: p.name || "", description: p.description || "", price: String(p.price ?? ""),
      category_id: p.category_id || "", product_type: p.product_type || "physical",
      delivery_method: p.delivery_method || "file", delivery_url: p.delivery_url || "",
      delivery_file_path: p.delivery_file_path || "", video_url: p.video_url || "",
      cover_image: p.cover_image || "", status: p.status || "published",
    });
    setGallery(Array.isArray(p.images) ? p.images : []);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload: any = {
      user_id: user.id,
      name: form.name,
      description: form.description || null,
      price: form.price ? Number(form.price) : 0,
      category_id: form.category_id || null,
      product_type: form.product_type,
      delivery_method: form.product_type === "digital" ? form.delivery_method : null,
      delivery_url: form.product_type === "digital" && form.delivery_method !== "file" ? form.delivery_url || null : null,
      delivery_file_path: form.product_type === "digital" && form.delivery_method === "file" ? form.delivery_file_path || null : null,
      video_url: form.video_url || null,
      cover_image: form.cover_image || gallery[0] || null,
      images: gallery,
      status: form.status,
      active: form.status === "published",
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("directory_products").update(payload).eq("id", form.id));
    } else {
      payload.slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 7)}`;
      ({ error } = await supabase.from("directory_products").insert(payload));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Product updated" : "Product created");
    setOpen(false);
    load();
  };

  const duplicate = async (p: any) => {
    const { id, created_at, updated_at, slug, views_count, sales_count, downloads_count, revenue, ...rest } = p;
    const { error } = await supabase.from("directory_products").insert({
      ...rest,
      name: `${p.name} (copy)`,
      slug: `${slugify(p.name)}-${Math.random().toString(36).slice(2, 7)}`,
      status: "draft",
      active: false,
    });
    if (error) return toast.error(error.message);
    toast.success("Duplicated as draft");
    load();
  };

  const togglePublish = async (p: any) => {
    const next = p.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("directory_products").update({ status: next, active: next === "published" }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (p: any) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("directory_products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <Helmet><title>Seller Dashboard — My Products, Sales & Revenue</title></Helmet>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Package className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold">Seller dashboard</h1>
            <p className="text-xs text-muted-foreground">Create, sell and deliver your products.</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" />New product</Button>
      </div>

      {account?.status !== "connected" && (
        <Card className="mb-4 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-primary" />
              Connect your Paystack account to accept payments for digital products.
            </div>
            <Button asChild size="sm"><Link to="/dashboard/payments">Connect Paystack</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Wallet} label="Revenue" value={`₦${stats.revenue.toLocaleString()}`} />
        <StatTile icon={TrendingUp} label="Sales" value={stats.sales} />
        <StatTile icon={Users} label="Customers" value={stats.customers} />
        <StatTile icon={Download} label="Downloads" value={stats.downloads} />
      </div>

      <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-2">
          {products.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No products yet — create your first one.</p>}
          {products.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
              {p.cover_image ? <img src={p.cover_image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted"><Package className="h-5 w-5 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  ₦{Number(p.price || 0).toLocaleString()} · {p.sales_count || 0} sales · {p.views_count || 0} views
                </p>
              </div>
              <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status === "published" ? "Live" : "Draft"}</Badge>
              {p.product_type === "digital" && <Badge variant="outline">Digital</Badge>}
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => togglePublish(p)} aria-label="Toggle publish">
                  {p.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => duplicate(p)} aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-2">
          {sales.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No sales yet.</p>}
          {sales.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.directory_products?.name || "Product"}</p>
                <p className="text-xs text-muted-foreground">{s.buyer_email} · {new Date(s.created_at).toLocaleString()}</p>
              </div>
              <span className="font-semibold">₦{Number(s.amount || 0).toLocaleString()}</span>
              <Badge variant={s.status === "paid" ? "default" : "secondary"}>{s.status}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Per-product performance</CardTitle>
              <CardDescription>Views, sales, downloads and revenue for each product.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.views_count || 0} views</span>
                  <span className="text-xs text-muted-foreground">{p.sales_count || 0} sales</span>
                  <span className="text-xs text-muted-foreground">{p.downloads_count || 0} downloads</span>
                  <span className="font-semibold">₦{Number(p.revenue || 0).toLocaleString()}</span>
                </div>
              ))}
              {products.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing to analyse yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n">Product name</Label>
              <Input id="n" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pr">Price (₦)</Label>
                <Input id="pr" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Product type</Label>
                <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digital product</SelectItem>
                    <SelectItem value="physical">Physical product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="d">Description</Label>
              <Textarea id="d" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {form.product_type === "digital" && (
              <div className="space-y-3 rounded-2xl border p-3">
                <p className="text-sm font-semibold">Delivery</p>
                <Select value={form.delivery_method} onValueChange={(v) => setForm({ ...form, delivery_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DELIVERY_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                {form.delivery_method === "file" ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Product file (kept private until payment)</Label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {form.delivery_file_path ? form.delivery_file_path.split("/").pop() : "Upload file"}
                      <input type="file" className="hidden" onChange={(e) => uploadDigitalFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Access / download link (hidden until payment)</Label>
                    <Input placeholder="https://…" value={form.delivery_url} onChange={(e) => setForm({ ...form, delivery_url: e.target.value })} />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="v" className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />Product video (YouTube, Vimeo, Loom, TikTok)</Label>
              <Input id="v" placeholder="https://youtube.com/watch?v=…" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
              <ProductVideo url={form.video_url} />
            </div>

            <div className="space-y-2">
              <Label>Images & gallery</Label>
              <div className="flex flex-wrap gap-2">
                {form.cover_image && <img src={form.cover_image} alt="" className="h-16 w-16 rounded-xl object-cover ring-2 ring-primary" />}
                {gallery.filter((g) => g !== form.cover_image).map((g) => <img key={g} src={g} alt="" className="h-16 w-16 rounded-xl object-cover" />)}
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadImages(e.target.files)} />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={busy} onClick={() => setForm((f) => ({ ...f, status: "published" }))}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
              </Button>
              <Button type="submit" variant="outline" className="flex-1" disabled={busy} onClick={() => setForm((f) => ({ ...f, status: "draft" }))}>
                Save as draft
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{label}</p>
        <p className="text-xl font-extrabold">{value}</p>
      </CardContent>
    </Card>
  );
}
