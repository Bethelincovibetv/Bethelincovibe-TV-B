import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Eye, Search, Filter, Sparkles, LayoutGrid,
  List, ExternalLink, Calendar, Layers, CheckCircle2, ArrowUpDown,
  Image as ImageIcon, Video, Star, FileText, Check, SlidersHorizontal,
  ChevronRight, RefreshCw, Upload, Globe, Share2, Tag
} from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Create / Edit Modal State
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category_id: "",
    published: false,
    featured_image: "",
    is_featured: false,
  });

  // Quick View / Preview Modal State
  const [previewPost, setPreviewPost] = useState<any>(null);

  // Filters and Layout
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "featured">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid" | "compact">("table");

  // Bulk Selection
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");

  // Fetch all posts with category data
  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch blog categories
  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "blog")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Save / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const slugVal = data.slug?.trim() || generateSlug(data.title);
      const payload = {
        title: data.title.trim(),
        slug: slugVal,
        excerpt: data.excerpt?.trim() || null,
        content: data.content || "",
        category_id: data.category_id || null,
        published: data.published,
        is_featured: data.is_featured,
        featured_image: data.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop",
        published_at: data.published ? new Date().toISOString() : null,
      };
      if (data.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert({ ...payload, author_id: user?.id || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(editing ? "Post updated successfully" : "Post created successfully");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("guest_blog_submissions").update({ status: "deleted" }).eq("generated_post_id", id);
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["guest-blogs"] });
      toast.success("Post deleted and removed from all listings");
      if (previewPost) setPreviewPost(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Inline Fast Status Toggle Mutation
  const inlineToggleMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Bulk Actions Mutation
  const bulkMutation = useMutation({
    mutationFn: async (action: {
      type: "publish" | "unpublish" | "feature" | "unfeature" | "category" | "delete";
      value?: string;
    }) => {
      if (!selected.length) throw new Error("No posts selected");
      if (action.type === "delete") {
        const { error } = await supabase.from("blog_posts").delete().in("id", selected);
        if (error) throw error;
        return;
      }
      const patch: any =
        action.type === "publish"
          ? { published: true, published_at: new Date().toISOString() }
          : action.type === "unpublish"
          ? { published: false }
          : action.type === "feature"
          ? { is_featured: true }
          : action.type === "unfeature"
          ? { is_featured: false }
          : { category_id: action.value || null };
      const { error } = await supabase.from("blog_posts").update(patch).in("id", selected);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(`Updated ${selected.length} post(s)`);
      setSelected([]);
      setBulkCategory("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category_id: "",
      published: false,
      featured_image: "",
      is_featured: false,
    });
    setEditing(null);
    setOpen(false);
  };

  const openEdit = (post: any) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      category_id: post.category_id || "",
      published: post.published,
      is_featured: !!post.is_featured,
      featured_image: post.featured_image || "",
    });
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `featured/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      setForm((prev) => ({ ...prev, featured_image: data.publicUrl }));
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error("Image upload failed: " + err.message);
    }
  };

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let list = [...posts];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p: any) =>
          p.title.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q) ||
          p.categories?.name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter === "published") {
      list = list.filter((p: any) => p.published);
    } else if (statusFilter === "draft") {
      list = list.filter((p: any) => !p.published);
    } else if (statusFilter === "featured") {
      list = list.filter((p: any) => p.is_featured);
    }

    if (categoryFilter !== "all") {
      list = list.filter((p: any) => p.category_id === categoryFilter);
    }

    if (sortBy === "newest") {
      list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "title") {
      list.sort((a: any, b: any) => a.title.localeCompare(b.title));
    }

    return list;
  }, [posts, search, statusFilter, categoryFilter, sortBy]);

  const allSelected = filteredPosts.length > 0 && selected.length === filteredPosts.length;
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allSelected ? [] : filteredPosts.map((p: any) => p.id));

  // Quick stats
  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p: any) => p.published).length;
    const drafts = total - published;
    const featured = posts.filter((p: any) => p.is_featured).length;
    return { total, published, drafts, featured };
  }, [posts]);

  return (
    <div className="space-y-6 max-w-7xl pb-20">
      {/* TOP HEADER WITH 3D ELEVATED ICON BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/15 border border-emerald-500/20 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-[0_6px_16px_-2px_rgba(16,185,129,0.5),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30">
            <FileText className="h-6 w-6 drop-shadow-sm" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-foreground">
                Blog & Vlog Management Suite
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-extrabold">
                {stats.total} Total Articles
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              Structure, manage, and edit all published guides, vlogs, and SEO marketing content with structured titles and high image integrity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 font-bold text-xs rounded-xl gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
          >
            <Link to="/admin/ai-blogger">
              <Sparkles className="h-3.5 w-3.5" />
              Write with AI Blogger
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="h-9 font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter("all")}
          className={cn(
            "p-3.5 rounded-2xl border bg-card transition-all cursor-pointer",
            statusFilter === "all" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "hover:border-border"
          )}
        >
          <p className="text-[11px] font-extrabold text-muted-foreground uppercase">Total Posts</p>
          <p className="text-xl font-black text-foreground mt-0.5">{stats.total}</p>
        </div>

        <div
          onClick={() => setStatusFilter("published")}
          className={cn(
            "p-3.5 rounded-2xl border bg-card transition-all cursor-pointer",
            statusFilter === "published" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "hover:border-border"
          )}
        >
          <p className="text-[11px] font-extrabold text-emerald-600 uppercase">Live Published</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.published}</p>
        </div>

        <div
          onClick={() => setStatusFilter("draft")}
          className={cn(
            "p-3.5 rounded-2xl border bg-card transition-all cursor-pointer",
            statusFilter === "draft" ? "border-amber-500 ring-2 ring-amber-500/20" : "hover:border-border"
          )}
        >
          <p className="text-[11px] font-extrabold text-amber-600 uppercase">Drafts Pending</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">{stats.drafts}</p>
        </div>

        <div
          onClick={() => setStatusFilter("featured")}
          className={cn(
            "p-3.5 rounded-2xl border bg-card transition-all cursor-pointer",
            statusFilter === "featured" ? "border-purple-500 ring-2 ring-purple-500/20" : "hover:border-border"
          )}
        >
          <p className="text-[11px] font-extrabold text-purple-600 uppercase">Featured Highlights</p>
          <p className="text-xl font-black text-purple-600 mt-0.5">{stats.featured}</p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR (Organized & Unbreakable Layout) */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by topic title, slug, excerpt, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs rounded-xl">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-9 w-[130px] text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Live Only</SelectItem>
                  <SelectItem value="draft">Drafts Only</SelectItem>
                  <SelectItem value="featured">Featured Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-9 w-[130px] text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Alphabetical (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border">
                <Button
                  size="icon"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="h-7 w-7 rounded-lg"
                  title="Structured Table View"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="h-7 w-7 rounded-lg"
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted"
                title="Refresh List"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FLOATING BULK ACTIONS BAR */}
      {selected.length > 0 && (
        <div className="sticky top-16 z-30 rounded-2xl border-2 border-primary/40 bg-card/95 p-3 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5">
                {selected.length} Selected
              </Badge>
              <span className="text-xs font-bold text-foreground">Bulk Post Actions:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs font-bold rounded-lg"
                disabled={bulkMutation.isPending}
                onClick={() => bulkMutation.mutate({ type: "publish" })}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Publish Live
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs font-bold rounded-lg"
                disabled={bulkMutation.isPending}
                onClick={() => bulkMutation.mutate({ type: "unpublish" })}
              >
                Unpublish
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs font-bold rounded-lg"
                disabled={bulkMutation.isPending}
                onClick={() => bulkMutation.mutate({ type: "feature" })}
              >
                <Star className="h-3.5 w-3.5 mr-1 text-amber-500 fill-amber-500" />
                Feature
              </Button>

              <Select
                value={bulkCategory}
                onValueChange={(v) => {
                  setBulkCategory(v);
                  bulkMutation.mutate({ type: "category", value: v });
                }}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg">
                  <SelectValue placeholder="Move Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs font-bold rounded-lg"
                disabled={bulkMutation.isPending}
                onClick={() => {
                  if (confirm(`Delete ${selected.length} selected post(s)? This action is irreversible.`)) {
                    bulkMutation.mutate({ type: "delete" });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POSTS LIST (TABLE VIEW) */}
      {viewMode === "table" && (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          {/* Header Row */}
          <div className="flex items-center justify-between p-3.5 bg-muted/40 border-b text-xs font-extrabold text-muted-foreground">
            <div className="flex items-center gap-3">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span>Article Title & Details ({filteredPosts.length})</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 pr-4">
              <span className="w-28 text-center">Category</span>
              <span className="w-24 text-center">Status</span>
              <span className="w-20 text-center">Actions</span>
            </div>
          </div>

          {/* Body Rows */}
          <div className="divide-y">
            {filteredPosts.map((post: any) => {
              const isSelected = selected.includes(post.id);
              const isVlog = post.content?.includes("<iframe") || post.slug?.includes("vlog");

              return (
                <div
                  key={post.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3 transition-colors",
                    isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/30"
                  )}
                >
                  {/* Left: Checkbox + Fixed Ratio Image + Well-Structured Title Block */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(post.id)}
                      className="mt-1 sm:mt-0 shrink-0"
                    />

                    {/* Fixed aspect ratio thumbnail that never distorts */}
                    <div className="relative w-20 h-14 sm:w-24 sm:h-16 shrink-0 rounded-xl overflow-hidden bg-muted border border-border/80 group">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e: any) => {
                            e.target.src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                      {isVlog && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white p-0.5 rounded text-[9px]">
                          <Video className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Title & Metadata Container with Strict Truncation & Line Clamping */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="font-extrabold text-sm sm:text-base text-foreground leading-snug break-words line-clamp-2 hover:text-primary cursor-pointer transition-colors"
                          onClick={() => openEdit(post)}
                          title={post.title}
                        >
                          {post.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] text-muted-foreground/80 truncate max-w-[200px]">
                          /{post.slug}
                        </span>

                        <span className="text-border">•</span>

                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>

                        {post.categories?.name && (
                          <Badge variant="secondary" className="sm:hidden text-[10px] px-1.5 py-0 h-4">
                            {post.categories.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right: Category, Live Toggle & Fast Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                    {/* Category Column */}
                    <div className="hidden sm:block w-28 text-center truncate">
                      <Badge variant="outline" className="text-[10px] font-bold max-w-full truncate">
                        {post.categories?.name || "Uncategorized"}
                      </Badge>
                    </div>

                    {/* Status & Quick Toggle Column */}
                    <div className="w-24 flex flex-col items-center gap-1">
                      <Badge
                        variant={post.published ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5",
                          post.published ? "bg-emerald-600 text-white" : ""
                        )}
                      >
                        {post.published ? "Live" : "Draft"}
                      </Badge>

                      <div className="flex items-center gap-1 text-[10px]">
                        <Switch
                          checked={post.published}
                          onCheckedChange={(published) =>
                            inlineToggleMutation.mutate({ id: post.id, patch: { published, published_at: published ? new Date().toISOString() : null } })
                          }
                          className="scale-75"
                          title={post.published ? "Click to make Draft" : "Click to Publish Live"}
                        />
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Live Link */}
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                        title="View Live Article on Public Site"
                      >
                        <Link to={`/blog/${post.slug}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>

                      {/* Quick Preview Modal */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPreviewPost(post)}
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                        title="Quick Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Edit */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(post)}
                        className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10"
                        title="Full Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete post "${post.title}"?`)) {
                            deleteMutation.mutate(post.id);
                          }
                        }}
                        className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                        title="Delete Post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPosts.length === 0 && (
              <div className="p-12 text-center space-y-2">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="font-extrabold text-sm text-foreground">No Blog Posts Found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting your search query, status filter, or create a brand new post with the AI Blogger.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POSTS LIST (CARD GRID VIEW) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post: any) => {
            const isSelected = selected.includes(post.id);

            return (
              <Card
                key={post.id}
                className={cn(
                  "rounded-2xl overflow-hidden border transition-all flex flex-col justify-between group",
                  isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : "hover:border-border/80 shadow-xs"
                )}
              >
                <div>
                  {/* Card Image Header */}
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e: any) => {
                          e.target.src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(post.id)}
                        className="bg-background/90 border-foreground/30 shadow-xs"
                      />
                      <Badge
                        variant={post.published ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] font-black shadow-xs",
                          post.published ? "bg-emerald-600 text-white" : "bg-black/60 text-white backdrop-blur"
                        )}
                      >
                        {post.published ? "Live" : "Draft"}
                      </Badge>
                    </div>

                    {post.categories?.name && (
                      <Badge className="absolute bottom-2.5 left-2.5 bg-black/75 text-white backdrop-blur text-[10px] font-bold">
                        {post.categories.name}
                      </Badge>
                    )}
                  </div>

                  {/* Content Body with Strict Line Clamping */}
                  <CardContent className="p-4 space-y-2">
                    <h3
                      className="font-extrabold text-sm sm:text-base text-foreground line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors"
                      onClick={() => openEdit(post)}
                    >
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {post.excerpt || "No excerpt provided for this article."}
                    </p>
                  </CardContent>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-muted/20 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPreviewPost(post)}
                      className="h-8 w-8 rounded-xl"
                      title="Quick Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(post)}
                      className="h-8 w-8 rounded-xl text-primary"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete post "${post.title}"?`)) {
                          deleteMutation.mutate(post.id);
                        }
                      }}
                      className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* FULL EDIT / CREATE POST MODAL */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-[96vw] sm:max-w-4xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editing ? "Edit Blog Article & Settings" : "Create New Blog Article"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure content, featured visual thumbnail, categories, and publication state.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ ...form, id: editing?.id });
            }}
            className="space-y-4 pt-2"
          >
            {/* Title & Slug */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Article Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: editing ? form.slug : generateSlug(e.target.value),
                    })
                  }
                  placeholder="e.g. Navigating Logistics & Wholesale Markets in Nigeria"
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">URL Slug (SEO Permalink) *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. navigating-logistics-wholesale-nigeria"
                  required
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Category & Featured Image */}
            <div className="grid gap-3 sm:grid-cols-2 items-start">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Featured Image (Upload or URL)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="h-10 text-xs rounded-xl cursor-pointer"
                  />
                  {form.featured_image && (
                    <img
                      src={form.featured_image}
                      alt="Thumbnail"
                      className="h-10 w-14 rounded-lg object-cover border shrink-0"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Summary / Excerpt (Appears in previews & search)</Label>
              <Input
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="2-3 sentence overview of what this article delivers..."
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Content Editor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Full Article Content & HTML</Label>
              <RichTextEditor
                content={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
              />
            </div>

            {/* Switches */}
            <div className="flex items-center gap-6 flex-wrap p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.published}
                  onCheckedChange={(v) => setForm({ ...form, published: v })}
                  id="modal-pub"
                />
                <Label htmlFor="modal-pub" className="text-xs font-bold cursor-pointer">
                  Publish Live on Site
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                  id="modal-feat"
                />
                <Label htmlFor="modal-feat" className="text-xs font-bold cursor-pointer flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  Feature on Homepage Carousel
                </Label>
              </div>
            </div>

            {/* Modal Actions */}
            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {saveMutation.isPending ? "Saving..." : editing ? "Update Article" : "Create Article"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK PREVIEW MODAL */}
      <Dialog open={!!previewPost} onOpenChange={(v) => { if (!v) setPreviewPost(null); }}>
        <DialogContent className="max-w-[96vw] sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-primary/10 text-primary text-[10px] font-extrabold">
                {previewPost?.categories?.name || "General"}
              </Badge>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  <Link to={`/blog/${previewPost?.slug}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open Public Page
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const p = previewPost;
                    setPreviewPost(null);
                    openEdit(p);
                  }}
                  className="h-8 text-xs font-extrabold bg-primary text-primary-foreground rounded-xl"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit Post
                </Button>
              </div>
            </div>
            <DialogTitle className="text-xl font-black text-foreground mt-2">
              {previewPost?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {previewPost?.featured_image && (
              <img
                src={previewPost.featured_image}
                alt={previewPost.title}
                className="w-full aspect-video rounded-2xl object-cover border"
              />
            )}

            {previewPost?.excerpt && (
              <p className="text-sm text-muted-foreground italic font-medium p-3 rounded-xl bg-muted/30 border">
                {previewPost.excerpt}
              </p>
            )}

            <div
              className="prose prose-sm md:prose-base max-w-none p-4 rounded-2xl bg-card border"
              dangerouslySetInnerHTML={{ __html: previewPost?.content || "" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
