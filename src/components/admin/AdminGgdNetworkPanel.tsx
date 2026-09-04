import React, { useState, useEffect } from "react";
import {
  getGgdConfig,
  saveGgdConfig,
  testGgdConnection,
  fetchGgdAds,
  publishAdToGgd,
  trackGgdEvent,
  getGgdPublishedHistory,
  clearGgdPublishedHistory,
  GgdAdItem,
  GgdPublishedRecord,
  DEFAULT_GGD_API_KEY,
  GGD_API_BASE_URL,
} from "@/services/ggdAdNetworkService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Send,
  ExternalLink,
  Sparkles,
  Zap,
  Radio,
  Clock,
  Trash2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminGgdNetworkPanel() {
  const [apiKey, setApiKey] = useState(DEFAULT_GGD_API_KEY);
  const [showKey, setShowKey] = useState(false);
  const [autoPublish, setAutoPublish] = useState(true);
  const [autoApprove, setAutoApprove] = useState(true);
  const [displayGgdAds, setDisplayGgdAds] = useState(true);
  const [networkEnabled, setNetworkEnabled] = useState(true);

  // Connection diagnostics
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
    count?: number;
  }>({
    tested: false,
    success: false,
    message: "Not tested yet",
  });

  // Live GGD ads feed
  const [liveAds, setLiveAds] = useState<GgdAdItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Published audit history
  const [history, setHistory] = useState<GgdPublishedRecord[]>([]);

  // Manual Test Ad Submitter state
  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testTargetUrl, setTestTargetUrl] = useState("https://bethelincovibe.com");
  const [testImageUrl, setTestImageUrl] = useState("/logo.png");
  const [testDuration, setTestDuration] = useState(30);
  const [submittingTest, setSubmittingTest] = useState(false);

  // Load config and history
  const reloadData = async () => {
    try {
      const cfg = await getGgdConfig();
      setApiKey(cfg.apiKey || DEFAULT_GGD_API_KEY);
      setAutoPublish(cfg.autoPublish);
      setAutoApprove(cfg.autoApprove);
      setDisplayGgdAds(cfg.displayGgdAdsInBanners);
      setNetworkEnabled(cfg.enabled);

      setHistory(getGgdPublishedHistory());
    } catch (e) {
      console.warn("Could not load GGD config:", e);
    }
  };

  useEffect(() => {
    reloadData();
    loadLiveFeed();
    // Quick initial ping
    handleTestConnection(DEFAULT_GGD_API_KEY, true);

    const onPublished = () => {
      setHistory(getGgdPublishedHistory());
    };
    window.addEventListener("btv_ggd_ad_published", onPublished);
    return () => window.removeEventListener("btv_ggd_ad_published", onPublished);
  }, []);

  const loadLiveFeed = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetchGgdAds(8, true);
      if (res.success) {
        setLiveAds(res.ads);
      }
    } catch (e) {
      console.warn("Feed load error:", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleTestConnection = async (keyToTest?: string, silent = false) => {
    setTestingConnection(true);
    const key = keyToTest || apiKey;
    const res = await testGgdConnection(key);
    setConnectionStatus({
      tested: true,
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
      count: res.count,
    });
    setTestingConnection(false);

    if (!silent) {
      if (res.success) {
        toast.success(res.message);
        loadLiveFeed();
      } else {
        toast.error(res.message);
      }
    }
  };

  const handleSaveConfig = async () => {
    try {
      await saveGgdConfig({
        apiKey: apiKey.trim(),
        enabled: networkEnabled,
        autoPublish,
        autoApprove,
        displayGgdAdsInBanners: displayGgdAds,
      });
      toast.success("GGD Ad Network settings and automation rules saved successfully!");
      handleTestConnection(apiKey.trim(), true);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  const handleManualSubmit = async () => {
    if (!testTitle.trim()) {
      toast.error("Please provide an advert title");
      return;
    }
    if (!testTargetUrl.trim()) {
      toast.error("Please provide a target URL");
      return;
    }

    setSubmittingTest(true);
    try {
      const res = await publishAdToGgd({
        title: testTitle.trim(),
        description: testDescription.trim() || undefined,
        target_url: testTargetUrl.trim(),
        image_url: testImageUrl.trim() || undefined,
        duration_days: Number(testDuration) || 30,
      });

      if (res.success) {
        toast.success(`🎉 Advert published to GGD Ad Network! (GGD ID: ${res.ggd_ad_id || "Active"})`);
        setTestTitle("");
        setTestDescription("");
        setHistory(getGgdPublishedHistory());
        loadLiveFeed();
      } else {
        toast.error(`GGD Submission Error: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit advert");
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleTrackTestClick = async (adId: string) => {
    try {
      await trackGgdEvent(adId, "click");
      toast.success(`Click event registered for GGD Ad #${adId.slice(0, 8)}...`);
    } catch (e: any) {
      toast.error(e.message || "Click tracking test failed");
    }
  };

  const handleClearHistory = () => {
    if (confirm("Clear local GGD published history log?")) {
      clearGgdPublishedHistory();
      setHistory([]);
      toast.success("History cleared");
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-purple-500/20 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-0.5 border-none shadow-sm">
                Live Integration Active
              </Badge>
              <Badge variant="outline" className="text-white/80 border-white/20 text-xs font-mono">
                v1/ad-network-api
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Globe className="h-7 w-7 text-indigo-400" /> GGD Ad Network & Dual-Publishing System
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Every user-created banner advert on Bethelincovibe automatically publishes locally and syndicates to the
              GGD Ad Network simultaneously. Manage your API key, approval rules, and live syndications below.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <Button
              onClick={() => handleTestConnection()}
              disabled={testingConnection}
              className="bg-white text-purple-950 hover:bg-white/95 font-black text-xs rounded-xl shadow-md h-10 px-4"
            >
              {testingConnection ? (
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1.5 text-amber-500" />
              )}
              {testingConnection ? "Pinging API..." : "Ping & Verify API Key"}
            </Button>

            <Button
              onClick={loadLiveFeed}
              variant="outline"
              className="text-white border-white/25 hover:bg-white/10 font-bold text-xs rounded-xl h-10 px-4"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingFeed ? "animate-spin" : ""}`} />
              Refresh Network Feed
            </Button>
          </div>
        </div>

        {/* Live status readout */}
        {connectionStatus.tested && (
          <div
            className={`mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs flex-wrap gap-2 ${
              connectionStatus.success ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {connectionStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{connectionStatus.message}</span>
            </div>
            {connectionStatus.latencyMs !== undefined && (
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px] text-white">
                Latency: {connectionStatus.latencyMs}ms · Network Pool: {connectionStatus.count || 0} ads
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid: Settings & Automation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. API Key Configuration Card */}
        <Card className="rounded-3xl border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">GGD Ad Network API Key</CardTitle>
                  <CardDescription className="text-xs">
                    Supplied with every request via header <code>x-api-key</code>
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                API Base: Supabase Edge
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Secret API Key</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Production endpoint authenticated
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="ggd_..."
                    className="font-mono text-xs pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    toast.success("API Key copied to clipboard");
                  }}
                  className="rounded-xl shrink-0"
                  title="Copy Key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-primary" /> API Endpoint URL
              </p>
              <p className="font-mono text-[11px] text-muted-foreground break-all">
                {GGD_API_BASE_URL}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApiKey(DEFAULT_GGD_API_KEY)}
                className="text-xs rounded-xl font-semibold"
              >
                Reset to Default Key
              </Button>
              <Button
                size="sm"
                onClick={handleSaveConfig}
                className="bg-primary text-primary-foreground font-bold text-xs rounded-xl"
              >
                Save API Key & Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Dual-Publishing & Automatic Approval Controls */}
        <Card className="rounded-3xl border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Dual-Publishing & Approval Automation</CardTitle>
                <CardDescription className="text-xs">
                  Configure automatic approval and platform-to-network syndication
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Automatic Approval Toggle */}
            <div className="flex items-start justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/20 transition gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs">Automatic Advert Approval</p>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] font-extrabold">
                    Default: ON
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When enabled, user-created banner adverts go live immediately without waiting for admin approval. If
                  disabled, ads remain pending until you manually review them.
                </p>
              </div>
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>

            {/* Auto-Publish to GGD Network Toggle */}
            <div className="flex items-start justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/20 transition gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs">Auto-Publish to GGD Ad Network</p>
                  <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[9px] font-extrabold">
                    Two Publishing Systems
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When enabled, every banner advert created on Bethelincovibe is automatically published to both the
                  local platform and syndicated to the GGD Ad Network simultaneously.
                </p>
              </div>
              <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
            </div>

            {/* Display GGD Network Ads in Banners */}
            <div className="flex items-start justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/20 transition gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs">Rotate GGD Partner Ads in Banners</p>
                  <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[9px] font-extrabold">
                    Revenue & Network
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Serve rotating GGD network partner adverts inside Bethelincovibe banner placements with live
                  impression and click telemetry.
                </p>
              </div>
              <Switch checked={displayGgdAds} onCheckedChange={setDisplayGgdAds} />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveConfig}
                className="bg-primary text-primary-foreground font-bold text-xs rounded-xl"
              >
                Apply Automation Rules
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Ad Submitter & Live Network Ads Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Test Ad Submitter (5 cols) */}
        <Card className="lg:col-span-5 rounded-3xl border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Submit Advert to GGD Network</CardTitle>
                <CardDescription className="text-xs">
                  Direct submission sandbox to test payload format and API responses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Campaign Title *</Label>
              <Input
                placeholder="e.g. Lagos VIP Tech Conference 2026"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Short Description</Label>
              <Textarea
                placeholder="Highlight your offer, discount, or brand message..."
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                rows={2}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Target Destination URL *</Label>
              <Input
                placeholder="https://..."
                value={testTargetUrl}
                onChange={(e) => setTestTargetUrl(e.target.value)}
                className="text-xs font-mono rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Banner Image URL</Label>
              <Input
                placeholder="https://... or /logo.png"
                value={testImageUrl}
                onChange={(e) => setTestImageUrl(e.target.value)}
                className="text-xs font-mono rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Duration (Days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={testDuration}
                onChange={(e) => setTestDuration(Number(e.target.value))}
                className="text-xs rounded-xl"
              />
            </div>

            <Button
              onClick={handleManualSubmit}
              disabled={submittingTest || !testTitle.trim() || !testTargetUrl.trim()}
              className="w-full mt-2 font-black text-xs rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:opacity-95"
            >
              {submittingTest ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {submittingTest ? "Publishing to GGD..." : "Publish to GGD Ad Network Now"}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Live Ads from GGD Network (7 cols) */}
        <Card className="lg:col-span-7 rounded-3xl border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Live GGD Network Pool ({liveAds.length})</CardTitle>
                  <CardDescription className="text-xs">
                    Current active partner adverts running across the network
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLiveFeed}
                disabled={loadingFeed}
                className="text-xs font-bold rounded-xl"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingFeed ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingFeed ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                Fetching live ads from GGD Network...
              </div>
            ) : liveAds.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No active ads returned from GGD Network. Check API key and ping connection.
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {liveAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition"
                  >
                    {ad.image_url ? (
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-16 h-16 object-cover rounded-xl shrink-0 border shadow-2xs"
                        onError={(e: any) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-muted-foreground opacity-40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-foreground truncate">{ad.title}</p>
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                          {ad.id.slice(0, 8)}...
                        </Badge>
                      </div>
                      {ad.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1 text-[11px]">
                        <a
                          href={ad.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold truncate max-w-[200px]"
                        >
                          {ad.target_url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleTrackTestClick(ad.id)}
                          className="text-muted-foreground hover:text-foreground text-[10px] font-semibold underline shrink-0"
                        >
                          Test Click Telemetry
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Published to GGD Ad Network Audit Log */}
      <Card className="rounded-3xl border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Syndicated Posts & Publishing Audit Log</CardTitle>
                <CardDescription className="text-xs">
                  History of adverts published to the GGD Ad Network from Bethelincovibe
                </CardDescription>
              </div>
            </div>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Log
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs space-y-1">
              <p className="font-bold text-foreground">No Syndicated Posts Recorded Yet</p>
              <p>When user adverts are submitted or published, their GGD syndication record will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 font-semibold">Advert Title</th>
                    <th className="pb-2 font-semibold">Target URL</th>
                    <th className="pb-2 font-semibold">Duration</th>
                    <th className="pb-2 font-semibold">GGD ID</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Published At</th>
                    <th className="pb-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/30 transition">
                      <td className="py-2.5 font-bold text-foreground max-w-[200px] truncate">
                        {rec.title}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-muted-foreground max-w-[180px] truncate">
                        <a
                          href={rec.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary flex items-center gap-1"
                        >
                          {rec.target_url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{rec.duration_days} days</td>
                      <td className="py-2.5 font-mono text-[11px]">
                        {rec.ggd_ad_id ? (
                          <span className="text-emerald-600 font-semibold">{rec.ggd_ad_id.slice(0, 10)}...</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={rec.status === "success" ? "default" : "destructive"}
                          className="text-[9px] font-bold"
                        >
                          {rec.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                        {rec.published_at ? format(new Date(rec.published_at), "MMM d, HH:mm") : "Just now"}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {rec.ggd_ad_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTrackTestClick(rec.ggd_ad_id!)}
                            className="h-7 text-[10px] rounded-lg font-semibold"
                          >
                            Test Click
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
