import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, Rocket, User, Building2, Briefcase, Package, Wallet, MousePointerClick,
  Calculator, Sparkles, BookOpen, MessageSquare, Megaphone, Settings, Bell,
  QrCode, CreditCard, ShoppingBag, ShieldCheck, Heart, ArrowRight, X, Layers,
  ExternalLink, Wand2, Compass
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SearchableFeature {
  id: string;
  title: string;
  category: "selling" | "profile" | "ai" | "directory" | "finance" | "tools" | "guides" | "settings";
  categoryLabel: string;
  description: string;
  url: string;
  icon: any;
  color: string;
  badge?: string;
  keywords: string[];
  requiresAdmin?: boolean;
}

interface DashboardFeatureSearchProps {
  isAdmin?: boolean;
  username?: string;
  onOpenWizard?: () => void;
  onOpenQRCode?: () => void;
}

export default function DashboardFeatureSearch({
  isAdmin,
  username,
  onOpenWizard,
  onOpenQRCode,
}: DashboardFeatureSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close popup dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const features: SearchableFeature[] = useMemo(() => {
    return [
      {
        id: "how-to-guide",
        title: "How-To Guides & Manuals",
        category: "guides",
        categoryLabel: "Guides",
        description: "Interactive step-by-step master guides with AI icons for all platform features.",
        url: "/dashboard/how-to",
        icon: BookOpen,
        color: "from-purple-600 via-indigo-600 to-pink-600",
        badge: "New Handbook",
        keywords: ["guide", "how to", "tutorial", "instructions", "help", "manual", "documentation", "learn", "walkthrough", "step by step"],
      },
      {
        id: "sales-pages",
        title: "Sales Pages & Funnels",
        category: "selling",
        categoryLabel: "Selling",
        description: "Create high-converting landing pages to sell digital goods, courses & services with Paystack.",
        url: "/dashboard/sales-pages",
        icon: Rocket,
        color: "from-purple-600 to-fuchsia-600",
        badge: "Monetize",
        keywords: ["sales", "page", "funnel", "landing page", "paystack", "checkout", "buy", "sell", "product", "lead", "courses"],
      },
      {
        id: "my-profile",
        title: "Public Profile & Link-in-Bio",
        category: "profile",
        categoryLabel: "Profile",
        description: "Your live shareable digital storefront with WhatsApp button, bio, and social handles.",
        url: username ? `/u/${username}` : "/dashboard/profile-edit",
        icon: User,
        color: "from-purple-500 to-pink-500",
        badge: "Live Site",
        keywords: ["profile", "public", "bio", "link in bio", "username", "handle", "whatsapp", "social", "instagram", "storefront"],
      },
      {
        id: "ai-coach",
        title: "AI Business Coach",
        category: "ai",
        categoryLabel: "AI Tools",
        description: "24/7 AI consulting for Nigerian business growth, pricing strategies & marketing campaigns.",
        url: "/dashboard/coach",
        icon: Briefcase,
        color: "from-violet-500 to-fuchsia-500",
        badge: "AI Powered",
        keywords: ["ai", "coach", "business", "consulting", "advisor", "strategy", "pricing", "gemini", "marketing", "plan"],
      },
      {
        id: "inventory",
        title: "Smart Inventory & Stock Tracker",
        category: "ai",
        categoryLabel: "AI Tools",
        description: "Track stock quantities, unit costs, profit margins, and low-stock alerts.",
        url: "/dashboard/inventory",
        icon: Package,
        color: "from-orange-500 to-red-500",
        badge: "Stock",
        keywords: ["inventory", "stock", "products", "goods", "cost", "margin", "restock", "warehouse", "tracking"],
      },
      {
        id: "wallet",
        title: "Wallet & Balances",
        category: "finance",
        categoryLabel: "Finance",
        description: "Fund wallet, check balances, view transaction history and request payouts.",
        url: "/dashboard/wallet",
        icon: Wallet,
        color: "from-emerald-500 to-teal-500",
        badge: "Naira",
        keywords: ["wallet", "balance", "money", "funds", "naira", "payout", "deposit", "paystack", "bank", "transfer"],
      },
      {
        id: "ad-earnings",
        title: "Ad Earnings & Daily Rewards",
        category: "finance",
        categoryLabel: "Finance",
        description: "Earn daily login rewards and pay-per-click commissions from verified partner ads.",
        url: "/dashboard/ad-earnings",
        icon: MousePointerClick,
        color: "from-green-500 to-emerald-600",
        badge: "Daily Bonus",
        keywords: ["ad earnings", "clicks", "daily reward", "bonus", "points", "monetization", "ppc", "cash"],
      },
      {
        id: "business-directory",
        title: "Lagos Business Directory Listings",
        category: "directory",
        categoryLabel: "Directory",
        description: "List and manage your enterprise on the verified Lagos supplier search portal.",
        url: "/dashboard/businesses",
        icon: Building2,
        color: "from-amber-500 to-yellow-500",
        badge: "Buyer Leads",
        keywords: ["directory", "businesses", "supplier", "lagos", "ikeja", "listing", "company", "vendor", "store"],
      },
      {
        id: "submit-blog",
        title: "Submit Business for AI Guest Blog",
        category: "directory",
        categoryLabel: "Directory",
        description: "Have our automated AI journalist write and publish a feature article on your brand.",
        url: "/dashboard/submit-blog",
        icon: Sparkles,
        color: "from-indigo-500 to-blue-500",
        badge: "Spotlight",
        keywords: ["guest blog", "ai blogger", "submit business", "article", "press", "pr", "marketing", "feature"],
      },
      {
        id: "startup-calculator",
        title: "Startup Cost & Capital Calculator",
        category: "tools",
        categoryLabel: "Tools",
        description: "Budget for CAC, shop rent, fuel generator, and initial inventory in Nigeria.",
        url: "/tools/startup-calculator",
        icon: Calculator,
        color: "from-cyan-500 to-sky-500",
        badge: "Budgeting",
        keywords: ["calculator", "startup", "capital", "cost", "budget", "cac", "rent", "generator", "estimate", "nigeria"],
      },
      {
        id: "community-forum",
        title: "Community Forum & Discussions",
        category: "directory",
        categoryLabel: "Community",
        description: "Network with entrepreneurs, ask for advice, and find local business partners.",
        url: "/forum",
        icon: MessageSquare,
        color: "from-teal-500 to-cyan-600",
        badge: "Network",
        keywords: ["forum", "community", "discussions", "network", "ask", "questions", "entrepreneurs", "connect"],
      },
      {
        id: "edit-profile",
        title: "Profile & Social Handles Settings",
        category: "settings",
        categoryLabel: "Settings",
        description: "Update display name, bio, photo, Instagram, TikTok, WhatsApp, X, and LinkedIn.",
        url: "/dashboard/profile-edit",
        icon: Settings,
        color: "from-slate-600 to-slate-800",
        badge: "Settings",
        keywords: ["edit profile", "settings", "social handles", "instagram", "tiktok", "twitter", "whatsapp", "avatar"],
      },
      {
        id: "notifications",
        title: "Notifications & Jingle Sounds",
        category: "settings",
        categoryLabel: "Settings",
        description: "Manage sound alerts, jingles, push notifications, and lead activity bells.",
        url: "/dashboard/settings/notifications",
        icon: Bell,
        color: "from-amber-500 to-rose-600",
        badge: "Audio Alerts",
        keywords: ["notifications", "sound", "jingle", "audio", "push", "bell", "alerts", "settings"],
      },
      {
        id: "my-leads",
        title: "Customer Leads & Inquiries",
        category: "selling",
        categoryLabel: "Selling",
        description: "Review and export buyer inquiries received from your sales pages and profile.",
        url: "/dashboard/leads",
        icon: ShoppingBag,
        color: "from-pink-600 to-rose-500",
        badge: "CRM",
        keywords: ["leads", "inquiries", "customers", "contacts", "buyers", "export", "csv", "sales page leads"],
      },
      {
        id: "admin-portal",
        title: "Admin Portal & Control Center",
        category: "settings",
        categoryLabel: "Admin",
        description: "Platform management, AI blogger triggers, notifications, and user administration.",
        url: "/admin",
        icon: ShieldCheck,
        color: "from-amber-500 to-rose-600",
        badge: "Admin Only",
        requiresAdmin: true,
        keywords: ["admin", "superadmin", "platform", "management", "control center", "users", "jingles", "ai blogger"],
      }
    ].filter((item) => !item.requiresAdmin || isAdmin);
  }, [isAdmin, username]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    return features.filter((feat) => {
      const matchCategory = activeCategory === "all" || feat.category === activeCategory;
      if (!q) return matchCategory;

      const titleMatch = feat.title.toLowerCase().includes(q);
      const descMatch = feat.description.toLowerCase().includes(q);
      const catMatch = feat.categoryLabel.toLowerCase().includes(q);
      const kwMatch = feat.keywords.some((k) => k.toLowerCase().includes(q));

      return matchCategory && (titleMatch || descMatch || catMatch || kwMatch);
    });
  }, [features, query, activeCategory]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Search Input Bar with 3D styling */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur-xs opacity-30 group-hover:opacity-60 transition duration-300 pointer-events-none" />
        <div className="relative flex items-center bg-card border border-border/90 rounded-2xl shadow-sm px-3.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
          <Search className="h-4 w-4 text-primary shrink-0 mr-2.5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search any platform feature in real time (e.g. sales pages, AI coach, QR code, guide, wallet)..."
            className="h-9 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-xs sm:text-sm bg-transparent placeholder:text-muted-foreground/70"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-mono">
              <span>Instant Search</span>
            </div>
          )}
        </div>
      </div>

      {/* Real-time search dropdown results (shown when user is typing or focused) */}
      {(isFocused || query) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Filter Chips inside Dropdown */}
          <div className="p-3 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5">
              {[
                { key: "all", label: "All" },
                { key: "guides", label: "Guides" },
                { key: "selling", label: "Selling" },
                { key: "ai", label: "AI Tools" },
                { key: "directory", label: "Directory" },
                { key: "finance", label: "Finance" },
                { key: "tools", label: "Calculators" },
                { key: "settings", label: "Settings" },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCategory(c.key)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    activeCategory === c.key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
              {searchResults.length} Match{searchResults.length === 1 ? "" : "es"}
            </span>
          </div>

          {/* Search Result List */}
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1.5">
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">No feature found matching "{query}"</p>
                <p>Try searching for "sales", "coach", "profile", "QR code", or "guide".</p>
                <div className="pt-2">
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link to="/dashboard/how-to" onClick={() => setIsFocused(false)}>
                      Browse Full How-To Guide
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.url}
                    onClick={() => {
                      setIsFocused(false);
                      setQuery("");
                    }}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-muted/60 transition group border border-transparent hover:border-border/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 3D Icon Badge */}
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/20 transition-transform group-hover:scale-105`}
                      >
                        <Icon className="h-5 w-5 drop-shadow-sm" strokeWidth={2.2} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {item.title}
                          </p>
                          {item.badge && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-extrabold shrink-0">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                      <span className="text-[11px] font-semibold hidden sm:inline">Open</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer of Dropdown */}
          <div className="p-2.5 bg-muted/30 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground px-4">
            <span className="flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-primary" /> Real-time Platform Directory
            </span>
            <Link
              to="/dashboard/how-to"
              onClick={() => setIsFocused(false)}
              className="font-bold text-primary hover:underline flex items-center gap-1"
            >
              Open Full How-To Guide <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
