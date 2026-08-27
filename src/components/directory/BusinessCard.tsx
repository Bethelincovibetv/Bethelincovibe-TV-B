import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Globe, Sparkles, Star, BadgeCheck, Images } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";

export type DirectoryBusiness = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  featured?: boolean | null;
  boosted_until?: string | null;
  services?: any[] | null;
  categories?: { name: string; slug: string } | null;
};

/**
 * Premium marketplace listing card: media header, identity row, services chips, meta chips.
 */
export default function BusinessCard({
  business: s,
  images = [],
  view = "grid",
  searchTerm = "",
}: {
  business: DirectoryBusiness;
  images?: { id: string; image_url: string; caption?: string | null }[];
  view?: "grid" | "list";
  searchTerm?: string;
}) {
  const boosted = !!s.boosted_until && new Date(s.boosted_until) > new Date();
  const Icon = getCategoryIcon(s.categories?.name || "");
  const hero = s.cover_url || images[0]?.image_url || s.logo_url || null;

  const rawServices: any[] = Array.isArray(s.services) ? s.services : [];
  const serviceList = rawServices.map((srv) => typeof srv === "string" ? { title: srv } : srv).filter((srv) => !!srv.title);

  if (view === "list") {
    return (
      <Link to={`/businesses/${s.slug}`} className="group block">
        <article className="flex gap-3 rounded-2xl border bg-card p-3 transition-all hover:shadow-lg hover:border-primary/40 active:scale-[0.995]">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
            {hero ? (
              <img
                src={hero}
                alt={`${s.name} — ${s.categories?.name || "business"}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            )}
            {boosted && (
              <Badge className="absolute left-1 top-1 h-5 gap-0.5 bg-amber-500 px-1.5 text-[9px] text-white hover:bg-amber-500">
                <Sparkles className="h-2.5 w-2.5" />Sponsored
              </Badge>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              <h3 className="truncate text-[15px] font-semibold leading-snug group-hover:text-primary">{s.name}</h3>
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            </div>
            {s.categories && <p className="text-xs font-medium text-primary">{s.categories.name}</p>}
            {s.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
            
            {serviceList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {serviceList.slice(0, 3).map((srv, idx) => {
                  const isMatch = searchTerm && srv.title?.toLowerCase().includes(searchTerm.toLowerCase());
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        isMatch
                          ? "bg-amber-500/15 text-amber-600 font-bold border border-amber-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {srv.title}
                    </span>
                  );
                })}
                {serviceList.length > 3 && (
                  <span className="text-[10px] text-muted-foreground self-center">+{serviceList.length - 3} more</span>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {s.address && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{s.address}</span></span>}
              {s.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />Contact</span>}
              {images.length > 0 && <span className="inline-flex items-center gap-1"><Images className="h-3 w-3" />{images.length}</span>}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/businesses/${s.slug}`} className="group block h-full">
      <article
        className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] ${
          boosted ? "ring-1 ring-amber-400/60 shadow-amber-500/5" : ""
        }`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {hero ? (
            <img
              src={hero}
              alt={`${s.name} — ${s.categories?.name || "business"}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary via-primary/85 to-accent">
              <Icon className="h-12 w-12 text-primary-foreground/90" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
          {boosted && (
            <Badge className="absolute right-2 top-2 h-5 gap-0.5 bg-amber-500 text-[10px] text-white hover:bg-amber-500 shadow-sm">
              <Sparkles className="h-2.5 w-2.5" />Sponsored
            </Badge>
          )}
          {s.categories && (
            <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur">
              {s.categories.name}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <div className="flex items-start gap-2">
            {s.logo_url && (
              <img
                src={s.logo_url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="-mt-8 h-11 w-11 shrink-0 rounded-xl object-cover ring-4 ring-card"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5">
                <h3 className="truncate text-[15px] font-semibold leading-snug group-hover:text-primary">{s.name}</h3>
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </div>
              {s.address && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {s.address}
                </p>
              )}
            </div>
          </div>

          {s.description && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{s.description}</p>}

          {/* Key Services Badges for Service Discovery */}
          {serviceList.length > 0 && (
            <div className="flex flex-wrap gap-1 my-0.5">
              {serviceList.slice(0, 3).map((srv, idx) => {
                const isMatch = searchTerm && srv.title?.toLowerCase().includes(searchTerm.toLowerCase());
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      isMatch
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {srv.title}
                  </span>
                );
              })}
              {serviceList.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">+{serviceList.length - 3} more</span>
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className="flex gap-1.5 overflow-hidden">
              {images.slice(0, 4).map((img) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  alt={img.caption || `${s.name} photo`}
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {s.featured || boosted ? "Featured" : "Verified"}
            </span>
            <span className="flex items-center gap-2.5">
              {s.phone && <Phone className="h-3.5 w-3.5" aria-label="Phone available" />}
              {s.website && <Globe className="h-3.5 w-3.5" aria-label="Website available" />}
              <span className="font-semibold text-primary">View Profile →</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
