import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Copy, Key, Megaphone, Pause, Play, Power, Pencil, Trash2, ShieldAlert, SlidersHorizontal, Globe } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminAds() {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [adPlacements, setAdPlacements] = useState<Record<string, string[]>>({});
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [editAd, setEditAd] = useState<any | null>(null);

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
  const isAdsterraEnabled = adControlSettings?.ads_provider_adsterra !== "false";
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
  const reactivate = (id: string) => setStatus(id, "active", "Ad reactivated");
  const removeAd = async (id: string) => {
    if (!confirm("Delete this ad permanently?")) return;
    const { error } = await supabase.from("user_ads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ad deleted"); qc.invalidateQueries({ queryKey: ["admin-ads"] }); }
  };
  const saveEdit = async () => {
    if (!editAd) return;
    const { id, title, description, target_url, image_url, duration_days, placement } = editAd;
    const { error } = await supabase.from("user_ads").update({ title, description, target_url, image_url, duration_days, placement }).eq("id", id);
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

  const { data: ads } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data } = await supabase.from("user_ads").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: keys } = useQuery({
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

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Global Ad Network & Controls
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage user campaign ads, API developer keys, and global advertisement switches per provider.
          </p>
        </div>
        <Badge variant={isGlobalAdsEnabled ? "default" : "destructive"} className="self-start sm:self-auto px-3 py-1 text-xs">
          {isGlobalAdsEnabled ? "🟢 Platform Ads ONLINE" : "🔴 Platform Ads DISABLED"}
        </Badge>
      </div>

      {/* Global Master Switch Panel */}
      <Card className={`border-2 transition-colors ${isGlobalAdsEnabled ? "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10" : "border-rose-500/50 bg-rose-50/30 dark:bg-rose-950/20"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Globe className={`h-5 w-5 ${isGlobalAdsEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} />
                Master Advertisement Switch
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Globally switch on or off all advertisements across the platform (AdSense, Adsterra, Monetag, Start.io, Native Ads, and Custom Placements).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-background/80 p-2 rounded-xl border shadow-sm">
              <span className={`text-xs font-bold ${isGlobalAdsEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isGlobalAdsEnabled ? "ENABLED" : "DISABLED"}
              </span>
              <Switch
                checked={isGlobalAdsEnabled}
                onCheckedChange={() => toggleAdSetting("ads_global_enabled", isGlobalAdsEnabled)}
              />
            </div>
          </div>
        </CardHeader>
        {!isGlobalAdsEnabled && (
          <CardContent className="pt-0">
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>All ad banners, popups, and network scripts are currently suppressed site-wide.</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Provider-Specific Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Provider Specific Ad Switches
          </CardTitle>
          <CardDescription className="text-xs">
            Turn off individual ad networks while keeping others active. (Disabled when Master Switch is OFF).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* AdSense */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
              <div>
                <p className="font-semibold text-xs">Google AdSense</p>
                <p className="text-[10px] text-muted-foreground">Banner & display ads</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isAdSenseEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_adsense", isAdSenseEnabled)}
              />
            </div>

            {/* Adsterra */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
              <div>
                <p className="font-semibold text-xs">Adsterra Network</p>
                <p className="text-[10px] text-muted-foreground">Social bar, native & banners</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isAdsterraEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_adsterra", isAdsterraEnabled)}
              />
            </div>

            {/* Monetag */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
              <div>
                <p className="font-semibold text-xs">Monetag Ads</p>
                <p className="text-[10px] text-muted-foreground">Popunder & web push</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isMonetagEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_monetag", isMonetagEnabled)}
              />
            </div>

            {/* Start.io */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
              <div>
                <p className="font-semibold text-xs">Start.io (StartApp)</p>
                <p className="text-[10px] text-muted-foreground">Mobile & banner SDK</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isStartIoEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_startio", isStartIoEnabled)}
              />
            </div>

            {/* Platform Native Ads */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
              <div>
                <p className="font-semibold text-xs">Bethelincovibe Ad Server</p>
                <p className="text-[10px] text-muted-foreground">User campaigns & rotating ads</p>
              </div>
              <Switch
                disabled={!isGlobalAdsEnabled}
                checked={isNativeAdsEnabled}
                onCheckedChange={() => toggleAdSetting("ads_provider_native", isNativeAdsEnabled)}
              />
            </div>

            {/* Custom Placements */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
              <div>
                <p className="font-semibold text-xs">Custom HTML Placements</p>
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

      <Tabs defaultValue="ads">
        <TabsList>
          <TabsTrigger value="ads">User Campaign Ads</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="embed">Embed Snippet</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-3 mt-4">
          {(ads || []).map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-3 flex gap-3 items-start">
                {a.image_url && <img src={a.image_url} className="h-20 w-28 object-cover rounded-lg" alt={a.title} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{a.title}</p>
                    <Badge variant={a.status === "active" ? "default" : a.status === "pending" ? "secondary" : "destructive"}>{a.status}</Badge>
                    <Badge variant="outline">{a.source}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{a.target_url}</p>
                  <p className="text-xs mt-1">{a.duration_days}d · ₦{Number(a.cost_amount).toLocaleString()} · imp {a.impressions} · clk {a.clicks}</p>
                  {a.status === "pending" && (
                    <div className="mt-2 space-y-2 border-t pt-2">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">Pick placement(s) for this ad:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PLACEMENTS.map((p) => {
                            const picks = adPlacements[a.id] || ["blog"];
                            const checked = picks.includes(p.key);
                            return (
                              <button type="button" key={p.key} onClick={() => togglePlacement(a.id, p.key)}
                                className={`text-[11px] rounded-md border px-2 py-1 transition ${checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button size="sm" onClick={() => approve(a.id)}><Check className="h-3 w-3 mr-1" />Approve & Place</Button>
                        <Input placeholder="Reject reason" value={rejectReason[a.id] || ""} onChange={(e) => setRejectReason({ ...rejectReason, [a.id]: e.target.value })} className="h-8 text-xs flex-1 min-w-[140px] max-w-xs" />
                        <Button size="sm" variant="destructive" onClick={() => reject(a.id)}><X className="h-3 w-3 mr-1" />Reject</Button>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
                    {a.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => pause(a.id)}><Pause className="h-3 w-3 mr-1" />Pause</Button>
                    )}
                    {a.status === "paused" && (
                      <Button size="sm" variant="outline" onClick={() => resume(a.id)}><Play className="h-3 w-3 mr-1" />Resume</Button>
                    )}
                    {(a.status === "active" || a.status === "paused") && (
                      <Button size="sm" variant="outline" onClick={() => deactivate(a.id)}><Power className="h-3 w-3 mr-1" />Deactivate</Button>
                    )}
                    {(a.status === "inactive" || a.status === "rejected") && (
                      <Button size="sm" variant="outline" onClick={() => reactivate(a.id)}><Power className="h-3 w-3 mr-1" />Reactivate</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditAd({ ...a })}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => removeAd(a.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!ads || ads.length === 0) && <p className="text-sm text-muted-foreground">No ads yet.</p>}

          <Dialog open={!!editAd} onOpenChange={(o) => !o && setEditAd(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Edit ad</DialogTitle></DialogHeader>
              {editAd && (
                <div className="space-y-3">
                  <div><Label>Title</Label><Input value={editAd.title || ""} onChange={(e) => setEditAd({ ...editAd, title: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea value={editAd.description || ""} onChange={(e) => setEditAd({ ...editAd, description: e.target.value })} /></div>
                  <div><Label>Target URL</Label><Input value={editAd.target_url || ""} onChange={(e) => setEditAd({ ...editAd, target_url: e.target.value })} /></div>
                  <div><Label>Image URL</Label><Input value={editAd.image_url || ""} onChange={(e) => setEditAd({ ...editAd, image_url: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Duration (days)</Label><Input type="number" value={editAd.duration_days || 0} onChange={(e) => setEditAd({ ...editAd, duration_days: Number(e.target.value) })} /></div>
                    <div><Label>Placement (comma-sep)</Label><Input value={editAd.placement || ""} onChange={(e) => setEditAd({ ...editAd, placement: e.target.value })} /></div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditAd(null)}>Cancel</Button>
                <Button onClick={saveEdit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="keys" className="space-y-3 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" />Create developer key</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Label (e.g. PartnerSite.com)" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} />
              <div className="flex gap-3 items-center text-sm">
                <label className="flex items-center gap-1"><input type="checkbox" checked={newKeyScopes.includes("read")} onChange={(e) => setNewKeyScopes(e.target.checked ? [...new Set([...newKeyScopes, "read"])] : newKeyScopes.filter(s => s !== "read"))} />read (serve ads)</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={newKeyScopes.includes("write")} onChange={(e) => setNewKeyScopes(e.target.checked ? [...new Set([...newKeyScopes, "write"])] : newKeyScopes.filter(s => s !== "write"))} />write (submit ads)</label>
              </div>
              <Button onClick={createKey}>Generate key</Button>
              {revealedKey && (
                <div className="rounded-lg border border-dashed bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Copy this key now — it will not be shown again:</p>
                  <div className="flex gap-2 items-center">
                    <code className="text-xs flex-1 break-all">{revealedKey}</code>
                    <Button size="sm" variant="outline" onClick={() => copy(revealedKey)}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {(keys || []).map((k: any) => (
            <Card key={k.id}><CardContent className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{k.label}</p>
                <p className="text-xs text-muted-foreground"><code>{k.key_prefix}…</code> · scopes: {(k.scopes || []).join(", ")} · {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}</p>
              </div>
              <Badge variant={k.active ? "default" : "secondary"}>{k.active ? "active" : "revoked"}</Badge>
              {k.active && <Button size="sm" variant="destructive" onClick={() => revokeKey(k.id)}>Revoke</Button>}
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="embed" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Embed Snippet</CardTitle>
              <CardDescription>Paste this anywhere on any HTML page or blog. A rotating banner ad will render in place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">{embedSnippet}</pre>
              <Button size="sm" variant="outline" onClick={() => copy(embedSnippet)}><Copy className="h-3 w-3 mr-1" />Copy snippet</Button>
              <div>
                <p className="font-semibold text-sm mt-4 mb-1">Developer API</p>
                <p className="text-xs text-muted-foreground mb-2">Send <code>x-api-key: adv_…</code> in the header.</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">{`GET  ${supabaseUrl}/functions/v1/ad-server?placement=blog
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