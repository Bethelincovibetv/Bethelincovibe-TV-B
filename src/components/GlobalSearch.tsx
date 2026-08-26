import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, FileText, Building2, User as UserIcon, ShoppingBag, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: results, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (query.length < 2) return { posts: [], products: [], businesses: [], users: [] };
      const [posts, products, businesses, users] = await Promise.all([
        supabase.from("blog_posts")
          .select("id, title, slug, featured_image")
          .eq("published", true)
          .ilike("title", `%${query}%`)
          .limit(4),
        supabase.from("directory_products")
          .select("id, name, slug, price, currency, images, image_url, location")
          .eq("active", true)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5),
        supabase.from("suppliers")
          .select("id, name, slug, logo_url")
          .eq("active", true)
          .eq("status", "approved")
          .ilike("name", `%${query}%`)
          .limit(4),
        supabase.from("profiles")
          .select("user_id, display_name, username, avatar_url, email")
          .eq("is_public", true)
          .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(4),
      ]);
      return {
        posts: posts.data ?? [],
        products: products.data ?? [],
        businesses: businesses.data ?? [],
        users: users.data ?? [],
      };
    },
    enabled: query.length >= 2,
  });

  const goto = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  const total =
    (results?.posts.length ?? 0) +
    (results?.products.length ?? 0) +
    (results?.businesses.length ?? 0) +
    (results?.users.length ?? 0);

  return (
    <div ref={ref} className="relative max-w-xl mx-auto w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search products, articles, businesses, people…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          className="pl-11 pr-10 h-12 text-sm sm:text-base rounded-2xl shadow-md border-2 focus-visible:ring-primary bg-background"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3.5 top-3.5" aria-label="Clear">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-background border rounded-2xl shadow-2xl max-h-[65vh] overflow-y-auto z-50 divide-y divide-border/60">
          {isFetching && total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Searching across marketplace, articles & businesses…</p>
          )}

          {/* User Products */}
          {results?.products && results.products.length > 0 && (
            <div className="p-2.5">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[11px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Products for Sale ({results.products.length})
                </p>
                <button onClick={() => goto(`/products?q=${encodeURIComponent(query)}`)} className="text-[10px] font-bold text-muted-foreground hover:text-primary">
                  View all
                </button>
              </div>
              <div className="grid gap-1 mt-1">
                {results.products.map((p: any) => {
                  const img = p.images?.[0] || p.image_url;
                  const priceFormatted = p.price != null ? `₦${Number(p.price).toLocaleString()}` : "Contact for Price";
                  return (
                    <button
                      key={p.id}
                      onClick={() => goto(`/products/${p.slug || p.id}`)}
                      className="w-full text-left flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl hover:bg-secondary/70 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {img ? (
                          <img src={img} alt={p.name} className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border/50" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">{p.name}</p>
                          {p.location && <p className="text-[10px] text-muted-foreground truncate">📍 {p.location}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg shrink-0">
                        {priceFormatted}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Articles */}
          {results?.posts && results.posts.length > 0 && (
            <div className="p-2.5">
              <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" /> Articles & Guides
              </p>
              <div className="grid gap-1 mt-1">
                {results.posts.map((p: any) => (
                  <button key={p.id} onClick={() => goto(`/blog/${p.slug}`)}
                    className="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-secondary/70 transition-colors">
                    {p.featured_image
                      ? <img src={p.featured_image} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                      : <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-primary" /></div>}
                    <span className="text-xs sm:text-sm font-medium truncate">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Businesses */}
          {results?.businesses && results.businesses.length > 0 && (
            <div className="p-2.5">
              <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-500" /> Businesses & Suppliers
              </p>
              <div className="grid gap-1 mt-1">
                {results.businesses.map((s: any) => (
                  <button key={s.id} onClick={() => goto(`/businesses?q=${encodeURIComponent(s.name)}`)}
                    className="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-secondary/70 transition-colors">
                    {s.logo_url
                      ? <img src={s.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                      : <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-accent" /></div>}
                    <span className="text-xs sm:text-sm font-medium truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {results?.users && results.users.length > 0 && (
            <div className="p-2.5">
              <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-purple-500" /> Entrepreneurs & Members
              </p>
              <div className="grid gap-1 mt-1">
                {results.users.map((u: any) => (
                  <button key={u.user_id}
                    onClick={() => goto(u.username ? `/u/${u.username}` : `/u/${u.user_id}`)}
                    className="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-secondary/70 transition-colors">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                      : <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4 text-primary" /></div>}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate">{u.display_name || u.username || "User"}</p>
                      {u.username && <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isFetching && total === 0 && (
            <div className="py-8 text-center px-4 space-y-1">
              <p className="text-sm font-semibold text-foreground">No matches found for "{query}"</p>
              <p className="text-xs text-muted-foreground">Try searching with a broader keyword, product name, or business category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
