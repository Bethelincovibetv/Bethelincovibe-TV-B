import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Compass,
  Building2,
  Phone,
  MessageCircle,
} from "lucide-react";
import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "./GoogleMapsProvider";

interface BusinessMapViewProps {
  businessName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  whatsapp?: string;
}

export default function BusinessMapView({
  businessName,
  address,
  city = "Lagos",
  state = "Lagos State",
  country = "Nigeria",
  latitude,
  longitude,
  phone,
  whatsapp,
}: BusinessMapViewProps) {
  const lat = typeof latitude === "number" && !isNaN(latitude) ? latitude : 6.5244;
  const lng = typeof longitude === "number" && !isNaN(longitude) ? longitude : 3.3792;
  const fullAddress = [address, city, state, country].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address ? `${businessName}, ${fullAddress}` : `${lat},${lng}`
  )}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location &amp; Visiting Directions
          </h3>
          <p className="text-xs text-muted-foreground">
            Locate this verified business on Google Maps or get turn-by-turn driving directions.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="rounded-xl font-bold text-xs gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5" />
            Get Directions
          </a>
        </Button>
      </div>

      <div className="rounded-3xl border overflow-hidden shadow-sm relative bg-muted h-72 sm:h-80">
        {GOOGLE_MAPS_API_KEY ? (
          <Map
            defaultCenter={{ lat, lng }}
            center={{ lat, lng }}
            defaultZoom={15}
            zoom={15}
            gestureHandling="cooperative"
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
              title={`Map of ${businessName}`}
              className="w-full h-full border-0"
              src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
              loading="lazy"
            />
          </div>
        )}

        {/* Floating Info Overlay Card */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-card/95 backdrop-blur-md p-3.5 rounded-2xl border shadow-lg space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{businessName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{fullAddress}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t text-[11px]">
            <span className="font-mono text-[10px] text-muted-foreground">
              GPS: {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary hover:underline flex items-center gap-1"
            >
              Open in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
