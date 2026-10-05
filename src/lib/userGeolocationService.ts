import { useState, useEffect, useCallback } from "react";
import { NIGERIAN_STATES, getStateCoordinates } from "./nigerianStates";
import { GOOGLE_MAPS_API_KEY } from "@/components/maps/GoogleMapsProvider";

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  state?: string;
  country?: string;
  formattedAddress?: string;
}

const STORAGE_KEY = "btv_user_detected_location";

/**
 * Calculates straight-line distance in kilometers between two geographic points
 * using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return Infinity;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Approximate coordinate centroids for common commercial towns / LGAs in Nigeria
const NOTABLE_LOCALITY_COORDINATES: Record<string, { lat: number; lng: number; state: string }> = {
  ikeja: { lat: 6.6018, lng: 3.3515, state: "Lagos" },
  lekki: { lat: 6.4698, lng: 3.5852, state: "Lagos" },
  "victoria island": { lat: 6.4281, lng: 3.4219, state: "Lagos" },
  vi: { lat: 6.4281, lng: 3.4219, state: "Lagos" },
  ikoyi: { lat: 6.4549, lng: 3.4357, state: "Lagos" },
  yaba: { lat: 6.5095, lng: 3.3711, state: "Lagos" },
  surulere: { lat: 6.5014, lng: 3.3581, state: "Lagos" },
  "lagos island": { lat: 6.4549, lng: 3.3887, state: "Lagos" },
  ajah: { lat: 6.4698, lng: 3.5652, state: "Lagos" },
  maryland: { lat: 6.5724, lng: 3.3686, state: "Lagos" },
  alaba: { lat: 6.4619, lng: 3.1931, state: "Lagos" },
  oshodi: { lat: 6.5569, lng: 3.3421, state: "Lagos" },
  festac: { lat: 6.4698, lng: 3.2844, state: "Lagos" },
  ikorodu: { lat: 6.6194, lng: 3.5105, state: "Lagos" },
  epe: { lat: 6.5841, lng: 3.9834, state: "Lagos" },
  agege: { lat: 6.6179, lng: 3.3209, state: "Lagos" },
  ojota: { lat: 6.5857, lng: 3.3847, state: "Lagos" },
  gbagada: { lat: 6.5542, lng: 3.3897, state: "Lagos" },
  magodo: { lat: 6.6169, lng: 3.3821, state: "Lagos" },
  ogba: { lat: 6.6341, lng: 3.3421, state: "Lagos" },
  abuja: { lat: 9.0765, lng: 7.3986, state: "FCT" },
  garki: { lat: 9.0308, lng: 7.4883, state: "FCT" },
  wuse: { lat: 9.0667, lng: 7.4667, state: "FCT" },
  maitama: { lat: 9.0882, lng: 7.4933, state: "FCT" },
  asokoro: { lat: 9.0531, lng: 7.5244, state: "FCT" },
  "port harcourt": { lat: 4.8156, lng: 7.0498, state: "Rivers" },
  ibadan: { lat: 7.3775, lng: 3.947, state: "Oyo" },
  kano: { lat: 12.0022, lng: 8.592, state: "Kano" },
  enugu: { lat: 6.4584, lng: 7.5464, state: "Enugu" },
  benin: { lat: 6.335, lng: 5.6037, state: "Edo" },
  asaba: { lat: 6.1984, lng: 6.7291, state: "Delta" },
  warri: { lat: 5.5167, lng: 5.75, state: "Delta" },
  abeokuta: { lat: 7.1475, lng: 3.3619, state: "Ogun" },
  calabar: { lat: 4.9757, lng: 8.3417, state: "Cross River" },
  uyo: { lat: 5.0377, lng: 7.9128, state: "Akwa Ibom" },
  onitsha: { lat: 6.1511, lng: 6.7865, state: "Anambra" },
  kaduna: { lat: 10.5105, lng: 7.4165, state: "Kaduna" },
  jos: { lat: 9.8965, lng: 8.8583, state: "Plateau" },
  ilorin: { lat: 8.4966, lng: 4.5421, state: "Kwara" },
  owerri: { lat: 5.485, lng: 7.035, state: "Imo" },
  akure: { lat: 7.2571, lng: 5.2058, state: "Ondo" },
};

/**
 * Resolves approximate coordinates from an address or location text string.
 */
export function estimateCoordinatesFromText(
  locationText?: string | null
): { lat: number; lng: number; label: string } | null {
  if (!locationText || !locationText.trim()) return null;
  const lower = locationText.toLowerCase().trim();

  // 1. Check notable Nigerian commercial town / LGA matches
  for (const [key, val] of Object.entries(NOTABLE_LOCALITY_COORDINATES)) {
    if (lower.includes(key)) {
      return { lat: val.lat, lng: val.lng, label: `${key.charAt(0).toUpperCase() + key.slice(1)}, ${val.state}` };
    }
  }

  // 2. Check all 36 Nigerian states
  for (const state of NIGERIAN_STATES) {
    if (lower.includes(state.name.toLowerCase())) {
      return { lat: state.lat, lng: state.lng, label: `${state.name} State` };
    }
    for (const city of state.cities) {
      if (lower.includes(city.toLowerCase())) {
        return { lat: state.lat, lng: state.lng, label: `${city}, ${state.name}` };
      }
    }
  }

  // Default to Lagos centroid if generic Nigeria match
  if (lower.includes("lagos") || lower.includes("nigeria")) {
    return { lat: 6.5244, lng: 3.3792, label: "Lagos, Nigeria" };
  }

  return null;
}

/**
 * Reverse geocode latitude and longitude using Google Maps Geocoder API
 * with graceful fallback to Nominatim & Nigerian locality dictionary.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ city: string; state: string; formattedAddress: string }> {
  // Strategy 1: Google Maps Geocoder if Google Maps JS script is present on window
  try {
    if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      const res = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Google Geocoder status: ${status}`));
          }
        });
      });

      if (res) {
        let city = "";
        let state = "";
        for (const comp of res.address_components || []) {
          if (comp.types.includes("locality") || comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
            if (!city) city = comp.long_name;
          }
          if (comp.types.includes("administrative_area_level_1")) {
            state = comp.long_name.replace(/\s*state$/i, "");
          }
        }
        return {
          city: city || "Lagos",
          state: state || "Lagos",
          formattedAddress: res.formatted_address || `${city || "Lagos"}, ${state || "Lagos"}`,
        };
      }
    }
  } catch (err) {
    console.debug("Google geocode fallback notice:", err);
  }

  // Strategy 2: Nearest locality matching from Nigerian database
  let bestMatch = { city: "Ikeja", state: "Lagos", distance: Infinity };
  for (const [key, val] of Object.entries(NOTABLE_LOCALITY_COORDINATES)) {
    const d = calculateDistanceKm(lat, lng, val.lat, val.lng);
    if (d < bestMatch.distance) {
      bestMatch = { city: key.charAt(0).toUpperCase() + key.slice(1), state: val.state, distance: d };
    }
  }

  if (bestMatch.distance <= 40) {
    return {
      city: bestMatch.city,
      state: bestMatch.state,
      formattedAddress: `${bestMatch.city}, ${bestMatch.state}, Nigeria`,
    };
  }

  // Strategy 3: Nearest Nigerian State Center
  for (const st of NIGERIAN_STATES) {
    const d = calculateDistanceKm(lat, lng, st.lat, st.lng);
    if (d < bestMatch.distance) {
      bestMatch = { city: st.capital, state: st.name, distance: d };
    }
  }

  return {
    city: bestMatch.city,
    state: bestMatch.state,
    formattedAddress: `${bestMatch.city}, ${bestMatch.state}, Nigeria`,
  };
}

/**
 * Retrieves cached user geolocation from localStorage.
 */
export function getCachedUserLocation(): UserCoordinates | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache validity: 2 hours
    if (Date.now() - (parsed.cachedAt || 0) < 2 * 60 * 60 * 1000) {
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Saves detected user location to localStorage.
 */
export function cacheUserLocation(coords: UserCoordinates): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...coords, cachedAt: Date.now() }));
    window.dispatchEvent(new CustomEvent("btv_user_location_changed", { detail: coords }));
  } catch {}
}

/**
 * Clears detected user location from cache.
 */
export function clearCachedUserLocation(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("btv_user_location_changed", { detail: null }));
  } catch {}
}

/**
 * Detects current GPS position via browser / Google Geolocation API.
 */
export async function detectCurrentPosition(): Promise<UserCoordinates> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = pos.coords.accuracy;

        try {
          const geo = await reverseGeocodeCoordinates(lat, lng);
          const result: UserCoordinates = {
            latitude: lat,
            longitude: lng,
            accuracy,
            city: geo.city,
            state: geo.state,
            country: "Nigeria",
            formattedAddress: geo.formattedAddress,
          };
          cacheUserLocation(result);
          resolve(result);
        } catch {
          const result: UserCoordinates = {
            latitude: lat,
            longitude: lng,
            accuracy,
            city: "Lagos",
            state: "Lagos",
            country: "Nigeria",
            formattedAddress: "Lagos, Nigeria",
          };
          cacheUserLocation(result);
          resolve(result);
        }
      },
      (err) => {
        let msg = "Could not detect location. Please check location permissions.";
        if (err.code === 1) {
          msg = "Location permission was denied. You can select your city manually.";
        } else if (err.code === 2) {
          msg = "Location position unavailable. Please choose your city.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please try again or select city.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * React hook to manage user geolocation, proximity radius, and distance calculations.
 */
export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(() => getCachedUserLocation());
  const [detecting, setDetecting] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null); // null means all / unbounded
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setUserLocation(e.detail || null);
    };
    window.addEventListener("btv_user_location_changed", handleUpdate);
    return () => window.removeEventListener("btv_user_location_changed", handleUpdate);
  }, []);

  const requestLocation = useCallback(async () => {
    setDetecting(true);
    setErrorMsg(null);
    try {
      const loc = await detectCurrentPosition();
      setUserLocation(loc);
      setOnlyNearby(true);
      if (radiusKm === null) {
        setRadiusKm(30); // Default to 30km radius when requested
      }
      return loc;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to detect location");
      throw err;
    } finally {
      setDetecting(false);
    }
  }, [radiusKm]);

  const setManualLocation = useCallback((cityOrStateName: string) => {
    const coords = estimateCoordinatesFromText(cityOrStateName);
    if (coords) {
      const loc: UserCoordinates = {
        latitude: coords.lat,
        longitude: coords.lng,
        city: cityOrStateName,
        state: "Lagos",
        country: "Nigeria",
        formattedAddress: `${cityOrStateName}, Nigeria`,
      };
      cacheUserLocation(loc);
      setUserLocation(loc);
      setOnlyNearby(true);
      if (radiusKm === null) setRadiusKm(30);
    }
  }, [radiusKm]);

  const clearLocation = useCallback(() => {
    clearCachedUserLocation();
    setUserLocation(null);
    setOnlyNearby(false);
    setRadiusKm(null);
    setErrorMsg(null);
  }, []);

  /**
   * Calculates distance from user's location to an entity with coordinates or text location.
   */
  const getDistanceTo = useCallback(
    (item: { latitude?: number | null; longitude?: number | null; address?: string | null; location?: string | null; city?: string | null }): number | null => {
      if (!userLocation) return null;

      // 1. Direct coordinates
      if (typeof item.latitude === "number" && typeof item.longitude === "number") {
        return calculateDistanceKm(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude);
      }

      // 2. Infer coordinates from text
      const text = item.location || item.city || item.address;
      if (text) {
        const est = estimateCoordinatesFromText(text);
        if (est) {
          return calculateDistanceKm(userLocation.latitude, userLocation.longitude, est.lat, est.lng);
        }
      }

      return null;
    },
    [userLocation]
  );

  return {
    userLocation,
    detecting,
    radiusKm,
    setRadiusKm,
    onlyNearby,
    setOnlyNearby,
    errorMsg,
    requestLocation,
    setManualLocation,
    clearLocation,
    getDistanceTo,
  };
}
