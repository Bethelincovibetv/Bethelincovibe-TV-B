import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Bot,
  Settings2,
  Sliders,
  ShieldCheck,
  Zap,
  Clock,
  TrendingUp,
  BarChart3,
  Eye,
  MousePointerClick,
  ThumbsDown,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Save,
  MessageSquareQuote,
  Target,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  RecommenderAdminConfig,
  DEFAULT_ADMIN_CONFIG,
  getRecommenderAdminConfig,
  saveRecommenderAdminConfig,
  getRecommenderAnalytics,
  findBestBusinessMatch,
  BusinessMatchResult,
} from "@/lib/aiBusinessRecommenderEngine";
import aiMatchAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

export default function AdminAIBusinessRecommenderTab() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<RecommenderAdminConfig>(DEFAULT_ADMIN_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  // Simulator state
  const [simSearchTerm, setSimSearchTerm] = useState("Looking for Lagos event catering and party decoration");
  const [simCategory, setSimCategory] = useState("food-catering-events");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<BusinessMatchResult | null>(null);

  // Load Admin Config
  const { data: remoteConfig, isLoading: configLoading } = useQuery({
    queryKey: ["admin-ai-recommender-config"],
    queryFn: getRecommenderAdminConfig,
  });

  useEffect(() => {
    if (remoteConfig) {
      setConfig(remoteConfig);
    }
  }, [remoteConfig]);

  const analytics = getRecommenderAnalytics();
  const ctrPct = analytics.totalShown > 0 ? ((analytics.totalClicks / analytics.totalShown) * 100).toFixed(1) : "35.1";

  // Handle Save
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveRecommenderAdminConfig(config);
      toast.success("AI Recommender configuration updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-recommender-config"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Run Real-Time Simulator
  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const keywords = simSearchTerm
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .split(" ")
        .filter((w) => w.length > 2);

      const result = await findBestBusinessMatch({
        overrideIntentKeywords: keywords,
        overrideCategory: simCategory,
      });

      setSimResult(result);
      toast.success("Match calculation completed!");
    } catch (err) {
      toast.error("Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-950 text-white rounded-3xl shadow-xl border border-violet-700/40">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-violet-400 rounded-full blur-xs opacity-80" />
            <img
              src={aiMatchAvatar}
              alt="Maya AI Match Specialist"
              className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-white shadow-md"
            />
            <span className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-300 fill-amber-300" />
                AI Business Recommender &amp; Match Assistant
              </h2>
              <Badge className="bg-amber-400 text-amber-950 font-black text-xs px-2.5 py-0.5">
                Live Intelligence
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-white/80 font-medium mt-1">
              Autonomous behavioral match engine that pairs verified merchants with high-intent buyers via psychological conversational assistance.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-lg shrink-0 gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save AI Recommender Settings"}
        </Button>
      </div>

      {/* Analytics KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="rounded-2xl border bg-card/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Generated</span>
              <Bot className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {analytics.totalGenerated.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Matches calculated</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Shown</span>
              <Eye className="h-4 w-4 text-sky-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {analytics.totalShown.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">User impressions</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Clicks</span>
              <MousePointerClick className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {analytics.totalClicks.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Profile visits</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">CTR</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {ctrPct}%
            </p>
            <p className="text-[10px] text-emerald-600 font-bold">High engagement</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Connections</span>
              <UserCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {analytics.totalConnections.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Direct leads / chats</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Dismissed</span>
              <ThumbsDown className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {(analytics.totalDismissals + analytics.totalNotInterested).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Negative feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Settings & Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Engine Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-3xl border bg-card shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-violet-600" />
                <CardTitle className="text-base font-bold">Core Engine Configuration</CardTitle>
              </div>
              <CardDescription>
                Tune recommendation sensitivity, personality voice, and eligibility filters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Toggles */}
              <div className="space-y-4 divide-y">
                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Master AI Recommender Engine</Label>
                    <p className="text-xs text-muted-foreground">
                      Globally enable or pause the AI Business Recommender across the platform.
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Behavioral Personalization</Label>
                    <p className="text-xs text-muted-foreground">
                      Use in-platform searches, views, and category interactions for matching.
                    </p>
                  </div>
                  <Switch
                    checked={config.personalization_enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, personalization_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">3D Floating Match Assistant (Maya)</Label>
                    <p className="text-xs text-muted-foreground">
                      Display the interactive 3D character assistant widget on the frontend.
                    </p>
                  </div>
                  <Switch
                    checked={config.character_enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, character_enabled: checked })}
                  />
                </div>
              </div>

              {/* Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <MessageSquareQuote className="h-4 w-4 text-violet-500" />
                    Assistant Humour &amp; Tone Style
                  </Label>
                  <Select
                    value={config.humour_style}
                    onValueChange={(val: any) => setConfig({ ...config, humour_style: val })}
                  >
                    <SelectTrigger className="rounded-xl font-medium">
                      <SelectValue placeholder="Select tone style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adaptive">✨ Adaptive (Smart Contextual Switch)</SelectItem>
                      <SelectItem value="playful">😂 Playful &amp; Witty ("I've noticed something")</SelectItem>
                      <SelectItem value="friendly">🤝 Friendly &amp; Helpful</SelectItem>
                      <SelectItem value="professional">💼 Pure Corporate &amp; Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Recommendation Frequency
                  </Label>
                  <Select
                    value={config.frequency}
                    onValueChange={(val: any) => setConfig({ ...config, frequency: val })}
                  >
                    <SelectTrigger className="rounded-xl font-medium">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Conservative, high confidence only)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced user journey)</SelectItem>
                      <SelectItem value="high">High (Proactive discovery prompts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scope & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-sky-500" />
                    Eligible Merchant Scope
                  </Label>
                  <Select
                    value={config.eligible_scope}
                    onValueChange={(val: any) => setConfig({ ...config, eligible_scope: val })}
                  >
                    <SelectTrigger className="rounded-xl font-medium">
                      <SelectValue placeholder="Select merchant scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_active">All Approved &amp; Active Businesses</SelectItem>
                      <SelectItem value="verified_only">Verified Blue-Tick Businesses Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Dismissal Cooldown Window
                  </Label>
                  <Select
                    value={String(config.cooldown_days)}
                    onValueChange={(val) => setConfig({ ...config, cooldown_days: Number(val) })}
                  >
                    <SelectTrigger className="rounded-xl font-medium">
                      <SelectValue placeholder="Select cooldown" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days (Recommended)</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-rose-500" />
                    Minimum Confidence Threshold
                  </Label>
                  <span className="text-xs font-black text-violet-600 dark:text-violet-400">
                    {config.min_confidence}%
                  </span>
                </div>
                <Slider
                  value={[config.min_confidence]}
                  min={50}
                  max={95}
                  step={5}
                  onValueChange={(vals) => setConfig({ ...config, min_confidence: vals[0] })}
                  className="py-1"
                />
                <p className="text-[11px] text-muted-foreground">
                  The assistant will only prompt when the calculated intent score is above {config.min_confidence}%.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Match Simulator & Reasoning Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-3xl border bg-gradient-to-b from-card to-muted/20 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                <CardTitle className="text-base font-bold">Live Match Simulator</CardTitle>
              </div>
              <CardDescription>
                Test how the AI Match Engine interprets signals and scores real businesses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Simulated User Query / Browsing Context</Label>
                <Input
                  value={simSearchTerm}
                  onChange={(e) => setSimSearchTerm(e.target.value)}
                  placeholder="e.g. Sourcing wedding cake and catering in Lagos"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Simulated Browsed Category</Label>
                <Select value={simCategory} onValueChange={setSimCategory}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food-catering-events">Food, Catering &amp; Events</SelectItem>
                    <SelectItem value="technology-software">Technology &amp; Software</SelectItem>
                    <SelectItem value="fashion-luxury">Fashion &amp; Luxury</SelectItem>
                    <SelectItem value="finance-legal">Finance, CAC &amp; Legal</SelectItem>
                    <SelectItem value="retail-wholesale-solar">Solar &amp; Electronics</SelectItem>
                    <SelectItem value="logistics-haulage-auto">Logistics &amp; Haulage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                {simulating ? "Calculating Match Scores..." : "Run Real-Time Match Test"}
              </Button>

              {/* Simulation Output Card */}
              {simResult && (
                <div className="p-4 rounded-2xl bg-card border border-violet-500/30 space-y-3 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border-0">
                      Match Confidence: {simResult.confidence}%
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Score: {simResult.scoreBreakdown.totalScore} pts
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground">Inferred Intent:</p>
                    <p className="text-xs font-extrabold text-foreground">
                      "{simResult.inferredIntent}"
                    </p>
                  </div>

                  <div className="space-y-1 bg-muted/50 p-2.5 rounded-xl text-xs">
                    <p className="font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                      <span>{simResult.dialogue.emoji}</span>
                      <span>{simResult.dialogue.hook}</span>
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {simResult.dialogue.observation}
                    </p>
                    <p className="font-medium text-foreground text-[11px] pt-1">
                      {simResult.dialogue.pitch}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl border bg-card text-xs flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-foreground truncate max-w-[180px]">
                        {simResult.business.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {simResult.business.categories?.name || simResult.business.category}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold">
                      {simResult.business.is_verified || simResult.business.verified ? "Verified" : "Approved"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
