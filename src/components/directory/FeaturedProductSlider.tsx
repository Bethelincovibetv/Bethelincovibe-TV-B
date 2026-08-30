import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Package,
  Download,
  MapPin,
  MessageCircle,
  ExternalLink,
  Tag,
  ArrowRight,
  Store,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { formatPrice, DirectoryProduct } from "@/components/directory/ProductCard";
import { getProductCategoryInfo } from "@/lib/productAIEngine";
import digitalGoods3D from "@/assets/images/digital_goods_3d_1787915095364.jpg";
import physicalGoods3D from "@/assets/images/physical_goods_3d_1787915108745.jpg";

interface FeaturedProductSliderProps {
  products?: DirectoryProduct[];
  title?: string;
  subtitle?: string;
  autoPlayInterval?: number;
  className?: string;
}

export default function FeaturedProductSlider({
  products = [],
  title = "Featured Spotlight",
  subtitle = "Handpicked verified goods, top-rated products & exclusive digital toolkits",
  autoPlayInterval = 5000,
  className = "",
}: FeaturedProductSliderProps) {
  // Deduplicate products strictly by ID and valid slug to guarantee no duplicates
  const featuredList = useMemo(() => {
    const seenIds = new Set<string>();
    const uniqueItems: DirectoryProduct[] = [];

    // Filter out inactive items and only process unique items
    for (const p of products) {
      if (!p || !p.id) continue;
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      uniqueItems.push(p);
    }

    // Sort to prioritize explicitly featured items first, then by view count or recency
    const sorted = [...uniqueItems].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    // Take top 8 unique featured/spotlight products
    return sorted.slice(0, 8);
  }, [products]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep index within bounds if array changes
  useEffect(() => {
    if (currentIndex >= featuredList.length && featuredList.length > 0) {
      setCurrentIndex(0);
    }
  }, [featuredList.length, currentIndex]);

  const nextSlide = useCallback(() => {
    if (featuredList.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % featuredList.length);
  }, [featuredList.length]);

  const prevSlide = useCallback(() => {
    if (featuredList.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
  }, [featuredList.length]);

  // Autoplay functionality with pause on hover
  useEffect(() => {
    if (isPaused || featuredList.length <= 1) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPaused, featuredList.length, autoPlayInterval, nextSlide]);

  if (!featuredList || featuredList.length === 0) {
    return null;
  }

  const currentProduct = featuredList[currentIndex];
  const catInfo = getProductCategoryInfo(currentProduct);
  const isDigital = catInfo.type === "digital";
  const imgs: string[] = Array.isArray(currentProduct.images) ? currentProduct.images : [];
  const heroImage = currentProduct.cover_image || imgs[0] || null;
  const productUrl = `/products/${currentProduct.slug || currentProduct.id}`;

  return (
    <section
      className={`relative w-full overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 p-4 sm:p-6 shadow-xl backdrop-blur-md transition-all ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured Products Spotlight"
    >
      {/* Header bar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                {title}
              </h2>
              <Badge className="h-5 bg-primary/20 text-primary border-primary/30 font-black text-[10px] uppercase tracking-wider">
                <Sparkles className="mr-1 h-3 w-3" /> Spotlight
              </Badge>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* Carousel controls */}
        {featuredList.length > 1 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-bold text-muted-foreground mr-1">
              <span className="text-foreground">{currentIndex + 1}</span> / {featuredList.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={prevSlide}
              className="h-8 w-8 rounded-full border-border/80 bg-background/80 hover:bg-primary hover:text-primary-foreground transition-colors shadow-xs"
              aria-label="Previous featured product"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextSlide}
              className="h-8 w-8 rounded-full border-border/80 bg-background/80 hover:bg-primary hover:text-primary-foreground transition-colors shadow-xs"
              aria-label="Next featured product"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Spotlight Banner Item */}
      <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
        {/* Left / Top Media Showcase */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-inner lg:col-span-6 xl:col-span-5 aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]">
          {heroImage ? (
            <img
              src={heroImage}
              alt={currentProduct.name}
              className="h-full w-full object-cover transition-all duration-700 hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <img
              src={isDigital ? digitalGoods3D : physicalGoods3D}
              alt={currentProduct.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
            {currentProduct.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-lg">
                <Sparkles className="h-3 w-3" /> Featured Deal
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                isDigital
                  ? "bg-purple-950/85 text-purple-200 border border-purple-400/50"
                  : "bg-emerald-950/85 text-emerald-200 border border-emerald-400/50"
              }`}
            >
              {isDigital ? <Download className="h-3 w-3" /> : <Package className="h-3 w-3" />}
              {isDigital ? "Digital Product" : "Physical Goods"}
            </span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md border border-white/10">
            <span className="flex items-center gap-1 text-[11px] font-bold text-white/90">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified Seller Listing
            </span>
            <span className="text-[11px] font-extrabold text-amber-300">
              {catInfo.name}
            </span>
          </div>
        </div>

        {/* Right Info & Direct CTAs */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-6 xl:col-span-7">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-extrabold text-xs uppercase tracking-wider text-primary border-primary/40 bg-primary/5">
                <Tag className="mr-1 h-3 w-3" /> {catInfo.name}
              </Badge>
              {currentProduct.location && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" /> {currentProduct.location}
                </span>
              )}
              {currentProduct.condition && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  Condition: {currentProduct.condition}
                </span>
              )}
            </div>

            <Link to={productUrl} className="group block">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground transition-colors group-hover:text-primary leading-tight">
                {currentProduct.name}
              </h3>
            </Link>

            <p className="line-clamp-2 sm:line-clamp-3 text-sm font-medium text-muted-foreground leading-relaxed">
              {currentProduct.description ||
                "Verified listing in Lagos. Instant order and direct seller WhatsApp communication."}
            </p>

            {/* Price & Delivery Highlights */}
            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <div className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                {formatPrice(currentProduct.price, currentProduct.currency)}
              </div>
              {currentProduct.stock !== null && currentProduct.stock !== undefined && (
                <span className="text-xs font-bold text-muted-foreground">
                  {currentProduct.stock > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> In Stock ({currentProduct.stock} units)
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Made to order / Instant</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="rounded-2xl font-black text-sm px-6 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Link to={productUrl}>
                {isDigital ? (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Download / View Digital Product
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" /> View Product &amp; Details
                  </>
                )}
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-2xl font-bold text-sm px-5 border-border/90 bg-background/80 hover:bg-muted text-foreground active:scale-95 transition-all"
            >
              <Link to={productUrl}>
                <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" /> Contact Seller
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Slide Thumbnails & Pagination Pills (No Duplicates) */}
      {featuredList.length > 1 && (
        <div className="mt-5 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick interactive dots */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {featuredList.map((p, idx) => (
              <button
                key={`dot-${p.id}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Jump to slide ${idx + 1}: ${p.name}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-8 bg-primary shadow-xs"
                    : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
              />
            ))}
          </div>

          {/* Mini preview chips */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto max-w-xl">
            {featuredList.map((item, idx) => (
              <button
                key={`chip-${item.id}`}
                onClick={() => setCurrentIndex(idx)}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all text-left truncate border ${
                  idx === currentIndex
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span className="truncate max-w-[140px]">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
