import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Search, CheckCircle2, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";

type Recipient = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; email: string };

const SUCCESS_SOUND =
  "data:audio/wav;base64,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";

export default function TransferDialog({ open, onOpenChange, currentBalance, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; currentBalance: number; onSuccess: () => void }) {
  const [step, setStep] = useState<"find" | "confirm" | "success">("find");
  const [email, setEmail] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [nameCheck, setNameCheck] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastAmount, setLastAmount] = useState(0);

  const reset = () => {
    setStep("find"); setEmail(""); setRecipient(null); setAmount(""); setNote(""); setNameCheck(""); setConfirmed(false); setLoading(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) setTimeout(reset, 200);
    onOpenChange(v);
  };

  const recipientName = recipient?.display_name || recipient?.username || recipient?.email || "";

  const lookup = async () => {
    if (!email.trim()) { toast.error("Enter recipient email"); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("lookup_user_by_email", { _email: email.trim() });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (!data || data.length === 0) { toast.error("No user found with that email"); return; }
    setRecipient(data[0] as Recipient);
  };

  const proceed = () => {
    const amt = Number(amount);
    if (!amt || amt < 100) { toast.error("Minimum transfer is ₦100"); return; }
    if (amt > currentBalance) { toast.error("Amount exceeds your balance"); return; }
    setStep("confirm");
  };

  const submit = async () => {
    if (!recipient) return;
    if (nameCheck.trim().toLowerCase() !== recipientName.trim().toLowerCase()) {
      toast.error("Recipient name doesn't match"); return;
    }
    if (!confirmed) { toast.error("Please confirm the transfer"); return; }
    const amt = Number(amount);
    setLoading(true);
    const { data, error } = await supabase.rpc("transfer_wallet", { _recipient_email: recipient.email, _amount: amt, _note: note || null });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const result = data as any;
    if (!result?.success) { toast.error(result?.error || "Transfer failed"); return; }

    setLastAmount(amt);
    setStep("success");
    try { new Audio(SUCCESS_SOUND).play().catch(() => {}); } catch {}
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#a855f7", "#ec4899", "#22c55e", "#facc15"] });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "find" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Send Money</DialogTitle>
              <DialogDescription>Transfer instantly to another user by email.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient email</Label>
                <div className="flex gap-2">
                  <Input type="email" placeholder="friend@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setRecipient(null); }} />
                  <Button type="button" variant="outline" onClick={lookup} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {recipient && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={recipient.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{recipientName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate flex items-center gap-1">{recipientName} <CheckCircle2 className="h-4 w-4 text-emerald-500" /></p>
                    <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                  </div>
                </div>
              )}

              {recipient && (
                <>
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input type="number" min={100} step={100} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Available: ₦{currentBalance.toLocaleString()}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[500, 1000, 2000, 5000].map((v) => (
                        <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(String(v))}>₦{v.toLocaleString()}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea rows={2} placeholder="What's this for?" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <Button onClick={proceed} className="w-full" size="lg">
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {step === "confirm" && recipient && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-500" />Verify Transfer</DialogTitle>
              <DialogDescription>Double-check before sending — transfers are final.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center p-5 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <p className="text-xs opacity-90">You're sending</p>
                <p className="text-4xl font-extrabold my-1">₦{Number(amount).toLocaleString()}</p>
                <p className="text-sm opacity-90">to <span className="font-semibold">{recipientName}</span></p>
                <p className="text-[11px] opacity-75 mt-0.5">{recipient.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Type recipient's name to confirm</Label>
                <Input placeholder={recipientName} value={nameCheck} onChange={(e) => setNameCheck(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">This protects against accidental transfers.</p>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} className="mt-0.5" />
                <span className="text-sm">I confirm sending <strong>₦{Number(amount).toLocaleString()}</strong> to <strong>{recipientName}</strong>. This cannot be reversed.</span>
              </label>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("find")} disabled={loading}>Back</Button>
                <Button className="flex-1" onClick={submit} disabled={loading || !confirmed}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Sending</> : <><Send className="h-4 w-4 mr-1" />Send Now</>}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "success" && recipient && (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-50 fade-in">
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-in zoom-in-50" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Transfer Successful!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ₦{lastAmount.toLocaleString()} sent to <strong>{recipientName}</strong>
              </p>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
