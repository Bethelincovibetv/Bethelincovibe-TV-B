import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Upload, GraduationCap, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Course = {
  id: string; title: string; description: string | null; thumbnail_url: string | null;
  video_url: string | null; youtube_url: string | null; instructor_name: string | null;
  category: string | null; price_naira: number; duration_minutes: number | null; published: boolean;
};

const empty: Partial<Course> = { title: "", description: "", thumbnail_url: "", video_url: "", youtube_url: "", instructor_name: "", category: "", price_naira: 0, duration_minutes: 0, published: true };

export default function AdminCourses() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
  });

  const uploadFile = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const save = async () => {
    if (!editing?.title) return toast.error("Title required");
    setSaving(true);
    try {
      const payload: any = { ...editing };
      if (videoFile) payload.video_url = await uploadFile("course-videos", videoFile);
      if (thumbFile) payload.thumbnail_url = await uploadFile("course-thumbnails", thumbFile);
      payload.price_naira = Number(payload.price_naira) || 0;
      payload.duration_minutes = Number(payload.duration_minutes) || null;
      let error;
      if (payload.id) {
        const { id, ...rest } = payload;
        ({ error } = await supabase.from("courses").update(rest).eq("id", id));
      } else {
        ({ error } = await supabase.from("courses").insert(payload));
      }
      if (error) throw error;
      toast.success("Saved");
      setEditing(null); setVideoFile(null); setThumbFile(null);
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); toast.success("Deleted"); },
  });

  const togglePub = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("courses").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" /> Learning Hub Courses</h1>
          <p className="text-sm text-muted-foreground">Upload videos or paste YouTube links. Set price to 0 for free courses.</p>
        </div>
        <Button onClick={() => setEditing(empty)}><Upload className="h-4 w-4 mr-2" />New Course</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {courses?.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="w-full h-32 object-cover" />}
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm">{c.title}</p>
                <span className="text-xs font-bold text-primary shrink-0">{c.price_naira > 0 ? `₦${c.price_naira}` : "FREE"}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <Switch checked={c.published} onCheckedChange={(v) => togglePub.mutate({ id: c.id, published: v })} />
                  <span className="text-xs">{c.published ? "Live" : "Draft"}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {courses?.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No courses yet.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} course</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Instructor</Label><Input value={editing.instructor_name || ""} onChange={(e) => setEditing({ ...editing, instructor_name: e.target.value })} /></div>
                <div><Label>Category</Label><Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Price (₦, 0 = free)</Label><Input type="number" value={editing.price_naira ?? 0} onChange={(e) => setEditing({ ...editing, price_naira: Number(e.target.value) })} /></div>
                <div><Label>Duration (min)</Label><Input type="number" value={editing.duration_minutes ?? 0} onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Thumbnail (image)</Label><Input type="file" accept="image/*" onChange={(e) => setThumbFile(e.target.files?.[0] || null)} />{editing.thumbnail_url && !thumbFile && <p className="text-xs text-muted-foreground mt-1">Current: {editing.thumbnail_url.split("/").pop()}</p>}</div>
              <div><Label>Video file (or use YouTube URL below)</Label><Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />{editing.video_url && !videoFile && <p className="text-xs text-muted-foreground mt-1">Current uploaded video</p>}</div>
              <div><Label>YouTube URL</Label><Input value={editing.youtube_url || ""} onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} /><Label>Published</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
