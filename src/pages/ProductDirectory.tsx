import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LayoutGrid, List, Plus, Store, Sparkles } from "lucide-react";
import ProductCard from "@/components/directory/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { absUrl, ogImageUrl, SITE_NAME } from "@/lib/seo";

export default function ProductDirectory() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: categories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").in("type", ["product", "business"]).order("name");
      return data ?? [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["directory-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("directory_products")
        .select("*, categories(name, slug)")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const list = useMemo(() => {
    let rows = (products || []) as any[];
    if (cat !== "all") rows = rows.filter((p) => p.categories?.slug === cat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) => `${p.name} ${p.description || ""} ${p.location || ""}`.toLowerCase().includes(needle));
    }
    if (sort === "price_asc") rows = [...rows].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "price_desc") rows = [...rows].sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === "popular") rows = [...rows].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    return rows;
  }, [products, cat, q, sort]);

  const all = (products || []) as any[];
  const showcase = !q.trim() && cat === "all";
  const featured = all.filter((p) => p.featured).slice(0, 4);
  const trending = [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).filter((p) => (p.views_count || 0) > 0).slice(0, 4);
  const newArrivals = all.slice(0, 4);

  const title = `Products for Sale in Lagos — Marketplace | ${SITE_NAME}`;
  const desc = "Browse products for sale from verified Lagos sellers. Compare prices, check condition and contact sellers directly on WhatsApp.";

  const Section = ({ heading, blurb, items }: { heading: string; blurb: string; items: any[] }) =>
    items.length === 0 ? null : (
      <section className="mb-9">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">{heading}</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">{blurb}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((p: any) => <ProductCard key={`${heading}-${p.id}`} product={p} />)}
        </div>
      </section>
    );

  return (
    <div className="container mx-auto px-4 py-6">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={absUrl("/products")} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absUrl("/products")} />
        <meta property="og:image" content={ogImageUrl({ title: "Marketplace", subtitle: desc, badge: "Products" })} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Marketplace",
          description: desc,
          url: absUrl("/products"),
        })}</script>
      </Helmet>

      <Breadcrumbs items={[{ label: "Products" }]} />

      <section className="relative mt-2 mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-accent/10 to-background p-6 shadow-lg sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-2xl animate-fade-in">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Marketplace
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Buy smarter from trusted <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Lagos sellers</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Thousands of products, verified sellers, and direct WhatsApp contact — no middlemen, no hidden fees.
          </p>
          <div className="relative mt-5 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search phones, fashion, electronics…"
              className="h-12 rounded-full border-0 bg-background/90 pl-11 shadow-md backdrop-blur"
              aria-label="Search products"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(categories || []).slice(0, 6).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className="rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:text-primary"
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/products/list"><Plus className="mr-1 h-4 w-4" />Sell a product</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/businesses"><Store className="mr-1 h-4 w-4" />Browse services</Link></Button>
          </div>
        </div>
      </section>

      {showcase && !isLoading && (
        <>
          <Section heading="Featured products" blurb="Hand-picked listings from boosted sellers." items={featured} />
          <Section heading="Trending now" blurb="What shoppers are viewing this week." items={trending} />
          <Section heading="New arrivals" blurb="Freshly listed on the marketplace." items={newArrivals} />
        </>
      )}

      <h2 className="mb-2 text-lg font-bold sm:text-xl">All products</h2>

      <div className="sticky top-16 z-20 -mx-4 mb-5 border-y bg-background/90 px-4 py-3 backdrop-blur">

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[46%] sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories || []).map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[46%] sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most viewed</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setView(view === "grid" ? "list" : "grid")} aria-label="Toggle view">
              {view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No products found.</p>
          <Button asChild className="mt-4"><Link to="/products/list">List the first product</Link></Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((p: any) => <ProductCard key={p.id} product={p} view="list" />)}
        </div>
      )}
    </div>
  );
}
