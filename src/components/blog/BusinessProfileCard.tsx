import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  Star,
  MapPin,
  ExternalLink,
  Briefcase,
  Clock,
  Coins,
  ArrowRight,
  ShieldCheck,
  Phone,
  MessageCircle,
} from "lucide-react";
import { normalizeServiceItem, ServiceItem } from "@/services/serviceManagementService";

interface BusinessProfileCardProps {
  slug?: string;
  businessId?: string;
  showServices?: boolean;
  maxServices?: number;
  highlightCategory?: string;
}

export default function BusinessProfileCard({
  slug,
  businessId,
  showServices = true,
  maxServices = 3,
  highlightCategory,
}: BusinessProfileCardProps) {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const { data: business, isLoading } = useQuery({
    queryKey: ["blog-featured-business", slug, businessId],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select(`
          id,
          name,
          slug,
          description,
          logo_url,
          cover_url,
          address,
          phone,
          whatsapp,
          website,
          services,
          rating,
          reviews_count,
          verified,
          featured,
          categories(name, slug)
        `);

      if (slug) {
        query = query.eq("slug", slug);
      } else if (businessId) {
        query = query.eq("id", businessId);
      } else {
        // Pick top featured verified business
        query = query.eq("active", true).order("rating", { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();
      if (error || !data) return null;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="my-8 overflow-hidden rounded-3xl border border-primary/20 bg-card/60 p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
      </Card>
    );
  }

  if (!business) return null;

  const rawServices = Array.isArray(business.services) ? business.services : [];
  const services: ServiceItem[] = rawServices.map((s: any, idx: number) =>
    normalizeServiceItem(s, idx)
  );

  const displayedServices = services.slice(0, maxServices);
  const profileUrl = `/business/${business.slug || business.id}`;
  const categoryName = (business.categories as any)?.name || highlightCategory || "Verified Business";

  return (
    <Card
      id={`business-feature-${business.slug || business.id}`}
      className="my-8 overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md transition-all hover:border-primary/50"
    >
      <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-6 py-3 border-b border-primary/15 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Featured Verified Business Partner</span>
        </div>
        <Badge variant="outline" className="bg-background/80 text-[11px] font-bold border-primary/30">
          {categoryName}
        </Badge>
      </div>

      <CardContent className="p-6 sm:p-7 space-y-6">
        {/* Business Header Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted border-2 border-border shadow-sm shrink-0 flex items-center justify-center">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-foreground m-0 tracking-tight">
                  {business.name}
                </h3>
                {business.verified && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-extrabold">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {business.rating && (
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {Number(business.rating).toFixed(1)}
                    {business.reviews_count ? ` (${business.reviews_count})` : ""}
                  </span>
                )}
                {business.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {business.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              asChild
              className="w-full sm:w-auto rounded-xl font-black gap-1.5 shadow-sm hover:scale-[1.02] transition-transform"
            >
              <Link to={profileUrl}>
                <span>View Public Site Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Business Description */}
        {business.description && (
          <p className="text-sm text-muted-foreground leading-relaxed m-0 border-l-2 border-primary/40 pl-3 italic">
            "{business.description.length > 220 ? business.description.slice(0, 220) + "…" : business.description}"
          </p>
        )}

        {/* Service Listings */}
        {showServices && displayedServices.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span>Featured Service Offerings ({services.length})</span>
              </div>
              <Link
                to={`${profileUrl}#services`}
                className="text-xs font-extrabold text-primary hover:underline flex items-center gap-1"
              >
                <span>All services</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedServices.map((svc) => (
                <div
                  key={svc.id}
                  className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-2.5 transition-all hover:border-primary/50 hover:shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-sm text-foreground m-0 line-clamp-1">
                        {svc.title}
                      </h4>
                    </div>
                    {svc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 m-0 leading-relaxed">
                        {svc.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      {svc.price ? (
                        <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          {svc.price}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Custom Quote</span>
                      )}
                      {svc.duration && (
                        <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                          <Clock className="w-3 h-3" />
                          {svc.duration}
                        </span>
                      )}
                    </div>

                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs font-bold rounded-xl h-8 gap-1 hover:bg-primary hover:text-white transition-colors"
                    >
                      <Link to={`${profileUrl}?service=${encodeURIComponent(svc.title)}`}>
                        <span>Book / Inquire</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Contact Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-1 hover:text-foreground font-semibold"
              >
                <Phone className="w-3.5 h-3.5 text-primary" /> {business.phone}
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Provider
              </a>
            )}
          </div>
          <Link
            to={profileUrl}
            className="text-primary font-black text-xs hover:underline flex items-center gap-1"
          >
            Explore Company Showcase <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
