import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_META, FeatureKey, useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, X, CheckCircle2, XCircle, SlidersHorizontal, Sparkles } from "lucide-react";

export default function AdminFeatures() {
  const { flags, loading } = useFeatureFlags();
  const [saving, setSaving] = useState<FeatureKey | null>(null);
  const [local, setLocal] = useState(flags);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  useEffect(() => { setLocal(flags); }, [flags]);

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

  const filteredFeatures = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FEATURE_META.filter((m) => {
      const isEnabled = !!local[m.key];
      if (statusFilter === "enabled" && !isEnabled) return false;
      if (statusFilter === "disabled" && isEnabled) return false;
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, statusFilter, local]);

  const enabledCount = Object.values(local).filter(Boolean).length;
  const totalCount = FEATURE_META.length;

  return (
    <div className="space-y-6">
      <Helmet><title>Feature Toggles · Admin</title></Helmet>
      
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Feature Toggles
          </h1>
          <p className="text-sm text-muted-foreground">
            Switch any platform feature on or off. Changes apply instantly across the site with zero flickering.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/60 p-2 rounded-2xl border border-border/50 shrink-0">
          <Badge variant="default" className="gap-1 rounded-xl text-xs py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enabledCount} Active
          </Badge>
          <Badge variant="outline" className="gap-1 rounded-xl text-xs py-1 px-3 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            {totalCount - enabledCount} Off
          </Badge>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features by name, key or description (e.g. blog, whatsapp, products)..."
            className="pl-9 pr-9 h-10 rounded-xl bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border shrink-0">
          <Button
            variant={statusFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-8 rounded-lg text-xs font-bold"
          >
            All ({totalCount})
          </Button>
          <Button
            variant={statusFilter === "enabled" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("enabled")}
            className="h-8 rounded-lg text-xs font-bold"
          >
            Enabled ({enabledCount})
          </Button>
          <Button
            variant={statusFilter === "disabled" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("disabled")}
            className="h-8 rounded-lg text-xs font-bold"
          >
            Disabled ({totalCount - enabledCount})
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-2xl bg-card space-y-2">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold">No features found</p>
          <p className="text-xs text-muted-foreground">No feature matches your search query "{searchQuery}"</p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredFeatures.map((m) => {
            const isChecked = !!local[m.key];
            return (
              <Card
                key={m.key}
                className={`p-4 flex items-start justify-between gap-3 rounded-2xl transition-all duration-200 ${
                  isChecked
                    ? "bg-card border-border/80 hover:border-primary/40 shadow-xs"
                    : "bg-muted/20 border-dashed border-border/60 opacity-80"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{m.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 text-muted-foreground">
                      {m.key}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.description}</div>
                </div>
                <Switch
                  checked={isChecked}
                  disabled={saving === m.key}
                  onCheckedChange={(v) => toggle(m.key, v)}
                  className="shrink-0"
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
