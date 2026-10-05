import { Link } from "react-router-dom";
import {
  ShieldCheck,
  FileText,
  HelpCircle,
  Lock,
  Scale,
  Building,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Mail,
  MapPin,
  AlertTriangle,
  BadgeCheck,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";

const POLICIES = [
  {
    title: "Privacy Policy",
    slug: "/privacy-policy",
    icon: ShieldCheck,
    tag: "Data Protection & Privacy",
    summary:
      "Details how Bethelincovibe TV collects, stores, protects, and handles your personal and business data. Explains our strict zero-spam commitment, Google OAuth transparency, and cookie policies.",
    keyPoints: [
      "No selling or renting of personal or business contact data",
      "Client-side revocable Google OAuth integration for contacts",
      "Encrypted data storage and strict access controls",
      "Right to access, modify, or delete your account records",
    ],
  },
  {
    title: "Terms of Service",
    slug: "/terms-of-service",
    icon: FileText,
    tag: "Platform Agreement",
    summary:
      "The comprehensive legal agreement between users and Bethelincovibe TV governing the use of the marketplace, verified business directory, AI business coaching tools, and community forums.",
    keyPoints: [
      "Fair and ethical commerce obligations for all sellers",
      "Prohibition of fraudulent, counterfeit, or restricted items",
      "Direct buyer-seller transaction independence (No escrow service operated)",
      "Account security, password protection, and listing verification",
    ],
  },
  {
    title: "Disclaimer & Risk Disclosure",
    slug: "/disclaimer",
    icon: HelpCircle,
    tag: "Commercial Disclosures",
    summary:
      "Important legal disclosures regarding the educational nature of our business guides, calculators, mini-importation playbooks, and the AI Business Coach utilities.",
    keyPoints: [
      "AI Coach outputs are educational ideation tools, not licensed legal or tax counsel",
      "Independent verification required for CAC, NAFDAC, and port clearing charges",
      "Fluctuating exchange rates (FX) and shipping tariffs notice",
      "Transparent affiliate links and advertising network disclosures",
    ],
  },
];

const COMPLIANCE_PILLARS = [
  {
    title: "Marketplace Safety & Anti-Fraud Rules",
    icon: ShoppingBag,
    description:
      "Guidelines for conducting safe trade in Nigeria: inspect goods in public commercial locations, agree on delivery before releasing payment, and verify sellers with the verified merchant badge.",
  },
  {
    title: "Intellectual Property & Copyright (DMCA)",
    icon: Scale,
    description:
      "We respect proprietary rights. Users own their trademarks and photos. To submit a trademark or copyright takedown notice, contact our compliance desk with supporting proof.",
  },
  {
    title: "Nigerian Jurisdiction & Legal Standing",
    icon: Building,
    description:
      "Bethelincovibe TV operates in accordance with the laws of the Federal Republic of Nigeria, subject to the jurisdiction of the courts of Lagos State.",
  },
];

export default function LegalHub() {
  return (
    <>
      <SEO
        title={`Legal Hub & Regulatory Compliance | ${SITE_NAME}`}
        description="Comprehensive legal center for Bethelincovibe TV. Access our Privacy Policy, Terms of Service, Disclaimer, and Marketplace Safety Guidelines."
        url="/legal"
        type="website"
        image={PAGE_OG_IMAGES.home()}
      />

      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-16 font-sans">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-800 via-primary to-indigo-900 text-white px-4 py-10 sm:py-14 shadow-lg">
          <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 bg-white/10 rounded-full blur-3xl" />

          <div className="container mx-auto max-w-4xl relative z-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-extrabold backdrop-blur border border-white/20 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>Trust, Safety &amp; Governance Center</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
              Legal &amp; Regulatory Hub
            </h1>

            <p className="text-white/90 text-sm sm:text-base font-medium max-w-2xl mt-3 leading-relaxed">
              We are committed to operating a transparent, secure, and legally compliant ecosystem for Nigerian founders, merchants, and shoppers.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-white/80 mt-6 pt-4 border-t border-white/20">
              <span className="flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Transparent Governance
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Full Consumer Transparency
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Nigeria Data Compliance
              </span>
            </div>
          </div>
        </section>

        {/* Primary Policies Grid (Properly arranged for desktop and mobile) */}
        <main className="container mx-auto max-w-4xl px-4 -mt-4 relative z-20 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {POLICIES.map((doc) => {
              const Icon = doc.icon;
              return (
                <div
                  key={doc.slug}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {doc.tag}
                      </Badge>
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-foreground">{doc.title}</h2>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                        {doc.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[11px] font-bold text-foreground mb-1.5">Key Highlights:</p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground">
                        {doc.keyPoints.map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-snug">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/60">
                    <Button asChild className="w-full rounded-xl font-bold text-xs gap-1.5 shadow-xs">
                      <Link to={doc.slug}>
                        <span>Read Full {doc.title}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compliance Pillars Section */}
          <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-5">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Standards &amp; Safety Commitments
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                How we enforce accountability across directory listings and peer-to-peer commerce.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {COMPLIANCE_PILLARS.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div key={idx} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{p.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Official Registry & Contact Box */}
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> Official Entity Information
              </span>
              <h3 className="text-lg font-black text-foreground">
                Bethelincovibe TV Ecosystem
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Operating from Lagos, Nigeria. For regulatory inquiries, CAC verification, data privacy subject requests, or trademark disputes, please contact our administrative desk directly.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Lagos, Nigeria
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> bethelincovibetv@gmail.com
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full sm:w-auto">
              <Button asChild className="rounded-xl font-bold text-xs">
                <Link to="/support">Contact Compliance Desk</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl font-bold text-xs bg-card">
                <Link to="/about">About Ecosystem</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
