import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select as UISelect, SelectContent as UISelectContent, SelectItem as UISelectItem, SelectTrigger as UISelectTrigger, SelectValue as UISelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Heart, MessageSquare, Search, Plus, TrendingUp, Clock,
  Users, Sparkles, Filter, HelpCircle, MessageCircle, X, CheckCircle2, Flame
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import AdsterraAd from "@/components/AdsterraAd";
import FrontendSpecialistWidget from "@/components/ai/FrontendSpecialistWidget";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME, absUrl } from "@/lib/seo";
import BrandedLoader from "@/components/BrandedLoader";

import catStarting3D from "@/assets/images/forum_cat_starting_1787550425478.jpg";
import catMarketing3D from "@/assets/images/forum_cat_marketing_1787550438860.jpg";
import catListings3D from "@/assets/images/forum_cat_listings_1787550450710.jpg";
import catFunding3D from "@/assets/images/forum_cat_funding_1787550465020.jpg";
import catGeneral3D from "@/assets/images/forum_cat_general_1787550477104.jpg";

export const FORUM_CATEGORIES = [
  {
    key: "starting",
    label: "Starting a Business",
    icon3d: catStarting3D,
    emoji: "🚀",
    color: "from-amber-500/20 via-orange-500/10 to-transparent",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    desc: "Ideas, registration & launches",
  },
  {
    key: "marketing",
    label: "Marketing & Sales",
    icon3d: catMarketing3D,
    emoji: "📣",
    color: "from-purple-500/20 via-pink-500/10 to-transparent",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    desc: "Branding, ads & customer growth",
  },
  {
    key: "listings",
    label: "Business Listings",
    icon3d: catListings3D,
    emoji: "📋",
    color: "from-blue-500/20 via-cyan-500/10 to-transparent",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    desc: "Showcases, reviews & offers",
  },
  {
    key: "funding",
    label: "Funding & Finance",
    icon3d: catFunding3D,
    emoji: "💰",
    color: "from-emerald-500/20 via-teal-500/10 to-transparent",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    desc: "Investors, loans & bookkeeping",
  },
  {
    key: "general",
    label: "General Discussion",
    icon3d: catGeneral3D,
    emoji: "💬",
    color: "from-indigo-500/20 via-violet-500/10 to-transparent",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    desc: "Networking & casual chats",
  },
];

import { ForumAuthorBadge, AuthorProfileData } from "@/components/forum/ForumAuthorBadge";

type Post = {
  id: string;
  user_id: string;
  kind: "question" | "discussion";
  category: string;
  title: string;
  content: string;
  replies_count: number;
  likes_count: number;
  created_at: string;
  author?: AuthorProfileData | null;
};

export default function Forum() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { category: routeCategory } = useParams<{ category?: string }>();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as "all" | "question" | "discussion") || "all";
  const cat = routeCategory || params.get("cat") || "all";
  const q = params.get("q") || "";
  const sort = (params.get("sort") as "recent" | "popular") || "recent";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kind: "question" as "question" | "discussion",
    category: routeCategory && FORUM_CATEGORIES.some((c) => c.key === routeCategory) ? routeCategory : "general",
    title: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(q);

  const load = async () => {
    setLoading(true);
    let qb = supabase.from("forum_posts" as any).select("*").limit(100);
    if (tab !== "all") qb = qb.eq("kind", tab);
    if (cat !== "all") qb = qb.eq("category", cat);
    if (q) qb = qb.ilike("title", `%${q}%`);
    qb = sort === "popular" ? qb.order("likes_count", { ascending: false }) : qb.order("created_at", { ascending: false });
    const { data } = await qb;
    const list = (data as any[]) || [];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    let map: Record<string, AuthorProfileData> = {};
    if (ids.length) {
      const [profsRes, suppsRes] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,username,avatar_url").in("user_id", ids),
        supabase.from("suppliers").select("id,user_id,name,slug,logo_url,is_verified,website,status").in("user_id", ids),
      ]);
      (profsRes.data || []).forEach((p: any) => {
        map[p.user_id] = { ...p, business: null };
      });
      (suppsRes.data || []).forEach((supp: any) => {
        if (supp.user_id) {
          if (!map[supp.user_id]) {
            map[supp.user_id] = { user_id: supp.user_id, display_name: supp.name };
          }
          map[supp.user_id].business = supp;
        }
      });
    }
    setPosts(list.map((p) => ({ ...p, author: map[p.user_id] })) as Post[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, cat, q, sort]);

  const updateParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (!v || v === "all") p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };

  const submitPost = async () => {
    if (!user) { toast.error("Please sign in to post"); navigate("/login"); return; }
    if (!form.title.trim() || !form.content.trim()) { toast.error("Title and content required"); return; }
    setSaving(true);
    const { error } = await supabase.from("forum_posts" as any).insert({
      user_id: user.id, kind: form.kind, category: form.category,
      title: form.title.trim(), content: form.content.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Posted!");
    setOpen(false);
    setForm({ kind: "question", category: "general", title: "", content: "" });
    load();
  };

  const popular = useMemo(() => [...posts].sort((a, b) => b.likes_count - a.likes_count).slice(0, 3), [posts]);

  const matchedCat = FORUM_CATEGORIES.find((c) => c.key === cat);
  const forumTitle = matchedCat
    ? `${matchedCat.label} — Community Forum | ${SITE_NAME}`
    : search.trim()
    ? `Forum Discussions: "${search}" | ${SITE_NAME}`
    : `Community Forum & Entrepreneur Network | ${SITE_NAME}`;

  const forumDesc = matchedCat
    ? `Join the discussion on ${matchedCat.label}. ${matchedCat.desc} with verified Lagos entrepreneurs.`
    : "Ask questions, share ideas, showcase your startup, and connect with Lagos entrepreneurs and business founders.";

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 space-y-6 sm:space-y-8">
      <SEO
        title={forumTitle}
        description={forumDesc}
        url="/forum"
        type="website"
        image={PAGE_OG_IMAGES.forum()}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "DiscussionForumPosting",
          name: forumTitle,
          description: forumDesc,
          url: absUrl("/forum"),
        }}
      />

      <AdsterraAd slot="forum" />

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/10 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-12 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-extrabold text-primary shadow-xs">
              <Sparkles className="h-4 w-4" />
              Lagos & Global Entrepreneur Network
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
              Ask Questions, Share Insights & <span className="bg-gradient-to-r from-primary via-amber-500 to-amber-600 bg-clip-text text-transparent">Grow Together</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Connect with local business owners, financial advisors, and fellow founders. Ask questions, showcase your startup, and swap real growth strategies.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center gap-3 shrink-0">
            <Button
              asChild
              size="lg"
              className="rounded-2xl h-12 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all gap-2 text-sm sm:text-base border border-emerald-400/30"
            >
              <Link to="/chat?officialRoom=true">
                <img src="/logo.png" alt="Bethelincovibe" className="w-5 h-5 rounded-full object-cover border border-white/40" />
                <span>BethelincovibeTV Chat Room</span>
              </Link>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => { if (!user) { navigate("/login"); return; } setOpen(true); }}
                  size="lg"
                  variant="outline"
                  className="rounded-2xl h-12 px-6 bg-card/80 hover:bg-card text-foreground font-extrabold shadow-md hover:scale-[1.02] transition-all gap-2 text-sm sm:text-base border-primary/30"
                >
                  <Plus className="h-5 w-5 text-primary" /> Start New Discussion
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg rounded-3xl border-border/80 p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Create Community Post
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Post Type</Label>
                      <UISelect value={form.kind} onValueChange={(v: any) => setForm({ ...form, kind: v })}>
                        <UISelectTrigger className="rounded-xl"><UISelectValue /></UISelectTrigger>
                        <UISelectContent className="rounded-xl">
                          <UISelectItem value="question">❓ Question (Q&A)</UISelectItem>
                          <UISelectItem value="discussion">💬 Discussion</UISelectItem>
                        </UISelectContent>
                      </UISelect>
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Category</Label>
                      <UISelect value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <UISelectTrigger className="rounded-xl"><UISelectValue /></UISelectTrigger>
                        <UISelectContent className="rounded-xl">
                          {FORUM_CATEGORIES.map((c) => (
                            <UISelectItem key={c.key} value={c.key}>
                              <div className="flex items-center gap-2">
                                <img src={c.icon3d} alt={c.label} className="h-4 w-4 rounded-md object-cover" referrerPolicy="no-referrer" />
                                <span>{c.label}</span>
                              </div>
                            </UISelectItem>
                          ))}
                        </UISelectContent>
                      </UISelect>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Post Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="E.g., How do you register a CAC business in Lagos?"
                      className="rounded-xl text-sm h-10"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Detailed Context</Label>
                    <Textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={5}
                      placeholder="Explain your situation or question in detail so members can give you accurate advice..."
                      className="rounded-xl text-sm leading-relaxed"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button onClick={submitPost} disabled={saving} className="rounded-xl font-bold bg-primary text-primary-foreground">
                    {saving ? "Publishing..." : "Publish Post"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground font-semibold bg-muted/50 px-4 py-2.5 rounded-2xl border border-border/60">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Active Community</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Verified Insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Category Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight uppercase flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Explore Categories
          </h2>
          {cat !== "all" && (
            <button
              onClick={() => updateParam("cat", "all")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg"
            >
              <X className="h-3.5 w-3.5" /> Clear Category Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* All Topics Card */}
          <button
            onClick={() => updateParam("cat", "all")}
            className={`group relative p-4 sm:p-5 rounded-3xl text-left border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
              cat === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02] ring-2 ring-primary/30"
                : "bg-card hover:bg-muted/40 border-border/80 hover:border-primary/40 shadow-xs hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-inner ${
                cat === "all" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
              }`}>
                🌟
              </div>
              <Badge className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                cat === "all" ? "bg-white text-primary" : "bg-muted text-muted-foreground"
              }`}>
                ALL
              </Badge>
            </div>

            <div>
              <p className={`text-sm font-black line-clamp-1 ${cat === "all" ? "text-white" : "text-foreground"}`}>
                All Topics
              </p>
              <p className={`text-xs mt-0.5 line-clamp-1 ${cat === "all" ? "text-white/80" : "text-muted-foreground"}`}>
                Browse entire feed
              </p>
            </div>
          </button>

          {/* 3D Category Cards */}
          {FORUM_CATEGORIES.map((c) => {
            const isActive = cat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => updateParam("cat", c.key)}
                className={`group relative p-4 sm:p-5 rounded-3xl text-left border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                  isActive
                    ? `bg-gradient-to-br ${c.color} border-2 ${c.border} shadow-xl scale-[1.02] ring-2 ring-primary/30`
                    : "bg-card hover:bg-muted/30 border-border/80 hover:border-primary/40 shadow-xs hover:shadow-md"
                }`}
              >
                {/* 3D Icon Image */}
                <div className="relative mb-3 flex items-center justify-between">
                  <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-white/20 shadow-md group-hover:scale-110 transition-transform duration-300">
                    <img
                      src={c.icon3d}
                      alt={c.label}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-sm">{c.emoji}</span>
                </div>

                <div>
                  <p className={`text-sm font-black line-clamp-1 ${isActive ? "text-foreground" : "text-foreground/90"}`}>
                    {c.label}
                  </p>
                  <p className="text-xs mt-0.5 text-muted-foreground line-clamp-1">
                    {c.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Community AI Architect & Moderator Assistant */}
      <FrontendSpecialistWidget
        agentId="community_ai"
        mode="banner"
        title="Lead Community Architect & Moderator"
        subtitle="Summarizes forum discussions, connects founders, and sparks SME growth threads."
        initialOpen={false}
        contextData={{
          currentCategory: cat,
          activeTab: tab,
          totalPosts: posts.length,
          page: "forum_hub",
        }}
        customPrompts={[
          "Summarize trending topics in the forum",
          "Suggest a high-engagement trade discussion",
          "Help me find verified suppliers in Nigeria",
          "Explain community moderation guidelines"
        ]}
      />

      {/* Search & Tabs Filter Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <Tabs value={tab} onValueChange={(v) => updateParam("tab", v)} className="w-full md:w-auto">
          <TabsList className="bg-muted/60 p-1 rounded-2xl w-full grid grid-cols-3 md:w-auto">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold px-4">
              All Posts
            </TabsTrigger>
            <TabsTrigger value="question" className="rounded-xl text-xs font-bold px-4 gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-amber-500" /> Q&A
            </TabsTrigger>
            <TabsTrigger value="discussion" className="rounded-xl text-xs font-bold px-4 gap-1">
              <MessageCircle className="h-3.5 w-3.5 text-blue-500" /> Discussions
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <form
            onSubmit={(e) => { e.preventDefault(); updateParam("q", search.trim()); }}
            className="relative flex-1"
          >
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search community discussions..."
              className="pl-9 pr-8 rounded-xl text-xs h-9 bg-card border-border/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); updateParam("q", ""); }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          <UISelect value={sort} onValueChange={(v) => updateParam("sort", v)}>
            <UISelectTrigger className="w-36 h-9 rounded-xl text-xs bg-card border-border/80 font-bold shrink-0">
              <UISelectValue />
            </UISelectTrigger>
            <UISelectContent className="rounded-xl">
              <UISelectItem value="recent"><Clock className="h-3.5 w-3.5 inline mr-1 text-primary" /> Most Recent</UISelectItem>
              <UISelectItem value="popular"><TrendingUp className="h-3.5 w-3.5 inline mr-1 text-amber-500" /> Most Popular</UISelectItem>
            </UISelectContent>
          </UISelect>
        </div>
      </div>

      {/* Popular Trending Highlights Carousel/Section */}
      {!q && cat === "all" && popular.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-card rounded-2xl overflow-hidden shadow-md">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm tracking-tight">
                <Flame className="h-4 w-4 text-amber-500 animate-bounce" /> Trending Conversations
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">Most Upvoted</span>
            </div>

            <div className="grid gap-2.5">
              {popular.map((p) => <PostRow key={p.id} post={p} compact />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Post Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12">
            <BrandedLoader
              message="Loading community discussions..."
              submessage="Fetching peer insights & threads"
            />
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-border/80 rounded-2xl p-12 text-center bg-card">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Discussions Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              {search ? "No posts matched your search prompt." : "Be the first entrepreneur to start a conversation in this topic!"}
            </p>
            <Button
              onClick={() => { if (!user) { navigate("/login"); return; } setOpen(true); }}
              size="sm"
              className="rounded-xl font-bold gap-1 bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Start First Discussion
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {posts.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PostRow({ post, compact }: { post: Post; compact?: boolean }) {
  const cat = FORUM_CATEGORIES.find((c) => c.key === post.category);

  return (
    <Link to={`/forum/${post.id}`} className="block group">
      <Card className="border-border/80 hover:border-primary/50 transition-all duration-300 shadow-xs hover:shadow-lg rounded-3xl overflow-hidden bg-card hover:bg-card/95">
        <CardContent className="p-5 sm:p-7 space-y-3.5">
          {/* Top Badges & Category with 3D Icon */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Badge
                className={`text-xs font-black px-2.5 py-1 rounded-xl border-0 shadow-xs ${
                  post.kind === "question"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                }`}
              >
                {post.kind === "question" ? "❓ Q&A" : "💬 Discussion"}
              </Badge>

              {cat && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-muted-foreground">
                  <img
                    src={cat.icon3d}
                    alt={cat.label}
                    className="h-4 w-4 rounded-md object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span>{cat.label}</span>
                </div>
              )}
            </div>

            <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-lg">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-black text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {post.title}
          </h3>

          {/* Snippet Content */}
          {!compact && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {post.content}
            </p>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ForumAuthorBadge author={post.author} size="sm" asLink={false} />
            </div>

            <div className="flex items-center gap-3">
              {/youtube|youtu\.be|vimeo/i.test(post.content) && (
                <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-lg">
                  ▶ Video
                </span>
              )}
              {/wa\.me|whatsapp/i.test(post.content) && (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-lg">
                  💬 WhatsApp
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-xl group-hover:text-foreground transition">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                {post.replies_count} {post.replies_count === 1 ? "reply" : "replies"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-xl group-hover:text-rose-500 transition">
                <Heart className="h-4 w-4 text-rose-500" />
                {post.likes_count}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
