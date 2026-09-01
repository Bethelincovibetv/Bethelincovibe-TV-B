import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  MapPin,
  Star,
  Info,
  ThumbsDown,
  Eye,
  SlidersHorizontal,
  Bot,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BusinessMatchResult,
  subscribeToRecommender,
  recordRecommendationFeedback,
  getRecommenderUserPrefs,
  getRecommenderAdminConfig,
  saveRecommenderUserPrefs,
  findBestBusinessMatch,
  getUserInterestProfile,
} from "@/lib/aiBusinessRecommenderEngine";
import aiMatchAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

export default function AIBusinessMatchAssistant() {
  const navigate = useNavigate();
  const [match, setMatch] = useState<BusinessMatchResult | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showWhyInfo, setShowWhyInfo] = useState<boolean>(false);
  const [userPrefs, setUserPrefs] = useState(getRecommenderUserPrefs());
  const [hasInteracted, setHasInteracted] = useState(false);

  // Subscribe to real-time recommendation updates
  useEffect(() => {
    const unsubscribe = subscribeToRecommender((newMatch) => {
      if (newMatch && !isDismissed) {
        setMatch(newMatch);
        setIsExpanded(true);
        // Record shown impression event
        recordRecommendationFeedback({
          businessId: newMatch.business.id,
          businessName: newMatch.business.name,
          category: newMatch.business.categories?.name || newMatch.business.category || "General",
          action: "shown",
          confidence: newMatch.confidence,
        });
      }
    });

    // Check on mount if an intent pattern already exists
    async function checkInitialIntent() {
      const prefs = getRecommenderUserPrefs();
      setUserPrefs(prefs);
      if (!prefs.enabled) return;

      const profile = getUserInterestProfile();
      if (profile.totalSignalsCount >= 2 && profile.confidence >= 65) {
        const found = await findBestBusinessMatch();
        if (found) {
          setMatch(found);
        }
      }
    }

    const timer = setTimeout(checkInitialIntent, 3500);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [isDismissed]);

  if (!userPrefs.enabled || !match || isDismissed) {
    return null;
  }

  const { business, dialogue, confidence, inferredIntent, whyExplanation } = match;
  const bizSlug = business.slug || business.id;
  const isVerified = Boolean(business.is_verified || business.verified);
  const catName = business.categories?.name || business.category || "Verified Business";

  const handleViewBusiness = () => {
    recordRecommendationFeedback({
      businessId: business.id,
      businessName: business.name,
      category: catName,
      action: "click",
      confidence,
    });
    setIsDismissed(true);
    navigate(`/businesses/${bizSlug}`);
  };

  const handleNotInterested = () => {
    recordRecommendationFeedback({
      businessId: business.id,
      businessName: business.name,
      category: catName,
      action: "not_interested",
      confidence,
    });
    setIsDismissed(true);
  };

  const handleClose = () => {
    recordRecommendationFeedback({
      businessId: business.id,
      businessName: business.name,
      category: catName,
      action: "dismiss",
      confidence,
    });
    setIsDismissed(true);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setHasInteracted(true);
  };

  return (
    <aside aria-label="AI Business Match Assistant" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 max-w-[calc(100vw-32px)] sm:max-w-md select-none pointer-events-auto">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Minimized Floating Pill with 3D Avatar and Pulsing Hook
          <motion.div
            key="minimized-pill"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleExpand}
            className="flex items-center gap-3 p-2 pr-4 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border border-violet-500/30 rounded-full shadow-2xl cursor-pointer hover:border-violet-500/60 transition-all group"
          >
            {/* 3D Avatar with glowing pulse ring */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-amber-500 rounded-full blur-xs opacity-75 group-hover:opacity-100 transition animate-pulse" />
              <img
                src={aiMatchAvatar}
                alt="Maya AI Match Assistant"
                className="relative h-11 w-11 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md"
              />
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-foreground flex items-center gap-1">
                  Maya <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                </span>
                <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 font-bold">
                  {confidence}% Match
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[190px]">
                {dialogue.hook}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 ml-auto" />
          </motion.div>
        ) : (
          // Full Interactive 3D Match Assistant Card
          <motion.div
            key="expanded-card"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full sm:w-[410px] bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-violet-500/25 dark:border-violet-500/35 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Top Assistant Header */}
            <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white p-3.5 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute -inset-0.5 bg-white/40 rounded-full blur-xs" />
                  <img
                    src={aiMatchAvatar}
                    alt="Maya — AI Match Specialist"
                    className="relative h-12 w-12 rounded-full object-cover border-2 border-white/80 shadow-md"
                  />
                  <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-black tracking-tight flex items-center gap-1">
                      Maya
                      <Badge className="bg-white/20 hover:bg-white/30 text-white text-[9px] font-bold border-0 h-4 px-1.5">
                        AI Match Specialist
                      </Badge>
                    </h4>
                  </div>
                  <p className="text-[11px] text-white/85 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300" />
                    {confidence}% intent confidence
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleExpand}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                  title="Minimize"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClose}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conversational Dialogue Balloon */}
            <div className="p-4 space-y-3.5">
              <div className="relative bg-muted/60 dark:bg-muted/30 border border-border/80 rounded-2xl p-3.5 text-xs text-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-violet-600 dark:text-violet-400">
                  <span className="text-sm">{dialogue.emoji}</span>
                  <span>{dialogue.hook}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {dialogue.observation}
                </p>
                <p className="font-medium text-foreground pt-1">
                  {dialogue.pitch}
                </p>
              </div>

              {/* Matched Business Card Preview */}
              <div className="group relative bg-card dark:bg-slate-800/80 border border-border hover:border-violet-500/40 rounded-2xl p-3.5 transition-all shadow-xs">
                <div className="flex items-start gap-3">
                  {/* Business Logo / Thumbnail */}
                  <div className="h-12 w-12 rounded-xl bg-muted border flex items-center justify-center shrink-0 overflow-hidden">
                    {business.logo_url || business.image_url ? (
                      <img
                        src={business.logo_url || business.image_url}
                        alt={business.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="text-xs sm:text-sm font-black text-foreground truncate max-w-[180px]">
                        {business.name}
                      </h5>
                      {isVerified && (
                        <ShieldCheck className="h-4 w-4 text-sky-500 fill-sky-500/20 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/20 text-primary font-bold">
                        {catName}
                      </Badge>
                      {(business.city || business.state) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                          <MapPin className="h-2.5 w-2.5 text-rose-500" />
                          {business.city || business.state}
                        </span>
                      )}
                    </div>

                    {business.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5">
                        {business.description}
                      </p>
                    )}

                    {/* Services preview */}
                    {Array.isArray(business.services) && business.services.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {business.services.slice(0, 2).map((srv: any, idx: number) => {
                          const title = typeof srv === "string" ? srv : srv.title;
                          return (
                            <span
                              key={idx}
                              className="text-[9px] bg-muted px-1.5 py-0.5 rounded-md text-foreground/80 font-medium"
                            >
                              ✓ {title}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* "Why am I seeing this?" Transparency Accordion */}
              <div className="text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowWhyInfo(!showWhyInfo)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold transition"
                >
                  <Info className="h-3 w-3 text-violet-500" />
                  <span>Why am I seeing this?</span>
                  {showWhyInfo ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                <AnimatePresence>
                  {showWhyInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1.5"
                    >
                      <div className="p-2.5 bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/20 rounded-xl text-muted-foreground text-[10px] space-y-1">
                        <p>{whyExplanation}</p>
                        <p className="text-[9px] opacity-75">
                          🔒 Inferred solely from permitted platform browsing activity. Your raw activity is never shared with third parties.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleViewBusiness}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs h-9 rounded-xl shadow-md gap-1.5"
                >
                  <span>View Business</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>

                <Button
                  onClick={handleNotInterested}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold h-9 rounded-xl text-muted-foreground hover:text-foreground px-3 gap-1"
                  title="Don't recommend this business"
                >
                  <ThumbsDown className="h-3 w-3" />
                  <span className="hidden sm:inline">Not Interested</span>
                </Button>
              </div>

              {/* Settings and controls footer */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2.5 px-0.5">
                <span className="flex items-center gap-1">
                  <Bot className="h-3 w-3 text-violet-500" />
                  Smart Business Match
                </span>
                <Link
                  to="/dashboard/settings?tab=ai_match"
                  className="hover:text-primary transition underline underline-offset-2"
                >
                  Settings &amp; Controls
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
