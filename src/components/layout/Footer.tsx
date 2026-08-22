import { Link } from "react-router-dom";
import EmailSubscribeForm from "@/components/EmailSubscribeForm";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import BrandSocialLinks from "@/components/BrandSocialLinks";

/** Minimal footer used on every internal page. */
export function MinimalFooter() {
  return (
    <footer className="border-t bg-muted/20 mt-auto">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Bethelincovibe TV. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-primary">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  const [waUrl, setWaUrl] = useState("");
  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key","whatsapp_community_url").maybeSingle()
      .then(({data}) => { if (data?.value) setWaUrl(data.value); });
  }, []);
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-12">
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener" className="mb-8 mx-auto max-w-2xl flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 shadow-md transition">
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold">Join our WhatsApp community for Lagos entrepreneurs</span>
          </a>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Bethelincovibe TV" className="h-8 w-8 rounded" />
              <span className="font-bold text-primary">Bethelincovibe TV</span>
            </div>
            <p className="text-sm text-muted-foreground">Business information for Lagos entrepreneurs. Startup guides, business directory, and marketing tips.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">Blog</Link>
              <Link to="/products" className="text-sm text-muted-foreground hover:text-primary">Marketplace (Products)</Link>
              <Link to="/businesses" className="text-sm text-muted-foreground hover:text-primary">Service Directory</Link>
              <Link to="/businesses/list" className="text-sm text-muted-foreground hover:text-primary">List Your Business</Link>
              <Link to="/products/list" className="text-sm text-muted-foreground hover:text-primary">Sell a Product</Link>
              <Link to="/learn" className="text-sm text-muted-foreground hover:text-primary">Learning Hub</Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">About</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm">Categories</h3>
            <div className="flex flex-col gap-2">
              <Link to="/blog/category/startup-guides" className="text-sm text-muted-foreground hover:text-primary">Startup Guides</Link>
              <Link to="/blog/category/marketing-sales" className="text-sm text-muted-foreground hover:text-primary">Marketing &amp; Sales</Link>
              <Link to="/blog/category/funding-loans" className="text-sm text-muted-foreground hover:text-primary">Funding &amp; Loans</Link>
              <Link to="/blog/category/food-retail" className="text-sm text-muted-foreground hover:text-primary">Food &amp; Retail</Link>
              <Link to="/blog/category/featured-businesses" className="text-sm text-muted-foreground hover:text-primary">Featured Businesses</Link>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm">Legal</h3>
            <div className="flex flex-col gap-2">
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
              <Link to="/disclaimer" className="text-sm text-muted-foreground hover:text-primary">Disclaimer</Link>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm">Contact</h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>Lagos, Nigeria</p>
              <p>bethelgoobdgift3@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="mt-8 max-w-md mx-auto">
          <EmailSubscribeForm />
        </div>
        <BrandSocialLinks className="mt-6" />
        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Bethelincovibe TV. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
