import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_META, FeatureKey, FeatureMetaItem, useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Search, X, CheckCircle2, XCircle, SlidersHorizontal,
  ShoppingBag, Sparkles, MessageSquare, Megaphone, Wallet,
  FileText, Wrench, Shield, CheckCheck, Ban
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  all: { label: "All Features", icon: SlidersHorizontal, color: "text-foreground" },
  commerce: { label: "Marketplace & Commerce", icon: ShoppingBag, color: "text-blue-500" },
  ai_creative: { label: "AI & Creative Studios", icon: Sparkles, color: "text-purple-500" },
  advertising: { label: "Advertising & Ads", icon: Megaphone, color: "text-amber-500" },
  communication: { label: "WhatsApp & Chat", icon: MessageSquare, color: "text-emerald-500" },
  finance: { label: "Finance & Wallet", icon: Wallet, color: "text-green-500" },
  content: { label: "Content & Editorial", icon: FileText, color: "text-rose-500" },
  tools: { label: "Tools & Utilities", icon: Wrench, color: "text-cyan-500" },
  platform: { label: "Platform & Access", icon: Shield, color: "text-indigo-500" },
};

export default function AdminFeatures() {
  const { flags, loading } = useFeatureFlags();
  const [saving, setSaving] = useState<FeatureKey | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [local, setLocal] = useState(flags);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  useEffect(() => {
    setLocal(flags);
  }, [flags]);

  const toggle = async (key: FeatureKey, next: boolean) => {
    setSaving(key);
    setLocal((p) => ({ ...p, [key]: next }));
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: `feature_${key}`, value: next ? "on" : "off" }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast.error("Could not save: " + error.message);
      setLocal((p) => ({ ...p, [key]: !next }));
    } else {
      toast.success(`${key.replace(/_/g, " ")} ${next ? "enabled" : "disabled"}`);
    }
  };

  const batchToggleCategory = async (enable: boolean) => {
    const targetItems = filteredFeatures;
    if (targetItems.length === 0) return;

    setBatchSaving(true);
    const updates = targetItems.map((m) => ({
      key: `feature_${m.key}`,
      value: enable ? "on" : "off",
    }));

    const newLocal = { ...local };
    targetItems.forEach((m) => {
      newLocal[m.key] = enable;
    });
    setLocal(newLocal);

    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(updates, { onConflict: "key" });

      if (error) {
        toast.error("Failed batch update: " + error.message);
        setLocal(flags);
      } else {
        toast.success(
          `${enable ? "Enabled" : "Disabled"} ${targetItems.length} features in ${
            selectedCategory === "all" ? "view" : CATEGORY_CONFIG[selectedCategory]?.label || "category"
          }`
        );
      }
    } catch (err: any) {
      toast.error("Error during batch update: " + (err?.message || "Unknown error"));
      setLocal(flags);
    } finally {
      setBatchSaving(false);
    }
  };

  const filteredFeatures = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FEATURE_META.filter((m: FeatureMetaItem) => {
      if (selectedCategory !== "all" && m.category !== selectedCategory) {
        return false;
      }
      const isEnabled = !!local[m.key];
      if (statusFilter === "enabled" && !isEnabled) return false;
      if (statusFilter === "disabled" && isEnabled) return false;
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory, statusFilter, local]);

  const enabledCount = Object.values(local).filter(Boolean).length;
  const totalCount = FEATURE_META.length;

  return (
    <div className="space-y-6">
      <Helmet><title>Feature Toggles · Admin Control</title></Helmet>

      {/* Header with Live Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 text-foreground">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Platform Feature Switchboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turn any platform capability, studio, route, or ad placement on or off instantly across the entire website.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/60 p-2 rounded-2xl border border-border/60 shrink-0">
          <Badge variant="default" className="gap-1.5 rounded-xl text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-600 text-white font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enabledCount} Active
          </Badge>
          <Badge variant="outline" className="gap-1.5 rounded-xl text-xs py-1 px-3 text-muted-foreground font-bold border-border/80">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            {totalCount - enabledCount} Disabled
          </Badge>
        </div>
      </div>

      {/* Category Tabs Scrollbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
          const Icon = config.icon;
          const isActive = selectedCategory === catKey;
          const count = catKey === "all"
            ? totalCount
            : FEATURE_META.filter((m) => m.category === catKey).length;

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/40"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary-foreground" : config.color}`} />
              <span>{config.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filter & Batch Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features (e.g., ads_marketplace, whatsapp_engine, products, designer)..."
            className="pl-9 pr-9 h-10 rounded-xl bg-card border-border/80 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filter Group */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 shrink-0">
            <Button
              variant={statusFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="h-8 rounded-lg text-xs font-bold px-2.5"
            >
              All ({filteredFeatures.length})
            </Button>
            <Button
              variant={statusFilter === "enabled" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("enabled")}
              className="h-8 rounded-lg text-xs font-bold px-2.5"
            >
              Enabled
            </Button>
            <Button
              variant={statusFilter === "disabled" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("disabled")}
              className="h-8 rounded-lg text-xs font-bold px-2.5"
            >
              Disabled
            </Button>
          </div>

          {/* Batch Category Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={batchSaving || filteredFeatures.length === 0}
              onClick={() => batchToggleCategory(true)}
              className="h-9 rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5"
            >
              {batchSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={batchSaving || filteredFeatures.length === 0}
              onClick={() => batchToggleCategory(false)}
              className="h-9 rounded-xl text-xs font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
            >
              {batchSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Disable All
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-3xl bg-card space-y-3">
          <SlidersHorizontal className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No features match your current filter</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or select "All Features" to view the complete switchboard.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setStatusFilter("all");
            }}
            className="rounded-xl font-bold text-xs"
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-2">
          {filteredFeatures.map((m) => {
            const isChecked = !!local[m.key];
            const catInfo = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.platform;
            const CategoryIcon = catInfo.icon;

            return (
              <Card
                key={m.key}
                className={`p-4 flex items-start justify-between gap-3 rounded-2xl transition-all duration-200 ${
                  isChecked
                    ? "bg-card border-border/90 hover:border-primary/40 shadow-xs"
                    : "bg-muted/30 border-dashed border-border/70 opacity-75"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{m.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-muted/60 text-muted-foreground border-border/60">
                      {m.key}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold gap-1">
                      <CategoryIcon className={`h-2.5 w-2.5 ${catInfo.color}`} />
                      {catInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-normal">
                    {m.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                  <Switch
                    checked={isChecked}
                    disabled={saving === m.key || batchSaving}
                    onCheckedChange={(v) => toggle(m.key, v)}
                  />
                  <span className={`text-[10px] font-bold ${isChecked ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {isChecked ? "ACTIVE" : "HIDDEN"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
