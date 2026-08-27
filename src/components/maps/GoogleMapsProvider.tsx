import React, { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  // If no API key is defined, render children directly (components handle fallback gracefully)
  if (!GOOGLE_MAPS_API_KEY) {
    return <>{children}</>;
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
      {children}
    </APIProvider>
  );
}
