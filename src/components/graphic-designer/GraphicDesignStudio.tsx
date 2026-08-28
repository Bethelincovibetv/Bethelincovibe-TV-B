import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Download,
  Save,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  Palette,
  CheckCircle2,
  AlertCircle,
  Building2,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
  Tag,
  Wallet,
  Phone,
  Plus,
  Trash2,
  Search,
  Upload,
  Type,
  Printer,
  Grid,
  Camera,
  Compass,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  GRAPHIC_FORMATS,
  GRAPHIC_THEMES,
  GraphicDesignFormatKey,
  GraphicThemeStyle,
  LocalGraphicOptions,
  renderLocalGraphicDesign,
  AI_IMPROVEMENT_PRESETS,
  AIImprovementPresetKey,
  parseNaturalLanguageDesignPrompt,
  LayoutArchetypeKey,
  FontPairingKey,
  StockPhotoAsset,
  CURATED_STOCK_CATALOG,
  searchStockPhotos,
  FONT_PAIRINGS,
  COLOR_THEMES,
} from "@/lib/localGraphicEngine";
import {
  checkUserDesignCredits,
  deductDesignCredits,
  DESIGN_CREDIT_COSTS,
} from "@/lib/designCredits";
import { saveDesign, SavedDesign } from "@/lib/savedDesignsManager";

interface GraphicDesignStudioProps {
  initialBusinessId?: string;
  onNavigateToLogoCreator?: (businessName?: string, category?: string) => void;
  onDesignSaved?: (design: SavedDesign) => void;
}

const LAYOUT_ARCHETYPES: {
  key: LayoutArchetypeKey;
  name: string;
  tagline: string;
  badge: string;
  description: string;
}[] = [
  {
    key: "split_asymmetric_hero",
    name: "Split-Hero Dynamic",
    tagline: "High-Impact Commercial",
    badge: "Most Popular",
    description: "45° angled stock photo mask with floating offer tag and high-contrast benefit list",
  },
  {
    key: "magazine_editorial",
    name: "Magazine Editorial",
    tagline: "Vogue / Luxury Cover",
    badge: "High Fashion & Luxe",
    description: "Architectural arched frame, oversized editorial serif display and prestige vertical bar",
  },
  {
    key: "luxury_center_portal",
    name: "Luxury Center Portal",
    tagline: "Prestige Concentric Frame",
    badge: "Real Estate & VIP",
    description: "Glowing metallic concentric circular portal with centered status hierarchy",
  },
  {
    key: "bold_commercial_retail",
    name: "Bold Retail Promo",
    tagline: "3D Urgent Flash Sale",
    badge: "High Conversion",
    description: "Layered dropshadow photo card, prominent 3D Naira price tag and dual-column perks",
  },
  {
    key: "event_masterpiece",
    name: "Event & Seminar",
    tagline: "Gold Ticket & Stage",
    badge: "Seminars & Church",
    description: "Diamond shield framing, top announcement ribbon, date callout and speaker card",
  },
  {
    key: "tech_minimalist_dark",
    name: "Tech Cyber Grid",
    tagline: "Obsidian Precision Grid",
    badge: "Tech & Solar",
    description: "Cyber coordinates, sleek sapphire neon line trims, and spec feature checkmarks",
  },
  {
    key: "food_gourmet_spotlight",
    name: "Gourmet Bistro",
    tagline: "Artisanal Foodie Frame",
    badge: "Food & Catering",
    description: "Organic dish circle focus, warm sunset wash, fresh daily badge and delivery box",
  },
  {
    key: "corporate_executive",
    name: "Corporate Executive",
    tagline: "Enterprise Trust Hierarchy",
    badge: "Legal & Consulting",
    description: "Structured navy layout, verified enterprise credentials, and advisory booking card",
  },
];

const STOCK_CATEGORIES = [
  { id: "all", label: "All Industries" },
  { id: "food", label: "🍲 Food & Catering" },
  { id: "fashion", label: "👗 Fashion & Luxe" },
  { id: "realestate", label: "🏢 Real Estate" },
  { id: "tech", label: "💻 Tech & Gadgets" },
  { id: "beauty", label: "💅 Beauty & Hair" },
  { id: "logistics", label: "🚚 Logistics & Auto" },
  { id: "corporate", label: "👔 Corporate & Legal" },
  { id: "events", label: "🎤 Events & Church" },
  { id: "solar", label: "⚡ Solar & Energy" },
  { id: "agriculture", label: "🌾 Agribusiness" },
];

export default function GraphicDesignStudio({
  initialBusinessId,
  onNavigateToLogoCreator,
  onDesignSaved,
}: GraphicDesignStudioProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // User Businesses
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(initialBusinessId || "custom");

  // Prompt state
  const [promptText, setPromptText] = useState("");
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);

  // Active Stage Tab
  const [activeStage, setActiveStage] = useState<"content" | "layout" | "stock" | "typography" | "style">("content");

  // Design configuration state
  const [formatKey, setFormatKey] = useState<GraphicDesignFormatKey>("business_flyer");
  const [layoutArchetype, setLayoutArchetype] = useState<LayoutArchetypeKey>("split_asymmetric_hero");
  const [fontPairing, setFontPairing] = useState<FontPairingKey>("modern_commercial");
  const [themeStyle, setThemeStyle] = useState<GraphicThemeStyle>("royal_gold");

  // Content state
  const [businessName, setBusinessName] = useState("Bethelin Enterprises");
  const [category, setCategory] = useState("Commerce & Retail");
  const [tagline, setTagline] = useState("Prestige Quality & Nationwide Fulfillment");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("Premium Quality Products & Fast Nationwide Delivery");
  const [subheadline, setSubheadline] = useState("Experience verified commercial excellence with our comprehensive catalog and 24/7 dedicated support.");
  const [priceTag, setPriceTag] = useState("₦25,000");
  const [badgeText, setBadgeText] = useState("👑 QUEEN VIP VERIFIED");
  const [ctaText, setCtaText] = useState("ORDER DIRECT ON WHATSAPP");
  const [phone, setPhone] = useState("+234 801 234 5678");
  const [whatsapp, setWhatsapp] = useState("+234 801 234 5678");
  const [address, setAddress] = useState("Lekki Phase 1, Lagos, Nigeria");
  const [highlights, setHighlights] = useState<string[]>([
    "100% Quality & Satisfaction Guaranteed",
    "Fast Nationwide Turnaround & Invoicing",
    "Direct Instant WhatsApp Order & Support",
  ]);

  // Stock Photo state
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");
  const [selectedStockAsset, setSelectedStockAsset] = useState<StockPhotoAsset | null>(CURATED_STOCK_CATALOG[0]);
  const [customStockUrl, setCustomStockUrl] = useState("");

  // Export scale (1 = web standard, 2 = 2x retina, 3 = 300dpi print ready)
  const [exportScale, setExportScale] = useState<number>(1);

  // Canvas preview & generation
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number>(0);

  // Wallet & Credits
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Load user's businesses & wallet balance
  useEffect(() => {
    if (!user) return;

    // Load wallet
    setLoadingBalance(true);
    supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setWalletBalance(Number(data?.balance) || 0);
        setLoadingBalance(false);
      });

    // Load businesses
    supabase
      .from("businesses")
      .select("id, name, category, phone, whatsapp, address, website, logo_url, description")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setUserBusinesses(data);
          if (initialBusinessId) {
            const match = data.find((b) => b.id === initialBusinessId);
            if (match) applyBusinessData(match);
          }
        }
      });
  }, [user, initialBusinessId]);

  const applyBusinessData = (biz: any) => {
    setSelectedBusinessId(biz.id);
    setBusinessName(biz.name || "");
    if (biz.category) setCategory(biz.category);
    if (biz.phone) setPhone(biz.phone);
    if (biz.whatsapp) setWhatsapp(biz.whatsapp);
    if (biz.address) setAddress(biz.address);
    if (biz.logo_url) {
      setLogoUrl(biz.logo_url);
    } else {
      setLogoUrl(null);
    }
    if (biz.name) {
      setHeadline(`Welcome to ${biz.name} — Verified Excellence`);
    }
  };

  const handleBusinessSelectChange = (bizId: string) => {
    setSelectedBusinessId(bizId);
    if (bizId === "custom") {
      setBusinessName("Bethelin Enterprises");
      setLogoUrl(null);
      return;
    }
    const match = userBusinesses.find((b) => b.id === bizId);
    if (match) applyBusinessData(match);
  };

  // Compile current options object
  const currentOptions: LocalGraphicOptions = useMemo(() => ({
    formatKey,
    layoutArchetype,
    fontPairing,
    themeStyle,
    businessName: businessName || "Bethelin Enterprises",
    category: category || "General Commerce",
    tagline,
    logoUrl,
    headline: headline || "High Converting Commercial Creative",
    subheadline,
    priceTag,
    badgeText,
    ctaText,
    phone,
    whatsapp,
    address,
    stockImageUrl: customStockUrl || undefined,
    stockAsset: selectedStockAsset || undefined,
    highlights,
    exportScale,
  }), [
    formatKey,
    layoutArchetype,
    fontPairing,
    themeStyle,
    businessName,
    category,
    tagline,
    logoUrl,
    headline,
    subheadline,
    priceTag,
    badgeText,
    ctaText,
    phone,
    whatsapp,
    address,
    customStockUrl,
    selectedStockAsset,
    highlights,
    exportScale,
  ]);

  // Render canvas
  const handleRenderCanvas = async (opts: LocalGraphicOptions = currentOptions) => {
    setIsRendering(true);
    try {
      const dataUrl = await renderLocalGraphicDesign(opts);
      setPreviewDataUrl(dataUrl);
      setLastGeneratedAt(Date.now());
    } catch (err) {
      console.error("Canvas render error:", err);
      toast.error("Failed to render graphic preview.");
    } finally {
      setIsRendering(false);
    }
  };

  // Debounced auto-render when design inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRenderCanvas(currentOptions);
    }, 280);
    return () => clearTimeout(timer);
  }, [
    formatKey,
    layoutArchetype,
    fontPairing,
    themeStyle,
    businessName,
    category,
    tagline,
    logoUrl,
    headline,
    subheadline,
    priceTag,
    badgeText,
    ctaText,
    phone,
    whatsapp,
    address,
    customStockUrl,
    selectedStockAsset,
    highlights,
  ]);

  // Stock photos search list
  const filteredStockPhotos = useMemo(() => {
    return searchStockPhotos(stockSearchQuery, stockCategoryFilter);
  }, [stockSearchQuery, stockCategoryFilter]);

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomStockUrl(dataUrl);
      setSelectedStockAsset(null);
      toast.success("Loaded your custom photo into design pipeline!");
    };
    reader.readAsDataURL(file);
  };

  // Handle Natural Language Prompt
  const handleApplyPrompt = () => {
    if (!promptText.trim()) return;
    setIsProcessingPrompt(true);

    const parsed = parseNaturalLanguageDesignPrompt(promptText);

    if (parsed.formatKey) setFormatKey(parsed.formatKey);
    if (parsed.layoutArchetype) setLayoutArchetype(parsed.layoutArchetype);
    if (parsed.fontPairing) setFontPairing(parsed.fontPairing);
    if (parsed.headline) setHeadline(parsed.headline);
    if (parsed.priceTag) setPriceTag(parsed.priceTag);
    if (parsed.phone) setPhone(parsed.phone);
    if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.themeStyle) setThemeStyle(parsed.themeStyle);

    setTimeout(() => {
      handleRenderCanvas({
        ...currentOptions,
        ...parsed,
      });
      setIsProcessingPrompt(false);
      toast.success("Senior Designer AI parsed your brief into a custom layout!");
    }, 300);
  };

  // Quick Prompt Preset
  const handleQuickPrompt = (text: string) => {
    setPromptText(text);
    const parsed = parseNaturalLanguageDesignPrompt(text);
    if (parsed.formatKey) setFormatKey(parsed.formatKey);
    if (parsed.layoutArchetype) setLayoutArchetype(parsed.layoutArchetype);
    if (parsed.headline) setHeadline(parsed.headline);
    if (parsed.priceTag) setPriceTag(parsed.priceTag);
    if (parsed.themeStyle) setThemeStyle(parsed.themeStyle);

    setTimeout(() => {
      handleRenderCanvas({
        ...currentOptions,
        ...parsed,
      });
      toast.success("Loaded commercial template brief!");
    }, 200);
  };

  // Handle AI Improvement Preset
  const handleApplyImprovement = async (presetKey: AIImprovementPresetKey) => {
    const preset = AI_IMPROVEMENT_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;

    if (user) {
      const creditCheck = await checkUserDesignCredits(user.id, DESIGN_CREDIT_COSTS.AI_IMPROVE);
      if (!creditCheck.hasEnough) {
        toast.error(
          `Insufficient credits (₦${creditCheck.currentBalance}). Required: ₦${DESIGN_CREDIT_COSTS.AI_IMPROVE}. Please top up your wallet.`
        );
        return;
      }
    }

    const improved = preset.apply(currentOptions);

    if (improved.layoutArchetype) setLayoutArchetype(improved.layoutArchetype);
    if (improved.fontPairing) setFontPairing(improved.fontPairing);
    if (improved.themeStyle) setThemeStyle(improved.themeStyle);
    if (improved.badgeText) setBadgeText(improved.badgeText);
    if (improved.ctaText) setCtaText(improved.ctaText);
    if (improved.priceTag) setPriceTag(improved.priceTag);
    if (improved.highlights) setHighlights(improved.highlights);
    if (improved.subheadline !== undefined) setSubheadline(improved.subheadline);

    await handleRenderCanvas(improved);

    if (user) {
      const res = await deductDesignCredits({
        userId: user.id,
        cost: DESIGN_CREDIT_COSTS.AI_IMPROVE,
        actionName: `AI Designer Refinement: ${preset.label}`,
      });
      if (res.success && res.newBalance !== undefined) {
        setWalletBalance(res.newBalance);
      }
    }

    toast.success(`Applied Professional Polish: "${preset.label}"!`);
  };

  // Handle Generate & Save with Credit Authorization
  const handleGenerateAndSave = async () => {
    if (!user) {
      toast.error("Please login to save and export your designs.");
      return;
    }

    const cost = DESIGN_CREDIT_COSTS.GRAPHIC_GENERATION;
    const creditCheck = await checkUserDesignCredits(user.id, cost);

    if (!creditCheck.hasEnough) {
      toast.error(
        `Insufficient balance (₦${creditCheck.currentBalance.toLocaleString()}). Generation requires ₦${cost}. Please top up your wallet.`,
        {
          action: {
            label: "Top Up Wallet",
            onClick: () => (window.location.href = "/dashboard/wallet"),
          },
        }
      );
      return;
    }

    setIsRendering(true);
    try {
      const freshDataUrl = await renderLocalGraphicDesign({
        ...currentOptions,
        exportScale,
      });
      setPreviewDataUrl(freshDataUrl);

      const deductRes = await deductDesignCredits({
        userId: user.id,
        cost,
        actionName: `Commercial Flyer: ${headline.slice(0, 30)}`,
      });

      if (!deductRes.success) {
        toast.error(deductRes.error || "Credit deduction failed.");
        setIsRendering(false);
        return;
      }

      if (deductRes.newBalance !== undefined) {
        setWalletBalance(deductRes.newBalance);
      }

      const activeFormat = GRAPHIC_FORMATS.find((f) => f.key === formatKey) || GRAPHIC_FORMATS[0];

      const saved = saveDesign(
        {
          userId: user.id,
          title: `${businessName} - ${activeFormat.label}`,
          type: "graphic",
          templateKey: formatKey,
          dimensions: {
            width: activeFormat.width * exportScale,
            height: activeFormat.height * exportScale,
            label: activeFormat.label,
            aspect: activeFormat.aspect,
          },
          previewDataUrl: freshDataUrl,
          businessId: selectedBusinessId !== "custom" ? selectedBusinessId : undefined,
          businessName,
          options: currentOptions,
          themeStyle,
        },
        user.id
      );

      toast.success("✨ $5,000 Commercial Graphic Saved to My Designs!", {
        description: `₦${cost} debited. New balance: ₦${deductRes.newBalance?.toLocaleString() || walletBalance}`,
      });

      if (onDesignSaved) {
        onDesignSaved(saved);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate design.");
    } finally {
      setIsRendering(false);
    }
  };

  // Download High-Res PNG
  const handleDownloadPng = async () => {
    if (!previewDataUrl) {
      toast.error("Please render the design first.");
      return;
    }

    setIsRendering(true);
    try {
      // Re-render at current selected exportScale to ensure max DPI
      const exportUrl = await renderLocalGraphicDesign({
        ...currentOptions,
        exportScale,
      });

      const activeFormat = GRAPHIC_FORMATS.find((f) => f.key === formatKey) || GRAPHIC_FORMATS[0];
      const link = document.createElement("a");
      link.href = exportUrl;
      link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${formatKey}_${exportScale}x_${activeFormat.width * exportScale}x${activeFormat.height * exportScale}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded High-Resolution PNG (${activeFormat.width * exportScale} × ${activeFormat.height * exportScale}px)!`);
    } catch (err) {
      toast.error("Download failed, please retry.");
    } finally {
      setIsRendering(false);
    }
  };

  // Highlight Bullet Management
  const handleAddHighlight = () => {
    if (highlights.length >= 5) {
      toast.error("Maximum 5 highlights for optical balance.");
      return;
    }
    setHighlights([...highlights, "New Verified Highlight Point"]);
  };

  const handleUpdateHighlight = (idx: number, val: string) => {
    const copy = [...highlights];
    copy[idx] = val;
    setHighlights(copy);
  };

  const handleRemoveHighlight = (idx: number) => {
    if (highlights.length <= 1) return;
    setHighlights(highlights.filter((_, i) => i !== idx));
  };

  const selectedBiz = userBusinesses.find((b) => b.id === selectedBusinessId);
  const showNoLogoAlert = selectedBusinessId !== "custom" && (!logoUrl || logoUrl.trim() === "");

  return (
    <div className="space-y-6">
      {/* 1. Header & Senior Designer AI Brief Bar */}
      <Card className="border shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-black tracking-wide">
                  👑 Senior Commercial Design Engine
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">
                  Structured 6-Stage Pipeline • No AI Slop
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-1">
                Commercial Flyer & Visual Media Studio
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Engineered for Nigerian SMEs: dynamic layout grids, curated African commercial photography, optical typography and high-contrast darkroom treatments.
              </p>
            </div>

            {/* Wallet Status Pill */}
            <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-2 rounded-xl border self-start sm:self-center">
              <Wallet className="h-4 w-4 text-emerald-500" />
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Wallet Balance
                </div>
                <div className="text-xs font-black text-foreground">
                  {loadingBalance ? "..." : `₦${(walletBalance ?? 0).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>

          {/* Natural Language Prompt Input */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Input
                placeholder="E.g. Create a 30% Off weekend flash sale flyer for my fashion boutique in Ikeja, phone 08012345678"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyPrompt()}
                className="pr-10 h-11 bg-background text-sm"
              />
              <Sparkles className="absolute right-3 top-3.5 h-4 w-4 text-amber-500 opacity-60" />
            </div>
            <Button
              onClick={handleApplyPrompt}
              disabled={isProcessingPrompt || !promptText.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 px-5 gap-1.5 shadow-sm"
            >
              {isProcessingPrompt ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              AI Parse Brief
            </Button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Design Archetype Presets:</span>
            {[
              "Lekki Duplex Real Estate Flyer",
              "Party Jollof & Grill Catering Promo",
              "Luxe Ankara Fashion Editorial",
              "A4 Print Handbill for Tech Repair",
              "Church Seminar VIP Event Flyer",
              "WhatsApp Status 30% Flash Sale",
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(preset)}
                className="text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium px-2.5 py-1 rounded-lg border transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. No Logo Detected Banner */}
      {showNoLogoAlert && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                "{selectedBiz?.name}" has no brand logo attached
              </h4>
              <p className="text-xs text-muted-foreground">
                Graphics convert 3x higher when featuring a crisp brand logo watermark. Would you like to create one now?
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigateToLogoCreator && onNavigateToLogoCreator(selectedBiz?.name, selectedBiz?.category)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            ✨ Create Logo First
          </Button>
        </div>
      )}

      {/* 3. Pipeline Stage Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
        {[
          { id: "content", label: "1. Content & Brief", icon: Tag },
          { id: "layout", label: "2. Layout Archetype", icon: Grid },
          { id: "stock", label: "3. Stock Photography", icon: Camera },
          { id: "typography", label: "4. Typography Pairing", icon: Type },
          { id: "style", label: "5. Color & Contrast", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStage(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Main Workspace Grid: Controls on Left, Live Canvas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customization Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Format & Dimension Selector */}
          <Card className="border shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Target Canvas Format & Aspect Ratio
                </Label>
                <span className="text-[11px] font-semibold text-primary">
                  {GRAPHIC_FORMATS.find((f) => f.key === formatKey)?.width} × {GRAPHIC_FORMATS.find((f) => f.key === formatKey)?.height}px
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GRAPHIC_FORMATS.map((fmt) => {
                  const isSelected = formatKey === fmt.key;
                  return (
                    <button
                      key={fmt.key}
                      onClick={() => setFormatKey(fmt.key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground"
                          : "border-border bg-card/50 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{fmt.label}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {fmt.aspect}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                        {fmt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* TAB 1: CONTENT & BRIEF */}
          {activeStage === "content" && (
            <div className="space-y-4 animate-in fade-in-50">
              {/* Business Profile Auto-Fill */}
              <Card className="border shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Business Profile & Identity
                    </Label>
                    {userBusinesses.length > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {userBusinesses.length} Business{userBusinesses.length > 1 ? "es" : ""} Loaded
                      </span>
                    )}
                  </div>

                  {userBusinesses.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedBusinessId}
                        onChange={(e) => handleBusinessSelectChange(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-hidden"
                      >
                        <option value="custom">✏️ Custom / Freeform Input</option>
                        {userBusinesses.map((b) => (
                          <option key={b.id} value={b.id}>
                            🏢 {b.name} ({b.category || "General"})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Business Name</Label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="E.g. Luxe Royale Boutique"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Category / Industry</Label>
                      <Input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="E.g. Fashion & Luxury"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Tagline / Motto</Label>
                      <Input
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="E.g. Prestige African Craftsmanship"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Logo URL (Optional)</Label>
                      <Input
                        value={logoUrl || ""}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://... or upload"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Marketing Copywriting Fields */}
              <Card className="border shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    Commercial Headline & Value Proposition
                  </Label>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Main Headline</Label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Primary hook or promo title"
                      className="h-10 text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Subheadline / Offer Description</Label>
                    <Textarea
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      rows={2}
                      placeholder="Brief description of service, discount, or product..."
                      className="text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Top Announcement Badge</Label>
                      <Input
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        placeholder="E.g. 👑 QUEEN VIP VERIFIED"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Price Tag / Discount Callout</Label>
                      <Input
                        value={priceTag}
                        onChange={(e) => setPriceTag(e.target.value)}
                        placeholder="E.g. ₦25,000 or 30% OFF"
                        className="h-10 text-sm font-bold text-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Value Highlights (Checklist)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddHighlight}
                        className="h-7 text-xs text-primary font-bold gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Bullet
                      </Button>
                    </div>
                    {highlights.map((hl, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-500">✓</span>
                        <Input
                          value={hl}
                          onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                          className="h-9 text-xs"
                        />
                        {highlights.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveHighlight(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Phone Number</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="E.g. +234 801 234 5678"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">WhatsApp Number</Label>
                      <Input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="E.g. +234 801 234 5678"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">CTA Button Text</Label>
                    <Input
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="E.g. ORDER DIRECT ON WHATSAPP"
                      className="h-10 text-sm font-bold"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: LAYOUT ARCHETYPE */}
          {activeStage === "layout" && (
            <Card className="border shadow-xs animate-in fade-in-50">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div>
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Grid className="h-3.5 w-3.5 text-primary" />
                    Select Composition Archetype
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Senior commercial design uses tailored visual grid systems rather than cookie-cutter templates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LAYOUT_ARCHETYPES.map((arch) => {
                    const isSelected = layoutArchetype === arch.key;
                    return (
                      <button
                        key={arch.key}
                        onClick={() => setLayoutArchetype(arch.key)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                            : "border-border bg-card/60 hover:bg-muted/50"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-foreground">
                              {arch.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                              {arch.badge}
                            </Badge>
                          </div>
                          <div className="text-[11px] font-semibold text-primary">
                            {arch.tagline}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {arch.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: STOCK PHOTOGRAPHY BROWSER */}
          {activeStage === "stock" && (
            <Card className="border shadow-xs animate-in fade-in-50">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-primary" />
                      Commercial Stock Photography
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Curated high-resolution stock photography tailored for Nigerian commerce.
                    </p>
                  </div>

                  {/* Upload Custom File Button */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-bold gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Photo
                    </Button>
                  </div>
                </div>

                {/* Stock Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search stock photos (e.g. jollof, asoebi, lekki, tech, braids, suit, food)..."
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>

                {/* Industry Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {STOCK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setStockCategoryFilter(cat.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                        stockCategoryFilter === cat.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Stock Photo Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {filteredStockPhotos.map((photo) => {
                    const isSelected = selectedStockAsset?.id === photo.id && !customStockUrl;
                    return (
                      <button
                        key={photo.id}
                        onClick={() => {
                          setSelectedStockAsset(photo);
                          setCustomStockUrl("");
                        }}
                        className={`group relative rounded-xl overflow-hidden border text-left transition-all ${
                          isSelected
                            ? "ring-2 ring-primary border-primary shadow-md"
                            : "border-border hover:border-muted-foreground/40"
                        }`}
                      >
                        <div className="aspect-4/3 bg-muted overflow-hidden relative">
                          <img
                            src={photo.thumbUrl}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Badge className="bg-primary text-primary-foreground font-black text-[10px]">
                                Selected
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-card">
                          <div className="text-[11px] font-bold text-foreground truncate">
                            {photo.title}
                          </div>
                          <div className="text-[9px] text-muted-foreground truncate">
                            Photo by {photo.author}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Direct Custom Stock URL */}
                <div className="pt-2 border-t space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Or Direct Image URL</Label>
                  <Input
                    value={customStockUrl}
                    onChange={(e) => {
                      setCustomStockUrl(e.target.value);
                      setSelectedStockAsset(null);
                    }}
                    placeholder="https://images.unsplash.com/... or custom CDN image"
                    className="h-9 text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: TYPOGRAPHY PAIRINGS */}
          {activeStage === "typography" && (
            <Card className="border shadow-xs animate-in fade-in-50">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div>
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-primary" />
                    Commercial Typography Pairings
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Engineered headline & support font pairings with optical tracking and automated line-height scaling.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(FONT_PAIRINGS).map((pairing) => {
                    const isSelected = fontPairing === pairing.key;
                    return (
                      <button
                        key={pairing.key}
                        onClick={() => setFontPairing(pairing.key)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                            : "border-border bg-card/60 hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-foreground">
                              {pairing.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {pairing.description}
                          </p>
                        </div>

                        <div className="p-2 bg-background/80 rounded-lg border border-border/60 text-center">
                          <span
                            className="text-xs font-bold tracking-tight text-foreground block truncate"
                            style={{ fontFamily: pairing.displayFont.replace(/'/g, "") }}
                          >
                            {headline.slice(0, 24)}...
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: COLOR & CONTRAST */}
          {activeStage === "style" && (
            <Card className="border shadow-xs animate-in fade-in-50">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div>
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    Color Palette & Darkroom Contrast
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suppresses background brightness mathematically to guarantee WCAG AAA text legibility and metallic gold foil trims.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.values(COLOR_THEMES).map((thm) => {
                    const isSelected = themeStyle === thm.id;
                    return (
                      <button
                        key={thm.id}
                        onClick={() => setThemeStyle(thm.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                            : "border-border bg-card/60 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-4 w-4 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: thm.primaryAccent }}
                          />
                          <div
                            className="h-4 w-4 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: thm.secondaryAccent }}
                          />
                          <div
                            className="h-4 w-4 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: thm.badgeBg }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground truncate">
                          {thm.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Live Canvas Preview, AI Improve Toolbar & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          {/* AI Senior Designer "Improve Design" Toolbar */}
          <Card className="border shadow-xs bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-primary/10">
            <CardContent className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-black text-foreground">
                    Senior Designer Polish Actions
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  10 Credits (₦10)
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                One-click optical enhancement tuned for conversion, contrast & hierarchy:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {AI_IMPROVEMENT_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleApplyImprovement(preset.key)}
                    className="p-2 rounded-xl bg-background/80 hover:bg-background border hover:border-amber-500/50 text-left transition-all group"
                  >
                    <div className="text-[11px] font-bold text-foreground group-hover:text-amber-500 truncate">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Live Canvas Preview Frame */}
          <Card className="border shadow-md overflow-hidden bg-muted/40">
            <div className="p-3 bg-card border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Live Studio Canvas</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Print Ready Scale Selector */}
                <select
                  value={exportScale}
                  onChange={(e) => setExportScale(Number(e.target.value))}
                  className="bg-muted text-[10px] font-bold rounded-md px-1.5 py-0.5 border text-foreground focus:outline-hidden"
                  title="Select Export Resolution"
                >
                  <option value={1}>1x Standard HD</option>
                  <option value={2}>2x Ultra Retina</option>
                  <option value={3}>3x Print 300DPI</option>
                </select>

                <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                  {formatKey.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center min-h-[380px] bg-neutral-950/50 relative">
              {isRendering ? (
                <div className="flex flex-col items-center gap-2 text-white">
                  <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                  <span className="text-xs font-bold">Compositing design pipeline...</span>
                </div>
              ) : previewDataUrl ? (
                <div className="relative group max-w-full max-h-[520px] rounded-xl overflow-hidden shadow-2xl border border-white/10">
                  <img
                    src={previewDataUrl}
                    alt="Commercial Design Preview"
                    className="w-full h-auto object-contain max-h-[520px] rounded-xl"
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-xs">
                  Click Refresh Preview to composite canvas
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 bg-card border-t space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cost: <strong className="text-foreground">25 Credits (₦25)</strong></span>
                <span>Wallet: <strong className="text-foreground">₦{(walletBalance ?? 0).toLocaleString()}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleGenerateAndSave}
                  disabled={isRendering}
                  className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold h-11 gap-1.5 shadow-md"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate & Save Design (₦25)
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDownloadPng}
                  disabled={!previewDataUrl || isRendering}
                  title="Download High-Res PNG (A4/Retina)"
                  className="h-11 w-11 shrink-0 rounded-xl border-border hover:bg-muted"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
