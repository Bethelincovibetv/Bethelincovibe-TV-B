import { Link } from "react-router-dom";
import EmailSubscribeForm from "@/components/EmailSubscribeForm";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Sparkles, Compass, FolderTree, ShieldCheck, Mail, MapPin,
  FileText, ShoppingBag, Building2, PlusCircle, GraduationCap, Info, PhoneCall,
  Rocket, HeartHandshake, ChevronRight, Send
} from "lucide-react";
import BrandSocialLinks from "@/components/BrandSocialLinks";

/** Minimal footer used on internal utility pages. */
export function MinimalFooter() {
  return (
    <footer className="border-t border-border/80 bg-gradient-to-b from-muted/30 via-background to-muted/20 mt-auto">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-purple-600 to-accent text-white shadow-[0_4px_12px_-2px_rgba(147,51,234,0.4),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30">
            <img src="/logo.png" alt="Bethelincovibe TV" className="h-5 w-5 rounded object-contain" />
          </div>
          <p className="font-medium">© {new Date().getFullYear()} <span className="font-extrabold text-foreground">Bethelincovibe TV</span>. All rights reserved.</p>
        </div>
        <div className="flex items-center gap-5 font-semibold">
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span className="text-border">•</span>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
          <span className="text-border">•</span>
          <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  const [waUrl, setWaUrl] = useState("");
  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "whatsapp_community_url").maybeSingle()
      .then(({ data }) => { if (data?.value) setWaUrl(data.value); });
  }, []);

  return (
    <footer className="relative border-t border-border/80 bg-gradient-to-b from-card via-muted/30 to-muted/60 mt-auto overflow-hidden">
      {/* Subtle glowing ambient backdrop */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-full max-w-4xl bg-primary/5 blur-3xl rounded-full" />

      <div className="container relative z-10 mx-auto px-4 py-14 lg:py-16">
        {/* WhatsApp Community 3D Banner */}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mb-12 mx-auto max-w-2xl flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white p-4 sm:p-5 shadow-[0_12px_32px_-8px_rgba(5,150,105,0.45),inset_0_2px_0_rgba(255,255,255,0.35)] ring-1 ring-white/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-[0_6px_16px_rgba(0,0,0,0.25),inset_0_1.5px_0_rgba(255,255,255,0.6)] ring-1 ring-white/40 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-md" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-100">VIP Entrepreneur Group</p>
                <p className="font-extrabold text-sm sm:text-lg leading-snug drop-shadow-xs truncate sm:whitespace-normal">Join our WhatsApp community for Lagos business owners</p>
              </div>
            </div>
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-white group-hover:translate-x-1 transition-transform">
              <ChevronRight className="h-5 w-5" />
            </div>
          </a>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-accent text-white shadow-[0_8px_20px_-4px_rgba(147,51,234,0.45),inset_0_2px_0_rgba(255,255,255,0.45)] ring-2 ring-primary/30 group-hover:scale-105 transition-transform duration-300">
                <img src="/logo.png" alt="Bethelincovibe TV" className="h-8 w-8 rounded-lg object-contain drop-shadow-sm" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                  Bethelincovibe TV
                </span>
                <p className="text-xs font-semibold text-primary">Lagos Business Intelligence &amp; Media</p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Empowering Nigerian entrepreneurs and MSMEs with actionable startup playbooks, verified business directories, and multi-channel marketing solutions.
            </p>

            <div className="pt-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/90 mb-3 flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-primary" /> Follow Our Community
              </p>
              <BrandSocialLinks className="!justify-start" />
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                <Compass className="h-3.5 w-3.5" />
              </div>
              Explore Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium">
                  <FileText className="h-3.5 w-3.5 text-primary/70" /> Blog &amp; Insights
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium">
                  <ShoppingBag className="h-3.5 w-3.5 text-primary/70" /> Marketplace (Products)
                </Link>
              </li>
              <li>
                <Link to="/businesses" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-primary/70" /> Service Directory
                </Link>
              </li>
              <li>
                <Link to="/businesses/list" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium">
                  <PlusCircle className="h-3.5 w-3.5 text-primary/70" /> List Your Business
                </Link>
              </li>
              <li>
                <Link to="/products/list" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium">
                  <Rocket className="h-3.5 w-3.5 text-primary/70" /> Sell a Product
                </Link>
              </li>
              <li>
                <Link to="/learn" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-primary/70" /> Learning Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories Column */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent shadow-xs">
                <FolderTree className="h-3.5 w-3.5" />
              </div>
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/blog/category/startup-guides" className="text-muted-foreground hover:text-primary transition-colors font-medium block truncate">
                  Startup Guides
                </Link>
              </li>
              <li>
                <Link to="/blog/category/marketing-sales" className="text-muted-foreground hover:text-primary transition-colors font-medium block truncate">
                  Marketing &amp; Sales
                </Link>
              </li>
              <li>
                <Link to="/blog/category/funding-loans" className="text-muted-foreground hover:text-primary transition-colors font-medium block truncate">
                  Funding &amp; Loans
                </Link>
              </li>
              <li>
                <Link to="/blog/category/food-retail" className="text-muted-foreground hover:text-primary transition-colors font-medium block truncate">
                  Food &amp; Retail
                </Link>
              </li>
              <li>
                <Link to="/blog/category/featured-businesses" className="text-muted-foreground hover:text-primary transition-colors font-medium block truncate">
                  Featured Businesses
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter & Contact Column */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-xs">
                <Mail className="h-3.5 w-3.5" />
              </div>
              Weekly Intelligence
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get hand-curated Lagos business tips, supplier contacts, and grant alerts delivered to your inbox.
            </p>
            <EmailSubscribeForm />

            <div className="pt-2 text-xs text-muted-foreground space-y-1.5 border-t border-border/60">
              <p className="flex items-center gap-2 font-medium">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Lagos, Nigeria
              </p>
              <p className="flex items-center gap-2 font-medium">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" /> bethelgoobdgift3@gmail.com
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="border-t border-border/80 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} <span className="font-bold text-foreground">Bethelincovibe TV</span>. Built for Nigeria's thriving entrepreneurs.</p>
          <div className="flex items-center gap-5 font-semibold">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
