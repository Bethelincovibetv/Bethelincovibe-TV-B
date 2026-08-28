import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Upload,
  Plus,
  Trash2,
  Briefcase,
  User,
  Globe2,
  ImagePlus,
  Palette,
  Check,
  Sparkles,
  Video,
  Play,
  BadgeCheck,
  ShieldCheck,
  Wand2,
  ExternalLink,
  Flame,
  Crown,
  Building2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playNotificationAudio } from "@/lib/notificationSound";
import PhoneInput from "@/components/PhoneInput";
import AIProfileEnhancerDialog from "@/components/AIProfileEnhancerDialog";
import AIServiceDesignerDialog from "@/components/AIServiceDesignerDialog";
import ServiceGraphicPickerModal from "@/components/ServiceGraphicPickerModal";
import VerificationModal from "@/components/VerificationModal";
import AILogoGeneratorModal from "@/components/AILogoGeneratorModal";
import BusinessDefaultLogo from "@/components/directory/BusinessDefaultLogo";
import VerifiedBadge, { VerifiedPillBadge } from "@/components/VerifiedBadge";
import BusinessLocationPicker, { LocationData } from "@/components/maps/BusinessLocationPicker";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import { PRESET_BUSINESS_CATEGORIES, MAJOR_CITIES_LOCATIONS } from "@/lib/businessCategories";

// Production-safe Vite static asset imports (resolves cleanly on Vercel)
import bgTech from "@/assets/images/bg_tech_innovation_1787551368560.jpg";
import bgFashion from "@/assets/images/bg_fashion_luxury_1787551382249.jpg";
import bgCreative from "@/assets/images/bg_creative_design_1787551396312.jpg";

export const PRESET_BACKGROUNDS = [
  {
    id: "tech",
    label: "Tech & Innovation 3D",
    category: "Technology",
    url: bgTech,
    fallbackUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-blue-600 via-indigo-600 to-cyan-700",
  },
  {
    id: "fashion",
    label: "Fashion & Luxury Gold",
    category: "Fashion",
    url: bgFashion,
    fallbackUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-amber-500 via-yellow-600 to-orange-600",
  },
  {
    id: "creative",
    label: "Creative & Design Magenta",
    category: "Arts & Media",
    url: bgCreative,
    fallbackUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-purple-600 via-fuchsia-600 to-pink-600",
  },
  {
    id: "emerald",
    label: "Finance & Enterprise Emerald",
    category: "Finance",
    url: null,
    fallbackUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
  },
  {
    id: "sunset",
    label: "Food & Events Sunset",
    category: "Food",
    url: null,
    fallbackUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
  },
  {
    id: "ocean",
    label: "Retail & E-Commerce",
    category: "Commerce",
    url: null,
    fallbackUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-blue-600 via-indigo-600 to-sky-700",
  },
  {
    id: "noir",
    label: "Executive Noir",
    category: "Corporate",
    url: null,
    fallbackUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=80",
    gradient: "from-zinc-800 via-zinc-900 to-black",
  },
];

export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

export default function UserProfileEdit() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [aiEnhancerOpen, setAiEnhancerOpen] = useState(false);
  const [aiDesignerOpen, setAiDesignerOpen] = useState(false);
  const [graphicPickerOpen, setGraphicPickerOpen] = useState(false);
  const [activeGraphicServiceIndex, setActiveGraphicServiceIndex] = useState<number | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [aiLogoModalOpen, setAiLogoModalOpen] = useState(false);
  const [userSupplierId, setUserSupplierId] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Location state
  const [location, setLocation] = useState<LocationData>({
    country: "Nigeria",
    state: "Lagos State",
    city: "Lagos",
    address: "",
    latitude: 6.5244,
    longitude: 3.3792,
  });

  const loadData = async () => {
    if (!user) return;

    // Load categories
    const { data: catData } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("type", "business")
      .order("name");
    if (catData && catData.length > 0) {
      setDbCategories(catData);
    }

    const [{ data: pData }, { data: supData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("suppliers")
        .select("id, category_id, address, city, state, country, latitude, longitude, cover_template, phone, website")
        .eq("submitted_by", user.id)
        .maybeSingle(),
    ]);

    if (pData) {
      const raw = Array.isArray((pData as any).services) ? (pData as any).services : [];
      const services = raw.map((s: any) => (typeof s === "string" ? { title: s } : s));
      const socialLinks = pData.social_links || {};

      setProfile({
        ...pData,
        social_links: socialLinks,
        services,
      });

      // Populate location from profile or supplier
      const profileLoc = socialLinks.location;
      if (profileLoc && typeof profileLoc === "object") {
        setLocation({
          country: profileLoc.country || supData?.country || "Nigeria",
          state: profileLoc.state || supData?.state || "Lagos State",
          city: profileLoc.city || supData?.city || "Lagos",
          address: profileLoc.address || supData?.address || "",
          latitude: typeof profileLoc.latitude === "number" ? profileLoc.latitude : (typeof supData?.latitude === "number" ? supData.latitude : 6.5244),
          longitude: typeof profileLoc.longitude === "number" ? profileLoc.longitude : (typeof supData?.longitude === "number" ? supData.longitude : 3.3792),
        });
      } else if (supData) {
        setLocation({
          country: supData.country || "Nigeria",
          state: supData.state || "Lagos State",
          city: supData.city || "Lagos",
          address: supData.address || "",
          latitude: typeof supData.latitude === "number" ? supData.latitude : 6.5244,
          longitude: typeof supData.longitude === "number" ? supData.longitude : 3.3792,
        });
      }
    }

    if (supData?.id) {
      setUserSupplierId(supData.id);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;

  const isVerified =
    !!profile.social_links?.verified ||
    (!!profile.social_links?.verified_until &&
      new Date(profile.social_links.verified_until) > new Date());

  const updateField = (field: string, value: any) =>
    setProfile((p: any) => ({ ...p, [field]: value }));

  const updateSocial = (key: string, value: string) =>
    setProfile((p: any) => ({
      ...p,
      social_links: { ...(p.social_links || {}), [key]: value },
    }));

  const addService = () => {
    const list = [
      ...(profile.services || []),
      { title: "", description: "", image_url: "", link_url: "" },
    ].slice(0, 20);
    setProfile((p: any) => ({ ...p, services: list }));
  };

  const removeService = (i: number) => {
    setProfile((p: any) => ({
      ...p,
      services: (p.services || []).filter((_: any, j: number) => j !== i),
    }));
  };

  const updateService = (i: number, patch: any) => {
    setProfile((p: any) => ({
      ...p,
      services: (p.services || []).map((s: any, j: number) =>
        j === i ? { ...s, ...patch } : s
      ),
    }));
  };

  const onServiceImage = async (i: number, file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/service-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from("guest-submissions")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
    updateService(i, { image_url: data.publicUrl });
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("guest-submissions")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
      updateField("avatar_url", data.publicUrl);
      toast.success("Profile photo uploaded!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("guest-submissions")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
      updateField("background_url", data.publicUrl);
      toast.success("Custom website cover uploaded!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const username = profile.username
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      const services = (profile.services || []).filter((s: any) => s.title?.trim());

      // Identify category
      const currentCatSlug = profile.social_links?.category_slug || profile.background_template || "tech";
      const matchedDbCat = dbCategories.find(
        (c) => c.slug === currentCatSlug || c.id === profile.social_links?.category_id
      );
      const catId = matchedDbCat?.id || profile.social_links?.category_id || null;
      const catName = matchedDbCat?.name || PRESET_BUSINESS_CATEGORIES.find((c) => c.slug === currentCatSlug)?.name || "Professional Services";

      const updatedSocialLinks = {
        ...(profile.social_links || {}),
        category_slug: currentCatSlug,
        category_name: catName,
        category_id: catId,
        location: {
          country: location.country || "Nigeria",
          state: location.state || "Lagos State",
          city: location.city || "Lagos",
          address: location.address || "",
          latitude: location.latitude ?? 6.5244,
          longitude: location.longitude ?? 3.3792,
        },
      };

      const payload: any = {
        user_id: user.id,
        email: user.email,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        background_url: profile.background_url || null,
        background_template: profile.background_template || "tech",
        username: username || null,
        whatsapp: profile.whatsapp,
        social_links: updatedSocialLinks,
        services,
        is_public: profile.is_public !== false,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      // Automatically sync business directory presence in `suppliers` table
      if (profile.display_name || username) {
        const { data: existingBiz } = await supabase
          .from("suppliers")
          .select("id, slug")
          .eq("submitted_by", user.id)
          .maybeSingle();

        const bizSlug =
          username ||
          (profile.display_name
            ? profile.display_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") +
              "-" +
              user.id.slice(0, 5)
            : user.id.slice(0, 8));

        const bizPayload: any = {
          name: profile.display_name || username || "Verified Business",
          slug: existingBiz?.slug || bizSlug,
          category_id: catId,
          description: profile.bio || null,
          logo_url: profile.avatar_url || null,
          cover_url: profile.background_url || null,
          cover_template: profile.background_template || "tech",
          phone: profile.whatsapp || null,
          website: profile.social_links?.website || null,
          social_links: updatedSocialLinks,
          services: services,
          country: location.country || "Nigeria",
          state: location.state || "Lagos State",
          city: location.city || "Lagos",
          address: location.address || null,
          latitude: location.latitude ?? 6.5244,
          longitude: location.longitude ?? 3.3792,
          submitted_by: user.id,
          active: profile.is_public !== false,
          status: "approved",
        };

        if (existingBiz?.id) {
          await supabase.from("suppliers").update(bizPayload).eq("id", existingBiz.id);
          setUserSupplierId(existingBiz.id);
        } else {
          const { data: newBiz } = await supabase.from("suppliers").insert(bizPayload).select("id").maybeSingle();
          if (newBiz?.id) setUserSupplierId(newBiz.id);
        }
      }

      // Record congratulations notification
      await supabase.from("user_notifications").insert({
        user_id: user.id,
        title: "🎉 Congratulations on Updating Your Business Profile!",
        message: `Your verified business listing "${profile.display_name || username}" is active on Bethelincovibe TV Directory.`,
        type: "system",
        link: username ? `/u/${username}` : "/dashboard",
      }).catch(() => {});

      // Trigger celebration sound & confetti
      try {
        confetti({
          particleCount: 130,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
        });
        playNotificationAudio("bethel_vibe");
      } catch {}

      toast.success("Public Profile & Business Directory presence saved!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const ytVideoId = extractYouTubeVideoId(profile.social_links?.youtube_video_url);
  const currentCategorySlug = profile.social_links?.category_slug || profile.background_template || "tech";

  return (
    <GoogleMapsProvider>
      <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
        <Helmet>
          <title>Edit Public Business Profile | Bethelincovibe TV</title>
        </Helmet>

        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Link>
          </Button>

          {profile.username && (
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1">
              <Link to={`/u/${profile.username}`} target="_blank">
                <Globe2 className="h-3.5 w-3.5 text-primary" /> View Live Profile <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>

        {/* Top Banner: Verification & AI Quick Action Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Verification Status Card */}
          <Card className="border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0" />
                  <p className="text-xs font-black text-foreground">
                    {isVerified ? "Verified Active" : "Blue Tick Verification"}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isVerified
                    ? `Active until ${new Date(profile.social_links.verified_until).toLocaleDateString()}`
                    : "Boost buyer trust & rank"}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setVerifyModalOpen(true)}
                className="shrink-0 rounded-xl font-black text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
              >
                <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                {isVerified ? "Manage" : "Get Verified"}
              </Button>
            </CardContent>
          </Card>

          {/* AI Copywriter Quick Action */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-black text-foreground">AI Copywriter</p>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Auto-generate bio & services
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setAiEnhancerOpen(true)}
                className="shrink-0 rounded-xl font-black text-xs bg-gradient-to-r from-primary to-purple-600 text-white shadow-sm"
              >
                <Wand2 className="h-3.5 w-3.5 mr-1" />
                AI Enhance
              </Button>
            </CardContent>
          </Card>

          {/* AI Logo Generator Quick Action */}
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-black text-foreground">AI Logo Studio</p>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Create 3D & Vector brand logos
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setAiLogoModalOpen(true)}
                className="shrink-0 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Create Logo
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> My Business Profile & Directory Site
              </CardTitle>
              {userSupplierId && (
                <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold text-amber-600 border-amber-500/40">
                  <Link to={`/dashboard/businesses/${userSupplierId}/boost`}>
                    <Flame className="h-3.5 w-3.5 mr-1 text-amber-500" /> Feature Business
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Avatar / Profile Logo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/20 p-4 rounded-2xl border border-border/60">
              <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden flex items-center justify-center text-2xl font-black text-primary ring-4 ring-primary/20 shrink-0 shadow-sm relative">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BusinessDefaultLogo
                    name={profile.display_name || user.email}
                    category={profile.background_template || "Enterprise"}
                    size="xl"
                    shape="rounded-2xl"
                    className="w-full h-full"
                  />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-black block">Business Logo / Profile Mark</Label>
                  {isVerified && <VerifiedBadge verified={true} size="sm" />}
                  {!profile.avatar_url && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30 font-bold">
                      Dynamic AI Fallback Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your logo is showcased on the directory, map pins, business page header, and marketplace.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input type="file" accept="image/*" id="avatar" hidden onChange={uploadAvatar} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById("avatar")?.click()}
                    className="rounded-xl font-bold text-xs h-8"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setAiLogoModalOpen(true)}
                    className="rounded-xl font-black text-xs h-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Logo Generator
                  </Button>
                </div>
              </div>
            </div>

            {/* Business Category Selection */}
            <div className="space-y-2 border-t pt-5">
              <Label className="text-xs font-black flex items-center gap-1.5 text-foreground">
                <Building2 className="h-4 w-4 text-primary" /> Official Business Category *
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Determines how customers discover you in the directory filter, search algorithms, and category hubs.
              </p>
              <Select
                value={currentCategorySlug}
                onValueChange={(val) => {
                  const matched = dbCategories.find((c) => c.slug === val);
                  const catName = matched?.name || PRESET_BUSINESS_CATEGORIES.find((c) => c.slug === val)?.name || "Professional Services";
                  setProfile((prev: any) => ({
                    ...prev,
                    background_template: val,
                    social_links: {
                      ...(prev.social_links || {}),
                      category_slug: val,
                      category_name: catName,
                      category_id: matched?.id || null,
                    },
                  }));
                }}
              >
                <SelectTrigger className="h-11 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Select Business Category" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {(dbCategories.length > 0 ? dbCategories : PRESET_BUSINESS_CATEGORIES).map((cat) => (
                    <SelectItem key={cat.id || cat.slug} value={cat.slug} className="text-xs font-medium">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Physical Location Picker */}
            <div className="space-y-3 border-t pt-5">
              <BusinessLocationPicker
                value={location}
                onChange={(newLoc) => {
                  setLocation(newLoc);
                }}
              />
            </div>

            {/* AI Category Website Background Selector */}
            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-black flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-primary" /> Public Profile Background Theme
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Select a 3D category cover or upload your custom high-resolution banner.
                  </p>
                </div>
                <div>
                  <input type="file" accept="image/*" id="cover" hidden onChange={uploadCover} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingCover}
                    onClick={() => document.getElementById("cover")?.click()}
                    className="rounded-xl text-xs font-bold"
                  >
                    <ImagePlus className="h-3.5 w-3.5 mr-1" /> Custom Banner
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {PRESET_BACKGROUNDS.map((bg) => {
                  const isSelected =
                    profile.background_template === bg.id ||
                    (bg.url && profile.background_url === bg.url);
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        if (bg.url) {
                          updateField("background_url", bg.url);
                        } else {
                          updateField("background_url", null);
                        }
                        updateField("background_template", bg.id);
                      }}
                      className={`relative rounded-2xl overflow-hidden h-20 text-left border-2 transition-all p-2 flex flex-col justify-between ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 scale-[1.02] shadow-md"
                          : "border-border/60 opacity-80 hover:opacity-100"
                      }`}
                    >
                      {bg.url ? (
                        <img
                          src={bg.url}
                          alt={bg.label}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = bg.fallbackUrl;
                          }}
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient}`} />
                      )}
                      <div className="absolute inset-0 bg-black/45" />
                      <div className="relative z-10 flex items-center justify-between">
                        <Badge className="bg-black/60 text-white font-extrabold text-[9px] px-1.5 py-0 border-0">
                          {bg.category}
                        </Badge>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <span className="relative z-10 text-[11px] font-bold text-white drop-shadow-md truncate">
                        {bg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Business Name & Public URL Slug */}
            <div className="space-y-4 border-t pt-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-black">Business / Display Name *</Label>
                <Input
                  value={profile.display_name || ""}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  placeholder="e.g. Acme Enterprise & Logistics"
                  maxLength={100}
                  className="rounded-xl text-xs h-10 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black">
                  Custom Public Username / URL (e.g. /u/yourname)
                </Label>
                <Input
                  value={profile.username || ""}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="acme-enterprises"
                  maxLength={50}
                  className="rounded-xl text-xs h-10 font-mono"
                />
                {profile.username && (
                  <p className="text-[11px] text-muted-foreground">
                    Your Public Profile URL:{" "}
                    <code className="text-primary font-bold">/u/{profile.username}</code>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black">About / Business Bio Statement</Label>
                  <button
                    type="button"
                    onClick={() => setAiEnhancerOpen(true)}
                    className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> Enhance with AI
                  </button>
                </div>
                <Textarea
                  value={profile.bio || ""}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={3}
                  maxLength={600}
                  placeholder="Describe your business, values, product range, and what sets you apart..."
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* YouTube Business Story Video Integration */}
            <div className="space-y-3 border-t pt-5">
              <div className="space-y-1">
                <Label className="text-xs font-black flex items-center gap-1.5 text-foreground">
                  <Video className="h-4 w-4 text-red-500" /> YouTube Business Video URL ("Watch Our Story")
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Paste a YouTube video or Shorts link to feature your official business video prominently on your Public Business Profile and Directory listing.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={profile.social_links?.youtube_video_url || ""}
                  onChange={(e) => updateSocial("youtube_video_url", e.target.value)}
                  className="rounded-xl text-xs h-10 flex-1 font-mono"
                />
                {profile.social_links?.youtube_video_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSocial("youtube_video_url", "")}
                    className="rounded-xl text-xs text-destructive"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Live YouTube Video Preview */}
              {ytVideoId ? (
                <div className="rounded-2xl overflow-hidden border border-red-500/30 bg-black/90 p-2 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Badge className="bg-red-600 text-white text-[10px] font-black gap-1">
                      <Play className="h-2.5 w-2.5 fill-white" /> YouTube Video Preview
                    </Badge>
                    <span className="text-[10px] text-slate-300">Ready to display on profile</span>
                  </div>
                  <div className="aspect-video w-full rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytVideoId}?rel=0`}
                      title="Business Story Video Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              ) : profile.social_links?.youtube_video_url ? (
                <p className="text-[11px] text-amber-600 font-medium">
                  ⚠️ Invalid YouTube link format. Please provide a standard link like https://youtube.com/watch?v=xyz or https://youtu.be/xyz
                </p>
              ) : null}
            </div>

            {/* Services Section */}
            <div className="space-y-3 border-t pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-black">
                    <Briefcase className="h-4 w-4 text-primary" /> Services & What We Offer ({(profile.services || []).length})
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Each service renders with full HD image previews, benefits, and direct WhatsApp action links.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAiDesignerOpen(true)}
                    className="rounded-xl text-xs font-black gap-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-sm"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> AI Service Designer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addService}
                    className="rounded-xl text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Manual
                  </Button>
                </div>
              </div>

              {(profile.services || []).map((svc: any, i: number) => (
                <Card key={i} className="p-3.5 space-y-2.5 bg-muted/30 border-border/70 rounded-2xl">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Service title (e.g. Express Solar Installation)"
                      value={svc.title || ""}
                      onChange={(e) => updateService(i, { title: e.target.value })}
                      className="rounded-xl text-xs h-9 font-bold"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeService(i)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Short description of this service and what is included..."
                    value={svc.description || ""}
                    onChange={(e) => updateService(i, { description: e.target.value })}
                    className="rounded-xl text-xs leading-relaxed"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Price (e.g. ₦50,000 or Free Quote)"
                      value={svc.price || ""}
                      onChange={(e) => updateService(i, { price: e.target.value })}
                      className="rounded-xl text-xs h-9"
                    />
                    <Input
                      placeholder="Direct action link (e.g. wa.me link or product URL)"
                      value={svc.link_url || ""}
                      onChange={(e) => updateService(i, { link_url: e.target.value })}
                      className="rounded-xl text-xs h-9"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      {svc.image_url && (
                        <img src={svc.image_url} alt="" className="h-12 w-12 rounded-xl object-cover border" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGraphicServiceIndex(i);
                          setGraphicPickerOpen(true);
                        }}
                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        {svc.image_url ? "Browse Stock Visuals" : "Source HD Stock Visual"}
                      </button>
                    </div>
                    <label className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer flex items-center gap-1">
                      <ImagePlus className="h-3.5 w-3.5" />
                      Upload Custom
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onServiceImage(i, f);
                        }}
                      />
                    </label>
                  </div>
                </Card>
              ))}
            </div>

            {/* Contact & WhatsApp */}
            <div className="space-y-2 border-t pt-5">
              <Label className="text-xs font-black">WhatsApp Business Contact</Label>
              <PhoneInput
                value={profile.whatsapp || ""}
                onChange={(v) => updateField("whatsapp", v)}
                placeholder="8012345678"
              />
              <p className="text-[11px] text-muted-foreground">
                Select your country code and enter your WhatsApp number — customers will be able to message your business instantly.
              </p>
            </div>

            {/* Social Media Links */}
            <div className="space-y-3 border-t pt-5">
              <Label className="flex items-center gap-2 text-xs font-black">
                <Globe2 className="h-4 w-4 text-primary" /> Social Channels & Links
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  placeholder="Instagram URL"
                  value={profile.social_links?.instagram || ""}
                  onChange={(e) => updateSocial("instagram", e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
                <Input
                  placeholder="Twitter / X URL"
                  value={profile.social_links?.twitter || ""}
                  onChange={(e) => updateSocial("twitter", e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
                <Input
                  placeholder="Facebook URL"
                  value={profile.social_links?.facebook || ""}
                  onChange={(e) => updateSocial("facebook", e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
                <Input
                  placeholder="LinkedIn URL"
                  value={profile.social_links?.linkedin || ""}
                  onChange={(e) => updateSocial("linkedin", e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Official Website URL (e.g. https://yourbusiness.com)"
                    value={profile.social_links?.website || ""}
                    onChange={(e) => updateSocial("website", e.target.value)}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between border-t pt-5">
              <div className="space-y-0.5">
                <Label className="text-xs font-black">Directory & Search Visibility</Label>
                <p className="text-[11px] text-muted-foreground">
                  Make your business public in the Bethelincovibe Business Directory and Google search.
                </p>
              </div>
              <Switch
                checked={profile.is_public !== false}
                onCheckedChange={(v) => updateField("is_public", v)}
              />
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full rounded-2xl font-black text-sm h-12 shadow-lg shadow-primary/20 gap-1.5"
              size="lg"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving Business Profile..." : "Save & Publish Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* AI Profile Enhancer Dialog */}
        <AIProfileEnhancerDialog
          open={aiEnhancerOpen}
          onOpenChange={setAiEnhancerOpen}
          currentProfile={profile}
          onApply={(patch) => {
            setProfile((prev: any) => ({
              ...prev,
              ...patch,
              social_links: {
                ...(prev.social_links || {}),
                ...(patch.social_links || {}),
              },
            }));
          }}
        />

        {/* AI Business Service Designer Dialog */}
        <AIServiceDesignerDialog
          open={aiDesignerOpen}
          onOpenChange={setAiDesignerOpen}
          businessName={profile.display_name || profile.username || "My Business"}
          category={currentCategorySlug}
          cityOrRegion={location.city || "Nigeria"}
          onApplyServices={(newServices) => {
            setProfile((prev: any) => ({
              ...prev,
              services: [...(prev.services || []), ...newServices],
            }));
            toast.success("AI Services added to profile! Click 'Save & Publish' to save.");
          }}
        />

        {/* Service Graphic Picker Modal */}
        {activeGraphicServiceIndex !== null && (
          <ServiceGraphicPickerModal
            open={graphicPickerOpen}
            onOpenChange={setGraphicPickerOpen}
            serviceTitle={profile.services?.[activeGraphicServiceIndex]?.title || profile.display_name}
            categoryHint={profile.background_template}
            currentImageUrl={profile.services?.[activeGraphicServiceIndex]?.image_url}
            onSelectImage={(url) => {
              setProfile((prev: any) => {
                const list = [...(prev.services || [])];
                if (list[activeGraphicServiceIndex]) {
                  list[activeGraphicServiceIndex] = {
                    ...list[activeGraphicServiceIndex],
                    image_url: url,
                  };
                }
                return { ...prev, services: list };
              });
            }}
          />
        )}

        {/* Paid Verification Modal */}
        <VerificationModal
          open={verifyModalOpen}
          onOpenChange={setVerifyModalOpen}
          currentVerifiedUntil={profile.social_links?.verified_until}
          onSuccess={loadData}
        />

        {/* AI Professional Logo Generator Studio */}
        <AILogoGeneratorModal
          open={aiLogoModalOpen}
          onOpenChange={setAiLogoModalOpen}
          businessName={profile.display_name || user.email || "My Business"}
          category={profile.background_template || "Professional Enterprise"}
          currentLogoUrl={profile.avatar_url}
          onSelectLogo={(logoDataUrl) => {
            setProfile((prev: any) => ({
              ...prev,
              avatar_url: logoDataUrl,
              social_links: {
                ...(prev.social_links || {}),
                logo_url: logoDataUrl,
              },
            }));
            toast.success("AI Brand Logo applied! Click 'Save & Publish' to save changes.");
          }}
        />
      </div>
    </GoogleMapsProvider>
  );
}
