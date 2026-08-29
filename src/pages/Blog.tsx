import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Search, Sparkles, LayoutGrid, ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import heroBlog from "@/assets/hero-blog.jpg";
import { Category3DVisual, getCategoryTheme } from "@/lib/categoryIcons";
import FavoriteButton from "@/components/FavoriteButton";
import FrontendSpecialistWidget from "@/components/ai/FrontendSpecialistWidget";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";

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
  const currentCategoryTheme = currentCategory ? getCategoryTheme(currentCategory.name) : null;

  return (
    <>
      <PageHero
        image={heroBlog}
        eyebrow="Bethelincovibe TV"
        title={currentCategory ? currentCategory.name : "Business Blog & Insights"}
        subtitle={currentCategory?.description || "Practical guides, funding tips and growth stories for Nigerian and global entrepreneurs."}
      />
      <div className="container mx-auto px-4 py-8">

        {/* 3D Category Interactive Selector Grid / Scroller */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Explore by Category
            </h2>
            {categorySlug && (
              <Link to="/blog" className="text-xs font-semibold text-primary hover:underline">
                Clear filter
              </Link>
            )}
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth">
            <Link
              to="/blog"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all shrink-0 text-xs sm:text-sm font-semibold ${
                !categorySlug
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 border-primary"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <LayoutGrid className="h-3.5 w-3.5" />
              </div>
              All Categories
            </Link>

            {categories?.map((cat: any) => {
              const isSelected = categorySlug === cat.slug;
              const theme = getCategoryTheme(cat.name);
              return (
                <Link
                  key={cat.id}
                  to={`/blog/category/${cat.slug}`}
                  className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all shrink-0 text-xs sm:text-sm font-medium ${
                    isSelected
                      ? "bg-card border-primary ring-2 ring-primary/20 shadow-md"
                      : "bg-card hover:bg-muted/60 border-border/80"
                  }`}
                >
                  <Category3DVisual name={cat.name} size="sm" />
                  <span className={isSelected ? "font-bold text-primary" : "text-foreground"}>
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Editorial Desk AI Specialist */}
        <div className="mb-8">
          <FrontendSpecialistWidget
            agentId="content_ai"
            mode="banner"
            title="Chief Content Officer & Lead Editorial Producer"
            subtitle="Search global wholesale import roadmaps (Guangzhou, Yiwu, Dubai, Turkey) and curated market intelligence."
            initialOpen={false}
            contextData={{
              page: "blog_hub",
              currentCategory: currentCategory?.name || "All",
              totalArticles: posts?.length || 0,
            }}
            customPrompts={[
              "Search Guangzhou Wholesale Sourcing Guide",
              "Watch Turkey & Dubai Fashion Import Roadmaps",
              "Draft an Editorial Founder Showcase",
              "Explain Lagos Trade Market Pricing Intelligence"
            ]}
          />
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mb-6">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        {/* Public Native Blog Advertisement Placement */}
        <ProgrammaticAdBanner placement="blog" format="banner" className="mb-8" />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse rounded-2xl overflow-hidden">
                <div className="h-48 bg-muted" />
                <CardHeader className="p-4 sm:p-5">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => {
              const catName = post.categories?.name;
              return (
                <Link key={post.id} to={`/blog/${post.slug}`} className="block h-full group min-w-0">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl border border-border/80 bg-card min-w-0 flex flex-col justify-between">
                    <div>
                      {post.featured_image && (
                        <div className="relative overflow-hidden aspect-[16/9] w-full">
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          {catName && (
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-border/50 text-[11px] font-bold">
                              <Category3DVisual name={catName} size="sm" className="!w-5 !h-5 !rounded-lg" />
                              <span className="truncate max-w-[120px]">{catName}</span>
                            </div>
                          )}
                          <div className="absolute top-3 right-3 z-10">
                            <FavoriteButton postId={post.id} size="sm" variant="secondary" className="h-7 w-7 rounded-lg bg-background/90 backdrop-blur-md shadow-md" />
                          </div>
                        </div>
                      )}
                      <CardHeader className="p-4 sm:p-5">
                        {!post.featured_image && (
                          <div className="flex items-center justify-between gap-2 mb-2">
                            {catName ? (
                              <div className="flex items-center gap-2">
                                <Category3DVisual name={catName} size="sm" />
                                <span className="text-xs text-primary font-bold uppercase tracking-wider">{catName}</span>
                              </div>
                            ) : <div />}
                            <FavoriteButton postId={post.id} size="sm" variant="ghost" className="h-7 w-7" />
                          </div>
                        )}
                        <CardTitle className="text-base sm:text-lg font-bold line-clamp-2 break-words leading-snug group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      {post.excerpt && (
                        <CardContent className="px-4 sm:px-5 pb-4 pt-0">
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 break-words leading-relaxed">
                            {post.excerpt}
                          </p>
                        </CardContent>
                      )}
                    </div>
                    <div className="px-4 sm:px-5 pb-4 pt-0 flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                      <span className="flex items-center gap-1 font-semibold text-primary group-hover:translate-x-1 transition-transform">
                        Read <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Search className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">No articles found</p>
            <p className="text-sm">We couldn't find any articles matching your search. Try another query or category!</p>
            {categorySlug && (
              <Link to="/blog" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">
                View all articles
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
