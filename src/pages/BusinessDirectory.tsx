import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Building2, LayoutGrid, Rows3, SlidersHorizontal, X } from "lucide-react";
import BusinessCard from "@/components/directory/BusinessCard";
import CategoryTile from "@/components/directory/CategoryTile";
import Breadcrumbs from "@/components/Breadcrumbs";
import AdsterraAd from "@/components/AdsterraAd";
import { absUrl, ogImageUrl, SITE_NAME } from "@/lib/seo";

type Sort = "recommended" | "newest" | "az" | "za";

export default function BusinessDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("recommended");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: categories } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "business").order("name");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["businesses", categorySlug, search],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      let query = supabase.from("suppliers").select("*, categories(name, slug)").eq("active", true).eq("status", "approved");
      let catId: string | null = null;
      if (categorySlug) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
        if (cat) { catId = cat.id; query = query.eq("category_id", cat.id); }
      }
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`);
      const { data: own } = await query
        .order("boosted_until", { ascending: false, nullsFirst: false })
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (catId && !search) {
        const { data: boosted } = await supabase
          .from("suppliers")
          .select("*, categories(name, slug)")
          .eq("active", true)
          .eq("status", "approved")
          .neq("category_id", catId)
          .or(`boosted_until.gt.${nowIso},featured.eq.true`)
          .order("boosted_until", { ascending: false, nullsFirst: false })
          .limit(6);
        const ownIds = new Set((own ?? []).map((b: any) => b.id));
        return [...(boosted ?? []).filter((b: any) => !ownIds.has(b.id)), ...(own ?? [])];
      }
      return own ?? [];
    },
  });

  const businessIds = useMemo(() => (businesses ?? []).map((s: any) => s.id), [businesses]);
  const { data: allImages } = useQuery({
    queryKey: ["business-all-images", businessIds],
    queryFn: async () => {
      if (!businessIds.length) return {};
      const { data } = await supabase.from("supplier_images").select("*").in("supplier_id", businessIds).order("display_order");
      const map: Record<string, any[]> = {};
      data?.forEach((img: any) => {
        (map[img.supplier_id] ||= []).push(img);
      });
      return map;
    },
    enabled: businessIds.length > 0,
    staleTime: 120_000,
  });

  const sorted = useMemo(() => {
    const list = [...(businesses ?? [])];
    if (sort === "newest") list.sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "az") list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    if (sort === "za") list.sort((a: any, b: any) => b.name.localeCompare(a.name));
    return list;
  }, [businesses, sort]);

  const activeCategory = categories?.find((c: any) => c.slug === categorySlug);
  const title = activeCategory
    ? `${activeCategory.name} Businesses in Lagos | ${SITE_NAME}`
    : `Lagos Business Directory — Find Trusted Local Businesses | ${SITE_NAME}`;
  const description = activeCategory
    ? `Browse verified ${activeCategory.name.toLowerCase()} businesses in Lagos. Compare listings, view photos and contact owners directly.`
    : "Discover trusted Lagos businesses across fashion, food, tech, logistics, beauty and more. Compare verified listings, view galleries and contact owners directly.";
  const canonical = absUrl(categorySlug ? `/businesses?category=${categorySlug}` : "/businesses");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absUrl("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sorted.length,
      itemListElement: sorted.slice(0, 20).map((s: any, i: number) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absUrl(`/businesses/${s.slug}`),
        name: s.name,
      })),
    },
  };

  const clearFilters = () => { setSearch(""); setSearchParams({}); };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImageUrl({ title: activeCategory?.name ?? "Lagos Business Directory", subtitle: description, badge: "Directory" })} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <Breadcrumbs
          className="mb-3"
          items={activeCategory
            ? [{ label: "Businesses", href: "/businesses" }, { label: activeCategory.name }]
            : [{ label: "Businesses" }]}
        />

        {/* Hero */}
        <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-5 text-primary-foreground shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.9)] md:p-10">
          <div className="relative z-10 max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              <Building2 className="h-3.5 w-3.5" />Lagos Business Marketplace
            </span>
            <h1 className="mb-2 text-2xl font-extrabold leading-tight md:text-4xl">
              {activeCategory ? `${activeCategory.name} businesses in Lagos` : "Find trusted local businesses"}
            </h1>
            <p className="mb-5 text-sm opacity-90 md:text-base">
              Verified listings, real photos and direct contact — or list your own business and reach thousands of customers.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" variant="secondary" className="shadow-lg">
                <Link to="/businesses/list"><Plus className="mr-1.5 h-4 w-4" />List Your Service</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20">
                <Link to="/products">Shop products →</Link>
              </Button>
            </div>
          </div>
          <Building2 className="absolute -bottom-6 -right-6 h-44 w-44 opacity-10" aria-hidden="true" />
        </section>

        <AdsterraAd slot="directory" />

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-30 -mx-4 mb-5 border-b bg-background/85 px-4 py-3 backdrop-blur-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses, services or areas…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search businesses"
              className="h-11 rounded-xl pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-2.5 rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="h-9 w-[150px] rounded-full text-xs" aria-label="Sort listings">
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="az">Name A–Z</SelectItem>
                <SelectItem value="za">Name Z–A</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-1 rounded-full border p-0.5">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                className={`rounded-full p-1.5 transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                aria-pressed={view === "list"}
                className={`rounded-full p-1.5 transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Rows3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
            <Badge
              variant={!categorySlug ? "default" : "secondary"}
              className="shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs"
              onClick={() => setSearchParams({})}
            >
              All
            </Badge>
            {categories?.map((cat: any) => (
              <Badge
                key={cat.id}
                variant={categorySlug === cat.slug ? "default" : "secondary"}
                className="shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs"
                onClick={() => setSearchParams({ category: cat.slug })}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Category tiles */}
        {!categorySlug && !search && !!categories?.length && (
          <section className="mb-8" aria-labelledby="browse-cat">
            <h2 id="browse-cat" className="mb-3 text-lg font-bold md:text-xl">Browse by category</h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {categories.map((cat: any) => (
                <CategoryTile key={cat.id} name={cat.name} slug={cat.slug} />
              ))}
            </div>
          </section>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold md:text-xl">
            {activeCategory ? activeCategory.name : search ? `Results for “${search}”` : "All businesses"}
          </h2>
          {!isLoading && (
            <span className="text-xs text-muted-foreground">{sorted.length} listing{sorted.length === 1 ? "" : "s"}</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-2 p-3.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length > 0 ? (
          <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {sorted.map((s: any) => (
              <BusinessCard key={s.id} business={s} images={allImages?.[s.id] ?? []} view={view} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="text-lg font-medium text-foreground">No businesses found</p>
            <p className="mt-1 text-sm">Try a different search, or be the first to list here.</p>
            <div className="mt-4 flex justify-center gap-2">
              {(search || categorySlug) && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
              <Button asChild><Link to="/businesses/list">List Your Business</Link></Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
