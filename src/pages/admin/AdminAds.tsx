import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Copy, Key, Megaphone, Pause, Play, Power, Pencil, Trash2,
  ShieldAlert, SlidersHorizontal, Globe, Clock, Calendar, DollarSign,
  ExternalLink, Search, RefreshCw, Sparkles, TrendingUp, Eye, MousePointer
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow, isPast } from "date-fns";

export default function AdminAds() {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [adPlacements, setAdPlacements] = useState<Record<string, string[]>>({});
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [editAd, setEditAd] = useState<any | null>(null);
  const [reactivateAd, setReactivateAd] = useState<any | null>(null);
  const [reactivateDays, setReactivateDays] = useState(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "expired" | "paused">("all");

  // Load master ad switches
  const { data: adControlSettings } = useQuery({
    queryKey: ["admin-site-settings-ads"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", [
        "ads_global_enabled",
        "ads_provider_adsense",
        "ads_provider_adsterra",
        "ads_provider_monetag",
        "ads_provider_startio",
        "ads_provider_native",
        "ads_provider_custom"
      ]);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const isGlobalAdsEnabled = adControlSettings?.ads_global_enabled !== "false";
  const isAdSenseEnabled = adControlSettings?.ads_provider_adsense !== "false";
  const isAdsterraEnabled = adControlSettings?.ads_provider_adsterra === "true";
  const isMonetagEnabled = adControlSettings?.ads_provider_monetag !== "false";
  const isStartIoEnabled = adControlSettings?.ads_provider_startio !== "false";
  const isNativeAdsEnabled = adControlSettings?.ads_provider_native !== "false";
  const isCustomAdsEnabled = adControlSettings?.ads_provider_custom !== "false";

  const toggleAdSetting = async (key: string, currentValue: boolean) => {
    const newValue = currentValue ? "false" : "true";
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    let err = null;
    if (existing) {
      const res = await supabase.from("site_settings").update({ value: newValue }).eq("key", key);
      err = res.error;
    } else {
      const res = await supabase.from("site_settings").insert({ key, value: newValue });
      err = res.error;
    }

    if (err) {
      toast.error(err.message);
    } else {
      toast.success("Ad switch updated successfully");
      try { localStorage.removeItem("bethel_thirdparty_ads_cache"); } catch {}
      qc.invalidateQueries();
    }
  };

  const setStatus = async (id: string, status: string, successMsg: string) => {
    const { error } = await supabase.from("user_ads").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(successMsg); qc.invalidateQueries({ queryKey: ["admin-ads"] }); }
  };

  const pause = (id: string) => setStatus(id, "paused", "Ad paused");
  const resume = (id: string) => setStatus(id, "active", "Ad resumed");
  const deactivate = (id: string) => setStatus(id, "inactive", "Ad deactivated");

  const handleAdminReactivate = async () => {
    if (!reactivateAd) return;
    const now = new Date();
    const days = Math.max(1, Number(reactivateDays || 7));
    const ends = new Date(now.getTime() + days * 86400000);

    const { error } = await supabase.from("user_ads").update({
      status: "active",
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      duration_days: (Number(reactivateAd.duration_days) || 0) + days,
    }).eq("id", reactivateAd.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Ad reactivated for ${days} days! (Expires on ${format(ends, "PPp")})`);
      setReactivateAd(null);
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
    }
  };

  const removeAd = async (id: string) => {
    if (!confirm("Delete this ad permanently?")) return;
    const { error } = await supabase.from("user_ads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ad deleted"); qc.invalidateQueries({ queryKey: ["admin-ads"] }); }
  };

  const saveEdit = async () => {
    if (!editAd) return;
    const { id, title, description, target_url, image_url, duration_days, placement, ends_at, status } = editAd;
    const { error } = await supabase.from("user_ads").update({
      title, description, target_url, image_url, duration_days, placement, ends_at, status
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ad updated"); setEditAd(null); qc.invalidateQueries({ queryKey: ["admin-ads"] }); }
  };

  const PLACEMENTS = [
    { key: "blog", label: "Blog" },
    { key: "home", label: "Homepage" },
    { key: "header", label: "Header" },
    { key: "footer", label: "Footer" },
    { key: "sidebar", label: "Sidebar" },
    { key: "in_article", label: "In-article" },
  ];

  const { data: ads = [] } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data } = await supabase.from("user_ads").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: keys = [] } = useQuery({
    queryKey: ["admin-ad-keys"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_api_keys").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const approve = async (id: string) => {
    const picks = adPlacements[id] || ["blog"];
    const placement = picks.join(",");
    const { error: rpcErr } = await supabase.rpc("approve_user_ad", { _ad_id: id });
    if (rpcErr) { toast.error(rpcErr.message); return; }
    const { error: upErr } = await supabase.from("user_ads").update({ placement }).eq("id", id);
    if (upErr) toast.error(upErr.message);
    else { toast.success(`Approved & live on: ${placement}`); qc.invalidateQueries({ queryKey: ["admin-ads"] }); }
  };

  const togglePlacement = (adId: string, key: string) => {
    setAdPlacements((prev) => {
      const current = prev[adId] || ["blog"];
      const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
      return { ...prev, [adId]: next.length ? next : ["blog"] };
    });
  };

  const reject = async (id: string) => {
    const reason = rejectReason[id] || "Not approved";
    const { error } = await supabase.rpc("reject_user_ad", { _ad_id: id, _reason: reason });
    if (error) toast.error(error.message);
    else { toast.success("Ad rejected & user refunded"); qc.invalidateQueries({ queryKey: ["admin-ads"] }); }
  };

  const createKey = async () => {
    if (!newKeyLabel.trim()) return toast.error("Label required");
    const { data, error } = await supabase.functions.invoke("admin-create-ad-key", {
      body: { label: newKeyLabel, scopes: newKeyScopes },
    });
    if (error || (data as any)?.error) return toast.error(error?.message || (data as any)?.error);
    setRevealedKey((data as any).key);
    setNewKeyLabel("");
    qc.invalidateQueries({ queryKey: ["admin-ad-keys"] });
  };

  const revokeKey = async (id: string) => {
    const { error } = await supabase.from("ad_api_keys").update({ active: false }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Key revoked"); qc.invalidateQueries({ queryKey: ["admin-ad-keys"] }); }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const embedSnippet = `<script src="${supabaseUrl}/functions/v1/ad-embed?placement=blog" data-slot="blog" async></script>`;

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  // Filter ads
  const filteredAds = useMemo(() => {
    return ads.filter((a: any) => {
      const isExpired = a.ends_at && isPast(new Date(a.ends_at));
      if (statusFilter === "active" && (a.status !== "active" || isExpired)) return false;
      if (statusFilter === "pending" && a.status !== "pending") return false;
      if (statusFilter === "expired" && (!isExpired && a.status !== "expired")) return false;
      if (statusFilter === "paused" && a.status !== "paused") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (a.title || "").toLowerCase().includes(q);
        const matchUrl = (a.target_url || "").toLowerCase().includes(q);
        const matchPlacement = (a.placement || "").toLowerCase().includes(q);
        return matchTitle || matchUrl || matchPlacement;
      }
      return true;
    });
  }, [ads, statusFilter, searchQuery]);

  // Overall Stats
  const totalRevenue = useMemo(() => {
    return ads.reduce((acc: number, curr: any) => acc + (Number(curr.cost_amount) || 0), 0);
  }, [ads]);

  const activeAdsCount = useMemo(() => {
    return ads.filter((a: any) => a.status === "active" && (!a.ends_at || !isPast(new Date(a.ends_at)))).length;
  }, [ads]);

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Top Title & Global Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-foreground">
            <Megaphone className="h-6 w-6 text-primary" /> Global Ad Network & Campaign Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor spend, manage user campaigns, reactivate expired adverts, and enforce platform switches.
          </p>
        </div>
        <Badge variant={isGlobalAdsEnabled ? "default" : "destructive"} className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs">
          {isGlobalAdsEnabled ? "🟢 Platform Ads ONLINE" : "🔴 Platform Ads DISABLED"}
        </Badge>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Total Ad Spend Placed
          </p>
          <p className="text-xl font-black mt-1 text-emerald-600">₦{totalRevenue.toLocaleString()}</p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Active Live Campaigns
          </p>
          <p className="text-xl font-black mt-1 text-foreground">{activeAdsCount}</p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending Review
          </p>
          <p className="text-xl font-black mt-1 text-amber-600">
            {ads.filter((a: any) => a.status === "pending").length}
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Total Campaigns
          </p>
          <p className="text-xl font-black mt-1 text-foreground">{ads.length}</p>
        </Card>
      </div>

      {/* Global Ad Network Kill Switches */}
      <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Ad Provider Master Controls</CardTitle>
                <CardDescription className="text-xs">
                  Instant kill-switches. Changes apply immediately across all pages.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">Master Global Switch</span>
              <Switch
                checked={isGlobalAdsEnabled}
                onCheckedChange={() => toggleAdSetting("ads_global_enabled", isGlobalAdsEnabled)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Google AdSense */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition">
              <div>
                <p className="font-bold text-xs">Google AdSense</p>
                <p className="text-[10px] text-muted-foreground">Auto-ads script & banners</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isAdSenseEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_adsense", isAdSenseEnabled)}
              />
            </div>

            {/* Adsterra */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition">
              <div>
                <p className="font-bold text-xs">Adsterra Display</p>
                <p className="text-[10px] text-muted-foreground">728x90 & 300x250 banners</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isAdsterraEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_adsterra", isAdsterraEnabled)}
              />
            </div>

            {/* Monetag */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition">
              <div>
                <p className="font-bold text-xs">Monetag Ads</p>
                <p className="text-[10px] text-muted-foreground">Popunder & web push</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isMonetagEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_monetag", isMonetagEnabled)}
              />
            </div>

            {/* Start.io */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition">
              <div>
                <p className="font-bold text-xs">Start.io (StartApp)</p>
                <p className="text-[10px] text-muted-foreground">Mobile & banner SDK</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isStartIoEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_startio", isStartIoEnabled)}
              />
            </div>

            {/* Platform Native Ads */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition">
              <div>
                <p className="font-bold text-xs">Bethelincovibe Ad Server</p>
                <p className="text-[10px] text-muted-foreground">User campaigns & rotating ads</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isNativeAdsEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_native", isNativeAdsEnabled)}
              />
            </div>

            {/* Custom Placements */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition">
              <div>
                <p className="font-bold text-xs">Custom HTML Placements</p>
                <p className="text-[10px] text-muted-foreground">Header, footer & sidebar HTML</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isCustomAdsEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_custom", isCustomAdsEnabled)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ads" className="w-full">
        <TabsList className="rounded-2xl p-1 bg-muted/60">
          <TabsTrigger value="ads" className="rounded-xl font-bold text-xs">User Campaign Ads ({ads.length})</TabsTrigger>
          <TabsTrigger value="keys" className="rounded-xl font-bold text-xs">API Keys ({keys.length})</TabsTrigger>
          <TabsTrigger value="embed" className="rounded-xl font-bold text-xs">Embed Snippet</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4 mt-4">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ads by title, URL or placement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="text-xs h-8 rounded-xl font-bold"
              >
                All ({ads.length})
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className="text-xs h-8 rounded-xl font-bold"
              >
                Active ({ads.filter((a: any) => a.status === "active" && (!a.ends_at || !isPast(new Date(a.ends_at)))).length})
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className="text-xs h-8 rounded-xl font-bold text-amber-600 border-amber-500/30"
              >
                Pending ({ads.filter((a: any) => a.status === "pending").length})
              </Button>
              <Button
                variant={statusFilter === "expired" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("expired")}
                className="text-xs h-8 rounded-xl font-bold text-rose-600 border-rose-500/30"
              >
                Expired ({ads.filter((a: any) => (a.ends_at && isPast(new Date(a.ends_at))) || a.status === "expired").length})
              </Button>
              <Button
                variant={statusFilter === "paused" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paused")}
                className="text-xs h-8 rounded-xl font-bold"
              >
                Paused ({ads.filter((a: any) => a.status === "paused").length})
              </Button>
            </div>
          </div>

          {/* Ad Cards List */}
          <div className="space-y-3">
            {filteredAds.map((a: any) => {
              const isExpired = a.ends_at && isPast(new Date(a.ends_at));
              const impressions = Number(a.impressions || 0);
              const clicks = Number(a.clicks || 0);
              const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
              const costAmount = Number(a.cost_amount || 0);

              return (
                <Card key={a.id} className="border-border/80 shadow-xs rounded-2xl overflow-hidden bg-card hover:border-primary/40 transition">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start">
                    {/* Creative image thumbnail */}
                    {a.image_url ? (
                      <div className="h-24 w-36 shrink-0 rounded-xl overflow-hidden bg-muted border relative">
                        <img src={a.image_url} className="h-full w-full object-cover" alt={a.title} />
                      </div>
                    ) : (
                      <div className="h-24 w-36 shrink-0 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground border">
                        <Megaphone className="h-6 w-6 opacity-40" />
                      </div>
                    )}

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm text-foreground">{a.title}</p>
                          {isExpired ? (
                            <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] font-extrabold">
                              EXPIRED
                            </Badge>
                          ) : (
                            <Badge variant={a.status === "active" ? "default" : a.status === "pending" ? "secondary" : "destructive"} className="text-[10px] font-extrabold">
                              {a.status.toUpperCase()}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                            {a.source || "web"}
                          </Badge>
                        </div>

                        {/* Cost Placed Badge */}
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 font-extrabold text-xs px-2.5 py-1 rounded-xl border border-emerald-500/20">
                          <DollarSign className="h-3 w-3" /> ₦{costAmount.toLocaleString()} ({a.duration_days || 0}d)
                        </div>
                      </div>

                      {/* URL */}
                      <a
                        href={a.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 truncate font-medium"
                      >
                        {a.target_url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>

                      {/* Expiry and Dates Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {a.starts_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" /> Started: {format(new Date(a.starts_at), "PP")}
                          </span>
                        )}
                        {a.ends_at ? (
                          <span className={`flex items-center gap-1 font-semibold ${isExpired ? "text-rose-500 font-bold" : "text-amber-600"}`}>
                            <Clock className="h-3.5 w-3.5" />
                            {isExpired ? `Expired on ${format(new Date(a.ends_at), "PP")}` : `Expires in ${formatDistanceToNow(new Date(a.ends_at))}`}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> No expiry set
                          </span>
                        )}
                      </div>

                      {/* Placements & Performance */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-muted-foreground">Placements:</span>
                          {(a.placement || "blog").split(",").map((p: string) => (
                            <Badge key={p} variant="secondary" className="text-[10px] font-bold px-2 py-0">
                              {p.trim()}
                            </Badge>
                          ))}
                        </div>

                        {/* Metrics */}
                        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1" title="Impressions">
                            <Eye className="h-3.5 w-3.5 text-primary" /> {impressions.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1" title="Clicks">
                            <MousePointer className="h-3.5 w-3.5 text-emerald-500" /> {clicks.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                            {ctr}% CTR
                          </span>
                        </div>
                      </div>

                      {/* Pending Review Placement Selector */}
                      {a.status === "pending" && (
                        <div className="mt-2 space-y-2 border-t pt-2 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                          <div>
                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5">Pick placement(s) to approve:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {PLACEMENTS.map((p) => {
                                const picks = adPlacements[a.id] || ["blog"];
                                const checked = picks.includes(p.key);
                                return (
                                  <button
                                    type="button"
                                    key={p.key}
                                    onClick={() => togglePlacement(a.id, p.key)}
                                    className={`text-[11px] font-bold rounded-lg border px-2.5 py-1 transition ${
                                      checked
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "bg-background hover:bg-muted text-foreground border-border/80"
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex gap-2 items-center flex-wrap pt-1">
                            <Button size="sm" onClick={() => approve(a.id)} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve & Place Live
                            </Button>
                            <Input
                              placeholder="Reason if rejecting"
                              value={rejectReason[a.id] || ""}
                              onChange={(e) => setRejectReason({ ...rejectReason, [a.id]: e.target.value })}
                              className="h-8 text-xs flex-1 min-w-[140px] max-w-xs rounded-xl"
                            />
                            <Button size="sm" variant="destructive" onClick={() => reject(a.id)} className="rounded-xl font-bold">
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Toolbar */}
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                        {/* Reactivate / Extend Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReactivateAd(a);
                            setReactivateDays(7);
                          }}
                          className="rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {isExpired ? "Reactivate Ad" : "Extend Duration"}
                        </Button>

                        {a.status === "active" && !isExpired && (
                          <Button size="sm" variant="outline" onClick={() => pause(a.id)} className="rounded-xl text-xs font-semibold">
                            <Pause className="h-3 w-3 mr-1" /> Pause
                          </Button>
                        )}
                        {a.status === "paused" && (
                          <Button size="sm" variant="outline" onClick={() => resume(a.id)} className="rounded-xl text-xs font-semibold">
                            <Play className="h-3 w-3 mr-1" /> Resume
                          </Button>
                        )}
                        {(a.status === "active" || a.status === "paused") && (
                          <Button size="sm" variant="outline" onClick={() => deactivate(a.id)} className="rounded-xl text-xs font-semibold text-muted-foreground">
                            <Power className="h-3 w-3 mr-1" /> Deactivate
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setEditAd({ ...a })} className="rounded-xl text-xs font-semibold">
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeAd(a.id)} className="rounded-xl text-xs font-semibold">
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredAds.length === 0 && (
            <Card className="p-8 text-center rounded-3xl border-dashed">
              <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">No Advertisements Found</p>
              <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or switching tabs.</p>
            </Card>
          )}

          {/* Reactivate & Extend Modal Dialog */}
          <Dialog open={!!reactivateAd} onOpenChange={(o) => !o && setReactivateAd(null)}>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-emerald-500" /> Reactivate & Extend Campaign
                </DialogTitle>
              </DialogHeader>
              {reactivateAd && (
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-muted/50 rounded-2xl border text-xs space-y-1">
                    <p className="font-bold text-foreground">{reactivateAd.title}</p>
                    <p className="text-muted-foreground truncate">{reactivateAd.target_url}</p>
                    <p className="text-muted-foreground">
                      Current Expiry: {reactivateAd.ends_at ? format(new Date(reactivateAd.ends_at), "PPp") : "None"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Add Extension Duration (Days)</Label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[7, 14, 30, 60].map((d) => (
                        <Button
                          key={d}
                          type="button"
                          variant={reactivateDays === d ? "default" : "outline"}
                          size="sm"
                          onClick={() => setReactivateDays(d)}
                          className="rounded-xl font-bold text-xs"
                        >
                          +{d}d
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={reactivateDays}
                      onChange={(e) => setReactivateDays(Math.max(1, Number(e.target.value)))}
                      className="rounded-xl h-10 text-sm font-bold"
                    />
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setReactivateAd(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAdminReactivate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                  Reactivate & Go Live
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Ad Modal Dialog */}
          <Dialog open={!!editAd} onOpenChange={(o) => !o && setEditAd(null)}>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader><DialogTitle className="text-base font-bold">Edit Advertisement Details</DialogTitle></DialogHeader>
              {editAd && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs font-bold">Title</Label>
                    <Input value={editAd.title || ""} onChange={(e) => setEditAd({ ...editAd, title: e.target.value })} className="rounded-xl text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea value={editAd.description || ""} onChange={(e) => setEditAd({ ...editAd, description: e.target.value })} className="rounded-xl text-xs" rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Target URL</Label>
                    <Input value={editAd.target_url || ""} onChange={(e) => setEditAd({ ...editAd, target_url: e.target.value })} className="rounded-xl text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Image URL</Label>
                    <Input value={editAd.image_url || ""} onChange={(e) => setEditAd({ ...editAd, image_url: e.target.value })} className="rounded-xl text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-bold">Duration (days)</Label>
                      <Input type="number" value={editAd.duration_days || 0} onChange={(e) => setEditAd({ ...editAd, duration_days: Number(e.target.value) })} className="rounded-xl text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Placement (comma-separated)</Label>
                      <Input value={editAd.placement || ""} onChange={(e) => setEditAd({ ...editAd, placement: e.target.value })} className="rounded-xl text-xs" />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEditAd(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={saveEdit} className="rounded-xl font-bold">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="keys" className="space-y-3 mt-4">
          <Card className="rounded-3xl border-border/80">
            <CardHeader><CardTitle className="text-base flex items-center gap-2 font-bold"><Key className="h-4 w-4 text-primary" />Create Developer API Key</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Label (e.g. PartnerSite.com)" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} className="rounded-xl text-xs" />
              <div className="flex gap-3 items-center text-xs font-semibold">
                <label className="flex items-center gap-1"><input type="checkbox" checked={newKeyScopes.includes("read")} onChange={(e) => setNewKeyScopes(e.target.checked ? [...new Set([...newKeyScopes, "read"])] : newKeyScopes.filter(s => s !== "read"))} />read (serve ads)</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={newKeyScopes.includes("write")} onChange={(e) => setNewKeyScopes(e.target.checked ? [...new Set([...newKeyScopes, "write"])] : newKeyScopes.filter(s => s !== "write"))} />write (submit ads)</label>
              </div>
              <Button onClick={createKey} className="rounded-xl font-bold text-xs">Generate API Key</Button>
              {revealedKey && (
                <div className="rounded-2xl border border-dashed bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Copy this key now — it will not be shown again:</p>
                  <div className="flex gap-2 items-center">
                    <code className="text-xs flex-1 break-all bg-background p-2 rounded border">{revealedKey}</code>
                    <Button size="sm" variant="outline" onClick={() => copy(revealedKey)} className="rounded-xl"><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {(keys || []).map((k: any) => (
            <Card key={k.id} className="rounded-2xl border-border/80"><CardContent className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{k.label}</p>
                <p className="text-xs text-muted-foreground"><code>{k.key_prefix}…</code> · scopes: {(k.scopes || []).join(", ")} · {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}</p>
              </div>
              <Badge variant={k.active ? "default" : "secondary"}>{k.active ? "active" : "revoked"}</Badge>
              {k.active && <Button size="sm" variant="destructive" onClick={() => revokeKey(k.id)} className="rounded-xl text-xs font-semibold">Revoke</Button>}
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="embed" className="space-y-3 mt-4">
          <Card className="rounded-3xl border-border/80">
            <CardHeader>
              <CardTitle className="text-base font-bold">Embed Snippet</CardTitle>
              <CardDescription className="text-xs">Paste this anywhere on any HTML page or blog. A rotating banner ad will render in place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="text-xs bg-muted p-3 rounded-xl overflow-x-auto">{embedSnippet}</pre>
              <Button size="sm" variant="outline" onClick={() => copy(embedSnippet)} className="rounded-xl font-bold text-xs"><Copy className="h-3 w-3 mr-1" />Copy snippet</Button>
              <div>
                <p className="font-bold text-sm mt-4 mb-1">Developer API</p>
                <p className="text-xs text-muted-foreground mb-2">Send <code>x-api-key: adv_…</code> in the header.</p>
                <pre className="text-xs bg-muted p-3 rounded-xl overflow-x-auto">{`GET  ${supabaseUrl}/functions/v1/ad-server?placement=blog
POST ${supabaseUrl}/functions/v1/external-submit-ad
  body: { title, description, target_url, image_url, duration_days, placement }`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
