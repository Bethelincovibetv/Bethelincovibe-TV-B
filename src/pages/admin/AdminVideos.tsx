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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Tv,
  Film,
  Sparkles,
  Video as VideoIcon,
  Clapperboard,
  Play,
  Copy,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Download,
  Share2,
} from "lucide-react";
import NativeVideoCreator from "@/components/video/NativeVideoCreator";
import { getSavedVideosHistory, removeSavedVideo, VideoJobStatus } from "@/lib/vixoraVideoEngine";
import VoiceGuideHelper from "@/components/common/VoiceGuideHelper";

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
  const [activeTab, setActiveTab] = useState<"playlist" | "studio" | "history">("playlist");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [placementFilter, setPlacementFilter] = useState<string>("all");

  const [savedHistory, setSavedHistory] = useState<VideoJobStatus[]>(() => getSavedVideosHistory());

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
      toast.success(editId ? "TV video updated" : "TV video added to broadcast");
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
      toast.success("Video removed from TV broadcast");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = async (v: any) => {
    try {
      const { error } = await supabase
        .from("tv_videos")
        .update({ active: !v.active })
        .eq("id", v.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-tv-videos"] });
      toast.success(`Video ${!v.active ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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

  const handleAddHistoryToTv = async (hist: VideoJobStatus) => {
    if (!hist.video_url) return;
    try {
      const { error } = await supabase.from("tv_videos").insert({
        title: hist.title || "Vixora AI Marketing Short",
        youtube_url: hist.video_url,
        description: `Created with Vixora AI Video Studio. Duration: ${hist.duration_seconds || 15}s.`,
        placement: "both",
        display_order: (videos?.length || 0) + 1,
        active: true,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-tv-videos"] });
      toast.success("AI Video added to Bethelincovibe TV Playlist!");
      setActiveTab("playlist");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteHistory = (jobId: string) => {
    removeSavedVideo(jobId);
    setSavedHistory(getSavedVideosHistory());
    toast.success("Removed from local history");
  };

  const filteredVideos = (videos || []).filter((v: any) => {
    const matchSearch =
      !searchFilter ||
      v.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchPlacement = placementFilter === "all" || v.placement === placementFilter || v.placement === "both";
    return matchSearch && matchPlacement;
  });

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Top Header Card - Compact & Mobile-First */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-card border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
              <Tv className="h-6 w-6 text-primary" /> Bethelincovibe TV & Video Studio
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
              Broadcast Manager
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage public TV streams, generate AI video shorts, and broadcast marketing clips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <VoiceGuideHelper
            title="Video Management Guide"
            explanation="Here you can add YouTube or MP4 video links to play on your live TV broadcast, or tap AI Video Studio to automatically generate promotional marketing videos for Nigerian businesses with voiceover!"
            simpleTip="Videos in your playlist stream automatically to visitors on your homepage and TV section."
            variant="badge"
          />

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
              <Button size="sm" className="font-bold text-xs shadow-sm rounded-xl">
                <Plus className="h-4 w-4 mr-1" /> Add TV Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit" : "Add"} TV Broadcast Video</DialogTitle>
                <DialogDescription className="text-xs">
                  Enter a YouTube link or direct MP4 video URL to add to the playlist.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs font-bold">Video Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Lagos Wholesale Market Tour"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Video URL (YouTube or MP4)</Label>
                  <Input
                    value={form.youtube_url}
                    onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                    placeholder="https://youtu.be/... or https://domain.com/video.mp4"
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Description (Optional)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief details about this video..."
                    rows={2}
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-bold">Display Placement</Label>
                    <Select
                      value={form.placement}
                      onValueChange={(v) => setForm({ ...form, placement: v })}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Home & About</SelectItem>
                        <SelectItem value="home">Home Page</SelectItem>
                        <SelectItem value="about">About Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Order Position</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border">
                  <div>
                    <p className="text-xs font-bold">Active in Broadcast</p>
                    <p className="text-[10px] text-muted-foreground">Visible to public viewers</p>
                  </div>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(c) => setForm({ ...form, active: c })}
                  />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  className="w-full font-bold text-xs rounded-xl"
                  onClick={() => save.mutate()}
                  disabled={!form.title || !form.youtube_url}
                >
                  {editId ? "Update Video" : "Add to TV Stream"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Segmented Fractured Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid grid-cols-3 h-11 p-1 bg-muted/80 rounded-2xl">
          <TabsTrigger value="playlist" className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl">
            <Tv className="h-4 w-4 text-primary" />
            <span>TV Playlist</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
              {videos?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="studio" className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>AI Studio</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl">
            <Film className="h-4 w-4 text-amber-600" />
            <span>History</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
              {savedHistory.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TV PLAYLIST (Fractured & Mobile-Friendly) */}
        <TabsContent value="playlist" className="space-y-4 pt-2">
          {/* Search & Placement Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search TV videos by title..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={placementFilter} onValueChange={setPlacementFilter}>
                <SelectTrigger className="text-xs h-9 w-full sm:w-36 rounded-xl">
                  <SelectValue placeholder="Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  <SelectItem value="both">Home & About</SelectItem>
                  <SelectItem value="home">Home Only</SelectItem>
                  <SelectItem value="about">About Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading broadcast playlist...
            </div>
          ) : !filteredVideos.length ? (
            <Card className="p-8 text-center border-dashed rounded-3xl">
              <Tv className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold text-foreground">No TV videos found</p>
              <p className="text-xs text-muted-foreground mb-4">
                {searchFilter ? "No videos match your search." : "Add a video URL or generate an AI short with Vixora."}
              </p>
              <Button size="sm" onClick={() => setActiveTab("studio")} className="rounded-xl font-bold text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Open AI Video Studio
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVideos.map((v: any) => {
                const isDirectMp4 = v.youtube_url?.endsWith(".mp4") || v.youtube_url?.startsWith("blob:");
                return (
                  <Card
                    key={v.id}
                    className={`rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      !v.active ? "opacity-60 bg-muted/30" : "bg-card"
                    }`}
                  >
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-bold ${
                                v.active
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-700 border-red-500/20"
                              }`}
                            >
                              {v.active ? "● Live on TV" : "Inactive"}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Order #{v.display_order}
                            </span>
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {v.placement}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm leading-snug text-foreground line-clamp-1">
                            {v.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(v)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => remove.mutate(v.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {v.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {v.description}
                        </p>
                      )}

                      <div className="p-2 rounded-xl bg-secondary/50 border text-[11px] font-mono truncate text-muted-foreground flex items-center justify-between gap-2">
                        <span className="truncate">{v.youtube_url}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(v.youtube_url);
                            toast.success("Link copied");
                          }}
                          className="shrink-0 text-primary hover:text-primary/80"
                          title="Copy Link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-muted/40 border-t flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-bold gap-1 rounded-xl flex-1"
                        onClick={() => {
                          setPreviewVideoUrl(v.youtube_url);
                          setPreviewVideoTitle(v.title);
                        }}
                      >
                        <Play className="h-3 w-3 text-primary" /> Watch Preview
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={v.active}
                          onCheckedChange={() => toggleActive(v)}
                          aria-label="Toggle active"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: AI VIDEO CREATOR STUDIO */}
        <TabsContent value="studio" className="space-y-4 pt-2">
          <div className="rounded-3xl border bg-card p-3 sm:p-5 shadow-xs overflow-hidden">
            <NativeVideoCreator
              onVideoCreated={(vid) => {
                setSavedHistory(getSavedVideosHistory());
                toast.success("Video created! You can preview it or add it to TV stream.");
              }}
            />
          </div>
        </TabsContent>

        {/* TAB 3: VIDEO GENERATION HISTORY */}
        <TabsContent value="history" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">AI Video Generation History</h2>
              <p className="text-xs text-muted-foreground">
                All previously created video clips and rendered assets stored in your studio.
              </p>
            </div>
            {savedHistory.length > 0 && (
              <Badge variant="outline" className="text-xs font-bold">
                {savedHistory.length} Video{savedHistory.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {!savedHistory.length ? (
            <Card className="p-8 text-center border-dashed rounded-3xl">
              <Film className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold text-foreground">No generated video history yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Launch the AI Video Studio to craft your first marketing short.
              </p>
              <Button size="sm" onClick={() => setActiveTab("studio")} className="rounded-xl font-bold text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Create AI Video
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {savedHistory.map((item) => (
                <Card key={item.job_id} className="rounded-2xl border bg-card overflow-hidden flex flex-col justify-between">
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge className="text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 mb-1">
                          {item.aspect_ratio || "vertical"} • {item.duration_seconds || 15}s
                        </Badge>
                        <h3 className="font-bold text-sm text-foreground line-clamp-1">{item.title || "AI Marketing Video"}</h3>
                        <p className="text-[10px] font-mono text-muted-foreground">{item.job_id}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteHistory(item.job_id)}
                        title="Delete from history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {item.thumbnail_url && (
                      <div className="relative rounded-xl overflow-hidden aspect-video bg-muted border">
                        <img
                          src={item.thumbnail_url}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9 rounded-full shadow-lg"
                            onClick={() => {
                              if (item.video_url) {
                                setPreviewVideoUrl(item.video_url);
                                setPreviewVideoTitle(item.title || "AI Video");
                              }
                            }}
                          >
                            <Play className="h-4 w-4 text-primary fill-primary" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-muted/40 border-t flex items-center gap-2">
                    {item.video_url && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs font-bold gap-1 rounded-xl flex-1"
                          onClick={() => {
                            setPreviewVideoUrl(item.video_url!);
                            setPreviewVideoTitle(item.title || "AI Video");
                          }}
                        >
                          <Play className="h-3 w-3 text-primary" /> Preview
                        </Button>

                        <Button
                          size="sm"
                          className="h-8 text-xs font-bold gap-1 rounded-xl bg-primary text-primary-foreground shadow-xs"
                          onClick={() => handleAddHistoryToTv(item)}
                        >
                          <Tv className="h-3 w-3" /> Add to TV
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Preview Modal Player */}
      <Dialog open={!!previewVideoUrl} onOpenChange={(o) => !o && setPreviewVideoUrl(null)}>
        <DialogContent className="max-w-2xl p-4 sm:p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> {previewVideoTitle || "Video Broadcast Preview"}
            </DialogTitle>
          </DialogHeader>

          {previewVideoUrl && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border shadow-inner">
                {previewVideoUrl.includes("youtube.com") || previewVideoUrl.includes("youtu.be") ? (
                  <iframe
                    src={getEmbedUrl(previewVideoUrl)}
                    title="Video Player"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={previewVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold gap-1 rounded-xl"
                  onClick={() => {
                    navigator.clipboard.writeText(previewVideoUrl);
                    toast.success("Video URL copied to clipboard");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Link
                </Button>

                {!previewVideoUrl.includes("youtube.com") && !previewVideoUrl.includes("youtu.be") && (
                  <a
                    href={previewVideoUrl}
                    download="vixora-video.webm"
                    className="inline-flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-xl shadow-xs hover:bg-primary/90"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Video File
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
