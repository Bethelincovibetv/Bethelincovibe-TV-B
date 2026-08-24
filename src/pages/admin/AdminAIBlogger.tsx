import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Bot, Sparkles, Eye, Save, Loader2, TrendingUp, Zap, Clock, Link2, Trash2,
  Plus, Video, CheckCircle2, ArrowRight, Layers, ShieldCheck, Compass, FileText,
  ExternalLink, Check, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  conductStrategicBrainstorm,
  generateStrategicArticle,
  StrategicDirective,
  GeneratedArticle,
  TRENDING_MARKET_INTELLIGENCE,
} from "@/lib/aiCollaborationEngine";

const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminAIBlogger() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("casual");
  const [categoryId, setCategoryId] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);

  // --- Strategic Collaboration State ---
  const [activeDirective, setActiveDirective] = useState<StrategicDirective | null>(null);
  const [brainstormTheme, setBrainstormTheme] = useState("Trending Lagos Businesses, High-Growth Niches & Video Vlogs");
  const [brainstormCount, setBrainstormCount] = useState<number>(3);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [batchGeneratedPosts, setBatchGeneratedPosts] = useState<GeneratedArticle[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "blog");
      return data ?? [];
    },
  });

  // --- Schedule ---
  const { data: schedule, refetch: refetchSchedule } = useQuery({
    queryKey: ["autoblog-schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("autoblog_schedule").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: scheduleCats, refetch: refetchScheduleCats } = useQuery({
    queryKey: ["autoblog-categories", schedule?.id],
    enabled: !!schedule?.id,
    queryFn: async () => {
      const { data } = await supabase.from("autoblog_categories").select("category_id").eq("schedule_id", schedule!.id);
      return (data || []).map((d: any) => d.category_id);
    },
  });

  const updateSchedule = async (patch: any) => {
    if (schedule?.id) {
      const { error } = await supabase.from("autoblog_schedule").update(patch).eq("id", schedule.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("autoblog_schedule").insert({
        enabled: patch.enabled ?? false,
        interval_hours: patch.interval_hours ?? 24,
        keywords: patch.keywords ?? "",
        category_id: patch.category_id ?? null,
        mode: patch.mode ?? "single",
        posts_per_run: patch.posts_per_run ?? 1,
        auto_approve: patch.auto_approve ?? true,
      });
      if (error) throw error;
    }
    refetchSchedule();
  };

  const toggleCategory = async (catId: string, checked: boolean) => {
    if (!schedule?.id) {
      await updateSchedule({ enabled: false });
      setTimeout(() => toggleCategory(catId, checked), 300);
      return;
    }
    if (checked) {
      await supabase.from("autoblog_categories").insert({ schedule_id: schedule.id, category_id: catId });
    } else {
      await supabase.from("autoblog_categories").delete().eq("schedule_id", schedule.id).eq("category_id", catId);
    }
    refetchScheduleCats();
  };

  // --- Affiliate links ---
  const { data: affiliateLinks, refetch: refetchAffiliates } = useQuery({
    queryKey: ["affiliate-links"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_links").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [newAff, setNewAff] = useState({ label: "", url: "", keywords: "" });
  const addAffiliate = async () => {
    if (!newAff.label || !newAff.url) return toast.error("Label and URL required");
    const { error } = await supabase.from("affiliate_links").insert({
      label: newAff.label,
      url: newAff.url,
      keywords: newAff.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      active: true,
    });
    if (error) return toast.error(error.message);
    setNewAff({ label: "", url: "", keywords: "" });
    refetchAffiliates();
    toast.success("Affiliate link added");
  };

  const deleteAffiliate = async (id: string) => {
    await supabase.from("affiliate_links").delete().eq("id", id);
    refetchAffiliates();
  };

  // --- Single Post Generation ---
  const [trendingCategoryId, setTrendingCategoryId] = useState<string>("");
  const trendingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-blogger", {
        body: { useTrending: "list", keywords, categoryId: trendingCategoryId || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.trending) {
        setTrendingTopics(data.trending);
        toast.success(`Trending topics${data.category ? ` for ${data.category}` : ""} loaded!`);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to fetch trends"),
  });

  const generateMutation = useMutation({
    mutationFn: async (useTrending?: boolean) => {
      const { data, error } = await supabase.functions.invoke("ai-blogger", {
        body: { topic: useTrending ? "" : topic, keywords, tone, useTrending: useTrending || false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setPreview(data);
      toast.success("Post generated! Review and publish below.");
    },
    onError: (e: any) => toast.error(e.message || "Generation failed"),
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!preview) throw new Error("Generate a post first");
      const slug = generateSlug(preview.title);
      const { error } = await supabase.from("blog_posts").insert({
        title: preview.title,
        slug,
        excerpt: preview.excerpt,
        content: preview.content,
        featured_image: preview.featured_image,
        category_id: categoryId || null,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
        author_id: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, publish) => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(publish ? "Post published!" : "Post saved as draft!");
      setPreview(null);
      setTopic("");
      setKeywords("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Strategic AI Collaboration Handlers ---
  const handleStartStrategicBrainstorm = async () => {
    setIsBrainstorming(true);
    try {
      const availableCategories = (categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      }));

      const directive = await conductStrategicBrainstorm({
        theme: brainstormTheme,
        targetNiche: "Lagos Businesses, Tech Startups & Traders",
        campaignGoal: "traffic & directory discovery",
        numberOfPosts: brainstormCount,
        availableCategories,
      });

      setActiveDirective(directive);
      toast.success("Executive strategic session completed! Review the multi-post blueprint below.");
    } catch (err: any) {
      toast.error("Brainstorming failed: " + err.message);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleGenerateBatchPosts = async () => {
    if (!activeDirective) return;
    setIsBatchGenerating(true);
    setBatchGeneratedPosts([]);
    try {
      const generated: GeneratedArticle[] = [];
      for (const topicItem of activeDirective.suggestedTopics) {
        const art = await generateStrategicArticle({
          topic: topicItem.title,
          angle: topicItem.angle,
          categoryName: topicItem.targetCategory,
          isVlog: topicItem.isVlog,
          videoUrl: topicItem.suggestedVideoUrl,
          keywords: topicItem.keywords,
        });
        generated.push(art);
      }
      setBatchGeneratedPosts(generated);
      toast.success(`Generated ${generated.length} strategic articles & vlogs! Ready for batch publishing.`);
    } catch (err: any) {
      toast.error("Batch generation error: " + err.message);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleBatchPublish = async (publishLive: boolean) => {
    if (batchGeneratedPosts.length === 0) return;
    setIsBatchPublishing(true);
    try {
      let published = 0;
      for (const post of batchGeneratedPosts) {
        // Find or create category
        const matchCat = (categories || []).find(
          (c: any) => c.name.toLowerCase() === post.category_name?.toLowerCase()
        );

        let catId = matchCat?.id;
        if (!catId && post.category_name) {
          const slug = post.category_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const { data: newCat } = await supabase
            .from("categories")
            .insert({ name: post.category_name, slug, type: "blog" })
            .select("id")
            .maybeSingle();
          if (newCat) catId = newCat.id;
        }

        const { error } = await supabase.from("blog_posts").insert({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category_id: catId || null,
          published: publishLive,
          published_at: publishLive ? new Date().toISOString() : null,
          is_featured: true,
          author_id: user?.id || null,
        });

        if (!error) published++;
      }

      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(`Successfully ${publishLive ? "published" : "saved to draft"} ${published} articles/vlogs!`);
      setBatchGeneratedPosts([]);
      setActiveDirective(null);
    } catch (err: any) {
      toast.error("Batch publishing failed: " + err.message);
    } finally {
      setIsBatchPublishing(false);
    }
  };

  const mode = schedule?.mode || "single";
  const isMulti = mode === "multi";

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-primary/15 border border-purple-500/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-white/20 shrink-0">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight leading-none">
                AI Lead Blogger & Vlogger Studio
              </h1>
              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-extrabold">
                Strategic Co-Pilot Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Collaborate directly with the AI General Administrator to execute strategic Multi-Blog & Multi-Vlog campaigns with auto-category routing.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8 font-bold text-xs rounded-xl gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 self-start sm:self-auto shrink-0"
        >
          <Link to="/admin/platform-ai">
            <Bot className="h-3.5 w-3.5" />
            AI Strategy Director
          </Link>
        </Button>
      </div>

      {/* STRATEGIC COLLABORATION SUITE & MULTI-VLOG POSTING HUB */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-card via-indigo-500/5 to-purple-500/5 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-indigo-500/10 py-3.5 px-4 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  AI Admin & AI Blogger Strategic Collaboration Suite
                </CardTitle>
                <CardDescription className="text-xs font-medium mt-0.5">
                  The AI Admin (Boss) and AI Blogger (Worker) reason together to identify viral trends, auto-select categories, and create Multi-Blog & Vlog series.
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-indigo-600 text-white font-extrabold text-[10px]">
              Multi-Blog & Vlog Engine
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* Strategic Directive Controls */}
          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Strategic Theme / Niche Focus</Label>
              <Input
                value={brainstormTheme}
                onChange={(e) => setBrainstormTheme(e.target.value)}
                placeholder="e.g. Lagos SME Scaling, Verified Sourcing, Tech Startups, Solar Power..."
                className="h-10 text-xs rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Post Quantity</Label>
              <Select value={String(brainstormCount)} onValueChange={(v) => setBrainstormCount(Number(v))}>
                <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Strategic Posts (Blog + Vlog)</SelectItem>
                  <SelectItem value="3">3 Strategic Posts (Full Series)</SelectItem>
                  <SelectItem value="4">4 Strategic Posts (Omni-Category)</SelectItem>
                  <SelectItem value="5">5 Strategic Posts (Weekly Batch)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStartStrategicBrainstorm}
              disabled={isBrainstorming}
              className="h-10 font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-sm"
            >
              {isBrainstorming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reasoning with AI Admin…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Start Joint Strategic Session
                </>
              )}
            </Button>
          </div>

          {/* Active Directive Output Feed */}
          {activeDirective && (
            <div className="p-4 rounded-2xl border border-indigo-500/30 bg-background/95 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                <div>
                  <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                    Executive Strategy Directive
                  </Badge>
                  <h3 className="text-sm font-black text-foreground mt-1">{activeDirective.theme}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Target: <strong>{activeDirective.targetAudience}</strong> • Rationale: {activeDirective.categoryRationale}
                  </p>
                </div>
                <Button
                  onClick={handleGenerateBatchPosts}
                  disabled={isBatchGenerating}
                  className="h-9 font-black text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5 shadow-sm"
                >
                  {isBatchGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI Blogger Writing Articles & Vlogs…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Generate All {activeDirective.suggestedTopics.length} Articles & Vlogs
                    </>
                  )}
                </Button>
              </div>

              {/* Topics Grid */}
              <div className="grid gap-2.5 sm:grid-cols-3">
                {activeDirective.suggestedTopics.map((t, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-card/60 flex flex-col justify-between gap-2 shadow-xs">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <Badge variant="secondary" className="text-[9px] font-bold">
                          {t.isVlog ? "🎥 Vlog Video Article" : "📰 Guide"}
                        </Badge>
                        <span className="text-[10px] font-extrabold text-primary">{t.targetCategory}</span>
                      </div>
                      <p className="font-bold text-xs text-foreground line-clamp-2 leading-snug">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.angle}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t text-[9px] text-muted-foreground">
                      {t.keywords.slice(0, 3).map((k, ki) => (
                        <span key={ki} className="bg-muted px-1.5 py-0.5 rounded">#{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch Generated Posts Review & 1-Click Publish */}
          {batchGeneratedPosts.length > 0 && (
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      {batchGeneratedPosts.length} Strategic Articles & Vlogs Ready
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Full formatted copy, vlog embeds, auto-category mappings, and Lagos market frameworks are generated.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchPublish(false)}
                    disabled={isBatchPublishing}
                    className="h-9 font-bold text-xs rounded-xl"
                  >
                    Save All as Drafts
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBatchPublish(true)}
                    disabled={isBatchPublishing}
                    className="h-9 font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-sm"
                  >
                    {isBatchPublishing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing to Live Site…
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> 1-Click Publish All to Site
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Previews List */}
              <div className="space-y-3">
                {batchGeneratedPosts.map((post, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px] font-extrabold">
                          {post.is_vlog ? "Vlog Embedded" : "Article"}
                        </Badge>
                        <span className="text-[11px] font-bold text-primary">{post.category_name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">/{post.slug}</span>
                      </div>
                      <h5 className="font-extrabold text-xs sm:text-sm text-foreground truncate">{post.title}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.excerpt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Publishing Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Background Auto-Publishing Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={schedule?.enabled || false}
                onCheckedChange={(checked) => updateSchedule({ enabled: checked })}
              />
              <Label className="text-sm font-semibold">Enable automatic background posting</Label>
            </div>
            <div className="flex items-center gap-2 rounded-full border p-1 bg-muted/30">
              <button
                onClick={() => updateSchedule({ mode: "single" })}
                className={`px-3 py-1 text-xs rounded-full font-bold transition ${!isMulti ? "bg-primary text-primary-foreground" : ""}`}
              >
                Single Mode
              </button>
              <button
                onClick={() => updateSchedule({ mode: "multi" })}
                className={`px-3 py-1 text-xs rounded-full font-bold transition ${isMulti ? "bg-primary text-primary-foreground" : ""}`}
              >
                Multi Mode
              </button>
            </div>
          </div>

          {schedule?.enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Post every (hours)</Label>
                  <Select value={String(schedule?.interval_hours || 24)} onValueChange={(v) => updateSchedule({ interval_hours: parseInt(v) })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">Every 6 hours</SelectItem>
                      <SelectItem value="12">Every 12 hours</SelectItem>
                      <SelectItem value="24">Every 24 hours</SelectItem>
                      <SelectItem value="48">Every 2 days</SelectItem>
                      <SelectItem value="72">Every 3 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Focus Keywords</Label>
                  <Input value={schedule?.keywords || ""} onChange={(e) => updateSchedule({ keywords: e.target.value })} placeholder="e.g., Lagos, business" className="rounded-xl" />
                </div>
                {isMulti ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Posts per run</Label>
                    <Select value={String(schedule?.posts_per_run || 1)} onValueChange={(v) => updateSchedule({ posts_per_run: parseInt(v) })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} post{n > 1 ? "s" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Default Category</Label>
                    <Select value={schedule?.category_id || ""} onValueChange={(v) => updateSchedule({ category_id: v || null })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isMulti && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs font-bold">Categories to rotate (multi-mode)</Label>
                  <p className="text-xs text-muted-foreground">AI will cycle posts through these categories.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories?.map((c: any) => (
                      <label key={c.id} className="flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer hover:bg-accent transition-colors">
                        <Checkbox
                          checked={scheduleCats?.includes(c.id) || false}
                          onCheckedChange={(checked) => toggleCategory(c.id, !!checked)}
                        />
                        <span className="text-xs font-bold">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Switch checked={schedule?.auto_approve !== false} onCheckedChange={(v) => updateSchedule({ auto_approve: v })} />
                <Label className="text-xs font-semibold">Auto-publish immediately (off = save as draft for review)</Label>
              </div>
            </>
          )}
          {schedule?.last_run_at && (
            <p className="text-xs text-muted-foreground">Last auto-post: {new Date(schedule.last_run_at).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      {/* Affiliate & Backlink Library */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> Affiliate & Backlink Auto-Injector
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">AI will automatically link these keywords in generated posts. Use comma-separated keywords.</p>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Label (e.g. Verified Lagos Directory)" value={newAff.label} onChange={(e) => setNewAff({ ...newAff, label: e.target.value })} className="rounded-xl text-xs" />
            <Input placeholder="https://..." value={newAff.url} onChange={(e) => setNewAff({ ...newAff, url: e.target.value })} className="rounded-xl text-xs" />
            <Input placeholder="keyword1, keyword2" value={newAff.keywords} onChange={(e) => setNewAff({ ...newAff, keywords: e.target.value })} className="rounded-xl text-xs" />
            <Button onClick={addAffiliate} className="rounded-xl font-bold text-xs"><Plus className="h-4 w-4 mr-1" /> Add Link</Button>
          </div>
          <div className="space-y-2">
            {affiliateLinks?.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 border rounded-xl bg-card shadow-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.url}</p>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {(a.keywords || []).map((k: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>)}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteAffiliate(a.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {!affiliateLinks?.length && <p className="text-xs text-muted-foreground italic">No affiliate links configured yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Manual Single Post Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Single Article & Vlog Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed p-3 sm:p-4 space-y-3 min-w-0 bg-muted/10">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="flex items-center gap-2 text-xs font-bold">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" /> Trending Nigerian Market Topics
              </Label>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <Select value={trendingCategoryId || "all"} onValueChange={(v) => setTrendingCategoryId(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs rounded-xl"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => trendingMutation.mutate()} disabled={trendingMutation.isPending} className="w-full sm:w-auto rounded-xl text-xs font-bold">
                  {trendingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                  Fetch Live Trends
                </Button>
              </div>
            </div>
            {trendingTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((t, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs py-1 px-2.5 rounded-lg"
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {TRENDING_MARKET_INTELLIGENCE.map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors text-[11px] py-1 px-2.5 rounded-lg"
                    onClick={() => setTopic(t.topic)}
                  >
                    {t.isVlog ? "🎥 " : "📰 "}{t.topic}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label className="text-xs font-bold">Topic / Title Idea *</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., How to start a high-margin food packaging business in Lagos"
              rows={2}
              className="w-full text-xs rounded-xl min-w-0 break-words"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 min-w-0">
              <Label className="text-xs font-bold">Target Keywords</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., Lagos, food, packaging" className="w-full text-xs rounded-xl" />
            </div>
            <div className="space-y-2 min-w-0">
              <Label className="text-xs font-bold">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-full text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual & Conversational</SelectItem>
                  <SelectItem value="professional">Executive & Professional</SelectItem>
                  <SelectItem value="educational">Educational & Step-by-Step</SelectItem>
                  <SelectItem value="persuasive">High-Converting & Persuasive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-0">
              <Label className="text-xs font-bold">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full text-xs rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => generateMutation.mutate(false)} disabled={!topic.trim() || generateMutation.isPending} className="flex-1 sm:flex-none rounded-xl font-bold text-xs">
              {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Post</>}
            </Button>
            <Button variant="outline" onClick={() => generateMutation.mutate(true)} disabled={generateMutation.isPending} className="flex-1 sm:flex-none rounded-xl font-bold text-xs">
              <TrendingUp className="h-4 w-4 mr-2" /> Generate from Trending
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single Preview */}
      {preview && (
        <Card className="min-w-0 overflow-hidden border-primary/30 shadow-md">
          <CardHeader className="p-4 sm:p-6 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2 flex-wrap">
              <Eye className="h-5 w-5 shrink-0" /> Article Preview
              {preview.trending_topic && <Badge variant="outline" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" /> Trending</Badge>}
              {preview.has_youtube && <Badge variant="outline" className="text-xs">🎬 Video Vlog</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 min-w-0">
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <h2 className="text-base sm:text-lg font-black break-words leading-snug text-foreground mt-0.5 min-w-0">{preview.title}</h2>
            </div>
            {preview.excerpt && (
              <div className="min-w-0">
                <Label className="text-xs text-muted-foreground">Excerpt</Label>
                <p className="text-xs text-muted-foreground break-words mt-0.5 min-w-0">{preview.excerpt}</p>
              </div>
            )}
            {preview.featured_image && <img src={preview.featured_image} alt="" className="w-full max-h-64 object-cover rounded-xl" />}
            <div className="border rounded-xl p-3 sm:p-4 max-h-[500px] overflow-y-auto min-w-0 bg-card">
              <div className="prose prose-sm max-w-none break-words overflow-x-auto" dangerouslySetInnerHTML={{ __html: preview.content }} />
            </div>
            <div className="flex gap-2 flex-wrap pt-2">
              <Button onClick={() => publishMutation.mutate(true)} disabled={publishMutation.isPending} className="flex-1 sm:flex-none rounded-xl font-bold text-xs"><Save className="h-4 w-4 mr-1" /> Publish Now</Button>
              <Button variant="outline" onClick={() => publishMutation.mutate(false)} disabled={publishMutation.isPending} className="flex-1 sm:flex-none rounded-xl font-bold text-xs">Save as Draft</Button>
              <Button variant="ghost" onClick={() => setPreview(null)} className="w-full sm:w-auto rounded-xl text-xs">Discard</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
