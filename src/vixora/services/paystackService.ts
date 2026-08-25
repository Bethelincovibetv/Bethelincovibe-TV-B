import { PAYSTACK_SECRET_KEY } from '../constants';
import { Bank } from '../types';

const BASE_URL = 'https://api.paystack.co';

export interface PlanDetails {
  id: string;
  name: string;
  priceNgn: number;
  credits: number;
  description: string;
  popular?: boolean;
  features: string[];
}

export const PRICING_PLANS: PlanDetails[] = [
  {
    id: "creator-free",
    name: "Free Creator",
    priceNgn: 0,
    credits: 15,
    description: "Ideal for testing video prompts and sound effects",
    features: [
      "15 Free Render Credits",
      "720p Video Exports",
      "Standard Voice Engine",
      "Community Support",
    ],
  },
  {
    id: "pro-creator",
    name: "Pro Studio",
    priceNgn: 4500,
    credits: 150,
    popular: true,
    description: "Best for content creators and high-engagement videos",
    features: [
      "150 HD 1080p Render Credits",
      "Multi-Track SFX & Beats Studio",
      "Victoria & Adaobi Voice Engines",
      "Commercial Usage License",
      "Fast Render Priority",
    ],
  },
  {
    id: "agency-unlimited",
    name: "Agency Turbo",
    priceNgn: 14500,
    credits: 600,
    description: "Designed for digital marketing teams and viral channels",
    features: [
      "600 Ultra-Fast Render Credits",
      "Custom Subtitle Styling Engine",
      "Full Stock Footage & Beats Library",
      "Automated Script & Hook Sourcing",
      "Dedicated WhatsApp Support",
    ],
  },
];

class PaystackService {
  private creditsKey = "vixora_user_credits";

  public getStoredCredits(): number {
    try {
      const stored = localStorage.getItem(this.creditsKey);
      if (stored !== null) {
        return parseInt(stored, 10) || 0;
      }
    } catch {}
    return 35; // Default starter credits
  }

  public setStoredCredits(credits: number): void {
    try {
      localStorage.setItem(this.creditsKey, credits.toString());
    } catch {}
  }

  public addCredits(amount: number): number {
    const current = this.getStoredCredits();
    const updated = current + amount;
    this.setStoredCredits(updated);
    return updated;
  }

  public deductCredit(amount: number = 1): boolean {
    const current = this.getStoredCredits();
    if (current < amount) return false;
    this.setStoredCredits(current - amount);
    return true;
  }

  public async openPaystackCheckout(options: {
    plan: PlanDetails;
    email: string;
    name?: string;
    onSuccess: (reference: string) => void;
    onClose?: () => void;
  }): Promise<void> {
    const { plan, email, onSuccess, onClose } = options;

    return new Promise((resolve, reject) => {
      // Check if Paystack inline script is loaded
      const win = window as any;
      if (!win.PaystackPop) {
        // Dynamically load Paystack script
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        script.onload = () => {
          this.triggerPopup(win.PaystackPop, plan, email, onSuccess, onClose);
          resolve();
        };
        script.onerror = () => {
          reject(new Error("Unable to load Paystack gateway. Please check your internet connection."));
        };
        document.body.appendChild(script);
      } else {
        this.triggerPopup(win.PaystackPop, plan, email, onSuccess, onClose);
        resolve();
      }
    });
  }

  private triggerPopup(
    PaystackPop: any,
    plan: PlanDetails,
    email: string,
    onSuccess: (ref: string) => void,
    onClose?: () => void
  ) {
    const publicKey =
      (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY ||
      "pk_test_b8e5c1411516e8b5c92842416f5c531d279cf431";

    const handler = PaystackPop.setup({
      key: publicKey,
      email: email || "creator@vixora.ai",
      amount: plan.priceNgn * 100, // In Kobo
      currency: "NGN",
      ref: `vixora_${plan.id}_${Date.now()}`,
      metadata: {
        custom_fields: [
          {
            display_name: "Plan Name",
            variable_name: "plan_name",
            value: plan.name,
          },
          {
            display_name: "Credits Awarded",
            variable_name: "credits_awarded",
            value: plan.credits.toString(),
          },
        ],
      },
      callback: (response: any) => {
        this.addCredits(plan.credits);
        onSuccess(response.reference);
      },
      onClose: () => {
        if (onClose) onClose();
      },
    });

    handler.openIframe();
  }
}

export const paystackService = new PaystackService();

export const fetchBanks = async (): Promise<Bank[]> => {
  try {
    const response = await fetch(`${BASE_URL}/bank`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching banks:', error);
    return [];
  }
};

export const fetchSubaccount = async (subaccountCode: string) => {
  try {
    const response = await fetch(`${BASE_URL}/subaccount/${subaccountCode}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching subaccount:', error);
    throw error;
  }
};

export const fetchSettlements = async (subaccountCode: string) => {
  try {
    // Paystack allows filtering settlements by subaccount code
    const response = await fetch(`${BASE_URL}/settlement?subaccount=${subaccountCode}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching settlements:', error);
    throw error;
  }
};

export const createSubaccount = async (params: {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
}) => {
  try {
    const response = await fetch(`${BASE_URL}/subaccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating subaccount:', error);
    throw error;
  }
};

