import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Building2,
  Search,
  Star,
  ExternalLink,
  Phone,
  MessageCircle,
  Sparkles,
  Navigation,
  X,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "./GoogleMapsProvider";
import { PRESET_BUSINESS_CATEGORIES } from "@/lib/businessCategories";

export interface DirectoryBusinessItem {
  id: string;
  business_name?: string;
  name?: string;
  category?: string;
  bio?: string;
  avatar_url?: string;
  logo_url?: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  review_count?: number;
  is_verified?: boolean;
  services?: any[];
}

export default function DirectoryInteractiveMap({
  businesses,
  selectedCategory,
  onSelectCategory,
}: {
  businesses: DirectoryBusinessItem[];
  selectedCategory?: string;
  onSelectCategory?: (cat: string) => void;
}) {
  const [selectedBusiness, setSelectedBusiness] = useState<DirectoryBusinessItem | null>(null);
  const [localSearch, setLocalSearch] = useState("");

  // Process businesses with coordinates (or assigned coordinates based on city)
  const businessesWithCoords = useMemo(() => {
    return businesses.map((b, index) => {
      let lat = typeof b.latitude === "number" ? b.latitude : null;
      let lng = typeof b.longitude === "number" ? b.longitude : null;

      // If lat/lng missing, derive smart cluster coordinates around Lagos/Abuja
      if (!lat || !lng) {
        const baseLat = 6.5244 + ((index % 7) - 3) * 0.025;
        const baseLng = 3.3792 + ((index % 5) - 2) * 0.028;
        lat = Number(baseLat.toFixed(6));
        lng = Number(baseLng.toFixed(6));
      }

      return {
        ...b,
        derivedLat: lat,
        derivedLng: lng,
      };
    });
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    return businessesWithCoords.filter((b) => {
      const name = (b.business_name || b.name || "").toLowerCase();
      const cat = (b.category || "").toLowerCase();
      const loc = (b.location || b.city || "").toLowerCase();
      const q = localSearch.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || cat.includes(q) || loc.includes(q);
      const matchesCategory =
        !selectedCategory ||
        selectedCategory === "all" ||
        cat.includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [businessesWithCoords, localSearch, selectedCategory]);

  const defaultCenter = useMemo(() => {
    if (filteredBusinesses.length > 0 && filteredBusinesses[0].derivedLat) {
      return {
        lat: filteredBusinesses[0].derivedLat,
        lng: filteredBusinesses[0].derivedLng,
      };
    }
    return { lat: 6.5244, lng: 3.3792 }; // Lagos default
  }, [filteredBusinesses]);

  return (
    <div className="space-y-4">
      {/* Map Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-card rounded-2xl border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search business names, categories, or locations on map..."
            className="pl-9 rounded-xl text-xs h-9 bg-muted/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-xl px-3 py-1.5 text-xs font-bold gap-1.5 shrink-0">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{filteredBusinesses.length} Mapped Businesses</span>
          </Badge>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative rounded-3xl border overflow-hidden shadow-md bg-muted h-[520px]">
        {GOOGLE_MAPS_API_KEY ? (
          <Map
            defaultCenter={defaultCenter}
            center={
              selectedBusiness
                ? {
                    lat: (selectedBusiness as any).derivedLat,
                    lng: (selectedBusiness as any).derivedLng,
                  }
                : defaultCenter
            }
            defaultZoom={12}
            zoom={selectedBusiness ? 14 : 12}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
          >
            {filteredBusinesses.map((biz) => {
              const isSelected = selectedBusiness?.id === biz.id;
              return (
                <AdvancedMarker
                  key={biz.id}
                  position={{ lat: biz.derivedLat, lng: biz.derivedLng }}
                  onClick={() => setSelectedBusiness(biz)}
                >
                  <div className="cursor-pointer transform hover:scale-110 transition-transform">
                    <Pin
                      background={isSelected ? "#10b981" : "#2563eb"}
                      glyphColor="#ffffff"
                      borderColor={isSelected ? "#047857" : "#1d4ed8"}
                      scale={isSelected ? 1.2 : 1.0}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        ) : (
          <div className="w-full h-full relative">
            <iframe
              title="Interactive Business Directory Map"
              className="w-full h-full border-0"
              src={`https://maps.google.com/maps?q=${defaultCenter.lat},${defaultCenter.lng}&z=12&output=embed`}
              loading="lazy"
            />
          </div>
        )}

        {/* Selected Business Preview Floating Card */}
        {selectedBusiness && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-card/95 backdrop-blur-md rounded-2xl border shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedBusiness.avatar_url || selectedBusiness.logo_url ? (
                    <img
                      src={selectedBusiness.avatar_url || selectedBusiness.logo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {selectedBusiness.business_name || selectedBusiness.name}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 mt-0.5">
                    {selectedBusiness.category || "Verified Enterprise"}
                  </Badge>
                </div>
              </div>

              <button
                onClick={() => setSelectedBusiness(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
              {selectedBusiness.bio || "Quality products & professional verified services in Nigeria."}
            </p>

            <div className="flex items-center gap-2 pt-3 mt-3 border-t">
              <Button asChild size="sm" className="flex-1 rounded-xl font-bold text-xs shadow-xs">
                <Link to={`/business/${selectedBusiness.id}`}>
                  View Full Profile <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>

              {selectedBusiness.whatsapp && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  <a
                    href={`https://wa.me/${selectedBusiness.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
