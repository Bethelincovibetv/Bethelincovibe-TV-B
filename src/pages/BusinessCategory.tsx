import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Plus, BookOpen } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import BusinessCard from "@/components/directory/BusinessCard";
import CategoryTile from "@/components/directory/CategoryTile";
import Breadcrumbs from "@/components/Breadcrumbs";
import { absUrl, ogImageUrl, SITE_NAME, truncate } from "@/lib/seo";

export default function BusinessCategory() {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ["business-category", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories").select("*").eq("type", "business").eq("slug", slug!).maybeSingle();
      return data;
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

  const bizIds = (businesses ?? []).map((b: any) => b.id);
  const { data: imagesMap } = useQuery({
    queryKey: ["business-category-images", bizIds],
    queryFn: async () => {
      const { data } = await supabase.from("supplier_images").select("*").in("supplier_id", bizIds).order("display_order");
      const map: Record<string, any[]> = {};
      data?.forEach((img: any) => { (map[img.supplier_id] ||= []).push(img); });
      return map;
    },
    enabled: bizIds.length > 0,
  });

  const { data: siblings } = useQuery({
    queryKey: ["business-sibling-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").eq("type", "business").order("name");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: posts } = useQuery({
    queryKey: ["business-category-posts", slug, category?.name],
    queryFn: async () => {
      const { data: blogCat } = await supabase
        .from("categories").select("id").eq("type", "blog").eq("slug", slug!).maybeSingle();

      if (blogCat) {
        const { data } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,featured_image,published_at")
          .eq("published", true).eq("category_id", blogCat.id)
          .order("published_at", { ascending: false }).limit(6);
        if (data?.length) return data;
      }
      if (category?.name) {
        const keyword = category.name.split(/[\s&]+/)[0];
        const { data } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,featured_image,published_at")
          .eq("published", true).ilike("title", `%${keyword}%`)
          .order("published_at", { ascending: false }).limit(6);
        return data ?? [];
      }
      return [];
    },
    enabled: !!slug,
  });

  if (catLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="mb-4 h-40 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-lg font-medium">Category not found</h1>
        <Button asChild className="mt-4"><Link to="/businesses">Back to directory</Link></Button>
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
  const ogImage = ogImageUrl({
    title: `${category.name} in Lagos`,
    subtitle: `${count} verified business${count === 1 ? "" : "es"}`,
    image: (businesses?.[0] as any)?.cover_url || (businesses?.[0] as any)?.logo_url || undefined,
    badge: "Business Directory",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absUrl("/") },
    about: { "@type": "Thing", name: category.name },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count,
      itemListElement: (businesses ?? []).slice(0, 25).map((s: any, i: number) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absUrl(`/businesses/${s.slug}`),
        name: s.name,
      })),
    },
  };

  return (
    <>
      <Helmet>
        <title>{`${title} | ${SITE_NAME}`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="container mx-auto max-w-6xl px-4 py-4 md:py-8">
        <Breadcrumbs
          className="mb-3"
          items={[{ label: "Businesses", href: "/businesses" }, { label: category.name }]}
        />

        <Link to="/businesses" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-1 h-4 w-4" /> All categories
        </Link>

        <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-6 text-primary-foreground shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.9)] md:p-10">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Icon className="h-7 w-7" />
            </div>
            <h1 className="mb-2 text-2xl font-extrabold leading-tight md:text-4xl">{title}</h1>
            <p className="mb-5 text-sm opacity-90 md:text-base">{description}</p>
            <Button asChild size="lg" variant="secondary" className="shadow-lg">
              <Link to="/businesses/list"><Plus className="mr-1.5 h-4 w-4" />List Your Business Here</Link>
            </Button>
          </div>
          <Icon className="absolute -bottom-6 -right-6 h-44 w-44 opacity-10" aria-hidden="true" />
        </header>

        <section className="mb-10" aria-labelledby="cat-listings">
          <h2 id="cat-listings" className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Building2 className="h-5 w-5 text-primary" />
            {category.name} businesses
          </h2>
          {bizLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : count > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses!.map((s: any) => (
                <BusinessCard key={s.id} business={s} images={imagesMap?.[s.id] ?? []} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              <p className="font-medium">No businesses listed yet in {category.name}.</p>
              <p className="mt-1 text-sm">Be the first to claim this category.</p>
              <Button asChild className="mt-4"><Link to="/businesses/list"><Plus className="mr-1.5 h-4 w-4" />List Your Business Here</Link></Button>
            </Card>
          )}
        </section>

        {/* SEO body copy */}
        <section className="mb-10 rounded-2xl border bg-card p-5 md:p-7">
          <h2 className="mb-3 text-lg font-bold">About {lower} businesses in Lagos</h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Lagos is Nigeria's busiest commercial hub, and the {lower} sector is one of its fastest-moving markets.
              This page lists {count > 0 ? `${count} verified ` : ""}{lower} businesses you can contact directly — no
              middlemen, no sign-up required to browse.
            </p>
            <p>
              Every listing on {SITE_NAME} shows real photos, services offered, opening location and direct contact
              options such as phone, WhatsApp and website, so you can compare providers before you commit.
            </p>
            <p>
              Run a {lower} business yourself? <Link to="/businesses/list" className="font-medium text-primary underline">Create your free listing</Link>{" "}
              to appear on this page, or <Link to="/advertise" className="font-medium text-primary underline">boost it</Link> to
              stay at the top of the category.
            </p>
          </div>
        </section>

        {!!posts?.length && (
          <section className="mb-10" aria-labelledby="cat-articles">
            <h2 id="cat-articles" className="mb-4 flex items-center gap-2 text-xl font-bold">
              <BookOpen className="h-5 w-5 text-primary" />
              {category.name} guides & articles
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p: any) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="group">
                  <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                    {p.featured_image && (
                      <div className="aspect-[16/9] overflow-hidden bg-muted">
                        <img src={p.featured_image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-primary">{p.title}</h3>
                      {p.excerpt && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Internal linking to sibling categories */}
        {!!siblings?.length && (
          <section className="mb-10" aria-labelledby="other-cats">
            <h2 id="other-cats" className="mb-3 text-lg font-bold">Explore other categories</h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {siblings.filter((c: any) => c.slug !== slug).slice(0, 16).map((c: any) => (
                <CategoryTile key={c.id} name={c.name} slug={c.slug} />
              ))}
            </div>
          </section>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-6 text-center text-primary-foreground md:p-8">
          <h2 className="mb-2 text-xl font-bold md:text-2xl">Own a {lower} business?</h2>
          <p className="mb-4 text-sm opacity-90 md:text-base">Get discovered by thousands of Lagos customers — list your business in minutes.</p>
          <Button asChild size="lg" variant="secondary" className="shadow-lg">
            <Link to="/businesses/list"><Plus className="mr-1.5 h-4 w-4" />List Your Business Here</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
