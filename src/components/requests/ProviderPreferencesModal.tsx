import React, { useState } from "react";
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
import { Bell, Coins, Sliders, Sparkles, Volume2 } from "lucide-react";
import { POPULAR_REQUEST_CATEGORIES, ProviderOpportunityPreferences } from "@/types/opportunityMatching";
import { saveProviderPreferences } from "@/services/opportunityMatchingService";
import { toast } from "sonner";

interface ProviderPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: ProviderOpportunityPreferences;
  onSaved: (prefs: ProviderOpportunityPreferences) => void;
}

export default function ProviderPreferencesModal({
  open,
  onOpenChange,
  preferences,
  onSaved,
}: ProviderPreferencesModalProps) {
  const [prefs, setPrefs] = useState<ProviderOpportunityPreferences>({ ...preferences });

  const toggleCategory = (catName: string) => {
    const list = [...prefs.subscribed_categories];
    const idx = list.indexOf(catName);
    if (idx !== -1) {
      list.splice(idx, 1);
    } else {
      list.push(catName);
    }
    setPrefs({ ...prefs, subscribed_categories: list });
  };

  const handleSave = () => {
    saveProviderPreferences(prefs);
    onSaved(prefs);
    toast.success("Opportunity preferences and alert settings saved!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border border-border space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Opportunity Alerts & Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure which requests you want to receive instant alerts and notifications for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Toggles */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-bold text-foreground">Receive Opportunity Alerts</Label>
                <p className="text-muted-foreground text-[11px]">Get alerted when customers post matching jobs</p>
              </div>
              <Switch
                checked={prefs.notifications_enabled}
                onCheckedChange={(v) => setPrefs({ ...prefs, notifications_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <div>
                <Label className="font-bold text-foreground">Instant Sound Alerts</Label>
                <p className="text-muted-foreground text-[11px]">Play audio bell chime when a new lead drops</p>
              </div>
              <Switch
                checked={prefs.instant_sound_alerts}
                onCheckedChange={(v) => setPrefs({ ...prefs, instant_sound_alerts: v })}
              />
            </div>
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <Label className="font-bold text-foreground">Preferred Budget Range (₦)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Minimum (₦)</span>
                <Input
                  type="number"
                  value={prefs.min_budget}
                  onChange={(e) => setPrefs({ ...prefs, min_budget: Number(e.target.value) || 0 })}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Maximum (₦)</span>
                <Input
                  type="number"
                  value={prefs.max_budget}
                  onChange={(e) => setPrefs({ ...prefs, max_budget: Number(e.target.value) || 0 })}
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Category Subscriptions */}
          <div className="space-y-2">
            <Label className="font-bold text-foreground">Subscribed Categories</Label>
            <p className="text-[11px] text-muted-foreground">
              Select specific niches or leave empty to match all categories in your business profile.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_REQUEST_CATEGORIES.map((cat) => {
                const isSelected = prefs.subscribed_categories.includes(cat.name);
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-secondary text-foreground/80 border-border hover:border-primary/50"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-1/2 font-semibold">
            Cancel
          </Button>
          <Button onClick={handleSave} className="w-1/2 font-extrabold shadow-md">
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
