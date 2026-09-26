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
  ThumbsUp,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import {
  getPromoterMarketplaceDetail,
  PromoterMarketplaceDetail,
} from "@/services/marketplaceService";
import {
  getPromoterReviews,
  getPromoterScorecard,
  PromotionReview,
  PromoterScorecard,
} from "@/services/promotionReviewService";
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

  // Reviews and Performance Scorecard
  const [reviews, setReviews] = useState<PromotionReview[]>([]);
  const [scorecard, setScorecard] = useState<PromoterScorecard | null>(null);

  useEffect(() => {
    async function loadDetail() {
      if (!id) return;
      setLoading(true);
      try {
        const detail = await getPromoterMarketplaceDetail(id);
        setData(detail);

        if (detail?.promoter?.id) {
          const [fetchedReviews, fetchedScorecard] = await Promise.all([
            getPromoterReviews(detail.promoter.id),
            getPromoterScorecard(detail.promoter.id),
          ]);
          setReviews(fetchedReviews);
          setScorecard(fetchedScorecard);
        }
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
                    <span className="text-sm">{scorecard ? scorecard.average_rating.toFixed(1) : promoter.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">/ 5.0</span>
                    <span className="text-[11px] text-muted-foreground ml-1">
                      ({scorecard ? scorecard.review_count : 0} review{scorecard?.review_count === 1 ? "" : "s"})
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {scorecard ? scorecard.completed_orders_count : promoter.total_completed_orders}
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

        {/* Verified Reviews & Performance Scorecard Section */}
        <div className="space-y-6 pt-4 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <span>Verified Performance & Customer Reviews</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Authentic delivery ratings submitted by verified business buyers post-completion
              </p>
            </div>

            {scorecard && (
              <Badge variant="outline" className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30 gap-1 self-start sm:self-auto">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{scorecard.completion_rate}% Completion Rate</span>
              </Badge>
            )}
          </div>

          {/* Performance Scorecard Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border border-border/70 bg-card space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Average Rating
              </span>
              <div className="flex items-center gap-1.5 pt-1">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <span className="text-2xl font-black text-foreground">
                  {scorecard ? scorecard.average_rating.toFixed(1) : promoter.rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5.0</span>
              </div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                From {scorecard ? scorecard.review_count : 0} verified review{scorecard?.review_count === 1 ? "" : "s"}
              </span>
            </Card>

            <Card className="p-4 rounded-2xl border border-border/70 bg-card space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Completion Rate
              </span>
              <div className="flex items-center gap-1.5 pt-1">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-black text-foreground">
                  {scorecard ? scorecard.completion_rate : 100}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                {scorecard ? scorecard.completed_orders_count : promoter.total_completed_orders} orders fulfilled
              </span>
            </Card>

            <Card className="p-4 rounded-2xl border border-border/70 bg-card space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                On-Time Delivery
              </span>
              <div className="flex items-center gap-1.5 pt-1">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-black text-foreground">
                  {scorecard ? scorecard.on_time_delivery_rate : 100}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Within scheduled SLA
              </span>
            </Card>

            <Card className="p-4 rounded-2xl border border-border/70 bg-card space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Reliability Status
              </span>
              <div className="flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {scorecard && scorecard.disputed_orders_count > 0 ? "Under Monitoring" : "Top Rated"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                {scorecard?.disputed_orders_count || 0} disputes recorded
              </span>
            </Card>
          </div>

          {/* Rating Breakdown & Customer Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rating Stars Distribution (1 col) */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Rating Breakdown
              </h3>

              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = scorecard?.rating_breakdown?.[stars as 1|2|3|4|5] || 0;
                  const total = scorecard?.review_count || (count > 0 ? count : 1);
                  const pct = total > 0 && scorecard?.review_count ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 w-12 shrink-0">
                        <span className="font-bold">{stars}</span>
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-8 text-right font-mono">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                Reviews can only be submitted by verified businesses who have completed a full broadcast campaign with this promoter.
              </div>
            </Card>

            {/* Individual Reviews (2 cols) */}
            <div className="md:col-span-2 space-y-3">
              {reviews.length === 0 ? (
                <Card className="p-8 text-center rounded-2xl border-dashed bg-muted/10 space-y-2">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">No Verified Reviews Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This promoter is ready for bookings. Once your campaign concludes, you will be able to leave a verified rating.
                  </p>
                </Card>
              ) : (
                reviews.map((rev) => (
                  <Card key={rev.id} className="p-4 rounded-2xl border border-border/70 bg-card space-y-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {rev.business?.business_name || "Verified Business Buyer"}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Verified Order
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= rev.rating
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold ml-1 text-foreground">
                            {rev.rating}.0
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {(rev.communication_rating || rev.delivery_speed_rating) && (
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {rev.communication_rating && (
                          <span>Communication: <strong className="text-foreground">{rev.communication_rating}/5</strong></span>
                        )}
                        {rev.delivery_speed_rating && (
                          <span>Delivery Speed: <strong className="text-foreground">{rev.delivery_speed_rating}/5</strong></span>
                        )}
                      </div>
                    )}

                    {rev.review_text && (
                      <p className="text-xs text-foreground/90 leading-relaxed bg-muted/20 p-2.5 rounded-xl border border-border/40">
                        &ldquo;{rev.review_text}&rdquo;
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
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
