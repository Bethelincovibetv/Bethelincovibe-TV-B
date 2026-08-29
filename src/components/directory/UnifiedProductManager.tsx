import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package, Plus, Loader2, Trash2, Copy, Pencil, Eye, EyeOff, ImagePlus,
  Download, Users, TrendingUp, Wallet, CreditCard, FileUp, Video,
  ArrowLeft, ExternalLink, Sparkles, CheckCircle2, AlertCircle, ShoppingBag,
  Zap, Play, ShieldCheck, Share2
} from "lucide-react";
import ProductVideo from "@/components/directory/ProductVideo";
import PhoneInput from "@/components/PhoneInput";
import { slugify } from "@/lib/seo";
import {
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ProductType,
  generateProductDescriptionAI,
  resolveSafeProductCategoryUuid,
  isValidUuid,
} from "@/lib/productAIEngine";
import { copyToClipboard } from "@/lib/clipboard";

export const DELIVERY_METHODS = [
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

export const BOOST_PACKAGES = [
  { key: "7d", days: 7, label: "7 Days Spotlight", price: 1500, desc: "Featured at the top of Marketplace search & category feeds for 1 week." },
  { key: "14d", days: 14, label: "14 Days High Visibility", price: 2800, desc: "Double exposure on Homepage & Marketplace showcase for 2 weeks." },
  { key: "30d", days: 30, label: "30 Days Top Marketplace", price: 5000, desc: "Maximum visibility with Golden Featured badge for a full month." },
];

export interface UnifiedProductFormData {
  id?: string;
  name: string;
  product_type: ProductType;
  category_slug: string;
  category_id: string;
  description: string;
  price: string;
  condition: string;
  stock: string;
  location: string;
  whatsapp: string;
  phone: string;
  video_url: string;
  cover_image: string;
  delivery_method: string;
  delivery_url: string;
  delivery_file_path: string;
  status: string;
}

const emptyForm: UnifiedProductFormData = {
  name: "",
  product_type: "physical",
  category_slug: "food-groceries",
  category_id: "",
  description: "",
  price: "",
  condition: "new",
  stock: "1",
  location: "",
  whatsapp: "",
  phone: "",
  video_url: "",
  cover_image: "",
  delivery_method: "file",
  delivery_url: "",
  delivery_file_path: "",
  status: "published",
};

interface UnifiedProductManagerProps {
  defaultTab?: "create" | "manage";
  title?: string;
  description?: string;
  hideHeader?: boolean;
}

export default function UnifiedProductManager({
  defaultTab = "manage",
  title = "Product Management & AI Creator",
  description = "Create, edit, and optimize your physical and digital products with AI on Bethelincovibe Marketplace.",
  hideHeader = false,
}: UnifiedProductManagerProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const editParamId = searchParams.get("edit");
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>(
    editParamId ? "form" : (tabParam === "form" || tabParam === "create" || defaultTab === "create" ? "form" : "manage")
  );

  const [form, setForm] = useState<UnifiedProductFormData>({ ...emptyForm });
  const [gallery, setGallery] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [generatingAI, setGeneratingAI] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadingDigital, setUploadingDigital] = useState<boolean>(false);

  // Boost Dialog
  const [boostOpen, setBoostOpen] = useState(false);
  const [selectedProductForBoost, setSelectedProductForBoost] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState(BOOST_PACKAGES[0]);
  const [boosting, setBoosting] = useState(false);

  // Delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Fetch Categories
  const { data: dbCategories } = useQuery({
    queryKey: ["unified-product-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, type")
        .in("type", ["product", "business"])
        .order("name");
      return data ?? [];
    },
  });

  // 2. Fetch User Primary Business for auto pre-filling
  const { data: userBusiness } = useQuery({
    queryKey: ["user-primary-business", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: supplier }, { data: profile }] = await Promise.all([
        supabase.from("suppliers").select("*").eq("submitted_by", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);
      return { supplier, profile };
    },
  });

  // 3. Fetch User Products
  const { data: products = [], refetch: refetchProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["user-unified-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("directory_products")
        .select("*, categories(name, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // 4. Fetch User Sales
  const { data: sales = [] } = useQuery({
    queryKey: ["user-product-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_purchases")
        .select("*, directory_products(name)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // 5. Fetch Wallet
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["user-wallet-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", user!.id).maybeSingle();
      return data ?? { balance: 0 };
    },
  });

  // 6. Fetch Admin Digital Products Global Setting
  const { data: digitalProductsSetting } = useQuery({
    queryKey: ["site-setting-digital-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "digital_products_enabled")
        .maybeSingle();
      return data?.value !== "false"; // default true
    },
  });
  const isDigitalAllowed = digitalProductsSetting !== false;

  // Auto pre-fill new form from user's business profile
  useEffect(() => {
    if (userBusiness && !isEditing && !form.name) {
      const { supplier, profile } = userBusiness;
      const bizPhone = supplier?.phone || profile?.phone || profile?.whatsapp || "";
      const bizWhatsapp = supplier?.whatsapp || profile?.whatsapp || bizPhone;
      const bizLocation = supplier?.address
        ? `${supplier.address}${supplier.city ? `, ${supplier.city}` : ""}`
        : (supplier?.city ? `${supplier.city}${supplier.state ? `, ${supplier.state}` : ""}` : profile?.city || "Nationwide Delivery");

      setForm((prev) => ({
        ...prev,
        whatsapp: prev.whatsapp || bizWhatsapp,
        phone: prev.phone || bizPhone,
        location: prev.location || bizLocation,
      }));
    }
  }, [userBusiness, isEditing]);

  // Load product for editing if editParamId exists
  useEffect(() => {
    if (!editParamId) return;

    if (!loadingProducts && products.length >= 0) {
      const found = products.find((p) => p.id === editParamId);
      if (found) {
        startEditProduct(found);
      } else {
        toast.error("You do not have permission to edit this product.");
        resetToNew();
      }
    }
  }, [editParamId, products, loadingProducts]);

  // Compute live sales metrics
  const stats = useMemo(() => {
    const paid = sales.filter((s: any) => s.status === "paid");
    return {
      revenue: paid.reduce((t: number, s: any) => t + Number(s.amount || 0), 0),
      salesCount: paid.length,
      customersCount: new Set(paid.map((s: any) => s.buyer_email)).size,
      totalDownloads: products.reduce((t: number, p: any) => t + (p.downloads_count || 0), 0),
      activeCount: products.filter((p: any) => p.active !== false).length,
      featuredCount: products.filter((p: any) => p.featured).length,
    };
  }, [sales, products]);

  const availableCategories = form.product_type === "digital" ? DIGITAL_PRODUCT_CATEGORIES : PHYSICAL_PRODUCT_CATEGORIES;

  // Handle Edit Action
  const startEditProduct = (p: any) => {
    const isDigital = p.product_type === "digital" || p.condition === "digital";
    setIsEditing(true);
    setEditingProductId(p.id);

    // Find category slug or preset
    const matchedCategory = dbCategories?.find((c) => c.id === p.category_id);
    const catSlug = matchedCategory?.slug || (isDigital ? "ebooks-guides" : "food-groceries");
    const safeCatId = isValidUuid(p.category_id) ? p.category_id : (matchedCategory?.id || "");

    setForm({
      id: p.id,
      name: p.name || "",
      product_type: isDigital ? "digital" : "physical",
      category_slug: catSlug,
      category_id: safeCatId,
      description: p.description || "",
      price: p.price ? String(p.price) : "",
      condition: p.condition || (isDigital ? "digital" : "new"),
      stock: p.stock ? String(p.stock) : (isDigital ? "999" : "1"),
      location: p.location || "",
      whatsapp: p.whatsapp || "",
      phone: p.phone || "",
      video_url: p.video_url || "",
      cover_image: p.cover_image || "",
      delivery_method: p.delivery_method || "file",
      delivery_url: p.delivery_url || "",
      delivery_file_path: p.delivery_file_path || "",
      status: p.status || "published",
    });

    setGallery(Array.isArray(p.images) ? p.images : (p.cover_image ? [p.cover_image] : []));
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetToNew = () => {
    setIsEditing(false);
    setEditingProductId(null);
    setForm({ ...emptyForm });
    setGallery([]);
    if (searchParams.has("edit")) {
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  };

  // AI Description Generator
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

  // Upload Images
  const uploadImages = async (files: FileList | null, asCover = false) => {
    if (!files?.length || !user) return;
    setUploading(true);
    const urls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `products/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from("supplier-logos").upload(path, file, { contentType: file.type });
        if (error) {
          toast.error(`Upload error: ${error.message}`);
          continue;
        }
        const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }

      if (urls.length > 0) {
        if (asCover || !form.cover_image) {
          setForm((f) => ({ ...f, cover_image: urls[0] }));
        }
        setGallery((g) => Array.from(new Set([...g, ...urls])));
        toast.success(`Uploaded ${urls.length} product image(s)!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  // Upload Digital Product File
  const uploadDigitalFile = async (file: File | null) => {
    if (!file || !user) return;
    setUploadingDigital(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("digital-products").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, delivery_file_path: path, delivery_method: "file" }));
      toast.success("Digital file uploaded and encrypted securely!");
    } catch (err: any) {
      toast.error(err.message || "Digital file upload failed");
    } finally {
      setUploadingDigital(false);
    }
  };

  // Toggle Active / Inactive Status
  const toggleActiveStatus = async (product: any) => {
    const nextState = !product.active;
    const { error } = await supabase
      .from("directory_products")
      .update({ active: nextState })
      .eq("id", product.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Product ${nextState ? "activated" : "hidden"} successfully`);
      refetchProducts();
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("directory_products").delete().eq("id", productToDelete.id);
      if (error) throw error;
      toast.success(`"${productToDelete.name}" deleted from your inventory.`);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      refetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  // Boost Promotion
  const handleBoostProduct = async () => {
    if (!user || !selectedProductForBoost) return;
    const currentBal = wallet?.balance ?? 0;
    if (currentBal < selectedPackage.price) {
      toast.error(`Insufficient wallet balance (₦${currentBal.toLocaleString()}). Please fund your wallet first.`);
      return;
    }

    setBoosting(true);
    try {
      // Deduct wallet balance
      const { data: deducted, error: rpcErr } = await (supabase as any).rpc("deduct_wallet", {
        _user_id: user.id,
        _amount: selectedPackage.price,
        _description: `Featured Product Promo (${selectedPackage.label}) for "${selectedProductForBoost.name}"`,
        _reference_id: selectedProductForBoost.id,
      });

      if (rpcErr || deducted === false) {
        const newBal = currentBal - selectedPackage.price;
        await supabase.from("wallets").update({ balance: newBal }).eq("user_id", user.id);
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: selectedPackage.price,
          type: "debit",
          description: `Featured Product Promo (${selectedPackage.label}) for "${selectedProductForBoost.name}"`,
          reference_id: selectedProductForBoost.id,
        });
      }

      // Update product featured flag
      const { error: prodErr } = await supabase
        .from("directory_products")
        .update({ featured: true })
        .eq("id", selectedProductForBoost.id);

      if (prodErr) throw prodErr;

      toast.success(`🎉 "${selectedProductForBoost.name}" is now Featured on the Marketplace!`);
      setBoostOpen(false);
      refetchProducts();
      refetchWallet();
    } catch (err: any) {
      toast.error(err.message || "Failed to activate featured promotion");
    } finally {
      setBoosting(false);
    }
  };

  // Form Submission (Create or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Please provide a product title.");
      return;
    }

    setSubmitting(true);
    try {
      // Safely resolve category_id to ensure only valid UUID or null is passed to database
      const resolvedCatId = resolveSafeProductCategoryUuid(
        form.category_id || form.category_slug,
        dbCategories || []
      );

      const coverImg = form.cover_image || gallery[0] || null;
      const parsedPrice = form.price && !isNaN(Number(form.price)) && Number(form.price) > 0 ? Number(form.price) : null;
      const parsedStock = form.product_type === "digital" ? 999 : (form.stock && !isNaN(Number(form.stock)) ? Number(form.stock) : 1);
      const isDigital = form.product_type === "digital";

      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parsedPrice,
        currency: "NGN",
        product_type: isDigital ? "digital" : "physical",
        condition: isDigital ? "digital" : (form.condition || "new"),
        stock: parsedStock,
        location: form.location ? form.location.trim() : (isDigital ? "Instant Online Access" : "Nationwide Delivery"),
        whatsapp: form.whatsapp ? form.whatsapp.trim() : null,
        phone: form.phone ? form.phone.trim() : null,
        video_url: form.video_url ? form.video_url.trim() : null,
        category_id: resolvedCatId,
        cover_image: coverImg,
        images: gallery.length > 0 ? gallery : (coverImg ? [coverImg] : []),
        delivery_method: isDigital ? (form.delivery_method || "file") : null,
        delivery_url: isDigital ? (form.delivery_url ? form.delivery_url.trim() : null) : null,
        delivery_file_path: isDigital ? (form.delivery_file_path ? form.delivery_file_path.trim() : null) : null,
        active: true,
        status: form.status || "published",
      };

      if (isEditing && editingProductId) {
        // UPDATE existing product
        const { error } = await supabase
          .from("directory_products")
          .update(payload)
          .eq("id", editingProductId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success(`"${form.name}" successfully updated!`);
      } else {
        // CREATE new product
        const cleanSlugBase = slugify(form.name) || "product";
        const slug = `${cleanSlugBase}-${Math.random().toString(36).slice(2, 7)}`;
        const { data: newProd, error } = await supabase
          .from("directory_products")
          .insert({
            ...payload,
            user_id: user.id,
            slug,
          })
          .select("id, slug")
          .single();

        if (error) throw error;
        toast.success("Product successfully created & published on Bethelincovibe Marketplace!");
      }

      resetToNew();
      refetchProducts();
      setActiveTab("manage");
    } catch (err: any) {
      toast.error(err.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <Helmet>
        <title>{title} | Bethelincovibe</title>
        <meta name="description" content={description} />
      </Helmet>

      {/* Header Banner */}
      {!hideHeader && (
        <div className="rounded-3xl bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600 border border-white/20 p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 text-xs font-bold gap-1">
                <Sparkles className="h-3 w-3 text-amber-300" /> Unified Product Studio
              </Badge>
              <Badge variant="outline" className="text-xs text-white/90 border-white/30">
                {products.length} Listing{products.length === 1 ? "" : "s"} Active
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 max-w-2xl font-medium">
              {description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant={activeTab === "form" ? "secondary" : "outline"}
              onClick={() => {
                if (activeTab !== "form") resetToNew();
                setActiveTab("form");
              }}
              className="gap-2 font-bold rounded-2xl h-11 px-4 sm:px-5 w-full sm:w-auto shadow-md bg-white text-purple-950 hover:bg-white/90 justify-center text-xs sm:text-sm active:scale-98 transition-all"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{isEditing ? "Editing Product" : "Create New Product"}</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "manage" ? "secondary" : "outline"}
              onClick={() => setActiveTab("manage")}
              className={`gap-2 font-bold rounded-2xl h-11 px-4 sm:px-5 w-full sm:w-auto justify-center text-xs sm:text-sm whitespace-nowrap active:scale-98 transition-all ${
                activeTab === "manage"
                  ? "bg-white text-purple-950 shadow-md"
                  : "text-white border border-white/40 hover:bg-white/15 bg-white/5"
              }`}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span>My Products ({products.length})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Top Sales & Inventory Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-2xl border-border/70 shadow-xs bg-card p-3.5 sm:p-4.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">Total Revenue</span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-foreground">₦{stats.revenue.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{stats.salesCount} paid order{stats.salesCount === 1 ? "" : "s"}</p>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs bg-card p-3.5 sm:p-4.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">Active Catalog</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-foreground">{stats.activeCount}</p>
          <p className="text-[10px] text-muted-foreground">{stats.featuredCount} featured spotlight</p>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs bg-card p-3.5 sm:p-4.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">Digital Downloads</span>
            <Download className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-foreground">{stats.totalDownloads}</p>
          <p className="text-[10px] text-muted-foreground">Total unlocked files</p>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs bg-card p-3.5 sm:p-4.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">Wallet Balance</span>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-foreground">₦{(wallet?.balance ?? 0).toLocaleString()}</p>
          <Link to="/wallet" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
            Fund Wallet →
          </Link>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-2xl h-11">
            <TabsTrigger value="form" className="rounded-xl px-4 font-bold text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              {isEditing ? "Edit Product" : "AI Product Creator"}
            </TabsTrigger>
            <TabsTrigger value="manage" className="rounded-xl px-4 font-bold text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
              <Package className="h-4 w-4" />
              Inventory &amp; Sales ({products.length})
            </TabsTrigger>
          </TabsList>

          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetToNew} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel Edit
            </Button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: UNIFIED AI-POWERED PRODUCT CREATION / EDITING FORM                */}
        {/* ========================================================================= */}
        <TabsContent value="form" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent border-b border-border/60 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {isEditing ? `Editing "${form.name || "Product"}"` : "Create & Launch Product on Marketplace"}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                      Both physical merchandise and instant digital downloads are fully supported with automated sales checkout.
                    </CardDescription>
                  </div>
                  {isEditing && (
                    <Badge className="bg-amber-500 text-white font-bold text-xs self-start sm:self-auto">
                      Editing Mode
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-7 space-y-6">
                
                {/* 1. PRODUCT TYPE SWITCHER */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Product Classification *</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Choose between physical delivery or digital download</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => {
                          const isCurrentlyDigital = f.product_type === "digital";
                          const nextCatSlug = isCurrentlyDigital ? "food-groceries" : f.category_slug;
                          const nextCatId = resolveSafeProductCategoryUuid(nextCatSlug, dbCategories || []);
                          return {
                            ...f,
                            product_type: "physical",
                            condition: f.condition === "digital" ? "new" : f.condition || "new",
                            category_slug: nextCatSlug,
                            category_id: nextCatId || "",
                          };
                        })
                      }
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                        form.product_type === "physical"
                          ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                          : "border-border/70 hover:border-border bg-card"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-foreground">Physical Merchandise</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                          Tangible goods, fashion, food, phones, electronics, tools &amp; items shipped/delivered to buyers.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isDigitalAllowed) {
                          toast.error("Digital product selling is currently paused by platform administrator.");
                          return;
                        }
                        setForm((f) => {
                          const isCurrentlyPhysical = f.product_type === "physical";
                          const nextCatSlug = isCurrentlyPhysical ? "software-apps" : f.category_slug;
                          const nextCatId = resolveSafeProductCategoryUuid(nextCatSlug, dbCategories || []);
                          return {
                            ...f,
                            product_type: "digital",
                            condition: "digital",
                            stock: "999",
                            category_slug: nextCatSlug,
                            category_id: nextCatId || "",
                          };
                        });
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                        !isDigitalAllowed ? "opacity-60 cursor-not-allowed bg-muted/40 border-border/50" :
                        form.product_type === "digital"
                          ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                          : "border-border/70 hover:border-border bg-card"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Zap className="h-5 w-5 text-amber-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                          Digital Product / Download{" "}
                          {isDigitalAllowed ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Instant</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[10px]">Disabled by Admin</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                          {isDigitalAllowed
                            ? "E-books, templates, online courses, software bots, graphic packs & instant downloadable files."
                            : "Digital uploads are temporarily disabled by the platform administrator."}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. PRODUCT NAME & CATEGORY */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Product Title / Name *</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={form.product_type === "digital" ? "e.g. Lagos Real Estate Sourcing Playbook PDF" : "e.g. Premium Nigerian Native Wear (3-Piece)"}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Marketplace Category *</Label>
                    <Select
                      value={form.category_slug}
                      onValueChange={(val) => {
                        const safeCat = resolveSafeProductCategoryUuid(val, dbCategories || []);
                        setForm((f) => ({ ...f, category_slug: val, category_id: safeCat || "" }));
                      }}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug} className="text-xs font-semibold py-2">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 3. AI-POWERED PRODUCT DESCRIPTION */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>Commercial Product Description *</span>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">SEO Optimized</Badge>
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateAIDescription}
                      disabled={generatingAI}
                      className="h-8 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 gap-1.5"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Copy…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> Auto-Generate with AI
                        </>
                      )}
                    </Button>
                  </div>

                  <Textarea
                    required
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Enter your product description, bullet points, package inclusions, and benefits here. Or enter a few rough notes and click 'Auto-Generate with AI'!"
                    className="rounded-2xl text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                {/* 4. PRICING, STOCK, & CONDITION */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Selling Price (₦ Naira) *</Label>
                    <Input
                      type="number"
                      required
                      min={0}
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 15000"
                      className="rounded-xl h-11 font-bold"
                    />
                  </div>

                  {form.product_type === "physical" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Item Condition</Label>
                        <Select
                          value={form.condition}
                          onValueChange={(val) => setForm((f) => ({ ...f, condition: val }))}
                        >
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="Condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Brand New (Original Box)</SelectItem>
                            <SelectItem value="refurbished">Refurbished / Open Box</SelectItem>
                            <SelectItem value="used">Used / Pre-Owned</SelectItem>
                            <SelectItem value="custom">Custom Made / Bespoke</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Available Quantity / Stock</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.stock}
                          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                          placeholder="e.g. 10"
                          className="rounded-xl h-11"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Delivery Method *</Label>
                      <Select
                        value={form.delivery_method}
                        onValueChange={(val) => setForm((f) => ({ ...f, delivery_method: val }))}
                      >
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select Delivery Method" />
                        </SelectTrigger>
                        <SelectContent>
                          {DELIVERY_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value} className="text-xs font-medium">
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* 5. DIGITAL DELIVERY CONFIGURATION (Only for Digital products) */}
                {form.product_type === "digital" && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-card border border-purple-500/30 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">
                        Digital Delivery &amp; Automated Buyer Access
                      </h4>
                    </div>

                    {form.delivery_method === "file" ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Upload Digital Asset File (PDF, ZIP, MP3, MP4, APK, Doc)
                        </Label>
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => uploadDigitalFile(e.target.files?.[0] || null)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              asChild
                              disabled={uploadingDigital}
                              className="rounded-xl text-xs font-bold gap-1.5"
                            >
                              <span>
                                {uploadingDigital ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5 text-primary" />}
                                Choose File to Upload
                              </span>
                            </Button>
                          </label>
                          {form.delivery_file_path && (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> File Attached ({form.delivery_file_path.split("/").pop()})
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Access URL / Private Link
                        </Label>
                        <Input
                          type="url"
                          value={form.delivery_url}
                          onChange={(e) => setForm((f) => ({ ...f, delivery_url: e.target.value }))}
                          placeholder="https://drive.google.com/drive/folders/... or course link"
                          className="rounded-xl h-11"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 6. PRODUCT IMAGES & GALLERY */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ImagePlus className="h-4 w-4 text-primary" /> Product Photos &amp; Media *
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Up to 6 high-res photos</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {gallery.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-border/80 group shadow-xs">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                          {form.cover_image === url ? (
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 font-bold">Cover</Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, cover_image: url }))}
                              className="text-[10px] text-white bg-primary px-2 py-0.5 rounded-md font-bold"
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const next = gallery.filter((_, i) => i !== idx);
                              setGallery(next);
                              if (form.cover_image === url) setForm((f) => ({ ...f, cover_image: next[0] || "" }));
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <label className="aspect-square rounded-2xl border-2 border-dashed border-border/80 hover:border-primary flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadImages(e.target.files)}
                      />
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-[11px] font-bold text-foreground">Add Photo</span>
                          <span className="text-[9px] text-muted-foreground">PNG / JPG</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* 7. VIDEO SHOWCASE URL & PREVIEW */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-primary" /> Video Demo URL (Optional)
                  </Label>
                  <Input
                    type="url"
                    value={form.video_url}
                    onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=... or TikTok / Vimeo link"
                    className="rounded-xl h-11"
                  />
                  {form.video_url && (
                    <div className="mt-2 max-w-sm">
                      <ProductVideo url={form.video_url} title={form.name} />
                    </div>
                  )}
                </div>

                {/* 8. CONTACT & LOCATION (Direct buyer connection) */}
                <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-border/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">WhatsApp Number *</Label>
                    <PhoneInput
                      value={form.whatsapp}
                      onChange={(val) => setForm((f) => ({ ...f, whatsapp: val }))}
                      placeholder="08012345678"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Phone Call Line</Label>
                    <PhoneInput
                      value={form.phone}
                      onChange={(val) => setForm((f) => ({ ...f, phone: val }))}
                      placeholder="08012345678"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Dispatch Location / State</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Ikeja, Lagos State"
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border/60">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetToNew}
                      className="w-full sm:w-auto rounded-2xl h-12 text-xs font-bold"
                    >
                      Cancel Edit
                    </Button>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto font-black text-sm rounded-2xl h-12 px-8 shadow-md gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Product…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {isEditing ? "Update Product Listing" : "Publish Product on Marketplace"}
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: INVENTORY, BOOST PROMOTION, & PRODUCT MANAGEMENT                  */}
        {/* ========================================================================= */}
        <TabsContent value="manage" className="space-y-6">
          <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
            <CardHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    My Product Inventory ({products.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    View live views, boost offers with your wallet balance, and edit details anytime.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    resetToNew();
                    setActiveTab("form");
                  }}
                  className="gap-1.5 font-bold rounded-2xl text-xs self-start sm:self-auto shadow-sm"
                >
                  <Plus className="h-4 w-4" /> List Another Product
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {loadingProducts ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-4 max-w-md mx-auto">
                  <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-foreground">No Products Listed Yet</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Start selling your physical goods or digital files across Lagos and Nigeria with instant AI assistance.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      resetToNew();
                      setActiveTab("form");
                    }}
                    className="font-bold rounded-2xl text-xs gap-1.5 shadow-md"
                  >
                    <Sparkles className="h-4 w-4" /> Create First Product
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => {
                    const isDigital = p.product_type === "digital" || p.condition === "digital";
                    return (
                      <Card key={p.id} className="rounded-3xl border-border/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col bg-card">
                        {/* Cover Image */}
                        <div className="relative aspect-16/10 w-full bg-muted overflow-hidden">
                          {p.cover_image ? (
                            <img src={p.cover_image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/80 to-purple-800 text-white font-black text-lg">
                              <Package className="h-10 w-10 opacity-70" />
                            </div>
                          )}

                          {/* Status and Type Badges */}
                          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                            <Badge className={isDigital ? "bg-purple-600 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                              {isDigital ? "Digital" : "Physical"}
                            </Badge>
                            {p.featured && (
                              <Badge className="bg-amber-500 text-white text-[10px] font-bold gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" /> Featured
                              </Badge>
                            )}
                          </div>

                          <div className="absolute top-2.5 right-2.5">
                            <Badge variant={p.active !== false ? "default" : "secondary"} className="text-[10px]">
                              {p.active !== false ? "Active" : "Draft"}
                            </Badge>
                          </div>

                          {/* Stats Pill */}
                          <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                            <Eye className="h-3 w-3 text-amber-400" /> {p.views_count || 0} views
                            {isDigital && (
                              <>
                                <span className="opacity-40">•</span>
                                <Download className="h-3 w-3 text-emerald-400" /> {p.downloads_count || 0} sales
                              </>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[11px] font-bold text-muted-foreground truncate">
                                {p.categories?.name || "General"}
                              </p>
                              <span className="text-sm font-black text-primary">
                                ₦{Number(p.price || 0).toLocaleString()}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-foreground line-clamp-2 mt-0.5">
                              {p.name}
                            </h4>
                          </div>

                          {/* Actions Grid */}
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            <div className="grid grid-cols-2 gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditProduct(p)}
                                className="rounded-xl text-xs font-bold gap-1 h-8"
                              >
                                <Pencil className="h-3.5 w-3.5 text-primary" /> Edit
                              </Button>

                              <Button
                                size="sm"
                                variant={p.featured ? "secondary" : "default"}
                                onClick={() => {
                                  setSelectedProductForBoost(p);
                                  setSelectedPackage(BOOST_PACKAGES[0]);
                                  setBoostOpen(true);
                                }}
                                className="rounded-xl text-xs font-bold gap-1 h-8"
                              >
                                <Sparkles className="h-3.5 w-3.5" /> {p.featured ? "Boost Again" : "Feature"}
                              </Button>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleActiveStatus(p)}
                                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                              >
                                {p.active !== false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                {p.active !== false ? "Hide" : "Publish"}
                              </Button>

                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    copyToClipboard(`${window.location.origin}/products/${p.slug || p.id}`);
                                    toast.success("Product link copied!");
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                  title="Copy Link"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                  title="View Public Page"
                                >
                                  <Link to={`/products/${p.slug || p.id}`} target="_blank">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setProductToDelete(p);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                                  title="Delete Product"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FEATURE / BOOST PROMOTION DIALOG */}
      <Dialog open={boostOpen} onOpenChange={setBoostOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6 bg-card">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Boost Product Visibility
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pin &ldquo;{selectedProductForBoost?.name}&rdquo; at the top of search &amp; marketplace discovery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-2">
              {BOOST_PACKAGES.map((pkg) => (
                <button
                  key={pkg.key}
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                    selectedPackage.key === pkg.key
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 hover:border-border"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-xs sm:text-sm text-foreground">{pkg.label}</p>
                    <p className="text-[11px] text-muted-foreground">{pkg.desc}</p>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-primary shrink-0 ml-2">
                    ₦{pkg.price.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-muted/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Wallet Balance:</span>
              <span className="font-black text-foreground">₦{(wallet?.balance ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setBoostOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={boosting}
              onClick={handleBoostProduct}
              className="rounded-xl text-xs font-bold gap-1.5 shadow-md"
            >
              {boosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Activate Promo (₦{selectedPackage.price.toLocaleString()})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 bg-card">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-black text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Product Listing
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Are you sure you want to permanently delete &ldquo;{productToDelete?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteProduct}
              className="rounded-xl text-xs font-bold gap-1"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
