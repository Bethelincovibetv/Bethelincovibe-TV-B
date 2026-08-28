import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, FileText, Building2, User as UserIcon, ShoppingBag, ArrowRight, Sparkles, Layers, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type GlobalSearchTab = "all" | "products" | "businesses" | "articles" | "people";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GlobalSearchTab>("all");
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
      const [posts, dirProducts, sellerProds, businesses, suppliers, users] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("id, title, slug, featured_image")
          .eq("published", true)
          .ilike("title", `%${query}%`)
          .limit(4),
        supabase
          .from("directory_products")
          .select("id, name, slug, price, currency, images, location, condition")
          .eq("active", true)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(6),
        supabase
          .from("seller_products")
          .select("id, title, price, category, image_url")
          .ilike("title", `%${query}%`)
          .limit(4),
        supabase
          .from("businesses")
          .select("id, name, slug, category, city, logo_url")
          .ilike("name", `%${query}%`)
          .limit(4),
        supabase
          .from("suppliers")
          .select("id, name, slug, logo_url")
          .eq("active", true)
          .eq("status", "approved")
          .ilike("name", `%${query}%`)
          .limit(3),
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url, email")
          .eq("is_public", true)
          .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(4),
      ]);

      // Merge and normalize products
      const unifiedProducts: any[] = [];
      const seenIds = new Set<string>();

      (dirProducts.data ?? []).forEach((p) => {
        seenIds.add(p.id);
        unifiedProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          currency: p.currency,
          image: p.images?.[0],
          location: p.location,
          type: p.condition === "digital" ? "digital" : "physical",
        });
      });

      (sellerProds.data ?? []).forEach((sp) => {
        if (!seenIds.has(sp.id)) {
          unifiedProducts.push({
            id: sp.id,
            name: sp.title,
            slug: sp.id,
            price: sp.price,
            currency: "NGN",
            image: sp.image_url,
            location: sp.category,
            type: "merchant",
          });
        }
      });

      // Merge businesses & suppliers
      const unifiedBusinesses: any[] = [];
      const seenBizNames = new Set<string>();

      (businesses.data ?? []).forEach((b) => {
        seenBizNames.add(b.name.toLowerCase());
        unifiedBusinesses.push({
          id: b.id,
          name: b.name,
          slug: b.slug || b.id,
          logo: b.logo_url,
          subtitle: [b.category, b.city].filter(Boolean).join(" • "),
        });
      });

      (suppliers.data ?? []).forEach((s) => {
        if (!seenBizNames.has(s.name.toLowerCase())) {
          unifiedBusinesses.push({
            id: s.id,
            name: s.name,
            slug: s.slug || s.id,
            logo: s.logo_url,
            subtitle: "Verified Supplier",
          });
        }
      });

      return {
        posts: posts.data ?? [],
        products: unifiedProducts,
        businesses: unifiedBusinesses,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      goto(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const total =
    (results?.posts.length ?? 0) +
    (results?.products.length ?? 0) +
    (results?.businesses.length ?? 0) +
    (results?.users.length ?? 0);

  const showProducts = (activeTab === "all" || activeTab === "products") && results?.products && results.products.length > 0;
  const showBusinesses = (activeTab === "all" || activeTab === "businesses") && results?.businesses && results.businesses.length > 0;
  const showPosts = (activeTab === "all" || activeTab === "articles") && results?.posts && results.posts.length > 0;
  const showUsers = (activeTab === "all" || activeTab === "people") && results?.users && results.users.length > 0;

  return (
    <div ref={ref} className="relative max-w-xl mx-auto w-full">
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search products, articles, businesses, people… (Press Enter)"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-24 h-12 text-sm sm:text-base rounded-2xl shadow-lg border-2 border-border/80 focus-visible:border-primary bg-background/95 backdrop-blur font-medium"
        />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => query.trim() && goto(`/products?q=${encodeURIComponent(query.trim())}`)}
            className="p-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            title="Search Products"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-card border-2 border-border/80 rounded-3xl shadow-2xl max-h-[70vh] overflow-y-auto z-50 divide-y divide-border/60">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-2.5 bg-muted/40 overflow-x-auto no-scrollbar border-b border-border/60">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-colors ${
                activeTab === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              All ({total})
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-colors flex items-center gap-1 ${
                activeTab === "products" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              <ShoppingBag className="h-3 w-3" /> Products ({results?.products.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("businesses")}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-colors flex items-center gap-1 ${
                activeTab === "businesses" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              <Building2 className="h-3 w-3" /> Businesses ({results?.businesses.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("articles")}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-colors flex items-center gap-1 ${
                activeTab === "articles" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              <FileText className="h-3 w-3" /> Articles ({results?.posts.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("people")}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-colors flex items-center gap-1 ${
                activeTab === "people" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              <UserIcon className="h-3 w-3" /> People ({results?.users.length ?? 0})
            </button>
          </div>

          {isFetching && total === 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
              Searching across marketplace products, businesses &amp; articles…
            </p>
          )}

          {/* User & Directory Products */}
          {showProducts && (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <p className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Products for Sale ({results!.products.length})
                </p>
                <button
                  onClick={() => goto(`/products?q=${encodeURIComponent(query)}`)}
                  className="text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                >
                  View full marketplace <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid gap-1.5">
                {results!.products.map((p: any) => {
                  const priceFormatted = p.price != null ? `₦${Number(p.price).toLocaleString()}` : "Contact for Price";
                  return (
                    <button
                      key={p.id}
                      onClick={() => goto(`/products/${p.slug || p.id}`)}
                      className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/70 transition-all group border border-transparent hover:border-border/60 hover:shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-11 w-11 rounded-xl object-cover shrink-0 border border-border/50 shadow-inner"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <ShoppingBag className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                            {p.name}
                          </p>
                          {p.location && (
                            <p className="text-[11px] font-medium text-muted-foreground truncate">
                              📍 {p.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl shrink-0">
                        {priceFormatted}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Businesses */}
          {showBusinesses && (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <p className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Businesses &amp; Suppliers ({results!.businesses.length})
                </p>
                <button
                  onClick={() => goto(`/businesses?q=${encodeURIComponent(query)}`)}
                  className="text-xs font-black text-amber-500 hover:underline flex items-center gap-0.5"
                >
                  View directory <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid gap-1.5">
                {results!.businesses.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => goto(`/businesses/${s.slug}`)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/70 transition-all border border-transparent hover:border-border/60"
                  >
                    {s.logo ? (
                      <img
                        src={s.logo}
                        alt=""
                        className="h-10 w-10 rounded-xl object-cover shrink-0 border border-border/50 shadow-inner"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <Building2 className="h-5 w-5 text-amber-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-black text-foreground truncate">{s.name}</p>
                      {s.subtitle && <p className="text-[11px] text-muted-foreground truncate">{s.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Articles */}
          {showPosts && (
            <div className="p-3">
              <p className="text-xs font-black text-blue-500 uppercase tracking-wider px-2 py-1 mb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Articles &amp; Startup Guides
              </p>
              <div className="grid gap-1.5">
                {results!.posts.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => goto(`/blog/${p.slug}`)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/70 transition-colors border border-transparent hover:border-border/60"
                  >
                    {p.featured_image ? (
                      <img
                        src={p.featured_image}
                        alt=""
                        className="h-10 w-10 rounded-xl object-cover shrink-0 border border-border/50"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                    )}
                    <span className="text-xs sm:text-sm font-bold truncate text-foreground">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {showUsers && (
            <div className="p-3">
              <p className="text-xs font-black text-purple-500 uppercase tracking-wider px-2 py-1 mb-1 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" /> Entrepreneurs &amp; Members
              </p>
              <div className="grid gap-1.5">
                {results!.users.map((u: any) => (
                  <button
                    key={u.user_id}
                    onClick={() => goto(u.username ? `/u/${u.username}` : `/u/${u.user_id}`)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/70 transition-colors border border-transparent hover:border-border/60"
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-border/50"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4 text-purple-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-foreground truncate">{u.display_name || u.username || "User"}</p>
                      {u.username && <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isFetching && total === 0 && (
            <div className="py-8 text-center px-4 space-y-2">
              <p className="text-sm font-black text-foreground">No matches found for "{query}"</p>
              <p className="text-xs text-muted-foreground">
                Try searching with a broader keyword, product name, or browse the marketplace directly.
              </p>
              <button
                onClick={() => goto(`/products?q=${encodeURIComponent(query)}`)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-sm"
              >
                Search all Products for "{query}" <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

