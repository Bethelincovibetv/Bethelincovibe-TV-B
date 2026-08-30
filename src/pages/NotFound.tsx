import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";
import { SITE_NAME } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Home,
  ShoppingBag,
  Building2,
  FileText,
  Users,
  Calculator,
  Search,
  Sparkles,
  Compass,
} from "lucide-react";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("404 Error: Non-existent route accessed:", location.pathname);
  }, [location.pathname]);

  const quickLinks = [
    {
      to: "/products",
      label: "Marketplace",
      desc: "Shop physical & digital products",
      icon: ShoppingBag,
      color: "from-pink-500/15 to-rose-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20",
    },
    {
      to: "/businesses",
      label: "Business Directory",
      desc: "Find verified suppliers & services",
      icon: Building2,
      color: "from-blue-500/15 to-indigo-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      to: "/blog",
      label: "Blog & Guides",
      desc: "Read playbooks & startup guides",
      icon: FileText,
      color: "from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      to: "/forum",
      label: "Community Forum",
      desc: "Join entrepreneur discussions",
      icon: Users,
      color: "from-purple-500/15 to-fuchsia-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
  ];

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <SEO
        title={`Page Not Found | ${SITE_NAME}`}
        description="The requested page could not be found. Explore our marketplace, business directory, and startup guides."
        noindex={true}
      />

      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon & 404 Badge */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-purple-600 to-accent text-white shadow-[0_12px_28px_-4px_rgba(147,51,234,0.4),inset_0_2px_0_rgba(255,255,255,0.4)] ring-2 ring-primary/20">
            <img
              src="/logo.png"
              alt="Bethelincovibe TV"
              className="h-12 w-12 rounded-xl object-contain drop-shadow-sm"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Compass className="h-3.5 w-3.5" />
            <span>404 • Resource Not Found</span>
          </div>
        </div>

        {/* Heading & Friendly Explanation */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            Looking for something specific?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Looks like you're searching for something that isn't available here, or the page has moved to a new destination.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate(-1)}
            variant="outline"
            className="rounded-2xl font-bold h-12 px-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <Button
            size="lg"
            asChild
            className="rounded-2xl font-bold h-12 px-6 gap-2 shadow-md"
          >
            <Link to="/">
              <Home className="h-4 w-4" /> Back to Home
            </Link>
          </Button>
        </div>

        {/* Helpful Discovery Grid */}
        <div className="pt-4 border-t border-border/70 space-y-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Popular Platform Destinations
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to} className="group block">
                <Card className="h-full border border-border/80 hover:border-primary/40 bg-card hover:bg-muted/40 transition-all duration-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md">
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div
                      className={`h-11 w-11 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105`}
                    >
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {link.label}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
