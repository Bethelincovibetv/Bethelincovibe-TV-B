import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Plus, Pencil, Trash2, ImagePlus, X, Check, Clock, Zap, Sparkles,
  Search, ShieldCheck, ShieldAlert, Eye, ExternalLink, Globe, Phone, MapPin,
  AlertTriangle, Filter, CheckCircle2, Video, Award, RefreshCw, Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import QueenServiceConciergeModal from "./QueenServiceConciergeModal";

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const emptyForm = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  phone: "",
  address: "",
  website: "",
  logo_url: "",
  social_links: "{}",
  featured: false,
  active: true,
};

function calculateProfileCompleteness(biz: any): number {
  let score = 0;
  if (biz.name) score += 15;
  if (biz.logo_url) score += 15;
  if (biz.category_id) score += 10;
  if (biz.description && biz.description.length > 20) score += 15;
  if (biz.phone) score += 10;
  if (biz.address) score += 10;
  if (biz.website) score += 10;
  if (biz.cover_url || biz.cover_template) score += 5;
  if (Array.isArray(biz.services) && biz.services.length > 0) score += 10;
  return Math.min(score, 100);
}

export default function AdminBusinessDirectoryTab({
  onSelectTab,
}: {
  onSelectTab?: (tab: string) => void;
}) {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [trustFilter, setTrustFilter] = useState("all");
  const [featureFilter, setFeatureFilter] = useState("all");

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // View Details Modal
  const [viewDetailsBiz, setViewDetailsBiz] = useState<any>(null);

  // Quick Verification Modal
  const [verifyModalBiz, setVerifyModalBiz] = useState<any>(null);
  const [verifyDurationDays, setVerifyDurationDays] = useState<number>(365);
  const [verifyNotes, setVerifyNotes] = useState("");

  // Quick Boost Modal
  const [boostModalBiz, setBoostModalBiz] = useState<any>(null);
  const [boostDurationDays, setBoostDurationDays] = useState<number>(14);

  // Queen Concierge AI Setup Modal
  const [queenModalBiz, setQueenModalBiz] = useState<any>(null);

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

  // Fetch Profiles for owners
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

  // Fetch Gallery Images for editing business
  const { data: galleryImages = [], refetch: refetchGallery } = useQuery({
    queryKey: ["business-gallery", editing?.id],
    queryFn: async () => {
      if (!editing?.id) return [];
      const { data } = await supabase
        .from("supplier_images")
        .select("*")
        .eq("supplier_id", editing.id)
        .order("display_order");
      return data ?? [];
    },
    enabled: !!editing?.id,
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let socialLinks = {};
      try {
        socialLinks = JSON.parse(data.social_links);
      } catch {}
      const payload = {
        name: data.name,
        slug: data.slug,
        category_id: data.category_id || null,
        description: data.description || null,
        phone: data.phone || null,
        address: data.address || null,
        website: data.website || null,
        logo_url: data.logo_url || null,
        social_links: socialLinks,
        featured: data.featured,
        active: data.active,
      };
      if (data.id) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success(editing ? "Business updated successfully" : "Business added successfully");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ status: "approved", active: true, rejection_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business approved & published live");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ status: "rejected", active: false, rejection_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Submission rejected");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ active, status: active ? "approved" : "suspended" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success(variables.active ? "Business activated" : "Business suspended/hidden from directory");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async ({
      biz,
      verified,
      days,
    }: {
      biz: any;
      verified: boolean;
      days?: number;
    }) => {
      const now = new Date();
      const endsAt = verified && days ? new Date(now.getTime() + days * 86400000).toISOString() : null;
      const currentLinks = (biz.social_links as Record<string, any>) || {};
      const nextLinks = {
        ...currentLinks,
        verified,
        verified_until: endsAt,
        verified_by_admin: true,
        verified_at: verified ? now.toISOString() : null,
      };

      // 1. Update business
      const { error: sErr } = await supabase
        .from("suppliers")
        .update({ social_links: nextLinks })
        .eq("id", biz.id);
      if (sErr) throw sErr;

      // 2. If submitted_by user exists, update their profile too
      if (biz.submitted_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("social_links")
          .eq("user_id", biz.submitted_by)
          .maybeSingle();
        if (prof) {
          const profLinks = (prof.social_links as Record<string, any>) || {};
          await supabase
            .from("profiles")
            .update({
              social_links: {
                ...profLinks,
                verified,
                verified_until: endsAt,
              },
            })
            .eq("user_id", biz.submitted_by);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-business-owners"] });
      toast.success(
        variables.verified
          ? `Blue Tick Verification granted!`
          : "Verification revoked."
      );
      setVerifyModalBiz(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBoostMutation = useMutation({
    mutationFn: async ({
      biz,
      featured,
      days,
    }: {
      biz: any;
      featured: boolean;
      days?: number;
    }) => {
      const now = new Date();
      const endsAt = featured && days ? new Date(now.getTime() + days * 86400000).toISOString() : null;

      const { error } = await supabase
        .from("suppliers")
        .update({
          featured,
          boosted_until: endsAt,
        })
        .eq("id", biz.id);
      if (error) throw error;

      if (featured) {
        await supabase.from("business_boosts").insert({
          business_id: biz.id,
          user_id: biz.submitted_by || "admin",
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
          ? `Business featured for ${variables.days} days!`
          : "Featured status removed."
      );
      setBoostModalBiz(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setEditOpen(false);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      slug: s.slug || "",
      category_id: s.category_id || "",
      description: s.description || "",
      phone: s.phone || "",
      address: s.address || "",
      website: s.website || "",
      logo_url: s.logo_url || "",
      social_links: JSON.stringify(s.social_links || {}, null, 2),
      featured: !!s.featured,
      active: !!s.active,
    });
    setEditOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `logos/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("supplier-logos").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }
    const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
    setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
    toast.success("Logo uploaded!");
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editing?.id) return;
    const files = e.target.files;
    if (!files?.length) return;
    setGalleryUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `gallery/${editing.id}/${Date.now()}_${i}.${file.name.split(".").pop()}`;
        const { error: uploadErr } = await supabase.storage.from("supplier-logos").upload(path, file);
        if (uploadErr) continue;
        const { data: urlData } = supabase.storage.from("supplier-logos").getPublicUrl(path);
        await supabase.from("supplier_images").insert({
          supplier_id: editing.id,
          image_url: urlData.publicUrl,
          display_order: (galleryImages?.length ?? 0) + i,
        });
      }
      refetchGallery();
      toast.success("Gallery images uploaded!");
    } finally {
      setGalleryUploading(false);
    }
  };

  const deleteGalleryImage = async (imgId: string) => {
    await supabase.from("supplier_images").delete().eq("id", imgId);
    refetchGallery();
  };

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b: any) => {
      // Search
      if (search.trim()) {
        const owner = profilesMap[b.submitted_by];
        const text = [
          b.name,
          b.slug,
          b.phone,
          b.address,
          b.website,
          b.categories?.name,
          owner?.display_name,
          owner?.email,
          owner?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      // Status
      if (statusFilter === "active" && (!b.active || b.status === "rejected" || b.status === "pending")) return false;
      if (statusFilter === "pending" && b.status !== "pending") return false;
      if (statusFilter === "suspended" && (b.active || b.status === "pending" || b.status === "rejected")) return false;
      if (statusFilter === "rejected" && b.status !== "rejected") return false;

      // Category
      if (categoryFilter !== "all" && b.category_id !== categoryFilter) return false;

      // Trust / Verification
      const sl = b.social_links as Record<string, any> | null;
      const isVerified = !!sl?.verified || (!!sl?.verified_until && new Date(sl.verified_until) > new Date());
      if (trustFilter === "verified" && !isVerified) return false;
      if (trustFilter === "unverified" && isVerified) return false;

      // Featured / Boost
      const isBoosted = !!b.featured || (!!b.boosted_until && new Date(b.boosted_until) > new Date());
      if (featureFilter === "featured" && !isBoosted) return false;
      if (featureFilter === "standard" && isBoosted) return false;

      return true;
    });
  }, [businesses, profilesMap, search, statusFilter, categoryFilter, trustFilter, featureFilter]);

  const pendingCount = businesses.filter((b: any) => b.status === "pending").length;
  const verifiedCount = businesses.filter((b: any) => {
    const sl = b.social_links as Record<string, any> | null;
    return !!sl?.verified || (!!sl?.verified_until && new Date(sl.verified_until) > new Date());
  }).length;
  const featuredCount = businesses.filter((b: any) => {
    return !!b.featured || (!!b.boosted_until && new Date(b.boosted_until) > new Date());
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Businesses</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{businesses.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Derived from profiles & directory</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Verified (Blue Tick)</span>
            <ShieldCheck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">{verifiedCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {businesses.length > 0 ? Math.round((verifiedCount / businesses.length) * 100) : 0}% of all businesses
          </p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Featured / Boosted</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{featuredCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Top spotlight rankings</p>
        </Card>

        <Card
          className={`p-4 rounded-2xl border shadow-xs ${
            pendingCount > 0
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-card border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pending Review</span>
            <Clock className={`h-4 w-4 ${pendingCount > 0 ? "text-amber-600 animate-pulse" : "text-muted-foreground"}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${pendingCount > 0 ? "text-amber-600" : "text-foreground"}`}>
            {pendingCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {pendingCount > 0 ? "Awaiting admin approval" : "All submissions reviewed"}
          </p>
        </Card>
      </div>

      {/* Auto Approve Toggle Card */}
      <AutoApproveCard />

      {/* Pending Submissions Alert Banner */}
      {pendingCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5 p-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {pendingCount} New Business Submission{pendingCount > 1 ? "s" : ""} Awaiting Review
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review new directory business submissions to approve or reject with custom feedback.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusFilter("pending")}
              className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0"
            >
              Filter Pending ({pendingCount})
            </Button>
          </div>
        </Card>
      )}

      {/* Controls & Search Bar */}
      <Card className="p-4 rounded-2xl border-border/80 bg-card shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, slug, phone, owner email, username..."
              className="pl-9 rounded-xl h-10 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                resetForm();
                setEditOpen(true);
              }}
              className="rounded-xl font-bold gap-1.5 h-10 px-4"
            >
              <Plus className="h-4 w-4" /> Add Business
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              title="Refresh businesses"
              className="rounded-xl h-10 w-10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Chips / Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active &amp; Live</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="suspended">Suspended / Hidden</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Category" />
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

          <Select value={trustFilter} onValueChange={setTrustFilter}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Trust Badge" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verifications</SelectItem>
              <SelectItem value="verified">Verified (Blue Tick)</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>

          <Select value={featureFilter} onValueChange={setFeatureFilter}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Featured" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Promotions</SelectItem>
              <SelectItem value="featured">Featured / Boosted</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Businesses List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong>{filteredBusinesses.length}</strong> of {businesses.length} businesses
          </span>
          {(statusFilter !== "all" || categoryFilter !== "all" || trustFilter !== "all" || featureFilter !== "all" || search) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setTrustFilter("all");
                setFeatureFilter("all");
              }}
              className="text-primary hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading businesses...</div>
        ) : filteredBusinesses.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-bold text-foreground">No businesses found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No businesses matched your search or filters. Try adjusting your query.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredBusinesses.map((b: any) => {
              const owner = profilesMap[b.submitted_by];
              const sl = (b.social_links as Record<string, any>) || {};
              const isVerified = !!sl?.verified || (!!sl?.verified_until && new Date(sl.verified_until) > new Date());
              const isBoosted = !!b.featured || (!!b.boosted_until && new Date(b.boosted_until) > new Date());
              const completeness = calculateProfileCompleteness(b);
              const hasVideo = !!sl?.youtube_video_url;

              return (
                <Card
                  key={b.id}
                  className={`rounded-2xl border transition-all hover:shadow-md ${
                    b.status === "pending"
                      ? "border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10"
                      : !b.active
                      ? "border-border/60 bg-muted/20 opacity-80"
                      : "border-border bg-card"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Info & Badges */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Logo Avatar */}
                      <div className="h-14 w-14 rounded-2xl bg-muted border border-border/80 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-xs">
                        {b.logo_url ? (
                          <img
                            src={b.logo_url}
                            alt={b.name}
                            className="h-full w-full object-contain rounded-xl"
                          />
                        ) : (
                          <Building2 className="h-7 w-7 text-muted-foreground/60" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Title & Trust Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-foreground truncate max-w-xs sm:max-w-md">
                            {b.name}
                          </h3>

                          {/* Blue Tick Badge */}
                          {isVerified && (
                            <Badge
                              className="bg-sky-500 text-white font-bold text-[10px] gap-1 px-2 py-0.5 rounded-full shadow-xs"
                              title={
                                sl.verified_until
                                  ? `Verified until ${new Date(sl.verified_until).toLocaleDateString()}`
                                  : "Verified Business"
                              }
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}

                          {/* Featured Badge */}
                          {isBoosted && (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-bold text-[10px] gap-1 px-2 py-0.5 rounded-full shadow-xs">
                              <Sparkles className="h-3 w-3" />
                              {b.boosted_until
                                ? `Featured until ${new Date(b.boosted_until).toLocaleDateString()}`
                                : "Featured"}
                            </Badge>
                          )}

                          {/* Status Badge */}
                          {b.status === "pending" && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-black">
                              Pending Review
                            </Badge>
                          )}
                          {b.status === "rejected" && (
                            <Badge variant="destructive" className="text-[10px] font-black">
                              Rejected
                            </Badge>
                          )}
                          {!b.active && b.status !== "rejected" && b.status !== "pending" && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground font-black">
                              Suspended / Hidden
                            </Badge>
                          )}

                          {/* Video Badge */}
                          {hasVideo && (
                            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                              <Video className="h-2.5 w-2.5 text-primary" /> Video
                            </Badge>
                          )}
                        </div>

                        {/* Meta: Category, Owner, Location */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-semibold text-foreground/80">
                            {b.categories?.name || "Uncategorized"}
                          </span>
                          <span>•</span>
                          <span>
                            Owner:{" "}
                            <strong className="text-foreground/90">
                              {owner?.display_name || owner?.username || owner?.email || "Admin created"}
                            </strong>
                          </span>
                          {b.address && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{b.address}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Created {new Date(b.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Profile Completion Bar */}
                        <div className="flex items-center gap-2 pt-1 max-w-xs">
                          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                completeness >= 80
                                  ? "bg-emerald-500"
                                  : completeness >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${completeness}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {completeness}% profile
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                      {/* Pending actions */}
                      {b.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(b.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 px-2.5"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Rejection feedback message (optional):") || "";
                              rejectMutation.mutate({ id: b.id, reason });
                            }}
                            className="text-xs font-bold rounded-xl h-8 px-2.5"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {/* Queen AI Concierge 1-Click Setup */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQueenModalBiz(b)}
                        className="rounded-xl h-8 px-2.5 text-xs font-bold bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        title="Open Queen 1-Click AI Full Setup Concierge"
                      >
                        <Crown className="h-3.5 w-3.5 mr-1 fill-amber-500 text-amber-500" />
                        Queen Setup
                      </Button>

                      {/* View details */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewDetailsBiz(b)}
                        className="rounded-xl h-8 text-xs font-semibold"
                        title="View Full Profile Details"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>

                      {/* Public Link */}
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="rounded-xl h-8 text-xs font-semibold text-primary"
                        title="Open Public Page"
                      >
                        <Link to={`/businesses/${b.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>

                      {/* Verification Quick Action */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setVerifyModalBiz(b)}
                        className={`rounded-xl h-8 text-xs font-semibold ${
                          isVerified ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"
                        }`}
                        title="Manage Blue Tick Verification"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>

                      {/* Boost / Feature Quick Action */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBoostModalBiz(b)}
                        className={`rounded-xl h-8 text-xs font-semibold ${
                          isBoosted ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        }`}
                        title="Feature Business"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>

                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(b)}
                        className="rounded-xl h-8 w-8 p-0"
                        title="Edit Business"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Suspend / Activate toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActiveMutation.mutate({ id: b.id, active: !b.active })}
                        className={`rounded-xl h-8 text-xs font-semibold ${
                          b.active ? "text-amber-600" : "text-emerald-600"
                        }`}
                        title={b.active ? "Suspend / Hide from Directory" : "Activate Business"}
                      >
                        {b.active ? "Suspend" : "Activate"}
                      </Button>

                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${b.name}"? This action cannot be undone.`)) {
                            deleteMutation.mutate(b.id);
                          }
                        }}
                        className="rounded-xl h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Delete Business"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Add Business Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          if (!v) resetForm();
          setEditOpen(v);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editing ? "Edit Business" : "Add New Business"}
            </DialogTitle>
            <DialogDescription>
              Configure the public directory record, contact channels, and trust credentials.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ ...form, id: editing?.id });
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Business Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: editing ? form.slug : generateSlug(e.target.value),
                    })
                  }
                  placeholder="e.g. Lagos Supreme Logistics"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Directory Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. lagos-supreme-logistics"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Business Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Phone / WhatsApp</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Office Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Suite 14, Victoria Island, Lagos"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Official Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">About / Bio Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Comprehensive description of services, turnaround, and client benefits..."
              />
            </div>

            {/* Logo Upload & Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Business Logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} />
              {form.logo_url && (
                <div className="flex items-center gap-3 p-2 rounded-xl border bg-muted/30 w-fit">
                  <div className="h-16 w-16 rounded-lg bg-card border overflow-hidden flex items-center justify-center p-1">
                    <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Current Logo</p>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                      className="text-destructive hover:underline font-medium mt-0.5"
                    >
                      Remove logo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Gallery Images (if editing) */}
            {editing?.id && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold">
                  <ImagePlus className="h-4 w-4 text-primary" /> Product &amp; Service Showcase Gallery
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  disabled={galleryUploading}
                />
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {galleryImages.map((img: any) => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden border">
                        <img
                          src={img.image_url}
                          alt={img.caption || ""}
                          className="h-20 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => deleteGalleryImage(img.id)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Social Links &amp; Metadata (JSON)</Label>
              <Textarea
                rows={2}
                value={form.social_links}
                onChange={(e) => setForm({ ...form, social_links: e.target.value })}
                placeholder='{"youtube_video_url": "...", "instagram": "..."}'
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })}
                />
                <Label className="text-xs font-bold">Featured / Spotlight</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label className="text-xs font-bold">Active &amp; Visible</Label>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="font-bold">
                {editing ? "Update Business" : "Create Business"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Business Full Details Dialog */}
      {viewDetailsBiz && (
        <Dialog open={!!viewDetailsBiz} onOpenChange={(v) => !v && setViewDetailsBiz(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-muted border overflow-hidden flex items-center justify-center p-1 shrink-0">
                    {viewDetailsBiz.logo_url ? (
                      <img src={viewDetailsBiz.logo_url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      {viewDetailsBiz.name}
                      {viewDetailsBiz.social_links?.verified && (
                        <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0" />
                      )}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">{viewDetailsBiz.categories?.name || "Commerce"}</p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm pt-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border text-xs">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-bold capitalize text-foreground mt-0.5">{viewDetailsBiz.status || "Active"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Directory Visibility:</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {viewDetailsBiz.active ? "Visible in Directory" : "Hidden / Suspended"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone / WhatsApp:</span>
                  <p className="font-bold text-foreground mt-0.5">{viewDetailsBiz.phone || "Not set"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Address:</span>
                  <p className="font-bold text-foreground mt-0.5">{viewDetailsBiz.address || "Not set"}</p>
                </div>
              </div>

              {viewDetailsBiz.description && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    About / Description
                  </h4>
                  <p className="text-xs text-foreground/90 whitespace-pre-line bg-card p-3 rounded-xl border">
                    {viewDetailsBiz.description}
                  </p>
                </div>
              )}

              {/* Services List */}
              {Array.isArray(viewDetailsBiz.services) && viewDetailsBiz.services.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Services Offered ({viewDetailsBiz.services.length})
                  </h4>
                  <div className="grid gap-2">
                    {viewDetailsBiz.services.map((s: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl border bg-card text-xs">
                        <p className="font-bold text-foreground">{s.title}</p>
                        {s.description && <p className="text-muted-foreground mt-0.5">{s.description}</p>}
                        {s.price && <p className="text-primary font-bold mt-1">Price: {s.price}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube Video Embed Preview */}
              {viewDetailsBiz.social_links?.youtube_video_url && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-rose-500" /> Business YouTube Showcase
                  </h4>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {viewDetailsBiz.social_links.youtube_video_url}
                  </p>
                </div>
              )}

              {/* Queen AI Concierge Automated Setup Action Card */}
              <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                    Queen Service Executive AI Setup
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    1-Click takeover: generate SEO &amp; brand copy, create services catalog, verify blue tick, rank featured &amp; launch live banner ad.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const target = viewDetailsBiz;
                    setViewDetailsBiz(null);
                    setQueenModalBiz(target);
                  }}
                  className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white font-bold text-xs rounded-xl shrink-0 gap-1.5 shadow-sm"
                >
                  <Crown className="h-3.5 w-3.5 fill-current" />
                  Launch Queen Concierge
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
                  <Link to={`/businesses/${viewDetailsBiz.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Public Profile
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setViewDetailsBiz(null);
                    openEdit(viewDetailsBiz);
                  }}
                  className="rounded-xl font-bold"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Grant/Revoke Verification Modal */}
      {verifyModalBiz && (
        <Dialog open={!!verifyModalBiz} onOpenChange={(v) => !v && setVerifyModalBiz(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <ShieldCheck className="h-6 w-6" />
                <DialogTitle>Business Verification (Blue Tick)</DialogTitle>
              </div>
              <DialogDescription>
                Grant or revoke official verified status for &ldquo;{verifyModalBiz.name}&rdquo;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-800 dark:text-sky-200">
                The Blue Tick badge appears across search results, directory cards, product detail pages, and public profiles to establish verified credibility.
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Verification Duration</Label>
                <Select
                  value={String(verifyDurationDays)}
                  onValueChange={(v) => setVerifyDurationDays(Number(v))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">1 Month (30 Days)</SelectItem>
                    <SelectItem value="90">3 Months (90 Days)</SelectItem>
                    <SelectItem value="180">6 Months (180 Days)</SelectItem>
                    <SelectItem value="365">1 Year (365 Days)</SelectItem>
                    <SelectItem value="3650">10 Years / Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Admin Audit Notes (Optional)</Label>
                <Input
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Verified CAC registration and physical office"
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                {verifyModalBiz.social_links?.verified ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      updateVerificationMutation.mutate({
                        biz: verifyModalBiz,
                        verified: false,
                      })
                    }
                    className="font-bold text-xs rounded-xl"
                    disabled={updateVerificationMutation.isPending}
                  >
                    Revoke Verification
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVerifyModalBiz(null)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateVerificationMutation.mutate({
                        biz: verifyModalBiz,
                        verified: true,
                        days: verifyDurationDays,
                      })
                    }
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl gap-1.5"
                    disabled={updateVerificationMutation.isPending}
                  >
                    <ShieldCheck className="h-4 w-4" /> Grant Blue Tick
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Grant/Revoke Boost Modal */}
      {boostModalBiz && (
        <Dialog open={!!boostModalBiz} onOpenChange={(v) => !v && setBoostModalBiz(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-6 w-6" />
                <DialogTitle>Feature &amp; Spotlight Business</DialogTitle>
              </div>
              <DialogDescription>
                Elevate &ldquo;{boostModalBiz.name}&rdquo; with golden badge and priority ranking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Spotlight Duration (Days)</Label>
                <Select
                  value={String(boostDurationDays)}
                  onValueChange={(v) => setBoostDurationDays(Number(v))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Days Spotlight</SelectItem>
                    <SelectItem value="7">7 Days High Visibility</SelectItem>
                    <SelectItem value="14">14 Days High Visibility</SelectItem>
                    <SelectItem value="30">30 Days Maximum Impact</SelectItem>
                    <SelectItem value="90">90 Days Platinum Showcase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                {boostModalBiz.featured ||
                (boostModalBiz.boosted_until && new Date(boostModalBiz.boosted_until) > new Date()) ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      updateBoostMutation.mutate({
                        biz: boostModalBiz,
                        featured: false,
                      })
                    }
                    className="font-bold text-xs rounded-xl"
                    disabled={updateBoostMutation.isPending}
                  >
                    End Promotion
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBoostModalBiz(null)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateBoostMutation.mutate({
                        biz: boostModalBiz,
                        featured: true,
                        days: boostDurationDays,
                      })
                    }
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl gap-1.5"
                    disabled={updateBoostMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4" /> Feature Business
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Queen Service AI Concierge Modal */}
      {queenModalBiz && (
        <QueenServiceConciergeModal
          open={!!queenModalBiz}
          onOpenChange={(open) => !open && setQueenModalBiz(null)}
          business={queenModalBiz}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
            queryClient.invalidateQueries({ queryKey: ["admin-queen-ads-count"] });
          }}
        />
      )}
    </div>
  );
}

function AutoApproveCard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useState(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "feature_business_auto_approve")
        .maybeSingle();
      setEnabled(["on", "true", "1"].includes(data?.value || ""));
      setLoading(false);
    })();
  });

  const toggle = async (next: boolean) => {
    setSaving(true);
    setEnabled(next);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "feature_business_auto_approve", value: next ? "on" : "off" },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      setEnabled(!next);
    } else {
      toast.success(
        next
          ? "Auto-approval ON — new business listings go live instantly"
          : "Auto-approval OFF — submissions require admin review"
      );
    }
  };

  if (loading) return null;
  return (
    <Card className="border-primary/30 bg-primary/5 rounded-2xl">
      <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground">Auto-Approve New Business Listings</p>
            <p className="text-[11px] text-muted-foreground">
              When enabled, submitted businesses go live immediately without waiting for manual admin approval.
            </p>
          </div>
        </div>
        <Switch checked={enabled} disabled={saving} onCheckedChange={toggle} />
      </CardContent>
    </Card>
  );
}
