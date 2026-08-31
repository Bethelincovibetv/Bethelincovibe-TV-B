import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Users,
  Eye,
  CheckCircle2,
  Star,
  Package,
  Layers,
  ArrowLeft,
  ShieldCheck,
  Clock,
  ExternalLink,
  Award,
  Sparkles,
  Calendar,
  Lock,
  MessageCircle,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import {
  getPromoterMarketplaceDetail,
  PromoterMarketplaceDetail,
} from "@/services/marketplaceService";
import { PromotionPackage, formatNaira } from "@/services/packageService";
import { PROMOTER_NICHES } from "@/services/promoterService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookingDialog } from "@/components/booking/BookingDialog";

export default function PromoterMarketplaceProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PromoterMarketplaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCommunityTab, setSelectedCommunityTab] = useState<string>("all");
  const [selectedBookingPkg, setSelectedBookingPkg] = useState<PromotionPackage | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      if (!id) return;
      setLoading(true);
      try {
        const detail = await getPromoterMarketplaceDetail(id);
        setData(detail);
      } catch (err) {
        console.error("Error loading promoter profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded-md" />
          <div className="h-48 bg-muted/60 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-muted/40 rounded-2xl md:col-span-2" />
            <div className="h-64 bg-muted/40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.promoter) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Promoter Profile Not Found</h2>
        <p className="text-xs text-muted-foreground mb-6">
          The promoter profile you are trying to view does not exist or has not verified any public
          audiences yet.
        </p>
        <Button asChild variant="outline" className="rounded-xl font-bold text-xs">
          <Link to="/promoters">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Marketplace
          </Link>
        </Button>
      </div>
    );
  }

  const { promoter, communities, allPackages, totalAudienceReach, totalDailyViews } = data;

  const getNicheLabels = (nicheIds: string[] | null) => {
    if (!nicheIds || nicheIds.length === 0) return [];
    return nicheIds.map((id) => {
      const match = PROMOTER_NICHES.find((n) => n.id === id);
      return match ? `${match.icon} ${match.label}` : id;
    });
  };

  const filteredCommunities =
    selectedCommunityTab === "all"
      ? communities
      : communities.filter((c) => c.id === selectedCommunityTab);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Breadcrumb Header */}
      <div className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 py-4 max-w-6xl flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Link to="/promoters">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Marketplace
            </Link>
          </Button>

          <Badge variant="outline" className="text-xs font-semibold gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Promoter
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Promoter Profile Card */}
        <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-extrabold shadow-md shrink-0 ring-2 ring-primary/20">
                {promoter.display_name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {promoter.display_name}
                  </h1>
                  {promoter.is_verified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified Identity
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Promoter identity and phone verified</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm">{promoter.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">/ 5.0</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {promoter.total_completed_orders}
                    </span>{" "}
                    Completed Promotions
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Member since {new Date(promoter.created_at).getFullYear()}</span>
                  </div>
                </div>

                {promoter.bio && (
                  <p className="text-xs sm:text-sm text-muted-foreground pt-2 max-w-2xl leading-relaxed">
                    {promoter.bio}
                  </p>
                )}

                {/* Niches */}
                {promoter.niche && promoter.niche.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {getNicheLabels(promoter.niche).map((label, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-semibold">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary Box */}
            <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-1 gap-3 shrink-0 bg-muted/40 p-4 rounded-2xl border border-border/60">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Total Verified Reach
                </span>
                <span className="text-xl font-extrabold text-foreground">
                  {totalAudienceReach.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Verified Communities
                </span>
                <span className="text-xl font-extrabold text-foreground">
                  {communities.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Notice Banner */}
        <Alert className="bg-primary/5 border-primary/20 text-primary-900 dark:text-primary-100 rounded-2xl">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <AlertTitle className="text-xs font-bold text-primary">
              Verified Promoter Profile • Step 6 Booking Ready
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Select any verified promotion package below to submit your campaign brief and create a promotion order. Orders begin in <span className="font-semibold text-foreground">pending_payment</span> status.
            </AlertDescription>
          </div>
        </Alert>

        {/* Verified WhatsApp Communities Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                Verified WhatsApp Communities ({communities.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Official audiences verified by Bethelincovibe Admin
              </p>
            </div>
          </div>

          {communities.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <p className="text-xs text-muted-foreground">
                This promoter has no active verified communities currently published.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((comm) => (
                <Card
                  key={comm.id}
                  className="rounded-2xl border border-border/70 p-5 bg-card hover:border-primary/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs font-bold capitalize">
                        {comm.community_type.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-foreground line-clamp-1">
                      {comm.name}
                    </h3>

                    {comm.demographics_summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded-xl">
                        {comm.demographics_summary}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Audience</span>
                        <span className="font-bold text-foreground">
                          {comm.member_count.toLocaleString()} members
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Daily Views</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {comm.active_daily_views > 0
                            ? comm.active_daily_views.toLocaleString()
                            : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      {comm.packages.length} Active Package{comm.packages.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Promotion Packages Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                Available Promotion Packages ({allPackages.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Select a package to view deliverables, duration, and pricing
              </p>
            </div>
          </div>

          {allPackages.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <p className="text-xs text-muted-foreground">
                No promotion packages are currently available for this promoter.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPackages.map((pkg) => {
                const linkedComm = communities.find((c) => c.id === pkg.community_id);

                return (
                  <Card
                    key={pkg.id}
                    className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all"
                  >
                    <div className="space-y-4">
                      {/* Community Badge */}
                      {linkedComm && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground line-clamp-1">
                            {linkedComm.name}
                          </span>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-bold text-foreground line-clamp-1 mb-1">
                          {pkg.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {pkg.description}
                        </p>
                      </div>

                      {/* Pricing Display */}
                      <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          Package Price
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-extrabold text-foreground tracking-tight">
                            {formatNaira(pkg.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Duration: {pkg.duration_hours} hours active status</span>
                        </div>
                      </div>

                      {/* Deliverables List */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-foreground block">
                          Included Deliverables:
                        </span>
                        <ul className="space-y-1.5">
                          {pkg.deliverables.map((del, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-muted-foreground flex items-start gap-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{del}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Booking Action Button */}
                    <div className="pt-6 mt-4 border-t border-border/60">
                      <Button
                        onClick={() => {
                          setSelectedBookingPkg(pkg);
                          setBookingDialogOpen(true);
                        }}
                        className="w-full font-bold text-xs rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        Book Promotion ({formatNaira(pkg.price)})
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
          community={communities.find((c) => c.id === selectedBookingPkg.community_id)}
          promoter={promoter}
        />
      )}
    </div>
  );
}
