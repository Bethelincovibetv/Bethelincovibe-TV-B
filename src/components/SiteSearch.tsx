import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const { data: results } = useQuery({
    queryKey: ["site-search", query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image")
        .eq("published", true)
        .ilike("title", `%${query}%`)
        .order("published_at", { ascending: false })
        .limit(6);
      return data ?? [];
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
        <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[400px] bg-background border rounded-lg shadow-lg z-50 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-2.5">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {results && results.length > 0 && (
            <div className="mt-2 max-h-[300px] overflow-y-auto space-y-1">
              {results.map((r: any) => (
                <button
                  key={r.id}
                  className="w-full text-left p-2 rounded-md hover:bg-secondary transition-colors flex items-center gap-3"
                  onClick={() => {
                    navigate(`/blog/${r.slug}`);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {r.featured_image && (
                    <img src={r.featured_image} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.excerpt && <p className="text-xs text-muted-foreground truncate">{r.excerpt}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && results?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}
