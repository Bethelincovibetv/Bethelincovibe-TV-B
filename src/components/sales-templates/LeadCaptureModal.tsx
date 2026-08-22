import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";

const Schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

interface Props {
  salesPageId: string;
  ownerUserId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctaText?: string;
}

export default function LeadCaptureModal({ salesPageId, ownerUserId, productName, open, onOpenChange, ctaText }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      const err = parsed.error.flatten().fieldErrors;
      toast.error(Object.values(err)[0]?.[0] || "Check your details");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("sales_page_leads").insert({
      sales_page_id: salesPageId,
      user_id: ownerUserId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      message: parsed.data.message || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success("We received your enquiry!");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setDone(false); setForm({ name: "", phone: "", email: "", message: "" }); } }}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="text-center py-6 space-y-3">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold">You're in!</h3>
            <p className="text-sm text-muted-foreground">The seller will reach out to you very soon.</p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{ctaText || "I Am Interested"}</DialogTitle>
              <DialogDescription>Drop your details and we'll get back to you about <b>{productName}</b>.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Full name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" /></div>
              <div><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
              <div><Label>Message / enquiry</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell the seller what you need" /></div>
              <Button onClick={submit} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send my enquiry
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
