import React, { useState } from "react";
import {
  MapPin,
  Crosshair,
  Sparkles,
  X,
  Compass,
  Check,
  ChevronDown,
  Navigation,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UserCoordinates } from "@/lib/userGeolocationService";

export interface NearMeLocationFilterProps {
  userLocation: UserCoordinates | null;
  detecting: boolean;
  radiusKm: number | null;
  setRadiusKm: (r: number | null) => void;
  onlyNearby: boolean;
  setOnlyNearby: (val: boolean) => void;
  onRequestLocation: () => Promise<any>;
  onClearLocation: () => void;
  onSelectManualLocation: (cityOrState: string) => void;
  filteredCount?: number;
  totalCount?: number;
  label?: string; // e.g. "businesses", "sellers", "people"
  className?: string;
}

const COMMON_CITIES = [
  "Ikeja",
  "Lekki",
  "Victoria Island",
  "Yaba",
  "Surulere",
  "Ikoyi",
  "Ajah",
  "Alaba",
  "Ikorodu",
  "Festac",
  "Maryland",
  "Abuja",
  "Port Harcourt",
  "Ibadan",
  "Kano",
  "Enugu",
];

const RADIUS_OPTIONS = [
  { label: "Within 5 km", value: 5 },
  { label: "Within 15 km", value: 15 },
  { label: "Within 30 km", value: 30 },
  { label: "Within 50 km", value: 50 },
  { label: "All Distances", value: null },
];

export default function NearMeLocationFilter({
  userLocation,
  detecting,
  radiusKm,
  setRadiusKm,
  onlyNearby,
  setOnlyNearby,
  onRequestLocation,
  onClearLocation,
  onSelectManualLocation,
  filteredCount,
  totalCount,
  label = "listings",
  className = "",
}: NearMeLocationFilterProps) {
  const [openDropdown, setOpenDropdown] = useState(false);

  const handleDetect = async () => {
    try {
      toast.info("Accessing Google Geolocation to detect your position...");
      const loc = await onRequestLocation();
      toast.success(`Location detected: ${loc.city || loc.state || "Lagos"}, Nigeria!`);
    } catch (err: any) {
      toast.error(err.message || "Could not detect GPS position. You can choose your city from the list.");
    }
  };

  const handleSelectCity = (city: string) => {
    onSelectManualLocation(city);
    toast.success(`Set location filter to: ${city}`);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 font-sans ${className}`}>
      {/* 1. Main Near Me Trigger Button */}
      {!userLocation ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetect}
          disabled={detecting}
          className="rounded-xl font-bold text-xs gap-1.5 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-foreground transition-all shadow-2xs"
          title="Use Google Geolocation to filter nearest people & businesses"
        >
          {detecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              <span>Detecting GPS...</span>
            </>
          ) : (
            <>
              <Crosshair className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>📍 Near Me (Google Geolocation)</span>
            </>
          )}
        </Button>
      ) : (
        /* Active Location Active Pill */
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-xs">
          <button
            type="button"
            onClick={() => setOnlyNearby(!onlyNearby)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-extrabold transition-all ${
              onlyNearby
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Near You: {userLocation.city || userLocation.state || "Lagos"}</span>
          </button>

          {/* Radius Selector Pills */}
          <div className="hidden sm:flex items-center gap-1 pl-1">
            {RADIUS_OPTIONS.map((opt) => {
              const active = radiusKm === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setRadiusKm(opt.value);
                    if (!onlyNearby) setOnlyNearby(true);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                    active
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:bg-emerald-500/20 hover:text-foreground"
                  }`}
                >
                  {opt.value ? `${opt.value} km` : "All"}
                </button>
              );
            })}
          </div>

          {/* Reset / Change */}
          <button
            type="button"
            onClick={onClearLocation}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            title="Clear location filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Quick City Dropdown / Switcher for users without GPS or for manual exploration */}
      <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground gap-1 px-2 border border-border/60"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Change City</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-2xl p-1.5 shadow-xl font-sans">
          <DropdownMenuLabel className="text-xs font-black uppercase text-muted-foreground px-2 py-1">
            Choose City / Area
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={handleDetect}
            className="rounded-xl text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer gap-2"
          >
            <Crosshair className="h-3.5 w-3.5 text-emerald-500" />
            <span>Use My Exact GPS Location</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {COMMON_CITIES.map((c) => (
              <DropdownMenuItem
                key={c}
                onClick={() => handleSelectCity(c)}
                className="rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between"
              >
                <span>{c}</span>
                {userLocation?.city?.toLowerCase() === c.toLowerCase() && (
                  <Check className="h-3 w-3 text-emerald-600" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 3. Feedback status badge */}
      {userLocation && onlyNearby && filteredCount !== undefined && (
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
          Showing {filteredCount} {label} {radiusKm ? `within ${radiusKm}km` : "sorted by proximity"}
        </span>
      )}
    </div>
  );
}
