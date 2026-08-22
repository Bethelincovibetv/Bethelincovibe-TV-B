import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Gift } from "lucide-react";
import { toast } from "sonner";

export default function ReferralCard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [stats, setStats] = useState({ count: 0, earned: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle();
      setCode((p as any)?.referral_code || "");
      const { data: refs } = await supabase.from("referrals").select("signup_bonus_amount,purchase_bonus_total").eq("referrer_id", user.id);
      const earned = (refs || []).reduce((s: number, r: any) => s + Number(r.signup_bonus_amount || 0) + Number(r.purchase_bonus_total || 0), 0);
      setStats({ count: refs?.length || 0, earned });
    })();
  }, [user]);

  if (!user || !code) return null;
  const link = `${window.location.origin}/register?ref=${code}`;

  const onShare = async () => {
    const msg = `Join Bethelincovibe TV — business info & tools for Lagos entrepreneurs. Use my invite link: ${link}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "Bethelincovibe TV", text: msg, url: link });
        return;
      }
    } catch { /* fall through */ }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Invite & Earn</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Share your link. Earn a bonus when someone signs up and another bonus when they top up their wallet.
        </p>
        <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 mb-3">
          <code className="text-xs flex-1 truncate">{link}</code>
          <Button size="sm" variant="ghost" onClick={onShare} className="h-7 px-2">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-4 text-xs">
            <div><span className="font-bold text-foreground text-base">{stats.count}</span> <span className="text-muted-foreground">referrals</span></div>
            <div><span className="font-bold text-foreground text-base">₦{stats.earned.toLocaleString()}</span> <span className="text-muted-foreground">earned</span></div>
          </div>
          <Button onClick={onShare} size="sm" className="gap-1">
            <Share2 className="h-3.5 w-3.5" />Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}