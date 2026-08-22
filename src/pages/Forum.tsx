import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Heart, MessageSquare, Search, Plus, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import AdsterraAd from "@/components/AdsterraAd";

export const FORUM_CATEGORIES = [
  { key: "starting", label: "🚀 Starting a Business" },
  { key: "marketing", label: "📣 Marketing & Sales" },
  { key: "listings", label: "📋 Business Listings" },
  { key: "funding", label: "💰 Funding & Finance" },
  { key: "general", label: "💬 General" },
];

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
  author?: { display_name: string | null; username: string | null; avatar_url: string | null };
};

export default function Forum() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as "all" | "question" | "discussion") || "all";
  const cat = params.get("cat") || "all";
  const q = params.get("q") || "";
  const sort = (params.get("sort") as "recent" | "popular") || "recent";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "question" as "question" | "discussion", category: "general", title: "", content: "" });
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
    let map: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,display_name,username,avatar_url").in("user_id", ids);
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
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

  return (
    <div className="container max-w-4xl py-6 pb-24">
      <Helmet>
        <title>Community Forum | Bethelincovibe TV</title>
        <meta name="description" content="Ask questions, share ideas and connect with Lagos entrepreneurs." />
      </Helmet>

      <AdsterraAd slot="forum" />


      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Community Forum</h1>
          <p className="text-sm text-muted-foreground">Q&A and discussions for Lagos entrepreneurs.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { if (!user) { navigate("/login"); return; } setOpen(true); }} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" /> New post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a new post</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.kind} onValueChange={(v: any) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="discussion">Discussion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORUM_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Be specific and clear" />
              </div>
              <div>
                <Label className="text-xs">Content</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Share details, context, what you've tried..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submitPost} disabled={saving}>{saving ? "Posting..." : "Post"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); updateParam("q", search.trim()); }}
        className="relative mb-3"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forum..." className="pl-9" />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <Badge
          variant={cat === "all" ? "default" : "outline"}
          onClick={() => updateParam("cat", "all")}
          className="cursor-pointer whitespace-nowrap"
        >All</Badge>
        {FORUM_CATEGORIES.map((c) => (
          <Badge
            key={c.key}
            variant={cat === c.key ? "default" : "outline"}
            onClick={() => updateParam("cat", c.key)}
            className="cursor-pointer whitespace-nowrap"
          >{c.label}</Badge>
        ))}
      </div>

      {!q && cat === "all" && popular.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-primary">
            <TrendingUp className="h-4 w-4" /> Popular
          </div>
          <div className="grid gap-2">
            {popular.map((p) => <PostRow key={p.id} post={p} compact />)}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => updateParam("tab", v)} className="mb-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="question">Q&A</TabsTrigger>
          <TabsTrigger value="discussion">Discussions</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex justify-end mb-2">
        <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent"><Clock className="h-3 w-3 inline mr-1" />Most recent</SelectItem>
            <SelectItem value="popular"><TrendingUp className="h-3 w-3 inline mr-1" />Most popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No posts yet. Be the first to start a conversation!
        </div>
      ) : (
        <div className="grid gap-2">
          {posts.map((p) => <PostRow key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}

function PostRow({ post, compact }: { post: Post; compact?: boolean }) {
  const cat = FORUM_CATEGORIES.find((c) => c.key === post.category);
  const name = post.author?.display_name || post.author?.username || "Anonymous";
  return (
    <Link to={`/forum/${post.id}`} className="block">
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-start gap-2 mb-1.5">
            <Badge variant={post.kind === "question" ? "default" : "secondary"} className="text-[10px]">
              {post.kind === "question" ? "Q&A" : "Discussion"}
            </Badge>
            {cat && <Badge variant="outline" className="text-[10px]">{cat.label}</Badge>}
          </div>
          <h3 className="font-semibold leading-snug line-clamp-2">{post.title}</h3>
          {!compact && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{name}</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.replies_count}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
