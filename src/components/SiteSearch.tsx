import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, ShoppingBag, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const { data: results } = useQuery({
    queryKey: ["site-search", query],
    queryFn: async () => {
      if (query.length < 2) return { posts: [], products: [] };
      const [posts, products] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, featured_image")
          .eq("published", true)
          .ilike("title", `%${query}%`)
          .order("published_at", { ascending: false })
          .limit(4),
        supabase
          .from("directory_products")
          .select("id, name, slug, price, images, image_url, location")
          .eq("active", true)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(4),
      ]);
      return {
        posts: posts.data ?? [],
        products: products.data ?? [],
      };
    },
    enabled: query.length >= 2,
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const totalResults = (results?.posts?.length || 0) + (results?.products?.length || 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-secondary transition-colors"
        aria-label="Search"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[420px] bg-background border rounded-2xl shadow-xl z-50 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search products, articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-xl"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {results?.products && results.products.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 mb-1 flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" /> Products
              </p>
              <div className="space-y-1">
                {results.products.map((p: any) => {
                  const img = p.images?.[0] || p.image_url;
                  return (
                    <button
                      key={p.id}
                      className="w-full text-left p-2 rounded-xl hover:bg-secondary transition-colors flex items-center justify-between gap-3 group"
                      onClick={() => {
                        navigate(`/products/${p.slug || p.id}`);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {img ? (
                          <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{p.name}</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {p.price != null ? `₦${Number(p.price).toLocaleString()}` : "Inquire"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {results?.posts && results.posts.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Articles
              </p>
              <div className="space-y-1">
                {results.posts.map((r: any) => (
                  <button
                    key={r.id}
                    className="w-full text-left p-2 rounded-xl hover:bg-secondary transition-colors flex items-center gap-3"
                    onClick={() => {
                      navigate(`/blog/${r.slug}`);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {r.featured_image ? (
                      <img src={r.featured_image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{r.title}</p>
                      {r.excerpt && <p className="text-[10px] text-muted-foreground truncate">{r.excerpt}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.length >= 2 && totalResults === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No products or articles found</p>
          )}
        </div>
      )}
    </div>
  );
}
