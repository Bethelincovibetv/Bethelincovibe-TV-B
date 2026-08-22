import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, ImagePlus, Package } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { slugify } from "@/lib/seo";

const emptyForm = {
  name: "", category_id: "", description: "", price: "", condition: "new",
  stock: "1", location: "", whatsapp: "", phone: "", cover_image: "",
};

export default function ListProduct() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...emptyForm });
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/products/list");
  }, [user, authLoading, navigate]);

  const { data: categories } = useQuery({
    queryKey: ["product-form-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").in("type", ["product", "business"]).order("name");
      return data ?? [];
    },
  });

  const { data: mine, refetch } = useQuery({
    queryKey: ["my-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("directory_products").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const upload = async (files: FileList | null, asCover: boolean) => {
    if (!files?.length || !user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `products/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("supplier-logos").upload(path, file, { contentType: file.type });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      urls.push(supabase.storage.from("supplier-logos").getPublicUrl(path).data.publicUrl);
    }
    if (asCover && urls[0]) setForm((f) => ({ ...f, cover_image: urls[0] }));
    else setGallery((g) => [...g, ...urls]);
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.from("directory_products").insert({
      user_id: user.id,
      name: form.name,
      slug,
      description: form.description || null,
      price: form.price ? Number(form.price) : 0,
      condition: form.condition,
      stock: form.stock ? Number(form.stock) : 1,
      location: form.location || null,
      whatsapp: form.whatsapp || null,
      phone: form.phone || null,
      category_id: form.category_id || null,
      cover_image: form.cover_image || gallery[0] || null,
      images: gallery,
      active: true,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product listed! It's live on the marketplace.");
    setForm({ ...emptyForm });
    setGallery([]);
    refetch();
    navigate(`/products/${slug}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product listing?")) return;
    const { error } = await supabase.from("directory_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refetch();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("directory_products").update({ active: !active }).eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Helmet>
        <title>Sell a Product — List on the Lagos Marketplace</title>
        <meta name="description" content="List your product for sale and reach thousands of Lagos buyers. Free product listings with photos, price and WhatsApp contact." />
      </Helmet>

      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Package className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold">Sell a product</h1>
          <p className="text-xs text-muted-foreground">Offering a service instead? <Link to="/businesses/list" className="text-primary underline">List a service business</Link></p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product details</CardTitle>
          <CardDescription>Clear photos and an honest price get the most enquiries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Product name</Label>
              <Input id="p-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Samsung Galaxy A15 128GB" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-price">Price (₦)</Label>
                <Input id="p-price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 150000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-stock">Quantity in stock</Label>
                <Input id="p-stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="e.g. 5" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Brand new</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-loc">Location</Label>
              <Input id="p-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Ikeja, Lagos" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>WhatsApp number</Label>
                <PhoneInput value={form.whatsapp} onChange={(v: string) => setForm({ ...form, whatsapp: v })} />
              </div>
              <div className="space-y-2">
                <Label>Phone number</Label>
                <PhoneInput value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the product, specs, warranty and delivery options." />
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-2">
                {form.cover_image && <img src={form.cover_image} alt="" className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary" />}
                {gallery.map((g) => <img key={g} src={g} alt="" className="h-20 w-20 rounded-xl object-cover" />)}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files, !form.cover_image)} />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">First photo becomes the cover image shown on the marketplace.</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing…</> : "Publish product"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!!mine?.length && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold">My products</h2>
          <div className="flex flex-col gap-2">
            {mine.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border p-3">
                {p.cover_image ? <img src={p.cover_image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted"><Package className="h-5 w-5 text-muted-foreground" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">₦{Number(p.price || 0).toLocaleString()}</p>
                </div>
                <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Live" : "Hidden"}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggle(p.id, !!p.active)}>{p.active ? "Hide" : "Show"}</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
