import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ShoppingBag,
  Store,
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  Eye,
  Share2,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Layers,
  Compass,
  RotateCcw,
  Info,
  Truck,
  CreditCard,
  QrCode,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { audio3D } from "@/lib/audio3DStoreEngine";
import mayaAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

export interface Shop3DRealLifeModeProps {
  business: any;
  products?: any[];
  services?: any[];
  onClose?: () => void;
  isModal?: boolean;
}

type ViewPreset = "entrance" | "aisle" | "vip" | "desk" | "dispatch";

export default function Shop3DRealLifeMode({
  business,
  products = [],
  services = [],
  onClose,
  isModal = false,
}: Shop3DRealLifeModeProps) {
  const [viewPreset, setViewPreset] = useState<ViewPreset>("entrance");
  const [yaw, setYaw] = useState(0); // Y-axis rotation (-45 to 45 deg)
  const [pitch, setPitch] = useState(4); // X-axis rotation (-15 to 25 deg)
  const [zoom, setZoom] = useState(1); // 0.85 to 1.3
  const [nightMode, setNightMode] = useState(false);
  const [muted, setMuted] = useState(audio3D.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [showAiGuide, setShowAiGuide] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Play entrance sound on mount
  useEffect(() => {
    audio3D.playShopChime();
    if (!audio3D.getMuted()) {
      audio3D.startBoutiqueAmbience();
    }
    return () => {
      audio3D.stopBoutiqueAmbience();
    };
  }, []);

  // Update camera coordinates based on view preset
  useEffect(() => {
    switch (viewPreset) {
      case "entrance":
        setYaw(0);
        setPitch(4);
        setZoom(1);
        break;
      case "aisle":
        setYaw(22);
        setPitch(2);
        setZoom(1.15);
        break;
      case "vip":
        setYaw(0);
        setPitch(-2);
        setZoom(1.22);
        break;
      case "desk":
        setYaw(-24);
        setPitch(6);
        setZoom(1.18);
        break;
      case "dispatch":
        setYaw(-36);
        setPitch(0);
        setZoom(1.1);
        break;
    }
  }, [viewPreset]);

  // Handle Drag / Orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    setYaw((prev) => Math.max(-45, Math.min(45, prev + deltaX * 0.25)));
    setPitch((prev) => Math.max(-15, Math.min(25, prev - deltaY * 0.2)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });

    setYaw((prev) => Math.max(-45, Math.min(45, prev + deltaX * 0.3)));
    setPitch((prev) => Math.max(-15, Math.min(25, prev - deltaY * 0.25)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const isNowMuted = audio3D.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      audio3D.playShopChime();
      audio3D.startBoutiqueAmbience();
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

  // Share 3D Shop Link
  const handleShareShop = async () => {
    const shareUrl = `${window.location.origin}/businesses/${business.slug || business.id}?shop3d=true`;
    const shareText = `Step inside our 3D Real Life Virtual Storefront on Bethelincovibe TV! Walk around our shelves and shop in 3D: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${business.name} — 3D Real Life Shop`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    const success = await copyToClipboard(shareUrl);
    if (success) {
      toast.success("3D Shop link copied to clipboard!");
    }
  };

  // Prepare product items (fallback to rich sample products if user has not yet uploaded catalog)
  const displayProducts = products.length > 0 ? products : [
    {
      id: "prod-demo-1",
      title: "Featured Flagship Selection",
      price: 45000,
      image_url: business.cover_url || business.logo_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      description: "Direct showroom display item available for immediate nationwide waybill delivery.",
      is_featured: true,
    },
    {
      id: "prod-demo-2",
      title: "Premium Edition Package",
      price: 28500,
      image_url: business.logo_url || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
      description: "High-grade verified inventory with full warranty and Bethelincovibe Escrow guarantee.",
    },
    {
      id: "prod-demo-3",
      title: "Popular Wholesale Bundle",
      price: 85000,
      image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      description: "Bulk wholesale order lot with discounted delivery to all 36 Nigerian states.",
    },
    {
      id: "prod-demo-4",
      title: "Executive Special Deal",
      price: 19500,
      image_url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80",
      description: "Fast-selling verified stock backed by instant Paystack buyer escrow protection.",
    },
  ];

  const waNumber = (business.whatsapp || business.phone || "").replace(/\D/g, "");
  const waContactUrl = waNumber ? `https://wa.me/${waNumber}` : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none font-sans ${
        isFullscreen
          ? "fixed inset-0 z-[9999] h-screen w-screen bg-neutral-950"
          : isModal
          ? "h-[85vh] min-h-[580px] rounded-3xl bg-neutral-950 text-white"
          : "h-[650px] sm:h-[750px] rounded-3xl bg-neutral-950 text-white shadow-2xl border border-border/80"
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Atmosphere Lighting Gradients */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${
          nightMode
            ? "bg-gradient-to-b from-indigo-950/90 via-neutral-950 to-neutral-950"
            : "bg-gradient-to-b from-amber-950/30 via-neutral-900/90 to-neutral-950"
        }`}
      />

      {/* Ceiling Ambient LED Strip Track */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10 flex items-center justify-around px-8">
        <div className={`h-1.5 w-32 rounded-full blur-[1px] ${nightMode ? "bg-cyan-400/80 shadow-[0_0_15px_#22d3ee]" : "bg-amber-300/80 shadow-[0_0_15px_#fde047]"}`} />
        <div className={`h-1.5 w-48 rounded-full blur-[1px] ${nightMode ? "bg-purple-400/80 shadow-[0_0_15px_#c084fc]" : "bg-amber-400/90 shadow-[0_0_15px_#fbbf24]"}`} />
        <div className={`h-1.5 w-32 rounded-full blur-[1px] ${nightMode ? "bg-emerald-400/80 shadow-[0_0_15px_#34d399]" : "bg-amber-300/80 shadow-[0_0_15px_#fde047]"}`} />
      </div>

      {/* TOP HEADER CONTROLS */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-auto">
        {/* Business Branding Pill */}
        <div className="flex items-center gap-2.5 bg-neutral-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-xl">
          <div className="relative">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-8 h-8 rounded-xl object-contain bg-white/10 p-0.5"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-xs">
                {business.name?.slice(0, 2).toUpperCase() || "3D"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-900" />
          </div>

          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
                {business.name}
              </span>
              {(business.is_verified || business.verified) && (
                <Badge className="h-4 px-1 text-[9px] bg-emerald-600 text-white font-bold gap-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" /> 3D Store
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-400">
              <span>{business.city || business.state || "Lagos, Nigeria"}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">Walk-in Mode</span>
            </div>
          </div>
        </div>

        {/* Action Controls (Audio, Lighting, Fullscreen, Close) */}
        <div className="flex items-center gap-1.5">
          {/* Day / Night Toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setNightMode(!nightMode)}
            className="h-8 w-8 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 text-white hover:bg-neutral-800"
            title={nightMode ? "Switch to Day Sunlight" : "Switch to Night Neon"}
          >
            {nightMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-cyan-300" />}
          </Button>

          {/* Audio Chime Toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleMute}
            className="h-8 w-8 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 text-white hover:bg-neutral-800"
            title={muted ? "Enable 3D Boutique Ambience" : "Mute Sound"}
          >
            {muted ? <VolumeX className="h-4 w-4 text-neutral-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </Button>

          {/* Share 3D Shop Link */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleShareShop}
            className="h-8 w-8 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 text-white hover:bg-neutral-800"
            title="Share 3D Shop Link"
          >
            <Share2 className="h-4 w-4 text-amber-400" />
          </Button>

          {/* Fullscreen Mode */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleFullscreen}
            className="h-8 w-8 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 text-white hover:bg-neutral-800 hidden sm:inline-flex"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* Close if modal or callback */}
          {onClose && (
            <Button
              size="icon"
              variant="destructive"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white shadow-md ml-1"
              title="Exit 3D Shop"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 3D PERSPECTIVE STAGE CONTAINER */}
      <div
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ perspective: "1100px" }}
      >
        {/* 3D Room Box that rotates with Yaw and Pitch */}
        <div
          className="relative w-[780px] h-[520px] transition-transform duration-500 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: `scale(${zoom}) rotateX(${pitch}deg) rotateY(${yaw}deg)`,
          }}
        >
          {/* BACK WALL (Storefront Billboard, Brand Logo & Neon Sign) */}
          <div
            className="absolute inset-0 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl flex flex-col items-center justify-between p-6"
            style={{
              transform: "translateZ(-300px)",
              background: nightMode
                ? "radial-gradient(circle at center, #1e1b4b 0%, #09090b 80%)"
                : "radial-gradient(circle at center, #3b200b 0%, #171717 80%)",
            }}
          >
            {/* Illuminated Brand Neon Sign */}
            <div className="text-center pt-3 space-y-1">
              <div
                className={`inline-block px-6 py-2 rounded-2xl border font-black tracking-wider uppercase text-lg sm:text-2xl shadow-2xl ${
                  nightMode
                    ? "bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.4)]"
                    : "bg-amber-950/70 border-amber-400 text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.4)]"
                }`}
              >
                ✦ {business.name} ✦
              </div>
              <p className="text-[11px] text-neutral-400 font-mono tracking-wide">
                {business.categories?.name || "Verified Retail & Wholesale Showroom"} • CAC VERIFIED
              </p>
            </div>

            {/* Back Wall Poster / Verification Seal Plaque */}
            <div className="flex items-center justify-center gap-6 my-auto">
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md text-center max-w-xs space-y-1 shadow-lg">
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Escrow Safe Trade Certificate</span>
                </div>
                <p className="text-[10px] text-neutral-300">
                  Every order placed inside this 3D shop is backed by Bethelincovibe Escrow. 100% money-back guarantee.
                </p>
              </div>

              {business.cover_url && (
                <div className="hidden sm:block w-40 h-28 rounded-2xl overflow-hidden border border-white/20 shadow-md">
                  <img
                    src={business.cover_url}
                    alt="Store Premise"
                    className="w-full h-full object-cover brightness-90"
                  />
                </div>
              )}
            </div>

            {/* Baseboard Neon Glow */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />
          </div>

          {/* FLOOR (Reflective Shop Tiles & Entrance Mat) */}
          <div
            className="absolute inset-x-0 bottom-0 h-[480px] rounded-3xl pointer-events-none"
            style={{
              transform: "rotateX(90deg) translateZ(-160px) translateY(140px)",
              background: nightMode
                ? "linear-gradient(to bottom, #030712 0%, #111827 50%, #030712 100%)"
                : "linear-gradient(to bottom, #1c1917 0%, #292524 50%, #1c1917 100%)",
              boxShadow: "inset 0 0 80px rgba(0,0,0,0.8)",
            }}
          >
            {/* Tile grid lines */}
            <div className="w-full h-full bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] flex items-center justify-center">
              {/* Doormat */}
              <div className="px-8 py-3 rounded-xl border border-white/10 bg-black/40 text-neutral-400 text-[11px] font-bold tracking-widest uppercase">
                WELCOME • STEP INSIDE
              </div>
            </div>
          </div>

          {/* LEFT WALL: PRODUCT SHELVING UNIT (Interactive 3D Display) */}
          <div
            className="absolute top-12 left-0 w-[240px] h-[380px] rounded-2xl p-3 border border-white/10 shadow-xl flex flex-col justify-between"
            style={{
              transform: "rotateY(70deg) translateZ(180px) translateX(-50px)",
              background: nightMode
                ? "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(2,6,23,0.95))"
                : "linear-gradient(135deg, rgba(41,37,36,0.9), rgba(28,25,23,0.95))",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Aisle 1: In-Stock
              </span>
              <Badge className="text-[9px] bg-primary/20 text-primary border-0">Naira Deals</Badge>
            </div>

            {/* Shelves Items */}
            <div className="space-y-3">
              {displayProducts.slice(0, 2).map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    audio3D.playInspectTap();
                    setActiveProduct(item);
                  }}
                  className="group p-2 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/50 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover bg-black/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300">
                        {item.title}
                      </h4>
                      <div className="text-[11px] font-black text-emerald-400">
                        ₦{Number(item.price || 0).toLocaleString()}
                      </div>
                      <span className="text-[9px] text-neutral-400 group-hover:text-white flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" /> Tap to inspect
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-[10px] text-neutral-400 pt-2 border-t border-white/10 font-mono">
              ★ Guaranteed Real Stock
            </div>
          </div>

          {/* CENTER: VIP REVOLVING SHOWCASE PEDESTAL */}
          <div
            className="absolute top-28 left-1/2 -translate-x-1/2 w-[220px] h-[260px] rounded-3xl p-3 border border-amber-500/30 flex flex-col items-center justify-between text-center shadow-2xl"
            style={{
              transform: "translateZ(-80px)",
              background: nightMode
                ? "radial-gradient(circle, rgba(30,27,75,0.85) 0%, rgba(15,23,42,0.95) 100%)"
                : "radial-gradient(circle, rgba(69,26,3,0.85) 0%, rgba(28,25,23,0.95) 100%)",
            }}
          >
            <div className="w-full flex items-center justify-between">
              <Badge className="bg-amber-500 text-neutral-950 font-black text-[9px] gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> VIP SPOTLIGHT
              </Badge>
              <span className="text-[10px] text-emerald-400 font-bold">Fast Dispatch</span>
            </div>

            {/* Pedestal Rotating Display Item */}
            {displayProducts[0] && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  audio3D.playInspectTap();
                  setActiveProduct(displayProducts[0]);
                }}
                className="group cursor-pointer my-auto flex flex-col items-center gap-1.5"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-xl group-hover:scale-105 transition-transform bg-black/40">
                  <img
                    src={displayProducts[0].image_url}
                    alt={displayProducts[0].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                    <span className="text-[9px] font-bold text-amber-300">Tap Product</span>
                  </div>
                </div>

                <div className="max-w-[180px]">
                  <h3 className="text-xs font-black text-white truncate">
                    {displayProducts[0].title}
                  </h3>
                  <div className="text-xs font-black text-emerald-400">
                    ₦{Number(displayProducts[0].price || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Glowing pedestal base plate */}
            <div className="w-28 h-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 blur-[1px] shadow-[0_0_15px_#f59e0b]" />
          </div>

          {/* RIGHT WALL: CASHIER & ESCROW DESK */}
          <div
            className="absolute top-12 right-0 w-[240px] h-[380px] rounded-2xl p-3.5 border border-emerald-500/20 shadow-xl flex flex-col justify-between"
            style={{
              transform: "rotateY(-70deg) translateZ(180px) translateX(50px)",
              background: nightMode
                ? "linear-gradient(225deg, rgba(6,78,59,0.5), rgba(2,6,23,0.95))"
                : "linear-gradient(225deg, rgba(20,83,45,0.4), rgba(28,25,23,0.95))",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[11px] font-black uppercase text-emerald-400 flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Escrow Desk
              </span>
              <Badge className="text-[9px] bg-emerald-600/30 text-emerald-300 border-0">
                0% Scam Risk
              </Badge>
            </div>

            {/* Cashier Desk Terminal & QR */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                  <QrCode className="h-4 w-4" />
                </div>
                <div className="text-left text-[11px]">
                  <div className="font-bold text-white">Instant Payment</div>
                  <div className="text-neutral-400 text-[9px]">Paystack &amp; Transfer</div>
                </div>
              </div>

              {displayProducts[1] && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    audio3D.playInspectTap();
                    setActiveProduct(displayProducts[1]);
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer flex items-center gap-2 text-left"
                >
                  <img
                    src={displayProducts[1].image_url}
                    alt={displayProducts[1].title}
                    className="w-8 h-8 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-white truncate">{displayProducts[1].title}</p>
                    <p className="text-[9px] text-emerald-400 font-bold">₦{Number(displayProducts[1].price || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Quick Order Button */}
            {waContactUrl ? (
              <Button
                asChild
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-8 rounded-xl gap-1 shadow-md"
              >
                <a
                  href={`${waContactUrl}?text=${encodeURIComponent(`Hello ${business.name}, I am visiting your 3D Real Life Shop on Bethelincovibe TV and would like to make an inquiry!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Order on WhatsApp
                </a>
              </Button>
            ) : (
              <div className="text-center text-[10px] text-neutral-400 font-mono">
                Verified Seller Desk
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM FLOATING AI CONCIERGE (Maya Sterling) */}
      {showAiGuide && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
          <div className="p-3.5 rounded-2xl bg-neutral-900/90 backdrop-blur-md border border-amber-500/30 shadow-2xl flex items-start gap-3">
            <div className="relative shrink-0">
              <img
                src={mayaAvatar}
                alt="Maya Concierge"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-400/40"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-neutral-900 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-300 text-[11px]">
                  Maya • 3D Concierge
                </span>
                <button
                  type="button"
                  onClick={() => setShowAiGuide(false)}
                  className="text-neutral-400 hover:text-white text-[10px]"
                >
                  Hide
                </button>
              </div>
              <p className="text-neutral-200 text-[11px] leading-relaxed">
                Welcome to <strong>{business.name}</strong>'s 3D real life showroom! Drag anywhere to look around the aisles, or tap any product on the shelves to inspect prices &amp; specifications.
              </p>

              {waContactUrl && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`${waContactUrl}?text=${encodeURIComponent(`Hello! I saw your store on Bethelincovibe TV 3D mode. Do you have discounts for bulk orders?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold"
                  >
                    💬 Ask Wholesale Discount
                  </a>
                  <a
                    href={`${waContactUrl}?text=${encodeURIComponent(`Hi! How quickly can you dispatch delivery to my location?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-neutral-300 text-[10px]"
                  >
                    🚚 Delivery Timelines
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM VIEW PRESET SELECTOR BAR */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 rounded-2xl bg-neutral-900/85 backdrop-blur-md border border-white/15 shadow-xl scrollbar-none">
          {[
            { id: "entrance", label: "🚪 Entrance", tip: "Front View" },
            { id: "aisle", label: "🛒 Shelves", tip: "Aisle Stock" },
            { id: "vip", label: "💎 VIP Spotlight", tip: "Center Stage" },
            { id: "desk", label: "💳 Escrow Desk", tip: "Checkout" },
            { id: "dispatch", label: "📦 Waybill Station", tip: "Logistics" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                audio3D.playInspectTap();
                setViewPreset(preset.id as ViewPreset);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPreset === preset.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-[1.02]"
                  : "bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Reset Camera Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setYaw(0);
            setPitch(4);
            setZoom(1);
            setViewPreset("entrance");
          }}
          className="h-8 text-[11px] font-bold rounded-xl bg-neutral-900/80 border-white/15 text-white hover:bg-neutral-800 gap-1 shrink-0"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Reset Camera</span>
        </Button>
      </div>

      {/* PRODUCT INSPECTION DIALOG */}
      <Dialog open={Boolean(activeProduct)} onOpenChange={(open) => !open && setActiveProduct(null)}>
        <DialogContent className="sm:max-w-md bg-neutral-950 border border-amber-500/30 text-white rounded-3xl p-5 shadow-2xl">
          {activeProduct && (
            <div className="space-y-4">
              <div className="relative h-56 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10">
                <img
                  src={activeProduct.image_url}
                  alt={activeProduct.title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-amber-500 text-neutral-950 font-black text-xs">
                  3D Shelf Item
                </Badge>
                <Badge className="absolute top-3 right-3 bg-emerald-600 text-white font-bold text-xs gap-1">
                  <ShieldCheck className="h-3 w-3" /> Escrow Protected
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white leading-tight">
                  {activeProduct.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-extrabold text-emerald-400">
                    ₦{Number(activeProduct.price || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    Official Showroom Price
                  </span>
                </div>
                {activeProduct.description && (
                  <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                    {activeProduct.description}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Nationwide delivery via verified courier</span>
                </div>
                <span className="text-emerald-400 font-bold">In-Stock</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {waContactUrl ? (
                  <Button
                    asChild
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 gap-1 shadow-lg"
                  >
                    <a
                      href={`${waContactUrl}?text=${encodeURIComponent(
                        `Hello ${business.name}, I am inspecting "${activeProduct.title}" (₦${Number(activeProduct.price || 0).toLocaleString()}) in your 3D Real Life Shop on Bethelincovibe TV and want to purchase it!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Buy on WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl h-10"
                  >
                    <Link to={`/businesses/${business.slug || business.id}`}>
                      View Business
                    </Link>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    copyToClipboard(
                      `${window.location.origin}/businesses/${business.slug || business.id}?shop3d=true&item=${activeProduct.id}`
                    );
                    toast.success("Product 3D link copied!");
                  }}
                  className="w-full border-white/20 text-white hover:bg-white/10 font-bold text-xs rounded-xl h-10 gap-1"
                >
                  <Share2 className="h-4 w-4 text-amber-400" />
                  Share Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
