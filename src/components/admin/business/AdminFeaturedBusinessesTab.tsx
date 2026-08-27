import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Plus, Pencil, Trash2, Search, Check, X,
  Clock, DollarSign, Building2, Zap, RefreshCw, ExternalLink, Flame
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export interface BoostPackageConfig {
  key: string;
  label: string;
  days: number;
  price: number;
  desc: string;
}

const DEFAULT_BOOST_PACKAGES_CONFIG: BoostPackageConfig[] = [
  { key: "3d", label: "3 Days Boost", days: 3, price: 1500, desc: "Quick visibility boost on directory top." },
  { key: "7d", label: "7 Days Spotlight", days: 7, price: 3000, desc: "Featured at top of category and home directory." },
  { key: "14d", label: "14 Days High Visibility", days: 14, price: 5500, desc: "Double exposure across all listings." },
  { key: "30d", label: "30 Days Top Placement", days: 30, price: 10000, desc: "Maximum priority visibility for a full month." },
];

export default function AdminFeaturedBusinessesTab() {
  const queryClient = useQueryClient();

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");

  // Manual Feature Modal
  const [manualFeatureOpen, setManualFeatureOpen] = useState(false);
  const [selectedBizId, setSelectedBizId] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);

  // Extend Modal
  const [extendBiz, setExtendBiz] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(7);

  // Boost Packages Configuration State
  const [packages, setPackages] = useState<BoostPackageConfig[]>(DEFAULT_BOOST_PACKAGES_CONFIG);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesSaving, setPackagesSaving] = useState(false);
  const [editPkgModalOpen, setEditPkgModalOpen] = useState(false);
  const [editingPkgIndex, setEditingPkgIndex] = useState<number | null>(null);
  const [pkgForm, setPkgForm] = useState<BoostPackageConfig>({
    key: "",
    label: "",
    days: 7,
    price: 3000,
    desc: "",
  });

  // Fetch Businesses
  const { data: businesses = [], isLoading: bizLoading, refetch } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Boosts History
  const { data: boosts = [], isLoading: boostsLoading } = useQuery({
    queryKey: ["admin-business-boosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_boosts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  // Fetch Owners Map
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin-business-owners"],
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
          .eq("key", "boost_packages")
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPackages(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load boost packages", err);
      } finally {
        setPackagesLoading(false);
      }
    })();
  }, []);

  // Save packages to site_settings
  const savePackages = async (updatedPkgs: BoostPackageConfig[]) => {
    setPackagesSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "boost_packages",
          value: JSON.stringify(updatedPkgs),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
      setPackages(updatedPkgs);
      toast.success("Business boost packages saved live!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save packages");
    } finally {
      setPackagesSaving(false);
    }
  };

  // Feature / Unfeature Mutation
  const updateBoostMutation = useMutation({
    mutationFn: async ({
      bizId,
      featured,
      days,
    }: {
      bizId: string;
      featured: boolean;
      days?: number;
    }) => {
      const targetBiz = businesses.find((b: any) => b.id === bizId);
      if (!targetBiz) throw new Error("Business not found");

      const now = new Date();
      const baseTime =
        featured && targetBiz.boosted_until && new Date(targetBiz.boosted_until) > now
          ? new Date(targetBiz.boosted_until).getTime()
          : now.getTime();

      const endsAt = featured && days ? new Date(baseTime + days * 86400000).toISOString() : null;

      const { error } = await supabase
        .from("suppliers")
        .update({
          featured,
          boosted_until: endsAt,
        })
        .eq("id", bizId);
      if (error) throw error;

      if (featured) {
        await supabase.from("business_boosts").insert({
          business_id: bizId,
          user_id: targetBiz.submitted_by || "admin",
          package_key: `admin_${days}d`,
          duration_days: days || 7,
          amount: 0,
          starts_at: now.toISOString(),
          ends_at: endsAt,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-business-boosts"] });
      toast.success(
        variables.featured
          ? `Business featured successfully!`
          : "Featured promotion ended."
      );
      setManualFeatureOpen(false);
      setExtendBiz(null);
      setSelectedBizId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filtered List
  const featuredBusinesses = useMemo(() => {
    return businesses.filter((b: any) => {
      const isCurrentlyBoosted =
        !!b.featured || (!!b.boosted_until && new Date(b.boosted_until) > new Date());
      const isPastBoosted = !!b.boosted_until && new Date(b.boosted_until) <= new Date() && !b.featured;

      if (statusFilter === "active" && !isCurrentlyBoosted) return false;
      if (statusFilter === "expired" && !isPastBoosted) return false;
      if (statusFilter === "all" && !isCurrentlyBoosted && !isPastBoosted) return false;

      if (search.trim()) {
        const owner = profilesMap[b.submitted_by];
        const text = [
          b.name,
          b.slug,
          b.phone,
          owner?.display_name,
          owner?.email,
          owner?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [businesses, profilesMap, search, statusFilter]);

  // High level metrics
  const activeBoostedCount = businesses.filter((b: any) => {
    return !!b.featured || (!!b.boosted_until && new Date(b.boosted_until) > new Date());
  }).length;

  const totalBoostRevenue = boosts.reduce((acc: number, item: any) => {
    return acc + Number(item.amount || 0);
  }, 0);

  const openAddPkg = () => {
    setEditingPkgIndex(null);
    setPkgForm({
      key: `pkg_${Date.now()}`,
      label: "",
      days: 7,
      price: 3000,
      desc: "",
    });
    setEditPkgModalOpen(true);
  };

  const openEditPkg = (index: number) => {
    setEditingPkgIndex(index);
    setPkgForm({ ...packages[index] });
    setEditPkgModalOpen(true);
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
    setEditPkgModalOpen(false);
  };

  const handleDeletePkg = (index: number) => {
    if (packages.length <= 1) {
      toast.error("You must maintain at least one boost package.");
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
            <span className="text-xs font-semibold text-muted-foreground">Active Featured</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{activeBoostedCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Top directory spotlight</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Boost Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₦{totalBoostRevenue.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Paid promotion packages</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Packages</span>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{packages.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configured boost tiers</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Promotions Run</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{boosts.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Lifetime promotion records</p>
        </Card>
      </div>

      {/* Boost Pricing Packages Configuration */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Featured Business Pricing &amp; Durations
            </CardTitle>
            <CardDescription className="text-xs">
              Configure boost packages (pricing in ₦, duration in days, and descriptions) shown on the user Boost page.
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    {pkg.desc || "Top priority directory spotlight."}
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

      {/* Featured Businesses Management List */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Featured Business Promotions ({featuredBusinesses.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Monitor businesses currently promoted in directory spotlight, extend durations, or feature any business.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBizId("");
                  setManualFeatureOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl h-8 gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" /> Feature Business
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="h-8 w-8 rounded-xl"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search featured business by name, phone, owner..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "active", "expired"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={statusFilter === f ? "default" : "outline"}
                  onClick={() => setStatusFilter(f)}
                  className="capitalize text-xs h-8 rounded-xl"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {bizLoading ? (
            <p className="text-center text-xs text-muted-foreground py-8">Loading featured promotions...</p>
          ) : featuredBusinesses.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No featured business promotions found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click &ldquo;Feature Business&rdquo; to elevate any business with golden priority spotlight.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {featuredBusinesses.map((b: any) => {
                const owner = profilesMap[b.submitted_by];
                const isCurrentlyBoosted =
                  !!b.featured || (!!b.boosted_until && new Date(b.boosted_until) > new Date());
                const endsAt = b.boosted_until ? new Date(b.boosted_until) : null;

                return (
                  <div
                    key={b.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-11 w-11 rounded-xl bg-muted border overflow-hidden flex items-center justify-center p-1 shrink-0">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{b.name}</span>
                          <Badge
                            className={`text-[10px] font-bold gap-1 px-1.5 py-0 ${
                              isCurrentlyBoosted
                                ? "bg-amber-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            {isCurrentlyBoosted ? "Active Featured" : "Expired Boost"}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground">
                          Owner:{" "}
                          <strong className="text-foreground/90">
                            {owner?.display_name || owner?.username || owner?.email || "Unknown"}
                          </strong>{" "}
                          · Category: {b.categories?.name || "Commerce"}
                        </p>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          {endsAt ? (
                            <span>
                              {isCurrentlyBoosted ? "Boost active until: " : "Expired on: "}
                              <strong>{endsAt.toLocaleDateString()} {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Permanent Featured Placement
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 px-2.5 text-xs font-bold rounded-xl"
                      >
                        <Link to={`/businesses/${b.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Profile
                        </Link>
                      </Button>

                      {/* Extend Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExtendBiz(b);
                          setExtendDays(7);
                        }}
                        className="h-8 px-2.5 text-xs font-bold rounded-xl text-amber-700 dark:text-amber-300 border-amber-500/40"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Extend
                      </Button>

                      {isCurrentlyBoosted ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateBoostMutation.mutate({
                              bizId: b.id,
                              featured: false,
                            })
                          }
                          className="h-8 px-2.5 text-xs font-bold rounded-xl"
                          disabled={updateBoostMutation.isPending}
                        >
                          End Boost
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateBoostMutation.mutate({
                              bizId: b.id,
                              featured: true,
                              days: 7,
                            })
                          }
                          className="h-8 px-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                          disabled={updateBoostMutation.isPending}
                        >
                          Re-Boost (7 Days)
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Feature Business Modal */}
      <Dialog open={manualFeatureOpen} onOpenChange={setManualFeatureOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-6 w-6" />
              <DialogTitle>Feature Business in Spotlight</DialogTitle>
            </div>
            <DialogDescription>
              Assign top priority directory ranking and golden spotlight badge to any business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Business</Label>
              <Select value={selectedBizId} onValueChange={setSelectedBizId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Choose a business..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {businesses.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.categories?.name || "Commerce"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Spotlight Duration (Days)</Label>
              <Select
                value={String(selectedDays)}
                onValueChange={(v) => setSelectedDays(Number(v))}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Days Spotlight</SelectItem>
                  <SelectItem value="7">7 Days Spotlight</SelectItem>
                  <SelectItem value="14">14 Days High Visibility</SelectItem>
                  <SelectItem value="30">30 Days Maximum Placement</SelectItem>
                  <SelectItem value="90">90 Days Platinum Showcase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualFeatureOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  updateBoostMutation.mutate({
                    bizId: selectedBizId,
                    featured: true,
                    days: selectedDays,
                  })
                }
                disabled={!selectedBizId || updateBoostMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
              >
                Feature Business
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Duration Modal */}
      {extendBiz && (
        <Dialog open={!!extendBiz} onOpenChange={(v) => !v && setExtendBiz(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" /> Extend Promotion
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add additional days to &ldquo;{extendBiz.name}&rdquo;&rsquo;s active featured spotlight.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Additional Days to Add</Label>
                <Select
                  value={String(extendDays)}
                  onValueChange={(v) => setExtendDays(Number(v))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">+3 Days</SelectItem>
                    <SelectItem value="7">+7 Days</SelectItem>
                    <SelectItem value="14">+14 Days</SelectItem>
                    <SelectItem value="30">+30 Days</SelectItem>
                    <SelectItem value="60">+60 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExtendBiz(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    updateBoostMutation.mutate({
                      bizId: extendBiz.id,
                      featured: true,
                      days: extendDays,
                    })
                  }
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
                  disabled={updateBoostMutation.isPending}
                >
                  Confirm Extension
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Boost Package Modal */}
      <Dialog open={editPkgModalOpen} onOpenChange={setEditPkgModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingPkgIndex !== null ? "Edit Boost Package" : "Create Boost Package"}
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
                placeholder="e.g. Promoted at top of category and home directory."
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditPkgModalOpen(false)}
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
