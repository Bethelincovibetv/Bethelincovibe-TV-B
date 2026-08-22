import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Save, Megaphone, Wallet, BarChart3, CreditCard, Code2, Users, Sparkles } from "lucide-react";

const SOCIAL_KEYS = [
  "social_facebook","social_x","social_instagram","social_tiktok","social_youtube",
  "social_linkedin","social_whatsapp","social_telegram","social_threads",
  "social_pinterest","social_snapchat","social_reddit",
] as const;

const ADSTERRA_SLOTS = [
  ["adsterra_show_blog_top", "Blog articles (top)", true],
  ["adsterra_show_blog_bottom", "Blog articles (bottom)", true],
  ["adsterra_show_home_top", "Homepage (top)", false],
  ["adsterra_show_home_bottom", "Homepage (bottom)", false],
  ["adsterra_show_directory", "Business directory", false],
  ["adsterra_show_forum", "Community forum", false],
  ["adsterra_show_sales_directory", "Public sales directory", false],
  ["adsterra_show_learn", "Learning hub", false],
] as const;

const KEYS = [
  "adsense_head", "adsense_body",
  "adsterra_head", "adsterra_body",
  "monetag_head", "monetag_body",
  "startio_head", "startio_body",
  ...ADSTERRA_SLOTS.map(([k]) => k),
  "ad_header", "ad_footer", "ad_sidebar", "ad_in_article",
  "ga_measurement_id",
  "paystack_public_key", "paystack_secret_key",
  "daily_login_credits", "ad_cost_per_day",
  "ad_click_reward_naira", "ad_click_cooldown_seconds",
  "business_blog_fee", "ai_cover_image_enabled", "ai_cover_image_model",
  "gemini_api_key",
  "ai_provider", "ai_text_model", "ad_server_enabled",
  "ad_auto_approve", "ad_watermark_text", "ad_watermark_url",
  "ad_rotation_style", "ai_interactive_ads_enabled",
  "whatsapp_community_url", "referral_signup_bonus", "referral_purchase_pct",
  "sales_page_first_free", "sales_page_price", "leads_enabled_global",
  ...SOCIAL_KEYS,
] as const;

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const get = (k: string) => values[k] ?? settings?.[k] ?? "";
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("site_settings").update({ value }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_settings").insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-site-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveAll = async () => {
    const changed = KEYS.filter((k) => values[k] !== undefined && values[k] !== (settings?.[k] ?? ""));
    if (changed.length === 0) { toast.info("No changes to save"); return; }
    for (const k of changed) await save.mutateAsync({ key: k, value: values[k] });
    toast.success(`Saved ${changed.length} setting${changed.length > 1 ? "s" : ""}`);
  };

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" /> Settings
        </h1>
        <Button onClick={saveAll} size="sm" className="shrink-0"><Save className="h-4 w-4 mr-1" />Save</Button>
      </div>

      <Tabs defaultValue="ads" className="w-full">
        <TabsList className="grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="ads" className="flex flex-col gap-1 py-2 text-[11px]"><Megaphone className="h-4 w-4" />Ads</TabsTrigger>
          <TabsTrigger value="rewards" className="flex flex-col gap-1 py-2 text-[11px]"><Wallet className="h-4 w-4" />Rewards</TabsTrigger>
          <TabsTrigger value="payments" className="flex flex-col gap-1 py-2 text-[11px]"><CreditCard className="h-4 w-4" />Payments</TabsTrigger>
          <TabsTrigger value="analytics" className="flex flex-col gap-1 py-2 text-[11px]"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="community" className="flex flex-col gap-1 py-2 text-[11px]"><Users className="h-4 w-4" />Social</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Bethelincovibe Ad Server</CardTitle>
              <CardDescription>Our own native ad network. Users submit ads; admin approves; ads rotate on the blog. Embed/API keys live in the Custom Code page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ad_server_enabled"
                  checked={get("ad_server_enabled") !== "false"}
                  onChange={(e) => set("ad_server_enabled", e.target.checked ? "true" : "false")}
                  className="h-5 w-5 accent-primary" />
                <Label htmlFor="ad_server_enabled" className="cursor-pointer">Ad server enabled (serve ads on blog & embed)</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ad_auto_approve"
                  checked={get("ad_auto_approve") === "true"}
                  onChange={(e) => set("ad_auto_approve", e.target.checked ? "true" : "false")}
                  className="h-5 w-5 accent-primary" />
                <Label htmlFor="ad_auto_approve" className="cursor-pointer">Auto-approve new user ads (publish immediately after wallet charge)</Label>
              </div>
              <div>
                <Label>Ad cost per day (₦)</Label>
                <Input type="number" min={0} value={get("ad_cost_per_day")} onChange={(e) => set("ad_cost_per_day", e.target.value)} placeholder="500" />
                <p className="text-[11px] text-muted-foreground mt-1">Charged from user wallet × duration days (1–30).</p>
              </div>
              <div className="pt-2 border-t space-y-2">
                <Label>Ad watermark text</Label>
                <Input value={get("ad_watermark_text")} onChange={(e)=>set("ad_watermark_text", e.target.value)} placeholder="Bethelincovibe TV" />
                <Label>Ad watermark image URL (optional)</Label>
                <Input value={get("ad_watermark_url")} onChange={(e)=>set("ad_watermark_url", e.target.value)} placeholder="https://..." className="font-mono text-xs" />
                <p className="text-[11px] text-muted-foreground">Shown as a small badge in the corner of every served ad.</p>
              </div>
              <div className="pt-2 border-t space-y-2">
                <Label>Ad rotation style</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={get("ad_rotation_style") || "random"}
                  onChange={(e) => set("ad_rotation_style", e.target.value)}>
                  <option value="random">Random (fair shuffle)</option>
                  <option value="weighted">Weighted (by remaining budget)</option>
                  <option value="sequential">Sequential (round-robin)</option>
                  <option value="newest">Newest first</option>
                </select>
                <p className="text-[11px] text-muted-foreground">Controls how the ad server picks which active ad to show next.</p>
              </div>
              <div className="pt-2 border-t flex items-center gap-3">
                <input type="checkbox" id="ai_interactive_ads_enabled"
                  checked={get("ai_interactive_ads_enabled") === "true"}
                  onChange={(e) => set("ai_interactive_ads_enabled", e.target.checked ? "true" : "false")}
                  className="h-5 w-5 accent-primary" />
                <Label htmlFor="ai_interactive_ads_enabled" className="cursor-pointer">
                  Enable AI Programmatic Ads (Gemini turns user creatives into interactive ads)
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Google AdSense</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Head script</Label>
                <Textarea value={get("adsense_head")} onChange={(e) => set("adsense_head", e.target.value)} rows={3} className="font-mono text-xs" />
              </div>
              <div>
                <Label>Ad unit code</Label>
                <Textarea value={get("adsense_body")} onChange={(e) => set("adsense_body", e.target.value)} rows={3} className="font-mono text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adsterra</CardTitle>
              <CardDescription>Paste the code Adsterra gave you. Head = verification / social bar / anti-adblock. Body = display ad unit (shown on blog articles).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Head script</Label>
                <Textarea value={get("adsterra_head")} onChange={(e) => set("adsterra_head", e.target.value)} rows={3} className="font-mono text-xs" placeholder="<script src='//pl...adsterra.com/...' async></script>" />
              </div>
              <div>
                <Label>Ad unit code (banner / native)</Label>
                <Textarea value={get("adsterra_body")} onChange={(e) => set("adsterra_body", e.target.value)} rows={4} className="font-mono text-xs" placeholder="<script async data-cfasync='false' src='//pagead2...'></script><div id='container-...'></div>" />
              </div>
              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-semibold">Show Adsterra on these pages</p>
                <p className="text-[11px] text-muted-foreground">Pick where the ad unit above appears across the site. Blog placements are on by default.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {ADSTERRA_SLOTS.map(([key, label, defaultOn]) => {
                    const raw = get(key as string);
                    const enabled = raw === "" || raw === undefined
                      ? Boolean(defaultOn)
                      : ["true", "on", "1"].includes(raw);
                    return (
                      <label key={key as string} className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-secondary/50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={enabled}
                          onChange={(e) => set(key as string, e.target.checked ? "true" : "false")}
                        />
                        <span className="text-sm">{label as string}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monetag</CardTitle>
              <CardDescription>
                Paste your Monetag verification tag AND ad zone code below. The verification tag is injected into <code>&lt;head&gt;</code> on every page (including a synchronous cached copy on first paint, so the Monetag crawler sees it immediately). If verification still fails, paste the exact snippet Monetag gave you into "Head script" (usually a <code>&lt;meta name="monetag" content="…"/&gt;</code> or a <code>&lt;script&gt;</code> tag) and click Save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Head script (verification / SW / anti-adblock)</Label>
                <Textarea value={get("monetag_head")} onChange={(e) => set("monetag_head", e.target.value)} rows={4} className="font-mono text-xs" placeholder={`<meta name="monetag" content="abc123…" />\nor\n<script src="//…monetag…"></script>`} />
                <p className="text-[11px] text-muted-foreground mt-1">Runs site-wide (public + admin pages) so verification is always present.</p>
              </div>
              <div>
                <Label>Ad unit / zone code</Label>
                <Textarea value={get("monetag_body")} onChange={(e) => set("monetag_body", e.target.value)} rows={4} className="font-mono text-xs" placeholder="<script>(function(d,z,s){...})(document,YOUR_ZONE,'//...monetag.../tag.min.js');</script>" />
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="text-base">Start.io (StartApp)</CardTitle>
              <CardDescription>Paste your Start.io web SDK / tag code. Head for the loader, body for banner or interstitial containers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Head script</Label>
                <Textarea value={get("startio_head")} onChange={(e) => set("startio_head", e.target.value)} rows={3} className="font-mono text-xs" placeholder="<script async src='https://cdn.startapp.com/...'></script>" />
              </div>
              <div>
                <Label>Ad unit code</Label>
                <Textarea value={get("startio_body")} onChange={(e) => set("startio_body", e.target.value)} rows={4} className="font-mono text-xs" placeholder="<div id='startio-banner' data-adunit='...'></div><script>startApp.render('startio-banner');</script>" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4" />Custom Ad Placements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["ad_header", "Header"],
                ["ad_footer", "Footer"],
                ["ad_sidebar", "Sidebar"],
                ["ad_in_article", "In-article"],
              ].map(([k, label]) => (
                <div key={k}>
                  <Label>{label} HTML</Label>
                  <Textarea value={get(k)} onChange={(e) => set(k, e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Business Blog Submission</CardTitle>
              <CardDescription>Fee charged to non-admin users when submitting a sponsored business blog. Admins post free.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Submission Fee (₦)</Label>
                <Input type="number" min={0} value={get("business_blog_fee")} onChange={(e) => set("business_blog_fee", e.target.value)} placeholder="1000" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Sales Page Generator</CardTitle>
              <CardDescription>Pricing for AI-generated sales pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="sales_page_first_free"
                  checked={["true","on","1"].includes(String(get("sales_page_first_free")).toLowerCase())}
                  onChange={(e) => set("sales_page_first_free", e.target.checked ? "true" : "false")}
                  className="h-5 w-5 accent-primary" />
                <Label htmlFor="sales_page_first_free" className="cursor-pointer">First sales page is FREE for every business</Label>
              </div>
              <div>
                <Label>Price per sales page (₦)</Label>
                <Input type="number" min={0} value={get("sales_page_price")} onChange={(e) => set("sales_page_price", e.target.value)} placeholder="500" />
                <p className="text-[11px] text-muted-foreground mt-1">Deducted from the business wallet on creation.</p>
              </div>
              <div className="pt-2 border-t flex items-center gap-3">
                <input type="checkbox" id="leads_enabled_global"
                  checked={get("leads_enabled_global") !== "false"}
                  onChange={(e) => set("leads_enabled_global", e.target.checked ? "true" : "false")}
                  className="h-5 w-5 accent-primary" />
                <Label htmlFor="leads_enabled_global" className="cursor-pointer">Enable lead capture across all sales pages (master switch)</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" />AI Cover Image Generator</CardTitle>
              <CardDescription>When ON, the AI blogger generates a unique featured image for every post using AI (overrides Pexels stock photo).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ai_cover_image_enabled"
                  checked={get("ai_cover_image_enabled") === "true"}
                  onChange={(e) => set("ai_cover_image_enabled", e.target.checked ? "true" : "false")}
                  className="h-5 w-5 accent-primary"
                />
                <Label htmlFor="ai_cover_image_enabled" className="cursor-pointer">Enable AI-generated cover images for every blog post</Label>
              </div>
              <div>
                <Label>Image model</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={get("ai_cover_image_model") || "google/gemini-2.5-flash-image"}
                  onChange={(e) => set("ai_cover_image_model", e.target.value)}
                >
                  <option value="google/gemini-2.5-flash-image">Nano Banana (fast, cheap)</option>
                  <option value="google/gemini-3.1-flash-image-preview">Nano Banana 2 (balanced)</option>
                  <option value="google/gemini-3-pro-image-preview">Nano Banana Pro (best quality)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />Daily Login Reward</CardTitle>
              <CardDescription>Users get this credited automatically once per UTC day (Lovable-style — flat amount, no compounding).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Daily credits amount (₦)</Label>
                <Input type="number" min={0} value={get("daily_login_credits")} onChange={(e) => set("daily_login_credits", e.target.value)} placeholder="5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Ad Click Reward</CardTitle>
              <CardDescription>Naira credited to a user's wallet when they click on a Google AdSense ad anywhere on the site. Set to 0 to disable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Reward per ad click (₦)</Label>
                <Input type="number" min={0} step="0.5" value={get("ad_click_reward_naira")} onChange={(e) => set("ad_click_reward_naira", e.target.value)} placeholder="2" />
              </div>
              <div>
                <Label>Cooldown between rewards (seconds)</Label>
                <Input type="number" min={0} value={get("ad_click_cooldown_seconds")} onChange={(e) => set("ad_click_cooldown_seconds", e.target.value)} placeholder="30" />
                <p className="text-[11px] text-muted-foreground mt-1">Prevents users from spam-clicking ads to farm rewards.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paystack</CardTitle>
              <CardDescription>For wallet top-ups. Get keys from Paystack → Settings → API Keys.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Public Key</Label>
                <Input value={get("paystack_public_key")} onChange={(e) => set("paystack_public_key", e.target.value)} placeholder="pk_test_xxx" className="font-mono" />
              </div>
              <div>
                <Label>Secret Key</Label>
                <Input type="password" value={get("paystack_secret_key")} onChange={(e) => set("paystack_secret_key", e.target.value)} placeholder="sk_test_xxx" className="font-mono" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Provider</CardTitle>
              <CardDescription>Choose which AI powers the autoblogger, business coach, startup calculator and inventory insights. (Blog cover image generation always uses Lovable AI.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Provider</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={get("ai_provider") || "lovable"}
                  onChange={(e) => set("ai_provider", e.target.value)}>
                  <option value="lovable">Lovable AI (built-in, no key required)</option>
                  <option value="gemini">Google Gemini API (admin-provided key)</option>
                </select>
              </div>
              <div>
                <Label>Text model</Label>
                <Input value={get("ai_text_model")} onChange={(e) => set("ai_text_model", e.target.value)} placeholder="google/gemini-2.5-flash or gemini-2.0-flash-exp" className="font-mono text-xs" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Lovable AI examples: <code>google/gemini-2.5-flash</code>, <code>google/gemini-2.5-pro</code>, <code>openai/gpt-5-mini</code>.<br/>
                  Gemini direct (free tier): <code>gemini-2.0-flash</code> (default), <code>gemini-2.0-flash-exp</code>, <code>gemini-1.5-flash</code>.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                When provider is Gemini, paste your <strong>Gemini API Key</strong> in the field below (Google AI Studio → Get API key). It is read directly from settings — no secret needed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Gemini (Voice Reader)</CardTitle>
              <CardDescription>API key used to read blog posts aloud (text-to-speech). Get one from Google AI Studio. If empty, the browser's built-in voice is used as fallback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Gemini API Key</Label>
                <Input type="password" value={get("gemini_api_key")} onChange={(e) => set("gemini_api_key", e.target.value)} placeholder="AIza..." className="font-mono" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Google Analytics</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>GA4 Measurement ID</Label>
                <Input value={get("ga_measurement_id")} onChange={(e) => set("ga_measurement_id", e.target.value)} placeholder="G-XXXXXXXXXX" className="font-mono" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp Community</CardTitle>
              <CardDescription>Show a floating "Join our WhatsApp community" badge across the site. Leave blank to hide.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>WhatsApp invite/community URL</Label>
                <Input value={get("whatsapp_community_url")} onChange={(e) => set("whatsapp_community_url", e.target.value)} placeholder="https://chat.whatsapp.com/..." className="font-mono text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referral Rewards</CardTitle>
              <CardDescription>Users earn a flat bonus when someone signs up via their link, plus a percentage when that referred user funds their wallet for the first time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Signup bonus (₦)</Label>
                <Input type="number" min={0} value={get("referral_signup_bonus")} onChange={(e) => set("referral_signup_bonus", e.target.value)} placeholder="100" />
                <p className="text-[11px] text-muted-foreground mt-1">Credited to referrer immediately when their referral creates an account.</p>
              </div>
              <div>
                <Label>Purchase bonus (% of first top-up)</Label>
                <Input type="number" min={0} max={100} step={0.5} value={get("referral_purchase_pct")} onChange={(e) => set("referral_purchase_pct", e.target.value)} placeholder="10" />
                <p className="text-[11px] text-muted-foreground mt-1">One-time bonus on the referred user's first successful Paystack top-up.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Social Media Links</CardTitle>
              <CardDescription>Paste your profile/page URLs. Brand-coloured icons appear in the site footer for every platform you fill in. Leave blank to hide an icon.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {[
                ["social_facebook","Facebook","https://facebook.com/yourpage"],
                ["social_x","X (Twitter)","https://x.com/yourhandle"],
                ["social_instagram","Instagram","https://instagram.com/yourhandle"],
                ["social_tiktok","TikTok","https://tiktok.com/@yourhandle"],
                ["social_youtube","YouTube","https://youtube.com/@yourchannel"],
                ["social_linkedin","LinkedIn","https://linkedin.com/company/..."],
                ["social_whatsapp","WhatsApp","https://wa.me/234XXXXXXXXX"],
                ["social_telegram","Telegram","https://t.me/yourchannel"],
                ["social_threads","Threads","https://threads.net/@yourhandle"],
                ["social_pinterest","Pinterest","https://pinterest.com/yourhandle"],
                ["social_snapchat","Snapchat","https://snapchat.com/add/yourhandle"],
                ["social_reddit","Reddit","https://reddit.com/r/yoursub"],
              ].map(([k,label,ph]) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  <Input value={get(k)} onChange={(e)=>set(k,e.target.value)} placeholder={ph} className="font-mono text-xs h-9" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={saveAll} className="w-full sm:hidden"><Save className="h-4 w-4 mr-1" />Save Changes</Button>
    </div>
  );
}
