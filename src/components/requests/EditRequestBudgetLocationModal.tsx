import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Coins, MapPin, Calendar, Check, Sparkles, Sliders } from "lucide-react";
import { updateBusinessRequestBudgetAndLocation } from "@/services/opportunityMatchingRealtimeService";
import { BusinessRequest } from "@/types/opportunityMatching";
import { toast } from "sonner";

const QUICK_LOCATIONS = [
  "Online / Remote",
  "Lagos, Nigeria",
  "Abuja (FCT)",
  "Port Harcourt / Rivers",
  "Ibadan, Oyo State",
  "Enugu",
  "Nationwide (Nigeria)",
];

const DEADLINE_OPTIONS = [
  "Urgent — Today",
  "Within 24-48 Hours",
  "This Week (3-5 Days)",
  "Next 2 Weeks",
  "Flexible / No Rush",
];

export default function EditRequestBudgetLocationModal({
  open,
  onOpenChange,
  request,
  userId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: BusinessRequest;
  userId: string;
  onUpdated?: (updated: BusinessRequest) => void;
}) {
  const [budgetNumeric, setBudgetNumeric] = useState<number>(request.budget || 50000);
  const [budgetType, setBudgetType] = useState<"fixed" | "range" | "negotiable">(request.budget_type || "negotiable");
  const [locationPreference, setLocationPreference] = useState(request.location_preference || "Online / Remote");
  const [deadline, setDeadline] = useState(request.deadline || "Within 48 hours");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setBudgetNumeric(request.budget || 50000);
      setBudgetType(request.budget_type || "negotiable");
      setLocationPreference(request.location_preference || "Online / Remote");
      setDeadline(request.deadline || "Within 48 hours");
    }
  }, [request]);

  const handleSave = async () => {
    if (!budgetNumeric || budgetNumeric <= 0) {
      toast.error("Please enter a valid budget amount.");
      return;
    }
    if (!locationPreference.trim()) {
      toast.error("Please specify a location preference or choose Online / Remote.");
      return;
    }

    setSaving(true);
    try {
      const budgetFormatted = `₦${budgetNumeric.toLocaleString()} (${
        budgetType === "fixed" ? "Fixed" : budgetType === "negotiable" ? "Negotiable" : "Range"
      })`;

      const updated = await updateBusinessRequestBudgetAndLocation({
        requestId: request.id,
        userId,
        budget: budgetNumeric,
        budgetFormatted,
        budgetType,
        locationPreference: locationPreference.trim(),
        deadline,
      });

      toast.success("✨ Request budget & location updated in real time!");
      if (onUpdated) onUpdated(updated);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not update request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black">Edit Budget & Location</DialogTitle>
              <DialogDescription className="text-xs">
                Real-time updates immediately notify matched providers on the live database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Target Service Title Header */}
          <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 text-xs">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Target Request</span>
            <div className="font-extrabold text-foreground mt-0.5 truncate">{request.service_title}</div>
          </div>

          {/* Budget Editor */}
          <div className="space-y-2 border border-border/80 rounded-2xl p-3.5 bg-card">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" /> Budget Amount (₦)
              </Label>
              <span className="text-xs font-black text-emerald-600">
                ₦{Number(budgetNumeric || 0).toLocaleString()}
              </span>
            </div>

            <Input
              type="number"
              min={1000}
              step={5000}
              value={budgetNumeric}
              onChange={(e) => setBudgetNumeric(Math.max(0, Number(e.target.value) || 0))}
              className="rounded-xl text-sm h-10 font-bold"
              placeholder="e.g. 75000"
            />

            {/* Budget Type Options */}
            <div className="pt-2">
              <span className="text-[11px] text-muted-foreground font-semibold">Pricing Flexibility:</span>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["negotiable", "fixed", "range"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBudgetType(type)}
                    className={`text-xs py-1.5 px-2 rounded-xl border font-bold capitalize transition-all ${
                      budgetType === type
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-secondary/60 hover:bg-secondary border-border text-foreground/80"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location Preference Editor */}
          <div className="space-y-2 border border-border/80 rounded-2xl p-3.5 bg-card">
            <Label className="text-xs font-black flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" /> Delivery / Location Preference
            </Label>

            <Input
              value={locationPreference}
              onChange={(e) => setLocationPreference(e.target.value)}
              placeholder="e.g. Online / Remote or Ikeja, Lagos"
              className="rounded-xl text-xs h-9 font-semibold"
            />

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_LOCATIONS.map((loc) => {
                const isSelected = locationPreference.toLowerCase() === loc.toLowerCase();
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocationPreference(loc)}
                    className={`text-[11px] px-2 py-1 rounded-lg border transition-all font-semibold ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-secondary/60 hover:bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 inline mr-1" />}
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline / Urgency */}
          <div className="space-y-1.5 border border-border/80 rounded-2xl p-3.5 bg-card">
            <Label className="text-xs font-black flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" /> Target Timeline
            </Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DEADLINE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDeadline(opt)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                    deadline === opt
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-secondary/60 hover:bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-xl text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="font-black rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Saving Realtime Update…" : "Update Request Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
