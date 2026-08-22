/**
 * Sales page template variants. Each receives the page row and a CTA renderer.
 * Templates are fully responsive and consume product info, gallery, copy, etc.
 */
import { ReactNode, useEffect, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Zap, Shield, Heart, Star, Trophy, Sparkles, Check, Gift, Crown, Rocket,
  Phone, Mail, MessageCircle, Clock, AlertCircle, ChevronRight, Flame, ShieldCheck,
} from "lucide-react";

/* ============== TEMPLATE 0 — CLASSIC (DEFAULT, FULL HIGH-CONVERTING) ============== */
function Classic(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-purple-700 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="container max-w-6xl mx-auto px-4 py-10 sm:py-16 grid md:grid-cols-2 gap-8 items-center relative">
          <div className="space-y-4">
            <span className="inline-block text-[11px] uppercase tracking-wide bg-white/15 backdrop-blur px-3 py-1 rounded-full font-semibold">
              {page.product_name}
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">{page.headline || page.product_name}</h1>
            {page.subheadline && <p className="text-lg sm:text-xl opacity-95">{page.subheadline}</p>}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-3xl sm:text-4xl font-bold">{formattedPrice}</span>
            </div>
            <Button size="lg" onClick={onCta} className="bg-amber-400 text-zinc-900 hover:bg-amber-300 font-bold shadow-xl text-base mt-2">
              <Sparkles className="h-5 w-5 mr-2" />{page.cta_text || "Order Now"}
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
          {gallery[0] && (
            <div className="relative">
              <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full" />
              <img src={gallery[0]} alt={page.product_name}
                className="relative rounded-2xl shadow-2xl w-full h-auto max-h-[500px] object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Problem */}
      {page.problem && (
        <section className="py-12 sm:py-16 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-bold">Sound familiar?</h2>
            <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">{page.problem}</p>
          </div>
        </section>
      )}

      {/* Solution */}
      {page.solution && (
        <section className="py-12 sm:py-16">
          <div className="container max-w-3xl mx-auto px-4 text-center space-y-4">
            <Sparkles className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-bold">Here's the answer</h2>
            <p className="text-lg whitespace-pre-line leading-relaxed">{page.solution}</p>
          </div>
        </section>
      )}

      <MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} />

      {/* Benefits */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent"><Benefits items={page.benefits} /></div>

      {/* Testimonials */}
      <Testimonials items={page.social_proof} />

      {/* Urgency + Countdown */}
      <CountdownStrip countdown={countdown} urgency={page.urgency} accent="from-primary to-purple-700" onCta={onCta} cta={page.cta_text} />

      {/* Final CTA */}
      <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
    </div>
  );
}

const ICONS: Record<string, any> = { Zap, Shield, Heart, Star, Trophy, Sparkles, Check, Gift, Crown, Rocket };

export interface TemplateProps {
  page: any;
  gallery: string[];
  youtubeEmbed: string;
  countdown: { d: number; h: number; m: number; s: number; done: boolean } | null;
  waLink: string | null;
  phoneLink: string | null;
  emailLink: string | null;
  formattedPrice: string;
  onCta: () => void;
  onTrack: (type: string) => void;
}

function Hero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`relative overflow-hidden ${className}`}>{children}</section>;
}

function Benefits({ items }: { items: any[] }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <section className="py-12 sm:py-16">
      <div className="container max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Why you'll love it</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {items.map((b: any, i: number) => {
            const Icon = ICONS[b.icon] || Check;
            return (
              <div key={i} className="bg-card border rounded-xl p-5 flex gap-4 hover:shadow-lg transition-all">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ items }: { items: any[] }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">What customers say</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {items.map((t: any, i: number) => (
            <div key={i} className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex gap-1 mb-3">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
              <p className="text-sm mb-4 italic">"{t.quote}"</p>
              <p className="font-semibold text-sm">{t.name}</p>
              {t.location && <p className="text-xs text-muted-foreground">{t.location}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaStrip({ youtubeEmbed, gallery, name }: { youtubeEmbed: string; gallery: string[]; name: string }) {
  if (!youtubeEmbed && gallery.length <= 1) return null;
  return (
    <section className="py-10 border-b bg-muted/10">
      <div className="container max-w-6xl mx-auto px-4 space-y-6">
        {youtubeEmbed && (
          <div className="rounded-xl overflow-hidden border bg-card shadow-sm">
            <AspectRatio ratio={16 / 9}>
              <iframe src={youtubeEmbed} title={`${name} video`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            </AspectRatio>
          </div>
        )}
        {gallery.length > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.slice(1).map((image, i) => (
              <div key={i} className="rounded-xl overflow-hidden border bg-card shadow-sm">
                <AspectRatio ratio={4 / 3}>
                  <img src={image} alt={`${name} gallery ${i + 2}`} className="w-full h-full object-cover" loading="lazy" />
                </AspectRatio>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CountdownStrip({ countdown, urgency, accent = "from-primary to-purple-700", onCta, cta }: any) {
  if (!countdown && !urgency) return null;
  return (
    <section className={`py-12 bg-gradient-to-r ${accent} text-white`}>
      <div className="container max-w-3xl mx-auto px-4 text-center space-y-5">
        <Clock className="h-10 w-10 mx-auto" />
        {urgency && <p className="text-lg sm:text-xl font-semibold">{urgency}</p>}
        {countdown && !countdown.done && (
          <div className="flex justify-center gap-3 sm:gap-5">
            {[["Days", countdown.d], ["Hours", countdown.h], ["Mins", countdown.m], ["Secs", countdown.s]].map(([l, v]) => (
              <div key={l as string} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[64px]">
                <div className="text-2xl sm:text-3xl font-extrabold">{String(v).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase opacity-80">{l}</div>
              </div>
            ))}
          </div>
        )}
        {cta && <Button size="lg" onClick={onCta} className="bg-amber-400 text-zinc-900 hover:bg-amber-300 font-bold mt-3">{cta}<ChevronRight className="h-5 w-5 ml-1" /></Button>}
      </div>
    </section>
  );
}

function ContactBlock({ waLink, phoneLink, emailLink, onTrack, onCta, ctaText, leadCapture }: any) {
  return (
    <section className="py-12">
      <div className="container max-w-3xl mx-auto px-4 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to get yours?</h2>
        <p className="text-muted-foreground">Choose the option that works best for you.</p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          {leadCapture && (
            <Button size="lg" onClick={onCta} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              <Sparkles className="h-5 w-5 mr-2" />{ctaText || "I Am Interested"}
            </Button>
          )}
          {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => onTrack("click_whatsapp")}>
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white"><MessageCircle className="h-5 w-5 mr-2" />WhatsApp</Button>
          </a>}
          {phoneLink && <a href={phoneLink} onClick={() => onTrack("click_call")}>
            <Button size="lg" variant="secondary"><Phone className="h-5 w-5 mr-2" />Call Now</Button>
          </a>}
          {emailLink && <a href={emailLink} onClick={() => onTrack("click_email")}>
            <Button size="lg" variant="outline"><Mail className="h-5 w-5 mr-2" />Email</Button>
          </a>}
        </div>
      </div>
    </section>
  );
}

/* ============== TEMPLATE 1 — LAGOS BOLD ============== */
function LagosBold(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Hero className="bg-gradient-to-br from-zinc-900 via-purple-950 to-zinc-950">
        <div className="container max-w-6xl mx-auto px-4 py-12 sm:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <span className="inline-block text-[11px] uppercase tracking-widest bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full font-bold">Lagos Hot 🔥</span>
            <h1 className="text-4xl sm:text-6xl font-black leading-tight">{page.headline || page.product_name}</h1>
            {page.subheadline && <p className="text-lg sm:text-xl text-zinc-300">{page.subheadline}</p>}
            <div className="text-4xl font-black text-pink-400">{formattedPrice}</div>
            <Button size="lg" onClick={onCta} className="bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-lg shadow-2xl shadow-pink-500/40">
              {page.cta_text || "Order Now"}<ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
          {gallery[0] && <img src={gallery[0]} alt={page.product_name} className="rounded-2xl shadow-2xl w-full max-h-[500px] object-cover" />}
        </div>
      </Hero>
      <div className="bg-zinc-950"><MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} /></div>
      <div className="bg-zinc-900"><Benefits items={page.benefits} /></div>
      <Testimonials items={page.social_proof} />
      <CountdownStrip countdown={countdown} urgency={page.urgency} accent="from-pink-500 to-orange-500" onCta={onCta} cta={page.cta_text} />
      <div className="bg-zinc-950 text-white">
        <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
      </div>
    </div>
  );
}

/* ============== TEMPLATE 2 — CLEAN PRO ============== */
function CleanPro(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Hero className="bg-gradient-to-b from-slate-50 to-white">
        <div className="container max-w-6xl mx-auto px-4 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs uppercase tracking-wider text-blue-600 font-semibold">{page.product_name}</span>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-slate-900">{page.headline || page.product_name}</h1>
            {page.subheadline && <p className="text-lg text-slate-600">{page.subheadline}</p>}
            <div className="text-3xl font-bold text-slate-900">{formattedPrice}</div>
            <Button size="lg" onClick={onCta} className="bg-blue-600 hover:bg-blue-700 text-white">{page.cta_text || "Get Started"}<ChevronRight className="h-5 w-5 ml-1" /></Button>
          </div>
          {gallery[0] && <img src={gallery[0]} alt={page.product_name} className="rounded-xl shadow-xl w-full max-h-[500px] object-cover" />}
        </div>
      </Hero>
      <MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} />
      <Benefits items={page.benefits} />
      <Testimonials items={page.social_proof} />
      <CountdownStrip countdown={countdown} urgency={page.urgency} accent="from-blue-600 to-indigo-700" onCta={onCta} cta={page.cta_text} />
      <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
    </div>
  );
}

/* ============== TEMPLATE 3 — FIRE SALE ============== */
function FireSale(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-red-50 to-white">
      <div className="bg-red-600 text-white text-center text-sm py-2 font-bold animate-pulse">🔥 LIMITED TIME OFFER — DON'T MISS OUT 🔥</div>
      <Hero className="bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 text-white">
        <div className="container max-w-6xl mx-auto px-4 py-12 sm:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <Flame className="h-10 w-10" />
            <h1 className="text-4xl sm:text-6xl font-black leading-tight drop-shadow-md">{page.headline || page.product_name}</h1>
            {page.subheadline && <p className="text-xl">{page.subheadline}</p>}
            <div className="text-4xl font-black bg-white text-red-600 inline-block px-4 py-1 rounded">{formattedPrice}</div>
            <Button size="lg" onClick={onCta} className="bg-yellow-400 text-red-700 hover:bg-yellow-300 font-black text-lg shadow-2xl">{page.cta_text || "Claim Yours NOW"}<ChevronRight className="h-5 w-5 ml-1" /></Button>
          </div>
          {gallery[0] && <img src={gallery[0]} alt={page.product_name} className="rounded-2xl shadow-2xl w-full max-h-[500px] object-cover ring-4 ring-white" />}
        </div>
      </Hero>
      <CountdownStrip countdown={countdown} urgency={page.urgency || "Stock is running out fast — order before midnight!"} accent="from-red-600 to-orange-500" onCta={onCta} cta={page.cta_text} />
      <MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} />
      <Benefits items={page.benefits} />
      <Testimonials items={page.social_proof} />
      <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
    </div>
  );
}

/* ============== TEMPLATE 4 — PREMIUM GOLD ============== */
function PremiumGold(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-[#0a1128] text-amber-50">
      <Hero className="bg-gradient-to-br from-[#0a1128] via-[#1c2541] to-[#0a1128]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.3),transparent_60%)]" />
        <div className="container max-w-6xl mx-auto px-4 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center relative">
          <div className="space-y-5">
            <Crown className="h-10 w-10 text-amber-400" />
            <h1 className="text-4xl sm:text-5xl font-serif leading-tight">{page.headline || page.product_name}</h1>
            {page.subheadline && <p className="text-lg text-amber-100/80 italic">{page.subheadline}</p>}
            <div className="text-3xl font-bold text-amber-400 border-y border-amber-400/40 py-3 inline-block px-4">{formattedPrice}</div>
            <div><Button size="lg" onClick={onCta} className="bg-amber-400 text-[#0a1128] hover:bg-amber-300 font-bold tracking-wide">{page.cta_text || "Reserve Yours"}<ChevronRight className="h-5 w-5 ml-1" /></Button></div>
          </div>
          {gallery[0] && <img src={gallery[0]} alt={page.product_name} className="rounded-xl shadow-2xl w-full max-h-[500px] object-cover ring-1 ring-amber-400/30" />}
        </div>
      </Hero>
      <div className="bg-[#0a1128] text-amber-50"><MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} /></div>
      <div className="bg-[#0e1738]"><Benefits items={page.benefits} /></div>
      <div className="bg-[#0a1128]"><Testimonials items={page.social_proof} /></div>
      <CountdownStrip countdown={countdown} urgency={page.urgency} accent="from-amber-500 to-yellow-600" onCta={onCta} cta={page.cta_text} />
      <div className="bg-[#0a1128]">
        <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
      </div>
    </div>
  );
}

/* ============== TEMPLATE 5 — TRUST BUILDER ============== */
function TrustBuilder(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Hero className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="container max-w-6xl mx-auto px-4 py-12 sm:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="flex gap-2 flex-wrap">
              {["Verified Seller","30-Day Guarantee","Lagos Delivery"].map(b => (
                <span key={b} className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{b}</span>
              ))}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{page.headline || page.product_name}</h1>
            {page.subheadline && <p className="text-lg text-slate-600">{page.subheadline}</p>}
            <div className="text-3xl font-bold">{formattedPrice}</div>
            <Button size="lg" onClick={onCta} className="bg-emerald-600 hover:bg-emerald-700 text-white">{page.cta_text || "Get It Today"}<ChevronRight className="h-5 w-5 ml-1" /></Button>
          </div>
          {gallery[0] && <img src={gallery[0]} alt={page.product_name} className="rounded-xl shadow-xl w-full max-h-[500px] object-cover" />}
        </div>
      </Hero>
      <MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} />
      <Testimonials items={page.social_proof} />
      <Benefits items={page.benefits} />
      <CountdownStrip countdown={countdown} urgency={page.urgency} accent="from-emerald-600 to-teal-700" onCta={onCta} cta={page.cta_text} />
      <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
    </div>
  );
}

/* ============== TEMPLATE 6 — STORY SELLER ============== */
function StorySeller(p: TemplateProps) {
  const { page, gallery, formattedPrice, waLink, phoneLink, emailLink, onCta, onTrack, youtubeEmbed, countdown } = p;
  return (
    <div className="min-h-screen bg-violet-50/30 text-slate-900">
      <Hero className="bg-gradient-to-b from-violet-100/60 to-transparent">
        <div className="container max-w-3xl mx-auto px-4 py-12 sm:py-20 text-center space-y-5">
          <span className="text-xs uppercase tracking-widest text-violet-700 font-bold">A Story Worth Telling</span>
          <h1 className="text-4xl sm:text-5xl font-serif leading-tight">{page.headline || page.product_name}</h1>
          {page.subheadline && <p className="text-lg sm:text-xl text-slate-600 italic">{page.subheadline}</p>}
        </div>
      </Hero>
      {gallery[0] && (
        <div className="container max-w-4xl mx-auto px-4 -mt-4">
          <img src={gallery[0]} alt={page.product_name} className="rounded-2xl shadow-xl w-full max-h-[500px] object-cover" />
        </div>
      )}
      {page.problem && (
        <section className="py-14">
          <div className="container max-w-2xl mx-auto px-4 space-y-3">
            <AlertCircle className="h-8 w-8 text-violet-700" />
            <h2 className="text-2xl font-bold">The struggle</h2>
            <p className="text-lg whitespace-pre-line leading-relaxed text-slate-700">{page.problem}</p>
          </div>
        </section>
      )}
      {page.solution && (
        <section className="py-14 bg-white">
          <div className="container max-w-2xl mx-auto px-4 space-y-3">
            <Sparkles className="h-8 w-8 text-violet-700" />
            <h2 className="text-2xl font-bold">What changed everything</h2>
            <p className="text-lg whitespace-pre-line leading-relaxed text-slate-700">{page.solution}</p>
          </div>
        </section>
      )}
      <MediaStrip youtubeEmbed={youtubeEmbed} gallery={gallery} name={page.product_name} />
      <Benefits items={page.benefits} />
      <Testimonials items={page.social_proof} />
      <CountdownStrip countdown={countdown} urgency={page.urgency} accent="from-violet-700 to-fuchsia-700" onCta={onCta} cta={page.cta_text} />
      <section className="py-12 text-center">
        <div className="container max-w-xl mx-auto px-4">
          <p className="text-lg mb-3">Your story can change today.</p>
          <div className="text-3xl font-bold mb-4">{formattedPrice}</div>
          <Button size="lg" onClick={onCta} className="bg-violet-700 hover:bg-violet-800 text-white">{page.cta_text || "Start Now"}<ChevronRight className="h-5 w-5 ml-1" /></Button>
        </div>
      </section>
      <ContactBlock waLink={waLink} phoneLink={phoneLink} emailLink={emailLink} onTrack={onTrack} onCta={onCta} ctaText={page.cta_text} leadCapture={page.lead_capture_enabled} />
    </div>
  );
}

const REGISTRY: Record<string, (p: TemplateProps) => JSX.Element> = {
  classic: Classic,
  lagos_bold: LagosBold,
  clean_pro: CleanPro,
  fire_sale: FireSale,
  premium_gold: PremiumGold,
  trust_builder: TrustBuilder,
  story_seller: StorySeller,
};

export const TEMPLATE_LIST = [
  { key: "classic", name: "Classic (Recommended)", description: "Full-length high-converting layout: Problem → Solution → Benefits → Proof → Urgency.", preview: "from-primary via-primary to-purple-700" },
  { key: "lagos_bold", name: "Lagos Bold", description: "Dark, bold, high-energy — fashion, food, lifestyle.", preview: "from-zinc-900 via-purple-950 to-pink-500" },
  { key: "clean_pro", name: "Clean Pro", description: "Minimal & professional — services, digital products.", preview: "from-slate-100 via-white to-blue-200" },
  { key: "fire_sale", name: "Fire Sale", description: "Urgent red/orange with countdown — limited offers.", preview: "from-red-600 via-orange-500 to-yellow-400" },
  { key: "premium_gold", name: "Premium Gold", description: "Navy + gold luxury — high-ticket products.", preview: "from-[#0a1128] via-[#1c2541] to-amber-400" },
  { key: "trust_builder", name: "Trust Builder", description: "Trust badges & testimonials — new businesses.", preview: "from-emerald-50 via-white to-emerald-500" },
  { key: "story_seller", name: "Story Seller", description: "Problem→solution narrative — coaching, courses.", preview: "from-violet-100 via-white to-violet-700" },
];

export default function SalesPageTemplate(props: TemplateProps) {
  const Variant = REGISTRY[props.page?.template_key] || Classic;
  return <Variant {...props} />;
}
