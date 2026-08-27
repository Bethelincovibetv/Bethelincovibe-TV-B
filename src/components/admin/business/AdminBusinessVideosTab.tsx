import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Video, Play, Trash2, Pencil, Search, RefreshCw, ExternalLink,
  Building2, AlertTriangle, Check, X, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function AdminBusinessVideosTab() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [editingBiz, setEditingBiz] = useState<any>(null);
  const [newVideoUrl, setNewVideoUrl] = useState("");

  // Fetch Businesses with video URLs
  const { data: businesses = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Owners Map
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin-business-owners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username, avatar_url");
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p;
      });
      return map;
    },
  });

  // Update or Clear Video Mutation
  const updateVideoMutation = useMutation({
    mutationFn: async ({ bizId, videoUrl }: { bizId: string; videoUrl: string | null }) => {
      const targetBiz = businesses.find((b: any) => b.id === bizId);
      if (!targetBiz) throw new Error("Business not found");

      const sl = (targetBiz.social_links as Record<string, any>) || {};
      const nextLinks = {
        ...sl,
        youtube_video_url: videoUrl,
      };

      const { error } = await supabase
        .from("suppliers")
        .update({ social_links: nextLinks })
        .eq("id", bizId);
      if (error) throw error;

      // Also update user's profile if applicable
      if (targetBiz.submitted_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("social_links")
          .eq("user_id", targetBiz.submitted_by)
          .maybeSingle();
        if (prof) {
          const profLinks = (prof.social_links as Record<string, any>) || {};
          await supabase
            .from("profiles")
            .update({
              social_links: {
                ...profLinks,
                youtube_video_url: videoUrl,
              },
            })
            .eq("user_id", targetBiz.submitted_by);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success(
        variables.videoUrl
          ? "Video URL updated successfully!"
          : "Business video showcase removed."
      );
      setEditingBiz(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filter businesses that have video URLs
  const videoBusinesses = useMemo(() => {
    return businesses.filter((b: any) => {
      const sl = (b.social_links as Record<string, any>) || {};
      const url = sl?.youtube_video_url || (b as any).video_url;
      if (!url) return false;

      if (search.trim()) {
        const owner = profilesMap[b.submitted_by];
        const text = [
          b.name,
          b.slug,
          url,
          owner?.display_name,
          owner?.email,
          owner?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [businesses, profilesMap, search]);

  const activeYtId = extractYouTubeVideoId(activeVideoUrl);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Video Showcases</span>
            <Video className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{videoBusinesses.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active YouTube business embeds</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Businesses</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{businesses.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Directory listings in total</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Video Adoption</span>
            <Play className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">
            {businesses.length > 0 ? Math.round((videoBusinesses.length / businesses.length) * 100) : 0}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Merchants showcasing videos</p>
        </Card>
      </div>

      {/* Videos List & Moderation */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-5 w-5 text-rose-500" />
                Business YouTube Video Moderation ({videoBusinesses.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect and preview YouTube videos embedded in business profiles to ensure quality and compliance.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8 rounded-xl shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative pt-2">
            <Search className="h-4 w-4 absolute left-3 top-4.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, video link, owner..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-center text-xs text-muted-foreground py-8">Loading business videos...</p>
          ) : videoBusinesses.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Video className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No business videos found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No businesses currently have linked YouTube videos matching your search.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videoBusinesses.map((b: any) => {
                const owner = profilesMap[b.submitted_by];
                const sl = (b.social_links as Record<string, any>) || {};
                const videoUrl = sl?.youtube_video_url || (b as any).video_url;
                const ytId = extractYouTubeVideoId(videoUrl);

                return (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl border bg-card hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Video Thumbnail / Preview */}
                      <div
                        onClick={() => setActiveVideoUrl(videoUrl)}
                        className="relative aspect-video w-full rounded-xl bg-slate-900 overflow-hidden cursor-pointer group flex items-center justify-center border"
                      >
                        {ytId ? (
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                            alt={b.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-muted-foreground text-xs p-4 text-center">
                            Invalid or non-standard YouTube link
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                          <div className="h-10 w-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Business & Owner Info */}
                      <div className="pt-2 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-sm text-foreground truncate">{b.name}</h4>
                          {sl?.verified && (
                            <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Owner: <strong>{owner?.display_name || owner?.username || "Unknown"}</strong>
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono bg-muted/40 p-1 rounded-md">
                          {videoUrl}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-7 px-2 text-[11px] font-bold rounded-lg"
                      >
                        <Link to={`/businesses/${b.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Profile
                        </Link>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingBiz(b);
                            setNewVideoUrl(videoUrl);
                          }}
                          className="h-7 px-2 text-[11px] font-bold rounded-lg"
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove YouTube video from "${b.name}"? The business profile will remain active.`)) {
                              updateVideoMutation.mutate({ bizId: b.id, videoUrl: null });
                            }
                          }}
                          className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 rounded-lg"
                          title="Remove Inappropriate Video"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Player Modal */}
      {activeVideoUrl && (
        <Dialog open={!!activeVideoUrl} onOpenChange={(v) => !v && setActiveVideoUrl(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl bg-black border-none">
            <div className="relative aspect-video w-full">
              {activeYtId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${activeYtId}?autoplay=1`}
                  title="YouTube video player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-sm">
                  Cannot stream this video URL directly
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Video Dialog */}
      {editingBiz && (
        <Dialog open={!!editingBiz} onOpenChange={(v) => !v && setEditingBiz(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Video className="h-5 w-5 text-rose-500" /> Edit Video URL
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update or replace YouTube video URL for &ldquo;{editingBiz.name}&rdquo;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">YouTube Video URL</Label>
                <Input
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBiz(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    updateVideoMutation.mutate({
                      bizId: editingBiz.id,
                      videoUrl: newVideoUrl.trim() || null,
                    })
                  }
                  className="bg-primary font-bold text-xs rounded-xl"
                >
                  Save URL
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
