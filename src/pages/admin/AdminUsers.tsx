import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, ShieldOff, Users, Search, Wallet, Plus, Minus, Eye, Building2,
  UserCog, Mail, Briefcase, Crown, Sparkles, Loader2, ShieldCheck, CheckCircle2,
  AlertCircle, ExternalLink, RefreshCw, Zap, Sliders, Check, X, Phone,
  Image as ImageIcon, Megaphone, ArrowRight, Play, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import QueenServiceConciergeModal from "@/components/admin/business/QueenServiceConciergeModal";
import {
  autoCreateAndSetupBusinessForUser,
  runQueenServiceAIAutomation,
  calculateProfileCompleteness,
  isEarlyAccessBusiness,
  toggleEarlyAccessForUser,
  getQueenServiceSettings,
  saveQueenServiceSettings,
  QueenJobRecord,
} from "@/lib/queenBusinessServiceAIEngine";

export default function AdminUsers() {
  const qc = useQueryClient();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "business_owner" | "standard">("all");
  const [earlyAccessFilter, setEarlyAccessFilter] = useState<"all" | "early_access" | "standard">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [queenStatusFilter, setQueenStatusFilter] = useState<"all" | "completed" | "processing" | "incomplete" | "failed" | "eligible" | "not_started">("all");

  // Selected User Modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [profileForm, setProfileForm] = useState<any>({});
  const [rawOpen, setRawOpen] = useState(false);

  // Queen Concierge Modal
  const [queenModalOpen, setQueenModalOpen] = useState(false);
  const [queenTargetBiz, setQueenTargetBiz] = useState<any>(null);
  const [queenTargetUser, setQueenTargetUser] = useState<any>(null);

  // Running State for direct actions
  const [queenRunningUserId, setQueenRunningUserId] = useState<string | null>(null);

  // Global Settings
  const [globalAutoRun, setGlobalAutoRun] = useState(true);
  const [savingGlobalConfig, setSavingGlobalConfig] = useState(false);

  // Load Global Queen Settings
  const { data: queenConfig } = useQuery({
    queryKey: ["queen-service-global-config"],
    queryFn: async () => {
      const cfg = await getQueenServiceSettings();
      setGlobalAutoRun(cfg.autoRunOnEarlyAccessVerification);
      return cfg;
    },
  });

  const handleToggleGlobalAutoRun = async (checked: boolean) => {
    setGlobalAutoRun(checked);
    setSavingGlobalConfig(true);
    try {
      await saveQueenServiceSettings({
        autoRunOnEarlyAccessVerification: checked,
        autoRunOnNewBusinessRegistration: checked,
        defaultFeaturedDays: queenConfig?.defaultFeaturedDays || 30,
        defaultVerificationDays: queenConfig?.defaultVerificationDays || 365,
        defaultAdPlacement: queenConfig?.defaultAdPlacement || "directory_top",
        defaultAdDays: queenConfig?.defaultAdDays || 30,
      });
      qc.invalidateQueries({ queryKey: ["queen-service-global-config"] });
      toast.success(
        checked
          ? "Queen Service auto-run on registration & verification is now ACTIVE!"
          : "Queen Service auto-run disabled."
      );
    } catch {
      toast.error("Failed to update Queen auto-run setting");
    } finally {
      setSavingGlobalConfig(false);
    }
  };

  // Fetch Profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Roles
  const { data: roles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  // Fetch Wallets
  const { data: wallets = [] } = useQuery({
    queryKey: ["admin-all-wallets"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*");
      return data ?? [];
    },
  });

  // Fetch Businesses
  const { data: businesses = [] } = useQuery({
    queryKey: ["admin-user-businesses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Fetch Ads
  const { data: ads = [] } = useQuery({
    queryKey: ["admin-user-ads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_ads")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Fetch Submissions
  const { data: submissions = [] } = useQuery({
    queryKey: ["admin-user-blog-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("guest_blog_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Role Mutations
  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast.success("User role updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Save Profile Mutation
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("No user selected");
      const username =
        profileForm.username?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profileForm.display_name || null,
          email: profileForm.email || null,
          username,
          whatsapp: profileForm.whatsapp || null,
          bio: profileForm.bio || null,
          is_public: profileForm.is_public !== false,
          avatar_url: profileForm.avatar_url || null,
          background_url: profileForm.background_url || null,
          services: parseServices(profileForm.servicesText),
        } as any)
        .eq("user_id", selectedUser.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User profile updated successfully");
      setSelectedUser((p: any) => ({
        ...p,
        ...profileForm,
        services: parseServices(profileForm.servicesText),
      }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle Early Access for User
  const handleToggleUserEarlyAccess = async (userId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    const ok = await toggleEarlyAccessForUser(userId, newVal);
    if (ok) {
      toast.success(newVal ? "User marked as Early Access VIP" : "User early access removed");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      if (selectedUser?.user_id === userId) {
        setSelectedUser((prev: any) => ({
          ...prev,
          social_links: {
            ...(prev.social_links || {}),
            is_early_access: newVal,
            early_access: newVal,
          },
        }));
      }
    } else {
      toast.error("Failed to update Early Access status");
    }
  };

  // Helper Queries for specific user
  const isAdmin = (uid: string) => roles?.some((r: any) => r.user_id === uid && r.role === "admin");
  const balanceFor = (uid: string) => Number(wallets?.find((w: any) => w.user_id === uid)?.balance ?? 0);
  const rolesFor = (uid: string) => (roles || []).filter((r: any) => r.user_id === uid).map((r: any) => r.role);
  const businessesFor = (uid: string) => (businesses || []).filter((b: any) => b.submitted_by === uid);
  const adsFor = (uid: string) => (ads || []).filter((a: any) => a.user_id === uid);
  const submissionsFor = (uid: string) => (submissions || []).filter((b: any) => b.user_id === uid);

  // Status Resolvers
  const getUserQueenStatus = (uid: string) => {
    const userBizList = businessesFor(uid);
    if (userBizList.length === 0) {
      return {
        status: "eligible",
        label: "Eligible (No Listing Yet)",
        percent: 0,
        color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
        icon: Sparkles,
        job: null,
      };
    }

    const primaryBiz = userBizList[0];
    const job: QueenJobRecord | null = primaryBiz.social_links?.queen_job || null;
    const isCompleted = !!primaryBiz.social_links?.queen_service?.completed || job?.status === "completed";

    if (isCompleted) {
      return {
        status: "completed",
        label: "Completed 100%",
        percent: 100,
        color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
        icon: Crown,
        job,
      };
    }

    if (job?.status === "processing") {
      return {
        status: "processing",
        label: `Processing (${job.progressPercent || 50}%)`,
        percent: job.progressPercent || 50,
        color: "text-sky-600 bg-sky-500/10 border-sky-500/30",
        icon: Loader2,
        job,
      };
    }

    if (job?.status === "failed") {
      return {
        status: "failed",
        label: "Failed (Can Resume)",
        percent: job.progressPercent || 30,
        color: "text-rose-600 bg-rose-500/10 border-rose-500/30",
        icon: AlertCircle,
        job,
      };
    }

    if (job?.status === "partially_completed" || (job?.completedSteps && job.completedSteps.length > 0)) {
      return {
        status: "incomplete",
        label: `Incomplete (${job.completedSteps.length}/7 steps)`,
        percent: job.progressPercent || 40,
        color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
        icon: RotateCcw,
        job,
      };
    }

    return {
      status: "not_started",
      label: "Ready for Setup",
      percent: 0,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/30",
      icon: Sparkles,
      job: null,
    };
  };

  const isUserVerified = (p: any) => {
    const uSoc = p.social_links as Record<string, any> || {};
    if (uSoc.verified) return true;
    const userBiz = businessesFor(p.user_id);
    return userBiz.some((b: any) => b.social_links?.verified || b.social_links?.queen_service?.completed);
  };

  const isUserEarlyAccess = (p: any) => {
    const uSoc = p.social_links as Record<string, any> || {};
    if (uSoc.is_early_access === true || uSoc.early_access === true) return true;
    const userBiz = businessesFor(p.user_id);
    return userBiz.some((b: any) => isEarlyAccessBusiness(b, p));
  };

  // Launch Queen Service for User (1-Click or Resume)
  const handleLaunchQueenForUser = async (p: any) => {
    setQueenRunningUserId(p.user_id);
    const toastId = toast.loading(`👑 Queen VIP AI Concierge is processing setup for ${p.display_name || p.email}...`);
    try {
      const userBizList = businessesFor(p.user_id);
      if (userBizList.length > 0) {
        const primaryBiz = userBizList[0];
        await runQueenServiceAIAutomation(primaryBiz, {
          featuredDurationDays: queenConfig?.defaultFeaturedDays || 30,
          verificationDays: queenConfig?.defaultVerificationDays || 365,
          advertPlacement: (queenConfig?.defaultAdPlacement as any) || "directory_top",
          advertDurationDays: queenConfig?.defaultAdDays || 30,
          createBannerAdvert: true,
          generateServicesCatalog: true,
          sendOwnerNotification: true,
        });
        toast.success(`👑 Queen Service full setup complete for "${primaryBiz.name}"!`, { id: toastId });
      } else {
        const res = await autoCreateAndSetupBusinessForUser(p, {
          featuredDurationDays: queenConfig?.defaultFeaturedDays || 30,
          verificationDays: queenConfig?.defaultVerificationDays || 365,
          advertPlacement: (queenConfig?.defaultAdPlacement as any) || "directory_top",
          advertDurationDays: queenConfig?.defaultAdDays || 30,
        });
        toast.success(`👑 Created new business "${res.businessName}" with full AI catalog & banner creatives!`, { id: toastId });
      }

      qc.invalidateQueries({ queryKey: ["admin-user-businesses"] });
      qc.invalidateQueries({ queryKey: ["admin-user-ads"] });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (err: any) {
      toast.error(err.message || "Queen setup failed", { id: toastId });
    } finally {
      setQueenRunningUserId(null);
    }
  };

  const handleOpenCustomQueenModal = (p: any) => {
    const userBizList = businessesFor(p.user_id);
    if (userBizList.length > 0) {
      setQueenTargetBiz(userBizList[0]);
    } else {
      setQueenTargetBiz({
        id: "temp",
        name: p.display_name ? `${p.display_name} Enterprise` : "Business Listing",
        submitted_by: p.user_id,
        phone: p.whatsapp,
        category_name: "General Business",
      });
    }
    setQueenTargetUser(p);
    setQueenModalOpen(true);
  };

  const openUserDetails = (p: any) => {
    setSelectedUser(p);
    setProfileForm({
      ...p,
      servicesText: Array.isArray(p.services) ? p.services.join("\n") : "",
      is_public: p.is_public !== false,
    });
  };

  // Metrics calculation
  const totalUsersCount = profiles.length;
  const businessOwnersCount = profiles.filter((p: any) => businessesFor(p.user_id).length > 0).length;
  const earlyAccessUsersCount = profiles.filter((p: any) => isUserEarlyAccess(p)).length;
  const verifiedUsersCount = profiles.filter((p: any) => isUserVerified(p)).length;
  const queenCompletedCount = profiles.filter(
    (p: any) => getUserQueenStatus(p.user_id).status === "completed"
  ).length;
  const queenPendingCount = profiles.filter(
    (p: any) => ["processing", "incomplete", "failed", "eligible", "not_started"].includes(getUserQueenStatus(p.user_id).status)
  ).length;

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return profiles.filter((p: any) => {
      const userBizList = businessesFor(p.user_id);
      const isOwner = userBizList.length > 0;
      const isEA = isUserEarlyAccess(p);
      const isVer = isUserVerified(p);
      const qStatus = getUserQueenStatus(p.user_id).status;
      const isAdm = isAdmin(p.user_id);

      if (roleFilter === "admin" && !isAdm) return false;
      if (roleFilter === "user" && isAdm) return false;

      if (userTypeFilter === "business_owner" && !isOwner) return false;
      if (userTypeFilter === "standard" && isOwner) return false;

      if (earlyAccessFilter === "early_access" && !isEA) return false;
      if (earlyAccessFilter === "standard" && isEA) return false;

      if (verificationFilter === "verified" && !isVer) return false;
      if (verificationFilter === "unverified" && isVer) return false;

      if (queenStatusFilter !== "all" && qStatus !== queenStatusFilter) return false;

      if (search.trim()) {
        const corpus = [
          p.display_name,
          p.email,
          p.username,
          p.whatsapp,
          p.user_id,
          ...userBizList.map((b: any) => `${b.name} ${b.slug} ${b.phone}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!corpus.includes(search.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [
    profiles,
    businesses,
    roles,
    search,
    roleFilter,
    userTypeFilter,
    earlyAccessFilter,
    verificationFilter,
    queenStatusFilter,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header with Title and Global Auto-Run Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/60 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                User Management &amp; Queen VIP Concierge
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage registered users, linked business listings, Early Access VIP tiers, and AI automation jobs.
              </p>
            </div>
          </div>
        </div>

        {/* Global Auto-Run Switch Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="global-queen-switch" className="text-xs font-bold text-foreground cursor-pointer">
                Global Queen Auto-Run
              </Label>
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-700 border-amber-500/40">
                Early Access
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto-execute Queen VIP setup on user business submission &amp; verification
            </p>
          </div>
          <Switch
            id="global-queen-switch"
            checked={globalAutoRun}
            onCheckedChange={handleToggleGlobalAutoRun}
            disabled={savingGlobalConfig}
            className="data-[state=checked]:bg-amber-500 ml-2"
          />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border-border/60 bg-card/40">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-sky-500" />
            Total Users
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{totalUsersCount}</p>
          <span className="text-[10px] text-muted-foreground">Registered on platform</span>
        </Card>

        <Card className="p-3 border-border/60 bg-card/40">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            Business Owners
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{businessOwnersCount}</p>
          <span className="text-[10px] text-muted-foreground">Submitted listings</span>
        </Card>

        <Card className="p-3 border-border/60 bg-card/40">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Early Access VIP
          </p>
          <p className="text-2xl font-black text-amber-600 mt-1">{earlyAccessUsersCount}</p>
          <span className="text-[10px] text-muted-foreground">Eligible for Concierge</span>
        </Card>

        <Card className="p-3 border-border/60 bg-card/40">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
            Blue Tick Verified
          </p>
          <p className="text-2xl font-black text-sky-600 mt-1">{verifiedUsersCount}</p>
          <span className="text-[10px] text-muted-foreground">Active verified badge</span>
        </Card>

        <Card className="p-3 border-border/60 bg-card/40">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-emerald-500" />
            Queen Setup Done
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{queenCompletedCount}</p>
          <span className="text-[10px] text-muted-foreground">Full AI setup active</span>
        </Card>

        <Card className="p-3 border-border/60 bg-card/40">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            Queen Pending / Ready
          </p>
          <p className="text-2xl font-black text-amber-600 mt-1">{queenPendingCount}</p>
          <span className="text-[10px] text-muted-foreground">Waiting / Incomplete</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3 border-border/60">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, username, phone, business name, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Select value={userTypeFilter} onValueChange={(v: any) => setUserTypeFilter(v)}>
              <SelectTrigger className="w-[140px] text-xs h-10 shrink-0">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="business_owner">🏢 Business Owners</SelectItem>
                <SelectItem value="standard">👤 Standard Users</SelectItem>
              </SelectContent>
            </Select>

            <Select value={earlyAccessFilter} onValueChange={(v: any) => setEarlyAccessFilter(v)}>
              <SelectTrigger className="w-[150px] text-xs h-10 shrink-0">
                <SelectValue placeholder="Early Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Access</SelectItem>
                <SelectItem value="early_access">✨ Early Access VIP</SelectItem>
                <SelectItem value="standard">Standard Users</SelectItem>
              </SelectContent>
            </Select>

            <Select value={queenStatusFilter} onValueChange={(v: any) => setQueenStatusFilter(v)}>
              <SelectTrigger className="w-[160px] text-xs h-10 shrink-0">
                <SelectValue placeholder="Queen Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Queen States</SelectItem>
                <SelectItem value="completed">👑 Completed (100%)</SelectItem>
                <SelectItem value="processing">⏳ Processing</SelectItem>
                <SelectItem value="incomplete">⚠️ Incomplete / Partial</SelectItem>
                <SelectItem value="failed">❌ Failed (Resume)</SelectItem>
                <SelectItem value="eligible">✨ Ready / Eligible</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verificationFilter} onValueChange={(v: any) => setVerificationFilter(v)}>
              <SelectTrigger className="w-[140px] text-xs h-10 shrink-0">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="verified">🛡️ Blue Tick Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs shrink-0"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setUserTypeFilter("all");
                setEarlyAccessFilter("all");
                setVerificationFilter("all");
                setQueenStatusFilter("all");
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Data Table */}
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground">User &amp; Identity</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Role &amp; Wallet</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Owned Business(es)</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Profile Quality</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Early Access</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Verification</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Queen AI Concierge</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profilesLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading user management records...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No users matching current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((p: any) => {
                  const userBizList = businessesFor(p.user_id);
                  const primaryBiz = userBizList[0];
                  const qStatus = getUserQueenStatus(p.user_id);
                  const isEA = isUserEarlyAccess(p);
                  const isVer = isUserVerified(p);
                  const completeness = primaryBiz ? calculateProfileCompleteness(primaryBiz, p) : calculateProfileCompleteness(null, p);
                  const isAdm = isAdmin(p.user_id);
                  const isRunningThisUser = queenRunningUserId === p.user_id;

                  return (
                    <TableRow key={p.id || p.user_id} className="hover:bg-muted/30 transition-colors">
                      {/* User Column */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 border shadow-xs">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (p.display_name || p.email || "?")[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 max-w-[190px]">
                            <p className="font-bold text-xs text-foreground truncate flex items-center gap-1">
                              {p.display_name || p.username || (p.email ? p.email.split("@")[0] : "User")}
                              {isAdm && (
                                <Badge className="text-[9px] py-0 px-1 bg-purple-500/20 text-purple-700 border-purple-400/40">
                                  Admin
                                </Badge>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                            {p.whatsapp && (
                              <p className="text-[10px] text-emerald-600 font-medium truncate flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                {p.whatsapp}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              Joined {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role & Wallet */}
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {rolesFor(p.user_id).join(", ") || "Standard User"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <Wallet className="w-3 h-3" />
                              ₦{balanceFor(p.user_id).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Owned Businesses */}
                      <TableCell className="py-3">
                        {userBizList.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">No listings yet</span>
                        ) : (
                          <div className="space-y-1">
                            {userBizList.slice(0, 2).map((b: any) => (
                              <div key={b.id} className="flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-amber-600 shrink-0" />
                                <Link
                                  to={`/businesses/${b.slug || b.id}`}
                                  target="_blank"
                                  className="text-xs font-semibold text-foreground hover:text-primary hover:underline truncate max-w-[150px]"
                                >
                                  {b.name}
                                </Link>
                              </div>
                            ))}
                            {userBizList.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{userBizList.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Profile Completeness Score */}
                      <TableCell className="py-3">
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-muted-foreground">Quality</span>
                            <span
                              className={
                                completeness >= 80
                                  ? "text-emerald-600"
                                  : completeness >= 50
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }
                            >
                              {completeness}%
                            </span>
                          </div>
                          <Progress
                            value={completeness}
                            className="h-1.5"
                          />
                        </div>
                      </TableCell>

                      {/* Early Access Status with 1-Click Toggle */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUserEarlyAccess(p.user_id, isEA)}
                            className={`text-xs px-2 py-0.5 rounded-full font-bold border transition-colors flex items-center gap-1 ${
                              isEA
                                ? "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/25"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            }`}
                            title="Click to toggle Early Access VIP status"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isEA ? "VIP Active" : "Standard"}
                          </button>
                        </div>
                      </TableCell>

                      {/* Verification Status */}
                      <TableCell className="py-3">
                        {isVer ? (
                          <Badge className="bg-sky-500/15 text-sky-700 border-sky-500/30 text-[10px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-sky-600" />
                            Blue Tick Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>

                      {/* Queen AI Concierge Status */}
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold flex items-center gap-1 w-fit ${qStatus.color}`}
                          >
                            <qStatus.icon className="w-3 h-3" />
                            {qStatus.label}
                          </Badge>
                          {qStatus.job?.renderedBannerCreativeUrl && (
                            <span className="text-[10px] text-emerald-600 font-medium block">
                              ✓ Banner &amp; Ads Active
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1-Click Queen Run / Resume */}
                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                            onClick={() => handleLaunchQueenForUser(p)}
                            disabled={isRunningThisUser}
                          >
                            {isRunningThisUser ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Crown className="w-3.5 h-3.5 mr-1" />
                            )}
                            {qStatus.status === "completed"
                              ? "Re-Run Queen"
                              : qStatus.status === "failed" || qStatus.status === "incomplete"
                              ? "Resume Queen"
                              : "1-Click Queen"}
                          </Button>

                          {/* Custom Queen Concierge Modal */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-amber-700 border-amber-400/40 hover:bg-amber-500/10"
                            onClick={() => handleOpenCustomQueenModal(p)}
                            title="Configure Queen Service parameters & custom instructions"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </Button>

                          {/* View Full 360 User & Business Profile */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => openUserDetails(p)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View 360°
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* User 360° Detailed Management Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(v) => !v && setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-amber-500/30">
          {selectedUser && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-6 text-white relative">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center text-white text-xl font-black overflow-hidden shadow-md">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (selectedUser.display_name || selectedUser.email || "?")[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black flex items-center gap-2">
                        {selectedUser.display_name || selectedUser.email}
                        {isUserEarlyAccess(selectedUser) && (
                          <Badge className="bg-emerald-950/40 text-emerald-200 border-emerald-400/40 text-xs">
                            ✨ Early Access VIP
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-amber-100/90">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-black/30 hover:bg-black/40 text-white border border-white/20 text-xs font-bold"
                      onClick={() => handleLaunchQueenForUser(selectedUser)}
                    >
                      <Crown className="w-3.5 h-3.5 mr-1.5 text-yellow-300 fill-yellow-300" />
                      Run Queen Service
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs Body */}
              <div className="p-6">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid grid-cols-5 h-auto p-1 bg-muted/60">
                    <TabsTrigger value="profile" className="text-xs py-2">Profile &amp; ID</TabsTrigger>
                    <TabsTrigger value="businesses" className="text-xs py-2">Businesses ({businessesFor(selectedUser.user_id).length})</TabsTrigger>
                    <TabsTrigger value="queen_job" className="text-xs py-2">👑 Queen Job &amp; Creatives</TabsTrigger>
                    <TabsTrigger value="ads" className="text-xs py-2">Ads ({adsFor(selectedUser.user_id).length})</TabsTrigger>
                    <TabsTrigger value="raw" className="text-xs py-2">Raw JSON</TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Profile & Identity */}
                  <TabsContent value="profile" className="space-y-4 mt-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="p-3 rounded-xl border bg-card">
                        <p className="text-[11px] text-muted-foreground">Wallet Balance</p>
                        <p className="text-base font-bold text-emerald-600 mt-0.5">
                          ₦{balanceFor(selectedUser.user_id).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border bg-card">
                        <p className="text-[11px] text-muted-foreground">User Roles</p>
                        <p className="text-xs font-bold mt-0.5">
                          {rolesFor(selectedUser.user_id).join(", ") || "Standard User"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border bg-card">
                        <p className="text-[11px] text-muted-foreground">Early Access</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Switch
                            checked={isUserEarlyAccess(selectedUser)}
                            onCheckedChange={() => handleToggleUserEarlyAccess(selectedUser.user_id, isUserEarlyAccess(selectedUser))}
                          />
                          <span className="text-xs font-semibold">
                            {isUserEarlyAccess(selectedUser) ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border bg-card">
                        <p className="text-[11px] text-muted-foreground">Admin Privilege</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant={isAdmin(selectedUser.user_id) ? "destructive" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleAdmin.mutate({ userId: selectedUser.user_id, isAdmin: !!isAdmin(selectedUser.user_id) })}
                            disabled={toggleAdmin.isPending}
                          >
                            {isAdmin(selectedUser.user_id) ? "Demote from Admin" : "Grant Admin"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Display name</Label>
                        <Input
                          value={profileForm.display_name || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={profileForm.email || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Username</Label>
                        <Input
                          value={profileForm.username || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">WhatsApp / Phone</Label>
                        <Input
                          value={profileForm.whatsapp || ""}
                          onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                          className="text-xs h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Bio / Description</Label>
                      <Textarea
                        rows={3}
                        value={profileForm.bio || ""}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <AdjustWalletButton
                        userId={selectedUser.user_id}
                        onDone={() => qc.invalidateQueries({ queryKey: ["admin-all-wallets"] })}
                      />
                      <Button
                        onClick={() => saveProfile.mutate()}
                        disabled={saveProfile.isPending}
                        className="text-xs font-bold"
                      >
                        Save Profile Changes
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Business Information */}
                  <TabsContent value="businesses" className="space-y-4 mt-4">
                    {businessesFor(selectedUser.user_id).length === 0 ? (
                      <div className="p-8 text-center border rounded-xl bg-muted/20">
                        <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-bold text-sm">No Business Submitted Yet</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                          This user has not registered a business. You can use Queen Service to automatically initialize and setup a brand new business listing for them.
                        </p>
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                          onClick={() => handleLaunchQueenForUser(selectedUser)}
                        >
                          <Crown className="w-3.5 h-3.5 mr-1" />
                          Auto-Generate Business with Queen AI
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {businessesFor(selectedUser.user_id).map((b: any) => {
                          const completeness = calculateProfileCompleteness(b, selectedUser);
                          const qJob: QueenJobRecord | null = b.social_links?.queen_job || null;

                          return (
                            <Card key={b.id} className="p-4 space-y-3 border-border/80">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                    {b.logo_url ? (
                                      <img src={b.logo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Building2 className="w-6 h-6 text-amber-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                      {b.name}
                                      {b.social_links?.verified && (
                                        <ShieldCheck className="w-4 h-4 text-sky-500" />
                                      )}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      Category: <span className="font-semibold text-foreground">{b.categories?.name || "General"}</span>
                                      {b.address && ` • ${b.address}`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Status: {b.status || "approved"}
                                  </Badge>
                                  <Link to={`/businesses/${b.slug || b.id}`} target="_blank">
                                    <Button size="sm" variant="outline" className="h-7 text-xs">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      View Listing
                                    </Button>
                                  </Link>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground">Quality Score</p>
                                  <p className="font-bold text-foreground mt-0.5">{completeness}% Complete</p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground">Featured Ranking</p>
                                  <p className="font-bold text-foreground mt-0.5">{b.featured ? "Active Priority" : "Standard"}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground">Blue Tick Verification</p>
                                  <p className="font-bold text-foreground mt-0.5">{b.social_links?.verified ? "Verified" : "Unverified"}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground">Services Listed</p>
                                  <p className="font-bold text-foreground mt-0.5">{Array.isArray(b.services) ? b.services.length : 0} Services</p>
                                </div>
                              </div>

                              {b.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                  "{b.description}"
                                </p>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: Queen Job & Creatives */}
                  <TabsContent value="queen_job" className="space-y-4 mt-4">
                    {(() => {
                      const userBiz = businessesFor(selectedUser.user_id);
                      const primaryBiz = userBiz[0];
                      const job: QueenJobRecord | null = primaryBiz?.social_links?.queen_job || null;
                      const bannerCreative =
                        job?.renderedBannerCreativeUrl ||
                        primaryBiz?.social_links?.queen_banner_creative_url ||
                        primaryBiz?.social_links?.queen_service?.banner_creative_url;
                      const serviceCreatives =
                        job?.serviceGraphicUrls ||
                        primaryBiz?.social_links?.queen_service_creatives ||
                        {};

                      return (
                        <div className="space-y-4">
                          {/* Job State Card */}
                          <div className="p-4 rounded-xl border bg-card space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <Crown className="w-4 h-4 text-amber-500" />
                                  Queen Service Automation Lifecycle &amp; State Machine
                                </h4>
                                <p className="text-xs font-semibold text-foreground mt-1">
                                  Job ID: <span className="font-mono text-muted-foreground">{job?.jobId || "None recorded"}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                                  onClick={() => handleLaunchQueenForUser(selectedUser)}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  {job?.status === "completed" ? "Re-Run Queen" : "Resume / Retry Queen"}
                                </Button>
                              </div>
                            </div>

                            {/* Completed Steps Checklist */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                              {[
                                { key: "ANALYZING_INFO", label: "1. Info Ingestion" },
                                { key: "GENERATING_PROFILE", label: "2. AI Copywriting" },
                                { key: "CREATING_SERVICES", label: "3. Services Catalog" },
                                { key: "DESIGNING_GRAPHICS", label: "4. Graphic Designer" },
                                { key: "ACTIVATING_LISTING", label: "5. Directory Priority" },
                                { key: "APPLYING_VERIFICATION", label: "6. Blue Tick Badge" },
                                { key: "CREATING_ADVERT", label: "7. Display Banner Ad" },
                                { key: "SENDING_NOTIFICATION", label: "8. Merchant Alert" },
                              ].map((step) => {
                                const isDone = job?.completedSteps?.includes(step.key);
                                return (
                                  <div
                                    key={step.key}
                                    className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 ${
                                      isDone
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-semibold"
                                        : "bg-muted/30 text-muted-foreground"
                                    }`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                                    )}
                                    <span className="truncate">{step.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Master Banner Creative Showcase */}
                          {bannerCreative && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-amber-500" />
                                AI Graphic Designer Master Display Banner (1200x630)
                              </h4>
                              <div className="rounded-xl overflow-hidden border border-amber-500/40 shadow-sm relative group">
                                <img
                                  src={bannerCreative}
                                  alt="Master Banner Creative"
                                  className="w-full h-auto object-cover max-h-[320px]"
                                />
                                <div className="p-3 bg-card flex items-center justify-between text-xs">
                                  <span className="font-semibold text-foreground">
                                    Published in live advert rotation &amp; directory header
                                  </span>
                                  <a
                                    href={bannerCreative}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline font-bold flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Open Full Resolution
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Individual Service Flyers Grid */}
                          {Object.keys(serviceCreatives).length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Multi-Service Social Flyers (1080x1080)
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(serviceCreatives).map(([title, url]: [string, any]) => (
                                  <div key={title} className="rounded-xl overflow-hidden border bg-card space-y-1.5 p-2">
                                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                      <img src={url} alt={title} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="text-xs font-bold text-foreground truncate">{title}</p>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      View Flyer
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* TAB 4: Ads */}
                  <TabsContent value="ads" className="space-y-4 mt-4">
                    {adsFor(selectedUser.user_id).length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-8">
                        No active or past advertisements created for this user.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {adsFor(selectedUser.user_id).map((ad: any) => (
                          <div key={ad.id} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {ad.image_url && (
                                <img src={ad.image_url} alt="" className="w-16 h-10 object-cover rounded-lg border" />
                              )}
                              <div>
                                <h5 className="font-bold text-xs text-foreground">{ad.title}</h5>
                                <p className="text-[11px] text-muted-foreground">
                                  Slot: <span className="font-medium text-foreground">{ad.placement}</span> • Source: {ad.source}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={ad.status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}>
                                {ad.status}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ad.impressions || 0} views • {ad.clicks || 0} clicks
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 5: Raw JSON */}
                  <TabsContent value="raw" className="space-y-4 mt-4">
                    <pre className="max-h-[50vh] overflow-auto rounded-xl bg-muted p-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          profile: selectedUser,
                          roles: rolesFor(selectedUser.user_id),
                          wallet: wallets?.find((w: any) => w.user_id === selectedUser.user_id),
                          businesses: businessesFor(selectedUser.user_id),
                          ads: adsFor(selectedUser.user_id),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Queen Concierge Parameters Modal */}
      {queenTargetBiz && (
        <QueenServiceConciergeModal
          open={queenModalOpen}
          onOpenChange={setQueenModalOpen}
          business={queenTargetBiz}
          ownerProfile={queenTargetUser}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["admin-profiles"] });
            qc.invalidateQueries({ queryKey: ["admin-user-businesses"] });
            qc.invalidateQueries({ queryKey: ["admin-user-ads"] });
          }}
        />
      )}
    </div>
  );
}

function parseServices(text: string) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function AdjustWalletButton({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const adjust = async (sign: 1 | -1) => {
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_wallet", {
        _user_id: userId,
        _amount: sign * n,
        _description: note || (sign > 0 ? "Admin credit" : "Admin debit"),
      });
      if (error) throw error;
      toast.success(`${sign > 0 ? "Credited" : "Debited"} ₦${n.toLocaleString()}`);
      setOpen(false);
      setAmount("");
      setNote("");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8 text-xs">
          <Wallet className="h-3.5 w-3.5 mr-1" />
          Adjust Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manual Wallet Adjustment</DialogTitle>
          <DialogDescription className="text-xs">
            Credit or debit user wallet balance with an audit note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Amount (₦)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="text-xs h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Audit Note / Reason</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment..."
              className="text-xs h-9"
            />
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="destructive" disabled={busy} onClick={() => adjust(-1)} className="text-xs">
            <Minus className="h-3.5 w-3.5 mr-1" />
            Debit ₦
          </Button>
          <Button disabled={busy} onClick={() => adjust(1)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Credit ₦
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
