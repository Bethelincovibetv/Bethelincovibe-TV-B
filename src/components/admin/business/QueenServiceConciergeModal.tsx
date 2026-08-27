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
import {
  Crown, Sparkles, ShieldCheck, Megaphone, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, ArrowRight, Building2,
  Package, Zap, Eye, RefreshCw, Send, Check
} from "lucide-react";
import { toast } from "sonner";
import {
  runQueenServiceAIAutomation,
  QueenServiceOptions,
  QueenServiceExecutionLog,
  QueenServiceResult,
} from "@/lib/queenBusinessServiceAIEngine";
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
  const [customInstructions, setCustomInstructions] = useState<string>("");

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<QueenServiceExecutionLog[]>([]);
  const [result, setResult] = useState<QueenServiceResult | null>(null);

  useEffect(() => {
    if (open) {
      // Reset state on modal open
      setLogs([]);
      setResult(null);
      setProgressPercent(0);
      setIsRunning(false);
    }
  }, [open, business?.id]);

  if (!business) return null;

  const bizName = business.name || "Business";
  const bizCategory = business.categories?.name || business.category_name || "General Business";
  const isEarlyAccess = !!(
    business.social_links?.is_early_access ||
    business.social_links?.early_access ||
    ownerProfile?.social_links?.is_early_access ||
    true // default eligible for queen VIP
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
      customInstructions,
    };

    try {
      const res = await runQueenServiceAIAutomation(business, options, (log) => {
        setLogs((prev) => {
          const filtered = prev.filter((p) => p.step !== log.step);
          return [...filtered, log];
        });

        if (log.step.startsWith("1.")) setProgressPercent(20);
        if (log.step.startsWith("2.")) setProgressPercent(40);
        if (log.step.startsWith("3.")) setProgressPercent(65);
        if (log.step.startsWith("4.")) setProgressPercent(85);
        if (log.step.startsWith("5.")) setProgressPercent(95);
        if (log.step.startsWith("6.")) setProgressPercent(100);
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
                QUEEN VIP CONCIERGE
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
              Empower <strong className="text-white">{bizName}</strong> with automated brand copywriting, Blue-Tick verification, top featured directory ranking, ready-to-sell service catalog, and a live banner advert campaign.
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Target Business Snapshot */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-muted/40 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-base leading-tight flex items-center gap-1.5">
                  {bizName}
                  {business.social_links?.verified && (
                    <ShieldCheck className="w-4 h-4 text-sky-500 fill-sky-500/20" />
                  )}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Category: <span className="font-semibold text-foreground">{bizCategory}</span>
                  {business.address && ` • ${business.address}`}
                </p>
                {ownerProfile?.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Owner: {ownerProfile.display_name || ownerProfile.username || ownerProfile.email} ({ownerProfile.email})
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                Status: {business.status || "active"}
              </Badge>
            </div>
          </div>

          {/* Configuration Form (when not running or completed) */}
          {!result && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Queen Service Automation Pipeline Parameters
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Featured Duration */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-card">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Featured Directory Placement
                  </Label>
                  <Select
                    value={String(featuredDays)}
                    onValueChange={(val) => setFeaturedDays(Number(val))}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Featured Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14">14 Days Spotlight</SelectItem>
                      <SelectItem value="30">30 Days VIP Priority (Recommended)</SelectItem>
                      <SelectItem value="60">60 Days Premier Showcase</SelectItem>
                      <SelectItem value="90">90 Days Maximum Placement</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Pins business at the very top of directory search and homepage slider.
                  </p>
                </div>

                {/* Verification Duration */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-card">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                    Blue-Tick Verification Duration
                  </Label>
                  <Select
                    value={String(verificationDays)}
                    onValueChange={(val) => setVerificationDays(Number(val))}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Verification Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 Days Verified</SelectItem>
                      <SelectItem value="180">180 Days Verified</SelectItem>
                      <SelectItem value="365">365 Days Full Year (Standard)</SelectItem>
                      <SelectItem value="730">2 Years Executive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Grants official Blue Tick badge across directory, public profiles, and chat.
                  </p>
                </div>
              </div>

              {/* Banner Advert Suite */}
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                      Auto-Create Live Banner Advertisement
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      AI crafts a high-converting display ad banner and publishes it to the platform ad server.
                    </p>
                  </div>
                  <Switch
                    checked={createBannerAd}
                    onCheckedChange={setCreateBannerAd}
                    disabled={isRunning}
                  />
                </div>

                {createBannerAd && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Ad Slot Placement</Label>
                      <Select
                        value={adPlacement}
                        onValueChange={(val: any) => setAdPlacement(val)}
                        disabled={isRunning}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="directory_top">Directory Top Banner (High CTR)</SelectItem>
                          <SelectItem value="homepage_hero">Homepage Hero Ad Carousel</SelectItem>
                          <SelectItem value="blog_sidebar">Blog &amp; Article Sidebar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Ad Campaign Duration</Label>
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
                      Services Catalog
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-generate 3-4 commercial services with Naira ₦ pricing.
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
                      Queen AI Agent Running Full Setup...
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
                    Queen Service Full Setup Live!
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>{result.businessName}</strong> is now fully configured with AI-optimized copy, {result.updatedFields.services.length} services, verified Blue Tick status, top featured placement, and a live banner advert!
                </p>
              </div>

              {/* Advert Preview Card */}
              {result.advertHeadline && (
                <div className="p-4 rounded-xl border bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 text-white text-[10px] px-2 font-bold">
                      LIVE DISPLAY BANNER AD
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Slot: {adPlacement}</span>
                  </div>
                  <h5 className="font-black text-sm text-foreground">{result.advertHeadline}</h5>
                  <p className="text-xs text-muted-foreground">
                    {result.generatedContent?.advert?.subheadline || "Exclusive verified merchant offerings on Bethelincovibe TV."}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs font-bold pointer-events-none">
                      {result.generatedContent?.advert?.ctaText || "Connect on WhatsApp"}
                    </Button>
                    <Badge variant="secondary" className="text-[10px]">
                      {result.generatedContent?.advert?.badgeText || "👑 Verified VIP Merchant"}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Generated Services Preview */}
              {result.updatedFields.services && result.updatedFields.services.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Generated Services Catalog ({result.updatedFields.services.length} Packages)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {result.updatedFields.services.map((svc: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border bg-card text-xs space-y-1">
                        <div className="font-bold text-foreground truncate">{svc.title}</div>
                        <div className="text-primary font-semibold text-[11px]">{svc.price}</div>
                        <div className="text-muted-foreground text-[11px] line-clamp-2">{svc.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
