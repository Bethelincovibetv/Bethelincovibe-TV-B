import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Megaphone,
  Sparkles,
  Building2,
  Bell,
  Mail,
  CheckCircle2,
  ArrowRight,
  Palette,
  Users,
  ShieldCheck,
  Send,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  executeMultiAgentBusinessPromotion,
  PromotionChainResult,
  computeFirstPartyInterestProfiles,
} from "@/lib/executiveOrchestrationEngine";
import { toast } from "sonner";

interface MultiAgentPromotionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBusinessId?: string;
  onSuccess?: () => void;
}

export default function MultiAgentPromotionModal({
  open,
  onOpenChange,
  defaultBusinessId,
  onSuccess,
}: MultiAgentPromotionModalProps) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [channel, setChannel] = useState<"all" | "push" | "email">("all");
  const [customOfferHook, setCustomOfferHook] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<PromotionChainResult | null>(null);
  const [audienceInfo, setAudienceInfo] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadBusinesses();
      loadAudience();
    }
  }, [open]);

  const loadBusinesses = async () => {
    try {
      const { data } = await supabase
        .from("businesses")
        .select("id, title, city, is_verified, is_featured, category_id, slug")
        .order("is_featured", { ascending: false })
        .limit(25);

      if (data && data.length > 0) {
        setBusinesses(data);
        if (defaultBusinessId) {
          setSelectedBusinessId(defaultBusinessId);
        } else if (!selectedBusinessId) {
          setSelectedBusinessId(data[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed loading businesses for promotion modal:", err);
    }
  };

  const loadAudience = async () => {
    try {
      const info = await computeFirstPartyInterestProfiles();
      setAudienceInfo(info);
    } catch {}
  };

  const handleLaunchChain = async () => {
    if (!selectedBusinessId) {
      toast.error("Please select a business to promote.");
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const res = await executeMultiAgentBusinessPromotion({
        businessId: selectedBusinessId,
        channel,
        customOfferHook: customOfferHook.trim() || undefined,
      });

      setResult(res);
      toast.success(`Multi-Agent Promotion executed for "${res.businessName}"!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Promotion workflow failed: " + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white border-b border-purple-500/20">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Multi-Agent Chained Orchestration
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-1">
            Automated Business Promotion Engine
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            Coordinates Marketing AI (copywriting) + Graphic AI (Pexels curation) + Push Agent (FCM) + Email Agent with verification.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5">
          {/* Agent Chaining Pipeline Diagram */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
            <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">
              Automated Multi-Agent Execution Pipeline
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-foreground">
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> 1. Fetch Profile
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> 2. Marketing AI (Copy)
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20 flex items-center gap-1">
                <Palette className="h-3 w-3" /> 3. Graphic AI (Pexels)
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                <Bell className="h-3 w-3" /> 4. FCM Push
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <Mail className="h-3 w-3" /> 5. Email Broadcast
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> 6. Verification
              </span>
            </div>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Select Business to Promote</Label>
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} {b.is_featured ? "⭐ (Featured)" : ""} {b.is_verified ? "✓ (Verified)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Promotion Channels</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={channel === "all" ? "default" : "outline"}
                  onClick={() => setChannel("all")}
                  className="rounded-xl text-xs font-bold h-10"
                >
                  All Channels
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={channel === "push" ? "default" : "outline"}
                  onClick={() => setChannel("push")}
                  className="rounded-xl text-xs font-bold h-10"
                >
                  FCM Push Only
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={channel === "email" ? "default" : "outline"}
                  onClick={() => setChannel("email")}
                  className="rounded-xl text-xs font-bold h-10"
                >
                  Email Only
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Custom WhatsApp Offer Hook (Optional)
            </Label>
            <Input
              value={customOfferHook}
              onChange={(e) => setCustomOfferHook(e.target.value)}
              placeholder="e.g. Enjoy 15% discount when you mention Bethelincovibe Spotlight on WhatsApp!"
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* Targeting & Audience Info */}
          {audienceInfo && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-muted-foreground">
                  Estimated Eligible Audience:{" "}
                  <strong className="text-foreground">{audienceInfo.eligiblePromotionalCount} active users & subscribers</strong>
                </span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-black">
                ANTI-SPAM CHECK PASSED
              </Badge>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-2">
            <Button
              onClick={handleLaunchChain}
              disabled={isExecuting || !selectedBusinessId}
              className="w-full h-12 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg gap-2"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chaining Agents & Executing Promotion…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Launch Multi-Agent Promotion Campaign Now
                </>
              )}
            </Button>
          </div>

          {/* Results Summary Box */}
          {result && (
            <div className="p-4 rounded-2xl bg-muted/60 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Campaign Executed & Verified
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  VERIFIED AT {new Date(result.executionTimestamp).toLocaleTimeString()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                  <p className="font-bold text-foreground">Marketing AI Headline</p>
                  <p className="text-muted-foreground">{result.marketingCopy.headline}</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                  <p className="font-bold text-foreground">Delivery Summary</p>
                  <p className="text-muted-foreground">
                    FCM Push: {result.pushDispatch.deliveredCount} users | Email: {result.emailDispatch.deliveredCount} subscribers
                  </p>
                </div>
              </div>

              {result.visualAsset && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/80">
                  <img
                    src={result.visualAsset.thumbnailUrl || result.visualAsset.url}
                    alt="Promo Graphic"
                    className="h-12 w-16 object-cover rounded-lg"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Curated Studio Visual Attached</p>
                    <p className="text-muted-foreground text-[11px]">
                      Pexels Stock by {result.visualAsset.photographer || "Curated Studio"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
