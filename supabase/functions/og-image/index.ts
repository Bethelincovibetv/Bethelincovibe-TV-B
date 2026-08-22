// Auto-generated Open Graph cards (1200x630) for listings, categories, profiles, posts & pages.
// Usage: /functions/v1/og-image?title=...&subtitle=...&image=<url>&badge=...
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const BRAND = "Bethelincovibe TV";
const W = 1200;
const H = 630;

let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  if (!wasmReady) {
    wasmReady = initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
  }
  return wasmReady;
}

// resvg-wasm ships no system fonts — supply our own or every <text> renders blank.
const FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
];
let fontsReady: Promise<Uint8Array[]> | null = null;
function ensureFonts() {
  if (!fontsReady) {
    fontsReady = Promise.all(
      FONT_URLS.map(async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())),
    );
  }
  return fontsReady;
}

const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Greedy word wrap tuned for the heading font size. */
function wrap(text: string, maxChars: number, maxLines: number) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line.length) line = w;
    else if ((line + " " + w).length <= maxChars) line += " " + w;
    else { lines.push(line); line = w; if (lines.length === maxLines) break; }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, "…");
  }
  return lines;
}

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/") || type.includes("svg")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 4_500_000) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

function buildSvg(opts: { title: string; subtitle: string; badge: string; photo: string | null }) {
  const titleLines = wrap(opts.title, opts.photo ? 22 : 26, 3);
  const subLines = wrap(opts.subtitle, opts.photo ? 34 : 60, 2);
  const textX = 72;
  const panelW = opts.photo ? 700 : W;
  const startY = 300 - (titleLines.length - 1) * 34;

  const photoBlock = opts.photo
    ? `<clipPath id="pc"><rect x="740" y="0" width="460" height="${H}"/></clipPath>
       <image href="${opts.photo}" x="740" y="0" width="460" height="${H}"
              preserveAspectRatio="xMidYMid slice" clip-path="url(#pc)"/>
       <rect x="740" y="0" width="120" height="${H}" fill="url(#fade)"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4C1D95"/>
      <stop offset="55%" stop-color="#7C22CE"/>
      <stop offset="100%" stop-color="#C026D3"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5B1A9E" stop-opacity="1"/>
      <stop offset="100%" stop-color="#5B1A9E" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="120" cy="560" r="220" fill="#ffffff" opacity="0.06"/>
  <circle cx="640" cy="-40" r="180" fill="#ffffff" opacity="0.05"/>
  ${photoBlock}

  <rect x="${textX}" y="58" rx="22" ry="22" width="${Math.min(panelW - 144, 18 * opts.badge.length + 56)}" height="44" fill="#ffffff" opacity="0.18"/>
  <text x="${textX + 26}" y="88" font-family="DejaVu Sans" font-size="22" font-weight="700" fill="#ffffff" letter-spacing="1">${esc(opts.badge.toUpperCase())}</text>

  ${titleLines.map((l, i) =>
    `<text x="${textX}" y="${startY + i * 74}" font-family="DejaVu Sans" font-size="64" font-weight="700" fill="#ffffff">${esc(l)}</text>`
  ).join("\n  ")}

  ${subLines.map((l, i) =>
    `<text x="${textX}" y="${startY + titleLines.length * 74 + 18 + i * 38}" font-family="DejaVu Sans" font-size="30" fill="#F3E8FF">${esc(l)}</text>`
  ).join("\n  ")}

  <rect x="${textX}" y="${H - 108}" width="56" height="56" rx="16" fill="#ffffff"/>
  <text x="${textX + 15}" y="${H - 68}" font-family="DejaVu Sans" font-size="30" font-weight="700" fill="#7C22CE">B</text>
  <text x="${textX + 74}" y="${H - 78}" font-family="DejaVu Sans" font-size="28" font-weight="700" fill="#ffffff">${esc(BRAND)}</text>
  <text x="${textX + 74}" y="${H - 50}" font-family="DejaVu Sans" font-size="20" fill="#E9D5FF">bethelincovibetv.com.ng</text>
</svg>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const title = (url.searchParams.get("title") || BRAND).slice(0, 140);
    const subtitle = (url.searchParams.get("subtitle") || "Business info & tools for Lagos entrepreneurs").slice(0, 160);
    const badge = (url.searchParams.get("badge") || BRAND).slice(0, 28);
    const imageParam = url.searchParams.get("image");

    const photo = imageParam ? await fetchAsDataUri(imageParam) : null;
    const svg = buildSvg({ title, subtitle, badge, photo });

    try {
      const [, fontBuffers] = await Promise.all([ensureWasm(), ensureFonts()]);
      const png = new Resvg(svg, {
        fitTo: { mode: "width", value: W },
        font: { fontBuffers, defaultFontFamily: "DejaVu Sans", loadSystemFonts: false },
      }).render().asPng();
      return new Response(png, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
        },
      });
    } catch (_renderErr) {
      // Fall back to raw SVG if the rasteriser is unavailable.
      return new Response(svg, {
        headers: { ...corsHeaders, "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      });
    }
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
