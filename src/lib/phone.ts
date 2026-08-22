// Country codes + phone normalization for WhatsApp links

export interface CountryCode {
  code: string;       // ISO 2-letter
  name: string;
  dial: string;       // e.g. "234"
  flag: string;       // emoji
  trunk?: string;     // local trunk prefix to strip (e.g. "0" for NG, UK)
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "NG", name: "Nigeria", dial: "234", flag: "🇳🇬", trunk: "0" },
  { code: "GH", name: "Ghana", dial: "233", flag: "🇬🇭", trunk: "0" },
  { code: "KE", name: "Kenya", dial: "254", flag: "🇰🇪", trunk: "0" },
  { code: "ZA", name: "South Africa", dial: "27", flag: "🇿🇦", trunk: "0" },
  { code: "EG", name: "Egypt", dial: "20", flag: "🇪🇬", trunk: "0" },
  { code: "US", name: "United States", dial: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧", trunk: "0" },
  { code: "IE", name: "Ireland", dial: "353", flag: "🇮🇪", trunk: "0" },
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷", trunk: "0" },
  { code: "DE", name: "Germany", dial: "49", flag: "🇩🇪", trunk: "0" },
  { code: "ES", name: "Spain", dial: "34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dial: "31", flag: "🇳🇱", trunk: "0" },
  { code: "BE", name: "Belgium", dial: "32", flag: "🇧🇪", trunk: "0" },
  { code: "CH", name: "Switzerland", dial: "41", flag: "🇨🇭", trunk: "0" },
  { code: "SE", name: "Sweden", dial: "46", flag: "🇸🇪", trunk: "0" },
  { code: "NO", name: "Norway", dial: "47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dial: "45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dial: "358", flag: "🇫🇮", trunk: "0" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "RU", name: "Russia", dial: "7", flag: "🇷🇺" },
  { code: "TR", name: "Turkey", dial: "90", flag: "🇹🇷", trunk: "0" },
  { code: "AE", name: "UAE", dial: "971", flag: "🇦🇪", trunk: "0" },
  { code: "SA", name: "Saudi Arabia", dial: "966", flag: "🇸🇦", trunk: "0" },
  { code: "IN", name: "India", dial: "91", flag: "🇮🇳", trunk: "0" },
  { code: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰", trunk: "0" },
  { code: "BD", name: "Bangladesh", dial: "880", flag: "🇧🇩", trunk: "0" },
  { code: "CN", name: "China", dial: "86", flag: "🇨🇳", trunk: "0" },
  { code: "JP", name: "Japan", dial: "81", flag: "🇯🇵", trunk: "0" },
  { code: "KR", name: "South Korea", dial: "82", flag: "🇰🇷", trunk: "0" },
  { code: "ID", name: "Indonesia", dial: "62", flag: "🇮🇩", trunk: "0" },
  { code: "PH", name: "Philippines", dial: "63", flag: "🇵🇭", trunk: "0" },
  { code: "MY", name: "Malaysia", dial: "60", flag: "🇲🇾", trunk: "0" },
  { code: "SG", name: "Singapore", dial: "65", flag: "🇸🇬" },
  { code: "AU", name: "Australia", dial: "61", flag: "🇦🇺", trunk: "0" },
  { code: "NZ", name: "New Zealand", dial: "64", flag: "🇳🇿", trunk: "0" },
  { code: "BR", name: "Brazil", dial: "55", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "MX", name: "Mexico", dial: "52", flag: "🇲🇽" },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // Nigeria

export function findCountryByDial(digits: string): CountryCode | undefined {
  // Try longest dial codes first to disambiguate (e.g. "1" vs "1xxx")
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => digits.startsWith(c.dial));
}

/**
 * Convert any phone input to digits-only E.164 form suitable for wa.me/<digits>.
 * If the number already starts with a known country code, use it.
 * Otherwise prepend the fallback country dial code and strip leading trunk zero.
 */
export function normalizeWhatsApp(raw?: string | null, fallbackDial = "234"): string {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (!d) return "";
  // Already E.164-looking (10+ digits and matches a known dial)
  if (d.length >= 10 && findCountryByDial(d)) return d;
  // Strip a leading 0 (trunk)
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return fallbackDial + d;
}

export function waLink(raw?: string | null, message = "", fallbackDial = "234"): string | null {
  const digits = normalizeWhatsApp(raw, fallbackDial);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
