import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES, DEFAULT_COUNTRY, findCountryByDial, normalizeWhatsApp } from "@/lib/phone";

interface Props {
  value: string;
  onChange: (e164: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Phone input with country code selector. Always emits a digits-only E.164
 * value (no leading "+") so wa.me/<value> works correctly.
 */
export default function PhoneInput({ value, onChange, placeholder = "8012345678", className, id }: Props) {
  // Derive initial country from value, else default
  const initial = useMemo(() => {
    const digits = String(value || "").replace(/\D/g, "");
    return findCountryByDial(digits) || DEFAULT_COUNTRY;
  }, []); // eslint-disable-line
  const [country, setCountry] = useState(initial);

  // Local part = value minus the dial prefix
  const local = useMemo(() => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith(country.dial)) return digits.slice(country.dial.length);
    return digits;
  }, [value, country]);

  const emit = (nextCountry = country, nextLocal = local) => {
    const cleaned = nextLocal.replace(/\D/g, "").replace(/^0+/, "");
    onChange(cleaned ? nextCountry.dial + cleaned : "");
  };

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Select
        value={country.code}
        onValueChange={(code) => {
          const next = COUNTRY_CODES.find((c) => c.code === code) || DEFAULT_COUNTRY;
          setCountry(next);
          emit(next, local);
        }}
      >
        <SelectTrigger className="w-[110px] shrink-0">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{country.flag}</span>
              <span className="text-xs">+{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="text-xs">+{c.dial}</span>
                <span className="text-xs text-muted-foreground">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={local}
        onChange={(e) => emit(country, e.target.value)}
      />
    </div>
  );
}

export { normalizeWhatsApp };
