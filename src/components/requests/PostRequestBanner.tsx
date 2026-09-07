import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Zap, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import PostRequestModal from "./PostRequestModal";
import mayaAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

interface PostRequestBannerProps {
  className?: string;
  variant?: "hero" | "compact" | "card";
}

export default function PostRequestBanner({ className = "", variant = "hero" }: PostRequestBannerProps) {
  const { flags } = useFeatureFlags();
  const [modalOpen, setModalOpen] = useState(false);
  const [quickInput, setQuickInput] = useState("");

  if (flags.matchmaker === false) {
    return null;
  }

  const handleStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setModalOpen(true);
  };

  if (variant === "compact") {
    return (
      <>
        <div className={`flex items-center justify-between p-3.5 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/5 rounded-2xl border border-primary/20 shadow-xs ${className}`}>
          <div className="flex items-center gap-3">
            <img src={mayaAvatar} alt="Maya AI" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30" />
            <div>
              <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <span>Looking for a service or product?</span>
                <Badge className="bg-primary text-white text-[9px] px-1.5 py-0 h-4">Instant Match</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Post what you need and let verified businesses send you offers.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="font-extrabold shadow-sm gap-1.5 shrink-0 rounded-xl">
            <Sparkles className="w-3.5 h-3.5" /> Post a Request
          </Button>
        </div>
        <PostRequestModal open={modalOpen} onOpenChange={setModalOpen} initialPrompt={quickInput} />
      </>
    );
  }

  return (
    <>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-primary/95 to-slate-950 text-white p-6 sm:p-8 shadow-2xl border border-white/10 ${className}`}>
        {/* Background glow & accents */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-accent/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-primary/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Smart Opportunity Matchmaker</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Tell us what you need. We'll find the right verified businesses.
            </h2>
            <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
              No endless searching through directories. Describe your project, budget, and timeline — qualified Nigerian businesses compete to give you their best offers.
            </p>
          </div>

          {/* Quick Input Bar */}
          <form onSubmit={handleStart} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-inner">
            <div className="flex-1 flex items-center px-3 gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <Input
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="e.g. Need a graphic designer for a flyer before Friday, budget ₦20,000..."
                className="bg-transparent border-0 text-white placeholder:text-white/60 focus-visible:ring-0 text-sm h-10 px-0 shadow-none"
              />
            </div>
            <Button
              type="submit"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold h-10 px-5 rounded-xl shadow-md gap-2 shrink-0"
            >
              Find Providers <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Trust points */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-white/70 pt-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Providers Only</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Compare Multiple Bids</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Direct Chat & Payment</span>
            </div>
          </div>
        </div>
      </div>

      <PostRequestModal open={modalOpen} onOpenChange={setModalOpen} initialPrompt={quickInput} />
    </>
  );
}
