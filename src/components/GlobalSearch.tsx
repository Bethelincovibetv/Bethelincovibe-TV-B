import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, FileText, Building2, User as UserIcon } from "lucide-react";
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
      if (query.length < 2) return { posts: [], businesses: [], users: [] };
      const [posts, businesses, users] = await Promise.all([
        supabase.from("blog_posts")
          .select("id, title, slug, featured_image")
          .eq("published", true)
          .ilike("title", `%${query}%`)
          .limit(5),
        supabase.from("suppliers")
          .select("id, name, slug, logo_url")
          .eq("active", true)
          .eq("status", "approved")
          .ilike("name", `%${query}%`)
          .limit(5),
        supabase.from("profiles")
          .select("user_id, display_name, username, avatar_url, email")
          .eq("is_public", true)
          .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(5),
      ]);
      return {
        posts: posts.data ?? [],
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
    (results?.businesses.length ?? 0) +
    (results?.users.length ?? 0);

  return (
    <div ref={ref} className="relative max-w-xl mx-auto w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search articles, businesses, people…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          className="pl-10 pr-10 h-12 text-base rounded-2xl shadow-md border-2 focus-visible:ring-primary"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-3" aria-label="Clear">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-background border rounded-xl shadow-xl max-h-[60vh] overflow-y-auto z-50">
          {isFetching && total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Searching…</p>
          )}

          {results?.posts && results.posts.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Articles</p>
              {results.posts.map((p: any) => (
                <button key={p.id} onClick={() => goto(`/blog/${p.slug}`)}
                  className="w-full text-left flex items-center gap-3 px-2 py-2 rounded hover:bg-secondary">
                  {p.featured_image
                    ? <img src={p.featured_image} alt="" className="h-9 w-9 rounded object-cover" />
                    : <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></div>}
                  <span className="text-sm truncate">{p.title}</span>
                </button>
              ))}
            </div>
          )}

          {results?.businesses && results.businesses.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Businesses</p>
              {results.businesses.map((s: any) => (
                <button key={s.id} onClick={() => goto(`/businesses?q=${encodeURIComponent(s.name)}`)}
                  className="w-full text-left flex items-center gap-3 px-2 py-2 rounded hover:bg-secondary">
                  {s.logo_url
                    ? <img src={s.logo_url} alt="" className="h-9 w-9 rounded object-cover" />
                    : <div className="h-9 w-9 rounded bg-accent/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-accent" /></div>}
                  <span className="text-sm truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}

          {results?.users && results.users.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">People</p>
              {results.users.map((u: any) => (
                <button key={u.user_id}
                  onClick={() => goto(u.username ? `/u/${u.username}` : `/u/${u.user_id}`)}
                  className="w-full text-left flex items-center gap-3 px-2 py-2 rounded hover:bg-secondary">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    : <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><UserIcon className="h-4 w-4 text-primary" /></div>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name || u.username || "User"}</p>
                    {u.username && <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isFetching && total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}
