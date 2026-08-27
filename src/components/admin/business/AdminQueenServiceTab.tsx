import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Crown, Sparkles, ShieldCheck, Megaphone, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Search, Filter,
  RefreshCw, Building2, User, Eye, Zap, Sliders, Check, Wand2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import QueenServiceConciergeModal from "./QueenServiceConciergeModal";
import {
  getQueenServiceSettings,
  saveQueenServiceSettings,
  isEarlyAccessBusiness,
  runQueenServiceAIAutomation,
  QueenServiceResult,
} from "@/lib/queenBusinessServiceAIEngine";

export default function AdminQueenServiceTab() {
  const queryClient = useQueryClient();

  // Search and Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "early_access" | "completed" | "pending">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Selected Business for Modal
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Global Config
  const [autoRunOnVerification, setAutoRunOnVerification] = useState(true);
  const [defaultFeaturedDays, setDefaultFeaturedDays] = useState(30);
  const [defaultVerificationDays, setDefaultVerificationDays] = useState(365);
  const [defaultAdPlacement, setDefaultAdPlacement] = useState("directory_top");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Batch Execution State
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Load Settings
  useEffect(() => {
    (async () => {
      const cfg = await getQueenServiceSettings();
      setAutoRunOnVerification(cfg.autoRunOnEarlyAccessVerification);
      setDefaultFeaturedDays(cfg.defaultFeaturedDays);
      setDefaultVerificationDays(cfg.defaultVerificationDays);
      setDefaultAdPlacement(cfg.defaultAdPlacement);
    })();
  }, []);

  const handleSaveGlobalConfig = async (newAutoRun: boolean) => {
    setAutoRunOnVerification(newAutoRun);
    setIsSavingSettings(true);
    try {
      await saveQueenServiceSettings({
        autoRunOnEarlyAccessVerification: newAutoRun,
        defaultFeaturedDays,
        defaultVerificationDays,
        defaultAdPlacement,
        defaultAdDays: 30,
      });
      toast.success(
        newAutoRun
          ? "Queen Service auto-setup on verification is now ENABLED!"
          : "Queen Service auto-setup on verification disabled."
      );
    } catch {
      toast.error("Failed to update Queen Service settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Fetch Businesses
  const { data: businesses = [], isLoading, refetch } = useQuery({
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

  // Fetch Owners Map
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin-business-owners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username, avatar_url, social_links");
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p;
      });
      return map;
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "business")
        .order("name");
      return data ?? [];
    },
  });

  // Fetch Active Queen Ads count
  const { data: queenAdsCount = 0 } = useQuery({
    queryKey: ["admin-queen-ads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_ads")
        .select("*", { count: "exact", head: true })
        .eq("source", "queen_auto_setup")
        .eq("status", "active");
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Metrics computation
  const totalCount = businesses.length;
  const completedQueenCount = businesses.filter(
    (b: any) => !!b.social_links?.queen_service?.completed
  ).length;
  const earlyAccessCount = businesses.filter((b: any) =>
    isEarlyAccessBusiness(b, profilesMap[b.submitted_by])
  ).length;
  const pendingQueenCount = businesses.filter(
    (b: any) => !b.social_links?.queen_service?.completed
  ).length;

  // Filtered List
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b: any) => {
      const isCompleted = !!b.social_links?.queen_service?.completed;
      const isEA = isEarlyAccessBusiness(b, profilesMap[b.submitted_by]);

      if (filterType === "completed" && !isCompleted) return false;
      if (filterType === "pending" && isCompleted) return false;
      if (filterType === "early_access" && !isEA) return false;

      if (categoryFilter !== "all" && b.category_id !== categoryFilter) return false;

      if (search.trim()) {
        const owner = profilesMap[b.submitted_by];
        const searchCorpus = [
          b.name,
          b.slug,
          b.phone,
          b.address,
          b.categories?.name,
          owner?.display_name,
          owner?.email,
          owner?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchCorpus.includes(search.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [businesses, profilesMap, search, filterType, categoryFilter]);

  const handleOpenQueenModal = (biz: any) => {
    setSelectedBiz(biz);
    setModalOpen(true);
  };

  // Quick 1-Click Execute directly from row
  const handleQuickExecute = async (biz: any) => {
    const toastId = toast.loading(`👑 Launching Queen AI Setup for ${biz.name}...`);
    try {
      await runQueenServiceAIAutomation(biz, {
        featuredDurationDays: defaultFeaturedDays,
        verificationDays: defaultVerificationDays,
        createBannerAdvert: true,
        advertPlacement: defaultAdPlacement as any,
        advertDurationDays: 30,
        generateServicesCatalog: true,
        sendOwnerNotification: true,
      });

      toast.success(`👑 Queen AI Setup completed for ${biz.name}!`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-queen-ads-count"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to execute Queen setup", { id: toastId });
    }
  };

  // Batch setup all pending Early Access businesses
  const handleBatchSetup = async () => {
    const targets = businesses.filter(
      (b: any) => !b.social_links?.queen_service?.completed
    );

    if (targets.length === 0) {
      toast.info("All eligible businesses have already completed Queen Service setup!");
      return;
    }

    const confirmRun = window.confirm(
      `Are you sure you want to run the Queen Service Full AI Setup for ${targets.length} businesses? This will automatically enhance profiles, verify Blue Tick, feature listings, and launch banner adverts.`
    );
    if (!confirmRun) return;

    setIsBatchRunning(true);
    setBatchProgress(0);
    let done = 0;

    for (const biz of targets) {
      try {
        await runQueenServiceAIAutomation(biz, {
          featuredDurationDays: defaultFeaturedDays,
          verificationDays: defaultVerificationDays,
          createBannerAdvert: true,
          advertPlacement: defaultAdPlacement as any,
          advertDurationDays: 30,
          generateServicesCatalog: true,
          sendOwnerNotification: true,
        });
      } catch (err) {
        console.warn(`Failed Queen setup for ${biz.name}`, err);
      }
      done++;
      setBatchProgress(Math.round((done / targets.length) * 100));
    }

    setIsBatchRunning(false);
    toast.success(`Batch Queen Service completed for ${done} businesses!`);
    queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    queryClient.invalidateQueries({ queryKey: ["admin-queen-ads-count"] });
  };

  return (
    <div className="space-y-6">
      {/* Royal Hero Banner */}
      <Card className="border-amber-500/30 overflow-hidden bg-gradient-to-br from-amber-500/10 via-background to-purple-500/10 shadow-sm">
        <CardContent className="p-6 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white border-none font-bold text-xs px-2.5 py-0.5 flex items-center gap-1 shadow-xs">
                  <Crown className="w-3.5 h-3.5 fill-yellow-200" />
                  QUEEN VIP CONCIERGE ENGINE
                </Badge>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  1-Click Business Takeover
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                Queen Service AI Auto-Setup Suite
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Take complete admin control of user business setups with one click. The Queen AI Agent synthesizes high-converting brand copy, generates a 3-5 service catalog, grants official Blue-Tick verification, unlocks top featured ranking, and publishes a live banner advert campaign.
              </p>
            </div>

            {/* Quick Automation Setting Card */}
            <div className="w-full lg:w-auto p-4 rounded-xl border bg-card/90 backdrop-blur-xs space-y-3 min-w-[280px]">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Auto-Run on Verification
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    For Early Access merchants
                  </p>
                </div>
                <Switch
                  checked={autoRunOnVerification}
                  onCheckedChange={handleSaveGlobalConfig}
                  disabled={isSavingSettings}
                />
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Featured: <strong className="text-foreground">{defaultFeaturedDays}d</strong></span>
                <span>•</span>
                <span>Verified: <strong className="text-foreground">{defaultVerificationDays}d</strong></span>
                <span>•</span>
                <span>Ad: <strong className="text-foreground">{defaultAdPlacement}</strong></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Listings</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{totalCount}</div>
          <span className="text-[11px] text-muted-foreground">in business directory</span>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Queen Setups</span>
            <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {completedQueenCount}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {totalCount > 0 ? `${Math.round((completedQueenCount / totalCount) * 100)}% coverage` : "0%"}
          </span>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Early Access</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {earlyAccessCount}
          </div>
          <span className="text-[11px] text-muted-foreground">priority users</span>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Queen Banner Ads</span>
            <Megaphone className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {queenAdsCount}
          </div>
          <span className="text-[11px] text-muted-foreground">live in ad server</span>
        </Card>
      </div>

      {/* Batch Setup Progress Bar if active */}
      {isBatchRunning && (
        <Card className="p-4 border-amber-500/50 bg-amber-500/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-200">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              Running Batch Queen Service Setup across pending businesses...
            </span>
            <span>{batchProgress}%</span>
          </div>
          <Progress value={batchProgress} className="h-2 bg-amber-200 dark:bg-amber-950" />
        </Card>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search business, owner, phone, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses ({totalCount})</SelectItem>
              <SelectItem value="early_access">Early Access ({earlyAccessCount})</SelectItem>
              <SelectItem value="completed">Queen Done ({completedQueenCount})</SelectItem>
              <SelectItem value="pending">Pending Setup ({pendingQueenCount})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleBatchSetup}
            disabled={isBatchRunning}
            className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white font-bold text-xs h-9 gap-1.5 shadow-xs"
          >
            <Crown className="w-3.5 h-3.5 fill-yellow-200" />
            Batch Setup Early Access
          </Button>
        </div>
      </div>

      {/* Businesses Grid / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold">Loading business directory records...</p>
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No businesses found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or filter settings above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBusinesses.map((biz: any) => {
            const owner = profilesMap[biz.submitted_by];
            const isCompleted = !!biz.social_links?.queen_service?.completed;
            const isEA = isEarlyAccessBusiness(biz, owner);
            const isVerified = !!biz.social_links?.verified;
            const isFeatured = !!biz.featured;
            const servicesCount = Array.isArray(biz.services) ? biz.services.length : 0;

            return (
              <Card
                key={biz.id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-md border ${
                  isCompleted
                    ? "border-amber-500/40 bg-gradient-to-b from-card to-amber-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top Badges & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCompleted ? (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.2 flex items-center gap-1 border-none shadow-xs">
                          <Crown className="w-3 h-3 fill-yellow-200" />
                          QUEEN SETUP COMPLETED
                        </Badge>
                      ) : isEA ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                          ✨ Early Access Eligible
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          Standard Listing
                        </Badge>
                      )}

                      {isVerified && (
                        <Badge variant="outline" className="border-sky-500/40 text-sky-600 dark:text-sky-400 text-[10px] font-bold flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          Blue Tick
                        </Badge>
                      )}

                      {isFeatured && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Business Title & Details */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm leading-tight flex items-center justify-between gap-2">
                      <span className="truncate">{biz.name}</span>
                      <Link
                        to={`/businesses/${biz.slug}`}
                        target="_blank"
                        className="text-muted-foreground hover:text-primary shrink-0"
                        title="View Public Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </h4>

                    <p className="text-xs text-muted-foreground">
                      Category: <span className="font-semibold text-foreground">{biz.categories?.name || "General"}</span>
                      {biz.phone && ` • ${biz.phone}`}
                    </p>

                    {owner && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Owner: {owner.display_name || owner.username || owner.email}
                      </p>
                    )}
                  </div>

                  {/* Tagline or Bio Snippet */}
                  <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded-lg border border-border/50">
                    {biz.social_links?.tagline || biz.description || "No bio yet — ready for Queen AI setup."}
                  </p>

                  {/* Feature Status Indicators */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
                    <div className="p-1.5 rounded-md bg-muted/40 border">
                      <span className="text-muted-foreground block">Services</span>
                      <strong className="text-foreground text-xs">{servicesCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-md bg-muted/40 border">
                      <span className="text-muted-foreground block">Featured</span>
                      <strong className={isFeatured ? "text-amber-600" : "text-muted-foreground"}>
                        {isFeatured ? "Active" : "None"}
                      </strong>
                    </div>
                    <div className="p-1.5 rounded-md bg-muted/40 border">
                      <span className="text-muted-foreground block">Verified</span>
                      <strong className={isVerified ? "text-sky-600" : "text-muted-foreground"}>
                        {isVerified ? "Yes" : "No"}
                      </strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenQueenModal(biz)}
                      className="text-xs h-8 flex-1 font-semibold"
                    >
                      <Sliders className="w-3.5 h-3.5 mr-1" />
                      Configure
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleQuickExecute(biz)}
                      className={`text-xs h-8 flex-1 font-bold gap-1 shadow-xs ${
                        isCompleted
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          : "bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white"
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 fill-current" />
                      {isCompleted ? "Re-Run Setup" : "1-Click Setup"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interactive Queen Service Modal */}
      {selectedBiz && (
        <QueenServiceConciergeModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          business={selectedBiz}
          ownerProfile={profilesMap[selectedBiz.submitted_by]}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
            queryClient.invalidateQueries({ queryKey: ["admin-queen-ads-count"] });
          }}
        />
      )}
    </div>
  );
}
