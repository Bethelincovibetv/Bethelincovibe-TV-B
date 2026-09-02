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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Clock,
  Coins,
  MapPin,
  Send,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Star,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllRequests,
  getAllOffers,
  submitProviderOffer,
} from "@/services/opportunityMatchingService";
import { BusinessRequest, ProviderOffer } from "@/types/opportunityMatching";
import { toast } from "sonner";

export default function ProviderOpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [userOffer, setUserOffer] = useState<ProviderOffer | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");

  // Offer Form States
  const [proposedPrice, setProposedPrice] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState<string>("24-48 Hours");
  const [proposal, setProposal] = useState<string>("");
  const [portfolioLink, setPortfolioLink] = useState<string>("");
  const [clarification, setClarification] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadOpportunity();
    loadUserBusinesses();
  }, [id, user]);

  const loadOpportunity = () => {
    if (!id) return;
    const all = getAllRequests();
    const found = all.find((r) => r.id === id);
    if (found) {
      setRequest(found);
      if (found.budget) {
        setProposedPrice(found.budget.toString());
      }
      const allOffers = getAllOffers();
      if (user) {
        const existing = allOffers.find((o) => o.request_id === id && o.provider_user_id === user.id);
        if (existing) setUserOffer(existing);
      }
    }
  };

  const loadUserBusinesses = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, slug, logo_url, featured, category_id, categories(name)")
        .eq("submitted_by", user.id);

      if (data && data.length > 0) {
        setUserBusinesses(data);
        setSelectedBusinessId(data[0].id);
      } else {
        // Fallback profile as provider business
        const defaultBiz = {
          id: `biz_${user.id}`,
          name: user.user_metadata?.display_name || user.user_metadata?.full_name || "Verified Professional",
          slug: `provider-${user.id.slice(0, 8)}`,
          logo_url: user.user_metadata?.avatar_url,
          featured: true,
          categories: { name: "Professional Services" },
        };
        setUserBusinesses([defaultBiz]);
        setSelectedBusinessId(defaultBiz.id);
      }
    } catch {
      // Fallback
      const defaultBiz = {
        id: `biz_${user.id}`,
        name: user.user_metadata?.display_name || "Verified Business Provider",
        slug: `provider-${user.id.slice(0, 8)}`,
        featured: true,
        categories: { name: "General Services" },
      };
      setUserBusinesses([defaultBiz]);
      setSelectedBusinessId(defaultBiz.id);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!user) {
      toast.error("Please log in or register to submit an offer.");
      navigate(`/login?redirect=/dashboard/opportunities/${request.id}`);
      return;
    }

    const priceNum = parseFloat(proposedPrice.replace(/[,₦n]/g, ""));
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid proposed price in Naira (₦).");
      return;
    }

    if (!proposal.trim() || proposal.trim().length < 15) {
      toast.error("Please provide a brief proposal (at least 15 characters) explaining how you will deliver this work.");
      return;
    }

    const biz = userBusinesses.find((b) => b.id === selectedBusinessId) || userBusinesses[0];

    setIsSubmitting(true);
    try {
      const offer = await submitProviderOffer({
        requestId: request.id,
        providerUserId: user.id,
        providerName: user.user_metadata?.display_name || biz?.name || "Professional",
        providerAvatar: user.user_metadata?.avatar_url,
        businessId: biz?.id || `biz_${user.id}`,
        businessName: biz?.name || "Verified Provider",
        businessSlug: biz?.slug || "provider",
        businessLogoUrl: biz?.logo_url,
        businessCategory: biz?.categories?.name || request.category,
        isVerified: true,
        proposedPrice: priceNum,
        deliveryTime: deliveryTime.trim() || "Within 48 Hours",
        proposal: proposal.trim(),
        portfolioSamples: portfolioLink.trim() ? [{ title: "Portfolio Reference", url: portfolioLink.trim() }] : [],
        clarificationQuestion: clarification.trim() || undefined,
      });

      setUserOffer(offer);
      loadOpportunity();
      toast.success("🚀 Offer submitted! The customer has received your proposal.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Opportunity not found</h2>
        <Button asChild>
          <Link to="/dashboard/opportunities">Back to Opportunities Hub</Link>
        </Button>
      </div>
    );
  }

  const isClosed = request.status === "AWARDED" || request.status === "COMPLETED" || request.status === "CANCELLED";

  return (
    <>
      <Helmet>
        <title>{request.service_title} | Opportunity Detail</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="text-xs font-bold gap-1 pl-0">
            <Link to="/dashboard/opportunities">
              <ChevronLeft className="w-4 h-4" /> Back to Opportunities Hub
            </Link>
          </Button>

          <Badge variant="outline" className="text-xs font-semibold">
            {request.offers_count || 0} Offers Submitted
          </Badge>
        </div>

        {/* Opportunity Card */}
        <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                  {request.category}
                </Badge>
                {request.urgency === "urgent" && (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs font-bold">
                    ⚡ Urgent
                  </Badge>
                )}
                {isClosed && (
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 text-xs font-bold">
                    Job Awarded
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {request.service_title}
              </h1>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-right shrink-0">
              <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase">Customer Budget</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {request.budget_formatted}
              </div>
            </div>
          </div>

          {/* Quick Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
              <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Deadline Required
              </div>
              <div className="text-sm font-extrabold text-foreground mt-0.5">{request.deadline}</div>
            </div>

            <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
              <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" /> Location Preference
              </div>
              <div className="text-sm font-extrabold text-foreground mt-0.5">{request.location_preference}</div>
            </div>

            <div className="bg-muted/50 p-3 rounded-xl border border-border/60 col-span-2 sm:col-span-1">
              <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" /> Project Scope
              </div>
              <div className="text-sm font-extrabold text-foreground mt-0.5">{request.purpose}</div>
            </div>
          </div>

          {/* Customer Description */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Client Brief:
            </div>
            <p className="text-sm text-foreground/90 italic bg-muted/30 p-4 rounded-xl border border-border/50">
              "{request.raw_prompt}"
            </p>

            {request.specific_requirements.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground">Client Deliverables:</div>
                <ul className="space-y-1 text-xs text-foreground/90">
                  {request.specific_requirements.map((req, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Existing Submitted Offer Banner */}
        {userOffer && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                  You Have Submitted an Offer
                </h3>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                {userOffer.status === "accepted" ? "🎉 Accepted & Awarded!" : "Offer Active"}
              </Badge>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Your Price Quote:</span>
                <span className="font-extrabold text-emerald-600 text-sm">₦{userOffer.proposed_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Turnaround Time:</span>
                <span className="font-bold text-foreground">{userOffer.delivery_time}</span>
              </div>
              <div className="pt-1 text-foreground/90">
                <span className="text-muted-foreground font-semibold">Proposal: </span>
                {userOffer.proposal}
              </div>
            </div>
          </div>
        )}

        {/* Offer Submission Form */}
        {!userOffer && !isClosed && (
          <form onSubmit={handleSubmitOffer} className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Submit Your Proposal & Price
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Proposed Price (₦) *</Label>
                <Input
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  placeholder="e.g. 20000"
                  className="h-10 text-sm font-bold"
                  required
                />
                <span className="text-[10px] text-muted-foreground">Customer budget: {request.budget_formatted}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Delivery / Turnaround Time *</Label>
                <Input
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="e.g. 24 Hours, 2 Days, Friday afternoon"
                  className="h-10 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Proposal & Value Pitch *</Label>
              <Textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Explain why you're the best fit, what is included in your delivery, and any relevant experience..."
                className="min-h-[100px] text-xs resize-none rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Portfolio / Work Sample Link (Optional)</Label>
                <Input
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://behance.net/sample or website url"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Clarification Question (Optional)</Label>
                <Input
                  value={clarification}
                  onChange={(e) => setClarification(e.target.value)}
                  placeholder="e.g. Do you have existing brand colors?"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-extrabold text-sm shadow-md gap-2 rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Offer...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Offer to Customer
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
