import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function RelatedPosts({
  currentId,
  categoryId,
}: {
  currentId: string;
  categoryId: string | null;
}) {
  const { data: posts } = useQuery({
    queryKey: ["related-posts", currentId, categoryId],
    queryFn: async () => {
      // Try same-category first
      let related: any[] = [];
      if (categoryId) {
        const { data } = await supabase
          .from("blog_posts")
          .select("id,title,slug,featured_image,excerpt,published_at")
          .eq("published", true)
          .eq("category_id", categoryId)
          .neq("id", currentId)
          .order("published_at", { ascending: false })
          .limit(4);
        related = data || [];
      }
      // Fallback / fill with latest
      if (related.length < 4) {
        const exclude = [currentId, ...related.map((p) => p.id)];
        const { data } = await supabase
          .from("blog_posts")
          .select("id,title,slug,featured_image,excerpt,published_at")
          .eq("published", true)
          .not("id", "in", `(${exclude.join(",")})`)
          .order("published_at", { ascending: false })
          .limit(4 - related.length);
        related = [...related, ...(data || [])];
      }
      return related;
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="container mx-auto px-4 max-w-3xl mt-12 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Related Guides You'll Love</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((p) => (
          <Link key={p.id} to={`/blog/${p.slug}`} className="group">
            <Card className="overflow-hidden h-full hover:shadow-lg transition-all">
              {p.featured_image && (
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={p.featured_image}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.excerpt}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
