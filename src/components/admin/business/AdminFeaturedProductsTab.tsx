import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getProductCategoryInfo } from "@/lib/productAIEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, Sparkles, Plus, Pencil, Trash2, Search, Check, X,
  Clock, DollarSign, RefreshCw, ExternalLink, ShoppingBag, Eye, Star
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export interface ProductBoostPackageConfig {
  key: string;
  label: string;
  days: number;
  price: number;
  desc: string;
}

export const DEFAULT_PRODUCT_BOOST_PACKAGES: ProductBoostPackageConfig[] = [
  { key: "7d", days: 7, label: "7 Days Spotlight", price: 1500, desc: "Featured at the top of Marketplace search & category feeds for 1 week." },
  { key: "14d", days: 14, label: "14 Days High Visibility", price: 2800, desc: "Double exposure on Homepage & Marketplace showcase for 2 weeks." },
  { key: "30d", days: 30, label: "30 Days Top Marketplace", price: 5000, desc: "Maximum visibility with Golden Featured badge for a full month." },
];

export default function AdminFeaturedProductsTab() {
  const queryClient = useQueryClient();

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "standard">("all");

  // Packages State
  const [packages, setPackages] = useState<ProductBoostPackageConfig[]>(DEFAULT_PRODUCT_BOOST_PACKAGES);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesSaving, setPackagesSaving] = useState(false);
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkgIndex, setEditingPkgIndex] = useState<number | null>(null);
  const [pkgForm, setPkgForm] = useState<ProductBoostPackageConfig>({
    key: "",
    label: "",
    days: 7,
    price: 1500,
    desc: "",
  });

  // Fetch Products
  const { data: products = [], isLoading: productsLoading, refetch } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directory_products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Sellers Map
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin-product-sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username, avatar_url");
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p;
      });
      return map;
    },
  });

  // Load configured packages from site_settings
  useEffect(() => {
    (async () => {
      setPackagesLoading(true);
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "product_boost_packages")
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPackages(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load product boost packages", err);
      } finally {
        setPackagesLoading(false);
      }
    })();
  }, []);

  // Save packages
  const savePackages = async (updatedPkgs: ProductBoostPackageConfig[]) => {
    setPackagesSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "product_boost_packages",
          value: JSON.stringify(updatedPkgs),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
      setPackages(updatedPkgs);
      toast.success("Product boost packages saved live!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save packages");
    } finally {
      setPackagesSaving(false);
    }
  };

  // Toggle Featured Mutation
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ productId, featured }: { productId: string; featured: boolean }) => {
      const { error } = await supabase
        .from("directory_products")
        .update({ featured })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(
        variables.featured
          ? "Product marked as Featured Spotlight!"
          : "Featured spotlight removed from product."
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filtered List
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (filter === "featured" && !p.featured) return false;
      if (filter === "standard" && p.featured) return false;

      if (search.trim()) {
        const seller = profilesMap[p.user_id];
        const text = [
          p.name,
          p.slug,
          p.description,
          p.categories?.name,
          seller?.display_name,
          seller?.email,
          seller?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [products, profilesMap, search, filter]);

  // Metrics
  const featuredCount = products.filter((p: any) => !!p.featured).length;

  const openAddPkg = () => {
    setEditingPkgIndex(null);
    setPkgForm({
      key: `pkg_${Date.now()}`,
      label: "",
      days: 7,
      price: 1500,
      desc: "",
    });
    setPkgModalOpen(true);
  };

  const openEditPkg = (index: number) => {
    setEditingPkgIndex(index);
    setPkgForm({ ...packages[index] });
    setPkgModalOpen(true);
  };

  const handleSavePkgForm = () => {
    if (!pkgForm.label.trim()) {
      toast.error("Package name is required");
      return;
    }
    const next = [...packages];
    if (editingPkgIndex !== null) {
      next[editingPkgIndex] = pkgForm;
    } else {
      next.push(pkgForm);
    }
    savePackages(next);
    setPkgModalOpen(false);
  };

  const handleDeletePkg = (index: number) => {
    if (packages.length <= 1) {
      toast.error("You must maintain at least one product boost package.");
      return;
    }
    if (confirm(`Delete package "${packages[index].label}"?`)) {
      const next = packages.filter((_, i) => i !== index);
      savePackages(next);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Featured Products</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{featuredCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Top marketplace spotlight</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Products</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{products.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Live marketplace listings</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Boost Packages</span>
            <Star className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{packages.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configured product tiers</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Sales Logged</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {products.reduce((acc: number, p: any) => acc + (p.sales_count || 0), 0)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Merchant product orders</p>
        </Card>
      </div>

      {/* Product Boost Pricing Packages */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Marketplace Product Promotion Pricing
            </CardTitle>
            <CardDescription className="text-xs">
              Configure packages (pricing in ₦, duration in days, and descriptions) shown when sellers boost products in Seller Hub.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={openAddPkg}
            className="rounded-xl font-bold text-xs gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" /> Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.key || idx}
                className="p-3.5 rounded-2xl border bg-muted/20 relative space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground truncate">{pkg.label}</h4>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      ₦{Number(pkg.price).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {pkg.desc || "Top priority marketplace spotlight."}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-amber-500" />
                    {pkg.days} Days Duration
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditPkg(idx)}
                    className="h-7 px-2 text-xs font-bold rounded-lg"
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePkg(idx)}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Featured Products Table */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Marketplace Products &amp; Promotions ({filteredProducts.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect marketplace products, toggle featured spotlight, and review seller listings.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8 rounded-xl shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product by title, seller, category..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "featured", "standard"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                  className="capitalize text-xs h-8 rounded-xl"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {productsLoading ? (
            <p className="text-center text-xs text-muted-foreground py-8">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No products found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No products match your search query or filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredProducts.map((p: any) => {
                const seller = profilesMap[p.user_id];
                return (
                  <div
                    key={p.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-muted border overflow-hidden flex items-center justify-center shrink-0">
                        {p.cover_image ? (
                          <img src={p.cover_image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                          {p.featured && (
                            <Badge className="bg-amber-500 text-white font-bold text-[10px] gap-1 px-1.5 py-0">
                              <Sparkles className="h-3 w-3" /> Featured Spotlight
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground capitalize">
                            {p.product_type || "digital"}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground">
                          Seller:{" "}
                          <strong className="text-foreground/90">
                            {seller?.display_name || seller?.username || seller?.email || "Unknown"}
                          </strong>{" "}
                          · Category: {getProductCategoryInfo(p).name}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="font-bold text-primary">
                            ₦{Number(p.price || 0).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>Sales: <strong>{p.sales_count || 0}</strong></span>
                          <span>•</span>
                          <span>Views: <strong>{p.views_count || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 px-2.5 text-xs font-bold rounded-xl"
                      >
                        <Link to={`/products/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> View Product
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          toggleFeatureMutation.mutate({
                            productId: p.id,
                            featured: !p.featured,
                          })
                        }
                        className={`h-8 px-2.5 text-xs font-bold rounded-xl gap-1 ${
                          p.featured
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "bg-amber-600 hover:bg-amber-700 text-white"
                        }`}
                        disabled={toggleFeatureMutation.isPending}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {p.featured ? "Unfeature" : "Feature Spotlight"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Package Modal */}
      <Dialog open={pkgModalOpen} onOpenChange={setPkgModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingPkgIndex !== null ? "Edit Product Boost Package" : "Create Product Boost Package"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure package name, duration in days, and price in ₦.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Package Name</Label>
              <Input
                value={pkgForm.label}
                onChange={(e) => setPkgForm({ ...pkgForm, label: e.target.value })}
                placeholder="e.g. 7 Days Spotlight"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Duration (Days)</Label>
                <Input
                  type="number"
                  value={pkgForm.days}
                  onChange={(e) => setPkgForm({ ...pkgForm, days: Number(e.target.value) })}
                  className="text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Price (₦)</Label>
                <Input
                  type="number"
                  value={pkgForm.price}
                  onChange={(e) => setPkgForm({ ...pkgForm, price: Number(e.target.value) })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Description</Label>
              <Textarea
                rows={2}
                value={pkgForm.desc}
                onChange={(e) => setPkgForm({ ...pkgForm, desc: e.target.value })}
                placeholder="e.g. Featured at top of marketplace category search."
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPkgModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePkgForm}
                disabled={packagesSaving}
                className="font-bold text-xs rounded-xl"
              >
                Save Package
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
