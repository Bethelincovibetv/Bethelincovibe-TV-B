import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Users,
  Eye,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { PromotionPackage, formatNaira } from "@/services/packageService";
import { WhatsAppCommunity } from "@/services/communityService";
import { PromoterProfile } from "@/services/promoterService";
import { createPromotionOrder, PromotionOrder } from "@/services/promotionOrderService";
import { useToast } from "@/hooks/use-toast";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: PromotionPackage | null;
  community?: WhatsAppCommunity | null;
  promoter?: PromoterProfile | null;
  onOrderCreated?: (order: PromotionOrder) => void;
}

export const BookingDialog: React.FC<BookingDialogProps> = ({
  open,
  onOpenChange,
  pkg,
  community,
  promoter,
  onOrderCreated,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [promotionBrief, setPromotionBrief] = useState("");
  const [creativeUrls, setCreativeUrls] = useState<string[]>([""]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<PromotionOrder | null>(null);

  if (!pkg) return null;

  const targetCommunity = community || pkg.community;
  const targetPromoter = promoter || pkg.promoter;

  const handleAddUrl = () => {
    setCreativeUrls([...creativeUrls, ""]);
  };

  const handleUrlChange = (index: number, val: string) => {
    const updated = [...creativeUrls];
    updated[index] = val;
    setCreativeUrls(updated);
  };

  const handleRemoveUrl = (index: number) => {
    const updated = creativeUrls.filter((_, idx) => idx !== index);
    setCreativeUrls(updated.length > 0 ? updated : [""]);
  };

  const handleNextToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotionBrief.trim()) {
      setError("Please describe what you want the promoter to broadcast in the promotion brief.");
      return;
    }
    if (promotionBrief.trim().length < 10) {
      setError("Promotion brief must be at least 10 characters long.");
      return;
    }
    setError(null);
    setStep("review");
  };

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    setError(null);

    const validUrls = creativeUrls
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const result = await createPromotionOrder({
      packageId: pkg.id,
      promoterId: pkg.promoter_id,
      communityId: pkg.community_id,
      promotionBrief: promotionBrief.trim(),
      creativeAssetsUrls: validUrls.length > 0 ? validUrls : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error || !result.order) {
      setError(result.error || "Failed to create promotion order. Please try again.");
      toast({
        title: "Order Creation Failed",
        description: result.error || "Please check your inputs and try again.",
        variant: "destructive",
      });
      return;
    }

    setCreatedOrder(result.order);
    setStep("success");
    if (onOrderCreated) {
      onOrderCreated(result.order);
    }
    toast({
      title: "Promotion Order Created",
      description: `Order ${result.order.order_reference} created successfully. Payment required.`,
    });
  };

  const handleClose = () => {
    setStep("form");
    setPromotionBrief("");
    setCreativeUrls([""]);
    setSpecialInstructions("");
    setError(null);
    setCreatedOrder(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl w-[calc(100vw-1.5rem)] max-h-[min(92dvh,850px)] flex flex-col p-0 rounded-3xl overflow-hidden border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        {step === "form" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="p-5 sm:p-6 pb-3 border-b shrink-0 bg-card/90 backdrop-blur-xs z-10 text-left">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold text-primary border-primary/30">
                  Step 6 • Booking Request
                </Badge>
              </div>
              <DialogTitle className="text-xl font-extrabold text-foreground mt-1">
                Book Promotion with {targetPromoter?.display_name || "Promoter"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Specify your campaign details, campaign brief, and promotional materials.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleNextToReview} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden flex-1 p-5 sm:p-6 space-y-4 touch-pan-y overscroll-contain">
                {/* Selected Package & Audience Summary */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground line-clamp-1">{pkg.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{pkg.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-primary">{formatNaira(pkg.price)}</span>
                      <span className="text-[10px] text-muted-foreground block">{pkg.duration_hours}h duration</span>
                    </div>
                  </div>

                  {targetCommunity && (
                    <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        {targetCommunity.name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {targetCommunity.member_count.toLocaleString()} members
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Promotion Brief */}
                <div className="space-y-1.5">
                  <Label htmlFor="promo-brief" className="text-xs font-bold text-foreground">
                    Promotion Brief <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="promo-brief"
                    placeholder="e.g., Promote our new Lagos shoe boutique launch. Highlight 20% discount on all sneakers with link to our WhatsApp catalog."
                    value={promotionBrief}
                    onChange={(e) => setPromotionBrief(e.target.value)}
                    rows={4}
                    required
                    className="rounded-xl text-xs resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Provide clear instructions on what the promoter should post and highlight.
                  </p>
                </div>

                {/* Creative Assets URLs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Creative Assets / Flyer URLs (Optional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddUrl}
                      className="h-6 text-xs text-primary font-bold px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add URL
                    </Button>
                  </div>

                  {creativeUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/banner-flyer.png or drive link"
                        value={url}
                        onChange={(e) => handleUrlChange(idx, e.target.value)}
                        className="rounded-xl text-xs"
                      />
                      {creativeUrls.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUrl(idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                <div className="space-y-1.5">
                  <Label htmlFor="special-instructions" className="text-xs font-bold text-foreground">
                    Special Instructions (Optional)
                  </Label>
                  <Textarea
                    id="special-instructions"
                    placeholder="e.g., Please post between 2:00 PM and 5:00 PM West Africa Time."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={2}
                    className="rounded-xl text-xs resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="p-3.5 sm:p-5 pt-3 border-t shrink-0 bg-muted/20 flex flex-row items-center justify-between gap-2 z-10">
                <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl text-xs font-bold gap-1.5 h-9">
                  <span>Review Order</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="p-5 sm:p-6 pb-3 border-b shrink-0 bg-card/90 backdrop-blur-xs z-10 text-left">
              <Badge variant="outline" className="w-fit text-[11px] font-bold text-amber-600 border-amber-500/30 mb-1">
                Order Review
              </Badge>
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Review Promotion Order
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please verify your promotion details before creating the order.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto overflow-x-hidden flex-1 p-5 sm:p-6 space-y-4 touch-pan-y overscroll-contain">
              {error && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              {/* Order Summary Card */}
              <Card className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Promoter</span>
                  <span className="font-bold text-foreground">{targetPromoter?.display_name || "Verified Promoter"}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Target Audience</span>
                  <span className="font-bold text-foreground">{targetCommunity?.name || "WhatsApp Community"}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Selected Package</span>
                  <span className="font-bold text-foreground">{pkg.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Broadcast Duration</span>
                  <span className="font-bold text-foreground">{pkg.duration_hours} Hours</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-bold text-foreground">Agreed Price</span>
                  <span className="text-lg font-extrabold text-primary">{formatNaira(pkg.price)}</span>
                </div>
              </Card>

              {/* Campaign Brief Preview */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground block">Promotion Brief</span>
                <p className="text-xs text-foreground leading-relaxed italic">"{promotionBrief}"</p>
              </div>

              {/* Notice Banner */}
              <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Status: Payment Required
                  </AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Creating this order registers your booking request. You can complete payment seamlessly via Paystack or wallet balance to begin the promotion.
                  </AlertDescription>
                </div>
              </Alert>
            </div>

            <DialogFooter className="p-3.5 sm:p-5 pt-3 border-t shrink-0 bg-muted/20 flex flex-row items-center justify-between gap-2 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isSubmitting}
                className="rounded-xl text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-9"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Create Order — Payment Required</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "success" && createdOrder && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="overflow-y-auto overflow-x-hidden flex-1 p-6 text-center space-y-4 touch-pan-y overscroll-contain">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-foreground">Promotion Order Created!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Your booking request has been successfully registered.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Order Reference</span>
                  <span className="font-mono font-extrabold text-primary">{createdOrder.order_reference}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Payment Required
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">{formatNaira(createdOrder.amount)}</span>
                </div>
              </div>

              <Alert className="bg-primary/5 border-primary/20 text-primary-900 dark:text-primary-100 rounded-2xl text-left max-w-md mx-auto">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <AlertTitle className="text-xs font-bold text-primary">Next Steps</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Promotion will commence once payment is processed in Step 7. You can monitor your booking in your dashboard.
                  </AlertDescription>
                </div>
              </Alert>
            </div>

            <div className="p-4 sm:p-5 pt-3 border-t shrink-0 bg-muted/20 flex flex-col sm:flex-row items-center justify-center gap-2 z-10">
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto text-xs rounded-xl h-9"
              >
                Back to Marketplace
              </Button>
              <Button
                onClick={() => {
                  handleClose();
                  navigate(`/dashboard/promotion-orders/${createdOrder.id}`);
                }}
                className="w-full sm:w-auto text-xs font-bold rounded-xl h-9"
              >
                <span>View Order Details</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
