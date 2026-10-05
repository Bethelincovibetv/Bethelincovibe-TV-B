import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, Printer, Share2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const LEGAL_DOCUMENTS = [
  { name: "Privacy Policy", href: "/privacy-policy", icon: ShieldCheck },
  { name: "Terms of Service", href: "/terms-of-service", icon: FileText },
  { name: "Disclaimer", href: "/disclaimer", icon: HelpCircle },
  { name: "Legal Hub", href: "/legal", icon: CheckCircle2 },
];

export default function LegalPageLayout({ title, subtitle, children }: Props) {
  const location = useLocation();

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      toast.success("Policy link copied to clipboard!");
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background pb-16 font-sans">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-purple-800 via-primary to-indigo-900 text-white px-4 pt-6 pb-8 sm:py-10 shadow-lg">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 bg-white/10 rounded-full blur-3xl" />

        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-white/15 -ml-2 rounded-xl text-xs font-bold gap-1"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/25 text-xs font-bold gap-1.5 shadow-2xs"
                title="Share link to this document"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share Link</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/25 text-xs font-bold gap-1.5 shadow-2xs"
                title="Print this document"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/95 text-xs font-extrabold backdrop-blur border border-white/20 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Bethelincovibe TV Legal &amp; Regulatory Compliance</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm mt-1">
            {title}
          </h1>

          {subtitle && (
            <p className="text-white/90 text-sm sm:text-base font-medium max-w-2xl mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mt-4 pt-3 border-t border-white/20">
            <span className="inline-flex items-center gap-1">
              <strong>Last updated:</strong> {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span>•</span>
            <span>Jurisdiction: Federal Republic of Nigeria (Lagos State)</span>
          </div>
        </div>
      </header>

      {/* Responsive Document Navigation Tab Strip (Ensuring Full Spelling on Desktop and Mobile) */}
      <nav aria-label="Legal documents" className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/80 shadow-2xs">
        <div className="container mx-auto max-w-4xl px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-start sm:justify-center gap-1.5 sm:gap-2">
            {LEGAL_DOCUMENTS.map((doc) => {
              const active = location.pathname === doc.href;
              const Icon = doc.icon;
              return (
                <Link
                  key={doc.href}
                  to={doc.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/30"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary-foreground" : "text-primary"}`} />
                  <span>{doc.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Article Body */}
      <main className="container mx-auto max-w-4xl px-4 mt-6">
        <article className="rounded-2xl border border-border/80 bg-card p-5 sm:p-8 md:p-10 shadow-sm break-words overflow-hidden">
          <div className="prose prose-sm sm:prose-base max-w-none text-foreground prose-headings:font-black prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-lg sm:prose-h2:text-xl prose-h2:border-b prose-h2:border-border/60 prose-h2:pb-2 prose-h2:mt-7 prose-h3:text-base prose-h3:font-bold prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-primary prose-a:font-bold hover:prose-a:underline prose-strong:text-foreground">
            {children}
          </div>
        </article>

        {/* Footer Support & Compliance Card */}
        <section aria-labelledby="compliance-inquiries-heading" className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h2 id="compliance-inquiries-heading" className="text-sm font-extrabold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Questions Regarding Our Policies?
            </h2>
            <p className="text-xs text-muted-foreground">
              Our compliance team in Lagos is available to answer data privacy, terms, or trademark inquiries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild size="sm" className="rounded-xl font-bold text-xs">
              <Link to="/support">Contact Compliance Desk</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl font-bold text-xs bg-card">
              <Link to="/legal">View Legal Hub</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
