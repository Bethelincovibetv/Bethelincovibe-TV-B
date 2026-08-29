import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, ShoppingBag, Sparkles, Package, Download, CheckCircle2, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";
import digitalGoods3D from "@/assets/images/digital_goods_3d_1787915095364.jpg";
import physicalGoods3D from "@/assets/images/physical_goods_3d_1787915108745.jpg";

export type DirectoryProduct = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  condition?: string | null;
  stock?: number | null;
  location?: string | null;
  cover_image?: string | null;
  images?: any;
  featured?: boolean | null;
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
}: {
  product: DirectoryProduct;
  view?: "grid" | "list";
}) {
  const imgs: string[] = Array.isArray(p.images) ? p.images : [];
  const hero = p.cover_image || imgs[0] || null;
  const to = `/products/${p.slug || p.id}`;

  const isDigital =
    (p as any).product_type === "digital" ||
    p.condition === "digital" ||
    p.categories?.slug?.includes("ebook") ||
    p.categories?.slug?.includes("course") ||
    p.categories?.slug?.includes("software") ||
    p.categories?.slug?.includes("template") ||
    p.categories?.slug?.includes("script") ||
    p.categories?.slug?.includes("code") ||
    p.categories?.slug?.includes("graphic") ||
    p.categories?.slug?.includes("audio") ||
    p.categories?.slug?.includes("video") ||
    p.name?.toLowerCase().includes("ebook") ||
    p.name?.toLowerCase().includes("course") ||
    p.name?.toLowerCase().includes("software") ||
    p.name?.toLowerCase().includes("bot") ||
    p.name?.toLowerCase().includes("download");

  const media = (
    <>
      {hero ? (
        <img
          src={hero}
          alt={`${p.name} for sale in Lagos`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-accent">
          <img
            src={isDigital ? digitalGoods3D : physicalGoods3D}
            alt={p.name}
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-108"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Featured / Type Overlay Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        {p.featured ? (
          <Badge className="h-6 gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-black text-white shadow-md border-0 uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Featured
          </Badge>
        ) : (
          <span />
        )}

        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
          isDigital
            ? "bg-purple-900/90 text-purple-200 border border-purple-400/40"
            : "bg-emerald-900/90 text-emerald-200 border border-emerald-400/40"
        }`}>
          {isDigital ? <Download className="h-2.5 w-2.5" /> : <Package className="h-2.5 w-2.5" />}
          {isDigital ? "Digital" : "Physical"}
        </span>
      </div>
    </>
  );

  if (view === "list") {
    return (
      <Link to={to} className="group block">
        <article className="relative flex flex-col sm:flex-row gap-4 rounded-3xl border-2 border-border/80 bg-card p-4 transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.995]">
          <div className="relative h-44 sm:h-36 sm:w-36 shrink-0 overflow-hidden rounded-2xl bg-muted border border-border/50 shadow-inner">
            {media}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-2">
                {p.categories && (
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    {p.categories.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified Seller
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {p.name}
              </h3>
              {p.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {p.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <div>
                <p className="text-lg sm:text-xl font-black text-primary tracking-tight">
                  {formatPrice(p.price, p.currency)}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                  {p.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> {p.location}
                    </span>
                  )}
                  {p.condition && <span className="capitalize">• {p.condition}</span>}
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                <ShoppingBag className="h-3.5 w-3.5" /> View Details
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={to} className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-border/80 bg-card transition-all duration-300 hover:border-primary/60 hover:-translate-y-1.5 hover:shadow-2xl active:scale-[0.99]">
        {/* 3D Media Aspect */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {media}
          {p.categories && (
            <span className="absolute bottom-2.5 left-2.5 rounded-xl bg-background/95 px-2.5 py-1 text-[11px] font-black text-foreground backdrop-blur-md shadow-md border border-border/60">
              {p.categories.name}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col justify-between p-4 space-y-3 bg-gradient-to-b from-card to-card/70">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Lagos Verified
              </span>
              {p.condition && (
                <span className="rounded-md bg-muted px-2 py-0.5 font-bold uppercase text-[9px] tracking-wider text-muted-foreground">
                  {p.condition}
                </span>
              )}
            </div>

            <h3 className="line-clamp-2 text-sm sm:text-base font-black leading-snug text-foreground group-hover:text-primary transition-colors">
              {p.name}
            </h3>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-baseline justify-between">
              <p className="text-base sm:text-lg font-black text-primary tracking-tight">
                {formatPrice(p.price, p.currency)}
              </p>
              {p.location && (
                <p className="flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground max-w-[120px]">
                  <MapPin className="h-3 w-3 shrink-0 text-primary" /> {p.location}
                </p>
              )}
            </div>

            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground shadow-md transition-all group-hover:bg-primary/90 group-hover:shadow-lg">
              <ShoppingBag className="h-3.5 w-3.5" /> View Listing <ArrowRight className="h-3 w-3 ml-0.5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
