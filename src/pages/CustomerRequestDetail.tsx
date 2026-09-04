import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Coins, MapPin, CheckCircle2, Loader2, Award, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { awardOfferAndCloseOpportunity, completeRequest, getOffersForRequest, getRequestById, subscribeToRequest } from "@/services/opportunityMatchingRealtimeService";
import { BusinessRequest, ProviderOffer } from "@/types/opportunityMatching";
import EditRequestBudgetLocationModal from "@/components/requests/EditRequestBudgetLocationModal";
import { toast } from "sonner";

export default function CustomerRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let mounted = true;
    const load = async () => {
      try {
        const req = await getRequestById(id);
        if (!mounted) return;
        if (!req || req.user_id !== user.id) { setRequest(null); return; }
        setRequest(req);
        setOffers(await getOffersForRequest(id));
      } catch (e) { console.error(e); setRequest(null); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const channel = subscribeToRequest(id, load);
    return () => { mounted = false; void channel.unsubscribe(); };
  }, [id, user]);

  const award = async (offer: ProviderOffer) => {
    if (!request || !user) return;
    setBusy(offer.id);
    try {
      const result = await awardOfferAndCloseOpportunity({ requestId: request.id, offerId: offer.id, customerUserId: user.id });
      setRequest(result.request);
      setOffers(await getOffersForRequest(request.id));
      toast.success(`Request awarded to ${offer.business_name}.`);
    } catch (e: any) {
      toast.error(e?.message || "Could not award this offer.");
    } finally {
      setBusy(null);
    }
  };

  const complete = async () => {
    if (!request || !user) return;
    setBusy("complete");
    try {
      setRequest(await completeRequest(request.id, user.id));
      toast.success("Project marked completed.");
    } catch (e: any) {
      toast.error(e?.message || "Could not complete request.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="container mx-auto py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!request) return <div className="container mx-auto py-20 text-center space-y-3"><h2 className="text-xl font-bold">Request not found</h2><Button asChild><Link to="/dashboard/my-requests">Back to My Requests</Link></Button></div>;

  const canEdit = request.status === "OPEN" || request.status === "RECEIVING_OFFERS";

  return (
    <>
      <Helmet><title>{request.service_title} | Matchmaker Request</title></Helmet>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild><Link to="/dashboard/my-requests">← Back to My Requests</Link></Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditBudgetOpen(true)}
              className="gap-1.5 rounded-xl font-bold text-xs border-primary/40 hover:bg-primary/10 text-primary"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Edit Budget & Location (Live)
            </Button>
          )}
        </div>

        <Card className="p-6 rounded-3xl space-y-4 shadow-sm border border-border/80">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <Badge className="bg-primary/10 text-primary border-primary/20">{request.category}</Badge>
              <h1 className="text-2xl font-black mt-2 text-foreground">{request.service_title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-bold">{request.status}</Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground italic">"{request.raw_prompt}"</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
            <div className="bg-muted/50 rounded-2xl p-4 border border-border/60">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-semibold flex items-center gap-1"><Coins className="w-4 h-4 text-emerald-600" /> Budget</span>
                {canEdit && (
                  <button
                    onClick={() => setEditBudgetOpen(true)}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="text-base font-extrabold text-foreground mt-1 text-emerald-600">{request.budget_formatted}</div>
            </div>

            <div className="bg-muted/50 rounded-2xl p-4 border border-border/60">
              <div className="text-muted-foreground font-semibold flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" /> Target Timeline
              </div>
              <div className="text-sm font-bold text-foreground mt-1">{request.deadline}</div>
            </div>

            <div className="bg-muted/50 rounded-2xl p-4 border border-border/60">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-semibold flex items-center gap-1"><MapPin className="w-4 h-4 text-purple-600" /> Location</span>
                {canEdit && (
                  <button
                    onClick={() => setEditBudgetOpen(true)}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="text-sm font-bold text-foreground mt-1">{request.location_preference}</div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-extrabold text-foreground">Provider Offers ({offers.length})</h2>
          {request.status === "AWARDED" && (
            <Button onClick={complete} disabled={busy === "complete"} className="rounded-xl font-bold">
              {busy === "complete" ? "Completing…" : "Mark Completed"}
            </Button>
          )}
        </div>

        {offers.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground rounded-3xl border-dashed">
            Waiting for provider offers. New offers will appear here automatically in real time as verified businesses review your terms.
          </Card>
        ) : (
          <div className="space-y-3">
            {offers.map(offer => (
              <Card key={offer.id} className="p-5 rounded-2xl border border-border/80 hover:border-primary/40 transition-all">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-base">{offer.business_name}</h3>
                    <p className="text-xs text-muted-foreground">{offer.business_category} · {offer.delivery_time}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-600">₦{offer.proposed_price.toLocaleString()}</div>
                    <Badge variant="outline">{offer.status}</Badge>
                  </div>
                </div>
                <p className="text-sm mt-3 text-foreground/90">{offer.proposal}</p>
                {offer.status === "submitted" && request.status !== "AWARDED" && (
                  <Button className="mt-4 rounded-xl font-bold" onClick={() => award(offer)} disabled={busy === offer.id}>
                    <Award className="w-4 h-4 mr-2" />
                    {busy === offer.id ? "Awarding…" : "Accept & Award"}
                  </Button>
                )}
                {offer.status === "accepted" && (
                  <div className="mt-3 text-sm font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Awarded & In Progress
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {user && (
          <EditRequestBudgetLocationModal
            open={editBudgetOpen}
            onOpenChange={setEditBudgetOpen}
            request={request}
            userId={user.id}
            onUpdated={(updated) => setRequest(updated)}
          />
        )}
      </div>
    </>
  );
}
