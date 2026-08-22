import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/RichTextEditor";

const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", category_id: "", published: false, featured_image: "", is_featured: false });

  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_posts").select("*, categories(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "blog");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        category_id: data.category_id || null,
        published: data.published,
        is_featured: data.is_featured,
        featured_image: data.featured_image || null,
        published_at: data.published ? new Date().toISOString() : null,
      };
      if (data.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert({ ...payload, author_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(editing ? "Post updated" : "Post created");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ title: "", slug: "", excerpt: "", content: "", category_id: "", published: false, featured_image: "", is_featured: false });
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
    const ext = file.name.split(".").pop();
    const path = `featured/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
    setForm({ ...form, featured_image: data.publicUrl });
  };

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");

  const filtered = (posts || []).filter((p: any) => {
    if (filter === "published" && !p.published) return false;
    if (filter === "draft" && p.published) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((p: any) => p.id));

  const bulkMutation = useMutation({
    mutationFn: async (action: { type: "publish" | "unpublish" | "feature" | "unfeature" | "category" | "delete"; value?: string }) => {
      if (!selected.length) throw new Error("No posts selected");
      if (action.type === "delete") {
        const { error } = await supabase.from("blog_posts").delete().in("id", selected);
        if (error) throw error;
        return;
      }
      const patch: any =
        action.type === "publish" ? { published: true, published_at: new Date().toISOString() }
        : action.type === "unpublish" ? { published: false }
        : action.type === "feature" ? { is_featured: true }
        : action.type === "unfeature" ? { is_featured: false }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sticky top-14 -mx-3 md:-mx-6 px-3 md:px-6 py-2 bg-background/90 backdrop-blur z-30 border-b">
        <h1 className="text-lg md:text-2xl font-bold">Blog Posts</h1>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New</Button>
      </div>

      <div className="flex gap-2 mb-3">
        <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between mb-2 px-1">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          Select all ({filtered.length})
        </label>
        {selected.length > 0 && (
          <span className="text-xs font-semibold text-primary">{selected.length} selected</span>
        )}
      </div>

      {selected.length > 0 && (
        <div className="sticky top-[6.5rem] z-30 mb-3 rounded-2xl border bg-card/95 p-2 shadow-soft backdrop-blur animate-scale-in">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate({ type: "publish" })}>
              <Eye className="h-3.5 w-3.5 mr-1" />Publish
            </Button>
            <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate({ type: "unpublish" })}>
              Unpublish
            </Button>
            <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate({ type: "feature" })}>
              Feature
            </Button>
            <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate({ type: "unfeature" })}>
              Unfeature
            </Button>
            <Select
              value={bulkCategory}
              onValueChange={(v) => { setBulkCategory(v); bulkMutation.mutate({ type: "category", value: v }); }}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Move to category" /></SelectTrigger>
              <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="destructive" className="h-8 text-xs ml-auto" disabled={bulkMutation.isPending}
              onClick={() => { if (confirm(`Delete ${selected.length} post(s)? This cannot be undone.`)) bulkMutation.mutate({ type: "delete" }); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        {filtered.map((post: any) => (
          <div key={post.id} className={`flex items-center gap-2 p-2 rounded-xl border bg-card transition-colors ${selected.includes(post.id) ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
            <Checkbox checked={selected.includes(post.id)} onCheckedChange={() => toggleOne(post.id)} className="shrink-0" />
            {post.featured_image ? (
              <img src={post.featured_image} alt="" className="h-12 w-12 rounded-md object-cover shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground"><Pencil className="h-4 w-4" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate leading-tight">{post.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={post.published ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 h-4">{post.published ? "Live" : "Draft"}</Badge>
                {post.is_featured && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Featured</Badge>}
                {post.categories?.name && <span className="text-[10px] text-muted-foreground truncate">{post.categories.name}</span>}
              </div>
            </div>
            <div className="flex shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(post)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(post.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No posts found</p>}
      </div>


      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-[98vw] sm:max-w-5xl w-full h-[95vh] sm:h-auto sm:max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Post</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Featured Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {form.featured_image && <img src={form.featured_image} alt="" className="h-20 rounded object-cover" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short description..." />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <Label>Featured (show on home slider)</Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{editing ? "Update" : "Create"} Post</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
