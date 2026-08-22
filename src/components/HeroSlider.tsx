import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
  link_url?: string | null;
  link_text?: string | null;
};

export default function HeroSlider() {
  // Featured blog posts (random from latest 12)
  const { data: featuredPosts } = useQuery({
    queryKey: ["featured-blog-slider"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("title, excerpt, slug, featured_image")
        .eq("published", true)
        .eq("is_featured", true)
        .not("featured_image", "is", null)
        .order("published_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  // Fallback: hero_slides
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

  const slides = useMemo<Slide[]>(() => {
    if (featuredPosts && featuredPosts.length > 0) {
      // Shuffle and pick up to 5
      const shuffled = [...featuredPosts].sort(() => Math.random() - 0.5).slice(0, 5);
      return shuffled.map((p: any) => ({
        image_url: p.featured_image,
        title: p.title,
        subtitle: p.excerpt,
        link_url: `/blog/${p.slug}`,
        link_text: "Read Article",
      }));
    }
    return (heroSlides as Slide[]) || [];
  }, [featuredPosts, heroSlides]);

  const [current, setCurrent] = useState(0);
  const count = slides.length;

  const next = useCallback(() => { if (count > 0) setCurrent((c) => (c + 1) % count); }, [count]);
  const prev = useCallback(() => { if (count > 0) setCurrent((c) => (c - 1 + count) % count); }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [count, next]);

  if (count === 0) return null;
  const slide = slides[current];

  return (
    <div className="relative w-full overflow-hidden bg-muted">
      <div className="relative aspect-[21/9] md:aspect-[3/1] w-full">
        <img src={slide.image_url} alt={slide.title || "Slide"} className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {(slide.title || slide.subtitle || slide.link_url) && (
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
            {slide.title && <h2 className="text-xl md:text-3xl font-bold mb-1 drop-shadow-lg line-clamp-2">{slide.title}</h2>}
            {slide.subtitle && <p className="text-sm md:text-lg opacity-90 mb-3 drop-shadow max-w-xl line-clamp-2">{slide.subtitle}</p>}
            {slide.link_url && (
              <Button size="sm" asChild>
                <Link to={slide.link_url}>{slide.link_text || "Learn More"}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
      {count > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors" aria-label="Previous slide"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors" aria-label="Next slide"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
