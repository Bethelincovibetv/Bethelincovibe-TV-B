import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";

export type SlideItem = {
  id: string;
  image_url: string;
  title: string;
  subtitle?: string | null;
  link_url: string;
  link_text: string;
  badge?: string | null;
  type: "blog" | "product" | "business" | "platform";
};

const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: "growth-engine-default",
    image_url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1600&q=80",
    title: "Lagos Entrepreneur Business Growth Engine",
    subtitle: "Discover verified suppliers, wholesale marketplace deals, startup playbooks & growth tools.",
    link_url: "/businesses",
    link_text: "Discover Businesses",
    badge: "Growth Engine",
    type: "business",
  },
  {
    id: "marketplace-default",
    image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    title: "Wholesale & Direct Merchant Marketplace",
    subtitle: "Shop vetted physical goods, digital assets, and direct manufacturer pricing.",
    link_url: "/products",
    link_text: "Explore Products",
    badge: "Marketplace",
    type: "product",
  },
  {
    id: "startup-guides-default",
    image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
    title: "Proven Startup & Sourcing Playbooks",
    subtitle: "Actionable guides on China-to-Nigeria import, customer acquisition, and business scale.",
    link_url: "/blog/category/startup-guides",
    link_text: "Read Guides",
    badge: "Startup Guides",
    type: "blog",
  },
  {
    id: "list-business-default",
    image_url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
    title: "Promote Your Business to Thousands of Buyers",
    subtitle: "Claim your verified business profile and start generating high-intent buyer leads today.",
    link_url: "/businesses/list",
    link_text: "List Your Business",
    badge: "Free Listing",
    type: "platform",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // 1. Featured blog posts
  const { data: featuredPosts } = useQuery({
    queryKey: ["hero-featured-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, excerpt, slug, featured_image, categories(name)")
        .eq("published", true)
        .eq("is_featured", true)
        .not("featured_image", "is", null)
        .order("published_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  // 2. Featured products for marketplace showcase
  const { data: featuredProducts } = useQuery({
    queryKey: ["hero-featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("directory_products")
        .select("id, name, description, slug, cover_image, images, price, currency")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  // 3. Featured suppliers/businesses
  const { data: featuredSuppliers } = useQuery({
    queryKey: ["hero-featured-suppliers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, description, slug, logo_url, city")
        .eq("active", true)
        .eq("status", "approved")
        .eq("is_featured", true)
        .limit(3);
      return data ?? [];
    },
  });

  // 4. Hero slides from DB table
  const { data: heroSlides } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const slides = useMemo<SlideItem[]>(() => {
    const list: SlideItem[] = [];

    // Custom DB slides if configured
    if (heroSlides && heroSlides.length > 0) {
      heroSlides.forEach((hs: any) => {
        if (hs.image_url) {
          list.push({
            id: `db-slide-${hs.id}`,
            image_url: hs.image_url,
            title: hs.title || "Bethelincovibe TV",
            subtitle: hs.subtitle,
            link_url: hs.link_url || "/businesses",
            link_text: hs.link_text || "Explore Now",
            badge: "Featured",
            type: "platform",
          });
        }
      });
    }

    // Dynamic featured blog posts
    if (featuredPosts && featuredPosts.length > 0) {
      featuredPosts.forEach((p: any) => {
        if (p.featured_image) {
          list.push({
            id: `blog-${p.id}`,
            image_url: p.featured_image,
            title: p.title,
            subtitle: p.excerpt || "Read the latest entrepreneur guide and actionable insights.",
            link_url: `/blog/${p.slug}`,
            link_text: "Read Article",
            badge: (p.categories as any)?.name || "Growth Guide",
            type: "blog",
          });
        }
      });
    }

    // Dynamic featured products
    if (featuredProducts && featuredProducts.length > 0) {
      featuredProducts.forEach((prod: any) => {
        const img = prod.cover_image || (Array.isArray(prod.images) ? prod.images[0] : null);
        if (img) {
          list.push({
            id: `product-${prod.id}`,
            image_url: img,
            title: prod.name,
            subtitle: prod.description ? prod.description.substring(0, 110) + "..." : "Available in Lagos Marketplace",
            link_url: `/products/${prod.slug || prod.id}`,
            link_text: "Explore Product",
            badge: "Marketplace Deal",
            type: "product",
          });
        }
      });
    }

    // Dynamic featured businesses
    if (featuredSuppliers && featuredSuppliers.length > 0) {
      featuredSuppliers.forEach((s: any) => {
        if (s.logo_url) {
          list.push({
            id: `supplier-${s.id}`,
            image_url: s.logo_url,
            title: s.name,
            subtitle: s.description ? s.description.substring(0, 110) + "..." : `Verified Lagos Supplier in ${s.city || "Lagos"}`,
            link_url: `/businesses/${s.slug || s.id}`,
            link_text: "View Business",
            badge: "Verified Business",
            type: "business",
          });
        }
      });
    }

    // Merge with defaults if list is short
    if (list.length < 3) {
      return [...list, ...DEFAULT_SLIDES];
    }

    return list.slice(0, 6);
  }, [heroSlides, featuredPosts, featuredProducts, featuredSuppliers]);

  const count = slides.length;

  const next = useCallback(() => {
    if (count > 0) setCurrent((c) => (c + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    if (count > 0) setCurrent((c) => (c - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [count, next, isPaused]);

  // Touch / Swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      next();
    } else if (diff < -45) {
      prev();
    }
  };

  if (count === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-950 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slider Frame */}
      <div className="relative min-h-[360px] sm:min-h-[420px] md:min-h-[480px] w-full overflow-hidden flex items-center">
        {slides.map((slide, index) => {
          const isActive = index === current;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Background Image */}
              <img
                src={slide.image_url}
                alt={slide.title}
                className="w-full h-full object-cover select-none"
                loading={index === 0 ? "eager" : "lazy"}
              />

              {/* High-contrast multi-layer dark gradient overlays for 100% text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent max-w-4xl" />

              {/* Text & Action Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:p-14 max-w-3xl text-white space-y-2.5 sm:space-y-3.5">
                {slide.badge && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary hover:bg-primary text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md border border-white/20 backdrop-blur-md">
                      <Sparkles className="h-3 w-3 mr-1 inline" />
                      {slide.badge}
                    </Badge>
                  </div>
                )}

                <h2 className="text-xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-lg line-clamp-2">
                  {slide.title}
                </h2>

                {slide.subtitle && (
                  <p className="text-xs sm:text-sm md:text-base text-white/85 line-clamp-2 leading-relaxed max-w-2xl drop-shadow-md">
                    {slide.subtitle}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-3">
                  <Button asChild size="default" className="rounded-xl font-extrabold text-xs sm:text-sm gap-1.5 shadow-xl h-10 px-5 bg-primary text-white hover:bg-primary/90">
                    <Link to={slide.link_url}>
                      <span>{slide.link_text}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next Arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 border border-white/10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 border border-white/10"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-4 right-5 sm:right-10 z-20 flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 sm:w-8 bg-primary" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

