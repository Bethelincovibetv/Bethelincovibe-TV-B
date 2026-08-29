import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin,
  Crosshair,
  Building,
  Sparkles,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { NIGERIAN_STATES, getStateByName, getStateCoordinates } from "@/lib/nigerianStates";
import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "./GoogleMapsProvider";
import VoiceGuideHelper from "@/components/common/VoiceGuideHelper";

export interface LocationData {
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function BusinessLocationPicker({
  value,
  onChange,
}: {
  value: LocationData;
  onChange: (loc: LocationData) => void;
}) {
  const [detecting, setDetecting] = useState(false);

  const country = value.country || "Nigeria";
  const state = value.state || "Lagos";
  const city = value.city || "Ikeja";
  const address = value.address || "";
  const lat = typeof value.latitude === "number" ? value.latitude : 6.5244;
  const lng = typeof value.longitude === "number" ? value.longitude : 3.3792;

  const currentStateObj = getStateByName(state) || NIGERIAN_STATES.find(s => s.name === "Lagos") || NIGERIAN_STATES[0];

  const handleStateSelect = (selectedStateName: string) => {
    const foundState = getStateByName(selectedStateName);
    const coords = getStateCoordinates(selectedStateName);
    const defaultCity = foundState?.cities?.[0] || selectedStateName;

    onChange({
      ...value,
      country: "Nigeria",
      state: selectedStateName,
      city: defaultCity,
      latitude: coords.lat,
      longitude: coords.lng,
      address: value.address || `${defaultCity}, ${selectedStateName} State, Nigeria`,
    });
    toast.success(`Location updated to ${selectedStateName} State`);
  };

  const handleCitySelect = (selectedCityName: string) => {
    onChange({
      ...value,
      city: selectedCityName,
      address: value.address || `${selectedCityName}, ${state} State, Nigeria`,
    });
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        onChange({
          ...value,
          latitude: newLat,
          longitude: newLng,
        });
        setDetecting(false);
        toast.success(`Detected GPS coordinates: ${newLat}, ${newLng}`);
      },
      (err) => {
        setDetecting(false);
        toast.error(`Location detection notice: Using ${state} State default coordinates`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs font-black text-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              Business Location & Interactive Google Map
            </Label>
            <VoiceGuideHelper
              title="How Location Works"
              explanation="Choose your Nigerian State from the list so customers near you can find your store. You can also tap Detect GPS to pin your exact shop location without dragging complex coordinates!"
              simpleTip="Your registered State is saved automatically and does not need to be re-entered."
              variant="icon"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Your location powers the interactive directory map and allows buyers in your state to discover your services.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetectGPS}
          disabled={detecting}
          className="rounded-xl text-xs font-bold gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
        >
          <Crosshair className={`h-3.5 w-3.5 ${detecting ? "animate-spin" : ""}`} />
          {detecting ? "Detecting..." : "Detect Current GPS"}
        </Button>
      </div>

      {/* Nigerian State (36 States + FCT) Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-2xl border">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-emerald-600" /> Nigerian State (36 States + FCT)
          </Label>
          <Select value={state} onValueChange={handleStateSelect}>
            <SelectTrigger className="h-10 rounded-xl text-xs font-semibold bg-background">
              <SelectValue placeholder="Select Nigerian State" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {NIGERIAN_STATES.map((st) => (
                <SelectItem key={st.code} value={st.name} className="text-xs">
                  {st.name} State {st.name === "Federal Capital Territory" ? "(Abuja)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commercial City / LGA */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold flex items-center gap-1">
            <Building className="h-3.5 w-3.5 text-primary" /> City / Area in {state}
          </Label>
          <Select value={city} onValueChange={handleCitySelect}>
            <SelectTrigger className="h-10 rounded-xl text-xs font-semibold bg-background">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {currentStateObj.cities.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c} ({state})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Street Address Input */}
      <div>
        <Label className="text-xs font-bold text-foreground">Street Address / Suite / Landmark</Label>
        <Input
          value={address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="e.g. Plot 14 Admiralty Way, Lekki Phase 1, Lagos"
          className="rounded-xl text-xs sm:text-sm h-10 mt-1"
        />
      </div>

      {/* Interactive Map Preview */}
      <div className="rounded-2xl border overflow-hidden shadow-xs relative bg-muted h-52">
        {GOOGLE_MAPS_API_KEY ? (
          <Map
            defaultCenter={{ lat, lng }}
            center={{ lat, lng }}
            defaultZoom={14}
            zoom={14}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
          >
            <AdvancedMarker position={{ lat, lng }}>
              <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#1e40af" />
            </AdvancedMarker>
          </Map>
        ) : (
          <div className="w-full h-full relative">
            <iframe
              title="Location Preview"
              className="w-full h-full border-0"
              src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
              loading="lazy"
            />
            <div className="absolute top-2 left-2 bg-background/95 backdrop-blur-md px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shadow-sm text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {city}, {state} State ({lat.toFixed(4)}, {lng.toFixed(4)})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
