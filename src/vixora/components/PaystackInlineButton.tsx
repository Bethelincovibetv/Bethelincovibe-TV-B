import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles, Loader2 } from "lucide-react";
import { paystackService, PRICING_PLANS } from "../services/paystackService";
import { toast } from "sonner";

interface PaystackInlineButtonProps {
  planId?: string;
  userEmail?: string;
  userName?: string;
  onSuccess?: () => void;
  className?: string;
  label?: string;
}

export function PaystackInlineButton({
  planId = "pro_monthly",
  userEmail = "creator@vixora.ai",
  userName = "Creator",
  onSuccess,
  className,
  label,
}: PaystackInlineButtonProps) {
  const [loading, setLoading] = useState(false);
  const plan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[1];

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await paystackService.openPaystackCheckout({
        plan,
        email: userEmail,
        name: userName,
        onSuccess: (ref) => {
          setLoading(false);
          toast.success(`Payment verified! ${plan.credits} credits added to your account.`);
          if (onSuccess) onSuccess();
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Payment checkout failed");
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className={className || "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold gap-2 rounded-xl shadow-md"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      <span>{label || `Upgrade to ${plan.name} (₦${plan.priceNgn.toLocaleString()})`}</span>
    </Button>
  );
}

export default PaystackInlineButton;
