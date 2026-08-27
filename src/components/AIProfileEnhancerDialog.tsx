import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles,
  Wand2,
  Check,
  ArrowRight,
  Loader2,
  RefreshCw,
  Copy,
  Briefcase,
  Quote,
  ShieldCheck,
} from "lucide-react";
import {
  enhanceBusinessProfileWithAI,
  BusinessProfileEnhanceResult,
} from "@/lib/businessProfileAIEngine";
import { copyToClipboard } from "@/lib/clipboard";

export default function AIProfileEnhancerDialog({
  open,
  onOpenChange,
  currentProfile,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: any;
  onApply: (fields: Partial<any>) => void;
}) {
  const [businessName, setBusinessName] = useState(
    currentProfile?.display_name || currentProfile?.username || ""
  );
  const [category, setCategory] = useState(
    currentProfile?.category || "Commerce & Services"
  );
  const [location, setLocation] = useState("Nigeria");
  const [targetAudience, setTargetAudience] = useState("Wholesale & Retail Buyers");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BusinessProfileEnhanceResult | null>(null);

  const handleGenerate = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name.");
      return;
    }

    setGenerating(true);
    try {
      const res = await enhanceBusinessProfileWithAI({
        businessName,
        category,
        currentBio: currentProfile?.bio || "",
        currentServices: currentProfile?.services || [],
        location,
        targetAudience,
      });

      setResult(res);
      toast.success("AI Profile Enhancement generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate enhancement.");
    } finally {
      setGenerating(false);
    }
  };

  const applyField = (fieldName: string, value: any) => {
    onApply({ [fieldName]: value });
    toast.success(`Applied ${fieldName} to your profile!`);
  };

  const applyAll = () => {
    if (!result) return;
    onApply({
      bio: result.bio,
      services: result.suggestedServices.map((s) => ({
        title: s.title,
        description: s.description,
        link_url: "",
      })),
      social_links: {
        ...(currentProfile.social_links || {}),
        tagline: result.tagline,
        sales_offer: result.salesOfferHook,
      },
    });
    toast.success("Applied all AI improvements to your profile!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-primary/30">
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-primary via-indigo-900 to-purple-950 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Sparkles className="h-64 w-64" />
          </div>

          <div className="relative z-10 space-y-1.5">
            <Badge className="bg-white/20 text-white border border-white/30 text-xs font-black px-3 py-1 rounded-full gap-1.5 backdrop-blur-md">
              <Wand2 className="h-3.5 w-3.5" />
              GEMINI AI COPYWRITING
            </Badge>

            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              AI Business Profile Enhancer
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm text-white/80 max-w-lg leading-relaxed">
              Transform your business profile into a high-converting customer magnet with compelling taglines, authentic about stories, and professional service pitches.
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Quick Input Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/80">
            <div>
              <Label className="text-xs font-bold mb-1 block">Business Name *</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Global Logistics"
                className="rounded-xl text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1 block">Industry / Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Fashion, Electronics, Solar Energy"
                className="rounded-xl text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1 block">Primary Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lagos, Abuja, Port Harcourt"
                className="rounded-xl text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1 block">Target Customers</Label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Retail shoppers, Wholesale buyers"
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || !businessName.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-extrabold text-xs h-10 shadow-md gap-1.5"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating AI Suggestions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> {result ? "Regenerate New Variations" : "Generate Enhanced Copy"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Generated Results Preview */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> AI Suggestions
                </h3>
                <Button
                  size="sm"
                  onClick={applyAll}
                  className="rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" /> Apply All Suggestions
                </Button>
              </div>

              {/* Tagline Card */}
              <Card className="border-border/80 rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Quote className="h-3.5 w-3.5 text-primary" /> Brand Tagline
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-bold rounded-lg"
                      onClick={() => applyField("tagline", result.tagline)}
                    >
                      Use Tagline
                    </Button>
                  </div>
                  <p className="text-sm font-black text-primary">“{result.tagline}”</p>
                </CardContent>
              </Card>

              {/* Bio Statement Card */}
              <Card className="border-border/80 rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Quote className="h-3.5 w-3.5 text-primary" /> Short Bio Statement
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-bold rounded-lg"
                      onClick={() => applyField("bio", result.bio)}
                    >
                      Apply to Bio
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {result.bio}
                  </p>
                </CardContent>
              </Card>

              {/* Suggested Services */}
              <Card className="border-border/80 rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-primary" /> Structured Services ({result.suggestedServices.length})
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-bold rounded-lg"
                      onClick={() =>
                        applyField(
                          "services",
                          result.suggestedServices.map((s) => ({
                            title: s.title,
                            description: s.description,
                            link_url: "",
                          }))
                        )
                      }
                    >
                      Apply Services
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {result.suggestedServices.map((svc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span>{svc.title}</span>
                          {svc.suggestedPrice && (
                            <Badge variant="secondary" className="text-[10px]">
                              {svc.suggestedPrice}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {svc.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Sales Hook Card */}
              <Card className="border-amber-500/30 bg-amber-500/5 rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> WhatsApp Sales Offer Hook
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-bold rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-300"
                      onClick={() => {
                        copyToClipboard(result.salesOfferHook);
                        toast.success("Offer copy copied to clipboard!");
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy Hook
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                    {result.salesOfferHook}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-muted/40 border-t border-border/80 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
