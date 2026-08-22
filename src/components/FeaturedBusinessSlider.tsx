import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Auto-rotating slider of featured / boosted businesses.
 * Shows on homepage. Cycles every 5s, swipeable.
 */
export default function FeaturedBusinessSlider() {
  const [idx, setIdx] = useState(0);

  const { data: items } = useQuery({
    queryKey: ["featured-business-slider"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, slug, description, logo_url, cover_url, categories(name, slug)")
        .eq("active", true)
        .eq("status", "approved")
        .or(`featured.eq.true,boosted_until.gt.${nowIso}`)
        .order("boosted_until", { ascending: false, nullsFirst: false })
        .limit(8);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!items || items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items]);

  if (!items || items.length === 0) return null;
  const current = items[idx];

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Featured Businesses
        </h2>
        <Button variant="ghost" size="sm" asChild><Link to="/businesses">See all</Link></Button>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border shadow-sm">
        <Link to={`/businesses/${current.slug}`} className="block">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 p-3 sm:p-4">
            <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent">
              {current.cover_url || current.logo_url ? (
                <img
                  src={current.cover_url || current.logo_url!}
                  alt={current.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-foreground">
                  <Building2 className="h-10 w-10 opacity-80" />
                </div>
              )}
              <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                Sponsored
              </span>
            </div>
            <div className="flex flex-col justify-center">
              {(current as any).categories?.name && (
                <span className="text-xs text-primary font-medium">{(current as any).categories.name}</span>
              )}
              <h3 className="text-lg sm:text-xl font-bold truncate">{current.name}</h3>
              {current.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{current.description}</p>
              )}
              <span className="text-xs text-primary mt-2 font-medium">View business →</span>
            </div>
          </div>
        </Link>

        {items.length > 1 && (
          <>
            <button
              aria-label="Previous"
              onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-1.5 shadow hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next"
              onClick={() => setIdx((i) => (i + 1) % items.length)}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-1.5 shadow hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex justify-center gap-1 pb-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
