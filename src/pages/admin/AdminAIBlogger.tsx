import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Bot, Sparkles, Eye, Save, Loader2, TrendingUp, Zap, Clock, Link2, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      // Re-fetch then retry
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
      keywords: newAff.keywords.split(",").map(k => k.trim()).filter(Boolean),
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

  // --- Generate ---
  const [trendingCategoryId, setTrendingCategoryId] = useState<string>("");
  const trendingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-blogger", { body: { useTrending: "list", keywords, categoryId: trendingCategoryId || undefined } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { if (data.trending) { setTrendingTopics(data.trending); toast.success(`Trending topics${data.category ? ` for ${data.category}` : ""} loaded!`); } },
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
    onSuccess: (data) => { setPreview(data); toast.success("Post generated! Review and publish below."); },
    onError: (e: any) => toast.error(e.message || "Generation failed"),
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!preview) throw new Error("Generate a post first");
      const slug = generateSlug(preview.title);
      const { error } = await supabase.from("blog_posts").insert({
        title: preview.title, slug, excerpt: preview.excerpt, content: preview.content,
        featured_image: preview.featured_image, category_id: categoryId || null,
        published: publish, published_at: publish ? new Date().toISOString() : null,
        author_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, publish) => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(publish ? "Post published!" : "Post saved as draft!");
      setPreview(null); setTopic(""); setKeywords("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const mode = schedule?.mode || "single";
  const isMulti = mode === "multi";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bot className="h-6 w-6" /> AI Auto-Blogger
      </h1>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Auto-Publishing Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={schedule?.enabled || false}
                onCheckedChange={(checked) => updateSchedule({ enabled: checked })}
              />
              <Label className="text-sm">Enable automatic posting</Label>
            </div>
            <div className="flex items-center gap-2 rounded-full border p-1 bg-muted/30">
              <button
                onClick={() => updateSchedule({ mode: "single" })}
                className={`px-3 py-1 text-xs rounded-full transition ${!isMulti ? "bg-primary text-primary-foreground" : ""}`}
              >Single Mode</button>
              <button
                onClick={() => updateSchedule({ mode: "multi" })}
                className={`px-3 py-1 text-xs rounded-full transition ${isMulti ? "bg-primary text-primary-foreground" : ""}`}
              >Multi Mode</button>
            </div>
          </div>

          {schedule?.enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Post every (hours)</Label>
                  <Select value={String(schedule?.interval_hours || 24)} onValueChange={(v) => updateSchedule({ interval_hours: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs">Focus Keywords</Label>
                  <Input value={schedule?.keywords || ""} onChange={(e) => updateSchedule({ keywords: e.target.value })} placeholder="e.g., Lagos, business" />
                </div>
                {isMulti ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Posts per run</Label>
                    <Select value={String(schedule?.posts_per_run || 1)} onValueChange={(v) => updateSchedule({ posts_per_run: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} post{n>1?"s":""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Default Category</Label>
                    <Select value={schedule?.category_id || ""} onValueChange={(v) => updateSchedule({ category_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isMulti && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs font-semibold">Categories to rotate (multi-mode)</Label>
                  <p className="text-xs text-muted-foreground">AI will cycle posts through these categories.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories?.map((c: any) => (
                      <label key={c.id} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                        <Checkbox
                          checked={scheduleCats?.includes(c.id) || false}
                          onCheckedChange={(checked) => toggleCategory(c.id, !!checked)}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={schedule?.auto_approve !== false} onCheckedChange={(v) => updateSchedule({ auto_approve: v })} />
                <Label className="text-xs">Auto-publish (off = save as draft for review)</Label>
              </div>
            </>
          )}
          {schedule?.last_run_at && (
            <p className="text-xs text-muted-foreground">Last auto-post: {new Date(schedule.last_run_at).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      {/* Affiliate Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> Affiliate & Backlink Library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">AI will automatically link these keywords in posts. Use comma-separated keywords.</p>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Label" value={newAff.label} onChange={(e) => setNewAff({ ...newAff, label: e.target.value })} />
            <Input placeholder="https://..." value={newAff.url} onChange={(e) => setNewAff({ ...newAff, url: e.target.value })} />
            <Input placeholder="keyword1, keyword2" value={newAff.keywords} onChange={(e) => setNewAff({ ...newAff, keywords: e.target.value })} />
            <Button onClick={addAffiliate}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          <div className="space-y-2">
            {affiliateLinks?.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.url}</p>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {(a.keywords || []).map((k: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>)}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteAffiliate(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {!affiliateLinks?.length && <p className="text-xs text-muted-foreground italic">No affiliate links yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Generate Blog Post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-3 sm:p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" /> Trending Topics
              </Label>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <Select value={trendingCategoryId || "all"} onValueChange={(v) => setTrendingCategoryId(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => trendingMutation.mutate()} disabled={trendingMutation.isPending} className="w-full sm:w-auto">
                  {trendingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                  Fetch Trends
                </Button>
              </div>
            </div>
            {trendingTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((t, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs break-words max-w-full text-left h-auto py-1 px-2.5 whitespace-normal"
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Click "Fetch Trends" to discover trending topics</p>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <Label>Topic / Title Idea *</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Side hustles that pay well in Lagos"
              rows={2}
              className="w-full text-sm rounded-xl min-w-0 break-words"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 min-w-0">
              <Label>Target Keywords</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., Lagos, freelancing" className="w-full text-xs rounded-xl" />
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-full text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual & Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="persuasive">Persuasive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full text-xs rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => generateMutation.mutate(false)} disabled={!topic.trim() || generateMutation.isPending} className="flex-1 sm:flex-none">
              {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Post</>}
            </Button>
            <Button variant="outline" onClick={() => generateMutation.mutate(true)} disabled={generateMutation.isPending} className="flex-1 sm:flex-none">
              <TrendingUp className="h-4 w-4 mr-2" /> Generate from Trending
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <Eye className="h-5 w-5 shrink-0" /> Preview
              {preview.trending_topic && <Badge variant="outline" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" /> Trending</Badge>}
              {preview.has_youtube && <Badge variant="outline" className="text-xs">🎬 Video</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 min-w-0">
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <h2 className="text-lg sm:text-xl font-bold break-words leading-snug text-foreground mt-0.5 min-w-0">{preview.title}</h2>
            </div>
            {preview.excerpt && (
              <div className="min-w-0">
                <Label className="text-xs text-muted-foreground">Excerpt</Label>
                <p className="text-sm text-muted-foreground break-words mt-0.5 min-w-0">{preview.excerpt}</p>
              </div>
            )}
            {preview.keywords?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {preview.keywords.map((k: string, i: number) => <Badge key={i} variant="secondary" className="text-xs break-words">{k}</Badge>)}
              </div>
            )}
            {preview.featured_image && <img src={preview.featured_image} alt="" className="w-full max-h-64 object-cover rounded-xl" />}
            <div className="border rounded-xl p-3 sm:p-4 max-h-[500px] overflow-y-auto min-w-0">
              <div className="prose prose-sm max-w-none break-words overflow-x-auto" dangerouslySetInnerHTML={{ __html: preview.content }} />
            </div>
            <div className="flex gap-2 flex-wrap pt-2">
              <Button onClick={() => publishMutation.mutate(true)} disabled={publishMutation.isPending} className="flex-1 sm:flex-none"><Save className="h-4 w-4 mr-1" /> Publish Now</Button>
              <Button variant="outline" onClick={() => publishMutation.mutate(false)} disabled={publishMutation.isPending} className="flex-1 sm:flex-none">Save as Draft</Button>
              <Button variant="ghost" onClick={() => setPreview(null)} className="w-full sm:w-auto">Discard</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
