import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "lucide-react";

export default function UserFavorites() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: favs } = await supabase.from("favorites").select("post_id").eq("user_id", user.id);
      const ids = (favs || []).map((f) => f.post_id);
      if (ids.length === 0) { setPosts([]); return; }
      const { data } = await supabase.from("blog_posts").select("id,title,slug,excerpt,featured_image,published_at").in("id", ids).eq("published", true);
      setPosts(data || []);
    })();
  }, [user]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      <Helmet><title>My Saved Posts | Bethelincovibe TV</title></Helmet>
      <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6 text-rose-500" />Saved Posts</h1>
      {posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No saved posts yet. Tap the heart on any blog to save it.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {posts.map((p) => (
            <Link key={p.id} to={`/blog/${p.slug}`} className="group">
              <Card className="overflow-hidden hover:shadow-lg transition-all">
                {p.featured_image && <img src={p.featured_image} alt={p.title} className="w-full h-40 object-cover" loading="lazy" />}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary">{p.title}</h3>
                  {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
