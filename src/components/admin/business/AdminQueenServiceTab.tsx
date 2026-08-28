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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Crown, Sparkles, ShieldCheck, Megaphone, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Search, Filter,
  RefreshCw, Building2, User, Eye, Zap, Sliders, Check, Wand2,
  Tag, MessageSquare, ArrowRight, AlertTriangle
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
import {
  auditAllBusinessesCategories,
  batchApplyCategoryCorrections,
  BusinessCategoryAuditReport,
  BusinessCategoryAuditItem,
} from "@/lib/businessCategoryClassifier";

export default function AdminQueenServiceTab() {
  const queryClient = useQueryClient();

  // Search and Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "early_access" | "completed" | "pending" | "category_mismatch">("all");
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

  // Category Audit State
  const [isAuditingCategories, setIsAuditingCategories] = useState(false);
  const [auditReport, setAuditReport] = useState<BusinessCategoryAuditReport | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [isApplyingCategoryFixes, setIsApplyingCategoryFixes] = useState(false);

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
        .select("id, email, username, display_name, phone, role, verified, social_links");
      const map: Record<string, any> = {};
      data?.forEach((p) => {
        map[p.id] = p;
      });
      return map;
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("type", "business");
      return data ?? [];
    },
  });

  // Count Queen Banner Ads
  const { data: queenAdsCount = 0 } = useQuery({
    queryKey: ["admin-queen-ads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ad_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b: any) => {
      // Search
      const owner = profilesMap[b.submitted_by];
      const matchSearch =
        !search ||
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.categories?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.toLowerCase().includes(search.toLowerCase()) ||
        owner?.email?.toLowerCase().includes(search.toLowerCase()) ||
        owner?.username?.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      // Category
      if (categoryFilter !== "all" && b.category_id !== categoryFilter) {
        return false;
      }

      // Filter Type
      const isCompleted = !!b.social_links?.queen_service?.completed;
      const isEA = isEarlyAccessBusiness(b, owner);

      if (filterType === "early_access") {
        return isEA;
      }
      if (filterType === "completed") {
        return isCompleted;
      }
      if (filterType === "pending") {
        return !isCompleted;
      }
      if (filterType === "category_mismatch") {
        const auditStatus = b.social_links?.category_classification?.status;
        return auditStatus === "auto_corrected" || auditStatus === "flagged_for_review";
      }

      return true;
    });
  }, [businesses, profilesMap, search, categoryFilter, filterType]);

  // Overall Statistics
  const totalCount = businesses.length;
  const earlyAccessCount = useMemo(() => {
    return businesses.filter((b: any) => isEarlyAccessBusiness(b, profilesMap[b.submitted_by])).length;
  }, [businesses, profilesMap]);

  const completedQueenCount = useMemo(() => {
    return businesses.filter((b: any) => !!b.social_links?.queen_service?.completed).length;
  }, [businesses]);

  const pendingQueenCount = totalCount - completedQueenCount;

  // Run Category Audit
  const handleRunCategoryAudit = async () => {
    setIsAuditingCategories(true);
    toast.info("Scanning all business listings with AI Category Classifier...");
    try {
      const report = await auditAllBusinessesCategories();
      setAuditReport(report);
      setAuditModalOpen(true);
      if (report.incorrectCount > 0 || report.possiblyIncorrectCount > 0) {
        toast.warning(
          `Audit complete: ${report.incorrectCount + report.possiblyIncorrectCount} potential category mismatches found.`
        );
      } else {
        toast.success("Audit complete: All business listings are correctly categorized!");
      }
    } catch (err: any) {
      toast.error(`Category audit failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsAuditingCategories(false);
    }
  };

  // Apply Category Corrections in Batch
  const handleApplyAllCategoryFixes = async () => {
    if (!auditReport) return;
    const mismatches = auditReport.items.filter(
      (item) => item.status === "incorrect" || item.status === "possibly_incorrect"
    );

    if (mismatches.length === 0) {
      toast.info("No category corrections needed.");
      return;
    }

    setIsApplyingCategoryFixes(true);
    try {
      const corrections = mismatches.map((m) => ({
        businessId: m.businessId,
        newCategoryId: m.aiSuggestedCategoryId!,
        newCategoryName: m.aiSuggestedCategoryName,
      }));

      const res = await batchApplyCategoryCorrections(corrections);
      toast.success(`Successfully updated ${res.successCount} business categories!`);
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      setAuditModalOpen(false);
    } catch (err: any) {
      toast.error(`Failed to apply fixes: ${err?.message}`);
    } finally {
      setIsApplyingCategoryFixes(false);
    }
  };

  // Trigger Modal for single business
  const handleOpenQueenModal = (business: any) => {
    setSelectedBiz(business);
    setModalOpen(true);
  };

  // Quick 1-Click Execution for Single Business
  const handleQuickExecute = async (business: any) => {
    const owner = profilesMap[business.submitted_by];
    const toastId = toast.loading(`Running Queen AI Service for ${business.name}...`);
    try {
      const result = await runQueenServiceAIAutomation({
        business,
        ownerProfile: owner,
        featuredDays: defaultFeaturedDays,
        verificationDays: defaultVerificationDays,
        createBannerAd: true,
        adPlacement: defaultAdPlacement as any,
        adDays: 30,
        generateServices: true,
        sendNotification: true,
      });

      if (result.success) {
        toast.success(`Queen AI Setup completed for ${business.name}!`, { id: toastId });
        queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
        queryClient.invalidateQueries({ queryKey: ["admin-queen-ads-count"] });
      } else {
        toast.error(`Queen setup finished with errors for ${business.name}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Queen setup failed: ${err?.message || "Unknown error"}`, { id: toastId });
    }
  };

  // Batch Execution across all Early Access pending businesses
  const handleBatchSetup = async () => {
    const targets = businesses.filter((b: any) => {
      const owner = profilesMap[b.submitted_by];
      const isCompleted = !!b.social_links?.queen_service?.completed;
      return !isCompleted && isEarlyAccessBusiness(b, owner);
    });

    if (targets.length === 0) {
      toast.info("No pending Early Access businesses to process.");
      return;
    }

    if (!confirm(`Run 1-Click Queen AI Setup on all ${targets.length} pending Early Access businesses?`)) {
      return;
    }

    setIsBatchRunning(true);
    setBatchProgress(0);

    let processed = 0;
    for (const biz of targets) {
      try {
        await runQueenServiceAIAutomation({
          business: biz,
          ownerProfile: profilesMap[biz.submitted_by],
          featuredDays: defaultFeaturedDays,
          verificationDays: defaultVerificationDays,
          createBannerAd: true,
          adPlacement: defaultAdPlacement as any,
          adDays: 30,
          generateServices: true,
          sendNotification: true,
        });
      } catch (err) {
        console.error("Batch error for biz:", biz.id, err);
      }
      processed++;
      setBatchProgress(Math.round((processed / targets.length) * 100));
    }

    setIsBatchRunning(false);
    toast.success(`Batch Queen Service completed for ${processed} businesses!`);
    queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    queryClient.invalidateQueries({ queryKey: ["admin-queen-ads-count"] });
  };

  return (
    <div className="space-y-6">
      {/* Queen Service Header & AI Concierge Banner */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-purple-500/10 shadow-sm overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-xs">
                  <Crown className="w-4 h-4 fill-white" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Bethelincovibe TV Queen AI Concierge
                </CardTitle>
                <Badge className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold text-[10px] px-2 shadow-xs border-none">
                  VIP AUTOMATION ENGINE
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                1-Click full-stack setup pipeline: intelligent category classification, Maya Sterling tailored branding, commercial services & physical products segregation, high-converting banner ads, Blue-Tick verification, and VIP spotlight placement.
              </CardDescription>
            </div>

            {/* Global Automation Switch */}
            <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-amber-500/20 shadow-xs shrink-0">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground cursor-pointer">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Auto Queen Setup on Early Access
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Executes 100% full setup when an EA business is verified
                </p>
              </div>
              <Switch
                checked={autoRunOnVerification}
                onCheckedChange={handleSaveGlobalConfig}
                disabled={isSavingSettings}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Listings</span>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{totalCount}</div>
          <span className="text-[11px] text-muted-foreground">in database</span>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Queen Configured</span>
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
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses ({totalCount})</SelectItem>
              <SelectItem value="early_access">Early Access ({earlyAccessCount})</SelectItem>
              <SelectItem value="completed">Queen Done ({completedQueenCount})</SelectItem>
              <SelectItem value="pending">Pending Setup ({pendingQueenCount})</SelectItem>
              <SelectItem value="category_mismatch">Category Mismatch</SelectItem>
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCategoryAudit}
            disabled={isAuditingCategories}
            className="text-xs h-9 gap-1.5 font-bold border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
          >
            {isAuditingCategories ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                AI Audit Categories
              </>
            )}
          </Button>

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
            const theme = biz.social_links?.queen_service?.theme || "royal_gold";
            const categoryAudit = biz.social_links?.category_classification;
            const whatsAppUrl = biz.social_links?.queen_service?.whatsAppUrl;

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
                  <div className="flex items-center justify-between gap-2 flex-wrap">
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

                    {isCompleted && (
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                        {theme.replace("_", " ")}
                      </Badge>
                    )}
                  </div>

                  {/* Business Title & Details */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm leading-tight flex items-center justify-between gap-2">
                      <span className="truncate">{biz.name}</span>
                      <div className="flex items-center gap-1">
                        {whatsAppUrl && (
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-500/10"
                            title="Direct WhatsApp Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          to={`/businesses/${biz.slug}`}
                          target="_blank"
                          className="text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-muted"
                          title="View Public Profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </h4>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Category: <strong className="text-foreground">{biz.categories?.name || "General"}</strong></span>
                      {categoryAudit && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> AI Verified
                        </span>
                      )}
                      {biz.phone && <span>• {biz.phone}</span>}
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

      {/* AI Category Audit Report Dialog */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Tag className="w-5 h-5 text-indigo-500" />
              AI Intelligent Business Category Audit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scanned all registered businesses using rule-based classification heuristics and AI semantics to ensure every vendor is placed in their optimal category.
            </DialogDescription>
          </DialogHeader>

          {auditReport && (
            <div className="space-y-4 py-2">
              {/* Stats Banner */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 border text-center">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Correct</span>
                  <strong className="text-emerald-600 text-base">{auditReport.correctCount}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Possible Mismatch</span>
                  <strong className="text-amber-600 text-base">{auditReport.possiblyIncorrectCount}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Definite Mismatch</span>
                  <strong className="text-rose-600 text-base">{auditReport.incorrectCount}</strong>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {auditReport.items
                  .filter((i) => i.status !== "correct")
                  .map((item) => (
                    <div
                      key={item.businessId}
                      className="p-3 rounded-xl border bg-card text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{item.businessName}</span>
                        <Badge
                          variant={item.status === "incorrect" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.status === "incorrect" ? "Mismatch" : "Review"} ({item.confidence}%)
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="line-through text-muted-foreground">{item.currentCategoryName}</span>
                        <ArrowRight className="w-3 h-3 text-indigo-500" />
                        <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {item.aiSuggestedCategoryName}
                        </strong>
                      </div>

                      <p className="text-[11px] text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}

                {auditReport.incorrectCount === 0 && auditReport.possiblyIncorrectCount === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-foreground">All business categories are 100% verified!</p>
                    <p className="text-[11px]">No classification mismatches were detected across your directory listings.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setAuditModalOpen(false)}>
              Close
            </Button>

            {auditReport && (auditReport.incorrectCount > 0 || auditReport.possiblyIncorrectCount > 0) && (
              <Button
                size="sm"
                onClick={handleApplyAllCategoryFixes}
                disabled={isApplyingCategoryFixes}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
              >
                {isApplyingCategoryFixes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Applying Fixes...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Apply All AI Category Fixes
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
