import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  MapPin,
  Star,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  Award,
  AlertCircle,
  Zap,
  Send,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllRequests,
  getAllOffers,
  awardOfferAndCloseOpportunity,
  completeRequest,
  findMatchingCandidates,
  saveAllRequests,
} from "@/services/opportunityMatchingService";
import { BusinessRequest, ProviderOffer, RequestStatus } from "@/types/opportunityMatching";
import { toast } from "sonner";
import mayaAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

export default function CustomerRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [selectedOfferToAward, setSelectedOfferToAward] = useState<ProviderOffer | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = () => {
    if (!id) return;
    const allReqs = getAllRequests();
    const found = allReqs.find((r) => r.id === id);
    if (found) {
      setRequest(found);
      const allOffs = getAllOffers();
      const reqOffers = allOffs.filter((o) => o.request_id === id);
      setOffers(reqOffers);
    }
  };

  const handleAwardOffer = async () => {
    if (!request || !selectedOfferToAward || !user) return;

    setIsAwarding(true);
    try {
      const { request: updatedReq } = await awardOfferAndCloseOpportunity({
        requestId: request.id,
        offerId: selectedOfferToAward.id,
        customerUserId: user.id,
      });

      setRequest(updatedReq);
      loadData();
      setSelectedOfferToAward(null);
      toast.success(`🎉 Request successfully awarded to ${selectedOfferToAward.business_name}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to award request");
    } finally {
      setIsAwarding(false);
    }
  };

  const handleCompleteRequest = async () => {
    if (!request || !user) return;
    setIsCompleting(true);
    try {
      const updated = await completeRequest(request.id, user.id);
      setRequest(updated);
      toast.success("🏆 Project marked as completed! Thank you for using Bethelincovibe TV.");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete request");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleExpandSearch = async () => {
    if (!request) return;
    setIsExpanding(true);
    try {
      const expandedCandidates = await findMatchingCandidates(
        {
          category: request.category,
          categorySlug: request.category_slug,
          serviceTitle: request.service_title,
          rawPrompt: request.raw_prompt,
          budget: request.budget,
          locationPreference: request.location_preference,
        },
        true
      );

      const allReqs = getAllRequests();
      const idx = allReqs.findIndex((r) => r.id === request.id);
      if (idx !== -1) {
        allReqs[idx].expanded_search = true;
        allReqs[idx].matched_provider_count = Math.max(allReqs[idx].matched_provider_count, expandedCandidates.length);
        saveAllRequests(allReqs);
        setRequest({ ...allReqs[idx] });
      }

      toast.success(`Expanded search active! Notified ${expandedCandidates.length} additional verified businesses.`);
    } catch (err) {
      toast.error("Failed to expand search.");
    } finally {
      setIsExpanding(false);
    }
  };

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Request not found</h2>
        <p className="text-sm text-muted-foreground">The request may have been removed or expired.</p>
        <Button asChild>
          <Link to="/dashboard/my-requests">Back to My Requests</Link>
        </Button>
      </div>
    );
  }

  const isOwner = user && user.id === request.user_id;
  const isAwarded = request.status === "AWARDED" || request.status === "IN_PROGRESS" || request.status === "COMPLETED";

  return (
    <>
      <Helmet>
        <title>{request.service_title} | Bethelincovibe TV Request</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="text-xs font-bold gap-1 pl-0">
            <Link to="/dashboard/my-requests">
              <ChevronLeft className="w-4 h-4" /> Back to My Requests
            </Link>
          </Button>

          <Badge variant="outline" className="text-xs font-semibold">
            ID: {request.id.slice(0, 12)}
          </Badge>
        </div>

        {/* Request Header Banner */}
        <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                  {request.category}
                </Badge>
                {request.status === "RECEIVING_OFFERS" && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    🟢 Receiving Offers ({offers.length})
                  </Badge>
                )}
                {request.status === "OPEN" && (
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
                    🔵 Open & Matching
                  </Badge>
                )}
                {request.status === "AWARDED" && (
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30">
                    🟣 Awarded
                  </Badge>
                )}
                {request.status === "COMPLETED" && (
                  <Badge className="bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30">
                    ⚪ Completed
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {request.service_title}
              </h1>
            </div>

            {/* If awarded, show action buttons */}
            {isAwarded && (
              <div className="flex items-center gap-2">
                <Button size="sm" asChild variant="outline" className="font-bold gap-1.5 rounded-xl">
                  <Link to="/dashboard/messages">
                    <MessageCircle className="w-4 h-4 text-primary" /> Chat with Provider
                  </Link>
                </Button>
                {request.status !== "COMPLETED" && isOwner && (
                  <Button
                    size="sm"
                    onClick={handleCompleteRequest}
                    disabled={isCompleting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Completed
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
              <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" /> Budget
              </div>
              <div className="text-base font-extrabold text-foreground mt-0.5">{request.budget_formatted}</div>
            </div>

            <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
              <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Deadline
              </div>
              <div className="text-base font-extrabold text-foreground mt-0.5">{request.deadline}</div>
            </div>

            <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
              <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" /> Location
              </div>
              <div className="text-base font-extrabold text-foreground mt-0.5 truncate">{request.location_preference}</div>
            </div>

            <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
              <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" /> Matches Found
              </div>
              <div className="text-base font-extrabold text-foreground mt-0.5">{request.matched_provider_count} Providers</div>
            </div>
          </div>

          {/* Request Original Text & Scope */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Customer Description:
            </div>
            <p className="text-sm text-foreground/90 italic bg-muted/30 p-3.5 rounded-xl border border-border/50">
              "{request.raw_prompt}"
            </p>

            {request.specific_requirements.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="text-xs font-bold text-muted-foreground">Scope Deliverables:</div>
                <div className="flex flex-wrap gap-2">
                  {request.specific_requirements.map((req, i) => (
                    <span key={i} className="text-xs bg-secondary/80 text-foreground px-2.5 py-1 rounded-lg border border-border/60">
                      ✓ {req}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Awarded Banner (If Winner Selected) */}
        {request.selected_business_name && (
          <div className="bg-gradient-to-r from-purple-900/90 via-primary/95 to-purple-950 text-white p-6 rounded-3xl border border-purple-500/30 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-7 h-7 text-amber-400" />
              <div>
                <h3 className="text-lg font-black text-white">
                  Request Awarded to {request.selected_business_name}! 🎉
                </h3>
                <p className="text-xs text-white/80">
                  Agreed Price: <span className="font-bold text-amber-300">₦{request.agreed_price?.toLocaleString()}</span> | Status:{" "}
                  <span className="font-semibold text-emerald-300 uppercase">{request.status}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" asChild className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold gap-2 rounded-xl">
                <Link to="/dashboard/messages">
                  <MessageCircle className="w-4 h-4" /> Message {request.selected_business_name}
                </Link>
              </Button>
              <Button size="sm" asChild variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl">
                <Link to="/wallet">
                  <Wallet className="w-4 h-4 mr-1.5" /> View Wallet & Escrow
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Offers Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Provider Offers Received ({offers.length})
              </h2>
              {offers.length > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs font-bold">
                  {offers.length} providers competing
                </Badge>
              )}
            </div>

            {offers.length < 2 && !isAwarded && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExpandSearch}
                disabled={isExpanding}
                className="text-xs font-bold gap-1.5 rounded-xl border-dashed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExpanding ? "animate-spin" : ""}`} />
                Expand Provider Search
              </Button>
            )}
          </div>

          {/* Offer Cards */}
          {offers.length === 0 ? (
            <Card className="p-8 rounded-3xl border-dashed border-2 text-center space-y-4 bg-muted/20">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-foreground">
                  Waiting for provider offers...
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  We have notified {request.matched_provider_count} matching businesses. Providers usually respond within a few hours. You will receive an instant notification when a new offer is placed.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandSearch}
                  disabled={isExpanding}
                  className="text-xs font-bold gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Expand Matching Criteria
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {offers.map((offer) => {
                const isThisAccepted = request.selected_offer_id === offer.id;

                return (
                  <Card
                    key={offer.id}
                    className={`rounded-2xl border transition-all overflow-hidden bg-card ${
                      isThisAccepted
                        ? "ring-2 ring-purple-500 border-purple-500/40 shadow-md"
                        : "border-border/80 hover:border-primary/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Provider info bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {offer.business_logo_url ? (
                            <img
                              src={offer.business_logo_url}
                              alt={offer.business_name}
                              className="w-12 h-12 rounded-xl object-cover ring-1 ring-border shadow-xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-base">
                              {offer.business_name.charAt(0)}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-foreground">
                                {offer.business_name}
                              </h3>
                              {offer.is_verified && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold px-1.5 py-0 h-4">
                                  <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center text-amber-500 font-bold">
                                <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" /> {offer.rating} ({offer.reviews_count} reviews)
                              </span>
                              <span>•</span>
                              <span>{offer.business_category}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bid price & Delivery time */}
                        <div className="flex items-center gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/60 self-start sm:self-auto">
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Proposed Price</div>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                              ₦{offer.proposed_price.toLocaleString()}
                            </div>
                          </div>
                          <div className="h-7 w-px bg-border" />
                          <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Turnaround</div>
                            <div className="text-xs font-extrabold text-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-500" /> {offer.delivery_time}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Proposal Message */}
                      <div className="bg-muted/30 p-3.5 rounded-xl border border-border/40 text-xs text-foreground/90 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-muted-foreground">Provider Proposal:</span>
                          {offer.ai_match_badge && (
                            <Badge className="bg-amber-400/15 text-amber-900 dark:text-amber-200 border-amber-400/30 text-[10px] font-bold">
                              {offer.ai_match_badge}
                            </Badge>
                          )}
                        </div>
                        <p className="leading-relaxed">{offer.proposal}</p>
                      </div>

                      {/* Portfolio link if any */}
                      {offer.portfolio_samples && offer.portfolio_samples.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-semibold">Portfolio Sample:</span>
                          {offer.portfolio_samples.map((sample, idx) => (
                            <a
                              key={idx}
                              href={sample.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-bold inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md"
                            >
                              {sample.title} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Offer Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-bold">
                            <Link to={`/businesses/${offer.business_slug}`}>
                              <Building2 className="w-3.5 h-3.5 mr-1" /> View Business Profile
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-bold text-primary">
                            <Link to="/dashboard/messages">
                              <MessageCircle className="w-3.5 h-3.5 mr-1" /> Message
                            </Link>
                          </Button>
                        </div>

                        {/* Accept Offer Action */}
                        {!isAwarded && isOwner && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedOfferToAward(offer)}
                            className="h-8 font-extrabold text-xs shadow-md gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept Offer & Award
                          </Button>
                        )}

                        {isThisAccepted && (
                          <Badge className="bg-purple-600 text-white font-extrabold text-xs px-3 py-1">
                            ✓ Accepted & Awarded
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Modal to Accept Offer */}
        <Dialog open={Boolean(selectedOfferToAward)} onOpenChange={(v) => { if (!v) setSelectedOfferToAward(null); }}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-card border border-border space-y-4">
            <DialogHeader>
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-center text-foreground">
                Accept This Offer?
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                Once you accept, this request will be officially awarded to{" "}
                <span className="font-extrabold text-foreground">{selectedOfferToAward?.business_name}</span>. Other providers will no longer be able to submit new offers.
              </DialogDescription>
            </DialogHeader>

            {selectedOfferToAward && (
              <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Agreed Price:</span>
                  <span className="font-black text-emerald-600 text-sm">₦{selectedOfferToAward.proposed_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Delivery Time:</span>
                  <span className="font-bold text-foreground">{selectedOfferToAward.delivery_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Provider:</span>
                  <span className="font-bold text-foreground">{selectedOfferToAward.business_name}</span>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedOfferToAward(null)}
                className="w-full sm:w-1/2 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAwardOffer}
                disabled={isAwarding}
                className="w-full sm:w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-md gap-2"
              >
                {isAwarding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Awarding...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" /> Confirm & Award
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
