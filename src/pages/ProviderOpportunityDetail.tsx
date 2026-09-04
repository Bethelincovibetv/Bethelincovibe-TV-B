import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Clock, Coins, MapPin, Building2, CheckCircle2, ChevronLeft, Loader2, Send, XCircle, Award, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getRequestById, getOffersForRequest, submitProviderOffer, subscribeToRequest } from "@/services/opportunityMatchingRealtimeService";
import { BusinessRequest, ProviderOffer } from "@/types/opportunityMatching";
import { toast } from "sonner";

export default function ProviderOpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [userOffer, setUserOffer] = useState<ProviderOffer | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [price, setPrice] = useState("");
  const [delivery, setDelivery] = useState("24-48 Hours");
  const [proposal, setProposal] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    let mounted = true;
    const load = async () => {
      try {
        const req = await getRequestById(id);
        if (!mounted) return;
        if (!req) { setRequest(null); return; }
        setRequest(req);
        if (req.budget != null) setPrice(String(req.budget));
        const offs = await getOffersForRequest(id);
        const own = offs.find(o => o.provider_user_id === user.id) || null;
        setUserOffer(own);
      } catch (e) { console.error(e); if (mounted) setRequest(null); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const channel = subscribeToRequest(id, load);
    return () => { mounted = false; void channel.unsubscribe(); };
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("suppliers").select("id,name,slug,logo_url,featured,categories(name)").eq("submitted_by", user.id).then(({ data }) => {
      if (data?.length) { setBusinesses(data); setBusinessId(data[0].id); }
    });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !user) return;
    const biz = businesses.find(b => b.id === businessId) || businesses[0];
    const amount = Number(price.replace(/[,₦n]/gi, ""));
    if (!biz) { toast.error("Please create/activate your business profile before submitting an offer."); return; }
    if (!amount || amount <= 0 || proposal.trim().length < 15) { toast.error("Enter a valid price and a proposal of at least 15 characters."); return; }
    setSubmitting(true);
    try {
      const offer = await submitProviderOffer({ requestId: request.id, providerUserId: user.id, providerName: user.user_metadata?.display_name || biz.name, providerAvatar: user.user_metadata?.avatar_url, businessId: biz.id, businessName: biz.name, businessSlug: biz.slug, businessLogoUrl: biz.logo_url, businessCategory: biz.categories?.name || request.category, isVerified: true, proposedPrice: amount, deliveryTime: delivery.trim(), proposal: proposal.trim(), portfolioSamples: portfolio.trim() ? [{ title: "Portfolio", url: portfolio.trim() }] : [] });
      setUserOffer(offer); toast.success("Offer submitted. The customer has been notified in realtime.");
    } catch (e: any) { toast.error(e?.message || "Could not submit offer."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="container mx-auto px-4 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!request) return <div className="container mx-auto px-4 py-20 text-center space-y-4"><h2 className="text-xl font-bold">Opportunity unavailable</h2><p className="text-sm text-muted-foreground">This request is no longer available to your account.</p><Button asChild><Link to="/dashboard/opportunities">Back to Opportunities</Link></Button></div>;
  const closed = ["AWARDED", "COMPLETED", "CANCELLED", "EXPIRED"].includes(request.status);

  return <><Helmet><title>{request.service_title} | Opportunity Detail</title></Helmet><div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
    <Button variant="ghost" size="sm" asChild><Link to="/dashboard/opportunities"><ChevronLeft className="w-4 h-4 mr-1" /> Back to Opportunities</Link></Button>
    <Card className="p-6 sm:p-8 rounded-3xl space-y-5"><div className="flex flex-col sm:flex-row justify-between gap-4"><div><Badge>{request.category}</Badge><h1 className="text-2xl sm:text-3xl font-black mt-2">{request.service_title}</h1></div><div className="bg-emerald-500/10 p-3 rounded-2xl text-right"><div className="text-[10px] font-bold uppercase text-muted-foreground">Customer Budget</div><div className="text-xl font-black text-emerald-600">{request.budget_formatted}</div></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs"><div className="bg-muted/50 p-3 rounded-xl"><Clock className="w-4 h-4 inline mr-1" /> <b>Deadline</b><div className="font-bold mt-1">{request.deadline}</div></div><div className="bg-muted/50 p-3 rounded-xl"><MapPin className="w-4 h-4 inline mr-1" /> <b>Location</b><div className="font-bold mt-1">{request.location_preference}</div></div><div className="bg-muted/50 p-3 rounded-xl"><Building2 className="w-4 h-4 inline mr-1" /> <b>Offers</b><div className="font-bold mt-1">{request.offers_count}</div></div></div>
      <div className="border-t pt-4"><p className="text-sm italic">"{request.raw_prompt}"</p>{request.specific_requirements.length > 0 && <ul className="mt-3 space-y-1 text-sm">{request.specific_requirements.map((x,i)=><li key={i}><CheckCircle2 className="w-4 h-4 inline text-emerald-500 mr-1" />{x}</li>)}</ul>}</div>
    </Card>
    {userOffer ? (
      <Card className={`p-6 rounded-3xl border shadow-sm ${
        userOffer.status === "accepted"
          ? "border-emerald-500/40 bg-emerald-500/10"
          : userOffer.status === "declined"
          ? "border-red-500/30 bg-red-500/5"
          : "border-primary/30 bg-primary/5"
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-black text-base">
            {userOffer.status === "accepted" ? (
              <>
                <Award className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400">🎉 Congratulations! Your offer was Accepted & Awarded!</span>
              </>
            ) : userOffer.status === "declined" ? (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700 dark:text-red-400">Offer Declined by Client</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>Your offer has been submitted</span>
              </>
            )}
          </div>
          <Badge variant={userOffer.status === "accepted" ? "default" : userOffer.status === "declined" ? "destructive" : "outline"} className="capitalize">
            {userOffer.status}
          </Badge>
        </div>
        <p className="text-sm font-extrabold mt-3 text-foreground">
          Proposed: ₦{userOffer.proposed_price.toLocaleString()} · {userOffer.delivery_time}
        </p>
        <p className="text-sm mt-2 text-muted-foreground whitespace-pre-line">{userOffer.proposal}</p>
      </Card>
    ) : closed ? (
      <Card className="p-8 text-center text-sm text-muted-foreground rounded-3xl border-dashed">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
        This business opportunity is closed and is no longer accepting offers.
      </Card>
    ) : (
      <form onSubmit={submit} className="bg-card border rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" /> Submit Your Offer
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Price (₦)</Label>
            <Input value={price} onChange={e=>setPrice(e.target.value)} required />
          </div>
          <div>
            <Label>Delivery Time</Label>
            <Input value={delivery} onChange={e=>setDelivery(e.target.value)} placeholder="e.g. 2 days" required />
          </div>
        </div>
        <div>
          <Label>Proposal</Label>
          <Textarea value={proposal} onChange={e=>setProposal(e.target.value)} placeholder="Explain how you will deliver the job..." className="min-h-28" required />
        </div>
        <div>
          <Label>Portfolio Link (optional)</Label>
          <Input value={portfolio} onChange={e=>setPortfolio(e.target.value)} placeholder="https://..." />
        </div>
        <Button disabled={submitting} className="w-full font-extrabold">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit Offer"}
        </Button>
      </form>
    )}
  </div></>;
}
