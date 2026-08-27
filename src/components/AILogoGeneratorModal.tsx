import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Palette,
  Shapes,
  Wand2,
  Image as ImageIcon,
  Building2,
  Crown,
  Zap,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateAILogos,
  GeneratedLogoItem,
  LOGO_PALETTES,
  LOGO_SYMBOLS,
  LogoArchetype,
  LogoShape,
  LogoColorPalette,
  buildLogoSvgMarkup,
  convertSvgToPngDataUrl,
  extractInitials,
} from "@/lib/aiLogoEngine";
import { supabase } from "@/integrations/supabase/client";

interface AILogoGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string;
  category?: string;
  currentLogoUrl?: string | null;
  onSelectLogo: (logoDataUrl: string) => void;
  title?: string;
}

export default function AILogoGeneratorModal({
  open,
  onOpenChange,
  businessName = "My Business",
  category = "Commerce & Retail",
  currentLogoUrl,
  onSelectLogo,
  title = "AI Professional Logo Generator",
}: AILogoGeneratorModalProps) {
  const [name, setName] = useState(businessName);
  const [tagline, setTagline] = useState("PREMIUM QUALITY");
  const [initials, setInitials] = useState(extractInitials(businessName));
  const [archetype, setArchetype] = useState<LogoArchetype>("all");
  const [selectedShape, setSelectedShape] = useState<LogoShape>("rounded_square");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("crown");
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>("royal_gold");

  const [logos, setLogos] = useState<GeneratedLogoItem[]>([]);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);

  // Sync props
  useEffect(() => {
    if (open) {
      setName(businessName || "My Business");
      setInitials(extractInitials(businessName || "My Business"));
      handleGenerate();
    }
  }, [open, businessName]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generated = await generateAILogos({
        businessName: name,
        category,
        tagline,
        initials,
        archetype,
        shape: selectedShape,
      });
      setLogos(generated);
      if (generated.length > 0) {
        setSelectedLogoId(generated[0].id);
      }
      toast.success("✨ New studio logos generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate logos. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const selectedLogo = logos.find((l) => l.id === selectedLogoId) || logos[0];

  // Customizer: Re-render selected logo when user tweaks shape/palette/symbol
  const currentCustomMarkup = React.useMemo(() => {
    if (!selectedLogo) return "";
    const activePal =
      LOGO_PALETTES.find((p) => p.id === selectedPaletteId) || selectedLogo.palette;

    return buildLogoSvgMarkup({
      businessName: name || "My Business",
      tagline,
      initials: initials || extractInitials(name),
      symbolKey: selectedSymbol,
      palette: activePal,
      shape: selectedShape,
      archetype: selectedLogo.archetype,
    });
  }, [selectedLogo, name, tagline, initials, selectedSymbol, selectedPaletteId, selectedShape]);

  // Apply selected logo
  const handleApplyLogo = async () => {
    if (!currentCustomMarkup) return;
    setApplying(true);
    try {
      // Convert to high-res PNG data url for universal web compatibility
      const pngDataUrl = await convertSvgToPngDataUrl(currentCustomMarkup, 1024);
      onSelectLogo(pngDataUrl);
      toast.success("🎉 Professional AI Logo applied successfully!");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not apply logo image: " + err.message);
    } finally {
      setApplying(false);
    }
  };

  // Download high-res PNG
  const handleDownloadPng = async () => {
    if (!currentCustomMarkup) return;
    try {
      const pngUrl = await convertSvgToPngDataUrl(currentCustomMarkup, 1024);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${name.toLowerCase().replace(/\s+/g, "_")}_logo.png`;
      link.click();
      toast.success("HD PNG Logo downloaded!");
    } catch (err) {
      toast.error("Download failed.");
    }
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!currentCustomMarkup) return;
    const blob = new Blob([currentCustomMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, "_")}_logo.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Vector SVG Logo downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-primary/30 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary-foreground text-[10px] font-black uppercase tracking-wider">
                <Wand2 className="h-3 w-3 text-amber-400" />
                STUDIO BRANDING ENGINE
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Generate high-resolution, vector-crafted brand logos & 3D emblems for your business in seconds.
              </DialogDescription>
            </div>

            {/* Quick Actions in header for immediate access */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                variant="outline"
                className="rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border-white/20 text-white gap-1.5"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Regenerate Variations
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-2xl border border-border/80">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground">Business Name</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setInitials(extractInitials(e.target.value));
                }}
                placeholder="e.g. Apex Logistics"
                className="h-8 text-xs font-semibold rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground">Tagline / Slogan</Label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Premium Quality"
                className="h-8 text-xs font-semibold rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground">Initials / Monogram</Label>
              <Input
                value={initials}
                maxLength={4}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                className="h-8 text-xs font-bold uppercase rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground">Style Archetype</Label>
              <Select value={archetype} onValueChange={(v: any) => setArchetype(v)}>
                <SelectTrigger className="h-8 text-xs font-semibold rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Styles</SelectItem>
                  <SelectItem value="luxury">3D Luxury Crest</SelectItem>
                  <SelectItem value="modern_tech">Modern Tech</SelectItem>
                  <SelectItem value="monogram">Minimal Monogram</SelectItem>
                  <SelectItem value="commerce">Marketplace / Retail</SelectItem>
                  <SelectItem value="crest">Royal Emblem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Preview & Customizer Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Studio Live Preview */}
            <div className="lg:col-span-5 flex flex-col items-center space-y-4">
              <div className="relative group w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-slate-950 p-4 border-2 border-primary/40 shadow-2xl flex items-center justify-center overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-radial from-primary/20 via-transparent to-transparent opacity-60 pointer-events-none" />

                {currentCustomMarkup ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    dangerouslySetInnerHTML={{ __html: currentCustomMarkup }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-xs">Crafting studio logo...</p>
                  </div>
                )}
              </div>

              {/* Download Quick Actions */}
              <div className="flex items-center gap-2 w-full max-w-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadPng}
                  className="flex-1 rounded-xl text-xs font-bold gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> PNG (HD)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadSvg}
                  className="flex-1 rounded-xl text-xs font-bold gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Vector SVG
                </Button>
              </div>
            </div>

            {/* Right: Studio Customizer Tools & Variations */}
            <div className="lg:col-span-7 space-y-4">
              {/* Palette & Shape Selector Tabs */}
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black flex items-center gap-1.5 text-foreground">
                    <Palette className="h-3.5 w-3.5 text-primary" /> Color Theme
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {LOGO_PALETTES.find((p) => p.id === selectedPaletteId)?.name}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {LOGO_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setSelectedPaletteId(pal.id)}
                      className={`h-7 px-2.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-all ${
                        selectedPaletteId === pal.id
                          ? "border-primary bg-primary/10 text-primary shadow-xs scale-105"
                          : "border-border/60 hover:border-primary/40 bg-background"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${pal.gradientFrom}, ${pal.gradientTo})`,
                        }}
                      />
                      {pal.name}
                    </button>
                  ))}
                </div>

                {/* Shape Selector */}
                <div className="pt-2 border-t border-border/50">
                  <Label className="text-xs font-black flex items-center gap-1.5 text-foreground mb-2">
                    <Shapes className="h-3.5 w-3.5 text-primary" /> Geometric Frame
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {(["rounded_square", "circle", "shield", "hexagon", "octagon", "diamond"] as LogoShape[]).map(
                      (sh) => (
                        <button
                          key={sh}
                          type="button"
                          onClick={() => setSelectedShape(sh)}
                          className={`py-1 px-2 rounded-xl text-[10px] font-bold capitalize border transition-all text-center ${
                            selectedShape === sh
                              ? "border-primary bg-primary text-primary-foreground shadow-xs font-black"
                              : "border-border/60 hover:border-primary/40 bg-background text-muted-foreground"
                          }`}
                        >
                          {sh.replace("_", " ")}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Symbol Selector */}
                <div className="pt-2 border-t border-border/50">
                  <Label className="text-xs font-black flex items-center gap-1.5 text-foreground mb-2">
                    <Crown className="h-3.5 w-3.5 text-primary" /> Emblem Icon Symbol
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(LOGO_SYMBOLS).map(([k, s]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedSymbol(k)}
                        className={`h-7 px-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          selectedSymbol === k
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-border/60 hover:border-primary/40 bg-background text-muted-foreground"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generated Variations Gallery */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Pick from Studio Variations ({logos.length})
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {logos.map((logo) => {
                    const isSelected = selectedLogoId === logo.id;
                    return (
                      <div
                        key={logo.id}
                        onClick={() => {
                          setSelectedLogoId(logo.id);
                          setSelectedPaletteId(logo.palette.id);
                          setSelectedShape(logo.shape);
                          setSelectedSymbol(logo.symbol);
                        }}
                        className={`relative p-2 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center aspect-square bg-slate-950 ${
                          isSelected
                            ? "border-primary shadow-md shadow-primary/20 scale-105"
                            : "border-border/60 hover:border-primary/50 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: logo.svgMarkup }}
                        />
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Bottom Action Footer */}
        <div className="p-4 bg-muted/70 backdrop-blur-md border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>High-resolution 1024x1024 crisp vector logo ready to publish.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={applying || !currentCustomMarkup}
              onClick={handleApplyLogo}
              className="flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-extrabold text-xs h-10 px-6 shadow-lg shadow-primary/20 gap-1.5"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Logo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" /> Use This Logo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
