import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tv, Film, Sparkles, Video as VideoIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import NativeVideoCreator from "@/components/video/NativeVideoCreator";

interface VideoForm {
  title: string;
  youtube_url: string;
  description: string;
  placement: string;
  display_order: number;
  active: boolean;
}

const emptyForm: VideoForm = {
  title: "",
  youtube_url: "",
  description: "",
  placement: "both",
  display_order: 0,
  active: true,
};

export default function AdminVideos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VideoForm>(emptyForm);
  const [activeTab, setActiveTab] = useState<"list" | "creator">("list");

  const { data: videos, isLoading } = useQuery({
    queryKey: ["admin-tv-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tv_videos").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("tv_videos").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tv_videos").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tv-videos"] });
      qc.invalidateQueries({ queryKey: ["tv-videos"] });
      toast.success(editId ? "Video updated" : "Video added");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tv_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tv-videos"] });
      qc.invalidateQueries({ queryKey: ["tv-videos"] });
      toast.success("Video deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (v: any) => {
    setEditId(v.id);
    setForm({
      title: v.title,
      youtube_url: v.youtube_url,
      description: v.description || "",
      placement: v.placement,
      display_order: v.display_order,
      active: v.active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tv className="h-6 w-6 text-primary" /> Bethelincovibe TV & Video Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your public TV broadcast stream and create high-converting marketing videos natively with Vixora.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid grid-cols-2 h-9 p-1">
              <TabsTrigger value="list" className="text-xs font-bold gap-1.5">
                <Tv className="h-3.5 w-3.5" /> TV Playlist ({videos?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="creator" className="text-xs font-bold gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" /> AI Video Studio
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "list" && (
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) {
                  setEditId(null);
                  setForm(emptyForm);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Video URL
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editId ? "Edit" : "Add"} TV Video</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Video / MP4 / YouTube URL</Label>
                    <Input
                      value={form.youtube_url}
                      onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                      placeholder="https://youtu.be/... or https://..."
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Show On</Label>
                    <Select
                      value={form.placement}
                      onValueChange={(v) => setForm({ ...form, placement: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Home & About</SelectItem>
                        <SelectItem value="home">Home Only</SelectItem>
                        <SelectItem value="about">About Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) =>
                        setForm({ ...form, display_order: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.active}
                      onCheckedChange={(c) => setForm({ ...form, active: c })}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => save.mutate()}
                    disabled={!form.title || !form.youtube_url}
                  >
                    {editId ? "Update" : "Add"} Video
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeTab === "creator" ? (
        <NativeVideoCreator
          onVideoCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-tv-videos"] });
            qc.invalidateQueries({ queryKey: ["tv-videos"] });
          }}
        />
      ) : (
        <div>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading TV playlist...</p>
          ) : !videos?.length ? (
            <Card className="p-8 text-center border-dashed">
              <Film className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No videos on TV yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add an existing video link or generate an AI video with Vixora.
              </p>
              <Button size="sm" onClick={() => setActiveTab("creator")}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Launch AI Video Creator
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {videos.map((v: any) => (
                <Card key={v.id} className={!v.active ? "opacity-50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold">{v.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-md">
                          {v.youtube_url}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove.mutate(v.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-muted px-2 py-0.5 rounded font-semibold">{v.placement}</span>
                      <span className="bg-muted px-2 py-0.5 rounded">Order: {v.display_order}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          v.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {v.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
