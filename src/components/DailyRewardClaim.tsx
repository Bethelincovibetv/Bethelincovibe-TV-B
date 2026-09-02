import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playCreditSound } from "@/lib/notificationSound";
import { getBestUserName } from "@/lib/notificationPersonalizer";

// Account-based daily login reward — strictly one claim per calendar day per user account.
export default function DailyRewardClaim() {
  const { user } = useAuth();
  const fired = useRef(false);

  useEffect(() => {
    if (!user || fired.current) return;
    fired.current = true;

    const todayDate = new Date().toISOString().slice(0, 10);
    const storageKey = `bethelin_daily_claimed_${user.id}_${todayDate}`;

    // Quick client-side skip if already claimed today in this browser
    if (localStorage.getItem(storageKey)) return;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("claim_daily_reward", { _user_id: user.id });
        if (error) {
          console.warn("Daily reward check:", error.message);
          return;
        }

        const result = data as any;
        if (result?.claimed) {
          localStorage.setItem(storageKey, "1");
          const amount = result.amount || 50;
          const userName = getBestUserName(user);

          // Ensure private notification record for the user mentioning their name
          try {
            await supabase.from("user_notifications").insert({
              user_id: user.id,
              title: `🎁 ${userName}, Daily Free Login Reward: +₦${amount}`,
              body: `Hi ${userName}, you received ₦${amount} free design credits for logging in today. Credits have been added to your wallet.`,
              url: "/dashboard/wallet",
              type: "reward",
              is_read: false,
            });
          } catch {}

          playCreditSound();
          toast.success(`🎁 ${userName}, +₦${amount} Daily Free Credits Claimed!`, {
            description: `Hi ${userName}, use your free credits for AI Graphic Designs, Flyers, and Logo creations.`,
          });

          // Notify any wallet/studio components to update live
          window.dispatchEvent(new CustomEvent("wallet_updated"));
        } else {
          // Already claimed today on server
          localStorage.setItem(storageKey, "1");
        }
      } catch (err) {
        console.warn("Daily reward claim error:", err);
      }
    })();
  }, [user]);

  return null;
}

