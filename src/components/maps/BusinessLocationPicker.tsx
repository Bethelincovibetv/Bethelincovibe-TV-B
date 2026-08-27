import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin,
  Crosshair,
  Navigation,
  Globe,
  Check,
  Building,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { MAJOR_CITIES_LOCATIONS } from "@/lib/businessCategories";
import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "./GoogleMapsProvider";

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
  const state = value.state || "Lagos State";
  const city = value.city || "Lagos";
  const address = value.address || "";
  const lat = typeof value.latitude === "number" ? value.latitude : 6.5244;
  const lng = typeof value.longitude === "number" ? value.longitude : 3.3792;

  const handleCitySelect = (selectedCityName: string) => {
    const found = MAJOR_CITIES_LOCATIONS.find((c) => c.city === selectedCityName);
    if (found) {
      onChange({
        ...value,
        country: found.country,
        state: found.state,
        city: found.city,
        latitude: found.lat,
        longitude: found.lng,
      });
      toast.success(`Location updated to ${found.city}, ${found.state}`);
    }
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
        toast.error(`Location detection failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            Physical Location &amp; Google Maps Coordinates
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Accurate coordinates allow nearby clients to find you on the Business Directory Interactive Map.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetectGPS}
          disabled={detecting}
          className="rounded-xl text-xs font-bold gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Crosshair className={`h-3.5 w-3.5 ${detecting ? "animate-spin" : ""}`} />
          {detecting ? "Detecting..." : "Detect Current GPS"}
        </Button>
      </div>

      {/* Quick City Presets */}
      <div className="p-3 bg-muted/40 rounded-2xl border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <Building className="h-3.5 w-3.5 text-primary" /> Popular Commercial Hubs:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MAJOR_CITIES_LOCATIONS.slice(0, 10).map((loc) => {
            const isSelected = city === loc.city;
            return (
              <button
                key={loc.city}
                type="button"
                onClick={() => handleCitySelect(loc.city)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-card hover:border-primary/50 text-foreground"
                }`}
              >
                {loc.city}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold">Country</Label>
          <Input
            value={country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            placeholder="Nigeria"
            className="rounded-xl text-xs h-9 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">State / Region</Label>
          <Input
            value={state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            placeholder="Lagos State"
            className="rounded-xl text-xs h-9 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">City / District</Label>
          <Input
            value={city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Ikeja / Lekki"
            className="rounded-xl text-xs h-9 mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold">Street Address / Suite / Landmark</Label>
        <Input
          value={address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="e.g. Plot 14 Admiralty Way, Lekki Phase 1, Lagos"
          className="rounded-xl text-xs h-9 mt-1"
        />
      </div>

      {/* Latitude & Longitude Coords */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-2xl border">
        <div>
          <Label className="text-[11px] font-bold text-muted-foreground">Latitude (Lat)</Label>
          <Input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) =>
              onChange({ ...value, latitude: parseFloat(e.target.value) || 0 })
            }
            className="rounded-xl text-xs h-8 mt-1 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] font-bold text-muted-foreground">Longitude (Lng)</Label>
          <Input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) =>
              onChange({ ...value, longitude: parseFloat(e.target.value) || 0 })
            }
            className="rounded-xl text-xs h-8 mt-1 font-mono"
          />
        </div>
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
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 shadow-xs">
              <MapPin className="h-3 w-3 text-primary" />
              {city}, {country} ({lat.toFixed(4)}, {lng.toFixed(4)})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
