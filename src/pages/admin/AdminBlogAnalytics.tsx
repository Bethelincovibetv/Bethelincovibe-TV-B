import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageCircle, Heart, ExternalLink, Info } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminBlogAnalytics() {
  const { data: gaId } = useQuery({
    queryKey: ["site-settings-ga"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ga_measurement_id").maybeSingle();
      return data?.value || "";
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["admin-blog-rankings"],
    queryFn: async () => {
      const { data: posts } = await supabase.from("blog_posts").select("id, title, slug, published, published_at").eq("published", true);
      const ids = (posts || []).map((p) => p.id);
      const [{ data: comments }, { data: favs }] = await Promise.all([
        supabase.from("blog_comments").select("post_id").in("post_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("favorites").select("post_id").in("post_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const commentCount: Record<string, number> = {};
      const favCount: Record<string, number> = {};
      (comments || []).forEach((c: any) => { commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1; });
      (favs || []).forEach((f: any) => { favCount[f.post_id] = (favCount[f.post_id] || 0) + 1; });
      return (posts || []).map((p: any) => ({
        ...p,
        comments: commentCount[p.id] || 0,
        favorites: favCount[p.id] || 0,
        score: (commentCount[p.id] || 0) * 2 + (favCount[p.id] || 0),
      })).sort((a, b) => b.score - a.score);
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Blog Analytics & Ranking</h1>

      {gaId ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ExternalLink className="h-4 w-4" />Google Analytics</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <p>Live page-view data is collected by GA ({gaId}).</p>
            <a href={`https://analytics.google.com/analytics/web/#/p${gaId.replace(/[^0-9]/g, "")}/reports`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline">
              Open Google Analytics <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-muted-foreground">Pulling live GA pageview counts into this dashboard requires the GA Data API and a service account. Below is on-site engagement ranking from our own database.</p>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-3 text-xs flex gap-2"><Info className="h-4 w-4 text-amber-500 shrink-0" />Add your GA Measurement ID in Settings to enable Google Analytics tracking.</CardContent></Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top Posts by Engagement</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {posts?.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No published posts yet.</p>}
          {posts?.map((p, i) => (
            <Link key={p.id} to={`/blog/${p.slug}`} target="_blank">
              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.comments}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.favorites}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">Score {p.score}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
