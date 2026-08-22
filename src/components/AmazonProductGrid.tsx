import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, ExternalLink } from "lucide-react";

interface Props {
  category?: string;
  limit?: number;
  heading?: string;
}

const DEFAULT_MARKETPLACE = "com";

function buildAffiliateUrl(asin: string, marketplace: string, tag?: string) {
  const base = `https://www.amazon.${marketplace || DEFAULT_MARKETPLACE}/dp/${asin}`;
  return tag ? `${base}?tag=${encodeURIComponent(tag)}` : base;
}

export default function AmazonProductGrid({ category, limit = 4, heading = "Recommended Products" }: Props) {
  const { data } = useQuery({
    queryKey: ["amazon-products", category, limit],
    queryFn: async () => {
      const [productsRes, settingsRes] = await Promise.all([
        (async () => {
          let q = supabase
            .from("amazon_products")
            .select("*")
            .eq("active", true)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false })
            .limit(limit);
          if (category) q = q.or(`category.eq.${category},category.is.null`);
          return q;
        })(),
        supabase.from("site_settings").select("key,value").in("key", ["amazon_affiliate_tag", "amazon_marketplace"]),
      ]);
      const map: Record<string, string> = {};
      settingsRes.data?.forEach((r: any) => { map[r.key] = r.value || ""; });
      return {
        products: productsRes.data || [],
        tag: map.amazon_affiliate_tag || "",
        marketplace: map.amazon_marketplace || DEFAULT_MARKETPLACE,
      };
    },
  });

  const products = data?.products || [];
  if (products.length === 0) return null;

  return (
    <section className="my-10">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">{heading}</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">Affiliate</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((p: any) => {
          const href = buildAffiliateUrl(p.asin, p.marketplace || data?.marketplace || DEFAULT_MARKETPLACE, data?.tag);
          return (
            <a
              key={p.id}
              href={href}
              target="_blank"
              rel="noopener sponsored nofollow"
              className="group block rounded-xl border bg-card hover:shadow-lg transition-all overflow-hidden"
            >
              {p.image_url && (
                <div className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={p.image_url}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs font-medium line-clamp-2 leading-snug">{p.title}</p>
                {p.price && <p className="text-sm font-bold text-primary mt-1">{p.price}</p>}
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  Shop on Amazon <ExternalLink className="h-2.5 w-2.5" />
                </p>
              </div>
            </a>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        As an Amazon Associate we earn from qualifying purchases.
      </p>
    </section>
  );
}
