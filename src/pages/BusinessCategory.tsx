import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Plus, BookOpen } from "lucide-react";
import { getCategoryIcon, Category3DVisual, getCategoryTheme } from "@/lib/categoryIcons";
import BusinessCard from "@/components/directory/BusinessCard";
import CategoryTile from "@/components/directory/CategoryTile";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";
import { absUrl, PAGE_OG_IMAGES, SITE_NAME, truncate } from "@/lib/seo";
import SEO from "@/components/SEO";
import BrandedLoader from "@/components/BrandedLoader";
import { trackRecommenderSignal } from "@/lib/aiBusinessRecommenderEngine";
import { useEffect } from "react";

export default function BusinessCategory() {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ["business-category", slug],
    queryFn: async () => {
      if (!slug) return null;
      const decodedSlug = decodeURIComponent(slug).trim();
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "business")
        .eq("slug", decodedSlug)
        .maybeSingle();

      if (data) return data;

      const { data: ilikeData } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "business")
        .ilike("slug", decodedSlug)
        .maybeSingle();

      return ilikeData ?? null;
    },
    enabled: !!slug,
  });

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ["business-category-listings", category?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*, categories(name, slug)")
        .eq("active", true)
        .eq("status", "approved")
        .eq("category_id", category!.id)
        .order("boosted_until", { ascending: false, nullsFirst: false })
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!category?.id,
  });

  useEffect(() => {
    if (category) {
      try {
        trackRecommenderSignal({
          type: "category_browse",
          categorySlug: category.slug,
          categoryName: category.name,
          keywords: [category.name, category.slug],
          path: `/businesses/category/${category.slug}`,
        });
      } catch {}
    }
  }, [category?.id]);

  const bizIds = (businesses ?? []).map((b: any) => b.id);
  const { data: imagesMap } = useQuery({
    queryKey: ["business-category-images", bizIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_images")
        .select("*")
        .in("supplier_id", bizIds)
        .order("display_order");
      const map: Record<string, any[]> = {};
      data?.forEach((img: any) => {
        (map[img.supplier_id] ||= []).push(img);
      });
      return map;
    },
    enabled: bizIds.length > 0,
  });

  const { data: siblings } = useQuery({
    queryKey: ["business-sibling-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug")
        .eq("type", "business")
        .order("name");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: posts } = useQuery({
    queryKey: ["business-category-posts", slug, category?.name],
    queryFn: async () => {
      const { data: blogCat } = await supabase
        .from("categories")
        .select("id")
        .eq("type", "blog")
        .eq("slug", slug!)
        .maybeSingle();

      if (blogCat) {
        const { data } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,featured_image,published_at,views_count")
          .eq("published", true)
          .eq("category_id", blogCat.id)
          .order("published_at", { ascending: false })
          .limit(6);
        if (data && data.length > 0) return data;
      }
      if (category?.name) {
        const keyword = category.name.split(/[\s&]+/)[0];
        const { data } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,featured_image,published_at,views_count")
          .eq("published", true)
          .ilike("title", `%${keyword}%`)
          .order("published_at", { ascending: false })
          .limit(6);
        if (data && data.length > 0) return data;
      }

      // Guaranteed fallback: top recommended business growth & market blogs
      const { data: fallbackPosts } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,featured_image,published_at,views_count")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(6);

      return fallbackPosts ?? [];
    },
    enabled: !!slug,
  });

  if (catLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <BrandedLoader
          message="Loading business category..."
          submessage="Discovering verified Lagos suppliers and service providers"
        />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center space-y-5">
        <div className="h-16 w-16 rounded-3xl bg-muted border border-border/80 flex items-center justify-center mx-auto text-muted-foreground">
          <Building2 className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-foreground">Category Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The business category you are looking for does not exist or has been modified.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link to="/businesses">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Browse Directory
            </Link>
          </Button>
          <Button asChild className="rounded-xl font-bold">
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const Icon = getCategoryIcon(category.name);
  const lower = category.name.toLowerCase();
  const count = businesses?.length ?? 0;
  const title = `${category.name} Businesses in Lagos${count ? ` — ${count} Verified Listings` : ""}`;
  const description = truncate(
    category.description ||
      `Find trusted ${lower} businesses in Lagos. Compare verified listings, browse photos and services, then call, WhatsApp or message owners directly on ${SITE_NAME}.`
  );
  const canonical = absUrl(`/businesses/category/${slug}`);
  const ogImage = PAGE_OG_IMAGES.businessCategory(category.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
  };

  const breadcrumbs = [
    { label: "Businesses", href: "/businesses" },
    { label: category.name },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-8">
      <SEO
        title={`${title} | ${SITE_NAME}`}
        description={description}
        url={`/businesses/category/${slug}`}
        type="website"
        image={ogImage}
        jsonLd={jsonLd}
      />

      <Breadcrumbs items={breadcrumbs} />

      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-accent/15 p-6 shadow-md sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon className="h-3.5 w-3.5" />
              <span>{category.name}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              {category.name} in Lagos
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Button asChild size="default" className="rounded-2xl font-bold shadow-md">
              <Link to="/businesses/list">
                <Plus className="mr-1.5 h-4 w-4" /> List Your Business
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl font-bold">
              <Link to="/businesses">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> All Categories
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <ProgrammaticAdBanner placement="directory" format="banner" />

      {/* Business Listings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            Verified {category.name} Listings ({count})
          </h2>
        </div>

        {bizLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/90 py-16 text-center space-y-3 bg-card/50">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-foreground">No businesses listed in this category yet</h3>
            <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
              Be the first to list your {category.name} business and start receiving verified customer leads!
            </p>
            <Button asChild className="rounded-2xl font-black text-sm px-6 shadow-md">
              <Link to="/businesses/list">
                <Plus className="mr-1.5 h-4 w-4" /> Register Business
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses?.map((b: any) => (
              <BusinessCard key={b.id} supplier={b} images={imagesMap?.[b.id] ?? []} />
            ))}
          </div>
        )}
      </section>

      {/* Sibling Categories */}
      {siblings && siblings.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border/70">
          <h3 className="text-lg font-black text-foreground">Explore Other Business Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {siblings
              .filter((s: any) => s.slug !== slug)
              .slice(0, 12)
              .map((s: any) => (
                <CategoryTile key={s.id} name={s.name} slug={s.slug} />
              ))}
          </div>
        </section>
      )}

      {/* Related Playbooks / Articles */}
      {posts && posts.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border/70">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Growth Guides for {category.name}
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blog">All Guides</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p: any) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="group block">
                <Card className="h-full border border-border/80 hover:border-primary/40 bg-card hover:bg-muted/40 transition-all rounded-2xl overflow-hidden shadow-xs">
                  {p.featured_image && (
                    <div className="h-36 w-full overflow-hidden bg-muted">
                      <img
                        src={p.featured_image}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-1.5">
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h4>
                    {p.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.excerpt}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
