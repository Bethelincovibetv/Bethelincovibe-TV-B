import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Coins, MapPin, CheckCircle2, Loader2, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { awardOfferAndCloseOpportunity, completeRequest, getOffersForRequest, getRequestById, subscribeToRequest } from "@/services/opportunityMatchingRealtimeService";
import { BusinessRequest, ProviderOffer } from "@/types/opportunityMatching";
import { toast } from "sonner";

export default function CustomerRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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
    try { const result = await awardOfferAndCloseOpportunity({ requestId: request.id, offerId: offer.id, customerUserId: user.id }); setRequest(result.request); setOffers(await getOffersForRequest(request.id)); toast.success(`Request awarded to ${offer.business_name}.`); }
    catch (e: any) { toast.error(e?.message || "Could not award this offer."); }
    finally { setBusy(null); }
  };

  const complete = async () => {
    if (!request || !user) return;
    setBusy("complete");
    try { setRequest(await completeRequest(request.id, user.id)); toast.success("Project marked completed."); }
    catch (e: any) { toast.error(e?.message || "Could not complete request."); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="container mx-auto py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!request) return <div className="container mx-auto py-20 text-center space-y-3"><h2 className="text-xl font-bold">Request not found</h2><Button asChild><Link to="/dashboard/my-requests">Back to My Requests</Link></Button></div>;

  return <><Helmet><title>{request.service_title} | Request</title></Helmet><div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
    <Button variant="ghost" asChild><Link to="/dashboard/my-requests">← Back to My Requests</Link></Button>
    <Card className="p-6 rounded-3xl space-y-4"><div className="flex flex-col sm:flex-row justify-between gap-4"><div><Badge>{request.category}</Badge><h1 className="text-2xl font-black mt-2">{request.service_title}</h1></div><Badge variant="outline">{request.status}</Badge></div><p className="text-sm italic">"{request.raw_prompt}"</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs"><div className="bg-muted/50 rounded-xl p-3"><Coins className="w-4 h-4 inline mr-1" /><b>Budget</b><div className="font-bold mt-1">{request.budget_formatted}</div></div><div className="bg-muted/50 rounded-xl p-3"><Clock className="w-4 h-4 inline mr-1" /><b>Deadline</b><div className="font-bold mt-1">{request.deadline}</div></div><div className="bg-muted/50 rounded-xl p-3"><MapPin className="w-4 h-4 inline mr-1" /><b>Location</b><div className="font-bold mt-1">{request.location_preference}</div></div></div></Card>
    <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Provider Offers ({offers.length})</h2>{request.status === "AWARDED" && <Button onClick={complete} disabled={busy === "complete"}>{busy === "complete" ? "Completing…" : "Mark Completed"}</Button>}</div>
    {offers.length === 0 ? <Card className="p-10 text-center text-sm text-muted-foreground rounded-3xl">Waiting for provider offers. New offers will appear here automatically.</Card> : <div className="space-y-3">{offers.map(offer => <Card key={offer.id} className="p-5 rounded-2xl"><div className="flex flex-col sm:flex-row justify-between gap-3"><div><h3 className="font-extrabold">{offer.business_name}</h3><p className="text-xs text-muted-foreground">{offer.business_category} · {offer.delivery_time}</p></div><div className="text-right"><div className="text-lg font-black text-emerald-600">₦{offer.proposed_price.toLocaleString()}</div><Badge variant="outline">{offer.status}</Badge></div></div><p className="text-sm mt-3">{offer.proposal}</p>{offer.status === "submitted" && request.status !== "AWARDED" && <Button className="mt-4" onClick={() => award(offer)} disabled={busy === offer.id}><Award className="w-4 h-4 mr-2" />{busy === offer.id ? "Awarding…" : "Accept & Award"}</Button>}{offer.status === "accepted" && <div className="mt-3 text-sm font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4 inline mr-1" />Accepted</div>}</Card>)}</div>}
  </div></>;
}
