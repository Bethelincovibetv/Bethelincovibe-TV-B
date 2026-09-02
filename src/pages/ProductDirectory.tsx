import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LayoutGrid, List, Plus, Store, Sparkles, Package, ShieldCheck, ArrowRight, Download, Flame, Tag } from "lucide-react";
import ProductCard from "@/components/directory/ProductCard";
import ProductCategoryFilter3D from "@/components/directory/ProductCategoryFilter3D";
import FeaturedProductSlider from "@/components/directory/FeaturedProductSlider";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";
import { absUrl, PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";
import SEO from "@/components/SEO";
import { PHYSICAL_PRODUCT_CATEGORIES, DIGITAL_PRODUCT_CATEGORIES, ALL_PRODUCT_CATEGORIES, ProductType, getProductCategoryInfo } from "@/lib/productAIEngine";
import marketplaceHero3D from "@/assets/images/marketplace_hero_3d_1787915121385.jpg";
import BrandedLoader from "@/components/BrandedLoader";

export default function ProductDirectory() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlType = searchParams.get("type") as "all" | ProductType | null;
  const initialCat = categorySlug || searchParams.get("cat") || "all";
  const [q, setQ] = useState(urlQuery);
  const [cat, setCat] = useState(initialCat);
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [productType, setProductType] = useState<"all" | ProductType>(() => {
    if (urlType === "physical" || urlType === "digital") return urlType;
    if (categorySlug && DIGITAL_PRODUCT_CATEGORIES.some(c => c.slug === categorySlug)) return "digital";
    if (categorySlug && PHYSICAL_PRODUCT_CATEGORIES.some(c => c.slug === categorySlug)) return "physical";
    return "all";
  });

  useEffect(() => {
    if (urlQuery !== q) setQ(urlQuery);
    if (urlType === "physical" || urlType === "digital" || urlType === "all") setProductType(urlType);
    const target = categorySlug || searchParams.get("cat") || "all";
    if (target !== cat) setCat(target);
  }, [categorySlug, urlQuery, urlType, searchParams]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["directory-products"],
    queryFn: async () => {
      const { data } = await supabase.from("directory_products").select("*, categories(name, slug)").eq("active", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const all = (products || []) as any[];
  const activeCategories = useMemo(() => productType === "physical" ? PHYSICAL_PRODUCT_CATEGORIES : productType === "digital" ? DIGITAL_PRODUCT_CATEGORIES : ALL_PRODUCT_CATEGORIES, [productType]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    all.forEach(p => { const info = getProductCategoryInfo(p); counts[info.slug] = (counts[info.slug] || 0) + 1; });
    return counts;
  }, [all]);

  const list = useMemo(() => {
    let rows = [...all];
    if (productType !== "all") rows = rows.filter(p => getProductCategoryInfo(p).type === productType);
    if (cat !== "all") rows = rows.filter(p => getProductCategoryInfo(p).slug === cat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter(p => `${p.name} ${p.description || ""} ${p.location || ""} ${getProductCategoryInfo(p).name}`.toLowerCase().includes(needle));
    }
    if (sort === "price_asc") rows.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "price_desc") rows.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === "popular") rows.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    return rows;
  }, [all, productType, cat, q, sort]);

  const featured = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const p of all.filter(p => p.featured)) if (p?.id && !seen.has(p.id)) { seen.add(p.id); result.push(p); }
    if (result.length < 3) for (const p of [...all].sort((a,b) => (b.views_count || 0) - (a.views_count || 0))) {
      if (p?.id && !seen.has(p.id)) { seen.add(p.id); result.push(p); }
      if (result.length >= 6) break;
    }
    return result;
  }, [all]);
  const featuredIds = useMemo(() => new Set(featured.map(p => p.id)), [featured]);
  const trending = useMemo(() => [...all].filter(p => !featuredIds.has(p.id) && (p.views_count || 0) > 0).sort((a,b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 4), [all, featuredIds]);
  const trendingIds = useMemo(() => new Set(trending.map(p => p.id)), [trending]);
  const newArrivals = useMemo(() => [...all].filter(p => !featuredIds.has(p.id) && !trendingIds.has(p.id)).sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 4), [all, featuredIds, trendingIds]);
  const digitalPicks = useMemo(() => all.filter(p => getProductCategoryInfo(p).type === "digital" && !featuredIds.has(p.id)).sort((a,b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 4), [all, featuredIds]);
  const physicalPicks = useMemo(() => all.filter(p => getProductCategoryInfo(p).type === "physical" && !featuredIds.has(p.id)).sort((a,b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 4), [all, featuredIds]);
  const valuePicks = useMemo(() => all.filter(p => Number(p.price) > 0 && !featuredIds.has(p.id)).sort((a,b) => Number(a.price) - Number(b.price)).slice(0, 4), [all, featuredIds]);
  const showcase = !q.trim() && cat === "all" && productType === "all";

  const currentCategoryObj = ALL_PRODUCT_CATEGORIES.find(c => c.slug === cat);
  const currentCategoryName = currentCategoryObj ? currentCategoryObj.name : cat !== "all" ? cat.replace(/-/g, " ") : "";
  const title = currentCategoryName ? `${currentCategoryName} Products in Lagos — Marketplace | ${SITE_NAME}` : productType === "digital" ? `Instant Digital Products & Toolkits in Lagos | ${SITE_NAME}` : productType === "physical" ? `Physical Goods, Supplies & Food in Lagos | ${SITE_NAME}` : q.trim() ? `"${q}" in Lagos Marketplace | ${SITE_NAME}` : `Products for Sale in Lagos — Marketplace | ${SITE_NAME}`;
  const desc = currentCategoryName ? `Browse verified ${currentCategoryName} items for sale in Lagos. Direct seller WhatsApp contact and secure ordering on ${SITE_NAME}.` : productType === "digital" ? `Download verified digital templates, courses, financial models, and eBooks from Nigerian creators.` : "Browse physical food, goods and instant digital products from verified Lagos sellers. Compare prices, check condition and contact sellers directly on WhatsApp.";
  const currentPath = categorySlug ? `/products/category/${categorySlug}` : cat !== "all" ? `/products?cat=${cat}` : productType !== "all" ? `/products?type=${productType}` : "/products";
  const breadcrumbItems = cat !== "all" && currentCategoryName ? [{ label: "Marketplace", href: "/products" }, { label: currentCategoryName }] : [{ label: "Marketplace" }];

  const Section = ({ heading, blurb, items, icon: Icon = Tag }: { heading: string; blurb: string; items: any[]; icon?: any }) => items.length === 0 ? null : (
    <section className="mb-9">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div><div><h2 className="text-xl sm:text-2xl font-black text-foreground">{heading}</h2><p className="text-sm font-medium text-muted-foreground">{blurb}</p></div></div>
        <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(p => <ProductCard key={`${heading}-${p.id}`} product={p} />)}</div>
    </section>
  );

  return <div className="container mx-auto px-4 py-6 space-y-6">
    <SEO title={title} description={desc} url={currentPath} type="website" image={currentCategoryName ? PAGE_OG_IMAGES.productCategory(currentCategoryName) : PAGE_OG_IMAGES.products()} jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: currentCategoryName ? `${currentCategoryName} - Marketplace` : "Marketplace", description: desc, url: absUrl(currentPath) }} />
    <Breadcrumbs items={breadcrumbItems} />
    <section className="relative mt-2 overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/20 via-background to-accent/15 p-6 shadow-xl sm:p-10"><div className="grid gap-8 lg:grid-cols-12 lg:items-center"><div className="relative max-w-2xl space-y-3 lg:col-span-7"><span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-primary"><Sparkles className="h-4 w-4" /> Lagos Verified 3D Marketplace</span><h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl text-foreground">{currentCategoryName ? <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{currentCategoryName}</span> : <>Buy physical goods, food &amp; <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">digital products</span></>}</h1><p className="text-base sm:text-lg font-medium text-muted-foreground leading-relaxed">{currentCategoryObj?.description || "Verified Lagos suppliers, food sellers, wholesalers, and creator digital downloads. Direct WhatsApp contact with zero middleman commissions."}</p><div className="relative mt-4 max-w-lg"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search food, phones, fashion, digital courses, templates…" className="h-12 rounded-full border-2 border-border/80 bg-background/95 pl-12 text-sm font-medium shadow-md" aria-label="Search products" /></div><div className="pt-2 flex flex-wrap gap-2.5"><Button asChild className="rounded-2xl font-black text-sm px-5"><Link to="/products/list"><Plus className="mr-1.5 h-4 w-4" /> Sell a Product</Link></Button><Button asChild variant="outline" className="rounded-2xl font-bold text-sm px-4"><Link to="/businesses"><Store className="mr-1.5 h-4 w-4 text-primary" /> Browse Service Directory</Link></Button></div></div><div className="hidden lg:col-span-5 lg:block"><div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 shadow-2xl bg-card"><img src={currentCategoryObj?.image3D || marketplaceHero3D} alt={currentCategoryName || "Marketplace 3D"} className="h-64 w-full object-cover" referrerPolicy="no-referrer" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4"><p className="text-xs font-black text-white flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Verified Sellers &amp; Direct WhatsApp Checkout</p></div></div></div></div></section>
    <ProductCategoryFilter3D productType={productType} onSelectProductType={type => { setProductType(type); setCat("all"); }} selectedCategory={cat} onSelectCategory={setCat} categoryCounts={categoryCounts} totalCount={list.length} />
    {!isLoading && featured.length > 0 && <FeaturedProductSlider products={featured} title={cat !== "all" && currentCategoryName ? `Featured in ${currentCategoryName}` : productType === "digital" ? "Featured Digital Toolkits & Creators" : productType === "physical" ? "Featured Physical Goods & Food" : "Featured Marketplace Spotlight"} subtitle="Handpicked verified goods, top-rated products & exclusive digital toolkits" className="my-2" />}
    {showcase && !isLoading && <><Section heading="Trending Now" blurb="What shoppers are viewing most right now." items={trending} icon={Flame} /><Section heading="New Arrivals" blurb="Freshly listed items — be among the first to discover them." items={newArrivals} icon={Sparkles} /><Section heading="Best Value Picks" blurb="Affordable products selected from active marketplace listings." items={valuePicks} icon={Tag} /><Section heading="Digital Products & Downloads" blurb="Templates, courses, guides and other instant digital products." items={digitalPicks} icon={Download} /><Section heading="Physical Goods & Food" blurb="Shop tangible products and food from marketplace sellers." items={physicalPicks} icon={Package} /></>}
    <ProgrammaticAdBanner placement="shop" format="banner" className="my-4" />
    <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-xl sm:text-2xl font-black text-foreground">{cat === "all" ? productType === "digital" ? "All Digital Products" : productType === "physical" ? "All Physical & Food Products" : "All Marketplace Listings" : activeCategories.find(c => c.slug === cat)?.name || currentCategoryName || "Filtered Products"}</h2><p className="text-xs sm:text-sm font-medium text-muted-foreground">Showing {list.length} available items</p></div><div className="flex items-center gap-2"><Select value={cat} onValueChange={setCat}><SelectTrigger className="w-[180px] h-10 rounded-xl font-bold text-xs bg-background"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{activeCategories.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}</SelectContent></Select><Select value={sort} onValueChange={setSort}><SelectTrigger className="w-[160px] h-10 rounded-xl font-bold text-xs bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="popular">Most viewed</SelectItem><SelectItem value="price_asc">Price: low to high</SelectItem><SelectItem value="price_desc">Price: high to low</SelectItem></SelectContent></Select><Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setView(view === "grid" ? "list" : "grid")} aria-label="Toggle view">{view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button></div></div>{isLoading ? <div className="py-12"><BrandedLoader message="Loading marketplace products..." submessage="Fetching verified items & wholesale deals" /></div> : list.length === 0 ? <div className="rounded-3xl border border-dashed py-16 text-center space-y-3 bg-card/50"><div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Package className="h-6 w-6" /></div><h3 className="text-lg font-black">No listings found in this category</h3><p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">Be the first seller to list a product in this category.</p><Button asChild className="rounded-2xl font-black text-sm px-6"><Link to="/products/list"><Plus className="mr-1.5 h-4 w-4" /> List Product Now</Link></Button></div> : view === "grid" ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{list.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="flex flex-col gap-3">{list.map(p => <ProductCard key={p.id} product={p} view="list" />)}</div>}</div>
  </div>;
}
