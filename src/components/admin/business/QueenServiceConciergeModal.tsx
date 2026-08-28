import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown, Sparkles, ShieldCheck, Megaphone, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, ArrowRight, Building2,
  Package, Zap, Eye, RefreshCw, Send, Check, Download, Palette,
  MessageCircle, Copy, CheckCheck, ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import {
  runQueenServiceAIAutomation,
  QueenServiceOptions,
  QueenServiceExecutionLog,
  QueenServiceResult,
} from "@/lib/queenBusinessServiceAIEngine";
import { downloadGraphicDataUrl } from "@/lib/queenGraphicDesigner";
import { Link } from "react-router-dom";

interface QueenServiceConciergeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: any;
  ownerProfile?: any;
  onSuccess?: (result: QueenServiceResult) => void;
}

export default function QueenServiceConciergeModal({
  open,
  onOpenChange,
  business,
  ownerProfile,
  onSuccess,
}: QueenServiceConciergeModalProps) {
  // Configuration Options
  const [featuredDays, setFeaturedDays] = useState<number>(30);
  const [verificationDays, setVerificationDays] = useState<number>(365);
  const [createBannerAd, setCreateBannerAd] = useState<boolean>(true);
  const [adPlacement, setAdPlacement] = useState<"homepage_hero" | "directory_top" | "blog_sidebar">("directory_top");
  const [adDays, setAdDays] = useState<number>(30);
  const [generateServices, setGenerateServices] = useState<boolean>(true);
  const [sendNotification, setSendNotification] = useState<boolean>(true);
  const [themeStyle, setThemeStyle] = useState<"royal_gold" | "cyber_tech" | "emerald_luxury" | "sunset_vibrant" | "ocean_corporate">("royal_gold");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [logoMode, setLogoMode] = useState<"keep_current" | "upload_custom" | "generate_studio">("keep_current");
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(business?.logo_url || "");
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<QueenServiceExecutionLog[]>([]);
  const [result, setResult] = useState<QueenServiceResult | null>(null);

  useEffect(() => {
    if (open) {
      setLogs([]);
      setResult(null);
      setProgressPercent(0);
      setIsRunning(false);
      setCopiedLink(false);
      setCustomLogoUrl(business?.logo_url || "");
      setLogoMode(business?.logo_url ? "keep_current" : "upload_custom");
    }
  }, [open, business?.id]);

  if (!business) return null;

  const bizName = business.name || "Business";
  const bizCategory = business.categories?.name || business.category_name || "General Business";
  const isEarlyAccess = !!(
    business.social_links?.is_early_access ||
    business.social_links?.early_access ||
    ownerProfile?.social_links?.is_early_access ||
    true
  );

  const handleExecute = async () => {
    setIsRunning(true);
    setProgressPercent(10);
    setLogs([]);
    setResult(null);

    const options: QueenServiceOptions = {
      featuredDurationDays: featuredDays,
      verificationDays: verificationDays,
      createBannerAdvert: createBannerAd,
      advertPlacement: adPlacement,
      advertDurationDays: adDays,
      generateServicesCatalog: generateServices,
      sendOwnerNotification: sendNotification,
      themeStyle: themeStyle,
      customInstructions,
      customLogoUrl: logoMode === "upload_custom" ? customLogoUrl : logoMode === "keep_current" ? (business.logo_url || customLogoUrl) : undefined,
      preserveExistingLogo: logoMode === "keep_current",
    };

    try {
      const res = await runQueenServiceAIAutomation(business, options, (log) => {
        setLogs((prev) => {
          const filtered = prev.filter((p) => p.step !== log.step);
          return [...filtered, log];
        });

        if (log.step.startsWith("1.")) setProgressPercent(15);
        if (log.step.startsWith("1b.")) setProgressPercent(25);
        if (log.step.startsWith("1c.")) setProgressPercent(35);
        if (log.step.startsWith("2.")) setProgressPercent(50);
        if (log.step.startsWith("2b.")) setProgressPercent(65);
        if (log.step.startsWith("3.")) setProgressPercent(80);
        if (log.step.startsWith("4.")) setProgressPercent(90);
        if (log.step.startsWith("5.")) setProgressPercent(95);
        if (log.step.startsWith("6.")) setProgressPercent(98);
      });

      setResult(res);
      setProgressPercent(100);
      toast.success(`👑 Queen Service full setup completed for ${bizName}!`);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete Queen Service automation");
      setLogs((prev) => [
        ...prev,
        {
          step: "Error Handler",
          status: "failed",
          detail: err.message || "Automation halted with error",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyWhatsApp = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("WhatsApp Click-to-Chat URL copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-amber-500/30">
        {/* Header with Royal Gold Gradient */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
            <Crown className="w-48 h-48 text-white" />
          </div>

          <div className="relative z-10 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-black/30 hover:bg-black/40 text-amber-100 border-amber-300/40 text-xs px-2.5 py-0.5 font-bold tracking-wide flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                QUEEN VIP CONCIERGE &amp; MAYA DESIGNER
              </Badge>
              {isEarlyAccess && (
                <Badge className="bg-emerald-950/40 text-emerald-200 border-emerald-400/40 text-xs px-2 py-0.5 font-semibold">
                  ✨ Early Access User
                </Badge>
              )}
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              1-Click Queen AI Full Setup &amp; Takeover
            </DialogTitle>
            <DialogDescription className="text-amber-100/90 text-xs sm:text-sm font-medium">
              Empower <strong className="text-white">{bizName}</strong> ({bizCategory}) with AI Category Classification, Blue-Tick verification, top featured directory ranking, service/product segregation, and Maya Sterling brand creative suite.
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Configuration form (only visible when not finished) */}
          {!result && (
            <div className="space-y-4">
              {/* Category & Verification Boost settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 p-3 rounded-xl border bg-card">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Top Featured Duration
                  </Label>
                  <Select
                    value={String(featuredDays)}
                    onValueChange={(val) => setFeaturedDays(Number(val))}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days Priority Placement</SelectItem>
                      <SelectItem value="14">14 Days Priority Placement</SelectItem>
                      <SelectItem value="30">30 Days (Standard VIP)</SelectItem>
                      <SelectItem value="60">60 Days (Gold VIP)</SelectItem>
                      <SelectItem value="90">90 Days (Platinum VIP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border bg-card">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                    Blue-Tick Verification Validity
                  </Label>
                  <Select
                    value={String(verificationDays)}
                    onValueChange={(val) => setVerificationDays(Number(val))}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 Days Verified</SelectItem>
                      <SelectItem value="180">6 Months Verified</SelectItem>
                      <SelectItem value="365">1 Full Year Verified</SelectItem>
                      <SelectItem value="730">2 Years Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Theme & Graphic Designer Style */}
              <div className="p-3.5 rounded-xl border bg-card space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Palette className="w-3.5 h-3.5 text-pink-500" />
                  Maya Sterling Creative Theme Palette
                </Label>
                <Select
                  value={themeStyle}
                  onValueChange={(val: any) => setThemeStyle(val)}
                  disabled={isRunning}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="royal_gold">👑 Royal Gold (Dark Luxury &amp; Gold Accents)</SelectItem>
                    <SelectItem value="emerald_luxury">🌿 Emerald Luxury (Deep Green &amp; Premium Foil)</SelectItem>
                    <SelectItem value="cyber_tech">⚡ Cyber Tech (High-Tech Blue &amp; Dark Slate)</SelectItem>
                    <SelectItem value="sunset_vibrant">🔥 Sunset Vibrant (Warm Orange &amp; Commercial Energy)</SelectItem>
                    <SelectItem value="ocean_corporate">🌊 Ocean Corporate (Deep Navy &amp; Crisp White)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Brand Logo Configuration (Non-Generated / Custom Upload / Studio) */}
              <div className="p-3.5 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Business Brand Logo Selection
                  </Label>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {logoMode === "keep_current" ? "Preserve Existing" : logoMode === "upload_custom" ? "Custom Non-Generated" : "Studio Auto"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={logoMode === "keep_current" ? "default" : "outline"}
                    onClick={() => setLogoMode("keep_current")}
                    disabled={isRunning}
                    className="text-xs h-8 rounded-xl font-bold"
                  >
                    Keep Existing Logo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={logoMode === "upload_custom" ? "default" : "outline"}
                    onClick={() => setLogoMode("upload_custom")}
                    disabled={isRunning}
                    className="text-xs h-8 rounded-xl font-bold"
                  >
                    Upload Custom Logo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={logoMode === "generate_studio" ? "default" : "outline"}
                    onClick={() => setLogoMode("generate_studio")}
                    disabled={isRunning}
                    className="text-xs h-8 rounded-xl font-bold"
                  >
                    Studio Monogram
                  </Button>
                </div>

                {logoMode === "upload_custom" && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Select / Upload Custom Brand Logo File (.png, .jpg, .svg, .webp)
                    </Label>
                    <div className="flex items-center gap-3">
                      {customLogoUrl ? (
                        <div className="h-12 w-12 rounded-xl border overflow-hidden bg-muted relative shrink-0">
                          <img src={customLogoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={isRunning || uploadingLogo}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingLogo(true);
                            try {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const dataUrl = evt.target?.result as string;
                                setCustomLogoUrl(dataUrl);
                                toast.success("Custom non-generated logo selected!");
                                setUploadingLogo(false);
                              };
                              reader.readAsDataURL(file);
                            } catch (err: any) {
                              toast.error("Failed to load file: " + err.message);
                              setUploadingLogo(false);
                            }
                          }}
                          className="h-8 text-xs rounded-xl"
                        />
                        <Input
                          type="url"
                          placeholder="Or paste external image URL..."
                          value={customLogoUrl}
                          onChange={(e) => setCustomLogoUrl(e.target.value)}
                          className="h-7 text-[11px] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Banner Advert Config */}
              <div className="p-3.5 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                      Auto-Publish Live Banner Advert
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Launch an active display banner campaign with designed creative in ad network.
                    </p>
                  </div>
                  <Switch
                    checked={createBannerAd}
                    onCheckedChange={setCreateBannerAd}
                    disabled={isRunning}
                  />
                </div>

                {createBannerAd && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Placement Slot</Label>
                      <Select
                        value={adPlacement}
                        onValueChange={(val: any) => setAdPlacement(val)}
                        disabled={isRunning}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="directory_top">Directory Top Leaderboard</SelectItem>
                          <SelectItem value="homepage_hero">Homepage Hero Banner</SelectItem>
                          <SelectItem value="blog_sidebar">Articles &amp; Blog Sidebar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Ad Runtime</Label>
                      <Select
                        value={String(adDays)}
                        onValueChange={(val) => setAdDays(Number(val))}
                        disabled={isRunning}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="14">14 Days Active</SelectItem>
                          <SelectItem value="30">30 Days Active</SelectItem>
                          <SelectItem value="60">60 Days Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Services & Notification toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="space-y-0.5 pr-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Package className="w-3.5 h-3.5 text-emerald-500" />
                      Services &amp; Product Split
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Segregate pure services from physical products &amp; create flyers.
                    </p>
                  </div>
                  <Switch
                    checked={generateServices}
                    onCheckedChange={setGenerateServices}
                    disabled={isRunning}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="space-y-0.5 pr-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Send className="w-3.5 h-3.5 text-purple-500" />
                      Merchant Notification
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Deliver in-app Queen VIP alert to user dashboard.
                    </p>
                  </div>
                  <Switch
                    checked={sendNotification}
                    onCheckedChange={setSendNotification}
                    disabled={isRunning}
                  />
                </div>
              </div>

              {/* Optional Custom Instructions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Custom AI Guidelines (Optional)
                </Label>
                <Input
                  placeholder="e.g. Highlight wholesale pricing in Ikeja, emphasize 24-hour delivery..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  disabled={isRunning}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {/* Real-time Progress & Execution Logs */}
          {(isRunning || logs.length > 0) && (
            <div className="space-y-3 p-4 rounded-xl border bg-slate-950 text-slate-100 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold flex items-center gap-2 text-amber-400">
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      Queen AI Concierge &amp; Maya Designer Active...
                    </>
                  ) : result ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Queen Setup Finished Successfully!
                    </>
                  ) : (
                    "Execution Logs"
                  )}
                </span>
                <span className="text-slate-400 text-[11px]">{progressPercent}%</span>
              </div>

              <Progress value={progressPercent} className="h-1.5 bg-slate-800" />

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[11px]">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    {log.status === "completed" && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                    {log.status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0 mt-0.5" />}
                    {log.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                    <span>
                      <strong className="text-slate-200">{log.step}:</strong>{" "}
                      <span className="text-slate-300">{log.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Summary & Output Previews */}
          {result && result.success && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                    Queen VIP Concierge Setup Live!
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>{result.businessName}</strong> is now fully configured with category verification, {result.updatedFields.services.length} services, {result.physicalProductsCreatedCount || 0} physical products, verified Blue Tick status, top featured placement, and a live banner advert!
                </p>
              </div>

              {/* Category Classification Audit Result */}
              {result.categoryClassification && (
                <div className="p-3.5 rounded-xl border bg-card text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      AI Category Verification Audit
                    </span>
                    <Badge
                      className={
                        result.categoryClassification.status === "auto_corrected"
                          ? "bg-amber-500 text-white text-[10px]"
                          : "bg-emerald-600 text-white text-[10px]"
                      }
                    >
                      {result.categoryClassification.status === "auto_corrected"
                        ? "Auto-Corrected"
                        : "Verified Accurate"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Sector:</span>
                    <strong className="text-foreground">{result.categoryClassification.recommendedCategoryName}</strong>
                    <span className="text-muted-foreground">• Confidence:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{result.categoryClassification.confidenceScore}%</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    "{result.categoryClassification.reasoning}"
                  </p>
                </div>
              )}

              {/* WhatsApp Direct Link CTA */}
              {result.whatsAppClickToChatUrl && (
                <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      WhatsApp Direct Inquiry Link
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-md">
                      {result.whatsAppClickToChatUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyWhatsApp(result.whatsAppClickToChatUrl)}
                      className="h-8 text-xs font-semibold gap-1"
                    >
                      {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </Button>
                    <a
                      href={result.whatsAppClickToChatUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                    >
                      Test Chat <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Master Graphic Creative Banner Preview */}
              {result.renderedGraphicCreativeUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-500" />
                      Maya Sterling Master Display Banner (1200x630)
                    </h5>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadGraphicDataUrl(result.renderedGraphicCreativeUrl!, `${bizName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_banner.png`)}
                        className="h-7 text-xs font-semibold gap-1"
                      >
                        <Download className="w-3 h-3" /> Download PNG
                      </Button>
                      <a
                        href={result.renderedGraphicCreativeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Full Size
                      </a>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-amber-500/30 shadow-xs bg-black">
                    <img
                      src={result.renderedGraphicCreativeUrl}
                      alt="Queen Graphic Designer Creative"
                      className="w-full h-auto max-h-[260px] object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Physical Products & Service Tabs */}
              <Tabs defaultValue="services" className="w-full space-y-3">
                <TabsList className="grid grid-cols-2 w-full max-w-sm">
                  <TabsTrigger value="services" className="text-xs font-bold">
                    Services ({result.updatedFields.services.length})
                  </TabsTrigger>
                  <TabsTrigger value="products" className="text-xs font-bold">
                    Physical Products ({result.productCreatives?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {result.updatedFields.services.map((svc: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border bg-card text-xs space-y-2">
                        {svc.image_url && (
                          <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                            <img src={svc.image_url} alt={svc.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="font-bold text-foreground truncate">{svc.title}</div>
                        <div className="text-primary font-bold text-xs">{svc.price}</div>
                        <div className="text-muted-foreground text-[11px] line-clamp-2">{svc.description}</div>
                        {svc.turnaround && (
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            ⚡ {svc.turnaround}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="products" className="space-y-2">
                  {result.productCreatives && result.productCreatives.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.productCreatives.map((prod, idx) => (
                        <div key={idx} className="p-3 rounded-xl border bg-card space-y-2 text-xs">
                          <div className="aspect-square rounded-lg overflow-hidden border bg-black">
                            <img src={prod.url} alt={prod.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate">{prod.title}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadGraphicDataUrl(prod.url, `${prod.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`)}
                              className="h-7 text-xs"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground text-xs border rounded-xl bg-card">
                      This business focuses primarily on specialized commercial services. No physical products detected.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
          {result ? (
            <div className="flex items-center justify-between w-full gap-2">
              <Link
                to={`/businesses/${result.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                View Live Public Listing
                <ExternalLink className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isRunning}
              >
                Cancel
              </Button>

              <Button
                onClick={handleExecute}
                disabled={isRunning}
                className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white font-bold text-xs gap-1.5 shadow-md"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Queen AI Setup...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                    Run 1-Click Queen Full Setup
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
