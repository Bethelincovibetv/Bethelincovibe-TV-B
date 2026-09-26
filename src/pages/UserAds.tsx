import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft, Megaphone, Upload, Wallet, Sparkles, Image as ImageIcon,
  BarChart3, RefreshCw, Clock, Calendar, CheckCircle2, AlertCircle,
  ExternalLink, Eye, MousePointer, PlusCircle, TrendingUp, Copy, Check,
  Globe, Layout, Layers, Smartphone, PlayCircle, Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import FrontendSpecialistWidget from "@/components/ai/FrontendSpecialistWidget";
import LiveRotatingAdvert, { AdvertItem } from "@/components/ads/LiveRotatingAdvert";

export const PLACEMENT_OPTIONS = [
  { id: "blog", label: "Blog Articles & Guides", desc: "Shown across top editorial stories & sourcing posts" },
  { id: "dashboard", label: "User Dashboard Hub", desc: "High-visibility banner for logged-in traders & merchants" },
  { id: "shop", label: "Marketplace & Products", desc: "Integrated naturally into shop product grids" },
  { id: "listings", label: "Business Directory Listings", desc: "Promoted partner card in verified suppliers feed" },
  { id: "header", label: "Global Top Header", desc: "Sitewide top spotlight for maximum reach" },
  { id: "footer", label: "Global Footer Banner", desc: "Footnote placement across all platform pages" },
];

export const DISPLAY_TEMPLATE_OPTIONS = [
  {
    id: "full_flyer" as const,
    label: "Full Flyer / Poster",
    desc: "HD vertical flyer showcase with click-to-zoom lightbox. Best for flyers, menus, product banners, and event notices.",
    badge: "Flyer Specialist",
  },
  {
    id: "banner" as const,
    label: "Wide Panoramic Banner",
    desc: "Classic horizontal banner with side-by-side headline & call-to-action. Great for headers & editorial breaks.",
    badge: "Wide Horizon",
  },
  {
    id: "card" as const,
    label: "In-Feed Marketplace Card",
    desc: "Clean card layout styled naturally like products in the shop and directory. High click-through for products.",
    badge: "High CTR",
  },
  {
    id: "featured" as const,
    label: "Featured Partner Spotlight",
    desc: "VIP glowing gradient border with verified gold badge & elevated priority across all platform feeds.",
    badge: "VIP Showcase",
  },
  {
    id: "compact" as const,
    label: "Compact Minimalist Bar",
    desc: "Slim inline bar for clean unobtrusive visibility across feeds and footnotes.",
    badge: "Minimalist",
  },
];

export default function UserAds() {
  const { user, loading } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [costPerDay, setCostPerDay] = useState(500);
  const [ads, setAds] = useState<any[]>([]);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [duration, setDuration] = useState(7);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([
    "blog",
    "dashboard",
    "shop",
    "listings",
  ]);

  // Display Template State
  const [displayTemplate, setDisplayTemplate] = useState<"full_flyer" | "banner" | "card" | "featured" | "compact">("full_flyer");

  // Live preview & modal state
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewAdModal, setPreviewAdModal] = useState<any | null>(null);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reactivate modal state
  const [reactivatingAd, setReactivatingAd] = useState<any | null>(null);
  const [renewDays, setRenewDays] = useState(7);
  const [isRenewing, setIsRenewing] = useState(false);

  const reload = async () => {
    if (!user) return;
    const [{ data: w }, { data: setting }, { data: list }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "ad_cost_per_day").maybeSingle(),
      supabase.from("user_ads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setWallet(w);
    setCostPerDay(Number(setting?.value || 500));
    setAds(list || []);
  };

  useEffect(() => {
    reload();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const totalCost = costPerDay * duration;
  const balance = Number(wallet?.balance || 0);

  const togglePlacement = (placementId: string) => {
    setSelectedPlacements((prev) =>
      prev.includes(placementId)
        ? prev.filter((p) => p !== placementId)
        : [...prev, placementId]
    );
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ad-creatives").upload(path, file, { upsert: false });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("ad-creatives").getPublicUrl(path);
      setImageUrl(publicUrl);
      toast.success("Image banner uploaded successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !targetUrl.trim() || !imageUrl) {
      toast.error("Title, target URL, and banner image are required");
      return;
    }
    if (selectedPlacements.length === 0) {
      toast.error("Please select at least one ad placement area");
      return;
    }
    if (balance < totalCost) {
      toast.error("Insufficient wallet balance — please top up first");
      return;
    }

    setSubmitting(true);
    const placementString = selectedPlacements.join(",");

    const creativePayload = {
      display_template: displayTemplate,
      experience_type: "static",
      experience_config: {},
    };

    try {
      // 1. Attempt edge function submission first
      let edgeSuccess = false;
      try {
        const { data, error } = await supabase.functions.invoke("submit-ad", {
          body: {
            title: title.trim(),
            description: description.trim(),
            target_url: targetUrl.trim(),
            image_url: imageUrl,
            duration_days: duration,
            placement: placementString,
            creative_meta: creativePayload,
          },
        });
        if (!error && !(data as any)?.error) {
          edgeSuccess = true;
        }
      } catch {
        edgeSuccess = false;
      }

      // 2. Resilient Database Fallback if Edge function is offline
      if (!edgeSuccess) {
        // Deduct wallet balance
        const newBalance = Math.max(0, balance - totalCost);
        await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("user_id", user.id);

        // Record transaction
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: -totalCost,
          type: "ad_campaign",
          status: "completed",
          description: `Ad Campaign: "${title.trim()}" (${duration} days) [${displayTemplate}]`,
        });

        // Check site settings for auto-approve
        const { data: autoApproveSetting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "ad_auto_approve")
          .maybeSingle();

        const autoApprove = autoApproveSetting?.value !== "false";
        const now = new Date();
        const ends = new Date(now.getTime() + duration * 86400000);

        const { error: dbError } = await supabase.from("user_ads").insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          target_url: targetUrl.trim(),
          image_url: imageUrl,
          duration_days: duration,
          cost_amount: totalCost,
          placement: placementString,
          status: autoApprove ? "active" : "pending",
          starts_at: autoApprove ? now.toISOString() : null,
          ends_at: autoApprove ? ends.toISOString() : null,
          approved_at: autoApprove ? now.toISOString() : null,
          approved_by: autoApprove ? "system_auto" : null,
          impressions: 0,
          clicks: 0,
          ggd_response: creativePayload as any,
        });

        if (dbError) throw dbError;
      }

      toast.success("Ad campaign successfully created & published!");
      setTitle("");
      setDescription("");
      setTargetUrl("");
      setImageUrl("");
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecreateAd = (ad: any) => {
    setTitle(ad.title || "");
    setDescription(ad.description || "");
    setTargetUrl(ad.target_url || "");
    setImageUrl(ad.image_url || "");
    setDuration(Number(ad.duration_days) || 7);
    if (ad.placement) {
      const places = ad.placement.split(",").map((p: string) => p.trim());
      setSelectedPlacements(places.length > 0 ? places : ["blog", "dashboard", "shop", "listings"]);
    }
    const meta = ad.ggd_response && typeof ad.ggd_response === "object" ? ad.ggd_response : {};
    if (meta.display_template) {
      setDisplayTemplate(meta.display_template);
    }
    toast.success(`Loaded "${ad.title}" into creator. Review details and publish below!`);
    window.scrollTo({ top: 420, behavior: "smooth" });
  };

  const previewAdvertItem = useMemo<AdvertItem>(() => {
    return {
      id: "preview-ad-draft",
      title: title.trim() || "50% Off Modern Office Chairs & Desks",
      description:
        description.trim() ||
        "Ergonomic luxury mesh seating, executive mahogany desks, and workstation sets. Express nationwide delivery across Nigeria.",
      image_url:
        imageUrl ||
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&auto=format&fit=crop&q=80",
      target_url: targetUrl.trim() || "https://wa.me/2348000000000",
      click_url: targetUrl.trim() || "https://wa.me/2348000000000",
      sponsor_name: user?.user_metadata?.full_name || "Verified Brand Partner",
      badge_text: "Live Preview",
      urgency_tag: "🔥 Hot Deal",
      social_proof: "Over 3,400+ satisfied buyers",
      is_verified: true,
      display_template: displayTemplate,
      experience_type: "static",
      experience_config: {},
    };
  }, [
    title,
    description,
    imageUrl,
    targetUrl,
    displayTemplate,
    user,
  ]);

  const handleReactivate = async () => {
    if (!reactivatingAd) return;
    const renewCost = costPerDay * renewDays;
    if (balance < renewCost) {
      toast.error("Insufficient wallet balance to reactivate this campaign.");
      return;
    }

    setIsRenewing(true);
    try {
      let edgeSuccess = false;
      try {
        const { data, error } = await supabase.functions.invoke("submit-ad", {
          body: {
            action: "reactivate",
            ad_id: reactivatingAd.id,
            duration_days: renewDays,
          },
        });
        if (!error && !(data as any)?.error) {
          edgeSuccess = true;
        }
      } catch {
        edgeSuccess = false;
      }

      if (!edgeSuccess) {
        // Direct database deduction & reactivation
        const newBalance = Math.max(0, balance - renewCost);
        await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("user_id", user.id);

        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: -renewCost,
          type: "ad_renewal",
          status: "completed",
          description: `Campaign Reactivation: "${reactivatingAd.title}" (${renewDays} days)`,
        });

        const now = new Date();
        const ends = new Date(now.getTime() + renewDays * 86400000);

        const { error: upErr } = await supabase
          .from("user_ads")
          .update({
            status: "active",
            starts_at: now.toISOString(),
            ends_at: ends.toISOString(),
            duration_days: (Number(reactivatingAd.duration_days) || 0) + renewDays,
          })
          .eq("id", reactivatingAd.id);

        if (upErr) throw upErr;
      }

      toast.success(`Campaign renewed and reactivated for ${renewDays} days!`);
      setReactivatingAd(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Reactivation failed");
    } finally {
      setIsRenewing(false);
    }
  };

  // Performance totals
  const totalImpressions = ads.reduce((acc, a) => acc + (Number(a.impressions) || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (Number(a.clicks) || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-16">
      <Helmet>
        <title>Ad Network & Campaigns | Bethelincovibe TV</title>
      </Helmet>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-purple-800 via-indigo-900 to-slate-950 text-white px-4 py-8 rounded-b-3xl shadow-xl">
        <div className="container mx-auto max-w-4xl">
          <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-3">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Megaphone className="h-4 w-4" /> Bethelincovibe TV Advertising Platform
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">Campaign Manager &amp; Ad Delivery Engine</h1>
              <p className="text-xs text-purple-200 mt-1 max-w-lg">
                Promote your goods, store, and services systematically across Marketplace, Directory, Blog, and Dashboard slots.
              </p>
            </div>

            {/* Wallet Balance Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center justify-between sm:justify-start gap-4 shrink-0 shadow-lg">
              <div>
                <p className="text-[11px] text-purple-200 flex items-center gap-1 font-semibold">
                  <Wallet className="h-3.5 w-3.5 text-amber-400" /> Wallet Balance
                </p>
                <p className="text-2xl font-black text-white">₦{balance.toLocaleString()}</p>
              </div>
              <Button asChild variant="secondary" size="sm" className="font-bold text-xs rounded-xl shadow-md">
                <Link to="/dashboard/wallet">Top Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 mt-6 space-y-6">
        {/* Performance Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-primary" /> Total Impressions
            </p>
            <p className="text-xl font-black mt-1 text-foreground">{totalImpressions.toLocaleString()}</p>
          </Card>
          <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <MousePointer className="h-3.5 w-3.5 text-emerald-500" /> Total Clicks
            </p>
            <p className="text-xl font-black mt-1 text-emerald-600">{totalClicks.toLocaleString()}</p>
          </Card>
          <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Average CTR
            </p>
            <p className="text-xl font-black mt-1 text-foreground">{avgCtr}%</p>
          </Card>
        </div>

        {/* AI Marketing Director Specialist */}
        <FrontendSpecialistWidget
          agentId="marketing_ai"
          mode="banner"
          title="Director of Marketing & Growth Promotions"
          subtitle="Generates high-converting ad headlines, promotional hooks, and WhatsApp campaign scripts."
          initialOpen={false}
          contextData={{
            page: "ads_manager",
            walletBalance: balance,
            activeAdsCount: ads.length,
            costPerDay,
          }}
          customPrompts={[
            "Draft 3 High-Converting Ad Headlines for my Product",
            "Write a WhatsApp Promo Broadcast for Lagos Buyers",
            "Suggest best banner placement for maximum ROI",
            "Create a Limited-Time Discount Pitch",
          ]}
        />

        {/* Create / Recreate Ad Section */}
        <Card id="create-ad-form" className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Launch or Re-create Ad Campaign
            </CardTitle>
            <CardDescription className="text-xs">
              Fill in your campaign details and target placements. Cost is ₦{costPerDay.toLocaleString()}/day and deducted directly from your verified wallet balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Banner Image Upload */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Ad Banner Creative *</Label>
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 transition">
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden max-h-48 border shadow-sm">
                    <img src={imageUrl} alt="Ad creative preview" className="max-h-48 w-auto object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground py-4">
                    <ImageIcon className="h-9 w-9 mb-1 text-primary/60" />
                    <p className="text-xs font-semibold text-foreground">Click to upload your ad image</p>
                    <p className="text-[11px] text-muted-foreground">Recommended: 1200x628 or 728x90 (PNG/JPG up to 5MB)</p>
                  </div>
                )}
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-primary text-primary-foreground rounded-xl cursor-pointer hover:opacity-90 transition shadow-xs">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : imageUrl ? "Change Image" : "Upload Banner Image"}
                  </span>
                </label>
              </div>
            </div>

            {/* Title & Target URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Campaign Headline / Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., 50% Off Modern Office Chairs & Desks"
                  maxLength={80}
                  className="rounded-xl text-xs h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Target Landing URL / WhatsApp Link *</Label>
                <Input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/deal or https://wa.me/..."
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Description / Call to Action</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly tell prospective buyers why they should click or contact you..."
                maxLength={200}
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            {/* Step 2: Choose Display Template */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Layout className="h-3.5 w-3.5 text-primary" /> Select Display Template Layout *
                </Label>
                <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                  {DISPLAY_TEMPLATE_OPTIONS.find((t) => t.id === displayTemplate)?.badge}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {DISPLAY_TEMPLATE_OPTIONS.map((tmpl) => {
                  const isSelected = displayTemplate === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setDisplayTemplate(tmpl.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition text-left relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                          : "bg-muted/20 border-border/70 hover:bg-muted/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-extrabold text-xs text-foreground">{tmpl.label}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {tmpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{tmpl.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Preview */}
            <div className="p-4 bg-muted/30 rounded-3xl border border-border/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-extrabold text-foreground">Live Ad Banner Preview</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {displayTemplate.toUpperCase()}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className="h-7 text-xs font-bold"
                >
                  {showLivePreview ? "Hide Preview" : "Show Live Preview"}
                </Button>
              </div>

              {showLivePreview && (
                <div className="pt-1">
                  <p className="text-[11px] text-muted-foreground mb-3">
                    This is how your advert will look to visitors across the platform.
                  </p>
                  <div className="rounded-2xl border border-border/70 overflow-hidden bg-background p-2 sm:p-4 shadow-inner">
                    <LiveRotatingAdvert
                      ads={[previewAdvertItem]}
                      format={displayTemplate}
                      autoRotateInterval={100000}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Target Placements Checklist */}
            <div className="p-4 bg-muted/30 rounded-2xl border space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Target Advertising Placements</Label>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {selectedPlacements.length} of {PLACEMENT_OPTIONS.length} active
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {PLACEMENT_OPTIONS.map((opt) => {
                  const isChecked = selectedPlacements.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => togglePlacement(opt.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-foreground shadow-2xs"
                          : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={`placement-${opt.id}`}
                        checked={isChecked}
                        onCheckedChange={() => togglePlacement(opt.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-tight">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duration Slider */}
            <div className="p-4 bg-muted/40 rounded-2xl border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">
                  Campaign Duration: <span className="text-primary font-black text-sm">{duration} day{duration > 1 ? "s" : ""}</span>
                </Label>
                <Badge variant="outline" className="text-xs font-bold bg-background">
                  ₦{costPerDay.toLocaleString()} / day
                </Badge>
              </div>
              <Slider
                value={[duration]}
                min={1}
                max={30}
                step={1}
                onValueChange={(v) => setDuration(v[0])}
              />
            </div>

            {/* Pricing & Submit Action */}
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/5 to-card border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total Campaign Cost ({duration} days)</p>
                <p className="text-2xl font-black text-primary">₦{totalCost.toLocaleString()}</p>
                {balance < totalCost && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                    Needs ₦{(totalCost - balance).toLocaleString()} more in wallet
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {balance < totalCost ? (
                  <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto rounded-xl font-bold">
                    <Link to="/dashboard/wallet">Top Up Wallet</Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim() || !targetUrl.trim() || !imageUrl || selectedPlacements.length === 0}
                    className="w-full sm:w-auto rounded-xl font-black shadow-md bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:opacity-95"
                  >
                    {submitting ? "Launching..." : "Publish Campaign"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Ads List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> My Campaigns ({ads.length})
            </h2>
          </div>

          {ads.length === 0 ? (
            <Card className="p-10 text-center rounded-3xl border-dashed bg-card">
              <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">No Campaigns Created Yet</p>
              <p className="text-xs text-muted-foreground mt-1">Use the form above to launch your first advert across our network.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {ads.map((a) => {
                const isExpired = a.ends_at && isPast(new Date(a.ends_at));
                const impressions = Number(a.impressions || 0);
                const clicks = Number(a.clicks || 0);
                const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
                const meta = a.ggd_response && typeof a.ggd_response === "object" ? a.ggd_response : {};
                const adTemplate = meta.display_template || "full_flyer";
                const adExp = meta.experience_type || "static";

                return (
                  <Card key={a.id} className="border-border/80 rounded-2xl shadow-xs overflow-hidden bg-card hover:border-primary/40 transition">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {a.image_url ? (
                          <img src={a.image_url} alt={a.title} className="h-16 w-20 rounded-xl object-cover shrink-0 border shadow-2xs" />
                        ) : (
                          <div className="h-16 w-20 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                            <Megaphone className="h-6 w-6 text-muted-foreground opacity-40" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-foreground truncate">{a.title}</p>
                            {isExpired ? (
                              <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] font-extrabold">
                                EXPIRED
                              </Badge>
                            ) : (
                              <Badge
                                variant={
                                  a.status === "active"
                                    ? "default"
                                    : a.status === "failed" || a.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px] font-extrabold"
                              >
                                {a.status.toUpperCase()}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] font-semibold flex items-center gap-1">
                              <Layout className="h-2.5 w-2.5 text-primary" /> {adTemplate.replace("_", " ").toUpperCase()}
                            </Badge>
                            {a.placement && (
                              <Badge variant="outline" className="text-[9px] font-semibold">
                                {a.placement}
                              </Badge>
                            )}
                          </div>

                          <a
                            href={a.target_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                          >
                            {a.target_url} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
                            <span className="font-semibold text-emerald-600">₦{Number(a.cost_amount || 0).toLocaleString()}</span>
                            <span>·</span>
                            <span>{a.duration_days} days total</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-primary" /> {impressions} views
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3 text-emerald-500" /> {clicks} clicks ({ctr}% CTR)
                            </span>
                          </div>

                          {a.ends_at && (
                            <p className={`text-[11px] font-semibold flex items-center gap-1 ${isExpired ? "text-rose-500" : "text-amber-600"}`}>
                              <Clock className="h-3 w-3" />
                              {isExpired
                                ? `Ended on ${format(new Date(a.ends_at), "PP")}`
                                : `Ends in ${formatDistanceToNow(new Date(a.ends_at))}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end flex-wrap">
                        {/* Test & Preview Ad Button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewAdModal(a)}
                          className="rounded-xl font-bold text-xs gap-1 shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" /> Test Ad
                        </Button>

                        {/* Re-create / Duplicate Ad Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecreateAd(a)}
                          className="rounded-xl font-bold text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Copy className="h-3 w-3" /> Re-create Ad
                        </Button>

                        {/* Reactivate Button for Expired/Inactive Ads */}
                        {(isExpired || a.status === "inactive" || a.status === "paused") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setReactivatingAd(a);
                              setRenewDays(7);
                            }}
                            className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Reactivate
                          </Button>
                        )}

                        <Button asChild size="sm" variant="outline" className="rounded-xl font-bold text-xs gap-1.5 border-border/80">
                          <Link to={`/dashboard/ads/${a.id}/analytics`}>
                            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Analytics
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Test Ad Live Preview Dialog */}
      <Dialog open={!!previewAdModal} onOpenChange={(o) => !o && setPreviewAdModal(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-primary" /> Live Ad Interactive Test Bench
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preview how your standard banner advert renders with live image and action button routing.
            </DialogDescription>
          </DialogHeader>

          {previewAdModal && (() => {
            const meta = previewAdModal.ggd_response && typeof previewAdModal.ggd_response === "object" ? previewAdModal.ggd_response : {};
            const item: AdvertItem = {
              id: previewAdModal.id,
              title: previewAdModal.title,
              description: previewAdModal.description || "",
              image_url: previewAdModal.image_url,
              target_url: previewAdModal.target_url,
              click_url: previewAdModal.target_url,
              sponsor_name: user?.user_metadata?.full_name || "Verified Brand Partner",
              badge_text: "Live Ad",
              is_verified: true,
              display_template: meta.display_template || "full_flyer",
              experience_type: "static",
              experience_config: {},
            };

            return (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-muted-foreground">
                    Layout: <strong className="text-foreground">{item.display_template}</strong>
                  </span>
                </div>
                <div className="rounded-2xl border border-border/70 overflow-hidden bg-muted/20 p-3 sm:p-4 shadow-inner">
                  <LiveRotatingAdvert
                    ads={[item]}
                    format={item.display_template}
                    autoRotateInterval={100000}
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPreviewAdModal(null)} className="rounded-xl font-bold text-xs">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Reactivate Ad Modal Dialog */}
      <Dialog open={!!reactivatingAd} onOpenChange={(o) => !o && setReactivatingAd(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-500" /> Reactivate Expired Campaign
            </DialogTitle>
            <DialogDescription className="text-xs">
              Extend and immediately reactivate this ad. The duration cost will be deducted from your wallet balance.
            </DialogDescription>
          </DialogHeader>

          {reactivatingAd && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted/50 rounded-2xl border text-xs space-y-1">
                <p className="font-bold text-foreground">{reactivatingAd.title}</p>
                <p className="text-muted-foreground truncate">{reactivatingAd.target_url}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold">Select Renewal Duration</Label>
                  <span className="text-xs font-black text-primary">{renewDays} Days</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[7, 14, 21, 30].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={renewDays === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRenewDays(d)}
                      className="rounded-xl font-bold text-xs"
                    >
                      {d} Days
                    </Button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-card rounded-2xl border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Renewal Cost:</span>
                  <span className="font-black text-emerald-600 text-sm">₦{(costPerDay * renewDays).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Your Wallet Balance:</span>
                  <span className="font-bold text-foreground">₦{balance.toLocaleString()}</span>
                </div>
              </div>

              {balance < costPerDay * renewDays && (
                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Insufficient wallet balance. Please top up before renewing.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setReactivatingAd(null)} className="rounded-xl">
              Cancel
            </Button>
            {balance < costPerDay * renewDays ? (
              <Button asChild variant="secondary" className="rounded-xl font-bold">
                <Link to="/dashboard/wallet">Top Up Wallet</Link>
              </Button>
            ) : (
              <Button
                onClick={handleReactivate}
                disabled={isRenewing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black"
              >
                {isRenewing ? "Renewing..." : `Pay ₦${(costPerDay * renewDays).toLocaleString()} & Reactivate`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
