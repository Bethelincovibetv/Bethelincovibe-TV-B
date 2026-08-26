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
import {
  Loader2, Trash2, ImagePlus, Package, Sparkles, Download,
  UtensilsCrossed, CheckCircle2, Video, Play, ExternalLink
} from "lucide-react";
import ProductVideo from "@/components/directory/ProductVideo";
import PhoneInput from "@/components/PhoneInput";
import { slugify } from "@/lib/seo";
import {
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ProductType,
  generateProductDescriptionAI,
} from "@/lib/productAIEngine";

const emptyForm = {
  name: "",
  product_type: "physical" as ProductType,
  category_slug: "food-groceries",
  category_id: "",
  description: "",
  price: "",
  condition: "new",
  stock: "1",
  location: "Lagos, Nigeria",
  whatsapp: "",
  phone: "",
  video_url: "",
  cover_image: "",
};

export default function ListProduct() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...emptyForm });
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/products/list");
  }, [user, authLoading, navigate]);

  const { data: dbCategories } = useQuery({
    queryKey: ["product-form-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").in("type", ["product", "business"]).order("name");
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

  // Category options based on selected product type
  const availableCategories = form.product_type === "digital" ? DIGITAL_PRODUCT_CATEGORIES : PHYSICAL_PRODUCT_CATEGORIES;

  // Handle AI Description Generation
  const handleGenerateAIDescription = async () => {
    if (!form.name.trim() && !form.description.trim()) {
      toast.error("Please enter a product title or a few rough notes first!");
      return;
    }

    setGeneratingAI(true);
    const toastId = toast.loading("AI is generating a high-converting product description…");

    try {
      const catObj = availableCategories.find((c) => c.slug === form.category_slug);
      const generated = await generateProductDescriptionAI({
        productName: form.name,
        roughNotes: form.description,
        category: catObj?.name || form.category_slug,
        productType: form.product_type,
        price: form.price,
        condition: form.condition,
        location: form.location,
      });

      setForm((prev) => ({ ...prev, description: generated }));
      toast.success("AI Description generated and applied!", { id: toastId });
    } catch (err: any) {
      toast.error(`Could not generate description: ${err.message || "Please try again"}`, { id: toastId });
    } finally {
      setGeneratingAI(false);
    }
  };

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

    // Match or find category_id from db if available
    let resolvedCatId = form.category_id;
    if (!resolvedCatId && dbCategories?.length) {
      const match = dbCategories.find(
        (c: any) => c.slug === form.category_slug || c.name.toLowerCase().includes(form.category_slug.replace("-", " "))
      );
      if (match) resolvedCatId = match.id;
    }

    const { error } = await supabase.from("directory_products").insert({
      user_id: user.id,
      name: form.name,
      slug,
      description: form.description || null,
      price: form.price ? Number(form.price) : 0,
      condition: form.product_type === "digital" ? "digital" : form.condition,
      stock: form.stock ? Number(form.stock) : (form.product_type === "digital" ? 999 : 1),
      location: form.location || (form.product_type === "digital" ? "Instant Online Download" : "Lagos, Nigeria"),
      whatsapp: form.whatsapp || null,
      phone: form.phone || null,
      video_url: form.video_url || null,
      category_id: resolvedCatId || null,
      cover_image: form.cover_image || gallery[0] || null,
      images: gallery,
      active: true,
    });

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product successfully listed! It's now live on the marketplace.");
    setForm({ ...emptyForm });
    setGallery([]);
    refetch();
    navigate(`/products/${slug}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product listing?")) return;
    const { error } = await supabase.from("directory_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product listing deleted");
    refetch();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("directory_products").update({ active: !active }).eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Helmet>
        <title>Sell a Product — List on the Lagos Marketplace</title>
        <meta name="description" content="List physical food, goods or digital products for sale. Free product listings with AI description generation and direct WhatsApp contact." />
      </Helmet>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-xs">
          <Package className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            List a Product for Sale
          </h1>
          <p className="text-sm font-medium text-foreground/80">
            Publish physical goods, food items, or digital downloads to thousands of verified Lagos buyers. Offering a service instead?{" "}
            <Link to="/businesses/list" className="text-primary font-bold underline hover:text-primary/80">
              List a service business
            </Link>
          </p>
        </div>
      </div>

      <Card className="rounded-3xl border-border/80 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-black text-foreground">
            Product Listing Details
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm font-medium text-muted-foreground">
            Choose whether you are listing a physical product (including food) or an instant digital asset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            {/* 1. Product Type Selector (Physical vs Digital) */}
            <div className="space-y-2">
              <Label className="font-black text-xs sm:text-sm text-foreground">
                Select Product Format / Type *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      product_type: "physical",
                      category_slug: "food-groceries",
                      condition: "new",
                    });
                  }}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-2xl border text-left transition-all ${
                    form.product_type === "physical"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/80 bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm text-foreground">
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                    <span>Physical Merchandise &amp; Food</span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground leading-snug">
                    Food items, groceries, fashion, electronics, cosmetics, spare parts &amp; goods delivered to buyers.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      product_type: "digital",
                      category_slug: "ebooks-guides",
                      condition: "digital",
                      location: "Instant Online Download",
                    });
                  }}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-2xl border text-left transition-all ${
                    form.product_type === "digital"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/80 bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm text-foreground">
                    <Download className="h-4 w-4 text-primary" />
                    <span>Digital Products &amp; Courses</span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground leading-snug">
                    eBooks, online video masterclasses, software, Notion templates, graphic kits &amp; legal agreements.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Product Name */}
            <div className="space-y-2">
              <Label htmlFor="p-name" className="font-black text-xs sm:text-sm text-foreground">
                Product Title / Name *
              </Label>
              <Input
                id="p-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={
                  form.product_type === "digital"
                    ? "e.g. China 1688 Wholesale Sourcing Masterclass + Supplier Directory (2026)"
                    : "e.g. 5kg Premium Ofada Rice & Spices Package / iPhone 15 Pro Max 256GB"
                }
                className="h-11 rounded-xl text-sm font-medium text-foreground bg-background"
              />
            </div>

            {/* 3. Category & Condition */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-black text-xs sm:text-sm text-foreground">
                  {form.product_type === "digital" ? "Digital Category *" : "Physical Goods & Food Category *"}
                </Label>
                <Select
                  value={form.category_slug}
                  onValueChange={(v) => {
                    const match = dbCategories?.find((c: any) => c.slug === v);
                    setForm({ ...form, category_slug: v, category_id: match?.id || "" });
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl font-bold text-xs sm:text-sm bg-background text-foreground">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((c) => (
                      <SelectItem key={c.id} value={c.slug} className="text-xs sm:text-sm font-medium">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.product_type === "physical" ? (
                <div className="space-y-2">
                  <Label className="font-black text-xs sm:text-sm text-foreground">
                    Item Condition *
                  </Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="h-11 rounded-xl font-bold text-xs sm:text-sm bg-background text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="text-xs sm:text-sm">Brand New / Fresh Stock</SelectItem>
                      <SelectItem value="used" className="text-xs sm:text-sm">Clean Used / Secondhand</SelectItem>
                      <SelectItem value="refurbished" className="text-xs sm:text-sm">Refurbished / Certified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="font-black text-xs sm:text-sm text-foreground">
                    Delivery / Access Format
                  </Label>
                  <div className="h-11 rounded-xl bg-muted/50 border border-border/80 px-3.5 flex items-center text-xs sm:text-sm font-bold text-foreground">
                    <Download className="h-4 w-4 mr-2 text-primary" /> Instant Online Download &amp; WhatsApp
                  </div>
                </div>
              )}
            </div>

            {/* 4. Price & Stock */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-price" className="font-black text-xs sm:text-sm text-foreground">
                  Selling Price (₦) *
                </Label>
                <Input
                  id="p-price"
                  type="number"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 25000"
                  className="h-11 rounded-xl text-sm font-medium text-foreground bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-stock" className="font-black text-xs sm:text-sm text-foreground">
                  {form.product_type === "digital" ? "Available Licenses / Slots" : "Available Stock Quantity"}
                </Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="1"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder={form.product_type === "digital" ? "Unlimited (999)" : "e.g. 10"}
                  className="h-11 rounded-xl text-sm font-medium text-foreground bg-background"
                />
              </div>
            </div>

            {/* 5. Location */}
            {form.product_type === "physical" && (
              <div className="space-y-2">
                <Label htmlFor="p-loc" className="font-black text-xs sm:text-sm text-foreground">
                  Item Location (Town, City) *
                </Label>
                <Input
                  id="p-loc"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Ikeja / Mile 12 Market / Lekki Phase 1, Lagos"
                  className="h-11 rounded-xl text-sm font-medium text-foreground bg-background"
                />
              </div>
            )}

            {/* 6. Contact details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-black text-xs sm:text-sm text-foreground">
                  WhatsApp Contact Number *
                </Label>
                <PhoneInput value={form.whatsapp} onChange={(v: string) => setForm({ ...form, whatsapp: v })} />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs sm:text-sm text-foreground">
                  Direct Phone Call Number
                </Label>
                <PhoneInput value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} />
              </div>
            </div>

            {/* 7. Product Description with AI GENERATOR BUTTON */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label htmlFor="p-desc" className="font-black text-xs sm:text-sm text-foreground">
                  Product Description &amp; Specifications *
                </Label>

                {/* AI Assistant Generate Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generatingAI}
                  onClick={handleGenerateAIDescription}
                  className="h-8 rounded-xl font-black text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 shadow-xs gap-1.5 self-start sm:self-auto"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Writing with AI…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>✨ Improve &amp; Generate with AI</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  id="p-desc"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={
                    form.product_type === "digital"
                      ? "Type a few words (e.g. complete video course with supplier contacts, PDF cheat sheet, lifetime access) then click '✨ Improve & Generate with AI'."
                      : "Type a few words (e.g. fresh farm spices 5kg pack, clean delivery, verified quality) then click '✨ Improve & Generate with AI'."
                  }
                  className="rounded-2xl font-medium text-xs sm:text-sm leading-relaxed text-foreground bg-background"
                />
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                Tip: Enter your product title or bullet points above, and click <strong className="text-primary font-bold">✨ Improve &amp; Generate with AI</strong> to automatically generate formatted specifications and sales copy.
              </p>
            </div>

            {/* 8. YouTube / Video Showcase */}
            <div className="space-y-2 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/5 via-rose-500/5 to-transparent p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="p-video" className="font-black text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  </div>
                  <span>Product YouTube Video Showcase (Optional)</span>
                </Label>
                <Badge variant="outline" className="text-[10px] font-bold border-red-500/30 text-red-600 dark:text-red-400">
                  Boosts Sales
                </Badge>
              </div>
              <Input
                id="p-video"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="Paste YouTube link: e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="h-11 rounded-xl text-xs sm:text-sm font-medium text-foreground bg-background border-border/80"
              />
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                Paste any YouTube, Vimeo, Loom, or TikTok link to show an embedded video walkthrough, unboxing, or course preview directly on your sales page.
              </p>
              {form.video_url && (
                <div className="mt-2.5">
                  <p className="text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-red-500" /> Live Video Preview:
                  </p>
                  <ProductVideo url={form.video_url} title={form.name || "Product Video Preview"} />
                </div>
              )}
            </div>

            {/* 9. Photo Uploads */}
            <div className="space-y-2">
              <Label className="font-black text-xs sm:text-sm text-foreground">
                Product Images &amp; Mockups
              </Label>
              <div className="flex flex-wrap gap-2.5">
                {form.cover_image && (
                  <div className="relative group">
                    <img src={form.cover_image} alt="" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary shadow-xs" />
                    <span className="absolute bottom-1 left-1 right-1 text-center bg-black/75 text-white text-[9px] font-black rounded-lg py-0.5">
                      Cover
                    </span>
                  </div>
                )}
                {gallery.map((g, idx) => (
                  <img key={idx} src={g} alt="" className="h-24 w-24 rounded-2xl object-cover border border-border/80 shadow-xs" />
                ))}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/90 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/20">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <ImagePlus className="h-6 w-6" />}
                  <span className="text-[10px] font-bold mt-1">{uploading ? "Uploading" : "Add Image"}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files, !form.cover_image)} />
                </label>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                First photo becomes the primary cover preview displayed across marketplace feeds.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl font-black text-sm sm:text-base bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing Listing to Marketplace…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Publish Product Listing Now
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Seller's Existing Products */}
      {!!mine?.length && (
        <div className="mt-8 space-y-3">
          <h2 className="text-xl font-black text-foreground">
            My Listed Marketplace Products ({mine.length})
          </h2>
          <div className="flex flex-col gap-2.5">
            {mine.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
                {p.cover_image ? (
                  <img src={p.cover_image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm sm:text-base font-bold text-foreground">{p.name}</p>
                  <p className="text-xs sm:text-sm font-black text-primary">₦{Number(p.price || 0).toLocaleString()}</p>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">{p.location || "Lagos"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={p.active ? "default" : "secondary"} className="font-bold text-xs">
                    {p.active ? "Live" : "Hidden"}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-8 font-bold text-xs rounded-xl" onClick={() => toggle(p.id, !!p.active)}>
                    {p.active ? "Hide" : "Show"}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => remove(p.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

