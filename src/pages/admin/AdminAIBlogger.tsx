import { useState, useMemo } from "react";
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
  ExternalLink, Check, RefreshCw, Sliders, DollarSign, Tag, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  conductStrategicBrainstorm,
  generateStrategicArticle,
  StrategicDirective,
  GeneratedArticle,
  TRENDING_MARKET_INTELLIGENCE,
  fetchActiveReferralLinks,
  matchReferralLinks,
  AffiliateReferralLink,
} from "@/lib/aiCollaborationEngine";
import { cn } from "@/lib/utils";

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function AdminAIBlogger() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("casual");
  const [categoryId, setCategoryId] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isVlogFormat, setIsVlogFormat] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState("");

  // --- Strategic Collaboration State ---
  const [activeDirective, setActiveDirective] = useState<StrategicDirective | null>(null);
  const [brainstormTheme, setBrainstormTheme] = useState(
    "Trending Lagos Businesses, High-Growth Niches, Sourcing & Video Vlogs"
  );
  const [brainstormCount, setBrainstormCount] = useState<number>(3);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [batchGeneratedPosts, setBatchGeneratedPosts] = useState<GeneratedArticle[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);

  // --- Referral Matcher Testing State ---
  const [referralTestQuery, setReferralTestQuery] = useState("");

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
      const { data } = await supabase
        .from("autoblog_categories")
        .select("category_id")
        .eq("schedule_id", schedule!.id);
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
    toast.success("Autoblog schedule updated");
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

  // --- Referral & Affiliate Links ---
  const { data: affiliateLinks = [], refetch: refetchAffiliates, isLoading: isLoadingAffiliates } = useQuery({
    queryKey: ["affiliate-links-manager"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as AffiliateReferralLink[];
    },
  });

  const [newAff, setNewAff] = useState({ label: "", url: "", keywords: "", description: "" });
  const [isAddingAff, setIsAddingAff] = useState(false);

  const addAffiliate = async () => {
    if (!newAff.label.trim() || !newAff.url.trim()) {
      return toast.error("Label and destination URL are required");
    }
    setIsAddingAff(true);
    try {
      const kwList = newAff.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const { error } = await supabase.from("affiliate_links").insert({
        label: newAff.label.trim(),
        url: newAff.url.trim(),
        keywords: kwList.length > 0 ? kwList : [newAff.label.toLowerCase().trim()],
        description: newAff.description.trim() || null,
        active: true,
      });
      if (error) throw error;

      setNewAff({ label: "", url: "", keywords: "", description: "" });
      refetchAffiliates();
      toast.success("Admin Referral / Affiliate Link saved and ready for AI auto-injection!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add affiliate link");
    } finally {
      setIsAddingAff(false);
    }
  };

  const deleteAffiliate = async (id: string) => {
    try {
      const { error } = await supabase.from("affiliate_links").delete().eq("id", id);
      if (error) throw error;
      refetchAffiliates();
      toast.success("Referral link deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleAffiliateActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("affiliate_links").update({ active }).eq("id", id);
      if (error) throw error;
      refetchAffiliates();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Matched referrals test preview
  const liveMatchedReferrals = useMemo(() => {
    const testText = referralTestQuery || topic || "business directory supplier";
    return matchReferralLinks(testText, keywords.split(","), "", affiliateLinks);
  }, [referralTestQuery, topic, keywords, affiliateLinks]);

  // --- Single Post Generation ---
  const [trendingCategoryId, setTrendingCategoryId] = useState<string>("");
  const trendingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-blogger", {
        body: { useTrending: "list", keywords, categoryId: trendingCategoryId || undefined },
      });
      if (error) {
        // Fallback to internal trends
        return { trending: TRENDING_MARKET_INTELLIGENCE.map((t) => t.topic) };
      }
      return data;
    },
    onSuccess: (data) => {
      if (data?.trending) {
        setTrendingTopics(data.trending);
        toast.success(`Trending topics loaded!`);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to fetch trends"),
  });

  const [isSingleGenerating, setIsSingleGenerating] = useState(false);

  const handleGenerateSinglePost = async () => {
    if (!topic.trim()) return toast.error("Please enter a topic or select a trending idea");
    setIsSingleGenerating(true);
    try {
      const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const selectedCat = categories?.find((c: any) => c.id === categoryId);

      const generated = await generateStrategicArticle({
        topic: topic.trim(),
        angle: `Targeted analysis with step-by-step actionable advice and verified supplier links.`,
        categoryName: selectedCat ? selectedCat.name : "Business & Startups",
        isVlog: isVlogFormat,
        videoUrl: customVideoUrl.trim() || undefined,
        keywords: kwList,
      });

      setPreview(generated);
      toast.success("Post generated with strategic referral integrations! Review below.");
    } catch (err: any) {
      toast.error("Generation error: " + err.message);
    } finally {
      setIsSingleGenerating(false);
    }
  };

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!preview) throw new Error("Generate a post first");
      const slug = preview.slug || generateSlug(preview.title);
      const { error } = await supabase.from("blog_posts").insert({
        title: preview.title,
        slug,
        excerpt: preview.excerpt,
        content: preview.content,
        featured_image: preview.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop",
        category_id: categoryId || null,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
        author_id: user?.id || null,
        is_featured: true,
      });
      if (error) throw error;
    },
    onSuccess: (_, publish) => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(publish ? "Post published live on blog!" : "Post saved as draft!");
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
      toast.success(`Generated ${generated.length} strategic articles & vlogs with referral links embedded!`);
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
          featured_image: post.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop",
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
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Top Header Banner with 3D Elevated Icon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-pink-500/15 border border-purple-500/20 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white shadow-[0_6px_16px_-2px_rgba(124,58,237,0.5),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30">
            <Bot className="h-6 w-6 drop-shadow-sm" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-foreground">
                AI Lead Blogger & Strategic Referral Studio
              </h1>
              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-extrabold">
                Referral Engine Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              Generate high-ranking commercial blog guides, embed video vlogs, and automatically weave admin referral links into strategic CTA buttons.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 font-bold text-xs rounded-xl gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
          >
            <Link to="/admin/posts">
              <FileText className="h-3.5 w-3.5" />
              Manage Blog Posts
            </Link>
          </Button>
        </div>
      </div>

      {/* ADMIN REFERRAL & AFFILIATE LINK MANAGER (High Visibility) */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-card via-indigo-500/5 to-purple-500/5 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="border-b bg-indigo-500/10 py-4 px-5 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  Admin Referral & Affiliate Link Injector
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  The AI blogger automatically scans article topics, matches these referral links, and weaves high-converting CTA buttons and recommendation cards.
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-indigo-600 text-white font-extrabold text-[10px]">
              {affiliateLinks.length} Active Link{affiliateLinks.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Add New Referral Link Form */}
          <div className="p-4 rounded-2xl bg-background/80 border border-indigo-500/20 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add New Referral / Affiliate Partner Link
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Partner / Button Label *</Label>
                <Input
                  placeholder="e.g. Verified Lagos Directory"
                  value={newAff.label}
                  onChange={(e) => setNewAff({ ...newAff, label: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Destination URL (Referral / Affiliate) *</Label>
                <Input
                  placeholder="https://... or /businesses"
                  value={newAff.url}
                  onChange={(e) => setNewAff({ ...newAff, url: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Match Keywords (comma-separated)</Label>
                <Input
                  placeholder="business, supplier, wholesale, lagos"
                  value={newAff.keywords}
                  onChange={(e) => setNewAff({ ...newAff, keywords: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">CTA Card Pitch / Description</Label>
                <Input
                  placeholder="Find verified suppliers & boost sales"
                  value={newAff.description}
                  onChange={(e) => setNewAff({ ...newAff, description: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <Button
              onClick={addAffiliate}
              disabled={isAddingAff || !newAff.label.trim() || !newAff.url.trim()}
              className="h-9 px-5 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs gap-1.5"
            >
              {isAddingAff ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save Referral Partner
            </Button>
          </div>

          {/* List of Configured Referral Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
              Configured Referral Links ({affiliateLinks.length})
            </h4>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {affiliateLinks.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-2xl border bg-card/90 shadow-xs hover:border-indigo-500/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-foreground truncate">{a.label}</p>
                      <Badge
                        variant={a.active ? "default" : "secondary"}
                        className={cn(
                          "text-[9px] px-1.5 py-0 h-4 font-bold",
                          a.active ? "bg-emerald-600 text-white" : ""
                        )}
                      >
                        {a.active ? "Active" : "Paused"}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-mono truncate">{a.url}</p>

                    {a.description && (
                      <p className="text-xs text-foreground/80 line-clamp-1 italic">{a.description}</p>
                    )}

                    <div className="flex gap-1 flex-wrap pt-1">
                      {(a.keywords || []).map((k: string, i: number) => (
                        <span
                          key={i}
                          className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md"
                        >
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={a.active}
                      onCheckedChange={(v) => toggleAffiliateActive(a.id, v)}
                      title={a.active ? "Pause Referral" : "Activate Referral"}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteAffiliate(a.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {affiliateLinks.length === 0 && (
                <div className="col-span-2 text-center py-6 border border-dashed rounded-2xl bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    No custom referral links added yet. Platform defaults (Directory, Sales Funnels, Video Studio) are currently active.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Strategic Referral Matcher Simulation */}
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Live AI Referral Matcher Preview
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Type any topic keyword to test which referral CTA buttons the AI blogger will auto-embed:
              </span>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. food delivery, wholesale sourcing, solar inverter, marketing..."
                value={referralTestQuery}
                onChange={(e) => setReferralTestQuery(e.target.value)}
                className="h-8 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-muted-foreground">AI Will Embed:</span>
              {liveMatchedReferrals.map((r, i) => (
                <Badge
                  key={i}
                  className="bg-indigo-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg flex items-center gap-1"
                >
                  <span>{r.label}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STRATEGIC COLLABORATION SUITE & MULTI-VLOG POSTING HUB */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-card via-purple-500/5 to-indigo-500/5 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="border-b bg-purple-500/10 py-4 px-5 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  AI Admin & AI Blogger Multi-Post Collaboration Hub
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Brainstorm high-traffic directives and auto-generate comprehensive multi-article & vlog series with referral links pre-embedded.
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-purple-600 text-white font-extrabold text-[10px]">
              Multi-Post Engine
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
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
              className="h-10 font-extrabold text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shadow-sm"
            >
              {isBrainstorming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reasoning with AI Admin…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Start Joint Strategy Session
                </>
              )}
            </Button>
          </div>

          {/* Active Directive Output Feed */}
          {activeDirective && (
            <div className="p-4 rounded-2xl border border-purple-500/30 bg-background/95 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                <div>
                  <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 border-purple-500/30">
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
                  className="h-9 font-black text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl gap-1.5 shadow-sm"
                >
                  {isBatchGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI Blogger Generating Full Series…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Generate All {activeDirective.suggestedTopics.length} Posts With Referral CTAs
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
                      Complete with formatted copy, vlog embeds, auto-category mappings, and embedded referral CTA buttons.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBatchPublishing}
                    onClick={() => handleBatchPublish(false)}
                    className="h-8 text-xs font-bold rounded-xl"
                  >
                    Save All to Drafts
                  </Button>
                  <Button
                    size="sm"
                    disabled={isBatchPublishing}
                    onClick={() => handleBatchPublish(true)}
                    className="h-8 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    {isBatchPublishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                    Publish All Live Now
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {batchGeneratedPosts.map((post, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border bg-card shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
                        {post.category_name || "General"}
                      </Badge>
                      {post.is_vlog && <Badge variant="secondary" className="text-[9px]">🎥 Vlog Video</Badge>}
                    </div>
                    <h5 className="font-extrabold text-xs text-foreground line-clamp-2">{post.title}</h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    {post.matched_referrals && post.matched_referrals.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        <Link2 className="h-3 w-3" />
                        <span>Embedded Referral: {post.matched_referrals.map((r) => r.label).join(", ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SINGLE ARTICLE & VLOG GENERATOR */}
      <Card className="rounded-3xl shadow-sm border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Single Article & Vlog Studio (With Referral Injection)
          </CardTitle>
          <CardDescription className="text-xs">
            Generate custom single articles or video vlogs with exact topic specifications and instant referral link integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trending suggestions */}
          <div className="rounded-2xl border border-dashed p-4 space-y-3 bg-muted/10">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="flex items-center gap-2 text-xs font-extrabold">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" /> Trending Market Topics (Click to Auto-Fill)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => trendingMutation.mutate()}
                disabled={trendingMutation.isPending}
                className="h-7 rounded-xl text-xs font-bold"
              >
                {trendingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                Refresh Trends
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(trendingTopics.length > 0 ? trendingTopics.map((t) => ({ topic: t, isVlog: false })) : TRENDING_MARKET_INTELLIGENCE).map((t, i) => (
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Topic / Title Idea *</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. How to start a verified wholesale distribution business in Lagos"
              rows={2}
              className="w-full text-xs rounded-xl"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Target Keywords</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. wholesale, supply chain, lagos, verified"
                className="w-full text-xs rounded-xl h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Target Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full text-xs rounded-xl h-9">
                  <SelectValue placeholder="Auto-Detect Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Writing Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-full text-xs rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual & Engaging</SelectItem>
                  <SelectItem value="professional">Executive & Authoritative</SelectItem>
                  <SelectItem value="educational">Step-by-Step Educational</SelectItem>
                  <SelectItem value="persuasive">High-Converting & Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vlog Format Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-background border">
            <div className="flex items-center gap-2">
              <Switch checked={isVlogFormat} onCheckedChange={setIsVlogFormat} id="vlog-switch" />
              <Label htmlFor="vlog-switch" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                <Video className="h-4 w-4 text-purple-600" />
                Include Video Vlog Embed
              </Label>
            </div>

            {isVlogFormat && (
              <Input
                placeholder="YouTube / Video Embed URL (optional, fallback provided)"
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                className="h-8 text-xs rounded-xl sm:max-w-xs"
              />
            )}
          </div>

          <Button
            onClick={handleGenerateSinglePost}
            disabled={isSingleGenerating || !topic.trim()}
            className="w-full h-10 font-extrabold text-xs bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white rounded-xl shadow-sm gap-2"
          >
            {isSingleGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> AI Writer Drafting Post & Weaving Referral CTAs…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Article & Inject Referral Links
              </>
            )}
          </Button>

          {/* Single Post Preview Modal / View */}
          {preview && (
            <div className="mt-6 p-5 rounded-2xl border-2 border-primary/30 bg-card space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h4 className="font-extrabold text-sm text-foreground">Generated Post Preview</h4>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(false)}
                    className="h-8 text-xs font-bold rounded-xl"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    size="sm"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(true)}
                    className="h-8 text-xs font-extrabold bg-primary text-primary-foreground rounded-xl shadow-xs"
                  >
                    {publishMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Publish to Live Blog
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-foreground">{preview.title}</h3>
                <p className="text-xs text-muted-foreground italic">{preview.excerpt}</p>
                <div
                  className="prose prose-sm max-w-none p-4 rounded-xl bg-background border mt-3 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: preview.content }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AUTOBLOG SCHEDULE SETTINGS */}
      <Card className="rounded-3xl shadow-sm border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-extrabold">Autonomous AI Blogger Scheduler</CardTitle>
                <CardDescription className="text-xs">
                  Automate regular content publishing with referral links embedded on autopilot.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={schedule?.enabled || false}
              onCheckedChange={(enabled) => updateSchedule({ enabled })}
            />
          </div>
        </CardHeader>

        {schedule?.enabled && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Publish Interval</Label>
                <Select
                  value={String(schedule?.interval_hours || 24)}
                  onValueChange={(v) => updateSchedule({ interval_hours: parseInt(v) })}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Every 6 hours</SelectItem>
                    <SelectItem value="12">Every 12 hours</SelectItem>
                    <SelectItem value="24">Every 24 hours (Daily)</SelectItem>
                    <SelectItem value="48">Every 2 days</SelectItem>
                    <SelectItem value="72">Every 3 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Focus Keywords</Label>
                <Input
                  value={schedule?.keywords || ""}
                  onChange={(e) => updateSchedule({ keywords: e.target.value })}
                  placeholder="e.g. Lagos, business, suppliers, tech"
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Default Category</Label>
                <Select
                  value={schedule?.category_id || ""}
                  onValueChange={(v) => updateSchedule({ category_id: v || null })}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={schedule?.auto_approve !== false}
                onCheckedChange={(v) => updateSchedule({ auto_approve: v })}
                id="auto-pub"
              />
              <Label htmlFor="auto-pub" className="text-xs font-bold cursor-pointer">
                Publish live immediately (off = save as draft for manual review)
              </Label>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
