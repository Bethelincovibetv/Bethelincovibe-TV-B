import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Eye,
  CheckCircle2,
  Star,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MarketplaceCommunityCard } from "@/services/marketplaceService";
import { PromotionPackage, formatNaira } from "@/services/packageService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookingDialog } from "@/components/booking/BookingDialog";

interface MarketplaceCardProps {
  item: MarketplaceCommunityCard;
}

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ item }) => {
  const { community, promoter, packages, lowestPrice } = item;
  const [showPackages, setShowPackages] = useState(false);
  const [selectedBookingPkg, setSelectedBookingPkg] = useState<PromotionPackage | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const getCommunityTypeBadge = (type: string) => {
    switch (type) {
      case "channel":
        return {
          label: "WhatsApp Channel",
          icon: "📢",
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "status_audience":
        return {
          label: "Status Audience",
          icon: "📱",
          bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        };
      case "group":
      default:
        return {
          label: "WhatsApp Group",
          icon: "👥",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
    }
  };

  const typeInfo = getCommunityTypeBadge(community.community_type);

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      {/* Top Banner & Badges */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeInfo.bg}`}
            >
              <span>{typeInfo.icon}</span>
              <span>{typeInfo.label}</span>
            </span>

            {community.category && (
              <Badge variant="outline" className="text-xs font-semibold bg-muted/50">
                {community.category.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified</span>
          </div>
        </div>

        {/* Community Name */}
        <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
          {community.name}
        </h3>

        {/* Promoter Info Bar */}
        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground flex items-center gap-1">
            By {promoter.display_name}
            {promoter.is_verified && (
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10" />
            )}
          </span>
          <span>•</span>
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{promoter.rating.toFixed(1)}</span>
          </div>
          <span>•</span>
          <span>{promoter.total_completed_orders} orders</span>
        </div>

        {/* Demographics / Audience summary */}
        {community.demographics_summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 bg-muted/30 p-2.5 rounded-xl border border-border/40">
            {community.demographics_summary}
          </p>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 py-3 px-3.5 rounded-xl bg-secondary/50 border border-border/60 mb-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" />
              Audience Size
            </span>
            <span className="text-base font-extrabold text-foreground tracking-tight mt-0.5">
              {community.member_count.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">members</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3 text-purple-500" />
              Est. Daily Views
            </span>
            <span className="text-base font-extrabold text-foreground tracking-tight mt-0.5">
              {community.active_daily_views > 0
                ? community.active_daily_views.toLocaleString()
                : "Active"}
              {community.active_daily_views > 0 && (
                <span className="text-xs font-normal text-muted-foreground">/day</span>
              )}
            </span>
          </div>
        </div>

        {/* Active Packages Quick Snapshot */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-primary" />
              Available Packages ({packages.length})
            </span>
            {lowestPrice !== null && (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                From {formatNaira(lowestPrice)}
              </span>
            )}
          </div>

          {packages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              No packages published yet. Check back soon.
            </p>
          ) : (
            <div className="space-y-1.5 mt-2">
              {packages.slice(0, showPackages ? packages.length : 2).map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-2.5 rounded-xl border border-border/60 bg-background/80 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground line-clamp-1">
                        {pkg.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-extrabold text-primary shrink-0">
                        {formatNaira(pkg.price)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pkg.duration_hours}h
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedBookingPkg(pkg);
                      setBookingDialogOpen(true);
                    }}
                    className="h-7 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg shrink-0"
                  >
                    Book
                  </Button>
                </div>
              ))}

              {packages.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPackages(!showPackages)}
                  className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
                >
                  {showPackages ? (
                    <>
                      Show fewer packages <ChevronUp className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    <>
                      +{packages.length - 2} more package{packages.length - 2 !== 1 ? "s" : ""}{" "}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 pt-3 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full font-bold text-xs rounded-xl shadow-xs hover:bg-primary/5 hover:text-primary hover:border-primary/30"
        >
          <Link to={`/promoters/${promoter.id}`}>
            <span>View Promoter Profile</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>

      {/* Booking Dialog */}
      {selectedBookingPkg && (
        <BookingDialog
          open={bookingDialogOpen}
          onOpenChange={(open) => {
            setBookingDialogOpen(open);
            if (!open) setSelectedBookingPkg(null);
          }}
          pkg={selectedBookingPkg}
          community={community}
          promoter={promoter}
        />
      )}
    </Card>
  );
};
