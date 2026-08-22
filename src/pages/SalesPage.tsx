import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Phone, Mail, MessageCircle, ChevronRight, Sparkles,
} from "lucide-react";
import SalesPageTemplate from "@/components/sales-templates/SalesPageTemplate";
import LeadCaptureModal from "@/components/sales-templates/LeadCaptureModal";
import { waLink as buildWaLink } from "@/lib/phone";

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done: diff === 0 };
}

function detectDevice() {
  if (typeof navigator === "undefined") return "unknown";
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";
}
function detectSource() {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer || "";
  const params = new URLSearchParams(window.location.search);
  const utm = params.get("utm_source") || params.get("source");
  if (utm) return utm;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("whatsapp") || host.includes("wa.me")) return "whatsapp";
    if (host.includes("facebook") || host.includes("fb.")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("google")) return "google";
    if (host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("t.me") || host.includes("telegram")) return "telegram";
    return host;
  } catch { return "direct"; }
}

export default function SalesPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [globalLeads, setGlobalLeads] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const [{ data }, { data: setting }] = await Promise.all([
        supabase.from("sales_pages").select("*").eq("slug", slug).maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "leads_enabled_global").maybeSingle(),
      ]);
      if (!data) { setNotFound(true); return; }
      setPage(data);
      setGlobalLeads(setting?.value !== "false");
      await supabase.from("sales_page_events").insert({
        sales_page_id: data.id,
        type: "view",
        referrer: document.referrer,
        device: detectDevice(),
        source: detectSource(),
      });
      await supabase.from("sales_pages").update({ views_count: (data.views_count || 0) + 1 }).eq("id", data.id);
    })();
  }, [slug]);

  const countdown = useCountdown(page?.countdown_ends_at);

  const gallery = useMemo(() => {
    if (!page) return [];
    return Array.isArray(page.gallery_image_urls) && page.gallery_image_urls.length
      ? page.gallery_image_urls
      : (page.product_image_url ? [page.product_image_url] : []);
  }, [page]);

  const youtubeEmbed = useMemo(() => {
    const url = page?.youtube_video_url?.trim();
    if (!url) return "";
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.replace(/^\//, "");
        return id ? `https://www.youtube.com/embed/${id}` : "";
      }
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
        return id ? `https://www.youtube.com/embed/${id}` : "";
      }
      return "";
    } catch { return ""; }
  }, [page]);

  if (notFound) return <div className="min-h-screen flex items-center justify-center"><p>Page not found.</p></div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;

  const track = async (type: string) => {
    await supabase.from("sales_page_events").insert({
      sales_page_id: page.id, type, device: detectDevice(), source: detectSource(),
    });
    await supabase.from("sales_pages").update({ clicks_count: (page.clicks_count || 0) + 1 }).eq("id", page.id);
  };

  const price = Number(page.price || 0);
  const formattedPrice = price > 0 ? `₦${price.toLocaleString()}` : "Contact for price";
  const waMsg = `Hi! I'm interested in ${page.product_name}. Please send me more details.`;
  const waLink = buildWaLink(page.contact_whatsapp, waMsg);
  const phoneLink = page.contact_phone ? `tel:+${String(page.contact_phone).replace(/\D/g, "")}` : null;
  const emailLink = page.contact_email ? `mailto:${page.contact_email}?subject=${encodeURIComponent("Order: " + page.product_name)}` : null;

  const leadCaptureOn = globalLeads && page.lead_capture_enabled !== false;
  const enrichedPage = { ...page, lead_capture_enabled: leadCaptureOn };

  const onCta = () => {
    track("click_cta");
    if (leadCaptureOn) setLeadOpen(true);
    else if (waLink) window.open(waLink, "_blank");
    else if (phoneLink) window.location.href = phoneLink;
  };

  return (
    <>
      <Helmet>
        <title>{page.seo_title || page.headline || page.product_name}</title>
        <meta name="description" content={page.seo_description || page.subheadline || ""} />
        <meta property="og:title" content={page.seo_title || page.headline || page.product_name} />
        <meta property="og:description" content={page.seo_description || page.subheadline || ""} />
        {page.product_image_url && <meta property="og:image" content={page.product_image_url} />}
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="pb-24">
        <SalesPageTemplate
          page={enrichedPage}
          gallery={gallery}
          youtubeEmbed={youtubeEmbed}
          countdown={countdown}
          waLink={waLink}
          phoneLink={phoneLink}
          emailLink={emailLink}
          formattedPrice={formattedPrice}
          onCta={onCta}
          onTrack={track}
        />
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-zinc-900 text-white border-t border-white/10 shadow-2xl z-50 px-3 py-2.5 safe-area-bottom">
        <div className="container max-w-3xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 truncate">{page.product_name}</p>
            <p className="font-bold text-sm">{formattedPrice}</p>
          </div>
          {leadCaptureOn && (
            <Button onClick={onCta} className="flex-1 bg-amber-400 text-zinc-900 hover:bg-amber-300 font-bold">
              <Sparkles className="h-4 w-4 mr-1.5" />I'm Interested
            </Button>
          )}
          {!leadCaptureOn && waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => track("click_whatsapp")} className="flex-1">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white"><MessageCircle className="h-4 w-4 mr-1.5" />WhatsApp</Button>
            </a>
          )}
          {!leadCaptureOn && !waLink && phoneLink && (
            <a href={phoneLink} onClick={() => track("click_call")} className="flex-1">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"><Phone className="h-4 w-4 mr-1.5" />Call</Button>
            </a>
          )}
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground py-6 pb-24">
        <Link to="/" className="hover:text-primary">Powered by Bethelincovibe TV</Link>
      </footer>

      {leadCaptureOn && (
        <LeadCaptureModal
          salesPageId={page.id}
          ownerUserId={page.user_id}
          productName={page.product_name}
          open={leadOpen}
          onOpenChange={setLeadOpen}
          ctaText={page.cta_text}
        />
      )}
    </>
  );
}
