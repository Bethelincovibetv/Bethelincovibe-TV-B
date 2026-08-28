import { useEffect, useState } from "react";
import { MessageCircle, X, Users, Sparkles, Bell, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordInteractionEvent } from "@/lib/analyticsTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SNOOZE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 Hours Intelligent Bumping

/**
 * Intelligent WhatsApp Community Modal & Floating Banner with 4-hour smart bumping.
 */
export default function WhatsAppCommunityBanner() {
  const [url, setUrl] = useState("https://chat.whatsapp.com/sample-bethelincovibe");
  const [showModal, setShowModal] = useState(false);
  const [showFloatingPill, setShowFloatingPill] = useState(false);

  useEffect(() => {
    // 1. Fetch live WhatsApp link from settings
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp_community_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setUrl(data.value);
      });

    // 2. Check if user already joined permanently
    const alreadyJoined = localStorage.getItem("wa_community_joined") === "true";
    if (alreadyJoined) {
      setShowFloatingPill(false);
      return;
    }

    // 3. Intelligent bumping check (4-hour snooze interval)
    const lastSnooze = localStorage.getItem("wa_community_last_snooze");
    const now = Date.now();

    const isSnoozed = lastSnooze && now - Number(lastSnooze) < SNOOZE_DURATION_MS;

    if (!isSnoozed) {
      // Pop up intelligently after a short engagement delay (4 seconds)
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      // If snoozed within 4 hours, keep only a discrete floating pill active
      setShowFloatingPill(true);
    }
  }, []);

  const handleJoin = () => {
    localStorage.setItem("wa_community_joined", "true");
    recordInteractionEvent({
      eventName: "whatsapp_community_popup_join_click",
      category: "community_join",
      source: "intelligent_popup",
      metadata: { target_url: url },
    });
    setShowModal(false);
    setShowFloatingPill(false);
  };

  const handleSnooze = () => {
    // 4-Hour intelligent snooze timestamp
    localStorage.setItem("wa_community_last_snooze", Date.now().toString());
    setShowModal(false);
    setShowFloatingPill(true);
  };

  if (!url) return null;

  return (
    <>
      {/* 1. Intelligent 4-Hour Bumping Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden space-y-5">
            {/* Background glowing gradient */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-36 w-36 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

            <button
              onClick={handleSnooze}
              aria-label="Close"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Icon */}
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-[10px] font-extrabold uppercase">
                    VIP Founder Network
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    <Users className="h-3 w-3 text-emerald-500" /> 10,000+ Members
                  </span>
                </div>
                <h3 className="text-lg font-black text-foreground tracking-tight">
                  Join Lagos Business WhatsApp Hub
                </h3>
              </div>
            </div>

            {/* Content & Value Proposition */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect directly with high-growth Lagos CEOs, verified suppliers, and investors. Get instant daily business buyer requests and grant alerts.
            </p>

            <div className="space-y-2 bg-muted/30 p-3.5 rounded-2xl border border-border/60 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Verified Lagos SME trade network & direct buyer leads</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Free promotions on Bethelincovibe TV YouTube & Blog</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Bell className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Exclusive vendor discounts & community partnerships</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                asChild
                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md gap-2"
                onClick={handleJoin}
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Join WhatsApp Community Now <ArrowRight className="h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="ghost"
                onClick={handleSnooze}
                className="w-full text-xs text-muted-foreground hover:text-foreground h-8 font-medium"
              >
                Remind me in 4 hours
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Discrete Floating Pill if snoozed */}
      {showFloatingPill && (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-40 max-w-[280px] animate-in slide-in-from-bottom duration-300">
          <div className="relative group">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleJoin}
              className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl shadow-xl pl-3.5 pr-4 py-2.5 transition-all transform hover:scale-105 border border-emerald-400/30"
            >
              <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[11px] font-extrabold leading-tight truncate">Lagos WhatsApp Community</p>
                <p className="text-[9px] text-white/80 leading-tight">10k+ Members • Join Free</p>
              </div>
            </a>
            <button
              aria-label="Dismiss for 4 hours"
              onClick={handleSnooze}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted text-muted-foreground transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
