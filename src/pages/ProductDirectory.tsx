import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LayoutGrid, List, Plus, Store, Sparkles, Package, Download, UtensilsCrossed, Check } from "lucide-react";
import ProductCard from "@/components/directory/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { absUrl, ogImageUrl, SITE_NAME } from "@/lib/seo";
import {
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ALL_PRODUCT_CATEGORIES,
  ProductType,
} from "@/lib/productAIEngine";

export default function ProductDirectory() {
  const [q, setQ] = useState("");
  const [productType, setProductType] = useState<"all" | ProductType>("all");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

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

  const list = useMemo(() => {
    let rows = (products || []) as any[];

    // Filter by product type if specified
    if (productType !== "all") {
      const digitalSlugs = new Set(DIGITAL_PRODUCT_CATEGORIES.map((c) => c.slug));
      if (productType === "digital") {
        rows = rows.filter((p) => {
          const cSlug = p.categories?.slug || "";
          const pName = (p.name || "").toLowerCase();
          const pDesc = (p.description || "").toLowerCase();
          return (
            digitalSlugs.has(cSlug) ||
            p.condition === "digital" ||
            pDesc.includes("digital download") ||
            pDesc.includes("ebook") ||
            pDesc.includes("course") ||
            pDesc.includes("template") ||
            pName.includes("ebook") ||
            pName.includes("guide") ||
            pName.includes("course") ||
            pName.includes("software")
          );
        });
      } else if (productType === "physical") {
        rows = rows.filter((p) => {
          const cSlug = p.categories?.slug || "";
          const pName = (p.name || "").toLowerCase();
          const pDesc = (p.description || "").toLowerCase();
          const isDigital =
            digitalSlugs.has(cSlug) ||
            p.condition === "digital" ||
            pDesc.includes("digital download") ||
            pName.includes("ebook") ||
            pName.includes("course");
          return !isDigital;
        });
      }
    }

    // Filter by category
    if (cat !== "all") {
      rows = rows.filter((p) => {
        const cSlug = p.categories?.slug || "";
        const pName = (p.name || "").toLowerCase();
        const pDesc = (p.description || "").toLowerCase();

        if (cSlug === cat) return true;
        if (cat === "food-groceries" && (cSlug.includes("food") || pName.includes("food") || pName.includes("spice") || pName.includes("grocery") || pDesc.includes("food"))) return true;
        if (cat === "fashion-apparel" && (cSlug.includes("fashion") || pName.includes("wear") || pName.includes("cloth") || pName.includes("shoe"))) return true;
        if (cat === "phones-tablets" && (cSlug.includes("phone") || pName.includes("iphone") || pName.includes("samsung") || pName.includes("phone"))) return true;
        if (cat === "ebooks-guides" && (pName.includes("ebook") || pName.includes("guide") || pName.includes("pdf") || pDesc.includes("ebook"))) return true;
        if (cat === "courses-masterclasses" && (pName.includes("course") || pName.includes("class") || pName.includes("training"))) return true;
        if (cat === "software-apps-scripts" && (pName.includes("software") || pName.includes("bot") || pName.includes("app") || pName.includes("script"))) return true;
        if (cat === "templates-spreadsheets" && (pName.includes("template") || pName.includes("sheet") || pName.includes("notion") || pName.includes("canva"))) return true;
        return false;
      });
    }

    // Search query filter
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) => `${p.name} ${p.description || ""} ${p.location || ""}`.toLowerCase().includes(needle));
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

      <section className="relative mt-2 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-accent/10 to-background p-6 shadow-md sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-2xl animate-fade-in space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-primary shadow-xs">
            <Sparkles className="h-4 w-4" /> Lagos Verified Marketplace
          </span>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl text-foreground">
            Buy physical goods, food &amp; <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">digital products</span>
          </h1>
          <p className="text-base sm:text-lg font-medium text-foreground/85 leading-relaxed">
            Verified Lagos suppliers, food sellers, wholesalers, and creator digital downloads. Direct WhatsApp contact with zero middleman commissions.
          </p>

          <div className="relative mt-4 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search food, phones, fashion, digital courses, templates…"
              className="h-12 rounded-full border-0 bg-background/95 pl-12 text-sm font-medium shadow-md backdrop-blur text-foreground placeholder:text-muted-foreground"
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
      </section>

      {/* Product Type Filter Tabs (Physical vs Digital) */}
      <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Filter by Product Type
            </h2>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Select whether you want to browse physical merchandise &amp; food, or instant digital downloads.
            </p>
          </div>

          {/* Product Type Buttons */}
          <div className="inline-flex rounded-2xl bg-muted/60 p-1 border border-border/80 shrink-0">
            <button
              onClick={() => {
                setProductType("all");
                setCat("all");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-black transition-all ${
                productType === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:text-primary hover:bg-background/80"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> All Types
            </button>
            <button
              onClick={() => {
                setProductType("physical");
                setCat("all");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-black transition-all ${
                productType === "physical"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:text-primary hover:bg-background/80"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" /> Physical &amp; Food
            </button>
            <button
              onClick={() => {
                setProductType("digital");
                setCat("all");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-black transition-all ${
                productType === "digital"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:text-primary hover:bg-background/80"
              }`}
            >
              <Download className="h-3.5 w-3.5" /> Digital Products
            </button>
          </div>
        </div>

        {/* Dynamic Category Badges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              {productType === "digital"
                ? "Digital Product Categories"
                : productType === "physical"
                ? "Physical Goods & Food Categories"
                : "All Market Categories"}
            </span>
            {cat !== "all" && (
              <button
                onClick={() => setCat("all")}
                className="text-xs font-bold text-primary hover:underline"
              >
                Clear Category Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setCat("all")}
              className={`rounded-xl border px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                cat === "all"
                  ? "border-primary bg-primary text-primary-foreground font-black"
                  : "border-border/90 bg-background text-foreground hover:border-primary/60 hover:text-primary"
              }`}
            >
              All Categories
            </button>

            {activeCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.slug)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                  cat === c.slug
                    ? "border-primary bg-primary text-primary-foreground font-black"
                    : "border-border/90 bg-background text-foreground hover:border-primary/60 hover:text-primary"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showcase && !isLoading && (
        <>
          <Section heading="Featured Products" blurb="Verified listings from top boosted sellers." items={featured} />
          <Section heading="Trending Now" blurb="What shoppers are viewing this week." items={trending} />
          <Section heading="New Arrivals" blurb="Freshly listed items on the Lagos marketplace." items={newArrivals} />
        </>
      )}

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

