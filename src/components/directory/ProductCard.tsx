import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, ShoppingBag, Sparkles, Package } from "lucide-react";

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

  const media = (
    <>
      {hero ? (
        <img
          src={hero}
          alt={`${p.name} for sale in Lagos`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary via-primary/85 to-accent">
          <Package className="h-10 w-10 text-primary-foreground/90" />
        </div>
      )}
      {p.featured && (
        <Badge className="absolute right-2 top-2 h-5 gap-0.5 bg-amber-500 text-[10px] text-white hover:bg-amber-500">
          <Sparkles className="h-2.5 w-2.5" />Featured
        </Badge>
      )}
    </>
  );

  if (view === "list") {
    return (
      <Link to={to} className="group block">
        <article className="flex gap-3 rounded-2xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-lg active:scale-[0.995]">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-28">{media}</div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-snug group-hover:text-primary">{p.name}</h3>
            {p.categories && <p className="text-xs font-medium text-primary">{p.categories.name}</p>}
            <p className="mt-1 text-base font-bold text-primary">{formatPrice(p.price, p.currency)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {p.condition && <span className="capitalize">{p.condition}</span>}
              {p.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{p.location}</span></span>}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={to} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {media}
          {p.categories && (
            <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur">
              {p.categories.name}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{p.name}</h3>
          <p className="text-base font-bold text-primary">{formatPrice(p.price, p.currency)}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {p.condition && <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{p.condition}</span>}
            {typeof p.stock === "number" && p.stock > 0 && <span>{p.stock} in stock</span>}
          </div>
          {p.location && (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />{p.location}
            </p>
          )}
          <span className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <ShoppingBag className="h-3.5 w-3.5" /> View deal
          </span>
        </div>
      </article>
    </Link>
  );
}
