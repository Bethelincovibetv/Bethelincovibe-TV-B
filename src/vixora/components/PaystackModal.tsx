import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, ShieldCheck, Loader2 } from "lucide-react";
import { PRICING_PLANS, paystackService, PlanDetails } from "../services/paystackService";
import { toast } from "sonner";

interface PaystackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  userName?: string;
  onCreditsUpdated?: (newCredits: number) => void;
}

export function PaystackModal({
  open,
  onOpenChange,
  userEmail = "creator@vixora.ai",
  userName = "Creator",
  onCreditsUpdated,
}: PaystackModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PlanDetails) => {
    if (plan.priceNgn === 0) {
      toast.info("You already have access to the Free Creator plan.");
      return;
    }

    setProcessingId(plan.id);
    try {
      await paystackService.openPaystackCheckout({
        plan,
        email: userEmail,
        name: userName,
        onSuccess: (ref) => {
          setProcessingId(null);
          const newTotal = paystackService.getStoredCredits();
          if (onCreditsUpdated) onCreditsUpdated(newTotal);
          toast.success(`Success! Added ${plan.credits} video render credits.`);
          onOpenChange(false);
        },
        onClose: () => {
          setProcessingId(null);
        },
      });
    } catch (err: any) {
      setProcessingId(null);
      toast.error(err.message || "Failed to launch Paystack checkout");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="text-center space-y-2 pb-4 border-b border-border/60">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Supercharge Your Video Creator Studio
          </DialogTitle>
          <DialogDescription className="text-sm">
            Instant high-speed 1080p MP4 renders, full voice catalog, and commercial monetization.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {PRICING_PLANS.map((plan) => {
            const isProcessing = processingId === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between border-2 transition-all duration-200 ${
                  plan.popular
                    ? "border-orange-500 shadow-xl bg-orange-500/5 dark:bg-orange-500/10"
                    : "border-border/80 bg-card hover:border-border"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white font-bold text-[11px] px-3 py-0.5">
                    MOST POPULAR
                  </Badge>
                )}

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-foreground">
                        {plan.priceNgn === 0 ? "Free" : `₦${plan.priceNgn.toLocaleString()}`}
                      </span>
                      {plan.priceNgn > 0 && <span className="text-xs text-muted-foreground">/mo</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {plan.credits} HD Render Credits
                    </p>

                    <div className="mt-4 space-y-2">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isProcessing || plan.priceNgn === 0}
                    className={`w-full h-10 font-bold text-xs rounded-xl mt-4 ${
                      plan.popular
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : plan.priceNgn === 0 ? (
                      "Current Plan"
                    ) : (
                      `Select ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Secured via Paystack 256-bit encryption · Cancel anytime</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PaystackModal;
