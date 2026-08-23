import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Search } from "lucide-react";
import PageHero from "@/components/PageHero";
import heroBlog from "@/assets/hero-blog.jpg";

export default function Blog() {
  const { categorySlug } = useParams();
  const [search, setSearch] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "blog");
      return data ?? [];
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts", categorySlug, search],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, published_at, categories(name, slug)")
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (categorySlug) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).single();
        if (cat) query = query.eq("category_id", cat.id);
      }

      if (search) query = query.ilike("title", `%${search}%`);

      const { data } = await query;
      return data ?? [];
    },
  });

  const currentCategory = categories?.find((c: any) => c.slug === categorySlug);

  return (
    <>
      <PageHero
        image={heroBlog}
        eyebrow="Bethelincovibe TV"
        title={currentCategory ? currentCategory.name : "Business Blog & Insights"}
        subtitle={currentCategory?.description || "Practical guides, funding tips and growth stories for Lagos entrepreneurs."}
      />
      <div className="container mx-auto px-4 py-8">

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/blog">
            <Badge variant={!categorySlug ? "default" : "secondary"}>All</Badge>
          </Link>
          {categories?.map((cat: any) => (
            <Link key={cat.id} to={`/blog/category/${cat.slug}`}>
              <Badge variant={categorySlug === cat.slug ? "default" : "secondary"}>{cat.name}</Badge>
            </Link>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><div className="h-48 bg-muted" /><CardHeader><div className="h-4 bg-muted rounded w-3/4" /></CardHeader></Card>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: any) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="block h-full group min-w-0">
              <Card className="h-full hover:shadow-md transition-all overflow-hidden rounded-2xl border min-w-0">
                {post.featured_image && <img src={post.featured_image} alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />}
                <CardHeader className="p-4 sm:p-5">
                  {post.categories && <span className="text-xs text-primary font-bold uppercase tracking-wider">{post.categories.name}</span>}
                  <CardTitle className="text-base sm:text-lg font-bold line-clamp-2 break-words leading-snug mt-1 min-w-0">{post.title}</CardTitle>
                </CardHeader>
                {post.excerpt && <CardContent className="px-4 sm:px-5 pb-5 pt-0"><p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 break-words min-w-0 leading-relaxed">{post.excerpt}</p></CardContent>}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No articles found</p>
          <p className="text-sm mt-2">Check back soon for new content!</p>
        </div>
      )}
      </div>
    </>
  );
}
