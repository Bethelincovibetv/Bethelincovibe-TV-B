import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Loader2 } from "lucide-react";

export default function BusinessChatDialog({
  businessId,
  businessName,
  serviceTitle,
  trigger,
}: {
  businessId: string;
  businessName: string;
  serviceTitle?: string;
  trigger?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    serviceTitle ? `Hi, I'm interested in your "${serviceTitle}" service. ` : ""
  );

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Please enter your name and a message");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("business_messages").insert({
      business_id: businessId,
      service_title: serviceTitle || null,
      sender_user_id: user?.id || null,
      sender_name: name.trim(),
      sender_email: email.trim() || null,
      sender_phone: phone.trim() || null,
      message: message.trim(),
    });
    // record event (best-effort)
    supabase.from("business_events").insert({ business_id: businessId, type: "chat_message" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Message sent — the business will get back to you.");
      setOpen(false);
      setMessage(serviceTitle ? `Hi, I'm interested in your "${serviceTitle}" service. ` : "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="secondary" className="gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {serviceTitle ? `Inquire about: ${serviceTitle}` : `Chat with ${businessName}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Your name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send message
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
