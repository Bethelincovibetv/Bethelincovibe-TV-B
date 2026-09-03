import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  MapPin,
  Info,
  ThumbsDown,
  Bot,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Badge } from "@/components/ui/badge";
import {
  BusinessMatchResult,
  subscribeToRecommender,
  recordRecommendationFeedback,
  getRecommenderUserPrefs,
  findBestBusinessMatch,
  getUserInterestProfile,
  trackRecommenderSignal,
} from "@/lib/aiBusinessRecommenderEngine";
import aiMatchAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

export default function AIBusinessMatchAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { flags } = useFeatureFlags();
  const systemEnabled = flags.ai_recommender !== false;
  const triggerEnabled = flags.ai_recommender_button !== false;

  const [match, setMatch] = useState<BusinessMatchResult | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showWhyInfo, setShowWhyInfo] = useState<boolean>(false);
  const [userPrefs, setUserPrefs] = useState(getRecommenderUserPrefs());
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Subscribe to real-time recommendation updates
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;

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

    // Check on mount or navigation if an intent pattern already exists
    async function checkInitialIntent() {
      const prefs = getRecommenderUserPrefs();
      setUserPrefs(prefs);
      if (!prefs.enabled) return;

      const profile = getUserInterestProfile();
      if (profile.totalSignalsCount >= 2 && profile.confidence >= 60) {
        const found = await findBestBusinessMatch();
        if (found) {
          setMatch(found);
        }
      }
    }

    const timer = setTimeout(checkInitialIntent, 3000);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [isDismissed, location.pathname]);

  // Completely omit matchmaker from all admin pages and when disabled
  if (location.pathname.startsWith("/admin") || !systemEnabled || !userPrefs.enabled) {
    return null;
  }

  // Handle Manual Trigger / Scan
  const handleTriggerMatch = async (categoryKeyword?: string) => {
    setIsScanning(true);
    setIsDismissed(false);
    setIsExpanded(true);
    try {
      if (categoryKeyword) {
        trackRecommenderSignal({
          type: "search",
          keywords: [categoryKeyword],
          path: location.pathname,
        });
      }
      const found = await findBestBusinessMatch(
        categoryKeyword
          ? { overrideIntentKeywords: [categoryKeyword], overrideCategory: categoryKeyword }
          : undefined
      );
      if (found) {
        setMatch(found);
        recordRecommendationFeedback({
          businessId: found.business.id,
          businessName: found.business.name,
          category: found.business.categories?.name || found.business.category || "General",
          action: "shown",
          confidence: found.confidence,
        });
      }
    } catch (e) {
      console.warn("Manual match error:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleViewBusiness = () => {
    if (!match) return;
    recordRecommendationFeedback({
      businessId: match.business.id,
      businessName: match.business.name,
      category: match.business.categories?.name || match.business.category || "General",
      action: "click",
      confidence: match.confidence,
    });
    setIsDismissed(true);
    navigate(`/businesses/${match.business.slug || match.business.id}`);
  };

  const handleNotInterested = () => {
    if (!match) return;
    recordRecommendationFeedback({
      businessId: match.business.id,
      businessName: match.business.name,
      category: match.business.categories?.name || match.business.category || "General",
      action: "not_interested",
      confidence: match.confidence,
    });
    setIsDismissed(true);
  };

  const handleClose = () => {
    if (match) {
      recordRecommendationFeedback({
        businessId: match.business.id,
        businessName: match.business.name,
        category: match.business.categories?.name || match.business.category || "General",
        action: "dismiss",
        confidence: match.confidence,
      });
    }
    setIsDismissed(true);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // If dismissed or no match yet, show sleek Maya trigger lapped against the screen side
  if (isDismissed || !match) {
    if (!userPrefs.show_avatar || !triggerEnabled) return null;
    return (
      <aside
        aria-label="AI Business Match Assistant"
        className="fixed right-0 bottom-24 md:bottom-28 z-40 select-none pointer-events-auto"
      >
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 50, opacity: 0 }}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleTriggerMatch()}
          className="relative flex items-center gap-2.5 py-2 pl-3 pr-2.5 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border-y border-l border-violet-500/35 rounded-l-2xl shadow-2xl cursor-pointer hover:border-violet-500/70 transition-all group"
          title="Maya — Smart AI Business Match Specialist"
        >
          <div className="relative shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-purple-500 to-amber-400 rounded-full blur-xs opacity-75 group-hover:opacity-100 transition animate-pulse" />
            <img
              src={aiMatchAvatar}
              alt="Maya AI Match Specialist"
              className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md"
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-foreground flex items-center gap-1">
                Maya <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
              </span>
              <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 font-bold">
                Match
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[120px]">
              {isScanning ? "Scanning..." : "Ask Maya"}
            </p>
          </div>
        </motion.div>
      </aside>
    );
  }

  const { business, dialogue, confidence, whyExplanation } = match;
  const isVerified = Boolean(business.is_verified || business.verified);
  const catName = business.categories?.name || business.category || "Verified Business";

  return (
    <aside
      aria-label="AI Business Match Assistant"
      className="fixed right-0 bottom-20 md:bottom-6 z-40 select-none pointer-events-auto"
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Minimized side-lapped pill hugging the screen edge
          <motion.div
            key="minimized-pill"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleExpand}
            className="flex items-center gap-2.5 py-2 pl-3 pr-3 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border-y border-l border-violet-500/35 rounded-l-2xl shadow-2xl cursor-pointer hover:border-violet-500/60 transition-all group max-w-[280px]"
          >
            {/* 3D Avatar with glowing ring */}
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-amber-500 rounded-full blur-xs opacity-75 group-hover:opacity-100 transition animate-pulse" />
              <img
                src={aiMatchAvatar}
                alt="Maya AI Match Assistant"
                className="relative h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md"
              />
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>

            <div className="flex flex-col text-left overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-foreground flex items-center gap-1">
                  Maya <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                </span>
                <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 font-bold">
                  {confidence}% Match
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                {dialogue.hook}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 ml-auto" />
          </motion.div>
        ) : (
          // Full Interactive 3D Match Assistant Card, lapped to the screen side
          <div className="pr-3 sm:pr-6">
            <motion.div
              key="expanded-card"
              initial={{ opacity: 0, scale: 0.92, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.88, x: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-[calc(100vw-24px)] sm:w-[410px] bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-violet-500/25 dark:border-violet-500/35 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Top Assistant Header */}
              <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white p-3.5 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-0.5 bg-white/40 rounded-full blur-xs" />
                    <img
                      src={aiMatchAvatar}
                      alt="Maya — AI Match Specialist"
                      className="relative h-11 w-11 rounded-full object-cover border-2 border-white/80 shadow-md"
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
                    onClick={() => handleTriggerMatch()}
                    disabled={isScanning}
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                    title="Find another recommendation"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleExpand}
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                    title="Minimize to side"
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
              <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
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
                            const title = typeof srv === "string" ? srv : srv?.title || srv?.name || "";
                            if (!title) return null;
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

                {/* Quick Topic Explorer Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
                  <span className="text-muted-foreground font-semibold shrink-0">Explore:</span>
                  {[
                    { label: "🎉 Events", key: "events" },
                    { label: "💻 Tech", key: "tech" },
                    { label: "👗 Fashion", key: "fashion" },
                    { label: "⚡ Solar", key: "solar" },
                    { label: "📜 Legal", key: "legal" },
                    { label: "🚚 Logistics", key: "logistics" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleTriggerMatch(item.key)}
                      className="shrink-0 px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-violet-500/10 hover:border-violet-500/30 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 font-medium transition"
                    >
                      {item.label}
                    </button>
                  ))}
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
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
