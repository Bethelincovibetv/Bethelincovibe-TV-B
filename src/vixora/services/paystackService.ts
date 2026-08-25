import { apiKeyService } from "./apiKeyService";
import confetti from "canvas-confetti";

export interface PlanDetails {
  id: string;
  name: string;
  priceNgn: number;
  priceUsd: number;
  credits: number;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: PlanDetails[] = [
  {
    id: "free",
    name: "Free Creator",
    priceNgn: 0,
    priceUsd: 0,
    credits: 5,
    features: [
      "5 HD Video Renders / mo",
      "Standard Nigerian & Global AI Voices",
      "Dynamic Subtitle Engine",
      "Community Support",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro Studio",
    priceNgn: 8500,
    priceUsd: 9.99,
    credits: 100,
    popular: true,
    features: [
      "100 High-Speed 1080p MP4 Renders",
      "Victoria Studio Lead & Adaobi Voice Pro",
      "Procedural Sound Effects & Music Sync",
      "Commercial Usage License",
      "Priority Cloud Render Speed",
    ],
  },
  {
    id: "agency_scale",
    name: "Agency & Business",
    priceNgn: 28500,
    priceUsd: 29.99,
    credits: 500,
    features: [
      "500 Ultra HD 4K/1080p Renders",
      "Unlimited AI Script & Viral Hook Generation",
      "Full API & Webhooks Access",
      "Custom Brand Watermarks & Fonts",
      "Dedicated Account Strategist",
    ],
  },
];

export const paystackService = {
  getStoredCredits(): number {
    try {
      const stored = localStorage.getItem("vixora_user_credits");
      return stored ? parseInt(stored, 10) : 10;
    } catch {
      return 10;
    }
  },

  setCredits(credits: number) {
    localStorage.setItem("vixora_user_credits", credits.toString());
  },

  deductCredit(): boolean {
    const current = this.getStoredCredits();
    if (current > 0) {
      this.setCredits(current - 1);
      return true;
    }
    return false;
  },

  addCredits(amount: number) {
    const current = this.getStoredCredits();
    const updated = current + amount;
    this.setCredits(updated);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.warn("Confetti notice:", e);
    }
    return updated;
  },

  async openPaystackCheckout({
    plan,
    email,
    name,
    onSuccess,
    onClose,
  }: {
    plan: PlanDetails;
    email: string;
    name?: string;
    onSuccess?: (reference: string) => void;
    onClose?: () => void;
  }) {
    const creds = apiKeyService.getCredentials();
    const publicKey = creds.paystackPublicKey || "pk_test_vixora_public_key";

    // If Paystack inline JS is loaded in window
    if ((window as any).PaystackPop) {
      const handler = (window as any).PaystackPop.setup({
        key: publicKey,
        email: email || "customer@vixora.ai",
        amount: plan.priceNgn * 100, // in kobo
        currency: "NGN",
        ref: "vix_" + Math.floor(Math.random() * 1000000000 + 1),
        metadata: {
          custom_fields: [
            { display_name: "Plan Name", variable_name: "plan_name", value: plan.name },
            { display_name: "Customer Name", variable_name: "customer_name", value: name || "Creator" },
          ],
        },
        callback: (response: any) => {
          paystackService.addCredits(plan.credits);
          if (onSuccess) onSuccess(response.reference);
        },
        onClose: () => {
          if (onClose) onClose();
        },
      });
      handler.openIframe();
    } else {
      // Direct mock/simulation fallback for instant sandbox validation
      const ref = "vix_mock_" + Date.now();
      paystackService.addCredits(plan.credits);
      if (onSuccess) onSuccess(ref);
    }
  },
};
