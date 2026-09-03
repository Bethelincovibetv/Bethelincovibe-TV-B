import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldCheck,
  Building2,
  Store,
  Palette,
  MessageCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Star,
  CheckCircle2,
  Smartphone,
  Eye,
  Layers,
  Zap,
  TrendingUp,
  Lock,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { audio3D } from "@/lib/audio3DStoreEngine";
import RealLife3DShopModal from "@/components/shop/RealLife3DShopModal";
import mayaAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

interface AdvertSection {
  id: string;
  number: number;
  badge: string;
  badgeColor: string;
  title: string;
  tagline: string;
  description: string;
  icon: any;
  accentGradient: string;
  primaryAction: {
    label: string;
    url: string;
    is3DTrigger?: boolean;
  };
  features: { title: string; desc: string }[];
  stats: { value: string; label: string }[];
  visualType: "directory" | "shop3d" | "ai_studio" | "whatsapp" | "escrow";
}

const ADVERT_SECTIONS: AdvertSection[] = [
  {
    id: "directory",
    number: 1,
    badge: "Verified Discovery",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    title: "1. Verified Nigerian Business Directory & Google Ad Presence",
    tagline: "High-converting Google Ad-style showcase for real Nigerian businesses",
    description:
      "Transform your business into a verified, high-converting digital storefront. Get featured with official CAC verification badges, star rating customer reviews, and direct 1-tap WhatsApp and call lead generation.",
    icon: Building2,
    accentGradient: "from-blue-600 via-indigo-600 to-sky-500",
    primaryAction: {
      label: "Browse Directory",
      url: "/businesses",
    },
    features: [
      {
        title: "Google Ad Card Format",
        desc: "Display URLs, sitelinks, and rich callout extensions designed for high customer click-throughs.",
      },
      {
        title: "CAC Verified Gold Plaque",
        desc: "Establish instant trust with prospective clients across Lagos, Abuja, Port Harcourt, and beyond.",
      },
      {
        title: "Direct WhatsApp & Phone Leads",
        desc: "Customers contact you directly without middleman friction or hidden commission cuts.",
      },
    ],
    stats: [
      { value: "4.9 ★", label: "Merchant Rating" },
      { value: "100%", label: "Verified Contact" },
      { value: "36 States", label: "Nationwide Reach" },
    ],
    visualType: "directory",
  },
  {
    id: "shop3d",
    number: 2,
    badge: "Virtual Reality",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    title: "2. 3D Real-Life Virtual Shopfronts & Interactive Aisles",
    tagline: "Let customers walk inside your physical boutique and inspect products in 3D",
    description:
      "Take digital commerce into the next dimension. Bethelincovibe TV auto-builds an interactive 3D virtual showroom for every business you add, complete with illuminated shelves, VIP spotlight pedestals, and WhatsApp order desks.",
    icon: Store,
    accentGradient: "from-amber-500 via-orange-500 to-rose-500",
    primaryAction: {
      label: "Launch 3D Shop Demo",
      url: "#",
      is3DTrigger: true,
    },
    features: [
      {
        title: "Interactive 3D Walkthrough",
        desc: "Rotate, orbit, and zoom through entrance doors, shelving aisles, and cashier desks in 60fps 3D.",
      },
      {
        title: "Tap-to-Inspect Shelves",
        desc: "Buyers tap any product on your 3D shelves to view real-time Naira prices and high-res details.",
      },
      {
        title: "Share on WhatsApp Status",
        desc: "Share your 3D shop link directly to WhatsApp Status. No mobile app download required for customers.",
      },
    ],
    stats: [
      { value: "360°", label: "Spatial Orbit" },
      { value: "60 FPS", label: "Zero Lag 3D" },
      { value: "1-Click", label: "Status Share" },
    ],
    visualType: "shop3d",
  },
  {
    id: "ai_studio",
    number: 3,
    badge: "Creative Intelligence",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    title: "3. Maya AI Creative Studio & Autonomous Graphic Workforce",
    tagline: "Agency-grade commercial flyers, brand logos, and sales copy in 10 seconds",
    description:
      "Stop spending ₦10,000 on slow freelance graphic designers. Maya Sterling and our autonomous 6-stage design pipeline craft print-ready 1080x1350 flyers, vectorized brand logos, and sales funnels for only ₦25.",
    icon: Palette,
    accentGradient: "from-purple-600 via-pink-600 to-amber-500",
    primaryAction: {
      label: "Open Graphic Studio",
      url: "/dashboard/graphic-designer",
    },
    features: [
      {
        title: "Instagram & WhatsApp Formats",
        desc: "Perfect 4:5 portrait and 9:16 status flyer ratios with darkened contrast for high conversion.",
      },
      {
        title: "Curated Nigerian Stock Photos",
        desc: "Thousands of authentic Nigerian commerce photos (fashion, cuisine, gadgets, CAC certs).",
      },
      {
        title: "AI Business Concierge",
        desc: "Maya advises on wholesale pricing, profit margins, and social media posting schedules.",
      },
    ],
    stats: [
      { value: "10 Sec", label: "Generation Speed" },
      { value: "₦25", label: "Per Flyer" },
      { value: "300 DPI", label: "Retina Print" },
    ],
    visualType: "ai_studio",
  },
  {
    id: "whatsapp",
    number: 4,
    badge: "Audience Monetization",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    title: "4. WhatsApp Audience Engine & Paid Status Promoters",
    tagline: "Turn real WhatsApp Status views into a scalable daily sales pipeline",
    description:
      "Expand your business reach to 50,000+ real Lagos and Nigerian entrepreneurs. Sync contacts securely via Google Contacts API, or hire verified WhatsApp Status promoters to broadcast your advert to high-income viewers.",
    icon: MessageCircle,
    accentGradient: "from-emerald-600 via-teal-600 to-cyan-500",
    primaryAction: {
      label: "Launch WhatsApp Engine",
      url: "/whatsapp-engine",
    },
    features: [
      {
        title: "Google Contacts & People Sync",
        desc: "Consent-based vCard and Google API contact synchronization to grow organic daily views.",
      },
      {
        title: "Pay-Per-View Status Promoters",
        desc: "Verified promoters post your flyer on their status and earn daily Naira for verified views.",
      },
      {
        title: "Automated Dispute Arbitration",
        desc: "Platform AI evaluates proof of broadcast screenshots, ensuring zero wasted ad budget.",
      },
    ],
    stats: [
      { value: "50,000+", label: "Daily Status Views" },
      { value: "100%", label: "Real Contacts" },
      { value: "Instant", label: "Promoter Payouts" },
    ],
    visualType: "whatsapp",
  },
  {
    id: "escrow",
    number: 5,
    badge: "100% Scam-Free",
    badgeColor: "bg-amber-500/20 text-emerald-400 border-emerald-500/30",
    title: "5. Escrow Protected Treasury & Instant Nigerian Bank Payouts",
    tagline: "Trade safely with automated buyer protection and instant merchant settlement",
    description:
      "Never worry about online scams again. When a customer buys via Bethelincovibe TV, the funds are safely secured in Escrow. Once the waybill is delivered and confirmed, money is instantly transferred to the seller's bank.",
    icon: ShieldCheck,
    accentGradient: "from-emerald-600 via-yellow-600 to-amber-600",
    primaryAction: {
      label: "Open Escrow Wallet",
      url: "/dashboard/wallet",
    },
    features: [
      {
        title: "Automated Milestone Escrow",
        desc: "Buyer money is locked in a secure Paystack custody treasury until delivery inspection.",
      },
      {
        title: "Zero Scam Risk Guarantee",
        desc: "If a seller fails to ship, buyer receives an instant 100% refund without tedious delays.",
      },
      {
        title: "Instant Bank Withdrawals",
        desc: "Direct payouts to GTBank, Access, Zenith, OPay, PalmPay, and all CBN-licensed banks.",
      },
    ],
    stats: [
      { value: "₦0", label: "Scam Loss" },
      { value: "Instant", label: "Bank Settlement" },
      { value: "24/7", label: "AI Dispute Desk" },
    ],
    visualType: "escrow",
  },
];

export default function Platform3DAnimatedAdvert() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(audio3D.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [demo3DOpen, setDemo3DOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentSection = ADVERT_SECTIONS[currentIdx];

  // Auto-play progress timer (8 seconds per section)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = 100; // update progress every 100ms
    const step = 100 / (8000 / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Advance to next section
          setCurrentIdx((idx) => {
            const nextIdx = (idx + 1) % ADVERT_SECTIONS.length;
            audio3D.playSceneTransition();
            return nextIdx;
          });
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentIdx]);

  // Handle section switch
  const handleSelectSection = (idx: number) => {
    setCurrentIdx(idx);
    setProgress(0);
    audio3D.playSceneTransition();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const isNowMuted = audio3D.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      audio3D.playShopChime();
    }
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Sample Demo Business for 3D Shop launch in Advert
  const sampleBusiness = {
    id: "advert-sample-biz",
    name: "Lagos Executive Tech & Solar Hub",
    slug: "lagos-executive-tech",
    description: "Verified supplier of premium solar generators, laptops, and electronics in Ikeja Computer Village with nationwide waybill delivery.",
    city: "Ikeja",
    state: "Lagos",
    is_verified: true,
    verified: true,
    phone: "+2348012345678",
    whatsapp: "2348012345678",
    categories: { name: "Electronics & Solar" },
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden bg-neutral-950 text-white border-2 border-primary/30 shadow-2xl font-sans ${
        isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen rounded-none" : "min-h-[580px] sm:min-h-[640px]"
      }`}
    >
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 pointer-events-none" />
      <div
        className={`absolute inset-0 opacity-25 blur-3xl pointer-events-none transition-all duration-1000 bg-gradient-to-r ${currentSection.accentGradient}`}
      />

      {/* Grid line pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* TOP HEADER CONTROLS BAR */}
      <div className="relative z-20 px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b border-white/10 bg-neutral-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full rounded-[10px] bg-neutral-950 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                3D Interactive Platform Advert
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black">
                LIVE DEMO
              </Badge>
            </div>
            <p className="text-[10px] text-neutral-400">
              Interactive 5-Chapter 3D Commercial for Bethelincovibe TV
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            title={isPlaying ? "Pause Commercial" : "Play Commercial"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-emerald-400" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setProgress(0);
              setCurrentIdx(0);
              audio3D.playSceneTransition();
            }}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            title="Restart Advert from Beginning"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleMute}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            title={muted ? "Enable Audio Chime" : "Mute Sound"}
          >
            {muted ? <VolumeX className="h-4 w-4 text-neutral-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleFullscreen}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white hidden sm:inline-flex"
            title="Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* CHAPTER PROGRESS LINE */}
      <div className="relative z-20 w-full h-1 bg-white/10">
        <div
          className={`h-full bg-gradient-to-r ${currentSection.accentGradient} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* MAIN ADVERT STAGE (Split Grid: Left Storytelling, Right 3D Visual Simulation) */}
      <div className="relative z-10 p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* LEFT COLUMN: Section Description & Core Value */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={`${currentSection.badgeColor} text-[10px] font-black uppercase tracking-wider`}>
              {currentSection.badge}
            </Badge>
            <span className="text-xs font-mono text-neutral-400">
              Chapter {currentSection.number} of {ADVERT_SECTIONS.length}
            </span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            {currentSection.title}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-amber-300">
            {currentSection.tagline}
          </p>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal">
            {currentSection.description}
          </p>

          {/* Key Benefit Highlights */}
          <div className="space-y-2 pt-1">
            {currentSection.features.map((feat, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-bold">{feat.title}: </strong>
                  <span className="text-neutral-300">{feat.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {currentSection.stats.map((s, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-sm sm:text-base font-black text-white">{s.value}</div>
                <div className="text-[10px] text-neutral-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Call to Action Button */}
          <div className="pt-2 flex items-center gap-3 flex-wrap">
            {currentSection.primaryAction.is3DTrigger ? (
              <Button
                onClick={() => setDemo3DOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl h-11 px-6 shadow-xl gap-2 active:scale-95"
              >
                <Store className="h-4 w-4" />
                {currentSection.primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className={`bg-gradient-to-r ${currentSection.accentGradient} hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl h-11 px-6 shadow-xl gap-2`}
              >
                <Link to={currentSection.primaryAction.url}>
                  {currentSection.primaryAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const nextIdx = (currentIdx + 1) % ADVERT_SECTIONS.length;
                handleSelectSection(nextIdx);
              }}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm rounded-2xl h-11 px-4"
            >
              Next Section <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE 3D VISUAL SIMULATION */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div
            className="relative w-full max-w-md h-[340px] sm:h-[400px] rounded-3xl p-5 border border-white/20 shadow-2xl flex flex-col justify-between overflow-hidden transition-all duration-700"
            style={{
              perspective: "1000px",
              background: "linear-gradient(135deg, rgba(23,23,23,0.95), rgba(10,10,10,0.98))",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Ambient Spotlight inside simulation */}
            <div
              className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30 bg-gradient-to-r ${currentSection.accentGradient}`}
            />

            {/* SCENE 1: 3D GOOGLE AD CARD */}
            {currentSection.visualType === "directory" && (
              <div
                className="space-y-3 my-auto transition-transform duration-500 ease-out"
                style={{ transform: "rotateX(6deg) rotateY(-4deg)" }}
              >
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-blue-500/30 shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-neutral-800 text-white text-[9px] font-black">Ad · Sponsored</Badge>
                      <span className="text-[10px] text-emerald-400 font-mono">bethelincovibe.tv › biz › lagos</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-sky-400" />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white">
                      Lagos Solar &amp; Tech Mart — Verified Merchant
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 pt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400" />
                      ))}
                      <span className="text-white font-bold ml-1">4.9</span>
                      <span className="text-neutral-400">(150+ reviews)</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 line-clamp-2">
                    Official CAC registered supplier of solar inverters, laptops, and electronics in Ikeja.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-center font-bold text-amber-300">
                      🏬 3D Real Life Shop
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-center font-bold text-emerald-400">
                      💬 WhatsApp Direct
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 2: 3D REAL LIFE STOREFRONT */}
            {currentSection.visualType === "shop3d" && (
              <div
                className="space-y-3 my-auto transition-transform duration-500 ease-out"
                style={{ transform: "rotateX(8deg) rotateY(4deg)" }}
              >
                <div className="p-4 rounded-2xl bg-neutral-900/95 border border-amber-500/40 shadow-2xl space-y-3">
                  {/* Neon Storefront Sign */}
                  <div className="text-center">
                    <div className="inline-block px-4 py-1.5 rounded-xl border border-amber-400 bg-amber-950/70 text-amber-300 font-black text-xs uppercase shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                      ✦ LAGOS VIRTUAL BOUTIQUE ✦
                    </div>
                    <p className="text-[9px] text-neutral-400 font-mono mt-1">
                      REAL LIFE 3D SHOWROOM • ENTRANCE
                    </p>
                  </div>

                  {/* 3D Shelves simulation */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
                      <div className="text-[10px] font-bold text-white">Shelf A1</div>
                      <div className="h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-black text-amber-300">
                        📦 Product Pedestal
                      </div>
                      <span className="text-[9px] text-emerald-400 font-black">₦45,000</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
                      <div className="text-[10px] font-bold text-white">Cashier Desk</div>
                      <div className="h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-black text-emerald-300">
                        💳 Escrow POS
                      </div>
                      <span className="text-[9px] text-white/80">0% Scam Risk</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setDemo3DOpen(true)}
                    size="sm"
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-extrabold text-xs rounded-xl h-8 gap-1 shadow-lg"
                  >
                    <Store className="h-3.5 w-3.5" /> Step Inside in 3D
                  </Button>
                </div>
              </div>
            )}

            {/* SCENE 3: MAYA AI FLYER STUDIO */}
            {currentSection.visualType === "ai_studio" && (
              <div
                className="space-y-3 my-auto transition-transform duration-500 ease-out"
                style={{ transform: "rotateX(4deg) rotateY(-6deg)" }}
              >
                <div className="p-4 rounded-2xl bg-neutral-900/95 border border-purple-500/40 shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <img src={mayaAvatar} alt="Maya" className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-bold text-purple-300">Maya Design Engine</span>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 text-[9px]">1080x1350 4:5</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1 text-center">
                    <div className="text-[10px] font-black uppercase text-amber-400">
                      FLASH PROMO FLYER
                    </div>
                    <div className="text-xs font-extrabold text-white">
                      VIP WEEKEND 50% DISCOUNT
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-black">
                      ₦15,000 ONLY
                    </div>
                    <p className="text-[9px] text-neutral-400">
                      Direct WhatsApp: 0801 234 5678
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Export: 300 DPI PNG</span>
                    <span className="text-emerald-400 font-bold">Cost: ₦25</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 4: WHATSAPP ENGINE */}
            {currentSection.visualType === "whatsapp" && (
              <div
                className="space-y-3 my-auto transition-transform duration-500 ease-out"
                style={{ transform: "rotateX(6deg) rotateY(6deg)" }}
              >
                <div className="p-4 rounded-2xl bg-neutral-900/95 border border-emerald-500/40 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-emerald-400" />
                      <span className="text-xs font-bold text-white">WhatsApp Status Hub</span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">Google People API</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300">Audience Network</span>
                      <span className="font-extrabold text-emerald-400">52,480 Views</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="w-4/5 h-full bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Broadcast flyer to 500+ verified active WhatsApp promoters.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-300 font-medium">
                    <span>✓ Anti-Spam Protected</span>
                    <span className="text-amber-400">Earn Daily Naira</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 5: ESCROW TREASURY */}
            {currentSection.visualType === "escrow" && (
              <div
                className="space-y-3 my-auto transition-transform duration-500 ease-out"
                style={{ transform: "rotateX(4deg) rotateY(-4deg)" }}
              >
                <div className="p-4 rounded-2xl bg-neutral-900/95 border border-amber-500/40 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Escrow Vault</span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">Paystack Settled</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Held in Escrow:</span>
                      <span className="font-black text-white">₦185,000</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Waybill Delivery:</span>
                      <span className="font-bold text-emerald-400">Confirmed by Buyer</span>
                    </div>
                    <div className="h-1 w-full bg-emerald-500/50 rounded-full" />
                    <div className="text-[10px] text-center text-emerald-400 font-bold">
                      ✓ Payout Released to Seller Bank Account
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-neutral-400 font-mono">
                    Zero Chargeback Fraud • 100% Guaranteed
                  </div>
                </div>
              </div>
            )}

            {/* Bottom 3D Scene Controls */}
            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-white/10">
              <span className="flex items-center gap-1">
                <Compass className="h-3 w-3 text-amber-400" />
                3D Interactive View
              </span>
              <span className="font-mono text-neutral-400">
                Chapter {currentIdx + 1}/5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CHAPTER NAVIGATION DOCK */}
      <div className="relative z-20 px-4 sm:px-6 py-3 border-t border-white/10 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {ADVERT_SECTIONS.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleSelectSection(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentIdx === idx
                  ? `bg-gradient-to-r ${sec.accentGradient} text-white shadow-lg scale-[1.02]`
                  : "bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              <span>{sec.number}.</span>
              <span className="truncate max-w-[120px] sm:max-w-[160px]">{sec.badge}</span>
            </button>
          ))}
        </div>

        {/* Prev / Next buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const prevIdx = (currentIdx - 1 + ADVERT_SECTIONS.length) % ADVERT_SECTIONS.length;
              handleSelectSection(prevIdx);
            }}
            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 text-white"
            title="Previous Chapter"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const nextIdx = (currentIdx + 1) % ADVERT_SECTIONS.length;
              handleSelectSection(nextIdx);
            }}
            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 text-white"
            title="Next Chapter"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 3D Real Life Shop Modal (Triggerable from advert) */}
      <RealLife3DShopModal
        open={demo3DOpen}
        onOpenChange={setDemo3DOpen}
        business={sampleBusiness}
      />
    </div>
  );
}
