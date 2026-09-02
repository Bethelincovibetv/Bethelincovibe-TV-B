import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseNaturalRequest } from "@/services/aiRequestParserService";
import { createAndPublishRequest } from "@/services/opportunityMatchingRealtimeService";
import { toast } from "sonner";

export default function PostRequestModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Please log in to post a request."); return; }
    if (prompt.trim().length < 10) { toast.error("Tell us a little more about what you need."); return; }
    setIsSubmitting(true);
    try {
      const extractedInfo = await parseNaturalRequest(prompt.trim());
      const { matchedCandidates } = await createAndPublishRequest({
        userId: user.id,
        userName: user.user_metadata?.display_name || user.user_metadata?.full_name || "Customer",
        userAvatar: user.user_metadata?.avatar_url,
        userPhone: user.user_metadata?.phone,
        userEmail: user.email,
        rawPrompt: prompt.trim(),
        extractedInfo,
      });
      toast.success(`Request published. ${matchedCandidates.length} matching providers notified.`);
      setPrompt("");
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Could not publish your request.");
    } finally { setIsSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-extrabold"><Sparkles className="w-5 h-5 text-primary" /> Post What You Need</DialogTitle>
        <DialogDescription>Describe the service, product, project, budget or deadline in your own words. Smart Match will identify suitable businesses and notify only the matched providers.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Example: I need a professional flyer for my Lagos business before Friday. My budget is ₦20,000." className="min-h-40 rounded-xl" disabled={isSubmitting} />
        <p className="text-xs text-muted-foreground">Your request is stored in the shared Bethelincovibe database, so it can be opened from another device.</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={submit} disabled={isSubmitting || !prompt.trim()} className="font-extrabold">{isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…</> : "Publish Request"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
