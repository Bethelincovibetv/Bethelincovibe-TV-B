import { supabase } from "@/integrations/supabase/client";

export const DESIGN_CREDIT_COSTS = {
  GRAPHIC_GENERATION: 25, // 25 credits / ₦25 per full graphic design render
  LOGO_PACK: 50,          // 50 credits / ₦50 for an 8-concept bespoke logo pack
  AI_IMPROVE: 10,         // 10 credits / ₦10 for AI design optimization
  VARIATION_PACK: 15,     // 15 credits / ₦15 for 5-theme color variations
  EXPORT_PNG: 0,          // Free download/export of generated designs
};

export interface CreditCheckResult {
  hasEnough: boolean;
  currentBalance: number;
  cost: number;
  shortfall: number;
}

/**
 * Checks if the current authenticated user has sufficient wallet credits for a design operation.
 */
export async function checkUserDesignCredits(
  userId: string,
  cost: number
): Promise<CreditCheckResult> {
  if (!userId) {
    return { hasEnough: false, currentBalance: 0, cost, shortfall: cost };
  }

  try {
    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !wallet) {
      console.warn("Wallet fetch warning:", error);
      return { hasEnough: false, currentBalance: 0, cost, shortfall: cost };
    }

    const currentBalance = Number(wallet.balance) || 0;
    const hasEnough = currentBalance >= cost;
    const shortfall = Math.max(0, cost - currentBalance);

    return {
      hasEnough,
      currentBalance,
      cost,
      shortfall,
    };
  } catch (err) {
    console.error("Error checking design credits:", err);
    return { hasEnough: false, currentBalance: 0, cost, shortfall: cost };
  }
}

/**
 * Deducts credits for a successfully authorized and rendered AI design job.
 * Updates the user's wallet and logs an audit record in wallet_transactions.
 * 
 * Rules:
 * - Never deducts before generation is authorized
 * - Never deducts twice
 * - Never deducts for failed generations
 */
export async function deductDesignCredits({
  userId,
  cost,
  actionName,
  designId,
}: {
  userId: string;
  cost: number;
  actionName: string;
  designId?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  if (!userId) return { success: false, error: "User is not authenticated" };
  if (cost <= 0) return { success: true };

  try {
    // 1. Re-verify current balance
    const { data: wallet, error: fetchErr } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr || !wallet) {
      return { success: false, error: "Wallet not found. Please visit Wallet to initialize." };
    }

    const currentBalance = Number(wallet.balance) || 0;
    if (currentBalance < cost) {
      return {
        success: false,
        error: `Insufficient balance (₦${currentBalance.toLocaleString()}). Required: ₦${cost.toLocaleString()}.`,
      };
    }

    const newBalance = currentBalance - cost;

    // 2. Update wallet balance
    const { error: updateErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateErr) {
      return { success: false, error: "Failed to deduct credits: " + updateErr.message };
    }

    // 3. Log transaction audit record
    try {
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount: -cost,
        type: "debit",
        description: actionName || "AI Graphic Design & Creative Studio",
        reference_id: designId || `design_${Date.now()}`,
      });
    } catch (txErr) {
      console.warn("Transaction log notice:", txErr);
    }

    return { success: true, newBalance };
  } catch (err: any) {
    console.error("Critical error in deductDesignCredits:", err);
    return { success: false, error: err.message || "Failed to process credit deduction." };
  }
}
