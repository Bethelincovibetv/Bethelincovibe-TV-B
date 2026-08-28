import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Download,
  Save,
  RefreshCw,
  Zap,
  Building2,
  CheckCircle2,
  AlertCircle,
  Palette,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Store,
  Layers,
  Check,
  Wallet,
  Eye,
  Sliders,
  Type,
  Maximize2,
  Image as ImageIcon,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AILogoGeneratorOptions,
  buildLogoSvgMarkup,
  convertSvgToPngDataUrl,
  extractInitials,
  generateAILogos,
  GeneratedLogoItem,
  LOGO_PALETTES,
  LogoType,
  LogoShape,
} from "@/lib/aiLogoEngine";
import {
  checkUserDesignCredits,
  deductDesignCredits,
  DESIGN_CREDIT_COSTS,
} from "@/lib/designCredits";
import { saveDesign, SavedDesign } from "@/lib/savedDesignsManager";

interface LogoCreatorStudioProps {
  initialBusinessName?: string;
  initialCategory?: string;
  onLogoSelectedForGraphic?: (logoUrl: string) => void;
  onDesignSaved?: (design: SavedDesign) => void;
}

export default function LogoCreatorStudio({
  initialBusinessName = "",
  initialCategory = "",
  onLogoSelectedForGraphic,
  onDesignSaved,
}: LogoCreatorStudioProps) {
  const { user } = useAuth();

  // User Businesses
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);

  // Generation parameters
  const [businessName, setBusinessName] = useState(initialBusinessName || "Bethelin Enterprise");
  const [tagline, setTagline] = useState("PREMIUM QUALITY");
  const [category, setCategory] = useState(initialCategory || "Commerce & Retail");
  const [initials, setInitials] = useState(extractInitials(initialBusinessName || "Bethelin Enterprise"));
  const [selectedLogoType, setSelectedLogoType] = useState<LogoType>("all");
  const [shape, setShape] = useState<LogoShape>("rounded_square");
  const [selectedPaletteId, setSelectedPaletteId] = useState("royal_gold");

  // Output logos
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogoItem[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<GeneratedLogoItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockupTab, setMockupTab] = useState<"card" | "sign" | "app" | "avatar" | "scale_test">("card");

  // Wallet & Credits
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Apply to business dialog state
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [targetBusinessId, setTargetBusinessId] = useState<string>("");
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  // Update initials when business name changes
  const handleNameChange = (val: string) => {
    setBusinessName(val);
    setInitials(extractInitials(val));
  };

  // Load user businesses & wallet balance
  useEffect(() => {
    if (!user) return;

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

    // Load businesses from businesses and suppliers tables
    Promise.all([
      supabase.from("businesses").select("id, name, category, logo_url").eq("user_id", user.id),
      supabase.from("suppliers").select("id, name, logo_url, categories(name)").eq("submitted_by", user.id),
    ]).then(([bizRes, suppRes]) => {
      const combined: any[] = [];
      if (bizRes.data) {
        combined.push(...bizRes.data.map((b) => ({ ...b, table: "businesses" })));
      }
      if (suppRes.data) {
        suppRes.data.forEach((s: any) => {
          if (!combined.some((b) => b.id === s.id)) {
            combined.push({
              id: s.id,
              name: s.name,
              category: s.categories?.name || "Business",
              logo_url: s.logo_url,
              table: "suppliers",
            });
          }
        });
      }
      if (combined.length > 0) {
        setUserBusinesses(combined);
        setTargetBusinessId(combined[0].id);
      }
    });
  }, [user]);

  // Generate Initial Logo Pack on load
  useEffect(() => {
    handleGenerateLogos(false);
  }, []);

  const handleGenerateLogos = async (shouldCharge = true) => {
    const cost = shouldCharge ? DESIGN_CREDIT_COSTS.LOGO_PACK : 0;

    if (shouldCharge && user) {
      const creditCheck = await checkUserDesignCredits(user.id, cost);
      if (!creditCheck.hasEnough) {
        toast.error(
          `Insufficient balance (₦${creditCheck.currentBalance.toLocaleString()}). Logo pack requires ₦${cost}. Please top up your wallet.`,
          {
            action: {
              label: "Top Up Wallet",
              onClick: () => (window.location.href = "/dashboard/wallet"),
            },
          }
        );
        return;
      }
    }

    setIsGenerating(true);
    try {
      const options: AILogoGeneratorOptions = {
        businessName: businessName || "Bethelin Enterprise",
        category,
        tagline,
        initials: initials || extractInitials(businessName),
        logoType: selectedLogoType,
        shape,
        preferredPaletteId: selectedPaletteId,
      };

      const logos = await generateAILogos(options);

      // Rasterize each SVG to PNG data URL
      for (const logo of logos) {
        logo.dataUrl = await convertSvgToPngDataUrl(logo.svgMarkup, 1024);
      }

      setGeneratedLogos(logos);
      setSelectedLogo(logos[0]);

      if (shouldCharge && user) {
        const deductRes = await deductDesignCredits({
          userId: user.id,
          cost,
          actionName: `AI Logo Pack (8 Concepts): ${businessName}`,
        });

        if (deductRes.success && deductRes.newBalance !== undefined) {
          setWalletBalance(deductRes.newBalance);
        }

        toast.success(`✨ 8 Bespoke Logo Concepts Created for "${businessName}"!`, {
          description: `₦${cost} credits debited. Wallet balance: ₦${deductRes.newBalance?.toLocaleString() || walletBalance}`,
        });
      }
    } catch (err: any) {
      console.error("Logo generation error:", err);
      toast.error("Failed to generate logo concepts.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Logo
  const handleDownloadLogo = (format: "png" | "svg") => {
    if (!selectedLogo) return;
    const filename = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_logo`;

    if (format === "png" && selectedLogo.dataUrl) {
      const link = document.createElement("a");
      link.href = selectedLogo.dataUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("High-Resolution (1024x1024) PNG logo downloaded!");
    } else {
      const blob = new Blob([selectedLogo.svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Vector SVG logo downloaded!");
    }
  };

  // Save Logo to My Designs
  const handleSaveLogoToDesigns = () => {
    if (!user || !selectedLogo) {
      toast.error("Please login to save your designs.");
      return;
    }

    const saved = saveDesign(
      {
        userId: user.id,
        title: `${businessName} - Logo (${selectedLogo.logoType || selectedLogo.archetype})`,
        type: "logo",
        templateKey: `logo_${selectedLogo.logoType || selectedLogo.archetype}`,
        dimensions: { width: 1024, height: 1024, label: "Vector Logo Mark", aspect: "1:1" },
        previewDataUrl: selectedLogo.dataUrl || "",
        svgMarkup: selectedLogo.svgMarkup,
        businessName,
        options: {
          logoType: selectedLogo.logoType,
          archetype: selectedLogo.archetype,
          shape: selectedLogo.shape,
          palette: selectedLogo.palette,
          symbol: selectedLogo.symbol,
        },
        paletteId: selectedLogo.palette.id,
      },
      user.id
    );

    toast.success("Logo saved to My Designs gallery!");
    if (onDesignSaved) onDesignSaved(saved);
  };

  // Confirm Apply to Business Profile
  const handleApplyLogoToBusiness = async () => {
    if (!selectedLogo || !targetBusinessId) return;

    setIsUpdatingLogo(true);
    try {
      const targetBiz = userBusinesses.find((b) => b.id === targetBusinessId);
      const logoPng = selectedLogo.dataUrl || (await convertSvgToPngDataUrl(selectedLogo.svgMarkup, 512));

      if (targetBiz?.table === "suppliers") {
        const { error } = await supabase
          .from("suppliers")
          .update({
            logo_url: logoPng,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetBusinessId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("businesses")
          .update({
            logo_url: logoPng,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetBusinessId);
        if (error) throw error;
      }

      toast.success(`🎉 Logo applied to "${targetBiz?.name || 'your business'}"!`, {
        description: "Your public business listing and directory card are now updated.",
      });

      setUserBusinesses(
        userBusinesses.map((b) => (b.id === targetBusinessId ? { ...b, logo_url: logoPng } : b))
      );

      setApplyDialogOpen(false);

      if (onLogoSelectedForGraphic) {
        onLogoSelectedForGraphic(logoPng);
      }
    } catch (err: any) {
      console.error("Error applying logo to business:", err);
      toast.error("Failed to update business logo: " + err.message);
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const targetBiz = userBusinesses.find((b) => b.id === targetBusinessId);
  const willReplaceExisting = Boolean(targetBiz?.logo_url);

  return (
    <div className="space-y-6">
      {/* 1. Header with Apollo Brand Agent & Logo Types */}
      <Card className="border shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">
                  ✨ Apollo Brand AI
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">
                  Senior Brand Identity & Logo Specialist
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-1">
                AI Logo Creator & Brand Identity Suite
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Generate Wordmarks, Lettermarks, Icon Combinations & 3D Dimensional Marks with full vector scalability.
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

          {/* Quick Preset Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="E.g. Luxe Royale"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Tagline / Slogan</Label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="E.g. PRESTIGE ENTERPRISE"
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Initials / Monogram</Label>
              <Input
                value={initials}
                maxLength={3}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="E.g. LR"
                className="h-10 text-sm font-black uppercase tracking-wider"
              />
            </div>
          </div>

          {/* Logo Type Selector — Required 4 Key Archetypes */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Logo Type & Archetype
              </Label>
              <span className="text-[11px] text-muted-foreground">Select style or generate all</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: "all", label: "All Logo Types", desc: "Mixed 8 Variations", icon: Sparkles },
                { key: "wordmark", label: "Wordmark", desc: "Text-based typography", icon: Type },
                { key: "lettermark", label: "Lettermark", desc: "Initials / Monogram", icon: Type },
                { key: "combination", label: "Icon + Text", desc: "Emblem & Brand Name", icon: ImageIcon },
                { key: "dimensional_3d", label: "3D Dimensional", desc: "Depth & Metallic Luster", icon: Box },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = selectedLogoType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedLogoType(t.key as LogoType)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className="h-4 w-4 shrink-0" />
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold leading-tight">{t.label}</div>
                      <div className={`text-[9px] mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emblem Shape & Palette Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Emblem Frame Shape</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "rounded_square", label: "Squircle" },
                  { key: "circle", label: "Circle" },
                  { key: "shield", label: "Shield" },
                  { key: "hexagon", label: "Hexagon" },
                  { key: "diamond", label: "Diamond" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setShape(s.key as LogoShape)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      shape === s.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Color & Metallic Palette</Label>
              <div className="flex flex-wrap gap-1.5">
                {LOGO_PALETTES.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPaletteId(p.id)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                      selectedPaletteId === p.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 border"
                      style={{ backgroundColor: p.gradientFrom }}
                    />
                    {p.name.replace("3D ", "")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <Button
              onClick={() => handleGenerateLogos(true)}
              disabled={isGenerating || !businessName.trim()}
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold h-11 gap-2 shadow-md"
            >
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate 8 Bespoke Logo Concepts (50 Credits / ₦50)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Main Studio Workspace: 8 Logo Concepts Grid + Active Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 8 Logo Concepts Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-black text-foreground">
                Generated Concept Variations ({generatedLogos.length})
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Select any concept to preview & refine
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {generatedLogos.map((logo, idx) => {
              const isSelected = selectedLogo?.id === logo.id;
              const typeLabel = (logo.logoType || logo.archetype).replace(/_/g, " ");
              return (
                <button
                  key={logo.id}
                  onClick={() => setSelectedLogo(logo)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all text-center relative group ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500 shadow-md"
                      : "border-border bg-card/60 hover:bg-muted/60"
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-xl flex items-center justify-center p-2"
                    dangerouslySetInnerHTML={{ __html: logo.svgMarkup }}
                  />
                  <div className="w-full">
                    <span className="text-[11px] font-bold text-foreground truncate block">
                      Concept #{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize truncate max-w-full">
                      {typeLabel}
                    </Badge>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Logo Inspector & 3D Real-World Mockups (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <Card className="border shadow-md overflow-hidden bg-card">
            <div className="p-3.5 bg-muted/40 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Active Logo Inspector</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] font-bold capitalize">
                  {selectedLogo?.logoType || selectedLogo?.archetype}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {selectedLogo?.palette.name}
                </Badge>
              </div>
            </div>

            {/* Mockup Tabs Selector with Scale Test */}
            <div className="flex border-b bg-muted/20 overflow-x-auto">
              {[
                { key: "card", label: "Business Card", icon: CreditCard },
                { key: "sign", label: "Store Sign", icon: Store },
                { key: "app", label: "App Icon", icon: Smartphone },
                { key: "avatar", label: "Avatar", icon: Sparkles },
                { key: "scale_test", label: "Scale Test", icon: Maximize2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = mockupTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setMockupTab(tab.key as any)}
                    className={`flex-1 py-2 px-2 text-center text-[11px] font-bold flex items-center justify-center gap-1 border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? "border-primary text-primary bg-background"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mockup Stage Frame */}
            <div className="p-6 flex items-center justify-center min-h-[300px] bg-neutral-950/80 relative overflow-hidden">
              {selectedLogo ? (
                <>
                  {mockupTab === "card" && (
                    <div className="w-full max-w-[280px] aspect-[1.75/1] bg-white rounded-xl shadow-2xl p-4 flex flex-col justify-between border border-neutral-200 animate-in zoom-in-95">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 shrink-0"
                          dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }}
                        />
                        <div>
                          <div className="text-xs font-black text-neutral-900 leading-none">
                            {selectedLogo.businessName}
                          </div>
                          <div className="text-[9px] font-bold text-neutral-500 mt-0.5 tracking-wider uppercase">
                            {selectedLogo.tagline || "OFFICIAL ENTERPRISE"}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-0.5 pt-2 border-t border-neutral-100 text-[8px] text-neutral-400">
                        <div>📞 +234 800 000 0000</div>
                        <div>🌐 www.{businessName.toLowerCase().replace(/\s+/g, "")}.com</div>
                      </div>
                    </div>
                  )}

                  {mockupTab === "sign" && (
                    <div className="w-full max-w-[280px] aspect-video bg-neutral-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center border-4 border-neutral-800 animate-in zoom-in-95 text-center">
                      <div
                        className="h-20 w-20 shadow-2xl"
                        dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }}
                      />
                      <div className="text-sm font-black text-white mt-2 tracking-widest uppercase">
                        {selectedLogo.businessName}
                      </div>
                    </div>
                  )}

                  {mockupTab === "app" && (
                    <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                      <div className="h-24 w-24 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/20 p-2 bg-neutral-900 flex items-center justify-center">
                        <div
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-white tracking-wide">
                        {selectedLogo.businessName.slice(0, 12)}
                      </span>
                    </div>
                  )}

                  {mockupTab === "avatar" && (
                    <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                      <div className="h-24 w-24 rounded-full shadow-2xl overflow-hidden border-4 border-amber-500 p-2 bg-neutral-900 flex items-center justify-center">
                        <div
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-white">
                        @{businessName.toLowerCase().replace(/\s+/g, "_")}
                      </span>
                    </div>
                  )}

                  {mockupTab === "scale_test" && (
                    <div className="w-full space-y-3 animate-in zoom-in-95">
                      <div className="text-[11px] font-bold text-amber-400 text-center uppercase tracking-wider">
                        Scalability & Legibility Verification
                      </div>
                      <div className="grid grid-cols-4 gap-2 items-end justify-items-center bg-neutral-900/90 p-3 rounded-xl border border-white/10">
                        {/* 16px Favicon */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center p-0.5 border border-white/10 shadow-xs">
                            <div className="w-4 h-4" dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }} />
                          </div>
                          <span className="text-[9px] text-neutral-400 font-bold">16px Favicon</span>
                        </div>
                        {/* 32px App icon */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center p-1 border border-white/10 shadow-xs">
                            <div className="w-8 h-8" dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }} />
                          </div>
                          <span className="text-[9px] text-neutral-400 font-bold">32px Icon</span>
                        </div>
                        {/* 64px Social Avatar */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 h-16 rounded-xl bg-neutral-800 flex items-center justify-center p-1.5 border border-white/10 shadow-xs">
                            <div className="w-12 h-12" dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }} />
                          </div>
                          <span className="text-[9px] text-neutral-400 font-bold">64px Avatar</span>
                        </div>
                        {/* 128px Print / Banner */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-20 h-20 rounded-2xl bg-neutral-800 flex items-center justify-center p-2 border border-white/10 shadow-xs">
                            <div className="w-16 h-16" dangerouslySetInnerHTML={{ __html: selectedLogo.svgMarkup }} />
                          </div>
                          <span className="text-[9px] text-neutral-400 font-bold">128px Print</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground text-xs">
                  Generating concepts...
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="p-4 bg-card border-t space-y-2.5">
              <Button
                onClick={() => setApplyDialogOpen(true)}
                disabled={!selectedLogo || userBusinesses.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 gap-1.5 shadow-md"
              >
                <Building2 className="h-4 w-4" />
                👑 Set as Active Business Logo
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadLogo("png")}
                  disabled={!selectedLogo}
                  className="flex-1 font-bold h-10 gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  PNG (1024px)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadLogo("svg")}
                  disabled={!selectedLogo}
                  className="flex-1 font-bold h-10 gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Vector SVG
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveLogoToDesigns}
                  disabled={!selectedLogo}
                  className="font-bold h-10 px-3 text-xs gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Apply to Business Confirmation Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              Apply Logo to Business Profile
            </DialogTitle>
            <DialogDescription>
              Select which registered business listing will feature this new logo as its official branding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Target Business</Label>
              <select
                value={targetBusinessId}
                onChange={(e) => setTargetBusinessId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                {userBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name} ({b.category || "General"})
                  </option>
                ))}
              </select>
            </div>

            {willReplaceExisting && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> "{targetBiz?.name}" already has an active logo. Proceeding will replace the existing logo with this new creation.
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApplyDialogOpen(false)}
              disabled={isUpdatingLogo}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyLogoToBusiness}
              disabled={isUpdatingLogo || !targetBusinessId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {isUpdatingLogo ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm & Set Active Logo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
