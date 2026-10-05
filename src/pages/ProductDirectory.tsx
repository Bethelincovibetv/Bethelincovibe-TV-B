import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Store,
  Sparkles,
  Package,
  ShieldCheck,
  ArrowRight,
  Download,
  Flame,
  Tag,
  TrendingUp,
  Clock,
  Radio,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import ProductCard, { DirectoryProduct } from "@/components/directory/ProductCard";
import ProductCategoryFilter3D from "@/components/directory/ProductCategoryFilter3D";
import FeaturedProductSlider from "@/components/directory/FeaturedProductSlider";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";
import GgdAdWidget from "@/components/ads/GgdAdWidget";
import { absUrl, PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";
import SEO from "@/components/SEO";
import {
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ALL_PRODUCT_CATEGORIES,
  ProductType,
  getProductCategoryInfo,
} from "@/lib/productAIEngine";
import BrandedLoader from "@/components/BrandedLoader";
import { formatDistanceToNow } from "date-fns";
import NearMeLocationFilter from "@/components/location/NearMeLocationFilter";
import { useUserLocation } from "@/lib/userGeolocationService";

export default function ProductDirectory() {
  const queryClient = useQueryClient();
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlType = searchParams.get("type") as "all" | ProductType | null;
  const initialCat = categorySlug || searchParams.get("cat") || "all";
  const [q, setQ] = useState(urlQuery);
  const [cat, setCat] = useState(initialCat);
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"all" | "trending" | "new_arrivals">("all");
  const [productType, setProductType] = useState<"all" | ProductType>(() => {
    if (urlType === "physical" || urlType === "digital") return urlType;
    if (categorySlug && DIGITAL_PRODUCT_CATEGORIES.some((c) => c.slug === categorySlug)) return "digital";
    if (categorySlug && PHYSICAL_PRODUCT_CATEGORIES.some((c) => c.slug === categorySlug)) return "physical";
    return "all";
  });

  const {
    userLocation,
    detecting,
    radiusKm,
    setRadiusKm,
    onlyNearby,
    setOnlyNearby,
    requestLocation,
    setManualLocation,
    clearLocation,
    getDistanceTo,
  } = useUserLocation();

  useEffect(() => {
    if (urlQuery !== q) setQ(urlQuery);
    if (urlType === "physical" || urlType === "digital" || urlType === "all") setProductType(urlType);
    const target = categorySlug || searchParams.get("cat") || "all";
    if (target !== cat) setCat(target);
  }, [categorySlug, urlQuery, urlType, searchParams]);

  // Real-time Supabase subscription for product changes & view count updates
  useEffect(() => {
    const channel = supabase
      .channel("realtime-marketplace-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "directory_products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["directory-products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const all = (products || []) as any[];
  const activeCategories = useMemo(
    () =>
      productType === "physical"
        ? PHYSICAL_PRODUCT_CATEGORIES
        : productType === "digital"
        ? DIGITAL_PRODUCT_CATEGORIES
        : ALL_PRODUCT_CATEGORIES,
    [productType]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    all.forEach((p) => {
      const info = getProductCategoryInfo(p);
      counts[info.slug] = (counts[info.slug] || 0) + 1;
    });
    return counts;
  }, [all]);

  // Featured spotlight items
  const featured = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const p of all.filter((p) => p.featured)) {
      if (p?.id && !seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
    if (result.length < 3) {
      for (const p of [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))) {
        if (p?.id && !seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
        if (result.length >= 6) break;
      }
    }
    return result;
  }, [all]);

  const featuredIds = useMemo(() => new Set(featured.map((p) => p.id)), [featured]);

  // Real-Time Trending Ranking based on views count + popularity score
  const trendingRanked = useMemo(() => {
    const sorted = [...all]
      .filter((p) => (p.views_count || 0) >= 0)
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

    return sorted.slice(0, 10).map((p, idx) => {
      const rank = idx + 1;
      let label = "Trending";
      if (rank === 1) label = "Top 1 Hot";
      else if (rank === 2) label = "Top 2 Pick";
      else if (rank === 3) label = "High Velocity";
      else if (rank <= 5) label = "Rising";
      return {
        product: p,
        rank,
        label,
      };
    });
  }, [all]);

  // Real-Time New Arrivals sorted by newest creation date
  const newArrivalsList = useMemo(() => {
    const sorted = [...all].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    return sorted.slice(0, 10).map((p) => {
      let timeAgo = "Recently";
      try {
        if (p.created_at) {
          timeAgo = formatDistanceToNow(new Date(p.created_at), { addSuffix: true });
        }
      } catch {}
      return {
        product: p,
        timeAgo,
      };
    });
  }, [all]);

  const digitalPicks = useMemo(
    () =>
      all
        .filter((p) => getProductCategoryInfo(p).type === "digital" && !featuredIds.has(p.id))
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 6),
    [all, featuredIds]
  );

  const physicalPicks = useMemo(
    () =>
      all
        .filter((p) => getProductCategoryInfo(p).type === "physical" && !featuredIds.has(p.id))
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 6),
    [all, featuredIds]
  );

  const valuePicks = useMemo(
    () =>
      all
        .filter((p) => Number(p.price) > 0 && !featuredIds.has(p.id))
        .sort((a, b) => Number(a.price) - Number(b.price))
        .slice(0, 6),
    [all, featuredIds]
  );

  const withDistance = useMemo(() => {
    return all.map((p) => ({
      ...p,
      distanceKm: getDistanceTo(p),
    }));
  }, [all, getDistanceTo]);

  // Main filtered listing
  const list = useMemo(() => {
    let rows = [...withDistance];
    if (activeTab === "trending") {
      rows = trendingRanked.map((t) => withDistance.find((item) => item.id === t.product.id) || t.product);
    } else if (activeTab === "new_arrivals") {
      rows = newArrivalsList.map((n) => withDistance.find((item) => item.id === n.product.id) || n.product);
    }

    if (productType !== "all") rows = rows.filter((p) => getProductCategoryInfo(p).type === productType);
    if (cat !== "all") rows = rows.filter((p) => getProductCategoryInfo(p).slug === cat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) =>
        `${p.name} ${p.description || ""} ${p.location || ""} ${getProductCategoryInfo(p).name}`
          .toLowerCase()
          .includes(needle)
      );
    }

    // Google Geolocation / GPS proximity filter
    if (onlyNearby && userLocation) {
      if (radiusKm !== null) {
        rows = rows.filter((p) => typeof p.distanceKm === "number" && p.distanceKm <= radiusKm);
      }
      rows.sort((a, b) => {
        const distA = typeof a.distanceKm === "number" ? a.distanceKm : 99999;
        const distB = typeof b.distanceKm === "number" ? b.distanceKm : 99999;
        return distA - distB;
      });
    } else if (sort === "nearest" && userLocation) {
      rows.sort((a, b) => {
        const distA = typeof a.distanceKm === "number" ? a.distanceKm : 99999;
        const distB = typeof b.distanceKm === "number" ? b.distanceKm : 99999;
        return distA - distB;
      });
    } else if (sort === "price_asc") {
      rows.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === "price_desc") {
      rows.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === "popular") {
      rows.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    } else if (sort === "newest" && activeTab === "all") {
      rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return rows;
  }, [withDistance, activeTab, trendingRanked, newArrivalsList, productType, cat, q, sort, onlyNearby, userLocation, radiusKm]);

  const showcase = !q.trim() && cat === "all" && productType === "all" && activeTab === "all";

  const currentCategoryObj = ALL_PRODUCT_CATEGORIES.find((c) => c.slug === cat);
  const currentCategoryName = currentCategoryObj ? currentCategoryObj.name : cat !== "all" ? cat.replace(/-/g, " ") : "";
  const title = currentCategoryName
    ? `${currentCategoryName} in Lagos — Marketplace | ${SITE_NAME}`
    : productType === "digital"
    ? `Digital Downloads & Toolkits in Lagos | ${SITE_NAME}`
    : productType === "physical"
    ? `Goods, Electronics & Food in Lagos | ${SITE_NAME}`
    : q.trim()
    ? `"${q}" in Marketplace | ${SITE_NAME}`
    : `Marketplace & Shop — Buy & Sell in Lagos | ${SITE_NAME}`;
  const desc = currentCategoryName
    ? `Browse verified ${currentCategoryName} items for sale in Lagos. Direct seller WhatsApp contact and secure ordering on ${SITE_NAME}.`
    : "Browse physical food, electronics and instant digital products from verified Lagos sellers. Zero middleman fees, direct seller contact.";
  const currentPath = categorySlug
    ? `/products/category/${categorySlug}`
    : cat !== "all"
    ? `/products?cat=${cat}`
    : productType !== "all"
    ? `/products?type=${productType}`
    : "/products";
  const breadcrumbItems =
    cat !== "all" && currentCategoryName
      ? [{ label: "Marketplace", href: "/products" }, { label: currentCategoryName }]
      : [{ label: "Marketplace" }];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 space-y-3 font-sans">
      <SEO
        title={title}
        description={desc}
        url={currentPath}
        type="website"
        image={currentCategoryName ? PAGE_OG_IMAGES.productCategory(currentCategoryName) : PAGE_OG_IMAGES.products()}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: currentCategoryName ? `${currentCategoryName} - Marketplace` : "Marketplace",
          description: desc,
          url: absUrl(currentPath),
        }}
      />

      <div className="flex items-center justify-between gap-2 px-1">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{all.length} Verified Ads Live</span>
        </div>
      </div>

      {/* Jiji-Style Sleek Header Banner: Tight padding, free & attractive */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-3 sm:p-4 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                <Sparkles className="h-3 w-3" /> Lagos Marketplace
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" /> Free to Buy &amp; Sell
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
              {currentCategoryName ? (
                <span>{currentCategoryName} in Lagos</span>
              ) : (
                <span>Nigeria&apos;s Free Marketplace &amp; Shop</span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 line-clamp-1">
              Find phones, fashion, food, wholesale supplies and instant digital files with direct WhatsApp contact.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <Button asChild className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl px-4 py-2 shadow-md border-0 active:scale-95 transition-transform">
              <Link to="/products/list">
                <Plus className="mr-1 h-4 w-4" /> Post Free Ad
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs sm:text-sm rounded-xl px-3 py-2">
              <Link to="/businesses">
                <Store className="mr-1 h-4 w-4 text-amber-300" /> Directory
              </Link>
            </Button>
          </div>
        </div>

        {/* Compact Search Bar & Near Me Google Geolocation in Banner */}
        <div className="relative mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What are you looking for? (e.g. iPhone, Rice, Canva Templates, Solar...)"
              className="h-10 sm:h-11 rounded-xl border border-white/30 bg-background text-foreground pl-9 pr-3 text-xs sm:text-sm font-medium shadow-sm placeholder:text-muted-foreground"
              aria-label="Search marketplace"
            />
          </div>
          <div className="shrink-0">
            <NearMeLocationFilter
              userLocation={userLocation}
              detecting={detecting}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
              onlyNearby={onlyNearby}
              setOnlyNearby={setOnlyNearby}
              onRequestLocation={requestLocation}
              onClearLocation={clearLocation}
              onSelectManualLocation={setManualLocation}
              filteredCount={list.length}
              totalCount={all.length}
              label="products"
              className="bg-white/15 text-white border-white/30 hover:bg-white/25 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* GGD Direct Ad Display Widget (Banner Strip) */}
      <GgdAdWidget variant="banner" className="my-1" />

      {/* Quick Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-card rounded-xl border border-border/70 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Package className="h-3 w-3" /> All Listings ({all.length})
          </button>
          <button
            onClick={() => setActiveTab("trending")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "trending"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Flame className="h-3 w-3 text-amber-300" /> Trending Hot ({trendingRanked.length})
          </button>
          <button
            onClick={() => setActiveTab("new_arrivals")}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "new_arrivals"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-300" /> New Arrivals ({newArrivalsList.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[145px] h-8 rounded-lg font-bold text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="nearest">Nearest to Me 📍</SelectItem>
              <SelectItem value="popular">Most Viewed</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            aria-label="Toggle view"
          >
            {view === "grid" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Jiji-style Compact Category Filter */}
      <ProductCategoryFilter3D
        productType={productType}
        onSelectProductType={(type) => {
          setProductType(type);
          setCat("all");
        }}
        selectedCategory={cat}
        onSelectCategory={setCat}
        categoryCounts={categoryCounts}
        totalCount={list.length}
      />

      {!isLoading && featured.length > 0 && (
        <FeaturedProductSlider
          products={featured}
          title={
            cat !== "all" && currentCategoryName
              ? `Featured in ${currentCategoryName}`
              : productType === "digital"
              ? "Featured Digital Toolkits"
              : productType === "physical"
              ? "Featured Physical Deals"
              : "TOP Featured Marketplace Ads"
          }
          subtitle="Top verified sellers & high-engagement listings across Lagos"
          className="my-1"
        />
      )}

      {/* Compact Showcase Sections (Jiji Style: Tight padding, high density) */}
      {showcase && !isLoading && (
        <>
          {/* 🔥 Trending Rankings (Jiji Style) */}
          {trendingRanked.length > 0 && (
            <section className="p-2.5 sm:p-3 rounded-2xl border border-rose-500/25 bg-card shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-1.5">
                      Trending Ranked Ads
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-600">
                        Top {trendingRanked.length}
                      </span>
                    </h2>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("trending")}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 h-7 px-2"
                >
                  View All <ArrowRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                {trendingRanked.slice(0, 6).map(({ product, rank, label }) => (
                  <ProductCard
                    key={`trending-${product.id}`}
                    product={product}
                    rankBadge={{ rank, label }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ✨ New Arrivals Section */}
          {newArrivalsList.length > 0 && (
            <section className="p-2.5 sm:p-3 rounded-2xl border border-cyan-500/25 bg-card shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white shadow-2xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-1.5">
                      New Arrivals Today
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-600">
                        Fresh Listings
                      </span>
                    </h2>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("new_arrivals")}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 h-7 px-2"
                >
                  View All <ArrowRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                {newArrivalsList.slice(0, 6).map(({ product, timeAgo }) => (
                  <ProductCard
                    key={`new-${product.id}`}
                    product={product}
                    isNewArrival={true}
                    timeAgo={timeAgo}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Programmatic Ad Banner Slot */}
      <ProgrammaticAdBanner placement="shop" format="banner" className="my-1.5" />

      {/* Main Marketplace Grid: Jiji Density, Tight Padding, Free & Attractive */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-black text-foreground">
              {activeTab === "trending"
                ? "🔥 Trending Marketplace Ads"
                : activeTab === "new_arrivals"
                ? "✨ New Arrival Products"
                : cat === "all"
                ? productType === "digital"
                  ? "All Digital Products"
                  : productType === "physical"
                  ? "All Physical & Food Goods"
                  : "All Marketplace Listings"
                : activeCategories.find((c) => c.slug === cat)?.name || currentCategoryName || "Filtered Products"}
            </h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              {list.length} available items • Direct WhatsApp &amp; Inquiries
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8">
            <BrandedLoader
              message="Loading marketplace products..."
              submessage="Fetching real-time rankings & verified items"
            />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center space-y-2.5 bg-card/60 p-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="text-base font-extrabold">No listings match your search</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first seller to post a free classified ad in this category.
            </p>
            <Button asChild className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 px-4 py-2">
              <Link to="/products/list">
                <Plus className="mr-1 h-3.5 w-3.5" /> Post Ad Now
              </Link>
            </Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
            {list.map((p, idx) => {
              const showGgdSponsorCard = idx === 5;
              return (
                <div key={p.id} className="contents">
                  <ProductCard
                    product={p}
                    distanceKm={p.distanceKm}
                    rankBadge={
                      activeTab === "trending"
                        ? { rank: idx + 1, label: idx === 0 ? "Top 1 Hot" : "Trending" }
                        : undefined
                    }
                    isNewArrival={activeTab === "new_arrivals"}
                  />
                  {showGgdSponsorCard && (
                    <GgdAdWidget variant="jiji-card" className="h-full" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                view="list"
                distanceKm={p.distanceKm}
                rankBadge={
                  activeTab === "trending"
                    ? { rank: idx + 1, label: idx === 0 ? "Top 1 Hot" : "Trending" }
                    : undefined
                }
                isNewArrival={activeTab === "new_arrivals"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
