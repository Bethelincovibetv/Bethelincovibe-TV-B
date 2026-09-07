import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  ShieldCheck,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileSearch,
  RefreshCw,
  ExternalLink,
  Eye,
  MessageSquare,
  Globe,
  Radio,
  Sparkles,
  Smartphone,
  ChevronRight,
  History,
  Info,
  Calendar,
  UserCheck,
  UserX,
  Phone,
  Tag,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchAdminCommunityQueue,
  fetchCommunityVerificationHistory,
  executeAdminVerificationAction,
  AdminCommunityQueueItem,
  CommunityVerificationAudit,
  VerificationAction,
} from "@/services/communityVerificationService";
import {
  COMMUNITY_TYPES,
  DEFAULT_COMMUNITY_CATEGORIES,
  CommunityType,
  VerificationStatus,
} from "@/services/communityService";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminCommunityVerification() {
  const { user, isAdmin } = useAuth();
  const [communities, setCommunities] = useState<AdminCommunityQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Selected for review detail
  const [selectedCommunity, setSelectedCommunity] = useState<AdminCommunityQueueItem | null>(null);
  const [auditHistory, setAuditHistory] = useState<CommunityVerificationAudit[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [screenshotPreviewOpen, setScreenshotPreviewOpen] = useState(false);

  // Action Dialogs
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<VerificationAction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminCommunityQueue();
      setCommunities(data);
    } catch (err: any) {
      console.error("Error loading admin community queue:", err);
      toast.error("Failed to load community verification queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommunities();
    if (selectedCommunity) {
      loadAuditHistory(selectedCommunity.id);
    }
  };

  const loadAuditHistory = async (communityId: string) => {
    try {
      setLoadingAudit(true);
      const history = await fetchCommunityVerificationHistory(communityId);
      setAuditHistory(history);
    } catch (err) {
      console.warn("Could not load audit history:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenReview = (comm: AdminCommunityQueueItem) => {
    setSelectedCommunity(comm);
    setAdminNotes("");
    setRejectionReason("");
    loadAuditHistory(comm.id);
  };

  const handleInitiateAction = (action: VerificationAction) => {
    setPendingAction(action);
    setAdminNotes("");
    setRejectionReason("");
    setActionConfirmOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedCommunity || !pendingAction) return;

    if (pendingAction === "rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a meaningful rejection reason.");
      return;
    }

    try {
      setSubmittingAction(true);

      const result = await executeAdminVerificationAction({
        communityId: selectedCommunity.id,
        action: pendingAction,
        notes: adminNotes,
        rejectionReason: pendingAction === "rejected" ? rejectionReason : undefined,
        promoterUserId: selectedCommunity.promoter?.user_id,
        communityName: selectedCommunity.name,
      });

      if (result.success) {
        toast.success(
          pendingAction === "approved"
            ? "Audience successfully verified and published!"
            : pendingAction === "rejected"
            ? "Audience submission has been rejected."
            : pendingAction === "submitted_for_review"
            ? "Audience placed under review."
            : "Audience has been suspended."
        );

        // Update in-memory state
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === selectedCommunity.id
              ? {
                  ...c,
                  verification_status: result.newStatus,
                  is_published: result.isPublished,
                  rejection_reason:
                    pendingAction === "rejected" ? rejectionReason.trim() : null,
                  verified_at:
                    pendingAction === "approved" ? new Date().toISOString() : c.verified_at,
                }
              : c
          )
        );

        // Update selected community
        setSelectedCommunity((prev) =>
          prev
            ? {
                ...prev,
                verification_status: result.newStatus,
                is_published: result.isPublished,
                rejection_reason:
                  pendingAction === "rejected" ? rejectionReason.trim() : null,
                verified_at:
                  pendingAction === "approved" ? new Date().toISOString() : prev.verified_at,
              }
            : null
        );

        // Refresh audit log
        loadAuditHistory(selectedCommunity.id);
        setActionConfirmOpen(false);
      }
    } catch (err: any) {
      console.error("Action execution error:", err);
      toast.error(err.message || "Failed to execute review action.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Status counts for badge indicators
  const counts = useMemo(() => {
    const res = {
      pending: 0,
      under_review: 0,
      verified: 0,
      rejected: 0,
      suspended: 0,
      all: communities.length,
    };
    communities.forEach((c) => {
      if (c.verification_status === "submitted") res.pending++;
      else if (c.verification_status === "under_review") res.under_review++;
      else if (c.verification_status === "verified") res.verified++;
      else if (c.verification_status === "rejected") res.rejected++;
      else if (c.verification_status === "suspended") res.suspended++;
    });
    return res;
  }, [communities]);

  // Filtered list based on active tab and query
  const filteredCommunities = useMemo(() => {
    return communities.filter((item) => {
      // Tab filter
      if (activeTab === "pending" && item.verification_status !== "submitted") return false;
      if (activeTab === "under_review" && item.verification_status !== "under_review") return false;
      if (activeTab === "verified" && item.verification_status !== "verified") return false;
      if (activeTab === "rejected" && item.verification_status !== "rejected") return false;
      if (activeTab === "suspended" && item.verification_status !== "suspended") return false;

      // Type filter
      if (selectedType !== "all" && item.community_type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== "all" && item.category_id !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesPromoter = (item.promoter?.display_name || "").toLowerCase().includes(q);
        const matchesPhone = (item.promoter?.phone_whatsapp || "").toLowerCase().includes(q);
        const matchesCategory = (item.category?.name || "").toLowerCase().includes(q);
        const matchesCountry = item.country_primary.toLowerCase().includes(q);

        if (!matchesName && !matchesPromoter && !matchesPhone && !matchesCategory && !matchesCountry) {
          return false;
        }
      }

      return true;
    });
  }, [communities, activeTab, selectedType, selectedCategory, searchQuery]);

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 animate-pulse">
            <FileSearch className="w-3.5 h-3.5 text-blue-600" /> Under Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border-zinc-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Suspended
          </Badge>
        );
      case "submitted":
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: CommunityType) => {
    const config = COMMUNITY_TYPES.find((t) => t.id === type);
    return (
      <Badge variant="secondary" className="text-xs font-medium gap-1 bg-muted/80">
        <span>{config?.icon || "💬"}</span>
        <span>{config?.shortLabel || type}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <Helmet>
        <title>Community Verification & Review | Bethelincovibe TV Admin</title>
      </Helmet>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/30">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Step 3 · Promotion Network Verification Authority</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Community Verification & Review
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Audit submitted promoter WhatsApp audiences, inspect authentic member proof screenshots, and enforce platform trust standards before publishing to the business promotion network.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Queue
            </Button>
          </div>
        </div>
      </div>

      {/* Queue Filters & Tab Navigation */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search community name, promoter, phone, or category..."
              className="pl-10 h-11 rounded-2xl bg-card border-border/70 text-sm shadow-xs"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[160px] h-11 rounded-2xl bg-card border-border/70 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="group">👥 Groups</SelectItem>
                <SelectItem value="channel">📢 Channels</SelectItem>
                <SelectItem value="status_audience">📱 Status Audiences</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] h-11 rounded-2xl bg-card border-border/70 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DEFAULT_COMMUNITY_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Navigation with counters */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1.5 rounded-2xl bg-muted/60 border border-border/60">
            <TabsTrigger
              value="pending"
              className="rounded-xl py-2.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending</span>
              {counts.pending > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  {counts.pending}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="under_review"
              className="rounded-xl py-2.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <FileSearch className="w-3.5 h-3.5 text-blue-500" />
              <span>Under Review</span>
              {counts.under_review > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {counts.under_review}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="verified"
              className="rounded-xl py-2.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified</span>
              {counts.verified > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  {counts.verified}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="rejected"
              className="rounded-xl py-2.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Rejected</span>
              {counts.rejected > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                  {counts.rejected}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="suspended"
              className="rounded-xl py-2.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
              <span>Suspended</span>
              {counts.suspended > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold">
                  {counts.suspended}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="all"
              className="rounded-xl py-2.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>All ({counts.all})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content: Grid / Cards */}
      {loading ? (
        <div className="p-12 border border-border/60 rounded-3xl bg-card flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-500/30 border-t-emerald-600 animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">
            Fetching verification audit queue...
          </p>
        </div>
      ) : filteredCommunities.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-muted/10 rounded-3xl">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl shadow-xs">
              🛡️
            </div>
            <h3 className="text-base font-bold text-foreground">No Audiences in this Queue</h3>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              No WhatsApp communities currently match the selected status or search criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map((comm) => {
            const typeConfig = COMMUNITY_TYPES.find((t) => t.id === comm.community_type);

            return (
              <Card
                key={comm.id}
                className="border-border/70 bg-card rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Accent top border */}
                <div
                  className={`h-1.5 w-full ${
                    comm.verification_status === "verified"
                      ? "bg-emerald-500"
                      : comm.verification_status === "under_review"
                      ? "bg-blue-500"
                      : comm.verification_status === "rejected"
                      ? "bg-rose-500"
                      : comm.verification_status === "suspended"
                      ? "bg-zinc-500"
                      : "bg-amber-500"
                  }`}
                />

                <CardContent className="p-5 space-y-4">
                  {/* Status & Type Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTypeBadge(comm.community_type)}
                        {comm.category && (
                          <Badge variant="outline" className="text-[10px] font-normal py-0">
                            {comm.category.name}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-foreground pt-1 leading-snug">
                        {comm.name}
                      </h3>
                    </div>

                    <div className="shrink-0">{getStatusBadge(comm.verification_status)}</div>
                  </div>

                  {/* Promoter Mini Card */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Promoter
                      </span>
                      <span className="font-bold text-foreground">
                        {comm.promoter?.display_name || comm.promoter?.name || comm.promoter?.business_name || comm.promoter?.username || comm.promoter?.email || "Promoter Partner"}
                      </span>
                    </div>
                    {comm.promoter?.phone_whatsapp && (
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {comm.promoter.phone_whatsapp}
                      </span>
                    )}
                  </div>

                  {/* Audience Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        {typeConfig?.sizeLabel || "Audience Size"}
                      </span>
                      <span className="text-base font-extrabold text-foreground font-mono">
                        {Number(comm.member_count).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Daily Views
                      </span>
                      <span className="text-base font-extrabold text-foreground font-mono">
                        {comm.active_daily_views > 0
                          ? Number(comm.active_daily_views).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Country & Submission Date */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-emerald-600" />
                      {comm.country_primary}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {new Date(comm.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Rejection Notice if applicable */}
                  {comm.verification_status === "rejected" && comm.rejection_reason && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-[11px] space-y-0.5">
                      <span className="font-semibold block">Rejection Reason:</span>
                      <p className="line-clamp-2">{comm.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 border-t border-border/40 mt-auto flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {comm.is_published ? "🟢 Published" : "⚪ Unpublished"}
                  </span>

                  <Button
                    onClick={() => handleOpenReview(comm)}
                    size="sm"
                    className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs rounded-xl"
                  >
                    <FileSearch className="w-3.5 h-3.5" /> Review Community
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED COMMUNITY REVIEW MODAL                                          */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedCommunity}
        onOpenChange={(open) => {
          if (!open) setSelectedCommunity(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6">
          {selectedCommunity && (
            <>
              {/* Header */}
              <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(selectedCommunity.community_type)}
                    {getStatusBadge(selectedCommunity.verification_status)}
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {selectedCommunity.is_published ? "🟢 Published" : "⚪ Unpublished"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {selectedCommunity.id.slice(0, 8)}...
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
                  {selectedCommunity.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submitted on {new Date(selectedCommunity.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              {/* Grid 2 Column: Info & Proof Screenshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Community & Promoter Details */}
                <div className="space-y-4">
                  {/* Promoter Profile Box */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5">
                    <h4 className="text-xs uppercase font-extrabold text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Promoter Information
                    </h4>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-sm text-foreground">
                        {selectedCommunity.promoter?.display_name || selectedCommunity.promoter?.name || selectedCommunity.promoter?.business_name || selectedCommunity.promoter?.username || selectedCommunity.promoter?.email || "Promoter Partner"}
                      </p>
                      {selectedCommunity.promoter?.phone_whatsapp && (
                        <p className="text-muted-foreground flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <a
                            href={`https://wa.me/${selectedCommunity.promoter.phone_whatsapp.replace(
                              /\D/g,
                              ""
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-emerald-600 font-semibold"
                          >
                            {selectedCommunity.promoter.phone_whatsapp}
                          </a>
                        </p>
                      )}
                      {selectedCommunity.promoter?.bio && (
                        <p className="text-muted-foreground text-[11px] pt-1 italic">
                          "{selectedCommunity.promoter.bio}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Audience Metrics */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                    <h4 className="text-xs uppercase font-extrabold text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Audience Reach & Metrics
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-xl bg-card border border-border/40">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Member / Audience Count
                        </span>
                        <span className="text-lg font-extrabold text-foreground font-mono">
                          {Number(selectedCommunity.member_count).toLocaleString()}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border/40">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Daily View Count
                        </span>
                        <span className="text-lg font-extrabold text-foreground font-mono">
                          {selectedCommunity.active_daily_views > 0
                            ? Number(selectedCommunity.active_daily_views).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-semibold text-foreground">
                          {selectedCommunity.category?.name || "General"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Primary Country:</span>
                        <span className="font-semibold text-foreground">
                          {selectedCommunity.country_primary}
                        </span>
                      </div>
                      {selectedCommunity.verified_at && (
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Verified Date:</span>
                          <span className="font-mono text-foreground">
                            {new Date(selectedCommunity.verified_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Demographics Summary */}
                  {selectedCommunity.demographics_summary && (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5">
                      <h4 className="text-xs uppercase font-extrabold text-muted-foreground">
                        Demographics & Audience Profile
                      </h4>
                      <p className="text-xs text-foreground leading-relaxed">
                        {selectedCommunity.demographics_summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Proof Screenshot & Inspection */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase font-extrabold text-muted-foreground flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        Audience Proof Screenshot
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setScreenshotPreviewOpen(true)}
                        className="h-7 px-2 text-xs font-semibold text-primary gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Full View
                      </Button>
                    </div>

                    {selectedCommunity.proof_screenshot_url ? (
                      <div
                        onClick={() => setScreenshotPreviewOpen(true)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-black/5 hover:opacity-95 transition-all aspect-video flex items-center justify-center"
                      >
                        <img
                          src={selectedCommunity.proof_screenshot_url}
                          alt="Proof Screenshot"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <Eye className="w-4 h-4" /> Click to Inspect Full Size
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                        No screenshot provided.
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground italic">
                      Verify that member counts, group title, and activity indicators match the submitted claim.
                    </p>
                  </div>

                  {/* Verification Audit History */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5">
                    <h4 className="text-xs uppercase font-extrabold text-muted-foreground flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-emerald-600" />
                      Verification Audit Trail
                    </h4>

                    {loadingAudit ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Loading audit trail...
                      </div>
                    ) : auditHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        No previous audit actions recorded.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {auditHistory.map((audit) => (
                          <div
                            key={audit.id}
                            className="p-2.5 rounded-xl bg-card border border-border/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold capitalize text-foreground">
                                {audit.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(audit.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Admin: {audit.admin?.display_name || audit.admin?.email || "System Admin"}
                            </p>
                            {audit.verification_notes && (
                              <p className="text-[11px] text-foreground bg-muted/30 p-1.5 rounded border border-border/30">
                                Notes: {audit.verification_notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCommunity(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mark Under Review (if submitted) */}
                  {selectedCommunity.verification_status === "submitted" && (
                    <Button
                      onClick={() => handleInitiateAction("submitted_for_review")}
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5 border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 font-bold"
                    >
                      <FileSearch className="w-3.5 h-3.5 text-blue-600" />
                      Mark Under Review
                    </Button>
                  )}

                  {/* Reject Community */}
                  {selectedCommunity.verification_status !== "rejected" && (
                    <Button
                      onClick={() => handleInitiateAction("rejected")}
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5 border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Reject Submission
                    </Button>
                  )}

                  {/* Suspend Community (if verified) */}
                  {selectedCommunity.verification_status === "verified" && (
                    <Button
                      onClick={() => handleInitiateAction("suspended")}
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Suspend Community
                    </Button>
                  )}

                  {/* Approve & Publish */}
                  {selectedCommunity.verification_status !== "verified" && (
                    <Button
                      onClick={() => handleInitiateAction("approved")}
                      className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SCREENSHOT FULL LIGHTBOX MODAL                                           */}
      {/* ========================================================================= */}
      <Dialog open={screenshotPreviewOpen} onOpenChange={setScreenshotPreviewOpen}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-border/40 text-white">
          <div className="relative p-2 flex flex-col items-center">
            {selectedCommunity?.proof_screenshot_url && (
              <img
                src={selectedCommunity.proof_screenshot_url}
                alt="Full Proof Screenshot"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            )}
            <div className="pt-2 text-center text-xs text-zinc-400">
              Audience Proof Screenshot for {selectedCommunity?.name}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ACTION CONFIRMATION / REJECTION REASON DIALOG                             */}
      {/* ========================================================================= */}
      <Dialog open={actionConfirmOpen} onOpenChange={setActionConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {pendingAction === "approved" && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Approve & Publish Community?
                </>
              )}
              {pendingAction === "rejected" && (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" /> Reject Community Submission
                </>
              )}
              {pendingAction === "submitted_for_review" && (
                <>
                  <FileSearch className="w-5 h-5 text-blue-600" /> Mark Audience Under Review
                </>
              )}
              {pendingAction === "suspended" && (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" /> Suspend Verified Community
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {pendingAction === "approved"
                ? "This will verify the promoter's audience and immediately make it visible to businesses in the promotion network marketplace."
                : pendingAction === "rejected"
                ? "Please enter a specific reason explaining why this audience was not approved. The promoter will receive this reason."
                : pendingAction === "submitted_for_review"
                ? "This marks the audience as actively being audited. The promoter will be notified."
                : "Suspended audiences are immediately removed from marketplace discovery and cannot receive bookings."}
            </DialogDescription>
          </DialogHeader>

          {/* Form Fields */}
          <div className="space-y-3 pt-2">
            {pendingAction === "rejected" && (
              <div className="space-y-1.5">
                <Label htmlFor="rejectionReason" className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Rejection Reason <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Proof screenshot does not clearly demonstrate claimed 5,000 member count or group activity."
                  rows={3}
                  className="rounded-xl text-xs border-rose-300 dark:border-rose-800"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="adminNotes" className="text-xs font-semibold text-foreground">
                {pendingAction === "rejected" ? "Internal Admin Notes (Optional)" : "Verification Notes (Optional)"}
              </Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Optional notes for the verification audit record..."
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionConfirmOpen(false)}
              disabled={submittingAction}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteAction}
              disabled={submittingAction || (pendingAction === "rejected" && !rejectionReason.trim())}
              className={`rounded-xl text-xs font-bold ${
                pendingAction === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : pendingAction === "rejected"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : pendingAction === "suspended"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {submittingAction ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                </span>
              ) : pendingAction === "approved" ? (
                "Confirm & Publish"
              ) : pendingAction === "rejected" ? (
                "Reject Submission"
              ) : pendingAction === "suspended" ? (
                "Suspend Community"
              ) : (
                "Confirm Under Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
