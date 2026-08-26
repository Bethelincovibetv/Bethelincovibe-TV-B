import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search, BookOpen, Sparkles, User, Rocket, Building2, Briefcase, Package,
  Wallet, MousePointerClick, Calculator, MessageSquare, ShoppingBag, ShieldCheck,
  CreditCard, QrCode, Share2, ArrowRight, ExternalLink, CheckCircle2, ChevronRight,
  Lightbulb, Layers, HelpCircle, Flame, Star, Bot, Megaphone, Clock, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GuideStep {
  step: number;
  title: string;
  desc: string;
}

interface FeatureGuide {
  id: string;
  title: string;
  category: "getting-started" | "selling" | "ai-tools" | "directory" | "finance" | "upcoming";
  categoryLabel: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  icon: any;
  summary: string;
  estimatedTime: string;
  actionUrl?: string;
  actionLabel?: string;
  external?: boolean;
  steps: GuideStep[];
  proTips: string[];
  faqs?: { q: string; a: string }[];
  isUpcoming?: boolean;
}

const GUIDES_DATA: FeatureGuide[] = [
  {
    id: "public-profile",
    title: "Setting Up Your 3D Public Profile & Socials",
    category: "getting-started",
    categoryLabel: "Getting Started",
    badge: "Core Feature",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    gradient: "from-purple-500 via-indigo-600 to-pink-500",
    icon: User,
    summary: "Create a shareable digital business profile (`/u/username`) equipped with your bio, direct WhatsApp chat, Instagram/TikTok handles, services list, and a printable QR code.",
    estimatedTime: "2 mins",
    actionUrl: "/dashboard/profile-edit",
    actionLabel: "Edit Profile & Socials",
    steps: [
      { step: 1, title: "Claim Your Unique Username", desc: "Go to Dashboard > Edit Profile. Enter your desired handle (e.g. `apexstudios`). This reserves your dedicated URL `bethelincovibetv.com/u/apexstudios`." },
      { step: 2, title: "Upload Logo & Write Your Bio", desc: "Add a crisp profile picture or business logo and write a compelling 2-sentence description of what your enterprise provides." },
      { step: 3, title: "Link Social Handles & WhatsApp", desc: "Fill in your WhatsApp phone number and add your Instagram, TikTok, Facebook, X, and LinkedIn URLs to make client conversion effortless." },
      { step: 4, title: "Download & Print Your 3D QR Code", desc: "Click 'My QR Code' on the dashboard to generate and download high-resolution QR codes to put on stickers, flyers, and business cards." }
    ],
    proTips: [
      "Keep your username short and identical to your Instagram or Twitter brand name for consistent brand recall.",
      "Add direct links to your best portfolio samples in your service descriptions."
    ],
    faqs: [
      { q: "Is my profile visible to Google Search?", a: "Yes, public profiles are optimized with structured metadata so potential clients searching your business name find your profile quickly." }
    ]
  },
  {
    id: "sales-pages",
    title: "Creating High-Converting Sales Pages & Funnels",
    category: "selling",
    categoryLabel: "Selling & Monetization",
    badge: "Most Popular",
    badgeColor: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
    gradient: "from-fuchsia-500 via-purple-600 to-rose-600",
    icon: Rocket,
    summary: "Launch standalone landing pages to sell digital products, consulting sessions, courses, or services with built-in Paystack payments and automatic lead capture.",
    estimatedTime: "5 mins",
    actionUrl: "/dashboard/sales-pages/new",
    actionLabel: "Launch Page Creator",
    steps: [
      { step: 1, title: "Open the Sales Page Builder", desc: "Navigate to Dashboard > Sales Pages and click 'Create New Page'. Choose a high-converting template or start fresh." },
      { step: 2, title: "Configure Product & Pricing in Naira", desc: "Input your headline, feature bullet points, product mockups, and set your price in NGN (e.g. ₦15,000)." },
      { step: 3, title: "Enable Instant Lead Capture & Payments", desc: "Toggle on buyer lead collection. You can also connect your Paystack subaccount or direct bank transfer details." },
      { step: 4, title: "Publish & Share Across WhatsApp & Ads", desc: "Hit Publish to get your live link `bethelincovibetv.com/sales/your-slug`. Share it in WhatsApp broadcasts, Instagram bio, and email newsletters." }
    ],
    proTips: [
      "Add a video preview or customer testimonial to increase conversion rates by up to 240%.",
      "Check Dashboard > My Leads in real time to instantly WhatsApp buyers who filled your enquiry form."
    ]
  },
  {
    id: "business-directory",
    title: "Listing in the Lagos Business Directory",
    category: "directory",
    categoryLabel: "Directory & Marketing",
    badge: "Buyer Leads",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-500 via-teal-600 to-cyan-600",
    icon: Building2,
    summary: "Get listed across our verified Lagos supplier directory so thousands of weekly buyers in computer village, Ikeja, Lekki, and across Nigeria can discover your products.",
    estimatedTime: "3 mins",
    actionUrl: "/dashboard/businesses",
    actionLabel: "List My Business",
    steps: [
      { step: 1, title: "Submit Business Details", desc: "Head to Dashboard > My Businesses > Add Business. Enter your trade name, office address, and primary category." },
      { step: 2, title: "Provide Products & Pricing Range", desc: "Detail the specific goods, spare parts, or services you stock along with price estimates and bulk discount terms." },
      { step: 3, title: "Admin Verification & Search Indexing", desc: "Our admin team inspects and approves your supplier listing to assign verified merchant trust badges." },
      { step: 4, title: "Boost for Top Category Placement", desc: "Use the 'Boost Business' feature to pin your listing at the top of your industry category and homepage." }
    ],
    proTips: [
      "Upload at least 3 high-resolution photos of your physical store or products to gain priority placement."
    ]
  },
  {
    id: "ai-coach",
    title: "Consulting the AI Business Coach",
    category: "ai-tools",
    categoryLabel: "AI Tools",
    badge: "24/7 Advisory",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    gradient: "from-violet-500 via-purple-600 to-indigo-600",
    icon: Briefcase,
    summary: "Receive bespoke strategic guidance on pricing, Nigerian market entry, local tax registration, social media marketing campaigns, and hiring.",
    estimatedTime: "Instant",
    actionUrl: "/dashboard/coach",
    actionLabel: "Chat with AI Coach",
    steps: [
      { step: 1, title: "Open the AI Coach Portal", desc: "Go to Dashboard > AI Coach. Select your industry or type a specific business obstacle." },
      { step: 2, title: "Ask Targeted Strategic Questions", desc: "Ask specific queries like: 'How do I price my catering packages in Lekki?' or 'Write me a 30-day Instagram reel schedule for fashion retail.'" },
      { step: 3, title: "Copy Action Plans & Execution Steps", desc: "Review the detailed breakdown, financial calculations, and template scripts tailored for the Nigerian economic environment." }
    ],
    proTips: [
      "Include your exact target location (e.g. Yaba vs. Ikeja) for hyper-localized price and consumer recommendations."
    ]
  },
  {
    id: "inventory",
    title: "Managing Inventory & Stock Levels",
    category: "ai-tools",
    categoryLabel: "AI Tools",
    badge: "Smart Stock",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    gradient: "from-orange-500 via-amber-600 to-red-600",
    icon: Package,
    summary: "Track product stock, unit cost, selling price, and profit margins with automatic low-stock alerts so you never run out of top-selling merchandise.",
    estimatedTime: "2 mins",
    actionUrl: "/dashboard/inventory",
    actionLabel: "Manage Inventory",
    steps: [
      { step: 1, title: "Add Your Products", desc: "Navigate to Dashboard > Inventory. Click 'Add Item' and input title, SKU, cost price, and retail price." },
      { step: 2, title: "Set Minimum Thresholds", desc: "Define low-stock trigger levels so the dashboard alerts you when stock drops below safety margins." },
      { step: 3, title: "Track Profit Margins", desc: "View real-time gross margin percentages and total inventory valuation to plan restocks accurately." }
    ],
    proTips: [
      "Update quantities after every physical or online sale to keep records clean for tax and supplier reorders."
    ]
  },
  {
    id: "wallet-rewards",
    title: "Wallet, Ad Earnings & Daily Login Rewards",
    category: "finance",
    categoryLabel: "Finance & Payouts",
    badge: "Earn Daily",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-500 via-teal-600 to-green-600",
    icon: Wallet,
    summary: "Claim daily login bonus rewards, earn pay-per-click commissions by viewing verified partner ads, and fund your wallet for promotions.",
    estimatedTime: "1 min",
    actionUrl: "/dashboard/wallet",
    actionLabel: "Open My Wallet",
    steps: [
      { step: 1, title: "Claim Daily Attendance Rewards", desc: "Log in daily to claim free points credited directly into your Bethelincovibe balance." },
      { step: 2, title: "Explore Ad Earnings Opportunities", desc: "Visit Dashboard > Ad Earnings to view sponsored advertiser offers and earn verified cash rewards." },
      { step: 3, title: "Top Up or Request Withdrawals", desc: "Use Paystack or bank transfer to fund your wallet to purchase featured boosts, ads, or premium courses." }
    ],
    proTips: [
      "Maintain a 7-day login streak to unlock higher daily reward multipliers."
    ]
  },
  {
    id: "ai-blogger",
    title: "Submitting for AI Guest Blog Feature",
    category: "directory",
    categoryLabel: "Directory & Marketing",
    badge: "Brand Spotlight",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    gradient: "from-indigo-500 via-purple-600 to-pink-500",
    icon: Sparkles,
    summary: "Submit your startup or product for an automated AI-written promotional blog post published directly to the Bethelincovibe TV community.",
    estimatedTime: "3 mins",
    actionUrl: "/dashboard/submit-blog",
    actionLabel: "Submit Business Article",
    steps: [
      { step: 1, title: "Fill the Business Story Form", desc: "Go to Dashboard > Submit Business. Tell our AI about your enterprise origin, what makes you unique, and key contact links." },
      { step: 2, title: "AI Generates a Comprehensive Feature", desc: "Our Gemini-powered editorial engine constructs a search-optimized article with 3D visuals and call-to-actions." },
      { step: 3, title: "Review & Publish", desc: "Upon approval, the article goes live on the main blog and gets broadcast across our newsletter and WhatsApp network." }
    ],
    proTips: [
      "Mention your special promotions or discount codes in the form to encourage readers to contact you immediately."
    ]
  },
  {
    id: "startup-calculator",
    title: "Lagos Startup & Capital Cost Calculator",
    category: "ai-tools",
    categoryLabel: "AI Tools",
    badge: "Interactive Tool",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    gradient: "from-cyan-500 via-sky-600 to-blue-600",
    icon: Calculator,
    summary: "Accurately budget for CAC business name registration, physical shop rent, branding, initial stock, generator fuel, and marketing across 20+ industries in Nigeria.",
    estimatedTime: "2 mins",
    actionUrl: "/tools/startup-calculator",
    actionLabel: "Run Startup Calculator",
    steps: [
      { step: 1, title: "Select Your Business Industry", desc: "Choose from Tech, Fashion, Food, Real Estate, Beauty, Logistics, or Solar Energy." },
      { step: 2, title: "Customize Scale & Location", desc: "Adjust sliders for location (Lagos Island, Mainland, Abuja) and launch scale (Home-based, Retail Shop, Warehouse)." },
      { step: 3, title: "Export Budget Breakdown", desc: "Get an itemized capital breakdown with estimated break-even timelines and download the PDF report." }
    ],
    proTips: [
      "Always budget a 15-20% contingency buffer for unforeseen price shifts in currency exchange and utility tariffs."
    ]
  },
  {
    id: "community-forum",
    title: "Community Forum & Business Networking",
    category: "directory",
    categoryLabel: "Directory & Marketing",
    badge: "Peer Network",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    gradient: "from-teal-500 via-emerald-600 to-cyan-600",
    icon: MessageSquare,
    summary: "Ask questions, share market insights, find wholesale suppliers, and network with thousands of entrepreneurs across Nigeria.",
    estimatedTime: "Ongoing",
    actionUrl: "/forum",
    actionLabel: "Explore Community Forum",
    steps: [
      { step: 1, title: "Browse Topics & Categories", desc: "Explore threads on Business Growth, Tech Innovations, Supplier Recommendations, and Import/Export tips." },
      { step: 2, title: "Start a Discussion or Ask Advice", desc: "Create a new topic to get answers from experienced founders and industry veterans." },
      { step: 3, title: "Build Reputation & Inbound Leads", desc: "Helpful answers showcase your expertise and drive visitors directly to your public profile." }
    ],
    proTips: [
      "Ensure your public profile is 100% complete so members can click your avatar to contact your WhatsApp directly."
    ]
  },
  // UPCOMING ROADMAP FEATURES
  {
    id: "upcoming-whatsapp-bot",
    title: "AI WhatsApp Lead Auto-Responder (Upcoming)",
    category: "upcoming",
    categoryLabel: "Upcoming Roadmap",
    badge: "In Development",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    gradient: "from-amber-500 via-orange-600 to-yellow-600",
    icon: Bot,
    summary: "Automatically connect your WhatsApp Business account to our AI Assistant to respond to customer product inquiries, share prices, and book appointments 24/7.",
    estimatedTime: "Coming Q2",
    isUpcoming: true,
    steps: [
      { step: 1, title: "Connect via Official QR Code", desc: "Scan a pairing QR code in your dashboard to securely link your WhatsApp number." },
      { step: 2, title: "AI Ingests Your Product Catalog", desc: "The bot automatically learns all products, prices, and FAQs from your Bethelincovibe directory profile." },
      { step: 3, title: "Autonomous 24/7 Customer Conversion", desc: "The AI answers customer DMs in natural Nigerian English and records orders directly into your dashboard." }
    ],
    proTips: [
      "Ensure your products and services list in your profile are up-to-date so the AI has rich data to answer buyer queries."
    ]
  },
  {
    id: "upcoming-escrow",
    title: "Multi-Vendor Escrow & Buyer Protection (Upcoming)",
    category: "upcoming",
    categoryLabel: "Upcoming Roadmap",
    badge: "In Development",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    gradient: "from-blue-500 via-indigo-600 to-purple-600",
    icon: ShieldCheck,
    summary: "A secure escrow payment system that holds buyer funds safely until goods are delivered in Lagos and confirmed, eliminating online fraud.",
    estimatedTime: "Coming Q3",
    isUpcoming: true,
    steps: [
      { step: 1, title: "Buyer Pays into Escrow", desc: "Customer places order on your sales page or directory listing; payment is held securely." },
      { step: 2, title: "Dispatch & Tracking Confirmation", desc: "Merchant dispatches goods via our verified dispatch partners with proof of delivery." },
      { step: 3, title: "Instant Payout Release", desc: "Upon buyer acceptance or courier confirmation, funds are automatically released to your bank account." }
    ],
    proTips: [
      "Verified sellers with completed profiles and positive reviews will enjoy zero-fee promotional periods upon rollout."
    ]
  }
];

export default function HowToGuide() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({});

  const filteredGuides = useMemo(() => {
    return GUIDES_DATA.filter((g) => {
      const matchesCategory = selectedCategory === "all" || g.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const inTitle = g.title.toLowerCase().includes(q);
      const inSummary = g.summary.toLowerCase().includes(q);
      const inCategory = g.categoryLabel.toLowerCase().includes(q);
      const inSteps = g.steps.some((s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
      const inTips = g.proTips.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && (inTitle || inSummary || inCategory || inSteps || inTips);
    });
  }, [searchQuery, selectedCategory]);

  const handleVote = (id: string, isHelpful: boolean) => {
    setHelpfulVotes((prev) => ({ ...prev, [id]: isHelpful }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background pb-16">
      <Helmet>
        <title>How-To Guide & Feature Handbook | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Interactive, step-by-step master guides for every feature, tool, and upcoming capability on Bethelincovibe TV."
        />
      </Helmet>

      {/* Hero Header with 3D Gloss Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-purple-700 to-pink-600 text-white pt-12 pb-16 px-4 sm:px-6 shadow-xl rounded-b-[2.5rem]">
        {/* Subtle background ornamentation */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            Interactive Platform Knowledge Base
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            How-To Guides & Feature Handbook
          </h1>

          <p className="text-sm sm:text-base text-white/85 max-w-2xl mx-auto font-normal leading-relaxed">
            Master every capability on Bethelincovibe TV — from creating high-converting sales funnels and optimizing your public profile, to consulting our AI Business Coach and launching ads.
          </p>

          {/* Interactive Search Bar */}
          <div className="max-w-2xl mx-auto pt-3">
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-background text-foreground border border-white/30">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any feature (e.g. sales pages, WhatsApp, QR code, AI Coach, wallet)..."
                className="pl-12 pr-10 py-6 text-sm sm:text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/70"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted px-2 py-1 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-white/80 mt-2 text-left sm:text-center">
                Found <strong>{filteredGuides.length}</strong> matching guide{filteredGuides.length === 1 ? "" : "s"} for "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 mt-8 space-y-8">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { key: "all", label: "All Guides" },
            { key: "getting-started", label: "Getting Started" },
            { key: "selling", label: "Selling & Monetization" },
            { key: "ai-tools", label: "AI Tools & Inventory" },
            { key: "directory", label: "Directory & Marketing" },
            { key: "finance", label: "Finance & Payouts" },
            { key: "upcoming", label: "Roadmap (Upcoming)" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                selectedCategory === cat.key
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                  : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick Summary Banner if 0 results */}
        {filteredGuides.length === 0 && (
          <Card className="text-center py-12 rounded-3xl border-dashed">
            <CardContent className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold">No matching guides found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                We couldn't find any guides matching "{searchQuery}". Try searching for keywords like "sales", "profile", "QR code", or reset filters.
              </p>
              <Button size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                Reset Search Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Feature Guides Grid */}
        <div className="space-y-6">
          {filteredGuides.map((guide) => {
            const Icon = guide.icon;
            const isExpanded = activeGuideId === guide.id;
            const hasVoted = helpfulVotes[guide.id] !== undefined;

            return (
              <Card
                key={guide.id}
                id={`guide-${guide.id}`}
                className={`border transition-all duration-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg ${
                  isExpanded ? "border-primary/50 ring-2 ring-primary/10 shadow-md" : "border-border/80 bg-card hover:border-primary/30"
                }`}
              >
                {/* Guide Top Header */}
                <div className="p-5 sm:p-7 flex flex-col md:flex-row md:items-start justify-between gap-5">
                  <div className="flex items-start gap-4 sm:gap-5">
                    {/* 3D Elevated Icon Box */}
                    <div
                      className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br ${guide.gradient} flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.4)] ring-2 ring-white/20`}
                    >
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-sm" strokeWidth={2.4} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-xs font-black px-2.5 py-0.5 ${guide.badgeColor}`}>
                          {guide.badge}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5">
                          {guide.categoryLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {guide.estimatedTime} read
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                        {guide.title}
                      </h2>

                      <p className="text-sm sm:text-[15px] font-medium text-foreground/90 leading-relaxed max-w-3xl">
                        {guide.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-start pt-2 md:pt-0">
                    {guide.actionUrl && (
                      <Button asChild size="sm" className="font-black text-xs gap-1.5 shadow-md h-9 px-3.5">
                        <Link to={guide.actionUrl}>
                          {guide.actionLabel || "Open Feature"} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}

                    <Button
                      variant={isExpanded ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveGuideId(isExpanded ? null : guide.id)}
                      className="text-xs font-black h-9 px-3.5"
                    >
                      {isExpanded ? "Collapse Guide" : "View Step-by-Step"}
                    </Button>
                  </div>
                </div>

                {/* Expanded Step-by-Step Breakdown */}
                {isExpanded && (
                  <div className="border-t border-border/80 bg-muted/20 p-5 sm:p-7 space-y-6 animate-in fade-in-50 duration-200">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" /> Actionable Step-by-Step Tutorial
                        </h3>
                        <span className="text-xs font-bold text-muted-foreground">Follow these {guide.steps.length} simple steps</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {guide.steps.map((step) => (
                          <div
                            key={step.step}
                            className="p-5 rounded-2xl bg-card border border-border/90 shadow-sm flex items-start gap-4 hover:border-primary/40 hover:shadow-md transition-all"
                          >
                            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              {step.step}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <h4 className="text-sm sm:text-base font-black text-foreground">{step.title}</h4>
                              <p className="text-xs sm:text-sm font-medium text-foreground/85 leading-relaxed">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pro Tips Section */}
                    {guide.proTips && guide.proTips.length > 0 && (
                      <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2.5 shadow-xs">
                        <p className="text-sm font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" /> 💡 Pro Knowledge &amp; Growth Tips
                        </p>
                        <ul className="space-y-2 pl-6 list-disc text-xs sm:text-sm font-medium text-amber-950 dark:text-amber-100">
                          {guide.proTips.map((tip, idx) => (
                            <li key={idx} className="leading-relaxed font-semibold">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* FAQs if present */}
                    {guide.faqs && guide.faqs.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-black text-foreground">Common Questions &amp; Answers</h4>
                        <div className="space-y-2.5">
                          {guide.faqs.map((faq, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-card border border-border/80 text-xs sm:text-sm space-y-1.5 shadow-xs">
                              <p className="font-black text-foreground">Q: {faq.q}</p>
                              <p className="font-medium text-foreground/85 leading-relaxed">A: {faq.a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback row */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground border-t border-border/70">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-foreground">Did this guide help you?</span>
                        {hasVoted ? (
                          <Badge variant="secondary" className="text-xs font-bold text-emerald-600 bg-emerald-500/10 py-1 px-2.5">
                            <Check className="h-3.5 w-3.5 mr-1" /> Thanks for your feedback!
                          </Badge>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold px-3"
                              onClick={() => handleVote(guide.id, true)}
                            >
                              👍 Yes, very clear
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold px-3"
                              onClick={() => handleVote(guide.id, false)}
                            >
                              👎 Needs More Info
                            </Button>
                          </div>
                        )}
                      </div>

                      {guide.actionUrl && (
                        <Button asChild size="sm" variant="ghost" className="h-8 text-xs sm:text-sm font-black text-primary">
                          <Link to={guide.actionUrl}>
                            Go to {guide.actionLabel || "Feature"} →
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Need Help Direct Contact Box */}
        <Card className="rounded-3xl bg-gradient-to-r from-muted/60 via-card to-muted/60 border border-border/80 shadow-sm p-6 text-center space-y-3">
          <h3 className="text-base font-bold">Still have questions or need custom feature onboarding?</h3>
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            Our support team and AI assistance are available 24/7. Ask questions in the Community Forum or chat directly with our AI Coach.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Button asChild variant="outline" size="sm" className="font-semibold text-xs">
              <Link to="/forum">Visit Community Forum</Link>
            </Button>
            <Button asChild size="sm" className="font-semibold text-xs">
              <Link to="/dashboard/coach">Consult AI Coach</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
