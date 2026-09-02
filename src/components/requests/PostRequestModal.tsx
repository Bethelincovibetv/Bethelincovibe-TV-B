import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseNaturalRequest } from "@/services/aiRequestParserService";
import { createAndPublishRequest } from "@/services/opportunityMatchingRealtimeService";
import { toast } from "sonner";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; initialPrompt?: string; defaultCategory?: string; }

export default function PostRequestModal({ open, onOpenChange, initialPrompt = "", defaultCategory }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [result, setResult] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => { if (open && initialPrompt) setPrompt(initialPrompt); }, [open, initialPrompt]);

  const analyze = async () => {
    if (prompt.trim().length < 5) { toast.error("Please describe what you need."); return; }
    setIsAnalyzing(true);
    try { const info = await parseNaturalRequest(prompt.trim()); setExtracted(defaultCategory ? { ...info, category: defaultCategory } : info); }
    catch (e) { toast.error("Could not understand the request. Please try again."); }
    finally { setIsAnalyzing(false); }
  };

  const publish = async () => {
    if (!user) { toast.error("Please log in to publish a request."); navigate(`/login?redirect=/dashboard/my-requests`); return; }
    if (!extracted) return;
    setIsSubmitting(true);
    try {
      const { request, matchedCandidates } = await createAndPublishRequest({
        userId: user.id,
        userName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
        userAvatar: user.user_metadata?.avatar_url,
        userPhone: user.user_metadata?.phone,
        userEmail: user.email,
        rawPrompt: prompt.trim(),
        extractedInfo: extracted,
      });
      setResult({ id: request.id, count: matchedCandidates.length });
      toast.success("Request published successfully.");
    } catch (e: any) { toast.error(e?.message || "Failed to publish request."); }
    finally { setIsSubmitting(false); }
  };

  const reset = () => { setPrompt(""); setExtracted(null); setResult(null); };

  return <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
    <DialogContent className="max-w-xl rounded-2xl">
      <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl font-extrabold"><Sparkles className="w-5 h-5 text-primary" /> Smart Business Request</DialogTitle><DialogDescription>Tell us what you need. We match the request against real active businesses and notify only the matched providers.</DialogDescription></DialogHeader>
      {result ? <div className="py-6 text-center space-y-4"><CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" /><h3 className="text-xl font-extrabold">Request is Live 🎉</h3><p className="text-sm text-muted-foreground">Your request is stored in the shared database and {result.count} matched provider(s) were notified.</p><Button onClick={() => { onOpenChange(false); navigate(`/dashboard/my-requests/${result.id}`); }} className="font-bold">View Request & Offers</Button></div> : <>
        {!extracted ? <div className="space-y-3"><Label className="font-bold">What are you looking for?</Label><Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Example: I need a professional flyer for my Lagos business before Friday. My budget is ₦20,000." className="min-h-36 rounded-xl" /><Button onClick={analyze} disabled={isAnalyzing || !prompt.trim()} className="w-full font-bold">{isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Understanding…</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze Request</>}</Button></div> : <div className="space-y-4"><div className="rounded-xl border bg-muted/30 p-4 space-y-2"><div className="flex items-center gap-2"><Badge>{extracted.category}</Badge></div><h3 className="font-extrabold text-lg">{extracted.serviceTitle}</h3><p className="text-sm text-muted-foreground">{extracted.purpose}</p><div className="grid grid-cols-2 gap-2 text-xs"><div><span className="text-muted-foreground">Budget:</span> <b>{extracted.budgetFormatted}</b></div><div><span className="text-muted-foreground">Deadline:</span> <b>{extracted.deadline}</b></div><div className="col-span-2"><span className="text-muted-foreground">Location:</span> <b>{extracted.locationPreference}</b></div></div></div><Button variant="outline" onClick={() => setExtracted(null)} disabled={isSubmitting}>Edit Request</Button></div>}
      </>}
      {!result && extracted && <DialogFooter><Button onClick={publish} disabled={isSubmitting} className="font-extrabold">{isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…</> : <><Building2 className="w-4 h-4 mr-2" /> Publish & Match Providers</>}</Button></DialogFooter>}
    </DialogContent>
  </Dialog>;
}
