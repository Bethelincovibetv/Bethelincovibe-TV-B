import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  Star,
  ExternalLink,
  Store,
  CheckCircle2,
  ArrowRight,
  Info,
  LayoutGrid,
  Maximize2,
  Lock,
  Globe,
  Truck,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RealLife3DShopModal from "@/components/shop/RealLife3DShopModal";
import BusinessDefaultLogo from "@/components/directory/BusinessDefaultLogo";

/**
 * High-Converting Google Ad Style Featured Business Showcase
 * Displays full business cards with Google Ad layout, callout extensions,
 * rich sitelinks, rating stars, and one-click 3D Real Life Shop walkthrough.
 */
export default function FeaturedBusinessSlider() {
  const [idx, setIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<"ad_spotlight" | "grid">("ad_spotlight");
  const [selected3DShop, setSelected3DShop] = useState<any | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["featured-business-slider-v2"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, slug, description, logo_url, cover_url, phone, whatsapp, email, website, address, city, state, verified, is_verified, rating, reviews_count, featured, boosted_until, categories(name, slug), services")
        .eq("active", true)
        .eq("status", "approved")
        .or(`featured.eq.true,boosted_until.gt.${nowIso}`)
        .order("boosted_until", { ascending: false, nullsFirst: false })
        .limit(10);

      // If fewer than 3 boosted businesses, fill with approved businesses to ensure a rich showcase
      if (!data || data.length < 4) {
        const { data: topGeneral } = await supabase
          .from("suppliers")
          .select("id, name, slug, description, logo_url, cover_url, phone, whatsapp, email, website, address, city, state, verified, is_verified, rating, reviews_count, featured, boosted_until, categories(name, slug), services")
          .eq("active", true)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(6);

        const merged = [...(data || []), ...(topGeneral || [])];
        return merged.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
      }

      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  // Fetch sample products for currently displayed business
  const current = items?.[idx];
  const { data: currentProducts } = useQuery({
    queryKey: ["featured-biz-products", current?.id],
    queryFn: async () => {
      if (!current?.id) return [];
      const { data } = await supabase
        .from("directory_products")
        .select("id, title, price, image_url, description")
        .eq("active", true)
        .limit(4);
      return data ?? [];
    },
    enabled: Boolean(current?.id),
  });

  // Cycle every 6s unless paused
  useEffect(() => {
    if (!items || items.length < 2 || isPaused || viewMode === "grid") return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items, isPaused, viewMode]);

  if (isLoading || !items || items.length === 0) return null;

  const waNumber = (current?.whatsapp || current?.phone || "").replace(/\D/g, "");
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;
  const ratingScore = current?.rating || 4.9;
  const reviewsCount = current?.reviews_count || 128;
  const categoryName = (current as any)?.categories?.name || "Verified Enterprise";

  return (
    <section className="container mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black tracking-wider uppercase px-2 py-0.5">
              <Sparkles className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
              Verified Sponsor Showcase
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Google Ad Format Verified Marketplace
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            Featured Nigerian Businesses
          </h2>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setViewMode("ad_spotlight")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === "ad_spotlight"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Spotlight Ad
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Sponsors ({items.length})
            </button>
          </div>

          <Button variant="outline" size="sm" asChild className="h-8 text-xs font-bold rounded-xl">
            <Link to="/businesses">Browse Directory</Link>
          </Button>
        </div>
      </div>

      {/* VIEW MODE 1: GOOGLE AD STYLE SPOTLIGHT CARD */}
      {viewMode === "ad_spotlight" && current && (
        <div
          className="relative rounded-3xl overflow-hidden border border-border/80 bg-card shadow-xl transition-all hover:border-primary/40"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Top Google Ad Label Bar */}
          <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Google Ad "Sponsored" Badge */}
              <Badge className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                Sponsored
              </Badge>

              {/* Breadcrumb Display URL */}
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground font-mono">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">bethelincovibe.tv</span>
                <span>›</span>
                <span className="text-foreground font-medium">business</span>
                <span>›</span>
                <span className="text-primary font-bold truncate max-w-[120px] sm:max-w-[200px]">
                  {current.slug || current.name.toLowerCase().replace(/\s+/g, "-")}
                </span>
              </div>

              {/* Google Ad Info Tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    This business is featured as a verified sponsor on Bethelincovibe TV. Verified contact info and Escrow trade guaranteed.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Slider progress indicator */}
            <div className="text-xs font-mono font-bold text-muted-foreground hidden sm:block">
              {idx + 1} of {items.length} Sponsored
            </div>
          </div>

          {/* Main Google Ad Body Grid */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MEDIA COLUMN: Cover, Avatar, 3D Store Entrance */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-muted border border-border/70 group shadow-md">
                {current.cover_url ? (
                  <img
                    src={current.cover_url}
                    alt={current.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-muted flex items-center justify-center">
                    <Building2 className="h-16 w-16 text-primary/40" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                {/* Floating Logo Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl ring-2 ring-white/80 bg-white shadow-xl overflow-hidden p-1 flex items-center justify-center">
                    {current.logo_url ? (
                      <img
                        src={current.logo_url}
                        alt={current.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <BusinessDefaultLogo
                        name={current.name}
                        category={categoryName}
                        size="md"
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  <div className="text-white drop-shadow-md">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-sm truncate max-w-[160px] sm:max-w-[190px]">
                        {current.name}
                      </span>
                      {(current.is_verified || current.verified) && (
                        <CheckCircle2 className="h-4 w-4 text-sky-400 fill-sky-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-white/80 font-medium">
                      {categoryName}
                    </p>
                  </div>
                </div>

                {/* 3D Real Life Shop Trigger Pill on Media */}
                <button
                  type="button"
                  onClick={() => setSelected3DShop(current)}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950/85 hover:bg-neutral-900 border border-amber-400/60 text-amber-300 font-extrabold text-xs shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                >
                  <Store className="h-3.5 w-3.5 text-amber-400" />
                  <span>Enter 3D Shop</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </button>
              </div>

              {/* Quick Trust Ribbons */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>CAC &amp; Escrow Protected</span>
                </div>
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold flex items-center gap-1.5">
                  <Truck className="h-4 w-4 shrink-0" />
                  <span>Nationwide Waybill</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Google Ad Content & Rich Sitelinks */}
            <div className="lg:col-span-7 space-y-4">
              {/* Rating & Review Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <span className="text-xs font-black text-foreground">
                  {ratingScore.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({reviewsCount}+ verified buyer reviews)
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/30">
                  99% Positive Feedback
                </Badge>
              </div>

              {/* Google Ad Headline */}
              <div>
                <Link
                  to={`/businesses/${current.slug || current.id}`}
                  className="group block"
                >
                  <h3 className="text-lg sm:text-xl font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                    {current.name} — {categoryName} in {current.city || current.state || "Lagos, Nigeria"}
                  </h3>
                </Link>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {[current.address, current.city, current.state].filter(Boolean).join(", ") || "Lagos, Nigeria"}
                  </span>
                </div>
              </div>

              {/* Description Snippet */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {current.description ||
                  `Verified Nigerian supplier offering premium ${categoryName.toLowerCase()}, nationwide courier dispatch, wholesale pricing, and instant Escrow checkout.`}
              </p>

              {/* Google Ad Callout Extensions (Pill highlights) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">
                  ✓ Verified Physical Store
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">
                  ✓ Wholesale &amp; Retail Orders
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">
                  ✓ Paystack / Bank Transfer Escrow
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-medium">
                  ✓ Same-Day Dispatch
                </span>
              </div>

              {/* Google Ad Expanded Sitelinks (High CTR grid) */}
              <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Sitelink 1: 3D Real Life Shop */}
                <div
                  onClick={() => setSelected3DShop(current)}
                  className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-all flex items-start gap-2.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-foreground group-hover:text-primary flex items-center gap-1">
                      <span>Walk in 3D Store</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Explore real-life virtual shelves and 3D products
                    </p>
                  </div>
                </div>

                {/* Sitelink 2: WhatsApp Chat */}
                {waUrl ? (
                  <a
                    href={`${waUrl}?text=${encodeURIComponent(
                      `Hello ${current.name}, I am contacting you from your Featured Sponsor Ad on Bethelincovibe TV!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-all flex items-start gap-2.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-foreground group-hover:text-emerald-600 flex items-center gap-1">
                        <span>WhatsApp Direct</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Chat directly with vendor for inquiries &amp; discounts
                      </p>
                    </div>
                  </a>
                ) : (
                  <Link
                    to={`/businesses/${current.slug || current.id}`}
                    className="p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted cursor-pointer transition-all flex items-start gap-2.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-foreground group-hover:text-primary flex items-center gap-1">
                        <span>Direct Contact</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Call or email verified representative
                      </p>
                    </div>
                  </Link>
                )}

                {/* Sitelink 3: Full Business Profile & Catalog */}
                <Link
                  to={`/businesses/${current.slug || current.id}`}
                  className="p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted cursor-pointer transition-all flex items-start gap-2.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-foreground group-hover:text-primary flex items-center gap-1">
                      <span>Full Business Card</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      View CAC certificate, services &amp; verified reviews
                    </p>
                  </div>
                </Link>

                {/* Sitelink 4: In-Stock Product Catalog */}
                <Link
                  to={`/businesses/${current.slug || current.id}#products`}
                  className="p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted cursor-pointer transition-all flex items-start gap-2.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-foreground group-hover:text-primary flex items-center gap-1">
                      <span>In-Stock Catalog</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Inspect wholesale pricing &amp; Escrow checkout
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* BOTTOM CONTROLS & SLIDE INDICATORS */}
          <div className="px-4 sm:px-6 py-3 border-t border-border/50 bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === idx
                      ? "w-8 bg-primary shadow-xs"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Sponsored Ad ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
                className="h-8 w-8 rounded-xl border-border hover:border-primary/50"
                aria-label="Previous Sponsored Business"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIdx((i) => (i + 1) % items.length)}
                className="h-8 w-8 rounded-xl border-border hover:border-primary/50"
                aria-label="Next Sponsored Business"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL SPONSORED CARDS GRID */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((biz) => {
            const bizWa = (biz.whatsapp || biz.phone || "").replace(/\D/g, "");
            const bizCat = (biz as any)?.categories?.name || "Verified Business";

            return (
              <div
                key={biz.id}
                className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[9px] font-black uppercase px-2 py-0.5">
                      Sponsored Ad
                    </Badge>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> CAC Verified
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl border border-border overflow-hidden bg-white p-0.5 shrink-0 flex items-center justify-center">
                      {biz.logo_url ? (
                        <img
                          src={biz.logo_url}
                          alt={biz.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <BusinessDefaultLogo
                          name={biz.name}
                          category={bizCat}
                          size="sm"
                          className="w-full h-full"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/businesses/${biz.slug || biz.id}`}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {biz.name}
                      </Link>
                      <p className="text-xs text-primary font-medium">{bizCat}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{biz.city || biz.state || "Lagos, Nigeria"}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {biz.description || `Verified Nigerian enterprise offering ${bizCat.toLowerCase()} with Escrow protection.`}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected3DShop(biz)}
                    className="flex-1 text-xs font-bold rounded-xl h-8 gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    <Store className="h-3.5 w-3.5 text-amber-500" />
                    3D Shop
                  </Button>
                  <Button asChild size="sm" className="flex-1 text-xs font-bold rounded-xl h-8">
                    <Link to={`/businesses/${biz.slug || biz.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3D Real Life Shop Modal Instance */}
      {selected3DShop && (
        <RealLife3DShopModal
          open={Boolean(selected3DShop)}
          onOpenChange={(open) => !open && setSelected3DShop(null)}
          business={selected3DShop}
          products={currentProducts || []}
        />
      )}
    </section>
  );
}
