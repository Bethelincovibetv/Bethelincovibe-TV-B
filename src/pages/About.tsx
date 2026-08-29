import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES } from "@/lib/seo";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target, Eye, Sparkles, Building2, ShoppingBag, Briefcase,
  BookOpen, Bot, Users, Megaphone, Wrench, ArrowRight,
  CheckCircle2, ShieldCheck, Compass, MessageCircle, Rocket,
  TrendingUp, Layers, Award, Zap, Store, ChevronRight, HelpCircle
} from "lucide-react";
import TVFrame from "@/components/TVFrame";
import PageHero from "@/components/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

export default function About() {
  const { flags } = useFeatureFlags();

  const journeySteps = [
    {
      step: "01",
      name: "Discover",
      desc: "Find verified suppliers, innovative products, services, and proven business opportunities across Nigeria.",
      icon: Compass,
      color: "from-blue-500/20 to-indigo-500/20",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      step: "02",
      name: "Learn",
      desc: "Access actionable startup guides, marketing playbooks, and localized business intelligence.",
      icon: BookOpen,
      color: "from-purple-500/20 to-pink-500/20",
      textColor: "text-purple-600 dark:text-purple-400",
    },
    {
      step: "03",
      name: "Promote",
      desc: "Amplify your brand through high-converting sales pages, WhatsApp marketing, and verified listings.",
      icon: Megaphone,
      color: "from-amber-500/20 to-orange-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      step: "04",
      name: "Connect",
      desc: "Network with founders, build strategic partnerships, and collaborate within our entrepreneur community.",
      icon: Users,
      color: "from-emerald-500/20 to-teal-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      step: "05",
      name: "Sell",
      desc: "List and sell physical merchandise, wholesale inventories, and digital assets directly to qualified buyers.",
      icon: ShoppingBag,
      color: "from-rose-500/20 to-red-500/20",
      textColor: "text-rose-600 dark:text-rose-400",
    },
    {
      step: "06",
      name: "Grow",
      desc: "Leverage AI business tools, analytics, and operational systems to scale your enterprise sustainably.",
      icon: Rocket,
      color: "from-indigo-500/20 to-purple-500/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  const corePillars = [
    {
      icon: Building2,
      title: "Business Visibility & Directory",
      desc: "Get discovered by thousands of buyers and clients through verified business profiles, location tagging, and category discovery.",
      link: "/businesses",
      linkText: "Explore Directory",
      enabled: flags.businesses,
    },
    {
      icon: ShoppingBag,
      title: "Products & Marketplace",
      desc: "Showcase and sell physical goods, wholesale batches, and digital products directly to customers with secure orders and inquiries.",
      link: "/products",
      linkText: "Explore Marketplace",
      enabled: flags.products,
    },
    {
      icon: Briefcase,
      title: "Services & Trade Solutions",
      desc: "Connect with vetted service providers, artisans, logistics partners, and commercial contractors ready to deliver.",
      link: "/businesses",
      linkText: "Find Services",
      enabled: flags.businesses,
    },
    {
      icon: BookOpen,
      title: "Business Knowledge & Guides",
      desc: "Master China-to-Nigeria import, customer acquisition, funding strategies, and regulatory compliance through practical playbooks.",
      link: "/blog/category/startup-guides",
      linkText: "Read Startup Guides",
      enabled: flags.blog,
    },
    {
      icon: Bot,
      title: "AI Business Support & Tools",
      desc: "Accelerate your daily workflow with AI business coaching, startup cost estimation, and intelligent content creation utilities.",
      link: "/dashboard/coach",
      linkText: "Try AI Coach",
      enabled: flags.coach,
    },
    {
      icon: Users,
      title: "Entrepreneur Community",
      desc: "Join our active community forum and WhatsApp mastermind groups to share knowledge, exchange leads, and solve growth bottlenecks.",
      link: "/forum",
      linkText: "Join Community Forum",
      enabled: flags.forum,
    },
    {
      icon: Megaphone,
      title: "Multi-Channel Promotion",
      desc: "Build instant one-page sales pages, run sponsored campaigns, and monetize high-engagement WhatsApp status channels.",
      link: "/dashboard/sales-pages",
      linkText: "Create Sales Page",
      enabled: true,
    },
    {
      icon: Wrench,
      title: "Practical Growth Utilities",
      desc: "Utilize inventory management, lead tracking, startup calculators, and step-by-step interactive documentation.",
      link: "/tools/startup-calculator",
      linkText: "Explore Tools",
      enabled: flags.tools,
    },
  ];

  const valueProps = [
    {
      title: "One Connected Ecosystem",
      desc: "No more juggling disconnected platforms. Everything you need to discover, learn, promote, connect, sell, and grow lives in one unified hub.",
      icon: Layers,
    },
    {
      title: "Actionable Market Intelligence",
      desc: "Built with real-world knowledge of the Lagos and Nigerian marketplace — tackling real hurdles like supply chain logistics, foreign exchange, and digital payments.",
      icon: Target,
    },
    {
      title: "Revenue & Commerce First",
      desc: "We don't just provide static listings. We provide active sales pages, product checkout flows, direct buyer inquiries, and lead generation.",
      icon: TrendingUp,
    },
    {
      title: "AI-Powered Efficiency",
      desc: "Equip your business with modern AI technology — from automated sales funnels to instant business advice tailored to your sector.",
      icon: Sparkles,
    },
    {
      title: "Vetted & High-Trust Network",
      desc: "Every listed supplier and business is reviewed to foster trust, reduce transaction friction, and encourage long-term commercial partnerships.",
      icon: ShieldCheck,
    },
    {
      title: "Collaborative Community",
      desc: "Surround yourself with fellow founders, suppliers, and creators who actively support and celebrate your growth journey.",
      icon: HeartHandshakeIcon,
    },
  ];

  return (
    <>
      <SEO
        title="About Us | Bethelincovibe TV - AI-Powered Business Growth Ecosystem"
        description="Bethelincovibe TV is an AI-powered business growth ecosystem and entrepreneur community empowering businesses to discover, learn, promote, connect, sell, and grow."
        image={PAGE_OG_IMAGES.about()}
        url="/about"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Bethelincovibe TV",
          "url": "https://bethelincovibetv.com",
          "logo": "https://bethelincovibetv.com/logo.png",
          "description": "AI-powered business growth ecosystem and entrepreneur community empowering small businesses to discover, learn, promote, connect, sell, and grow.",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Lagos",
            "addressCountry": "NG"
          }
        }}
      />

      {/* 1. HERO SECTION */}
      <PageHero
        image={heroAbout}
        eyebrow="Your Business Growth Engine"
        title="An AI-Powered Business Growth Ecosystem for Entrepreneurs"
        subtitle="Bethelincovibe TV connects ambitious entrepreneurs and small businesses with the tools, knowledge, visibility, AI support, and community they need to launch, promote, sell, and scale."
      />

      <div className="container mx-auto px-4 py-12 md:py-16 space-y-16 max-w-6xl">
        {/* 2. WHO WE ARE SECTION */}
        <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-background to-muted/30 p-6 sm:p-10 shadow-sm">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Who We Are</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
              Building the Future of Entrepreneurship &amp; MSME Commerce
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              <strong className="text-foreground font-semibold">Bethelincovibe TV</strong> is an AI-powered business growth ecosystem built to help entrepreneurs, founders, and small businesses navigate the digital economy with greater visibility, practical resources, high-converting sales tools, and meaningful connections.
            </p>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              With a strong foundation in <strong className="text-foreground font-semibold">Lagos and Nigeria</strong>—one of Africa’s most dynamic commercial hubs—we bring together verified business discovery, marketplace product selling, startup education, marketing automation, AI business coaching, and an active peer network into one cohesive platform.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-background">
                <Store className="h-3.5 w-3.5 mr-1.5 text-primary" /> Verified Directory
              </Badge>
              <Badge variant="outline" className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-background">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5 text-primary" /> Physical &amp; Digital Marketplace
              </Badge>
              <Badge variant="outline" className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-background">
                <Bot className="h-3.5 w-3.5 mr-1.5 text-primary" /> AI Business Coaching
              </Badge>
              <Badge variant="outline" className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-background">
                <Users className="h-3.5 w-3.5 mr-1.5 text-primary" /> Entrepreneur Community
              </Badge>
            </div>
          </div>
        </section>

        {/* 3. PLATFORM JOURNEY: DISCOVER -> LEARN -> PROMOTE -> CONNECT -> SELL -> GROW */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              The Platform Journey
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Supporting Your Business at Every Stage
            </h2>
            <p className="text-sm text-muted-foreground">
              From your very first idea to sustainable market leadership, our ecosystem supports every step of your entrepreneurial journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {journeySteps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-all duration-200 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center ${item.textColor} shadow-xs group-hover:scale-105 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-2xl font-black tracking-tighter text-muted-foreground/30 font-mono">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. MISSION & VISION SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shadow-xs">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] font-extrabold uppercase tracking-wider text-primary border-primary/30 mb-0.5">
                    Our Purpose
                  </Badge>
                  <CardTitle className="text-xl font-black">Our Mission</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                To empower entrepreneurs and small businesses with the <strong className="text-foreground font-semibold">visibility, knowledge, technology, tools, and connections</strong> they need to start, grow, and succeed in the modern economy.
              </p>
              <p className="text-xs sm:text-sm">
                We believe that by lowering the friction to acquire customers, access capital, learn proven business models, and connect with trusted suppliers, we create widespread economic prosperity.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-accent/20 bg-gradient-to-br from-accent/5 via-card to-card shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-accent/15 flex items-center justify-center text-accent shadow-xs">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] font-extrabold uppercase tracking-wider text-accent border-accent/30 mb-0.5">
                    Our Future
                  </Badge>
                  <CardTitle className="text-xl font-black">Our Vision</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                To build the most trusted and accessible <strong className="text-foreground font-semibold">business growth ecosystem</strong> where entrepreneurs can effortlessly discover opportunities, access practical resources, promote their brands, and scale sustainably.
              </p>
              <p className="text-xs sm:text-sm">
                We envision a thriving commercial network where local merchants and digital entrepreneurs alike have equal access to world-class business technology and collaborative networks.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 5. TV VIDEO SECTION */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Media &amp; Spotlight</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Bethelincovibe TV Spotlight
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Watch featured entrepreneur stories, masterclasses, and platform guides.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
              <Link to="/how-to">Platform Guide <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          <TVFrame placement="about" />
        </section>

        {/* 6. WHAT WE OFFER (8 CORE ECOSYSTEM PILLARS) */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              What We Offer
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              A Complete Suite of Growth Capabilities
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything in Bethelincovibe TV is designed to solve real operational bottlenecks for growing businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {corePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                  {pillar.enabled && (
                    <div className="pt-4 mt-auto">
                      <Link
                        to={pillar.link}
                        className="inline-flex items-center text-xs font-bold text-primary hover:text-primary/80 transition-colors group"
                      >
                        <span>{pillar.linkText}</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. OUR COMMUNITY SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-neutral-950 p-8 sm:p-12 text-white shadow-xl">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-extrabold uppercase tracking-wider text-purple-200">
              <Users className="h-3.5 w-3.5" />
              <span>Entrepreneur Community</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              A Living Community Built on Mutual Growth
            </h2>

            <p className="text-sm sm:text-base text-white/85 leading-relaxed">
              Bethelincovibe TV is more than a toolset—it is an active network of forward-thinking entrepreneurs, merchants, suppliers, and creators. We believe that peer learning and real business connections accelerate success faster than going it alone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Knowledge &amp; Strategy Sharing</p>
                  <p className="text-xs text-white/70 mt-0.5">Real case studies, supplier experiences, and pricing insights from fellow founders.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Direct Commercial Networking</p>
                  <p className="text-xs text-white/70 mt-0.5">Find reliable wholesale distributors, service partners, and bulk buyers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Collaborative Promotion</p>
                  <p className="text-xs text-white/70 mt-0.5">Cross-promote products and leverage communal audience reach to multiply sales.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">VIP Mastermind Channels</p>
                  <p className="text-xs text-white/70 mt-0.5">Fast-paced discussion, grant notifications, and wholesale deal alerts.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              {flags.forum && (
                <Button asChild size="default" className="rounded-xl font-bold bg-white text-neutral-900 hover:bg-white/90">
                  <Link to="/forum">
                    <Users className="h-4 w-4 mr-2" /> Join Community Forum
                  </Link>
                </Button>
              )}
              <Button asChild size="default" variant="outline" className="rounded-xl font-bold border-white/30 text-white hover:bg-white/10">
                <Link to="/businesses">
                  <Store className="h-4 w-4 mr-2" /> Meet Community Businesses
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 8. WHY BETHELIN COVIBE TV */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Why Bethelincovibe TV
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Designed for Speed, Trust &amp; Scale
            </h2>
            <p className="text-sm text-muted-foreground">
              What sets our growth engine apart for modern entrepreneurs and small business owners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {valueProps.map((prop) => {
              const Icon = prop.icon;
              return (
                <Card key={prop.title} className="rounded-2xl border-border/80 bg-card shadow-xs hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-bold">{prop.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {prop.desc}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 9. CALL TO ACTIONS (CTAS) */}
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 sm:p-12 text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Accelerate Your Business Growth?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Whether you are looking to get discovered by new customers, launch high-converting sales pages, source wholesale products, or learn startup playbooks, Bethelincovibe TV is your growth partner.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {flags.businesses && (
              <Button asChild size="lg" className="rounded-xl font-bold shadow-md">
                <Link to="/businesses">
                  <Store className="h-4 w-4 mr-2" /> Explore Businesses
                </Link>
              </Button>
            )}
            {flags.products && (
              <Button asChild size="lg" variant="secondary" className="rounded-xl font-bold shadow-sm">
                <Link to="/products">
                  <ShoppingBag className="h-4 w-4 mr-2" /> Shop Marketplace
                </Link>
              </Button>
            )}
            {flags.business_listing && (
              <Button asChild size="lg" variant="outline" className="rounded-xl font-bold">
                <Link to="/businesses/list">
                  <Building2 className="h-4 w-4 mr-2" /> List Your Business
                </Link>
              </Button>
            )}
            {flags.blog && (
              <Button asChild size="lg" variant="ghost" className="rounded-xl font-bold">
                <Link to="/blog/category/startup-guides">
                  <BookOpen className="h-4 w-4 mr-2" /> Read Startup Guides
                </Link>
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function HeartHandshakeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
      <path d="m18 15-2-2" />
      <path d="m15 18-2-2" />
    </svg>
  );
}

