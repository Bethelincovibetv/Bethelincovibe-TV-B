import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Mail, Calendar, CheckCircle2, Loader2, Sparkles, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { recordBusinessLead } from "@/lib/leadCaptureEngine";
import { createServiceBooking } from "@/services/serviceManagementService";

interface DirectServiceBookingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  businessId: string;
  businessName: string;
  ownerUserId?: string;
  serviceTitle?: string;
  servicePrice?: string;
  serviceImageUrl?: string;
  businessPhone?: string | null;
  businessWhatsApp?: string | null;
  businessEmail?: string | null;
}

export default function DirectServiceBookingDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  businessId,
  businessName,
  ownerUserId,
  serviceTitle,
  servicePrice,
  serviceImageUrl,
  businessPhone,
  businessWhatsApp,
  businessEmail,
}: DirectServiceBookingDialogProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState(
    serviceTitle
      ? `Hello ${businessName}, I would like to book / inquire about your "${serviceTitle}" service.`
      : `Hello ${businessName}, I am interested in your services and would like to request a quote / booking.`
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const cleanPhone = (businessPhone || businessWhatsApp || "").replace(/\D/g, "");
  const cleanWhatsApp = (businessWhatsApp || businessPhone || "").replace(/\D/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      toast.error("Please provide your name and contact phone or email");
      return;
    }

    setSubmitting(true);
    try {
      if (ownerUserId) {
        await Promise.allSettled([
          recordBusinessLead({
            userId: ownerUserId,
            businessId,
            businessName,
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            serviceTitle: serviceTitle || "General Service Booking",
            message: `${message}${date ? ` | Preferred Date: ${date}` : ""}`,
            source: "service_booking",
          }),
          createServiceBooking({
            providerUserId: ownerUserId,
            businessId,
            businessName,
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            serviceTitle: serviceTitle || "General Service Booking",
            servicePrice,
            preferredDate: date,
            message: `${message}${date ? ` | Preferred Date: ${date}` : ""}`,
            source: "directory_booking",
          }),
        ]);
      }

      setSuccess(true);
      toast.success("✨ Your booking inquiry was submitted! The provider will contact you shortly.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit booking inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppDirect = async () => {
    if (!cleanWhatsApp) {
      toast.info("WhatsApp contact is not configured for this business yet.");
      return;
    }

    // Auto-record lead when user clicks direct WhatsApp
    if (ownerUserId) {
      recordBusinessLead({
        userId: ownerUserId,
        businessId,
        businessName,
        customerName: name || user?.user_metadata?.full_name || "WhatsApp Client",
        customerPhone: phone || "Direct WhatsApp Client",
        customerEmail: email,
        serviceTitle: serviceTitle || "WhatsApp Direct Inquiry",
        message: `Customer initiated WhatsApp chat for "${serviceTitle || businessName}"`,
        source: "whatsapp_click",
      }).catch(console.warn);
    }

    const text = encodeURIComponent(
      `Hello ${businessName}! I found your listing on Bethelincovibe TV.${
        serviceTitle ? ` I am inquiring about your service: *${serviceTitle}*${servicePrice ? ` (${servicePrice})` : ""}.` : ""
      } My name is ${name || "a prospective client"}. Please let me know your availability.`
    );
    window.open(`https://wa.me/${cleanWhatsApp}?text=${text}`, "_blank");
  };

  const handlePhoneCallDirect = () => {
    if (!cleanPhone) {
      toast.info("Phone number is not available for this business.");
      return;
    }

    if (ownerUserId) {
      recordBusinessLead({
        userId: ownerUserId,
        businessId,
        businessName,
        customerName: name || user?.user_metadata?.full_name || "Phone Caller",
        customerPhone: cleanPhone,
        serviceTitle: serviceTitle || "Phone Direct Call",
        message: `Customer clicked to call business for "${serviceTitle || businessName}"`,
        source: "call_click",
      }).catch(console.warn);
    }

    window.location.href = `tel:${cleanPhone}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg w-[calc(100vw-1.5rem)] max-h-[min(92dvh,840px)] flex flex-col p-0 rounded-3xl overflow-hidden border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="text-left space-y-1.5 p-5 sm:p-6 pb-3 border-b shrink-0 bg-card/90 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
              <Sparkles className="h-3 w-3 mr-1" /> Verified Booking
            </Badge>
            {servicePrice && (
              <Badge variant="outline" className="font-black text-emerald-600 border-emerald-500/30 text-xs">
                {servicePrice}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground">
            {serviceTitle ? `Book Service: ${serviceTitle}` : `Contact & Book with ${businessName}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            Directly connect with <strong className="text-foreground font-semibold">{businessName}</strong>. Your request is automatically routed to their priority leads queue.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 px-6 text-center space-y-4 overflow-y-auto flex-1">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">Inquiry Sent Successfully!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {businessName} has received your direct booking request in their dashboard and will follow up with you directly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-3 justify-center">
              {cleanWhatsApp && (
                <Button onClick={handleWhatsAppDirect} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 rounded-xl text-xs h-10 px-4 shadow-sm">
                  <MessageCircle className="h-4 w-4" /> Continue on WhatsApp
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10 px-4">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 sm:px-6 py-4 space-y-3.5 touch-pan-y overscroll-contain">
              {serviceImageUrl && (
                <div className="aspect-[16/7] max-h-36 sm:max-h-44 w-full rounded-2xl overflow-hidden bg-muted relative shrink-0 border shadow-xs">
                  <img src={serviceImageUrl} alt={serviceTitle || businessName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <p className="absolute bottom-2 left-3 right-3 text-xs font-bold text-white drop-shadow-sm truncate">
                    {serviceTitle}
                  </p>
                </div>
              )}

              {/* Quick direct contact buttons */}
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-2xl border">
                {cleanWhatsApp ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWhatsAppDirect}
                    className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold h-9 rounded-xl gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Instant WhatsApp
                  </Button>
                ) : null}
                {cleanPhone ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePhoneCallDirect}
                    className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold h-9 rounded-xl gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call Provider
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Your Name <span className="text-rose-500">*</span></Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Your Phone / WhatsApp <span className="text-rose-500">*</span></Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    required
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Your Email (Optional)</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Preferred Date / Timeline</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Message & Requirements</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Describe your request, vehicle model, quantity, or specific location..."
                  className="text-xs rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Pinned Accessible Dialog Footer */}
            <DialogFooter className="p-3.5 sm:p-5 pt-3 border-t shrink-0 bg-muted/20 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 z-10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs h-9 gap-1.5 shadow-md flex-1 sm:flex-initial"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Confirm &amp; Send Direct Booking
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
