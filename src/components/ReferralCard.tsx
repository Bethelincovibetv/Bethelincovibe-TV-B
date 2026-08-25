import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Check, Gift, Sparkles, Image as ImageIcon, Smartphone, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import ReferralFlyerModal from "@/components/ReferralFlyerModal";

export default function ReferralCard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState({ count: 0, earned: 0 });
  const [copied, setCopied] = useState(false);
  const [flyerOpen, setFlyerOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("referral_code, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setCode((p as any)?.referral_code || "");
      setDisplayName((p as any)?.display_name || "Entrepreneur");

      const { data: refs } = await supabase
        .from("referrals")
        .select("signup_bonus_amount,purchase_bonus_total")
        .eq("referrer_id", user.id);
      const earned = (refs || []).reduce(
        (s: number, r: any) => s + Number(r.signup_bonus_amount || 0) + Number(r.purchase_bonus_total || 0),
        0
      );
      setStats({ count: refs?.length || 0, earned });
    })();
  }, [user]);

  if (!user || !code) return null;
  const link = `${window.location.origin}/register?ref=${code}`;

  const onCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = async () => {
    const msg = `Join Bethelincovibe TV — Nigeria's #1 SME directory, supplier marketplace & growth engine. Use my invite code ${code} or tap: ${link}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "Bethelincovibe TV", text: msg, url: link });
        return;
      }
    } catch {
      /* fall through */
    }
    onCopy();
  };

  const onWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚀 Join Bethelincovibe TV — Lagos Premier Business & Supplier Hub! Use my invite code *${code}* or tap here to join: ${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <>
      <Card className="overflow-hidden bg-gradient-to-br from-purple-500/10 via-card to-amber-500/10 border-purple-500/30 shadow-md">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                  Refer & Earn Real Cash
                </h3>
                <p className="text-xs text-muted-foreground">
                  Invite fellow entrepreneurs and get rewarded when they register and grow.
                </p>
              </div>
            </div>
            <Badge className="bg-purple-600 text-white font-mono text-xs">
              Code: {code}
            </Badge>
          </div>

          {/* Referral Link Box */}
          <div className="flex items-center gap-2 bg-background border border-border/80 rounded-xl px-3 py-2">
            <code className="text-xs font-mono flex-1 truncate text-foreground">{link}</code>
            <Button size="sm" variant="ghost" onClick={onCopy} className="h-7 px-2 font-bold text-xs gap-1">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* How it works explainers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/50">
              <span className="font-bold text-purple-600 block mb-0.5">1. Share Your Link</span>
              <span className="text-[11px] text-muted-foreground">Send your flyer or invite link to friends & business groups.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/50">
              <span className="font-bold text-purple-600 block mb-0.5">2. They Join Free</span>
              <span className="text-[11px] text-muted-foreground">They get instant access to verified Lagos suppliers & tools.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/50">
              <span className="font-bold text-emerald-600 block mb-0.5">3. Earn Wallet Bonus</span>
              <span className="text-[11px] text-muted-foreground">You receive referral earnings directly in your wallet balance!</span>
            </div>
          </div>

          {/* Stats and Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
            <div className="flex gap-4 text-xs">
              <div>
                <span className="font-black text-foreground text-lg">{stats.count}</span>{" "}
                <span className="text-muted-foreground text-xs">referrals</span>
              </div>
              <div>
                <span className="font-black text-emerald-600 text-lg">₦{stats.earned.toLocaleString()}</span>{" "}
                <span className="text-muted-foreground text-xs">earned</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setFlyerOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 rounded-xl font-bold text-xs gap-1.5 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Referral Flyer
              </Button>

              <Button
                onClick={onWhatsAppShare}
                size="sm"
                className="h-8 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
              >
                <Smartphone className="h-3.5 w-3.5" />
                WhatsApp
              </Button>

              <Button
                onClick={onShare}
                size="sm"
                className="h-8 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReferralFlyerModal
        open={flyerOpen}
        onOpenChange={setFlyerOpen}
        referralCode={code}
        userName={displayName}
      />
    </>
  );
}
