import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Play, Lock, Clock, User, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AdsterraAd from "@/components/AdsterraAd";

type Course = {
  id: string; title: string; description: string | null; thumbnail_url: string | null;
  video_url: string | null; youtube_url: string | null; instructor_name: string | null;
  category: string | null; price_naira: number; duration_minutes: number | null;
};

function youtubeEmbed(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : url;
}

export default function Learn() {
  const { user } = useAuth();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const qc = useQueryClient();
  const [playing, setPlaying] = useState(null as Course | null);

  const share = async () => {
    const url = `${window.location.origin}/learn`;
    const shareData = { title: "Bethelincovibe Learning Hub", text: "Grow your business skills with these courses 🎓", url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }
    } catch {}
  };

  const { data: courses } = useQuery({
    queryKey: ["learn-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("published", true).order("display_order", { ascending: true }).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("course_enrollments").select("course_id").eq("user_id", user!.id);
      return new Set((data || []).map((e) => e.course_id));
    },
  });

  const enroll = useMutation({
    mutationFn: async (course_id: string) => {
      const { data, error } = await supabase.rpc("enroll_in_course", { _course_id: course_id });
      if (error) throw error;
      const res = data as any;
      if (!res.success) throw new Error(res.error === "insufficient_balance" ? "Top up your wallet to enroll" : res.error);
      return res;
    },
    onSuccess: (_, id) => {
      toast.success("Enrolled! Enjoy the course.");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      const c = courses?.find((x) => x.id === id);
      if (c) setPlaying(c);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePlay = (c: Course) => {
    if (!user) return toast.error("Please log in to access courses");
    const isFree = c.price_naira === 0;
    const enrolled = enrollments?.has(c.id);
    if (isFree || enrolled) setPlaying(c);
    else enroll.mutate(c.id);
  };

  if (!flagsLoading && !flags.learn) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Helmet><title>Business Learning Hub — Bethelincovibe TV</title></Helmet>

      <div className="text-center mb-6 relative">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <GraduationCap className="h-3.5 w-3.5" /> Learning Hub
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Grow your business skills</h1>
        <p className="text-sm text-muted-foreground mt-1">Free and premium courses from Lagos entrepreneurs.</p>
        <Button onClick={share} size="sm" variant="outline" className="mt-3 gap-1">
          <Share2 className="h-3.5 w-3.5" /> Share Learning Hub
        </Button>
      </div>

      <AdsterraAd slot="learn" />



      {!user && (
        <Card className="p-4 mb-4 bg-primary/5 border-primary/20 text-center">
          <p className="text-sm">Log in to enroll in premium courses.</p>
          <Button asChild size="sm" className="mt-2"><Link to="/login">Log in</Link></Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses?.map((c) => {
          const enrolled = enrollments?.has(c.id);
          const isFree = c.price_naira === 0;
          const accessible = isFree || enrolled;
          return (
            <Card key={c.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer" onClick={() => handlePlay(c)}>
              <div className="relative aspect-video bg-muted">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" loading="lazy" />
                ) : <div className="w-full h-full flex items-center justify-center"><GraduationCap className="h-10 w-10 text-muted-foreground" /></div>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="bg-primary text-primary-foreground rounded-full p-3">
                    {accessible ? <Play className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                  </div>
                </div>
                <Badge className="absolute top-2 right-2" variant={isFree ? "secondary" : "default"}>
                  {isFree ? "FREE" : `₦${c.price_naira.toLocaleString()}`}
                </Badge>
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="font-semibold text-sm line-clamp-2">{c.title}</h3>
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                  {c.instructor_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.instructor_name}</span>}
                  {c.duration_minutes ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.duration_minutes}m</span> : null}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  variant={accessible ? "secondary" : "default"}
                  disabled={enroll.isPending}
                  onClick={(e) => { e.stopPropagation(); handlePlay(c); }}
                >
                  {enroll.isPending ? "Enrolling…" :
                    accessible ? (<><Play className="h-3.5 w-3.5 mr-1" />Watch</>) :
                    isFree ? (<><Play className="h-3.5 w-3.5 mr-1" />Enroll & Watch (Free)</>) :
                    (<><Lock className="h-3.5 w-3.5 mr-1" />Enroll for ₦{c.price_naira.toLocaleString()}</>)}
                </Button>
              </div>

            </Card>
          );
        })}
      </div>

      {courses?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No courses available yet. Check back soon!</p>
        </div>
      )}

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0"><DialogTitle>{playing?.title}</DialogTitle></DialogHeader>
          {playing && (
            <div className="aspect-video bg-black">
              {playing.youtube_url ? (
                <iframe src={youtubeEmbed(playing.youtube_url)} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
              ) : playing.video_url ? (
                <video src={playing.video_url} controls autoPlay className="w-full h-full" />
              ) : <div className="text-white p-8 text-center">Video unavailable</div>}
            </div>
          )}
          {playing?.description && <p className="p-4 text-sm">{playing.description}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
