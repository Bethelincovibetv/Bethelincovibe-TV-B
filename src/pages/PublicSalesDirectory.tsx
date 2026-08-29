import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Eye, ArrowUpDown } from "lucide-react";
import AdsterraAd from "@/components/AdsterraAd";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";

type Sort = "newest" | "popular" | "price_asc" | "price_desc";

export default function PublicSalesDirectory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [priceBand, setPriceBand] = useState<string>("any");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("sales_pages")
        .select("id, slug, product_name, subheadline, headline, product_image_url, price, views_count, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(300);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let rows = [...items];
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) =>
        [p.product_name, p.headline, p.subheadline].filter(Boolean).join(" ").toLowerCase().includes(needle)
      );
    }
    if (priceBand !== "any") {
      rows = rows.filter((p) => {
        const v = Number(p.price || 0);
        if (priceBand === "free") return v === 0;
        if (priceBand === "u5k") return v > 0 && v < 5000;
        if (priceBand === "5_20k") return v >= 5000 && v < 20000;
        if (priceBand === "20_100k") return v >= 20000 && v < 100000;
        if (priceBand === "100k+") return v >= 100000;
        return true;
      });
    }
    if (sort === "popular") rows.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    else if (sort === "price_asc") rows.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === "price_desc") rows.sort((a, b) => (b.price || 0) - (a.price || 0));
    return rows;
  }, [items, q, sort, priceBand]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-12">
      <SEO
        title={`Marketplace — Verified Sales Pages | ${SITE_NAME}`}
        description="Discover top products, instant digital downloads, and professional services from verified Nigerian entrepreneurs."
        url="/sales"
        type="website"
        image={PAGE_OG_IMAGES.salesDirectory()}
      />

      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Search products and services from our entrepreneurs.</p>
        </div>

        <AdsterraAd slot="sales_directory" />


        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, services, brands…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ["any", "All prices"],
                ["free", "Free"],
                ["u5k", "Under ₦5k"],
                ["5_20k", "₦5k – ₦20k"],
                ["20_100k", "₦20k – ₦100k"],
                ["100k+", "₦100k+"],
              ].map(([k, l]) => (
                <Button key={k} size="sm" variant={priceBand === k ? "default" : "outline"} onClick={() => setPriceBand(k)}>
                  {l}
                </Button>
              ))}
              <div className="flex-1" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="border rounded-md px-2 py-1 bg-background text-foreground"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most viewed</option>
                <option value="price_asc">Price: low → high</option>
                <option value="price_desc">Price: high → low</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading marketplace…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No sales pages match your search.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <Link key={p.id} to={`/sales/${p.slug}`} className="block group">
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <div className="aspect-square bg-muted relative">
                    {p.product_image_url ? (
                      <img src={p.product_image_url} alt={p.product_name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Sparkles className="h-10 w-10" /></div>
                    )}
                    {p.views_count > 50 && <Badge className="absolute top-2 left-2 bg-amber-400 text-zinc-900">🔥 Hot</Badge>}
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <h3 className="text-sm font-bold truncate">{p.product_name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.subheadline || p.headline || ""}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold text-primary">
                        {Number(p.price || 0) > 0 ? `₦${Number(p.price).toLocaleString()}` : "Contact"}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{p.views_count || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
