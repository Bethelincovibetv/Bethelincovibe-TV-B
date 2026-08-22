import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Auto-claim daily login reward — silent, once per session per user.
export default function DailyRewardClaim() {
  const { user } = useAuth();
  const fired = useRef(false);

  useEffect(() => {
    if (!user || fired.current) return;
    fired.current = true;
    const key = `daily_reward_${user.id}_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    (async () => {
      const { data, error } = await supabase.rpc("claim_daily_reward", { _user_id: user.id });
      if (error) return;
      const result = data as any;
      if (result?.claimed) {
        toast.success(`🎁 Daily reward: +${result.amount} credits added to your wallet`);
      }
    })();
  }, [user]);

  return null;
}
