import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, ShoppingBag, Sparkles, Package, Download, CheckCircle2, ShieldCheck, Heart, ArrowUpRight } from "lucide-react";
import digitalGoods3D from "@/assets/images/digital_goods_3d_1787915095364.jpg";
import physicalGoods3D from "@/assets/images/physical_goods_3d_1787915108745.jpg";
import { getProductCategoryInfo } from "@/lib/productAIEngine";

export type DirectoryProduct = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  product_type?: string | null;
  condition?: string | null;
  stock?: number | null;
  location?: string | null;
  cover_image?: string | null;
  images?: any;
  featured?: boolean | null;
  views_count?: number | null;
  created_at?: string | null;
  categories?: { name: string; slug: string } | null;
};

export function formatPrice(price?: number | null, currency?: string | null) {
  if (price === null || price === undefined) return "Contact for price";
  const symbol = (currency || "NGN") === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${Number(price).toLocaleString()}`;
}

export default function ProductCard({
  product: p,
  view = "grid",
  rankBadge,
  isNewArrival,
  timeAgo,
  distanceKm,
}: {
  product: DirectoryProduct;
  view?: "grid" | "list";
  rankBadge?: { rank: number; label?: string };
  isNewArrival?: boolean;
  timeAgo?: string;
  distanceKm?: number | null;
}) {
  const imgs: string[] = Array.isArray(p.images) ? p.images : [];
  const hero = p.cover_image || imgs[0] || null;
  const to = `/products/${p.slug || p.id}`;

  const catInfo = getProductCategoryInfo(p);
  const isDigital = catInfo.type === "digital";

  const media = (
    <div className="relative aspect-[4/3] sm:aspect-square w-full overflow-hidden bg-muted">
      {hero ? (
        <img
          src={hero}
          alt={`${p.name} for sale`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500/10 via-primary/10 to-accent/10">
          <img
            src={isDigital ? digitalGoods3D : physicalGoods3D}
            alt={p.name}
            className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Top Overlay Badges (Jiji Marketplace style) */}
      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none gap-1">
        {rankBadge ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm">
            🔥 #{rankBadge.rank} {rankBadge.label || "Top"}
          </span>
        ) : isNewArrival ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-600 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm">
            <Sparkles className="h-2.5 w-2.5" /> New
          </span>
        ) : p.featured ? (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm">
            ⭐ TOP
          </span>
        ) : (
          <span />
        )}

        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-xs ${
            isDigital
              ? "bg-purple-900/90 text-purple-200 border border-purple-400/30"
              : "bg-emerald-900/90 text-emerald-200 border border-emerald-400/30"
          }`}
        >
          {isDigital ? <Download className="h-2 w-2" /> : <Package className="h-2 w-2" />}
          {isDigital ? "Digital" : "Goods"}
        </span>
      </div>

      {/* Category Tag overlay in bottom corner */}
      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
        {catInfo.name}
      </span>
    </div>
  );

  // Jiji-style List View (compact, space-efficient, zero bloated padding)
  if (view === "list") {
    return (
      <Link to={to} className="group block">
        <article className="relative flex flex-row gap-3 rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 transition-all duration-200 hover:border-emerald-500/70 hover:shadow-md active:scale-[0.995]">
          <div className="relative h-24 w-28 sm:h-28 sm:w-36 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/40">
            {media}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified Seller
                </span>
                {p.condition && (
                  <span className="text-muted-foreground capitalize">• {p.condition}</span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-2 mt-0.5 leading-snug">
                {p.name}
              </h3>
            </div>

            <div className="flex items-baseline justify-between pt-1 border-t border-border/40 gap-2">
              <div>
                <p className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatPrice(p.price, p.currency)}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {p.location && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium">
                      <MapPin className="h-2.5 w-2.5 text-primary" /> {p.location}
                    </span>
                  )}
                  {typeof distanceKm === "number" && (
                    <span className="inline-flex items-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded text-[9px] border border-emerald-500/30">
                      📍 {distanceKm < 1 ? "<1 km away" : `${distanceKm.toFixed(1)} km away`}
                    </span>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 transition-colors">
                View <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Jiji-style Grid Card (Tight padding, high information density, attractive, free)
  return (
    <Link to={to} className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card hover:border-emerald-500/70 hover:shadow-md transition-all duration-200 active:scale-[0.99] font-sans">
        {/* Crisp Photo */}
        {media}

        {/* Content Body: tight padding, zero waste */}
        <div className="flex flex-1 flex-col justify-between p-2 sm:p-2.5 space-y-1">
          <div>
            {/* Nigerian Jiji Signature BOLD GREEN Price */}
            <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mb-1">
              {formatPrice(p.price, p.currency)}
            </p>

            {/* Product Title (2 lines max) */}
            <h3 className="line-clamp-2 text-xs sm:text-[13px] font-bold leading-snug text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {p.name}
            </h3>
          </div>

          <div className="pt-1 border-t border-border/40 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-1">
              <span className="inline-flex items-center gap-0.5 font-medium truncate max-w-[105px]">
                <MapPin className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                {p.location || "Lagos, Nigeria"}
              </span>
              {typeof distanceKm === "number" ? (
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.2 rounded text-[9px] shrink-0 border border-emerald-500/25">
                  {distanceKm < 1 ? "<1km" : `${distanceKm.toFixed(1)}km`}
                </span>
              ) : p.condition ? (
                <span className="font-semibold text-muted-foreground uppercase text-[9px] shrink-0">
                  {p.condition}
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
              <span className="inline-flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Verified
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold group-hover:text-emerald-600 flex items-center gap-0.5">
                Details <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
