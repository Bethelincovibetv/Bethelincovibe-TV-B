import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Full-site translator using Google Translate.
 * Covers all visible text including links, search, listings, dynamic content.
 * Supports English, Igbo, Yoruba, Hausa, French.
 */
const LANGS = [
  { code: "en", label: "English" },
  { code: "ig", label: "Igbo (Ásụ̀sụ̀ Igbo)" },
  { code: "yo", label: "Yoruba (Yorùbá)" },
  { code: "ha", label: "Hausa" },
  { code: "fr", label: "Français" },
];

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

let scriptInjected = false;

function persistLanguage(lang: string) {
  const value = lang === "en" ? "/en/en" : `/en/${lang}`;
  const host = location.hostname;
  const root = host.split(".").slice(-2).join(".");
  document.cookie = `googtrans=${value};path=/`;
  document.cookie = `googtrans=${value};path=/;domain=${host}`;
  if (host.includes(".")) document.cookie = `googtrans=${value};path=/;domain=.${root}`;
  try { localStorage.setItem("preferred_lang", lang); } catch {}
}

function ensureWidget() {
  if (scriptInjected) return;
  scriptInjected = true;

  // Hidden container that the Google widget mounts into.
  if (!document.getElementById("google_translate_element")) {
    const div = document.createElement("div");
    div.id = "google_translate_element";
    div.style.cssText = "position:absolute;left:-9999px;top:-9999px;visibility:hidden;";
    document.body.appendChild(div);
  }

  window.googleTranslateElementInit = function () {
    if (!window.google?.translate) return;
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,ig,yo,ha,fr",
        autoDisplay: false,
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
      },
      "google_translate_element",
    );
  };

  const s = document.createElement("script");
  s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.body.appendChild(s);

  // Hide Google's top banner so the page doesn't shift.
  const css = document.createElement("style");
  css.textContent = `
    .goog-te-banner-frame, .skiptranslate { display:none !important; }
    body { top: 0 !important; }
    .goog-te-gadget { font-size:0 !important; }
    .goog-te-gadget .goog-te-combo { font-size:14px !important; }
    font[style*="background-color"] { background:none !important; box-shadow:none !important; }
  `;
  document.head.appendChild(css);
}

function setLanguage(lang: string) {
  ensureWidget();
  persistLanguage(lang);

  const apply = (attempt = 0) => {
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (!select) {
      if (attempt < 30) return setTimeout(() => apply(attempt + 1), 200);
      return;
    }
    select.value = lang;
    select.dispatchEvent(new Event("change"));
  };
  apply();
}

export default function LanguageSwitcher() {
  const location = useLocation();
  const [current, setCurrent] = useState<string>("en");

  useEffect(() => {
    let stored = "en";
    try { stored = localStorage.getItem("preferred_lang") || "en"; } catch {}
    setCurrent(stored);
    if (stored !== "en") {
      ensureWidget();
      setTimeout(() => setLanguage(stored), 400);
    }
  }, []);

  useEffect(() => {
    if (current === "en") return;
    const t = setTimeout(() => setLanguage(current), 350);
    return () => clearTimeout(t);
  }, [location.pathname, location.search, current]);

  const pick = (code: string) => {
    setCurrent(code);
    setLanguage(code);
  };

  const label = LANGS.find((l) => l.code === current)?.label.split(" ")[0] || "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-2 notranslate" translate="no">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="notranslate" translate="no">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => pick(l.code)} className={current === l.code ? "bg-secondary" : ""}>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
