import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Cake,
  ShoppingBag,
  Palette,
  Building2,
  User,
  X,
  Sparkles,
  ArrowRight,
  Loader2,
  Settings,
  Activity,
  ShieldCheck,
  CreditCard,
  Bell,
  Sliders,
  Layers,
  MessageSquare,
  BarChart3,
  Users,
  Eye,
  FileCode,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSavedDesigns, SavedDesign } from "@/lib/savedDesignsManager";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

export type SearchCategoryFilter =
  | "all"
  | "features"
  | "activity"
  | "settings"
  | "products"
  | "templates"
  | "birthday"
  | "businesses"
  | "users";

interface SearchResultItem {
  id: string;
  type: "feature" | "activity" | "settings" | "birthday" | "product" | "template" | "business" | "user" | "design";
  title: string;
  subtitle?: string;
  badge?: string;
  link: string;
  icon: any;
  iconColor: string;
  image?: string;
}

// Built-in Dashboard Navigation & Feature Index
const DASHBOARD_FEATURES_INDEX: SearchResultItem[] = [
  {
    id: "feat-overview",
    type: "feature",
    title: "Dashboard Overview & Stats",
    subtitle: "Real-time metrics, recent visits, active listings & revenue snapshot",
    badge: "Core Feature",
    link: "/dashboard",
    icon: BarChart3,
    iconColor: "text-primary bg-primary/10",
  },
  {
    id: "feat-activity",
    type: "activity",
    title: "User Activity & Audit Logs",
    subtitle: "Track live visitor inquiries, WhatsApp clicks, page views and recent logins",
    badge: "Activity",
    link: "/dashboard/activity",
    icon: Activity,
    iconColor: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "feat-analytics",
    type: "activity",
    title: "Real-Time Traffic & Analytics",
    subtitle: "Audience insights, peak traffic hours, conversion funnel and customer geography",
    badge: "Analytics",
    link: "/dashboard/analytics",
    icon: Eye,
    iconColor: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "feat-leads",
    type: "activity",
    title: "WhatsApp Leads & Inquiries CRM",
    subtitle: "Manage incoming buyer messages, quotation requests and phone contacts",
    badge: "CRM & Leads",
    link: "/dashboard/leads",
    icon: MessageSquare,
    iconColor: "text-emerald-600 bg-emerald-600/10",
  },
  {
    id: "feat-user-mgmt",
    type: "settings",
    title: "User Profile & Account Management",
    subtitle: "Update personal bio, display name, avatar, WhatsApp number and business location",
    badge: "User Mgmt",
    link: "/dashboard/profile",
    icon: User,
    iconColor: "text-indigo-500 bg-indigo-500/10",
  },
  {
    id: "feat-verification",
    type: "settings",
    title: "KYC & Seller Verification",
    subtitle: "Submit Lagos business documents, CAC registration, and get verified badge",
    badge: "Security",
    link: "/dashboard/verification",
    icon: ShieldCheck,
    iconColor: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "feat-team",
    type: "settings",
    title: "Team & Role Permissions",
    subtitle: "Manage staff accounts, assign manager roles, and delegate store access",
    badge: "User Mgmt",
    link: "/dashboard/team",
    icon: Users,
    iconColor: "text-violet-500 bg-violet-500/10",
  },
  {
    id: "feat-settings",
    type: "settings",
    title: "General Dashboard Settings",
    subtitle: "Configure store preferences, currency, time zones, and SEO metadata",
    badge: "Settings",
    link: "/dashboard/settings",
    icon: Settings,
    iconColor: "text-slate-500 bg-slate-500/10",
  },
  {
    id: "feat-feature-toggles",
    type: "settings",
    title: "Admin Feature Toggles & Control Center",
    subtitle: "Instantly toggle modules (AI Studio, Birthday Filter, Marketplace, CRM)",
    badge: "Admin",
    link: "/dashboard/feature-toggles",
    icon: Sliders,
    iconColor: "text-rose-500 bg-rose-500/10",
  },
  {
    id: "feat-notifications",
    type: "settings",
    title: "Notification Preferences & Alerts",
    subtitle: "Configure email, SMS, and WhatsApp alerts for new orders and leads",
    badge: "Alerts",
    link: "/dashboard/notifications",
    icon: Bell,
    iconColor: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "feat-billing",
    type: "settings",
    title: "Billing, Plans & Invoices",
    subtitle: "Manage Pro subscription, view payment receipts and invoice history",
    badge: "Billing",
    link: "/dashboard/billing",
    icon: CreditCard,
    iconColor: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "feat-ai-designer",
    type: "template",
    title: "AI Graphic Designer & Flyer Studio",
    subtitle: "Generate high-resolution social media flyers, promo banners & menus with AI",
    badge: "AI Studio",
    link: "/dashboard/graphic-designer",
    icon: Palette,
    iconColor: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "feat-ai-logo",
    type: "template",
    title: "AI Vector Logo & Brand Generator",
    subtitle: "Generate scalable SVG vector logos and brand assets in seconds",
    badge: "AI Studio",
    link: "/dashboard/graphic-designer?tab=logo",
    icon: Sparkles,
    iconColor: "text-pink-500 bg-pink-500/10",
  },
  {
    id: "feat-products-mgmt",
    type: "product",
    title: "My Listed Products & Inventory",
    subtitle: "Add new items, adjust prices, edit descriptions, and toggle active status",
    badge: "Store",
    link: "/dashboard/products",
    icon: ShoppingBag,
    iconColor: "text-sky-500 bg-sky-500/10",
  },
];

// Built-in Birthday templates and design presets
const BIRTHDAY_PRESETS: SearchResultItem[] = [
  {
    id: "bday-template-1",
    type: "birthday",
    title: "Luxury Royal Birthday Celebration Flyer",
    subtitle: "24K Gold & Obsidian frame for executive birthdays & VIP milestones",
    badge: "Flyer Template",
    link: "/dashboard/graphic-designer?prompt=Design+a+luxury+royal+birthday+celebration+flyer+with+gold+glitter+and+photo",
    icon: Cake,
    iconColor: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "bday-template-2",
    type: "birthday",
    title: "WhatsApp Birthday Story & Instagram Reel (9:16)",
    subtitle: "High-energy vertical birthday wish template with custom portrait mask",
    badge: "9:16 Story",
    link: "/dashboard/graphic-designer?prompt=Create+a+WhatsApp+story+birthday+flyer+with+confetti+and+music+vibe",
    icon: Sparkles,
    iconColor: "text-pink-500 bg-pink-500/10",
  },
  {
    id: "bday-template-3",
    type: "birthday",
    title: "Artisanal Birthday Cake & Pastry Promo",
    subtitle: "Delicious bakery graphic with price tags and WhatsApp order button",
    badge: "Food & Gifts",
    link: "/dashboard/graphic-designer?prompt=Make+a+birthday+cake+bakery+flyer+offering+custom+fondant+cakes+in+Lagos",
    icon: Cake,
    iconColor: "text-rose-500 bg-rose-500/10",
  },
  {
    id: "bday-template-4",
    type: "birthday",
    title: "Children's Birthday Party & Funfair Handbill",
    subtitle: "Vibrant cartoon & balloon theme with event venue and RSVP contact",
    badge: "Event Handbill",
    link: "/dashboard/graphic-designer?prompt=Design+a+colorful+kids+birthday+party+flyer+with+balloons+and+games",
    icon: Cake,
    iconColor: "text-teal-500 bg-teal-500/10",
  },
];

export default function DashboardSearchDiscovery() {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchCategoryFilter>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Perform multi-resource real-time search
  useEffect(() => {
    let isCancelled = false;

    async function executeSearch() {
      const q = query.trim().toLowerCase();

      // If active filter is birthday and query is empty, show birthday presets immediately
      if (activeFilter === "birthday" && !q && flags.birthday_filter !== false) {
        setResults(BIRTHDAY_PRESETS);
        setIsOpen(true);
        return;
      }

      if (!q && activeFilter === "all") {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      const aggregated: SearchResultItem[] = [];

      try {
        // 1. Dashboard Features, Settings, User Management & Activity Navigation
        if (activeFilter === "all" || activeFilter === "features" || activeFilter === "activity" || activeFilter === "settings") {
          DASHBOARD_FEATURES_INDEX.forEach((feat) => {
            const matchesFilter =
              activeFilter === "all" ||
              (activeFilter === "features" && feat.type === "feature") ||
              (activeFilter === "activity" && feat.type === "activity") ||
              (activeFilter === "settings" && feat.type === "settings");

            const matchesQuery =
              !q ||
              feat.title.toLowerCase().includes(q) ||
              feat.subtitle?.toLowerCase().includes(q) ||
              feat.badge?.toLowerCase().includes(q);

            if (matchesFilter && matchesQuery) {
              aggregated.push(feat);
            }
          });
        }

        // 2. Saved Designs Search
        if (flags.graphic_designer !== false && (activeFilter === "all" || activeFilter === "templates" || activeFilter === "birthday")) {
          const saved = getSavedDesigns();
          saved.forEach((d) => {
            if (
              !q ||
              d.title.toLowerCase().includes(q) ||
              d.businessName?.toLowerCase().includes(q) ||
              d.type.toLowerCase().includes(q)
            ) {
              aggregated.push({
                id: `saved-${d.id}`,
                type: "design",
                title: d.title,
                subtitle: `Saved ${d.type.toUpperCase()} • ${d.businessName || "My Design"}`,
                badge: d.type === "logo" ? "Vector Logo" : "Graphic Flyer",
                link: `/dashboard/graphic-designer?editDesignId=${d.id}`,
                icon: Palette,
                iconColor: "text-amber-500 bg-amber-500/10",
                image: d.previewDataUrl,
              });
            }
          });
        }

        // 3. Birthday Presets Search
        if (flags.birthday_filter !== false && (activeFilter === "all" || activeFilter === "birthday" || q.includes("birth") || q.includes("cake") || q.includes("party"))) {
          BIRTHDAY_PRESETS.forEach((bp) => {
            if (!q || bp.title.toLowerCase().includes(q) || bp.subtitle?.toLowerCase().includes(q)) {
              if (!aggregated.some((a) => a.id === bp.id)) {
                aggregated.push(bp);
              }
            }
          });
        }

        // 4. Products Search (both directory_products and seller_products)
        if (flags.products !== false && (activeFilter === "all" || activeFilter === "products")) {
          const [dirRes, selRes] = await Promise.all([
            supabase
              .from("directory_products")
              .select("id, name, slug, price, condition, images")
              .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
              .limit(4),
            supabase
              .from("seller_products")
              .select("id, title, price, category, image_url")
              .ilike("title", `%${q}%`)
              .limit(4),
          ]);

          if (dirRes.data) {
            dirRes.data.forEach((p) => {
              aggregated.push({
                id: `dir-prod-${p.id}`,
                type: "product",
                title: p.name,
                subtitle: p.price ? `₦${Number(p.price).toLocaleString()} • ${p.condition === "digital" ? "Digital Download" : "Physical Good"}` : "Product Listing",
                badge: p.condition === "digital" ? "Digital" : "Product",
                link: `/products/${p.slug || p.id}`,
                icon: ShoppingBag,
                iconColor: "text-sky-500 bg-sky-500/10",
                image: p.images?.[0],
              });
            });
          }

          if (selRes.data) {
            selRes.data.forEach((p) => {
              if (!aggregated.some((a) => a.title.toLowerCase() === p.title.toLowerCase())) {
                aggregated.push({
                  id: `prod-${p.id}`,
                  type: "product",
                  title: p.title,
                  subtitle: p.price ? `₦${Number(p.price).toLocaleString()} • ${p.category || "Product"}` : p.category,
                  badge: "Merchant",
                  link: `/products/${p.id}`,
                  icon: ShoppingBag,
                  iconColor: "text-sky-500 bg-sky-500/10",
                  image: p.image_url,
                });
              }
            });
          }
        }

        // 5. Businesses Search
        if (flags.businesses !== false && (activeFilter === "all" || activeFilter === "businesses")) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("id, name, category, city, logo_url")
            .ilike("name", `%${q}%`)
            .limit(4);

          if (biz) {
            biz.forEach((b) => {
              aggregated.push({
                id: `biz-${b.id}`,
                type: "business",
                title: b.name,
                subtitle: [b.category, b.city].filter(Boolean).join(" • ") || "Business Listing",
                badge: "Business",
                link: `/businesses/${b.id}`,
                icon: Building2,
                iconColor: "text-emerald-500 bg-emerald-500/10",
                image: b.logo_url,
              });
            });
          }
        }

        // 6. User Profiles Search (User Management)
        if (activeFilter === "all" || activeFilter === "users" || activeFilter === "settings") {
          const { data: users } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, role")
            .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
            .limit(4);

          if (users) {
            users.forEach((u) => {
              aggregated.push({
                id: `user-${u.id}`,
                type: "user",
                title: u.display_name || `@${u.username}`,
                subtitle: u.role ? `Role: ${u.role} • @${u.username || "user"}` : `@${u.username || "member"}`,
                badge: u.role === "admin" ? "Admin" : "User",
                link: u.username ? `/u/${u.username}` : `/u/${u.id}`,
                icon: User,
                iconColor: "text-purple-500 bg-purple-500/10",
                image: u.avatar_url,
              });
            });
          }
        }

        if (!isCancelled) {
          setResults(aggregated.slice(0, 14));
        }
      } catch (err) {
        console.error("Dashboard search error:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    executeSearch();

    return () => {
      isCancelled = true;
    };
  }, [query, activeFilter, flags]);

  const handleFilterClick = (filterKey: SearchCategoryFilter) => {
    setActiveFilter((prev) => (prev === filterKey ? "all" : filterKey));
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    setActiveFilter("all");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full z-30">
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-card border-2 border-border/80 hover:border-primary/50 focus-within:border-primary rounded-2xl shadow-md transition-all">
        <div className="pl-3.5 pr-2 text-muted-foreground flex items-center">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4 text-primary" />
          )}
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || activeFilter === "birthday" || query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search features, user activity, settings, products, templates, members..."
          className="border-0 focus-visible:ring-0 shadow-none h-11 text-xs sm:text-sm pl-0 pr-10 font-medium"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/80 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dynamic Filter Chips Bar */}
      <div className="flex items-center gap-1.5 pt-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap pr-1">
          Search:
        </span>

        {/* 1. All */}
        <button
          onClick={() => handleFilterClick("all")}
          className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
            activeFilter === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          <Zap className="h-3 w-3" />
          <span>All</span>
        </button>

        {/* 2. Features */}
        <button
          onClick={() => handleFilterClick("features")}
          className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
            activeFilter === "features"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          <BarChart3 className="h-3 w-3 text-primary" />
          <span>Features</span>
        </button>

        {/* 3. User Activity */}
        <button
          onClick={() => handleFilterClick("activity")}
          className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
            activeFilter === "activity"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          <Activity className="h-3 w-3 text-emerald-500" />
          <span>Activity &amp; Logs</span>
        </button>

        {/* 4. Settings & User Mgmt */}
        <button
          onClick={() => handleFilterClick("settings")}
          className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
            activeFilter === "settings"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          <Settings className="h-3 w-3 text-indigo-500" />
          <span>Settings &amp; Mgmt</span>
        </button>

        {/* 5. Birthday Filter */}
        {flags.birthday_filter !== false && (
          <button
            onClick={() => handleFilterClick("birthday")}
            className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
              activeFilter === "birthday"
                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-500 shadow-xs"
                : "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/20"
            }`}
          >
            <Cake className="h-3.5 w-3.5 text-pink-500" />
            <span>🎂 Birthday</span>
          </button>
        )}

        {/* 6. Products */}
        {flags.products !== false && (
          <button
            onClick={() => handleFilterClick("products")}
            className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
              activeFilter === "products"
                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <ShoppingBag className="h-3 w-3 text-sky-500" />
            <span>Products</span>
          </button>
        )}

        {/* 7. Templates & Designs */}
        {flags.graphic_designer !== false && (
          <button
            onClick={() => handleFilterClick("templates")}
            className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
              activeFilter === "templates"
                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <Palette className="h-3 w-3 text-amber-500" />
            <span>Templates</span>
          </button>
        )}

        {/* 8. Users */}
        <button
          onClick={() => handleFilterClick("users")}
          className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
            activeFilter === "users"
              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          <User className="h-3 w-3 text-purple-500" />
          <span>Members</span>
        </button>
      </div>

      {/* Instant Live Results Floating Card */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 shadow-2xl border-2 border-border/80 rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
          <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-foreground">
                {activeFilter === "birthday"
                  ? "🎂 Birthday Flyers, Cakes & Celebration Presets"
                  : `Dashboard Real-Time Search (${results.length} results)`}
              </span>
              {activeFilter !== "all" && (
                <Badge variant="outline" className="text-[10px] uppercase font-black">
                  {activeFilter}
                </Badge>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground font-black"
            >
              Close
            </button>
          </div>

          <CardContent className="p-2 max-h-[400px] overflow-y-auto space-y-1.5">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Searching across all dashboard features, activities, settings &amp; marketplace...
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                <p className="font-bold text-foreground">No matching features found for "{query}".</p>
                <div className="flex justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigate(`/dashboard/graphic-designer?prompt=${encodeURIComponent(query)}`);
                      setIsOpen(false);
                    }}
                    className="text-xs font-black rounded-xl gap-1"
                  >
                    <Palette className="h-3.5 w-3.5" />
                    Create "{query}" Flyer in AI Studio
                  </Button>
                </div>
              </div>
            ) : (
              results.map((res) => {
                const Icon = res.icon;
                return (
                  <Link
                    key={res.id}
                    to={res.link}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-all border border-transparent hover:border-border/60 group"
                  >
                    {res.image ? (
                      <img
                        src={res.image}
                        alt={res.title}
                        className="h-10 w-10 rounded-lg object-cover border shrink-0 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${res.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate">
                          {res.title}
                        </span>
                        {res.badge && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-black shrink-0">
                            {res.badge}
                          </Badge>
                        )}
                      </div>
                      {res.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate font-medium">
                          {res.subtitle}
                        </p>
                      )}
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

