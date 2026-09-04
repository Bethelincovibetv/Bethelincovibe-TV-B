import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Coins, MapPin, Sliders, Bell, Sparkles, Check, Plus, X } from "lucide-react";
import { saveProviderPreferences } from "@/services/opportunityMatchingRealtimeService";
import { POPULAR_REQUEST_CATEGORIES, ProviderOpportunityPreferences } from "@/types/opportunityMatching";
import { toast } from "sonner";

const POPULAR_LOCATIONS = [
  "Online / Remote",
  "Lagos State",
  "Abuja (FCT)",
  "Port Harcourt / Rivers",
  "Ibadan / Oyo State",
  "Enugu State",
  "Benin City / Edo",
  "Kano State",
  "Nationwide (All Nigeria)",
];

const BUDGET_PRESETS = [
  { label: "₦5k – ₦50k (Entry / Quick)", min: 5000, max: 50000 },
  { label: "₦50k – ₦250k (Standard)", min: 50000, max: 250000 },
  { label: "₦250k – ₦1M (High Value)", min: 250000, max: 1000000 },
  { label: "₦1M+ (Enterprise / Prime)", min: 1000000, max: 10000000 },
];

export default function ProviderPreferencesModal({
  open,
  onOpenChange,
  preferences,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: ProviderOpportunityPreferences;
  onSaved: (prefs: ProviderOpportunityPreferences) => void;
}) {
  const [prefs, setPrefs] = useState<ProviderOpportunityPreferences>(preferences);
  const [customLocation, setCustomLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(preferences);
  }, [preferences]);

  const toggleCategory = (name: string) => {
    setPrefs((p) => ({
      ...p,
      subscribed_categories: p.subscribed_categories.includes(name)
        ? p.subscribed_categories.filter((x) => x !== name)
        : [...p.subscribed_categories, name],
    }));
  };

  const toggleLocation = (loc: string) => {
    setPrefs((p) => {
      const existing = p.preferred_locations || [];
      const has = existing.includes(loc);
      return {
        ...p,
        preferred_locations: has ? existing.filter((l) => l !== loc) : [...existing, loc],
      };
    });
  };

  const addCustomLocation = () => {
    const trimmed = customLocation.trim();
    if (!trimmed) return;
    const existing = prefs.preferred_locations || [];
    if (!existing.includes(trimmed)) {
      setPrefs({ ...prefs, preferred_locations: [...existing, trimmed] });
    }
    setCustomLocation("");
  };

  const removeLocation = (loc: string) => {
    setPrefs((p) => ({
      ...p,
      preferred_locations: (p.preferred_locations || []).filter((l) => l !== loc),
    }));
  };

  const applyBudgetPreset = (min: number, max: number) => {
    setPrefs((p) => ({ ...p, min_budget: min, max_budget: max }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveProviderPreferences(prefs);
      onSaved(prefs);
      toast.success("✨ Matchmaker budget & location preferences updated in real time!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black">Matchmaker Opportunity Preferences</DialogTitle>
              <DialogDescription className="text-xs">
                Customize your real-time budget range and location preferences to receive high-intent matches.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Notifications Master Toggle */}
          <div className="flex items-center justify-between border border-border/80 rounded-2xl p-3.5 bg-muted/30">
            <div>
              <Label className="text-xs font-black flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary" /> Live Match Notifications
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automatically match and receive alerts when customers post jobs in your range.
              </p>
            </div>
            <Switch
              checked={prefs.notifications_enabled}
              onCheckedChange={(v) => setPrefs({ ...prefs, notifications_enabled: v })}
            />
          </div>

          {/* Budget Range Section */}
          <div className="space-y-2.5 border border-border/80 rounded-2xl p-4 bg-card">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" /> Target Budget Range (₦)
              </Label>
              <span className="text-xs font-extrabold text-emerald-600">
                ₦{Number(prefs.min_budget || 0).toLocaleString()} – ₦{Number(prefs.max_budget || 0).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold">Minimum Budget (₦)</span>
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  value={prefs.min_budget}
                  onChange={(e) => setPrefs({ ...prefs, min_budget: Math.max(0, Number(e.target.value) || 0) })}
                  className="rounded-xl text-xs h-9 font-bold mt-1"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold">Maximum Budget (₦)</span>
                <Input
                  type="number"
                  min={0}
                  step={10000}
                  value={prefs.max_budget}
                  onChange={(e) => setPrefs({ ...prefs, max_budget: Math.max(0, Number(e.target.value) || 0) })}
                  className="rounded-xl text-xs h-9 font-bold mt-1"
                />
              </div>
            </div>

            {/* Quick Budget Presets */}
            <div className="pt-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Quick Presets</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {BUDGET_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyBudgetPreset(preset.min, preset.max)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-secondary/70 hover:bg-primary/10 hover:border-primary/40 font-medium transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location Preferences Section */}
          <div className="space-y-2.5 border border-border/80 rounded-2xl p-4 bg-card">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-600" /> Target Locations & Delivery
              </Label>
              <span className="text-[11px] text-muted-foreground font-semibold">
                {(prefs.preferred_locations || []).length} selected
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Select the states or online delivery zones where you can execute jobs.
            </p>

            {/* Active Selected Location Badges */}
            {(prefs.preferred_locations || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(prefs.preferred_locations || []).map((loc) => (
                  <Badge
                    key={loc}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20 text-xs font-bold gap-1 pl-2.5 pr-1.5 py-1"
                  >
                    {loc}
                    <button
                      type="button"
                      onClick={() => removeLocation(loc)}
                      className="hover:text-destructive transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Popular Location Options */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {POPULAR_LOCATIONS.map((loc) => {
                const isSelected = (prefs.preferred_locations || []).includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleLocation(loc)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 font-semibold ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-secondary/60 hover:bg-secondary border-border text-foreground/80"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {loc}
                  </button>
                );
              })}
            </div>

            {/* Custom Location input */}
            <div className="flex items-center gap-2 pt-2">
              <Input
                placeholder="Add custom city or region (e.g. Lekki Phase 1, Calabar)..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomLocation();
                  }
                }}
                className="rounded-xl text-xs h-9 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomLocation}
                className="rounded-xl text-xs font-bold h-9 gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>

          {/* Subscribed Categories Section */}
          <div className="space-y-2 border border-border/80 rounded-2xl p-4 bg-card">
            <Label className="text-xs font-black flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Service Industries
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Select the service categories that align with your business offerings.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_REQUEST_CATEGORIES.map((cat) => {
                const isSub = (prefs.subscribed_categories || []).includes(cat.name);
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSub
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-secondary/60 hover:bg-secondary border-border text-foreground/80"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-xl text-xs">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="font-extrabold rounded-xl text-xs bg-primary text-white shadow-md">
            {saving ? "Updating Realtime Preferences…" : "Save Live Preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
