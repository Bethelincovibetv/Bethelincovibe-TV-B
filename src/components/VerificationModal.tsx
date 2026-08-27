import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Award,
  Check,
  Lock,
  Wallet,
  ArrowRight,
  Loader2,
} from "lucide-react";

export interface VerificationPackage {
  id: string;
  label: string;
  durationDays: number;
  price: number;
  description: string;
  popular?: boolean;
}

export const DEFAULT_VERIFICATION_PACKAGES: VerificationPackage[] = [
  {
    id: "3m",
    label: "3 Months Verified",
    durationDays: 90,
    price: 5000,
    description: "Ideal for testing verification impact and building initial buyer trust.",
  },
  {
    id: "6m",
    label: "6 Months Verified",
    durationDays: 180,
    price: 9000,
    popular: true,
    description: "Great value. Consistent credibility across directory and search.",
  },
  {
    id: "1y",
    label: "1 Year Annual Verified",
    durationDays: 365,
    price: 15000,
    description: "Best for established businesses looking for uninterrupted authority.",
  },
  {
    id: "lifetime",
    label: "Lifetime Verified Badge",
    durationDays: 3650, // 10 years
    price: 30000,
    description: "Permanent trust badge with VIP support and priority ranking.",
  },
];

export default function VerificationModal({
  open,
  onOpenChange,
  currentVerifiedUntil,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVerifiedUntil?: string | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<VerificationPackage[]>(DEFAULT_VERIFICATION_PACKAGES);
  const [selectedPkgId, setSelectedPkgId] = useState<string>("6m");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: s }, { data: w }] = await Promise.all([
          supabase.from("site_settings").select("value").eq("key", "verification_packages").maybeSingle(),
          supabase.from("wallets").select("id, balance").eq("user_id", user.id).maybeSingle(),
        ]);

        if (s?.value) {
          try {
            const parsed = JSON.parse(s.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPackages(parsed);
              setSelectedPkgId(parsed[0].id);
            }
          } catch {
            // fallback to default
          }
        }

        setWalletBalance(Number(w?.balance) || 0);
        setWalletId(w?.id || null);
      } catch (err) {
        console.error("Failed to load verification info", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user]);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];
  const isCurrentlyVerified = currentVerifiedUntil && new Date(currentVerifiedUntil) > new Date();

  const handlePurchase = async () => {
    if (!user || !selectedPkg) return;

    if (walletBalance < selectedPkg.price) {
      toast.error("Insufficient wallet balance. Please top up your wallet.");
      onOpenChange(false);
      navigate("/dashboard/wallet");
      return;
    }

    setPurchasing(true);
    try {
      const now = new Date();
      const currentEnd =
        currentVerifiedUntil && new Date(currentVerifiedUntil) > now
          ? new Date(currentVerifiedUntil)
          : now;
      const endsAt = new Date(
        currentEnd.getTime() + selectedPkg.durationDays * 86400000
      ).toISOString();
      const newBal = walletBalance - selectedPkg.price;

      // 1. Update wallet balance
      const { error: wErr } = await supabase
        .from("wallets")
        .update({ balance: newBal })
        .eq("user_id", user.id);

      if (wErr) throw wErr;

      // 2. Record transaction
      if (walletId) {
        await supabase.from("wallet_transactions").insert({
          wallet_id: walletId,
          user_id: user.id,
          amount: selectedPkg.price,
          type: "debit",
          description: `Verified Business Badge (${selectedPkg.label})`,
          reference_id: `VERIFY-${Date.now()}`,
        });
      }

      // 3. Update profile social_links metadata with verified info
      const { data: profile } = await supabase
        .from("profiles")
        .select("social_links")
        .eq("user_id", user.id)
        .maybeSingle();

      const existingLinks = (profile?.social_links as Record<string, any>) || {};
      const updatedLinks = {
        ...existingLinks,
        verified: true,
        verified_until: endsAt,
        verified_plan: selectedPkg.id,
        verified_at: new Date().toISOString(),
      };

      await supabase
        .from("profiles")
        .update({ social_links: updatedLinks as any })
        .eq("user_id", user.id);

      // 4. Update suppliers owned by user with verified badge info
      const { data: userSuppliers } = await supabase
        .from("suppliers")
        .select("id, social_links")
        .eq("submitted_by", user.id);

      if (userSuppliers && userSuppliers.length > 0) {
        for (const sup of userSuppliers) {
          const supLinks = (sup.social_links as Record<string, any>) || {};
          await supabase
            .from("suppliers")
            .update({
              social_links: {
                ...supLinks,
                verified: true,
                verified_until: endsAt,
              } as any,
            })
            .eq("id", sup.id);
        }
      }

      toast.success(
        `🎉 Congratulations! Your business is now verified until ${new Date(
          endsAt
        ).toLocaleDateString()}!`
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete verification. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-sky-500/30 max-h-[92vh] flex flex-col">
        {/* Modal Header - Compact & High-Impact */}
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-blue-900 text-white p-4 sm:p-5 relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <BadgeCheck className="h-48 w-48" />
          </div>

          <div className="relative z-10 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full gap-1 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                OFFICIAL BUSINESS VERIFICATION
              </Badge>
              {selectedPkg && (
                <span className="text-xs font-black text-sky-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                  ₦{Number(selectedPkg.price).toLocaleString()}
                </span>
              )}
            </div>

            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              Get the Verified Blue Tick Badge
            </DialogTitle>

            <DialogDescription className="text-xs text-slate-300 leading-relaxed">
              Build instant buyer trust with an official verification tick on your profile & directory cards.
            </DialogDescription>
          </div>
        </div>

        {/* Top Quick-Action Bar - Immediate Visibility for Mobile */}
        <div className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
              <BadgeCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-foreground truncate">
                {selectedPkg?.label || "Selected Plan"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Wallet: <strong className="text-foreground">₦{walletBalance.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            disabled={purchasing || !selectedPkg}
            onClick={walletBalance < (selectedPkg?.price || 0) ? () => { onOpenChange(false); navigate("/dashboard/wallet"); } : handlePurchase}
            className="rounded-xl font-black text-xs h-8 px-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm shrink-0 gap-1"
          >
            {purchasing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : walletBalance < (selectedPkg?.price || 0) ? (
              <>+ Top Up & Activate</>
            ) : (
              <>
                <BadgeCheck className="h-3.5 w-3.5" /> ⚡ Quick Activate
              </>
            )}
          </Button>
        </div>

        {/* Compact Benefits Ribbon */}
        <div className="px-4 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-around text-center text-[10px] font-bold text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-sky-500" /> Blue Tick</span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> 3x Trust</span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-amber-500" /> Top Search Rank</span>
        </div>

        {/* Scrollable Package Selector */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-6 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading verification plans...</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Choose Verification Plan
                </p>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                  Tap a plan below to select
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {packages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-sky-500 bg-sky-500/10 shadow-sm shadow-sky-500/10 ring-1 ring-sky-500/30"
                          : "border-border/70 bg-card hover:border-sky-500/40 hover:bg-muted/30"
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 right-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.2 rounded-full shadow-xs">
                          Popular
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-foreground flex items-center gap-1 truncate">
                            {pkg.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                            {pkg.description || `${pkg.durationDays} Days verification access`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-sky-600 dark:text-sky-400">
                            ₦{Number(pkg.price).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px]">
                        <span className="text-muted-foreground font-medium">{pkg.durationDays} Days Active</span>
                        <div
                          className={`h-4 w-4 rounded-full flex items-center justify-center ${
                            isSelected ? "bg-sky-500 text-white" : "border border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Footer - Always visible on mobile screens */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 shadow-lg">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border/80 flex items-center gap-1.5 text-left">
              <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold leading-tight">Wallet</p>
                <p className="text-xs font-black text-foreground leading-tight">
                  ₦{walletBalance.toLocaleString()}
                </p>
              </div>
            </div>
            {walletBalance < (selectedPkg?.price || 0) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[11px] font-bold text-amber-600 border-amber-500/40 h-8 px-2.5"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/dashboard/wallet");
                }}
              >
                + Top Up Wallet
              </Button>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold h-9 px-3"
            >
              Cancel
            </Button>
            <Button
              disabled={purchasing || !selectedPkg}
              onClick={walletBalance < (selectedPkg?.price || 0) ? () => { onOpenChange(false); navigate("/dashboard/wallet"); } : handlePurchase}
              className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs h-9 px-5 shadow-md shadow-sky-500/20 gap-1.5"
            >
              {purchasing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Activating...
                </>
              ) : walletBalance < (selectedPkg?.price || 0) ? (
                <>
                  <BadgeCheck className="h-3.5 w-3.5" /> Top Up & Activate (₦{Number(selectedPkg?.price || 0).toLocaleString()})
                </>
              ) : (
                <>
                  <BadgeCheck className="h-3.5 w-3.5" /> Activate Badge (₦{Number(selectedPkg?.price || 0).toLocaleString()})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
