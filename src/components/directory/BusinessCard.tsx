import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Star,
  Sparkles,
  Phone,
  Globe,
  Briefcase,
  Store,
  GraduationCap,
  Heart,
  Palette,
  Compass,
  Cpu,
  Truck,
  Car,
  Utensils,
  Lightbulb,
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import BusinessDefaultLogo from "@/components/directory/BusinessDefaultLogo";

const CATEGORY_ICONS: Record<string, any> = {
  fashion: Palette,
  food: Utensils,
  tech: Cpu,
  logistics: Truck,
  health: Heart,
  education: GraduationCap,
  realestate: Compass,
  automotive: Car,
  retail: Store,
  professional: Briefcase,
  creative: Lightbulb,
};

export interface BusinessCardProps {
  business?: any;
  supplier?: any;
  images?: any[];
  view?: "grid" | "list";
  searchTerm?: string;
  boosted?: boolean;
}

export default function BusinessCard({
  business,
  supplier,
  images: passedImages = [],
  view = "grid",
  searchTerm,
  boosted: propBoosted,
}: BusinessCardProps) {
  const s = business || supplier;
  if (!s) return null;

  const categorySlug = s.categories?.slug || s.category?.slug || s.cover_template || "";
  const categoryName = s.categories?.name || s.category?.name || s.category_name || "";
  const Icon = CATEGORY_ICONS[categorySlug] || Store;

  const isBoosted = propBoosted || (s.boosted_until ? new Date(s.boosted_until) > new Date() : false);

  const images = [
    ...(Array.isArray(passedImages) ? passedImages : []),
    ...(Array.isArray(s.business_images) ? s.business_images : []),
    ...(Array.isArray(s.supplier_images) ? s.supplier_images : []),
  ];
  
  // Extract services
  const rawServices = Array.isArray(s.services) ? s.services : [];
  const serviceList: { title: string; image_url?: string; description?: string }[] = rawServices.map((srv: any) =>
    typeof srv === "string" ? { title: srv } : srv
  );

  const servicePhotos = serviceList
    .filter((srv) => srv.image_url)
    .map((srv, idx) => ({
      id: `service-photo-${idx}`,
      image_url: srv.image_url!,
      caption: srv.title || "Service Photo",
    }));

  const allDisplayImages = [...images, ...servicePhotos].filter(
    (img, idx, self) => img?.image_url && self.findIndex(t => t.image_url === img.image_url) === idx
  );

  // If user has a custom logo, ensure it is highlighted as the primary badge and not stretched into the hero banner
  const hero = s.cover_url || (allDisplayImages[0]?.image_url && allDisplayImages[0]?.image_url !== s.logo_url ? allDisplayImages[0]?.image_url : null) || null;

  if (view === "list") {
    return (
      <Link to={`/businesses/${s.slug}`} className="group block">
        <article className="flex gap-3.5 rounded-2xl border bg-card p-3.5 transition-all hover:shadow-lg hover:border-primary/40 active:scale-[0.995]">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
            {hero ? (
              <img
                src={hero}
                alt={`${s.name} — ${categoryName || "business"}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : s.logo_url ? (
              <div className="flex h-full w-full items-center justify-center bg-card p-2">
                <img src={s.logo_url} alt={s.name} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            )}
            {isBoosted && (
              <Badge className="absolute left-1 top-1 h-5 gap-0.5 bg-amber-500 px-1.5 text-[9px] text-white hover:bg-amber-500 shadow-sm z-10">
                <Sparkles className="h-2.5 w-2.5" />Sponsored
              </Badge>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2.5">
              {s.logo_url ? (
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-card ring-1 ring-border shadow-xs overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                  <img src={s.logo_url} alt={s.name} className="h-full w-full object-contain" />
                </div>
              ) : (
                <BusinessDefaultLogo name={s.name} category={categoryName} size="sm" shape="rounded-xl" className="h-9 w-9 sm:h-10 sm:w-10 ring-1 ring-border shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="truncate text-[15px] sm:text-base font-bold leading-snug group-hover:text-primary">{s.name}</h3>
                  <VerifiedBadge verified={true} size="sm" />
                </div>
                {categoryName && <p className="text-xs font-semibold text-primary mt-0.5">{categoryName}</p>}
              </div>
            </div>
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
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/businesses/${s.slug}`} className="group block h-full">
      <article
        className={`flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] ${
          isBoosted ? "ring-1 ring-amber-400/60 shadow-amber-500/5" : ""
        }`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {hero ? (
            <img
              src={hero}
              alt={`${s.name} — ${categoryName || "business"}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary via-primary/85 to-accent">
              <Icon className="h-12 w-12 text-primary-foreground/90" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          {isBoosted && (
            <Badge className="absolute right-2 top-2 h-5 gap-0.5 bg-amber-500 text-[10px] text-white hover:bg-amber-500 shadow-sm z-10">
              <Sparkles className="h-2.5 w-2.5" />Sponsored
            </Badge>
          )}
          {categoryName && (
            <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur shadow-sm z-10">
              {categoryName}
            </span>
          )}
          {/* 3D Real Life Shop Badge */}
          <span className="absolute bottom-2 right-2 rounded-full bg-neutral-950/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-amber-300 border border-amber-500/40 shadow-sm z-10 flex items-center gap-1">
            <Store className="h-3 w-3 text-amber-400" />
            <span>3D Shop</span>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
          <div className="flex items-start gap-3 pt-2">
            {s.logo_url ? (
              <div className="relative -mt-8 shrink-0 z-20 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-card p-1 shadow-lg ring-2 ring-card overflow-hidden flex items-center justify-center border">
                <img
                  src={s.logo_url}
                  alt={s.name}
                  loading="lazy"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
            ) : (
              <div className="relative -mt-8 shrink-0 z-20">
                <BusinessDefaultLogo name={s.name} category={categoryName} size="md" shape="rounded-2xl" className="h-14 w-14 sm:h-16 sm:w-16 shadow-lg ring-2 ring-card border" />
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start gap-1.5">
                <h3 className="truncate text-[15px] sm:text-base font-bold leading-snug group-hover:text-primary">{s.name}</h3>
                <VerifiedBadge verified={true} size="sm" />
              </div>
              {s.address && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0 text-primary" />
                  {s.address}
                </p>
              )}
            </div>
          </div>

          {s.description && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{s.description}</p>}

          {/* Key Services Badges */}
          {serviceList.length > 0 && (
            <div className="flex flex-wrap gap-1 my-0.5">
              {serviceList.slice(0, 3).map((srv, idx) => {
                const isMatch = searchTerm && srv.title?.toLowerCase().includes(searchTerm.toLowerCase());
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
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

          {/* Large Visible Service & Product Photos Display */}
          {allDisplayImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
              {allDisplayImages.slice(0, 4).map((img) => (
                <div key={img.id} className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden border shadow-xs bg-muted group/img">
                  <img
                    src={img.image_url}
                    alt={img.caption || `${s.name} service`}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover/img:scale-105 transition-transform"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[9px] text-white truncate text-center">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              {s.featured || isBoosted ? "Featured Merchant" : "Verified Vendor"}
            </span>
            <span className="flex items-center gap-2.5">
              {s.phone && <Phone className="h-3.5 w-3.5 text-emerald-600" aria-label="Phone available" />}
              {s.website && <Globe className="h-3.5 w-3.5 text-primary" aria-label="Website available" />}
              <span className="font-bold text-primary">View Store →</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
