import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CreativeAdExperience, {
  CreativeExperienceType,
  CreativeExperienceConfig,
} from "@/components/ads/CreativeAdExperience";
import {
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Flame,
  Star,
  Clock,
  Eye,
  MessageCircle,
  Megaphone,
  Maximize2,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface AdvertItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  target_url?: string;
  click_url?: string;
  whatsapp_number?: string;
  badge_text?: string;
  urgency_tag?: string;
  social_proof?: string;
  placement?: string;
  clicks?: number;
  impressions?: number;
  sponsor_name?: string;
  is_verified?: boolean;
  display_template?: "full_flyer" | "banner" | "card" | "featured" | "compact";
  experience_type?: CreativeExperienceType;
  experience_config?: CreativeExperienceConfig;
}

export interface LiveRotatingAdvertProps {
  ads: AdvertItem[];
  watermark?: { text?: string; url?: string };
  format?: "full_flyer" | "banner" | "card" | "featured" | "compact" | "feed" | "flyer" | "billboard";
  autoRotateInterval?: number; // default 7000ms
  className?: string;
  onAdClick?: (ad: AdvertItem) => void;
  onImpression?: (ad: AdvertItem) => void;
}

export default function LiveRotatingAdvert({
  ads = [],
  watermark = { text: "Bethelincovibe TV" },
  format = "banner",
  autoRotateInterval = 7000,
  className = "",
  onAdClick,
  onImpression,
}: LiveRotatingAdvertProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [zoomFlyerUrl, setZoomFlyerUrl] = useState<string | null>(null);
  const recordedImpressions = useRef<Set<string>>(new Set());

  const validAds = ads.length > 0 ? ads : [];

  // If index out of bounds due to array changes, clamp it
  useEffect(() => {
    if (currentIndex >= validAds.length && validAds.length > 0) {
      setCurrentIndex(0);
    }
  }, [validAds.length, currentIndex]);

  const activeAd = validAds[currentIndex];

  // Track impression for current active ad
  useEffect(() => {
    if (!activeAd || !activeAd.id) return;
    if (!recordedImpressions.current.has(activeAd.id)) {
      recordedImpressions.current.add(activeAd.id);
      if (onImpression) {
        onImpression(activeAd);
      }
    }
  }, [activeAd, onImpression]);

  // Handle smooth progress bar & rotation timer
  useEffect(() => {
    if (validAds.length <= 1 || isPaused) return;

    setProgress(0);
    const tickInterval = 50; // update progress every 50ms
    const totalSteps = autoRotateInterval / tickInterval;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      const currentPct = Math.min(100, (step / totalSteps) * 100);
      setProgress(currentPct);

      if (step >= totalSteps) {
        setDirection("right");
        setCurrentIndex((prev) => (prev + 1) % validAds.length);
        step = 0;
        setProgress(0);
      }
    }, tickInterval);

    return () => clearInterval(timer);
  }, [currentIndex, validAds.length, isPaused, autoRotateInterval]);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDirection("right");
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % validAds.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDirection("left");
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + validAds.length) % validAds.length);
  };

  const handleSelectIndex = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(idx > currentIndex ? "right" : "left");
    setProgress(0);
    setCurrentIndex(idx);
  };

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused((prev) => !prev);
  };

  const handleClick = (adItem: AdvertItem) => {
    if (onAdClick) {
      onAdClick(adItem);
    }
  };

  if (!activeAd) return null;

  const targetHref = activeAd.target_url || activeAd.click_url || "#";
  const displayTitle = activeAd.title || "Featured Sponsor";
  const displayDesc = activeAd.description || "Discover verified goods, merchandise and exclusive deals on Bethelincovibe.";
  const displayImage = activeAd.image_url;
  const sponsorName = activeAd.sponsor_name || "Verified Partner";
  const socialProof = activeAd.social_proof || "🔥 High engagement sponsor in Nigeria";
  const urgencyTag = activeAd.urgency_tag || "⚡ Live Exclusive Promotion";
  const badgeText = activeAd.badge_text || "Sponsored";

  // Effective template: per-ad preference, or fallback to format
  const effectiveTemplate =
    activeAd.display_template ||
    (format === "flyer" ? "full_flyer" : format === "feed" ? "card" : format);

  // Animation variants
  const slideVariants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 40 : -40,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.35, ease: "easeOut" },
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -40 : 40,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.25, ease: "easeIn" },
    }),
  };

  // Common Lightbox Dialog for Fullscreen Flyer Viewing
  const renderLightbox = () =>
    zoomFlyerUrl && (
      <Dialog open={!!zoomFlyerUrl} onOpenChange={(open) => !open && setZoomFlyerUrl(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-border/40 text-white rounded-3xl overflow-hidden flex flex-col items-center justify-center">
          <DialogTitle className="sr-only">Flyer Fullscreen View</DialogTitle>
          <div className="relative max-h-[85dvh] w-full flex items-center justify-center p-3 sm:p-4">
            <img
              src={zoomFlyerUrl}
              alt="Flyer High Resolution Preview"
              className="max-h-[80dvh] w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
          <div className="p-3 sm:p-4 w-full flex items-center justify-between border-t border-white/10 bg-black/40 text-xs">
            <div className="flex items-center gap-2 truncate max-w-[70%]">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white truncate">{displayTitle}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoomFlyerUrl(null)}
              className="rounded-xl text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 h-8"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );

  // ==========================================================================
  // TEMPLATE 1: FULL FLYER (Rich Hero Layout for Event/Service Posters & Menus)
  // ==========================================================================
  if (effectiveTemplate === "full_flyer") {
    return (
      <div
        id={`live-advert-fullflyer-${activeAd.id}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className={`group relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-b from-card via-card/95 to-primary/5 p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-300 ${className}`}
      >
        {renderLightbox()}

        {/* Top Header with Live Indicator & Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="default"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 shadow-xs flex items-center gap-1"
            >
              <Flame className="h-3 w-3 animate-bounce" /> {badgeText}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1 bg-muted/60 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {sponsorName}
            </span>
          </div>

          {/* Live Rotating Indicator Pill */}
          {validAds.length > 1 && (
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-border/70 text-[10px] font-bold text-muted-foreground shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Flyer {currentIndex + 1}/{validAds.length}
              </span>
              <button
                type="button"
                onClick={handleTogglePause}
                className="hover:text-foreground text-muted-foreground ml-1 p-0.5 transition-colors"
                title={isPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
                aria-label="Toggle pause"
              >
                {isPaused ? <Play className="h-2.5 w-2.5 text-amber-500" /> : <Pause className="h-2.5 w-2.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Urgency Tag */}
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" /> {urgencyTag}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">{socialProof}</span>
        </div>

        {/* Dynamic Flyer Presentation */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeAd.id + "-" + currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-4"
          >
            {displayImage && (
              <div className="relative group/img overflow-hidden rounded-2xl bg-neutral-950/90 dark:bg-black/80 shadow-md p-1.5 sm:p-2.5 flex items-center justify-center min-h-[320px] max-h-[560px] sm:max-h-[640px] border border-border/40">
                <img
                  src={displayImage}
                  alt={displayTitle}
                  loading="lazy"
                  className="w-full max-h-[540px] sm:max-h-[620px] object-contain rounded-xl transition-transform duration-300 group-hover/img:scale-[1.01]"
                />

                {/* Inspect / Zoom Overlay Pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setZoomFlyerUrl(displayImage);
                  }}
                  className="absolute top-3 right-3 bg-black/75 hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg border border-white/20 cursor-pointer transition hover:scale-105 active:scale-95"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Tap to Zoom Full Flyer
                </button>

                {(watermark.url || watermark.text) && (
                  <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none shadow-sm">
                    {watermark.url && <img src={watermark.url} alt="" className="h-3 w-3 object-contain" />}
                    {watermark.text || "Bethelincovibe TV"}
                  </span>
                )}
              </div>
            )}

            {/* Separated Headline & Description */}
            <div className="space-y-1.5">
              <a
                href={targetHref}
                target="_blank"
                rel="noopener sponsored"
                onClick={() => handleClick(activeAd)}
                className="font-black text-base sm:text-lg text-foreground hover:text-primary transition-colors block leading-snug"
              >
                {displayTitle}
              </a>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{displayDesc}</p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <Button
                asChild
                size="sm"
                className="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground font-black shadow-md text-xs h-10 gap-1.5 active:scale-95 transition-transform"
              >
                <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={() => handleClick(activeAd)}>
                  Claim Special Offer <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>

              {activeAd.whatsapp_number && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto rounded-xl border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold text-xs h-10 gap-1.5"
                >
                  <a
                    href={`https://wa.me/${activeAd.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hello, I saw your live verified offer "${displayTitle}" on Bethelincovibe.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Inquire
                  </a>
                </Button>
              )}
            </div>

            {/* Embedded Creative Ad Experience Engine (Interactive, Conversational, or Minigame) */}
            {activeAd.experience_type && activeAd.experience_type !== "static" && (
              <CreativeAdExperience
                type={activeAd.experience_type}
                config={activeAd.experience_config}
                adTitle={displayTitle}
                adDescription={displayDesc}
                targetUrl={targetHref}
                whatsappNumber={activeAd.whatsapp_number}
                sponsorName={sponsorName}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Pagination Dots & Auto-Rotate Progress Bar */}
        {validAds.length > 1 && (
          <div className="mt-4 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {validAds.map((adItem, idx) => (
                <button
                  key={adItem.id || idx}
                  type="button"
                  onClick={(e) => handleSelectIndex(idx, e)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "w-6 bg-primary shadow-xs"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                title="Previous ad"
                aria-label="Previous ad"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                title="Next ad"
                aria-label="Next ad"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Auto-rotation Progress Line */}
        {validAds.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // TEMPLATE 2: FEATURED SHOWCASE (Radiant Border, High Engagement Badge)
  // ==========================================================================
  if (effectiveTemplate === "featured") {
    return (
      <div
        id={`live-advert-featured-${activeAd.id}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className={`group relative overflow-hidden rounded-3xl border-2 border-primary/50 bg-gradient-to-r from-primary/15 via-card to-amber-500/15 p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 ${className}`}
      >
        {renderLightbox()}

        {/* Top Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-[10px] font-black uppercase px-2.5 py-0.5 flex items-center gap-1 shadow-xs">
              <Star className="h-3 w-3 fill-current" /> Featured Partner
            </Badge>
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {sponsorName}
            </span>
          </div>

          {validAds.length > 1 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentIndex + 1}/{validAds.length}</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeAd.id + "-" + currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-3"
          >
            {displayImage && (
              <div className="relative overflow-hidden rounded-2xl bg-neutral-950/80 max-h-[300px] min-h-[170px] flex items-center justify-center p-1 border border-border/40">
                <img
                  src={displayImage}
                  alt={displayTitle}
                  loading="lazy"
                  className="w-full max-h-[290px] object-contain rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setZoomFlyerUrl(displayImage)}
                  className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                >
                  <Maximize2 className="h-3 w-3" /> Zoom
                </button>
              </div>
            )}

            <div className="space-y-1">
              <a
                href={targetHref}
                target="_blank"
                rel="noopener sponsored"
                onClick={() => handleClick(activeAd)}
                className="font-black text-base text-foreground hover:text-primary transition-colors block"
              >
                {displayTitle}
              </a>
              <p className="text-xs text-muted-foreground line-clamp-2">{displayDesc}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                asChild
                size="sm"
                className="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-primary to-amber-500 text-white font-black text-xs h-9 shadow-xs"
              >
                <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={() => handleClick(activeAd)}>
                  Claim Featured Deal <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
              {activeAd.whatsapp_number && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-9 font-bold border-emerald-500/40 text-emerald-600">
                  <a href={`https://wa.me/${activeAd.whatsapp_number.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>

            {activeAd.experience_type && activeAd.experience_type !== "static" && (
              <CreativeAdExperience
                type={activeAd.experience_type}
                config={activeAd.experience_config}
                adTitle={displayTitle}
                adDescription={displayDesc}
                targetUrl={targetHref}
                whatsappNumber={activeAd.whatsapp_number}
                sponsorName={sponsorName}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Auto-rotate progress */}
        {validAds.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/30 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // TEMPLATE 3: IN-FEED CARD (For sidebars, product grids & directory feeds)
  // ==========================================================================
  if (effectiveTemplate === "card") {
    return (
      <div
        id={`live-advert-card-${activeAd.id}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-primary/25 bg-card/95 p-4 shadow-md hover:shadow-xl transition-all duration-300 ${className}`}
      >
        {renderLightbox()}

        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <Badge
              variant="default"
              className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5"
            >
              <Sparkles className="h-3 w-3 mr-1" /> {badgeText}
            </Badge>

            {validAds.length > 1 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {currentIndex + 1}/{validAds.length}
                </span>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeAd.id + "-" + currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-2.5"
            >
              {displayImage && (
                <div className="relative block overflow-hidden rounded-xl bg-neutral-950/80 min-h-[170px] max-h-[260px] group-hover:opacity-95 transition-opacity flex items-center justify-center shadow-xs p-1">
                  <img
                    src={displayImage}
                    alt={displayTitle}
                    loading="lazy"
                    className="w-full max-h-[250px] object-contain rounded-xl transition-transform duration-500 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomFlyerUrl(displayImage)}
                    className="absolute top-1.5 right-1.5 bg-black/75 hover:bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                  >
                    <Maximize2 className="h-2.5 w-2.5" /> Zoom
                  </button>
                  {(watermark.url || watermark.text) && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/65 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
                      {watermark.text || "Bethelincovibe TV"}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> {sponsorName}
                </div>
                <a
                  href={targetHref}
                  target="_blank"
                  rel="noopener sponsored"
                  onClick={() => handleClick(activeAd)}
                  className="font-bold text-sm sm:text-base text-foreground line-clamp-2 hover:text-primary transition-colors block"
                >
                  {displayTitle}
                </a>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{displayDesc}</p>
              </div>

              {activeAd.experience_type && activeAd.experience_type !== "static" && (
                <CreativeAdExperience
                  type={activeAd.experience_type}
                  config={activeAd.experience_config}
                  adTitle={displayTitle}
                  adDescription={displayDesc}
                  targetUrl={targetHref}
                  whatsappNumber={activeAd.whatsapp_number}
                  sponsorName={sponsorName}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 space-y-2">
          <Button
            asChild
            size="sm"
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs text-xs h-9 gap-1.5"
          >
            <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={() => handleClick(activeAd)}>
              Visit Partner Store <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>

          {validAds.length > 1 && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                {validAds.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => handleSelectIndex(idx, e)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Next"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auto-rotate progress line */}
        {validAds.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/20 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // TEMPLATE 4: COMPACT INLINE BAR
  // ==========================================================================
  if (effectiveTemplate === "compact") {
    return (
      <div
        id={`live-advert-compact-${activeAd.id}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`my-2 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 px-3 py-2 shadow-xs ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase px-1.5 py-0 shrink-0">
            Live
          </Badge>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeAd.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="truncate flex-1"
            >
              <a
                href={targetHref}
                target="_blank"
                rel="noopener sponsored"
                onClick={() => handleClick(activeAd)}
                className="text-xs font-bold text-foreground hover:text-primary transition truncate block"
              >
                {displayTitle} — <span className="font-normal text-muted-foreground">{displayDesc}</span>
              </a>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold px-2">
            <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={() => handleClick(activeAd)}>
              Explore <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>

          {validAds.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Previous"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Next"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // TEMPLATE 5: STANDARD WIDE LIVE ROTATING BANNER (Default)
  // ==========================================================================
  return (
    <div
      id={`live-advert-banner-${activeAd.id}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className={`relative my-4 overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 p-3.5 sm:p-5 shadow-md transition-all hover:border-primary/40 ${className}`}
    >
      {renderLightbox()}

      {/* Live Badge & Dynamic Social Psychology Tag */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 flex items-center gap-1"
          >
            <Megaphone className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" /> {badgeText}
          </Badge>
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> {sponsorName}
          </span>
          <span className="hidden md:inline-flex text-[10px] text-primary/80 font-medium items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
            <Sparkles className="h-2.5 w-2.5" /> {socialProof}
          </span>
        </div>

        {validAds.length > 1 && (
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-border/60 text-[10px] font-bold text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Live {currentIndex + 1} of {validAds.length}
            </span>
            <button
              type="button"
              onClick={handleTogglePause}
              className="hover:text-foreground text-muted-foreground ml-0.5 p-0.5 transition-colors"
              title={isPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
            >
              {isPaused ? <Play className="h-2.5 w-2.5 text-amber-500" /> : <Pause className="h-2.5 w-2.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Animated Rotating Slide */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeAd.id + "-" + currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {displayImage && (
              <div className="relative shrink-0 w-full sm:w-56 min-h-[120px] max-h-44 overflow-hidden rounded-xl bg-neutral-950/80 shadow-xs group flex items-center justify-center border border-border/50 p-1">
                <img
                  src={displayImage}
                  alt={displayTitle}
                  loading="lazy"
                  className="max-h-40 w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => setZoomFlyerUrl(displayImage)}
                  className="absolute top-1.5 right-1.5 bg-black/75 hover:bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                >
                  <Maximize2 className="h-2.5 w-2.5" /> Zoom
                </button>
                {(watermark.url || watermark.text) && (
                  <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
                    {watermark.text || "Bethelincovibe TV"}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 text-left space-y-1.5 w-full">
              <a
                href={targetHref}
                target="_blank"
                rel="noopener sponsored"
                onClick={() => handleClick(activeAd)}
                className="block font-black text-sm sm:text-base md:text-lg text-foreground hover:text-primary transition-colors leading-snug"
              >
                {displayTitle}
              </a>

              <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed">{displayDesc}</p>

              <div className="flex items-center gap-2 pt-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" /> {urgencyTag}
                </span>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <Button
                asChild
                size="sm"
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground font-black shadow-sm text-xs h-10 px-5 gap-1.5"
              >
                <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={() => handleClick(activeAd)}>
                  Claim Offer <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>

          {/* Embedded Experience Engine */}
          {activeAd.experience_type && activeAd.experience_type !== "static" && (
            <CreativeAdExperience
              type={activeAd.experience_type}
              config={activeAd.experience_config}
              adTitle={displayTitle}
              adDescription={displayDesc}
              targetUrl={targetHref}
              whatsappNumber={activeAd.whatsapp_number}
              sponsorName={sponsorName}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Manual Arrow Controls & Pagination Dots */}
      {validAds.length > 1 && (
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {validAds.map((adItem, idx) => (
              <button
                key={adItem.id || idx}
                type="button"
                onClick={(e) => handleSelectIndex(idx, e)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
                aria-label={`Go to ad ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg bg-background/80 hover:bg-muted text-foreground border border-border/60 transition-colors shadow-xs"
              title="Previous ad"
              aria-label="Previous ad"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg bg-background/80 hover:bg-muted text-foreground border border-border/60 transition-colors shadow-xs"
              title="Next ad"
              aria-label="Next ad"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Auto-rotation progress line */}
      {validAds.length > 1 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

