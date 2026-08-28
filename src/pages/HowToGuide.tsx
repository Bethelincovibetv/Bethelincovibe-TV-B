import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search, BookOpen, Sparkles, User, Rocket, Building2, Briefcase, Package,
  Wallet, MousePointerClick, Calculator, MessageSquare, ShoppingBag, ShieldCheck,
  CreditCard, QrCode, Share2, ArrowRight, ExternalLink, CheckCircle2, ChevronRight,
  Lightbulb, Layers, HelpCircle, Flame, Star, Bot, Megaphone, Clock, Check,
  Palette, Film, MessageCircle, ChevronDown, ChevronUp, Play, Zap, Monitor,
  AlertTriangle, Target, Compass, Sparkle, RefreshCw, Smartphone
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GuideStep {
  step: number;
  title: string;
  desc: string;
  fieldExample?: string;
}

interface FeatureGuide {
  id: string;
  title: string;
  category: "graphic-design" | "getting-started" | "selling" | "ai-tools" | "directory" | "finance" | "upcoming";
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
  
  // Problem -> Action -> Result model
  whatIsThis: string;
  problemSolved: string;
  whyUseIt: string;
  whatToEnter: { label: string; placeholder: string; advice: string }[];
  steps: GuideStep[];
  expectedResult: {
    format: string;
    details: string;
  };
  nextSteps: string[];
  proTips: string[];
  faqs?: { q: string; a: string }[];
  isUpcoming?: boolean;
  mockupType: "flyer_studio" | "logo_creator" | "profile_qr" | "directory_inquiry" | "sales_page" | "ai_coach" | "inventory" | "wallet" | "whatsapp_bot" | "escrow";
}

const GUIDES_DATA: FeatureGuide[] = [
  {
    id: "graphic-designer",
    title: "AI Graphic Designer & Commercial Flyer Studio",
    category: "graphic-design",
    categoryLabel: "Design & Branding",
    badge: "New Engine",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    gradient: "from-amber-500 via-orange-500 to-pink-500",
    icon: Palette,
    summary: "Generate 1080x1350 Instagram portrait flyers, WhatsApp Status promos, and high-impact commercial posters powered by a 6-stage professional design pipeline and curated stock photography.",
    estimatedTime: "2 mins",
    actionUrl: "/dashboard/graphic-designer",
    actionLabel: "Open Graphic Studio",
    whatIsThis: "An autonomous, senior-level graphic design system that creates commercial flyers and advertisements for Nigerian businesses without AI image hallucinations or random low-quality templates.",
    problemSolved: "Hiring freelance graphic designers in Nigeria costs ₦3,000 to ₦10,000 per flyer with days of delay. Generic template apps look amateur. This tool gives you agency-grade, high-contrast sales flyers in 10 seconds for just ₦25.",
    whyUseIt: "Directly boosts social media engagement and WhatsApp conversions with optimal visual hierarchy, bold Naira price callouts, 45° dynamic photo masks, and 300DPI print readiness.",
    whatToEnter: [
      { label: "Headline / Offer", placeholder: "E.g. VIP SUNDAY SEAFOOD BUFFET or 50% FLASH SALE ON LACE", advice: "Keep it punchy (3 to 7 words). Put your biggest selling point here." },
      { label: "Price / Discount Callout", placeholder: "E.g. ₦15,000 per plate or SAVE ₦5,000 TODAY", advice: "Creates immediate buying urgency for prospective clients." },
      { label: "Value Highlights", placeholder: "E.g. Free Home Delivery in Lekki, 100% Genuine Human Hair, Instant CAC Certificate", advice: "Add 3 to 4 bullet points detailing benefits." },
      { label: "WhatsApp & Phone", placeholder: "E.g. +234 801 234 5678", advice: "Ensures customers can contact you in one tap." }
    ],
    steps: [
      { step: 1, title: "Choose Output Format", desc: "Select 1080x1350 (Instagram Portrait 4:5), 1080x1920 (WhatsApp Status/Story 9:16), 1080x1080 (Square 1:1), or 1200x630 (Banner).", fieldExample: "Recommended: Instagram Portrait (4:5) for maximum screen real estate." },
      { step: 2, title: "Pick Composition Archetype", desc: "Choose from 8 distinct layout archetypes like Split-Hero Dynamic, Magazine Editorial, Luxury Center Portal, or Bold Retail Promo.", fieldExample: "Use 'Split-Hero Dynamic' for general sales, or 'Magazine Editorial' for luxury fashion." },
      { step: 3, title: "Select or Upload Stock Imagery", desc: "Search thousands of curated Nigerian commerce photos (Aso-Ebi, Jollof, Gadgets, Real Estate, Barbershop) or upload your own transparent product photo.", fieldExample: "Type 'food' or 'fashion' in the stock browser." },
      { step: 4, title: "Apply Senior AI Polish & Download", desc: "Click any 'Senior Designer Polish' preset to automatically balance typography contrast, then download high-res PNG or save to My Designs.", fieldExample: "Export at 2x Retina or 3x Print (300 DPI)." }
    ],
    expectedResult: {
      format: "Ultra High-Resolution PNG (up to 3240x4050px 300DPI)",
      details: "A ready-to-publish flyer with perfect typography hierarchy, darkened darkroom contrast for WCAG AAA readability, contact badges, and zero watermarks."
    },
    nextSteps: [
      "Post directly to WhatsApp Status at peak hours (7:30 AM, 1:00 PM, and 8:00 PM).",
      "Upload to Instagram feed and run a targeted IG boost or share in business broadcast groups.",
      "Print on A4/A5 flyers for in-store distribution."
    ],
    proTips: [
      "Use the '✨ AI Polish Contrast' button if your text is placed over a busy background photo.",
      "Pair your flyer with a direct WhatsApp link (`wa.me/234...`) in your post caption for 3x higher message conversion."
    ],
    faqs: [
      { q: "Does this use AI image generation?", a: "No! Unlike tools that generate weird distorted hands or unreadable AI text, our studio uses professional stock photography and real vector typography rendering." },
      { q: "How many credits does one flyer cost?", a: "Generation is only 25 Credits (₦25), and quick AI improvements are 10 Credits (₦10)." }
    ],
    mockupType: "flyer_studio"
  },
  {
    id: "logo-creator",
    title: "Autonomous Vector Logo Creator & Brand Identity",
    category: "graphic-design",
    categoryLabel: "Design & Branding",
    badge: "Brand Identity",
    badgeColor: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    gradient: "from-yellow-400 via-amber-500 to-amber-600",
    icon: Sparkles,
    summary: "Generate 8 distinct corporate logo concepts (Monogram, Crest, Geometric, Luxury Shield) tailored to your industry, with transparent PNG, SVG vector export, and 1-click Business Profile sync.",
    estimatedTime: "2 mins",
    actionUrl: "/dashboard/logo-creator",
    actionLabel: "Create Logo Concepts",
    whatIsThis: "A dedicated brand identity engine led by AI specialist Apollo Brand that generates clean, scalable SVG vector logos for corporate brands, stores, and service providers.",
    problemSolved: "Most small businesses use blurry screenshots or cheap clip-art that ruins customer trust. This tool provides crisp, vector-clean marks with instant mockup visualization across business cards, 3D signage, mobile apps, and social avatars.",
    whyUseIt: "Gives your enterprise an immediate corporate prestige look, increases customer trust by 85%, and automatically syncs with your Lagos Business Directory profile.",
    whatToEnter: [
      { label: "Business Name", placeholder: "E.g. Apex Global Logistics or Zari Luxe Fashion", advice: "The exact trading name for your brand." },
      { label: "Brand Tagline", placeholder: "E.g. PREMIER FREIGHT SOLUTIONS or LUXURY REFINED", advice: "Optional short slogan underneath the emblem." },
      { label: "Industry Category", placeholder: "E.g. Real Estate, Tech, Fashion, Food, Medical", advice: "Guides the visual styling and geometric symbolism." },
      { label: "Color Harmony", placeholder: "E.g. Royal Gold, Emerald Wealth, Cyber Sapphire", advice: "Select the chromatic palette that reflects your brand archetype." }
    ],
    steps: [
      { step: 1, title: "Enter Brand Details", desc: "Input your business name, tagline, industry, and select your preferred color palette.", fieldExample: "Brand: 'Bethelin Global', Tagline: 'Excellence in Trade'." },
      { step: 2, title: "Generate 8 Multi-Archetype Concepts", desc: "The engine produces 8 distinct approaches including Modern Monograms, Geometric Crests, Minimal Badges, and Luxury Shields.", fieldExample: "Click 'Generate 8 Logo Concepts (₦50)'." },
      { step: 3, title: "Inspect 3D Real-World Mockups", desc: "Click any concept to preview how it looks on a Matte Black Business Card, 3D Acrylic Office Signboard, Mobile App Icon, or Instagram Avatar.", fieldExample: "Switch between Mockup tabs: Business Card, Office Sign, App Icon." },
      { step: 4, title: "Apply to Business Profile or Download", desc: "Click 'Apply to Business Profile' to instantly update your public directory listing, or download High-Res Transparent PNG and SVG vector files.", fieldExample: "Zero quality loss at any billboard scale." }
    ],
    expectedResult: {
      format: "Scalable Vector SVG + Transparent High-Res PNG + 3D Mockup Renders",
      details: "A complete brand identity asset pack ready for trademarking, printing, website integration, and social branding."
    },
    nextSteps: [
      "Click 'Apply to Business' to sync the logo to your Bethelincovibe directory profile.",
      "Open the Graphic Designer studio; your new logo will automatically appear on your flyers.",
      "Print on your business cards, invoices, delivery bags, and staff badges."
    ],
    proTips: [
      "Simpler geometric marks scale much better on small mobile screens and WhatsApp profile pictures.",
      "Always save both SVG (for print printers) and transparent PNG (for digital watermark use)."
    ],
    faqs: [
      { q: "Can I edit the business name after generating?", a: "Yes, you can tweak the name, initials, or color theme at any time and re-generate." },
      { q: "Will this overwrite my existing business logo?", a: "Only if you confirm via the 'Apply to Business' prompt. You can choose which specific registered business to apply it to." }
    ],
    mockupType: "logo_creator"
  },
  {
    id: "public-profile",
    title: "Setting Up Your 3D Public Profile & Socials",
    category: "getting-started",
    categoryLabel: "Getting Started",
    badge: "Core Feature",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    gradient: "from-purple-500 via-indigo-600 to-pink-500",
    icon: User,
    summary: "Create a shareable digital business profile (`/u/username`) equipped with your bio, direct WhatsApp chat, Instagram/TikTok handles, services list, and a printable 3D QR code.",
    estimatedTime: "2 mins",
    actionUrl: "/dashboard/profile-edit",
    actionLabel: "Edit Profile & Socials",
    whatIsThis: "Your personalized mini-website (`bethelincovibetv.com/u/yourname`) that houses all your enterprise links, services, contact channels, and trust badges in one mobile-optimized hub.",
    problemSolved: "Customers don't want to dig through endless social bios or ask 'where is your office / price list?'. This gives them a single fast-loading destination to contact you and buy.",
    whyUseIt: "Acts as your digital storefront with zero hosting fees, Google SEO indexing, and instant 1-click WhatsApp messaging.",
    whatToEnter: [
      { label: "Unique Username", placeholder: "E.g. apexstudios or larrygadgets", advice: "Becomes your permanent URL: /u/apexstudios" },
      { label: "Display Name & Headline", placeholder: "E.g. Larry Gadgets — #1 iPhone & Laptop Dealer in Computer Village", advice: "Explains your core value proposition instantly." },
      { label: "WhatsApp & Phone", placeholder: "E.g. +234 802 345 6789", advice: "Connects buyers directly to your chat without saving contacts." }
    ],
    steps: [
      { step: 1, title: "Claim Your Handle", desc: "Go to Dashboard > Edit Profile. Enter your desired username (e.g. `apexstudios`).", fieldExample: "URL: bethelincovibetv.com/u/apexstudios" },
      { step: 2, title: "Upload Logo & Write Bio", desc: "Add your new Apollo-generated logo and a crisp 2-sentence description of what you do.", fieldExample: "Include your physical store city (e.g. Lagos, Abuja, Port Harcourt)." },
      { step: 3, title: "Link Social Handles", desc: "Connect your Instagram, TikTok, Facebook, X, and YouTube profiles.", fieldExample: "Paste exact profile URLs for seamless follower growth." },
      { step: 4, title: "Download Your 3D QR Code", desc: "Click 'My QR Code' on the dashboard to download printable high-res QR cards.", fieldExample: "Print on stickers, product packaging, and store receipts." }
    ],
    expectedResult: {
      format: "Live Mobile-First Webpage + Printable QR Code Dialog",
      details: "A responsive public hub showcasing your brand, social links, services, and WhatsApp contact button."
    },
    nextSteps: [
      "Paste your `/u/username` link in your Instagram & TikTok bio.",
      "Add the link to your WhatsApp Business automated welcome message.",
      "Print the QR code on your product shipping packages."
    ],
    proTips: [
      "Keep your username short and memorable.",
      "Regularly update your headline with current promotions or new arrivals."
    ],
    faqs: [
      { q: "Is my profile visible on search engines?", a: "Yes, public profiles contain structured metadata and schema markup for Google Search indexing." }
    ],
    mockupType: "profile_qr"
  },
  {
    id: "business-directory",
    title: "Listing in the Lagos Business Directory & Managing Inquiries",
    category: "directory",
    categoryLabel: "Directory & Marketing",
    badge: "Buyer Leads",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-500 via-teal-600 to-cyan-600",
    icon: Building2,
    summary: "Get listed across our verified Lagos supplier directory so thousands of weekly buyers in Computer Village, Ikeja, Lekki, and across Nigeria can discover your products, send inquiries, and chat on WhatsApp.",
    estimatedTime: "3 mins",
    actionUrl: "/dashboard/businesses",
    actionLabel: "List My Business",
    whatIsThis: "Nigeria's premier verified supplier directory connecting wholesale buyers, retail shoppers, and service clients to vetted local merchants.",
    problemSolved: "Standing out among millions of unverified online sellers is difficult. Directory listing provides verified merchant badges, physical map verification, and buyer inquiry tracking.",
    whyUseIt: "Delivers hot buyer inquiries directly to your dashboard and WhatsApp while tracking every click, phone call, and inquiry submission.",
    whatToEnter: [
      { label: "Business Trade Name", placeholder: "E.g. Prime Auto Spares Ltd", advice: "Your official registered or market trade name." },
      { label: "Office / Store Address", placeholder: "E.g. Shop 14, Otigba Street, Computer Village, Ikeja, Lagos", advice: "Enables Google Maps pin placement." },
      { label: "Products & Price Range", placeholder: "E.g. Original Toyota Brake Pads (₦12,000 - ₦45,000)", advice: "Helps buyers immediately understand your inventory." }
    ],
    steps: [
      { step: 1, title: "Submit Business Listing", desc: "Head to Dashboard > My Businesses > Add Business. Enter your trade name, office address, and primary category.", fieldExample: "Select categories like Gadgets, Auto, Fashion, or Real Estate." },
      { step: 2, title: "Add Product Catalog Items", desc: "List your top products with photos, unit pricing in Naira, and wholesale bulk discounts.", fieldExample: "Upload high-quality photos of your showroom or stock." },
      { step: 3, title: "Respond to Inquiries & WhatsApp Leads", desc: "View the 'Business Listing Inquiry Detail' on your dashboard to see customer messages, contact numbers, and specific item requests.", fieldExample: "Tap the green WhatsApp button to reply immediately." },
      { step: 4, title: "Boost for Top Placement", desc: "Use Boost Business to feature your supplier card at the top of category searches.", fieldExample: "Guarantees 5x more weekly buyer views." }
    ],
    expectedResult: {
      format: "Live Verified Directory Profile + Real-Time Lead Inbox",
      details: "A dedicated profile with customer reviews, Google Map pin, inquiry contact form, and direct WhatsApp launcher."
    },
    nextSteps: [
      "Check Dashboard > Messages and Leads daily for customer requests.",
      "Share your verified badge on social media to build trust with new buyers."
    ],
    proTips: [
      "Businesses with at least 4 clear photos get 320% more inquiries than text-only listings."
    ],
    faqs: [
      { q: "How are inquiries notified to me?", a: "Inquiries appear in your dashboard activity feed, notification bell, and trigger direct WhatsApp messages if the buyer clicks the WhatsApp button." }
    ],
    mockupType: "directory_inquiry"
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
    summary: "Launch standalone landing pages to sell digital products, physical items, consulting sessions, or services with built-in Paystack payments and automatic lead capture.",
    estimatedTime: "5 mins",
    actionUrl: "/dashboard/sales-pages/new",
    actionLabel: "Launch Page Creator",
    whatIsThis: "A conversion-engineered landing page builder designed to sell single products or courses without needing expensive Shopify or WordPress subscriptions.",
    problemSolved: "Sending buyers to a messy linktree or long DM thread leads to 70% cart abandonment. A dedicated sales page presents social proof, timer urgency, and direct payment in one flow.",
    whyUseIt: "Collects customer name, phone, delivery address, and automated Paystack/Bank transfer payments seamlessly.",
    whatToEnter: [
      { label: "Headline & Hook", placeholder: "E.g. Master Importation from China to Lagos in 14 Days", advice: "Focus on the primary outcome the buyer receives." },
      { label: "Price in NGN", placeholder: "E.g. ₦25,000", advice: "Display regular price vs. discounted promo price." },
      { label: "Testimonials & FAQs", placeholder: "E.g. Customer reviews, delivery timelines, refund policies", advice: "Eliminates hesitation before checkout." }
    ],
    steps: [
      { step: 1, title: "Choose a Template", desc: "Select from Course & Coaching, Physical Product Drop, or Service Booking templates.", fieldExample: "Templates are pre-loaded with high-converting section layouts." },
      { step: 2, title: "Input Content & Pricing", desc: "Customize headlines, benefits checklist, countdown timer, and price in Naira.", fieldExample: "Add product demonstration videos or image carousels." },
      { step: 3, title: "Connect Paystack / Bank Transfer", desc: "Configure direct Paystack checkout or manual bank transfer instructions with receipt upload.", fieldExample: "Funds settle directly into your verified bank account." },
      { step: 4, title: "Publish & Track Analytics", desc: "Get your live link `bethelincovibetv.com/sales/your-slug` and track views, conversion rates, and revenue.", fieldExample: "View real-time buyer lead phone numbers in Dashboard > Leads." }
    ],
    expectedResult: {
      format: "Lightning-Fast Standalone Sales Funnel (`/sales/slug`)",
      details: "Mobile-optimized landing page with sticky buy button, countdown timer, lead capture modal, and payment gateway."
    },
    nextSteps: [
      "Run targeted ads (Facebook, TikTok, Instagram) pointing directly to your sales page URL.",
      "Export your buyer leads to WhatsApp for post-purchase follow-up and cross-selling."
    ],
    proTips: [
      "Include a 15-minute countdown timer on special flash sale offers to double conversion rates."
    ],
    mockupType: "sales_page"
  },
  {
    id: "ai-coach",
    title: "Consulting AI Business Coach Bethel Goodgift",
    category: "ai-tools",
    categoryLabel: "AI Tools",
    badge: "24/7 Advisory",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    gradient: "from-violet-500 via-purple-600 to-indigo-600",
    icon: Briefcase,
    summary: "Receive bespoke strategic guidance on pricing, Nigerian market entry, local CAC tax registration, WhatsApp closing scripts, and marketing execution.",
    estimatedTime: "Instant",
    actionUrl: "/dashboard/coach",
    actionLabel: "Chat with AI Coach",
    whatIsThis: "A specialized business advisor model tuned specifically for the Nigerian commercial landscape (Lagos, Abuja, Onitsha, Kano, Port Harcourt).",
    problemSolved: "Hiring business consultants is out of reach for small enterprises. Coach Bethel gives you instant, practical advice on margin calculations, supplier negotiation, and customer dispute resolution.",
    whyUseIt: "Get actionable, step-by-step strategies instead of generic theoretical advice.",
    whatToEnter: [
      { label: "Your Industry & Location", placeholder: "E.g. Food Delivery in Yaba or Solar Installation in Lekki", advice: "Enables hyper-localized pricing recommendations." },
      { label: "Specific Obstacle", placeholder: "E.g. How do I handle customers demanding payment on delivery? or How should I structure wholesale prices?", advice: "Be as detailed as possible." }
    ],
    steps: [
      { step: 1, title: "Open Coach Portal", desc: "Go to Dashboard > AI Coach. Select your category or ask a custom question.", fieldExample: "Choose from Growth, Pricing, CAC/Tax, or Marketing." },
      { step: 2, title: "Receive Step-by-Step Action Plan", desc: "The coach breaks down calculations, execution steps, and copy-paste script templates.", fieldExample: "E.g. 5-message WhatsApp closing sequence." },
      { step: 3, title: "Execute & Refine", desc: "Apply the tactics in your day-to-day operations and return for ongoing coaching.", fieldExample: "Track daily sprints on the Dashboard Coach widget." }
    ],
    expectedResult: {
      format: "Interactive Strategic Blueprint & Execution Scripts",
      details: "Detailed margin analyses, competitive pricing frameworks, and customer conversion scripts."
    },
    nextSteps: [
      "Save key coaching recommendations into your business notes.",
      "Implement the pricing structure on your Sales Pages and Directory products."
    ],
    proTips: [
      "Ask the coach to write high-converting WhatsApp status broadcast text for your weekend sales."
    ],
    mockupType: "ai_coach"
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
    summary: "Track product stock, unit cost, retail price, and profit margins with automatic low-stock alerts so you never run out of top-selling merchandise.",
    estimatedTime: "2 mins",
    actionUrl: "/dashboard/inventory",
    actionLabel: "Manage Inventory",
    whatIsThis: "A clean stock keeping and gross profit tracking dashboard built for merchants and retailers.",
    problemSolved: "Losing money to untracked stock, theft, or sudden stock-outs. This tool keeps your books accurate and alerts you when quantities are low.",
    whyUseIt: "Calculates your total inventory valuation and profit margins automatically in Naira.",
    whatToEnter: [
      { label: "Item Name & SKU", placeholder: "E.g. Luxury Velvet Gown - Black / Size M", advice: "Unique identifier for fast lookup." },
      { label: "Cost Price vs. Selling Price", placeholder: "E.g. Cost: ₦8,000 | Retail: ₦18,000", advice: "Calculates profit margin percentage." },
      { label: "Minimum Threshold", placeholder: "E.g. 5 units", advice: "Triggers dashboard warning when stock hits this level." }
    ],
    steps: [
      { step: 1, title: "Add Inventory Items", desc: "Go to Dashboard > Inventory > Add Item. Input product name, quantities, and cost/retail prices.", fieldExample: "Upload product photos for quick visual recognition." },
      { step: 2, title: "Set Restock Alerts", desc: "Define safety stock levels so you receive notifications before running out.", fieldExample: "Set threshold to 3-5 units for popular goods." },
      { step: 3, title: "Record Sales & Restocks", desc: "Update stock counts in one tap when sales occur online or in-store.", fieldExample: "Keep your valuation accurate." }
    ],
    expectedResult: {
      format: "Real-Time Stock Ledger & Margin Analytics",
      details: "Live stock counts, gross profit margin percentages, and total capital inventory valuation."
    },
    nextSteps: [
      "Sync your stock with your Directory and Sales Page products.",
      "Review weekly sales velocity to know which items to reorder in bulk."
    ],
    proTips: [
      "Audit your physical stock against the dashboard counts every Sunday evening."
    ],
    mockupType: "inventory"
  },
  {
    id: "wallet-rewards",
    title: "Wallet, Design Credits & Daily Login Rewards",
    category: "finance",
    categoryLabel: "Finance & Payouts",
    badge: "Earn Daily",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-500 via-teal-600 to-green-600",
    icon: Wallet,
    summary: "Claim daily login bonus rewards, earn commissions by viewing verified partner ads, and fund your wallet for graphic generation, logo design, and featured business boosts.",
    estimatedTime: "1 min",
    actionUrl: "/dashboard/wallet",
    actionLabel: "Open My Wallet",
    whatIsThis: "Your internal platform wallet that handles credits, earnings, advertising balances, and service payments.",
    problemSolved: "Need flexible micro-payments without entering card details every time you generate a design or run a boost.",
    whyUseIt: "Instant 1-tap credit authorization for all AI creative tools and ad monetization earnings.",
    whatToEnter: [
      { label: "Top-Up Amount", placeholder: "E.g. ₦1,000 or ₦5,000", advice: "Funds are credited instantly via Paystack or automated bank transfer." }
    ],
    steps: [
      { step: 1, title: "Claim Daily Attendance Reward", desc: "Log in daily to claim free points credited directly to your balance.", fieldExample: "Maintain a 7-day streak for maximum multiplier." },
      { step: 2, title: "Fund Wallet via Paystack", desc: "Navigate to Dashboard > Wallet > Top Up. Enter amount and complete instant checkout.", fieldExample: "Use bank transfer, debit card, or USSD." },
      { step: 3, title: "Use for Designs & Boosts", desc: "Flyers (₦25), Logos (₦50), AI Polish (₦10), and Directory Boosts deduct directly from your balance.", fieldExample: "Instant receipts saved in Dashboard > Receipts." }
    ],
    expectedResult: {
      format: "Secure Digital Balance + Downloadable Transaction Receipts",
      details: "Instant balance availability across all creator tools and automated earnings tracking."
    },
    nextSteps: [
      "Check Dashboard > Ad Earnings to view pay-per-click monetization opportunities.",
      "Track your promotional expenses via itemized receipts."
    ],
    proTips: [
      "Top up ₦2,000 to have enough credits for 80 professional commercial flyers!"
    ],
    mockupType: "wallet"
  },
  // UPCOMING ROADMAP FEATURES
  {
    id: "upcoming-whatsapp-bot",
    title: "AI WhatsApp Lead Auto-Responder (COMING SOON)",
    category: "upcoming",
    categoryLabel: "Upcoming Roadmap",
    badge: "COMING SOON",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    gradient: "from-amber-500 via-orange-600 to-yellow-600",
    icon: Bot,
    summary: "Automatically connect your WhatsApp Business account to our AI Assistant to respond to customer product inquiries, share prices, and book appointments 24/7.",
    estimatedTime: "Coming Q2",
    isUpcoming: true,
    whatIsThis: "An intelligent autonomous WhatsApp auto-responder trained specifically on your products, prices, delivery schedules, and store FAQs.",
    problemSolved: "Losing customers who message at night or when you are busy attending to physical clients. The AI replies in 3 seconds with accurate product details.",
    whyUseIt: "Zero missed sales, automated price quotes, and instant order logging into your dashboard.",
    whatToEnter: [
      { label: "WhatsApp Business Number", placeholder: "E.g. +234 801 234 5678", advice: "Connected via QR code pairing." }
    ],
    steps: [
      { step: 1, title: "Pair WhatsApp via QR Scan", desc: "Scan a pairing QR code in your dashboard to securely link your WhatsApp Business number.", fieldExample: "End-to-end encrypted connection." },
      { step: 2, title: "AI Ingests Your Catalog", desc: "The bot automatically reads your Directory products, prices, and FAQ policies.", fieldExample: "Learns delivery fees for Lagos, Abuja, etc." },
      { step: 3, title: "Autonomous 24/7 Customer Conversion", desc: "The AI answers customer DMs in natural Nigerian English and records orders directly into your dashboard.", fieldExample: "Handles product questions, price negotiation limits, and bank account transfers." }
    ],
    expectedResult: {
      format: "24/7 Autonomous WhatsApp Sales Agent",
      details: "Real-time chat log, customer contact capture, and automated order notifications."
    },
    nextSteps: [
      "Keep your product catalog and price list up-to-date in Dashboard > Directory.",
      "Get on the early beta tester list."
    ],
    proTips: [
      "Set your business opening hours and delivery fees in your profile so the bot quotes accurate shipping."
    ],
    mockupType: "whatsapp_bot"
  },
  {
    id: "upcoming-escrow",
    title: "Multi-Vendor Escrow & Buyer Protection (COMING SOON)",
    category: "upcoming",
    categoryLabel: "Upcoming Roadmap",
    badge: "COMING SOON",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    gradient: "from-blue-500 via-indigo-600 to-purple-600",
    icon: ShieldCheck,
    summary: "A secure escrow payment system that holds buyer funds safely until goods are delivered across Nigeria and confirmed, eliminating online fraud.",
    estimatedTime: "Coming Q3",
    isUpcoming: true,
    whatIsThis: "A trusted intermediary checkout engine that protects both buyers and sellers against online scams.",
    problemSolved: "Buyers refusing to pay before delivery, and sellers refusing to dispatch without upfront payment. Escrow satisfies both parties completely.",
    whyUseIt: "Eliminates payment-on-delivery risks, fake transfer alerts, and customer ghosting upon dispatch.",
    whatToEnter: [
      { label: "Dispatch Waybill / Tracking ID", placeholder: "E.g. GIGM-1029384", advice: "Proof of dispatch to unlock settlement." }
    ],
    steps: [
      { step: 1, title: "Buyer Pays into Secure Escrow", desc: "Customer deposits payment on your sales page; funds are locked in verified vault.", fieldExample: "Seller receives instant dispatch authorization." },
      { step: 2, title: "Merchant Dispatches Goods", desc: "Merchant sends item via verified courier partner and enters waybill number.", fieldExample: "Buyer receives live tracking link." },
      { step: 3, title: "Instant Payout Release", desc: "Upon delivery confirmation or buyer inspection, funds are released to your Nigerian bank account.", fieldExample: "Zero chargeback risk." }
    ],
    expectedResult: {
      format: "Fraud-Free Commercial Settlement Vault",
      details: "Protected payments, automated courier dispatch verification, and instant bank disbursement."
    },
    nextSteps: [
      "Ensure your CAC business verification is completed to qualify for lowest escrow fee tiers."
    ],
    proTips: [
      "Displaying the 'Verified Escrow Protected' badge on your sales page increases buyer checkout rate by 65%."
    ],
    mockupType: "escrow"
  }
];

export default function HowToGuide() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeGuideId, setActiveGuideId] = useState<string | null>("graphic-designer");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({});
  const [activeTabSection, setActiveTabSection] = useState<Record<string, "steps" | "inputs" | "result" | "tips">>({});
  const [selectedMockupGuide, setSelectedMockupGuide] = useState<FeatureGuide | null>(null);

  const filteredGuides = useMemo(() => {
    return GUIDES_DATA.filter((g) => {
      const matchesCategory = selectedCategory === "all" || g.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const inTitle = g.title.toLowerCase().includes(q);
      const inSummary = g.summary.toLowerCase().includes(q);
      const inCategory = g.categoryLabel.toLowerCase().includes(q);
      const inWhatIs = g.whatIsThis?.toLowerCase().includes(q);
      const inProblem = g.problemSolved?.toLowerCase().includes(q);
      const inSteps = g.steps.some((s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
      const inTips = g.proTips.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && (inTitle || inSummary || inCategory || inWhatIs || inProblem || inSteps || inTips);
    });
  }, [searchQuery, selectedCategory]);

  const handleVote = (id: string, isHelpful: boolean) => {
    setHelpfulVotes((prev) => ({ ...prev, [id]: isHelpful }));
  };

  const getActiveTab = (guideId: string) => {
    return activeTabSection[guideId] || "steps";
  };

  const setActiveTab = (guideId: string, tab: "steps" | "inputs" | "result" | "tips") => {
    setActiveTabSection((prev) => ({ ...prev, [guideId]: tab }));
  };

  // Visual Mockup Renderer for Platform UI
  const renderVisualMockup = (type: string, isUpcoming?: boolean) => {
    switch (type) {
      case "flyer_studio":
        return (
          <div className="w-full rounded-2xl bg-neutral-950 border border-amber-500/30 p-4 text-white space-y-3 font-sans shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-neutral-300 ml-1">AI Graphic Design Studio (1080x1350)</span>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-extrabold">6-Stage Pipeline</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 space-y-2 text-xs bg-neutral-900/80 p-3 rounded-xl border border-white/5">
                <div className="text-[10px] font-black uppercase text-amber-400">Brief & Archetype</div>
                <div className="p-2 rounded bg-black/40 border border-white/10 text-[11px] font-bold">Split-Hero Dynamic</div>
                <div className="p-2 rounded bg-black/40 border border-white/10 text-[10px] text-neutral-300">"50% FLASH SALE ON LACE"</div>
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-extrabold text-emerald-400">₦25,000 ONLY</div>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                  <span>Stock: Curated Nigeria</span>
                  <span className="text-amber-400 font-bold">300 DPI</span>
                </div>
              </div>
              <div className="sm:col-span-7 rounded-xl bg-gradient-to-br from-neutral-900 via-amber-950/50 to-neutral-900 p-3.5 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden min-h-[140px]">
                <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-[9px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.5 rounded">👑 VIP PROMO</span>
                  <span className="text-[10px] font-bold text-amber-300">LAGOS NIGERIA</span>
                </div>
                <div className="my-2">
                  <div className="text-sm sm:text-base font-black tracking-tight text-white leading-tight">EXCLUSIVE LACE COLLECTION</div>
                  <div className="text-[10px] text-amber-200/80 mt-0.5 font-medium">Free Delivery Across Ikeja & Lekki</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
                  <span className="font-black text-emerald-400">₦25,000</span>
                  <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[9px] flex items-center gap-1">
                    <MessageCircle className="h-2.5 w-2.5" /> WhatsApp Order
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case "logo_creator":
        return (
          <div className="w-full rounded-2xl bg-neutral-950 border border-yellow-500/30 p-4 text-white space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-neutral-200">Apollo Brand Vector Logo Suite (8 Concepts)</span>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-[10px]">SVG + PNG + Mockups</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { name: "Monogram", sym: "BG", sub: "Royal Gold" },
                { name: "Geometric", sym: "◆", sub: "Hex Shield" },
                { name: "Luxury Crest", sym: "♛", sub: "Emblem" },
                { name: "Wordmark", sym: "BETHELIN", sub: "Modern Sans" },
              ].map((c, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col items-center justify-center hover:border-yellow-400/50 transition-all">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-sm shadow-md">
                    {c.sym}
                  </div>
                  <div className="text-[10px] font-bold text-neutral-200 mt-1.5 truncate">{c.name}</div>
                  <div className="text-[8px] text-neutral-400">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "profile_qr":
        return (
          <div className="w-full rounded-2xl bg-card border p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-foreground">3D Public Profile (`/u/apexstudios`)</span>
              <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-500/30 font-bold">Link-in-Bio + QR</Badge>
            </div>
            <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                AS
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-black text-foreground">Apex Studios Nigeria</div>
                <div className="text-[10px] text-muted-foreground">Premier Commercial Photography & Branding • Lagos</div>
                <div className="flex items-center gap-2 pt-1 text-[9px] font-bold text-emerald-600">
                  <span>✓ Verified Supplier</span>
                  <span>• 1-Click WhatsApp</span>
                </div>
              </div>
              <div className="h-11 w-11 bg-white p-1 rounded-lg border shadow-xs shrink-0 flex items-center justify-center">
                <QrCode className="h-9 w-9 text-neutral-900" />
              </div>
            </div>
          </div>
        );
      case "directory_inquiry":
        return (
          <div className="w-full rounded-2xl bg-card border p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-foreground">Lagos Directory — Business Listing Inquiry Detail</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-bold">Verified Buyer Leads</Badge>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> New Inquiry from Chinedu O.</span>
                <span className="text-[10px] text-muted-foreground">2 mins ago</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                "Hello, I saw your listing on Bethelincovibe. Do you have bulk stock for iPhone 15 Pro 256GB at Computer Village today?"
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-2.5">
                  <MessageCircle className="h-3 w-3" /> Reply on WhatsApp (+234 803...)
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full rounded-2xl bg-muted/40 border border-border/80 p-4 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <div className="text-xs font-black text-foreground">Feature Control Center</div>
              <div className="text-[11px] text-muted-foreground">Production-ready visual module with real-time syncing</div>
            </div>
            {isUpcoming ? (
              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                COMING SOON
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] font-bold">
                Active Feature
              </Badge>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background pb-16">
      <Helmet>
        <title>Master How-To Guide & Feature Handbook | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Interactive, step-by-step master guides with Problem -> Action -> Result blueprints for every feature, tool, and upcoming capability on Bethelincovibe TV."
        />
      </Helmet>

      {/* Hero Header with 3D Gloss Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-primary/95 to-neutral-950 text-white pt-10 pb-16 px-4 sm:px-6 shadow-2xl rounded-b-[2.5rem] border-b border-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_55%)] pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10 space-y-6">
          {/* AI Presenter Persona Welcome Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-1 shadow-lg ring-4 ring-white/20">
                  <div className="w-full h-full rounded-[1.3rem] bg-neutral-900 flex items-center justify-center text-white overflow-hidden">
                    <span className="text-2xl sm:text-3xl">👩🏽‍💼</span>
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-neutral-900"></span>
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-300 font-extrabold text-[10px]">
                    Maya Sterling
                  </Badge>
                  <span className="text-xs text-amber-200/90 font-semibold">Lead Platform AI Guide &amp; Design Director</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                  "I don't know how to use technology." That's okay. I'll show you.
                </h1>
                <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed max-w-2xl">
                  Every tool on Bethelincovibe TV is simplified below into a <strong>Problem → Action → Result</strong> blueprint. Follow our simple steps to grow your business, launch sales flyers, design logos, and close WhatsApp leads.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
              <Button asChild size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl h-10 px-4 gap-1.5 shadow-md">
                <Link to="/dashboard/graphic-designer">
                  <Palette className="h-4 w-4" /> Try Graphic Designer
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl h-10 px-3.5">
                <Link to="/dashboard">
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto pt-1">
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-background text-foreground border border-white/30">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any tool or topic (e.g. flyer designer, logo creator, WhatsApp, inquiry, sales pages, QR code)..."
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
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 mt-8 space-y-8">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { key: "all", label: "All Guides (10+ Tools)" },
            { key: "graphic-design", label: "🎨 Graphic & Logo Studio" },
            { key: "getting-started", label: "👤 Public Profile & QR" },
            { key: "selling", label: "🚀 Sales Pages & Funnels" },
            { key: "directory", label: "🏢 Directory & Inquiries" },
            { key: "ai-tools", label: "🤖 AI Coach & Inventory" },
            { key: "finance", label: "💳 Wallet & Earnings" },
            { key: "upcoming", label: "⏳ Upcoming Roadmap (COMING SOON)" },
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
                We couldn't find any guides matching "{searchQuery}". Try searching for keywords like "flyer", "logo", "sales", "inquiry", or reset filters.
              </p>
              <Button size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                Reset Search Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Feature Guides List */}
        <div className="space-y-6">
          {filteredGuides.map((guide) => {
            const Icon = guide.icon;
            const isExpanded = activeGuideId === guide.id;
            const hasVoted = helpfulVotes[guide.id] !== undefined;
            const activeTab = getActiveTab(guide.id);

            return (
              <Card
                key={guide.id}
                id={`guide-${guide.id}`}
                className={`border transition-all duration-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg ${
                  isExpanded ? "border-primary/60 ring-2 ring-primary/15 shadow-md bg-card" : "border-border/80 bg-card hover:border-primary/30"
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
                      <Button asChild size="sm" className="font-black text-xs gap-1.5 shadow-md h-9 px-3.5 bg-primary hover:bg-primary/90">
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
                      {isExpanded ? "Collapse Guide" : "View Step-by-Step Blueprint"}
                    </Button>
                  </div>
                </div>

                {/* Expanded Problem -> Action -> Result Blueprint */}
                {isExpanded && (
                  <div className="border-t border-border/80 bg-muted/15 p-5 sm:p-7 space-y-6 animate-in fade-in-50 duration-200">
                    
                    {/* Live Platform Visual Mockup Card */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-primary" /> Real Platform UI Preview
                        </span>
                        <span className="text-[11px] text-muted-foreground font-semibold">Active Design Framework</span>
                      </div>
                      {renderVisualMockup(guide.mockupType, guide.isUpcoming)}
                    </div>

                    {/* Educational Problem -> Action -> Result 3-Column Brief */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                      {/* Column 1: What is this? */}
                      <div className="p-4 rounded-2xl bg-card border border-border/90 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-primary font-black text-xs uppercase tracking-wider">
                          <HelpCircle className="h-4 w-4" /> 1. What is this?
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
                          {guide.whatIsThis}
                        </p>
                      </div>

                      {/* Column 2: What Problem Does It Solve? */}
                      <div className="p-4 rounded-2xl bg-card border border-border/90 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-rose-500 font-black text-xs uppercase tracking-wider">
                          <AlertTriangle className="h-4 w-4" /> 2. Problem Solved
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
                          {guide.problemSolved}
                        </p>
                      </div>

                      {/* Column 3: Why Should I Use It? */}
                      <div className="p-4 rounded-2xl bg-card border border-border/90 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs uppercase tracking-wider">
                          <Target className="h-4 w-4" /> 3. Why Use It?
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
                          {guide.whyUseIt}
                        </p>
                      </div>
                    </div>

                    {/* Section Switcher Tabs */}
                    <div className="flex items-center gap-1.5 border-b pb-2 pt-2 overflow-x-auto">
                      <button
                        onClick={() => setActiveTab(guide.id, "steps")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                          activeTab === "steps"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        4. Step-by-Step Tutorial ({guide.steps.length})
                      </button>
                      <button
                        onClick={() => setActiveTab(guide.id, "inputs")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                          activeTab === "inputs"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        5. What Should I Enter?
                      </button>
                      <button
                        onClick={() => setActiveTab(guide.id, "result")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                          activeTab === "result"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        6. Result &amp; Next Steps
                      </button>
                      <button
                        onClick={() => setActiveTab(guide.id, "tips")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                          activeTab === "tips"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        7. Pro Tips &amp; FAQs
                      </button>
                    </div>

                    {/* TAB 1: STEPS */}
                    {activeTab === "steps" && (
                      <div className="space-y-3 animate-in fade-in-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {guide.steps.map((step) => (
                            <div
                              key={step.step}
                              className="p-4 rounded-2xl bg-card border border-border/90 shadow-xs flex items-start gap-3.5 hover:border-primary/40 transition-all"
                            >
                              <div className="h-7 w-7 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                {step.step}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-black text-foreground">{step.title}</h4>
                                <p className="text-xs font-medium text-foreground/85 leading-relaxed">{step.desc}</p>
                                {step.fieldExample && (
                                  <div className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md mt-1">
                                    💡 Example: {step.fieldExample}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB 2: INPUTS */}
                    {activeTab === "inputs" && (
                      <div className="space-y-3 animate-in fade-in-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {guide.whatToEnter.map((inp, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-card border border-border/90 space-y-1 shadow-xs">
                              <div className="text-xs font-black text-foreground">{inp.label}</div>
                              <div className="text-xs font-semibold text-primary bg-muted/60 px-2 py-1 rounded border border-border/60">
                                {inp.placeholder}
                              </div>
                              <p className="text-[11px] text-muted-foreground pt-1">{inp.advice}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: RESULT & NEXT STEPS */}
                    {activeTab === "result" && (
                      <div className="space-y-4 animate-in fade-in-50">
                        <div className="p-4 rounded-2xl bg-card border border-border/90 space-y-2 shadow-xs">
                          <div className="text-xs font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> What Result Will You Receive?
                          </div>
                          <div className="text-sm font-extrabold text-foreground">{guide.expectedResult.format}</div>
                          <p className="text-xs text-muted-foreground">{guide.expectedResult.details}</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-card border border-border/90 space-y-2 shadow-xs">
                          <div className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                            <Compass className="h-4 w-4" /> What Should You Do Next? (Action Plan)
                          </div>
                          <ul className="space-y-1.5 pl-5 list-disc text-xs font-medium text-foreground/90">
                            {guide.nextSteps.map((ns, idx) => (
                              <li key={idx} className="leading-relaxed font-semibold">{ns}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: PRO TIPS & FAQS */}
                    {activeTab === "tips" && (
                      <div className="space-y-4 animate-in fade-in-50">
                        {guide.proTips && guide.proTips.length > 0 && (
                          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2 shadow-xs">
                            <p className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> 💡 Senior Designer Pro Tips
                            </p>
                            <ul className="space-y-1.5 pl-5 list-disc text-xs font-medium text-amber-950 dark:text-amber-100">
                              {guide.proTips.map((tip, idx) => (
                                <li key={idx} className="leading-relaxed font-semibold">{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {guide.faqs && guide.faqs.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-black uppercase text-foreground tracking-wider">Common Questions</div>
                            <div className="space-y-2">
                              {guide.faqs.map((faq, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-card border text-xs space-y-1 shadow-xs">
                                  <p className="font-black text-foreground">Q: {faq.q}</p>
                                  <p className="text-muted-foreground">{faq.a}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback row */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground border-t border-border/70">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-foreground">Did this blueprint help you?</span>
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
                            Launch {guide.actionLabel || "Feature"} →
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
            Maya Sterling and our business support team are available 24/7. Ask questions in the Community Forum or chat directly with our AI Coach.
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
