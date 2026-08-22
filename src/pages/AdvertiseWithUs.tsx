import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, TrendingUp, Users, Globe, Search, Sparkles, ArrowRight, CheckCircle2, Image as ImageIcon, MousePointerClick, BarChart3, Zap } from "lucide-react";

export default function AdvertiseWithUs() {
  const { user } = useAuth();
  const ctaTo = user ? "/dashboard/submit-blog" : "/register";

  const benefits = [
    { icon: Search, title: "SEO-Optimized Content", desc: "Your business gets a Google-friendly blog post that ranks for your category & keywords." },
    { icon: Users, title: "Targeted Lagos Audience", desc: "Reach thousands of business owners and customers actively looking for solutions." },
    { icon: Sparkles, title: "AI-Crafted Story", desc: "Our AI writes a warm, persuasive blog featuring your business photos, story & contact info." },
    { icon: Globe, title: "Permanent Visibility", desc: "Your post lives on our site forever — every share, every search, every backlink works for you." },
    { icon: TrendingUp, title: "Backlinks & Authority", desc: "Internal links from related blogs and business directory pages boost your business profile." },
    { icon: Megaphone, title: "Push Notifications", desc: "Subscribers get notified when your post goes live — instant traffic to your business." },
  ];

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Advertise With Us | Bethelincovibe TV</title>
        <meta name="description" content="Get your business featured on Bethelincovibe TV. AI-powered SEO blog posts, targeted Lagos audience, lasting visibility." />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12 sm:py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">Get Your Business Seen</h1>
          <p className="text-base sm:text-lg opacity-90 max-w-2xl mx-auto">
            Real results, not guesswork. We blog your business with SEO authority, push it to subscribers, and keep working for you 24/7.
          </p>
          <Button asChild size="lg" className="mt-6 bg-background text-foreground hover:bg-background/90">
            <Link to={ctaTo}>Get Started <ArrowRight className="h-5 w-5 ml-1" /></Link>
          </Button>
        </div>
      </section>

      {/* How we deliver results */}
      <section className="container mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">How We Deliver Real Results</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">No vague promises. Here's exactly what your business gets:</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b, i) => (
            <Card key={i} className="hover:shadow-md transition">
              <CardContent className="p-5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-muted/30 py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">The 4-Step Process</h2>
          <div className="space-y-4">
            {[
              "Register & top up your wallet",
              "Submit your business: name, description, photos, contact",
              "Admin reviews & our AI writes a stellar SEO blog post",
              "Your post goes live with push notifications to subscribers",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-background rounded-xl border">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                <p className="pt-1">{step}</p>
                <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild size="lg">
              <Link to={ctaTo}>{user ? "Submit Your Business" : "Register to Get Started"} <ArrowRight className="h-5 w-5 ml-1" /></Link>
            </Button>
            {!user && <p className="text-xs text-muted-foreground mt-3">Already have an account? <Link to="/login" className="underline">Login</Link></p>}
          </div>
        </div>
      </section>

      {/* Banner Ads Section */}
      <section className="py-14 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
              <Zap className="h-3.5 w-3.5" /> NEW · SELF-SERVE BANNER ADS
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold">Run Your Own Banner Ads Across Our Network</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Beyond blog features — launch clickable image banners that appear on high-traffic blog posts, the homepage, and business pages. You control the design, the destination link, and the budget. Ads go live in minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: ImageIcon, title: "Upload Your Banner", desc: "PNG or JPG — we support header, sidebar, in-content, and footer placements." },
              { icon: MousePointerClick, title: "Pay-Per-Click Pricing", desc: "Only pay when a real visitor clicks. No wasted impressions, no monthly contracts." },
              { icon: BarChart3, title: "Live Analytics", desc: "See impressions, CTR, and clicks in real time from your dashboard." },
              { icon: Zap, title: "Instant Activation", desc: "Toggle your ad on or off any time. Pause, edit, or relaunch with one click." },
            ].map((b, i) => (
              <Card key={i} className="hover:shadow-md transition">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <h3 className="text-xl font-bold">Why banner ads convert on Bethelincovibe TV</h3>
              <ul className="space-y-2 text-sm">
                {[
                  "Lagos-focused audience already searching for products, services, and suppliers",
                  "Placement inside trusted blog content — not lost in a sidebar",
                  "Mobile-first design so your banner looks sharp on every device",
                  "Every click is logged, geo-tagged, and reported back to you",
                  "Wallet-based billing — top up once, run multiple campaigns",
                ].map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="border-2 border-primary/30 shadow-lg">
              <CardContent className="p-6 text-center">
                <MousePointerClick className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="text-lg font-bold mb-2">Launch Your First Banner Today</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Takes under 3 minutes. Upload, set your target URL, and go live.
                </p>
                <Button asChild size="lg" className="w-full">
                  <Link to={user ? "/dashboard/ads" : "/register?next=/dashboard/ads"}>
                    {user ? "Create Banner Ad" : "Sign Up & Create Banner"} <ArrowRight className="h-5 w-5 ml-1" />
                  </Link>
                </Button>
                {user && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Already running ads? <Link to="/dashboard/ads" className="underline text-primary">Manage campaigns</Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
