import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Coins, Sparkles, Calculator, FileText, ShieldCheck, Crown,
  MessageCircle, Wand2, RefreshCw, Save, CheckCircle2, ArrowLeft,
  SlidersHorizontal, Check, Zap, AlertCircle, ShoppingBag, Eye
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlatformPricing,
  updateFeaturePrice,
  resetPricingToDefaults,
  FeaturePricing,
  DEFAULT_PLATFORM_PRICING,
} from "@/lib/platformPricing";

export default function AdminPricingManagement() {
  const [pricingMap, setPricingMap] = useState<Record<string, FeaturePricing>>(getPlatformPricing());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    setPricingMap(getPlatformPricing());
  }, []);

  const handlePriceChange = (id: string, newPriceNaira: number) => {
    setPricingMap((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        priceNaira: Math.max(0, newPriceNaira),
      },
    }));
    setHasChanges(true);
  };

  const handleToggleFirstFree = (id: string, checked: boolean) => {
    setPricingMap((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        firstUseFree: checked,
      },
    }));
    setHasChanges(true);
  };

  const handleToggleFreeByDefault = (id: string, checked: boolean) => {
    setPricingMap((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isFreeByDefault: checked,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      Object.entries(pricingMap).forEach(([id, feat]) => {
        updateFeaturePrice(id, feat);
      });
      setHasChanges(false);
      toast.success("✅ All platform feature prices saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save prices");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all platform feature prices back to official system defaults?")) {
      const defs = resetPricingToDefaults();
      setPricingMap(defs);
      setHasChanges(false);
      toast.info("Pricing reset to platform defaults (Calculator = ₦200).");
    }
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case "Calculator":
        return <Calculator className="h-5 w-5 text-amber-500" />;
      case "FileText":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "ShieldCheck":
        return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
      case "Crown":
        return <Crown className="h-5 w-5 text-purple-500" />;
      case "MessageCircle":
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case "Wand2":
        return <Wand2 className="h-5 w-5 text-pink-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  const featuresList = Object.values(pricingMap);
  const filteredFeatures = featuresList.filter((f) => {
    if (selectedCategory === "all") return true;
    return f.category === selectedCategory;
  });

  return (
    <>
      <Helmet>
        <title>Admin Feature Pricing Management · Bethelincovibe TV</title>
      </Helmet>

      <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link to="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                  <Coins className="h-6 w-6 text-amber-500" />
                  Platform Feature Pricing Manager
                </h1>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-bold">
                  Admin Control
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Set and manage exact Naira (₦) fees for business tools, AI generation, and directory boosts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs gap-1.5 shadow-md flex-1 sm:flex-initial"
            >
              <Save className="h-3.5 w-3.5" />
              {hasChanges ? "Save All Changes *" : "Save All Changes"}
            </Button>
          </div>
        </div>

        {/* Quick Highlights Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 rounded-2xl shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                ₦
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Business Calculator</p>
                <p className="text-lg font-black text-foreground">
                  ₦{pricingMap.startup_calculator?.priceNaira?.toLocaleString() || 200}{" "}
                  <span className="text-xs text-muted-foreground font-normal">/ run</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 rounded-2xl shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Queen Boost 30-Day</p>
                <p className="text-lg font-black text-foreground">
                  ₦{pricingMap.queen_business_boost?.priceNaira?.toLocaleString() || 1500}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 rounded-2xl shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Verified Merchant</p>
                <p className="text-lg font-black text-foreground">
                  ₦{pricingMap.verified_badge?.priceNaira?.toLocaleString() || 2500}{" "}
                  <span className="text-xs text-muted-foreground font-normal">/ yr</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Features" },
            { id: "analytics", label: "Financial & Calculator" },
            { id: "marketing", label: "Marketing & Ads" },
            { id: "branding", label: "Verification & Trust" },
            { id: "ai_tools", label: "AI Engines & Creative" },
          ].map((c) => (
            <Button
              key={c.id}
              variant={selectedCategory === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(c.id)}
              className="rounded-xl text-xs h-8 whitespace-nowrap"
            >
              {c.label}
            </Button>
          ))}
        </div>

        {/* Feature Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeatures.map((feat) => (
            <Card
              key={feat.id}
              className={`rounded-3xl border transition-all duration-200 ${
                feat.id === "startup_calculator"
                  ? "border-amber-500/40 shadow-md ring-1 ring-amber-500/20 bg-card"
                  : "bg-card hover:border-primary/30"
              }`}
            >
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center shadow-xs shrink-0">
                      {getFeatureIcon(feat.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CardTitle className="text-base font-bold leading-tight">
                          {feat.name}
                        </CardTitle>
                        {feat.badge && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                            {feat.badge}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {feat.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                {/* Price Input Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-muted/40 p-3 rounded-2xl border">
                  <div className="sm:col-span-6 space-y-1">
                    <Label className="text-xs font-bold text-foreground">
                      Fee in Nigerian Naira (₦)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-muted-foreground">₦</span>
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={feat.priceNaira}
                        onChange={(e) => handlePriceChange(feat.id, parseFloat(e.target.value) || 0)}
                        className="pl-8 h-9 text-sm font-bold rounded-xl bg-background"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6 flex flex-col justify-end space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">Pricing Unit</span>
                    <Badge variant="outline" className="text-xs font-medium py-1 px-2 text-muted-foreground justify-center bg-background">
                      {feat.unit}
                    </Badge>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold cursor-pointer">
                        First-Time Use Free
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Give new users their first generation/run at ₦0.
                      </p>
                    </div>
                    <Switch
                      checked={!!feat.firstUseFree}
                      onCheckedChange={(checked) => handleToggleFirstFree(feat.id, checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold cursor-pointer">
                        Free for All Users (Promotional Mode)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Temporarily waive all charges for this tool platform-wide.
                      </p>
                    </div>
                    <Switch
                      checked={!!feat.isFreeByDefault}
                      onCheckedChange={(checked) => handleToggleFreeByDefault(feat.id, checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
