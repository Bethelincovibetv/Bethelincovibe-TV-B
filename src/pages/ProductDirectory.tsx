import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LayoutGrid, List, Plus, Store, Sparkles, Package, Download, UtensilsCrossed, Check, ShieldCheck } from "lucide-react";
import ProductCard from "@/components/directory/ProductCard";
import ProductCategoryFilter3D from "@/components/directory/ProductCategoryFilter3D";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";
import { absUrl, ogImageUrl, SITE_NAME } from "@/lib/seo";
import {
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ALL_PRODUCT_CATEGORIES,
  ProductType,
  getProductCategoryInfo,
} from "@/lib/productAIEngine";
import marketplaceHero3D from "@/assets/images/marketplace_hero_3d_1787915121385.jpg";

export default function ProductDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlType = searchParams.get("type") as "all" | ProductType | null;
  const urlCat = searchParams.get("cat") || "all";

  const [q, setQ] = useState(urlQuery);
  const [productType, setProductType] = useState<"all" | ProductType>(
    urlType === "physical" || urlType === "digital" ? urlType : "all"
  );
  const [cat, setCat] = useState(urlCat);
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Keep state synchronized if URL search parameters change
  useEffect(() => {
    if (urlQuery && urlQuery !== q) setQ(urlQuery);
    if (urlType && (urlType === "physical" || urlType === "digital" || urlType === "all")) {
      setProductType(urlType);
    }
    if (urlCat && urlCat !== cat) setCat(urlCat);
  }, [urlQuery, urlType, urlCat]);

  const { data: dbCategories } = useQuery({
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

  // Current active category list based on productType selection
  const activeCategories = useMemo(() => {
    if (productType === "physical") return PHYSICAL_PRODUCT_CATEGORIES;
    if (productType === "digital") return DIGITAL_PRODUCT_CATEGORIES;
    return ALL_PRODUCT_CATEGORIES;
  }, [productType]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (products || []).forEach((p: any) => {
      const info = getProductCategoryInfo(p);
      counts[info.slug] = (counts[info.slug] || 0) + 1;
    });
    return counts;
  }, [products]);

  const list = useMemo(() => {
    let rows = (products || []) as any[];

    // Filter by product type if specified
    if (productType !== "all") {
      rows = rows.filter((p) => {
        const info = getProductCategoryInfo(p);
        return info.type === productType;
      });
    }

    // Filter by category
    if (cat !== "all") {
      rows = rows.filter((p) => {
        const info = getProductCategoryInfo(p);
        return info.slug === cat;
      });
    }

    // Search query filter
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) => {
        const info = getProductCategoryInfo(p);
        return `${p.name} ${p.description || ""} ${p.location || ""} ${info.name}`.toLowerCase().includes(needle);
      });
    }

    if (sort === "price_asc") rows = [...rows].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "price_desc") rows = [...rows].sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === "popular") rows = [...rows].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    return rows;
  }, [products, productType, cat, q, sort]);

  const all = (products || []) as any[];
  const showcase = !q.trim() && cat === "all" && productType === "all";
  const featured = all.filter((p) => p.featured).slice(0, 4);
  const trending = [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).filter((p) => (p.views_count || 0) > 0).slice(0, 4);
  const newArrivals = all.slice(0, 4);

  const title = `Products for Sale in Lagos — Marketplace | ${SITE_NAME}`;
  const desc = "Browse physical food, goods and instant digital products from verified Lagos sellers. Compare prices, check condition and contact sellers directly on WhatsApp.";

  const Section = ({ heading, blurb, items }: { heading: string; blurb: string; items: any[] }) =>
    items.length === 0 ? null : (
      <section className="mb-9">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">{heading}</h2>
            <p className="text-sm font-medium text-foreground/80">{blurb}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((p: any) => <ProductCard key={`${heading}-${p.id}`} product={p} />)}
        </div>
      </section>
    );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
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

      {/* 3D Hero Section */}
      <section className="relative mt-2 overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/20 via-background to-accent/15 p-6 shadow-xl sm:p-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="relative max-w-2xl space-y-3 lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-primary shadow-xs">
              <Sparkles className="h-4 w-4" /> Lagos Verified 3D Marketplace
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl text-foreground">
              Buy physical goods, food &amp; <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">digital products</span>
            </h1>
            <p className="text-base sm:text-lg font-medium text-muted-foreground leading-relaxed">
              Verified Lagos suppliers, food sellers, wholesalers, and creator digital downloads. Direct WhatsApp contact with zero middleman commissions.
            </p>

            <div className="relative mt-4 max-w-lg">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search food, phones, fashion, digital courses, templates…"
                className="h-12 rounded-full border-2 border-border/80 bg-background/95 pl-12 text-sm font-medium shadow-md backdrop-blur text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
                aria-label="Search products"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <Button asChild size="default" className="rounded-2xl font-black text-sm px-5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
                <Link to="/products/list">
                  <Plus className="mr-1.5 h-4 w-4" /> Sell a Product (Physical or Digital)
                </Link>
              </Button>
              <Button asChild size="default" variant="outline" className="rounded-2xl font-bold text-sm px-4 border-border/80 bg-background/90 text-foreground hover:bg-muted shadow-xs">
                <Link to="/businesses">
                  <Store className="mr-1.5 h-4 w-4 text-primary" /> Browse Service Directory
                </Link>
              </Button>
            </div>
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 shadow-2xl bg-card">
              <img
                src={marketplaceHero3D}
                alt="Marketplace 3D"
                className="h-64 w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> 100% Verified Sellers &amp; Direct WhatsApp Checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Product Type & Category Filter Component */}
      <ProductCategoryFilter3D
        productType={productType}
        onSelectProductType={(type) => {
          setProductType(type);
          setCat("all");
        }}
        selectedCategory={cat}
        onSelectCategory={(slug) => setCat(slug)}
        categoryCounts={categoryCounts}
        totalCount={list.length}
      />

      {showcase && !isLoading && (
        <>
          <Section heading="Featured Products" blurb="Verified listings from top boosted sellers." items={featured} />
          <Section heading="Trending Now" blurb="What shoppers are viewing this week." items={trending} />
          <Section heading="New Arrivals" blurb="Freshly listed items on the Lagos marketplace." items={newArrivals} />
        </>
      )}

      {/* Programmatic Sponsored Ad Banner */}
      <ProgrammaticAdBanner placement="shop" format="banner" className="my-4" />

      {/* Main Directory List & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              {cat === "all"
                ? productType === "digital"
                  ? "All Digital Products"
                  : productType === "physical"
                  ? "All Physical & Food Products"
                  : "All Marketplace Listings"
                : `${activeCategories.find((c) => c.slug === cat)?.name || "Filtered Products"}`}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Showing {list.length} available items
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl font-bold text-xs bg-background text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {activeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl font-bold text-xs bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most viewed</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/80 bg-background text-foreground hover:text-primary"
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              aria-label="Toggle view"
            >
              {view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/90 py-16 text-center space-y-3 bg-card/50">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-foreground">No listings found in this category</h3>
            <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
              Be the first seller to list a {productType === "digital" ? "digital download or course" : "physical or food product"} in this category!
            </p>
            <Button asChild className="rounded-2xl font-black text-sm px-6 shadow-md">
              <Link to="/products/list">
                <Plus className="mr-1.5 h-4 w-4" /> List Product Now
              </Link>
            </Button>
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
    </div>
  );
}

