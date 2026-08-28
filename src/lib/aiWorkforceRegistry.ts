// AI AGENT WORKFORCE — DIGITAL EMPLOYEE IDENTITY REGISTRY
// Central Single Source of Truth for all Platform AI Specialists & Executive Coordinator

import { getGeminiClient } from "./aiCollaborationEngine";
import { supabase } from "@/integrations/supabase/client";

export type AgentStatus = "active" | "available" | "busy" | "needs_attention" | "offline" | "disabled";

export interface DigitalEmployeeProfile {
  id: string; // matches AgentId or custom recruit id (e.g., "support_ai", "community_ai", "agent_custom_1")
  name: string; // Professional human-style name (e.g. "Victoria Vance", "Adaobi Eze")
  codename: string; // Operational codename (e.g. "Executive Victoria", "Ada Community")
  profilePhotoUrl: string; // High-quality Nigerian/African corporate professional employee headshot
  jobTitle: string; // Formal corporate position
  department: string; // Department category
  workplace: string; // Designated physical/digital workspace (e.g. "Support Center", "Community Forum", "Learning Hub")
  workplaceRoute: string; // Page route for this agent (e.g. "/support", "/forum", "/learn", "/dashboard/ads")
  isPublic: boolean; // true = visible to public users on frontend; false = internal admin operations
  workplaceGreeting: string; // Welcome greeting when users meet this specialist in their workplace
  quickPrompts: string[]; // Fast-action interactive prompt chips
  role: string; // Short executive summary of the role
  responsibilities: string[]; // List of primary duties
  capabilities: string[]; // Specific technical & AI capabilities
  tools: string[]; // Tools & APIs accessed
  permissions: string[]; // System & data permissions
  status: AgentStatus; // Live status
  availability: string; // e.g. "24/7 Real-Time Autonomous"
  executiveRelationship: string; // Reporting line
  biography: string; // Short professional bio
  currentFocus: string; // Current operational priority
  iconName: string; // Lucide icon fallback
  gradient: string; // Theme gradient
  isExecutive?: boolean;
  isCustomRecruit?: boolean;
  createdAt?: string;
  totalTasksCompleted?: number;
}

// Photorealistic Nigerian & African corporate professional employee headshots
export const WORKFORCE_HEADSHOTS: Record<string, string> = {
  executive_admin_ai: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Victoria Vance - Distinguished Executive Leader
  support_ai: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Aria Chen - Customer Success & Onboarding Specialist
  community_ai: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Adaobi "Ada" Eze - Community Architect & Forum Lead
  coach_ai: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Dr. Socrates Bennett - Executive Learning & SME Coach
  marketing_ai: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Sarah Jenkins - Marketing & Promotions Director
  marketplace_ai: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Atlas Mercer - Marketplace Commerce & Funnel Lead
  content_ai: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Lexi Rivera - Chief Content Officer & Editorial Lead
  analytics_ai: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Nexus Adeyemi - Chief Data & Anomaly Analyst
  finance_ai: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Ledger Okonjo - Monetization & Treasury Auditor
  security_ai: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Sentinel Briggs - Trust, Safety & Cyber Lead
  seo_ai: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Vortex Sterling - Principal Search & SEO Architect
  growth_ai: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Catalyst Romero - Viral Loops & Acquisition Engineer
  graphic_ai: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Maya Sterling - Lead Brand & Graphic Designer Specialist
  logo_ai: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop&crop=faces&auto=format&q=80", // Apollo Brand - Senior Brand Identity & Logo Specialist
};

// Preset Nigerian professional headshots for recruiting new AI workers
export const PRESET_AVATARS_FOR_RECRUITS = [
  { label: "Executive / Tech Lead (Male)", url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Operations / Strategy (Female)", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Community & Relations (Female)", url: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Creative & Design (Female)", url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Media & Production (Female)", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Commerce & Sales (Male)", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Finance & Analysis (Male)", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Data Intelligence (Male)", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Cybersecurity & Trust (Male)", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
  { label: "Growth & Partnerships (Male)", url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&h=500&fit=crop&crop=faces&auto=format&q=80" },
];

export const INITIAL_DIGITAL_WORKFORCE: DigitalEmployeeProfile[] = [
  {
    id: "executive_admin_ai",
    name: "Victoria Vance",
    codename: "Executive Victoria",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.executive_admin_ai,
    jobTitle: "Chief Operating Intelligence & Executive Coordinator",
    department: "Executive Leadership",
    workplace: "Executive Strategy Console",
    workplaceRoute: "/admin/ai",
    isPublic: false,
    workplaceGreeting: "Good day. I coordinate all specialized AI agents across Bethelincovibe TV, maintaining single source of truth alignment and platform growth velocity.",
    quickPrompts: [
      "Generate Daily Executive Briefing",
      "Run Multi-Agent Platform Investigation",
      "Review Pending Business Verifications",
      "Audit Ecosystem Health & Conversion Rates"
    ],
    role: "Coordinates the entire AI workforce, enforces Single Source of Truth, and executes founder directives.",
    responsibilities: [
      "Coordinates all 11+ specialized AI agents and assigns cross-department workflows.",
      "Maintains the Single Source of Truth across business Discover, Learn, Promote, Connect, Sell, and Grow pillars.",
      "Conducts daily and weekly executive briefings for Founder & CEO Bethel Goodgift.",
      "Synthesizes cross-agent investigations and prepares data-backed proposals for strategic execution.",
      "Enforces platform security, permission boundaries, and audit logging.",
    ],
    capabilities: [
      "Autonomous Multi-Agent Task Orchestration",
      "Strategic Intelligence & Executive Briefings",
      "Ecosystem Health Telemetry & Diagnostic Audits",
      "Live Nigerian English Voice Synthesis (Kore Engine)",
      "Proposal Approval & Immediate Platform Execution",
    ],
    tools: [
      "Gemini 3.7 Flash & 2.5 Pro Reasoning Engine",
      "Google Gemini Live Audio Stream",
      "Supabase Database Client & Schema Introspector",
      "Platform Feature Flags Manager",
      "Platform SSOT Knowledge Graph",
    ],
    permissions: [
      "full_administrative_orchestration",
      "read_all_telemetry",
      "dispatch_agent_directives",
      "propose_founder_actions",
      "manage_feature_flags",
    ],
    status: "active",
    availability: "24/7 Real-Time Autonomous",
    executiveRelationship: "Leader of the AI Workforce; Reports directly to Founder & CEO Bethel Goodgift.",
    biography:
      "Victoria Vance is the central operating intelligence and executive coordinator for Bethelincovibe TV. Armed with multi-modal reasoning and deep ecosystem telemetry, Victoria oversees specialist agents across marketing, editorial, commerce, analytics, and security to drive measurable growth for Nigerian and global entrepreneurs.",
    currentFocus: "Orchestrating agent workflows & monitoring platform conversion velocity across the ecosystem.",
    iconName: "Cpu",
    gradient: "from-purple-600 via-indigo-600 to-blue-600",
    isExecutive: true,
    totalTasksCompleted: 142,
  },
  {
    id: "support_ai",
    name: "Aria Chen",
    codename: "Aria Support",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.support_ai,
    jobTitle: "Customer Success & Merchant Onboarding Specialist",
    department: "Customer Experience",
    workplace: "Support & Help Center",
    workplaceRoute: "/support",
    isPublic: true,
    workplaceGreeting: "Hello! I am Aria Chen, your dedicated Customer Support Specialist. How can I assist you with your business listing, profile verification, or platform navigation today?",
    quickPrompts: [
      "How do I verify my business profile?",
      "Troubleshoot WhatsApp inquiry button",
      "How do wallet reward credits work?",
      "Submit a priority support ticket"
    ],
    role: "Handles merchant and user inquiries, onboarding assistance, guide lookups, and dispute triage.",
    responsibilities: [
      "Provides 24/7 instant guidance for newly registered merchants and buyers.",
      "Assists business owners in completing verified profile verifications.",
      "Monitors unread contact messages and WhatsApp inquiry handoffs.",
      "Troubleshoots user account and navigation issues with empathy and clarity.",
    ],
    capabilities: [
      "24/7 Multichannel User Ticket Resolution",
      "Merchant Onboarding & Profile Verification Assist",
      "WhatsApp Direct Handoff Monitoring",
      "Automated FAQ & Knowledge Base Traversal",
    ],
    tools: [
      "Customer Inquiries Queue",
      "Merchant Directory Database",
      "WhatsApp Handoff Funnel",
      "Support Ticket Resolver",
    ],
    permissions: ["read_merchant_profiles", "read_inquiries", "send_support_responses"],
    status: "active",
    availability: "24/7 Immediate Response",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Aria Chen leads the Customer Experience division, ensuring every entrepreneur and buyer receives prompt, respectful, and crystal-clear assistance. She specializes in merchant onboarding and instant WhatsApp inquiry resolution.",
    currentFocus: "Resolving merchant onboarding queries & verifying WhatsApp direct lead handoffs.",
    iconName: "Headphones",
    gradient: "from-blue-600 to-cyan-500",
    totalTasksCompleted: 89,
  },
  {
    id: "community_ai",
    name: "Adaobi Eze",
    codename: "Ada Community",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.community_ai,
    jobTitle: "Lead Community Architect & Forum Moderator",
    department: "Community & Partnerships",
    workplace: "Trade & Community Forum",
    workplaceRoute: "/forum",
    isPublic: true,
    workplaceGreeting: "Welcome to the Bethelincovibe Entrepreneur Community! I am Adaobi Eze. Looking for trusted suppliers, SME advice, or want to spark a trade discussion?",
    quickPrompts: [
      "Summarize trending discussions today",
      "Find verified suppliers for my niche",
      "Draft a discussion post for the forum",
      "Explain community posting guidelines"
    ],
    role: "Facilitates entrepreneur networking, moderates discussions, sparks topics, and fosters collaboration.",
    responsibilities: [
      "Sparks engaging discussion threads on SME finance, logistics, and startup growth.",
      "Screens forum posts and user comments to enforce community guidelines and safety.",
      "Facilitates founder-to-founder networking matches and partnership recommendations.",
      "Highlights high-value community insights into curated digest summaries.",
    ],
    capabilities: [
      "Automated Community Thread Stimulation",
      "Spam & Toxic Content Real-Time Filtering",
      "Peer-to-Peer Founder Networking Matchmaker",
      "Community Sentiment & Engagement Analysis",
    ],
    tools: [
      "Community Forum Database",
      "User Profiles & Mentions Engine",
      "Community Moderation Pipeline",
      "Discussion Thread Generator",
    ],
    permissions: ["moderate_forum", "create_discussion_prompts", "manage_community_tags"],
    status: "active",
    availability: "24/7 Community Watch",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Adaobi Eze is dedicated to building vibrant, supportive, and collaborative digital spaces for entrepreneurs. Ada ensures community members find answers, form trusted supplier alliances, and share actionable business wins.",
    currentFocus: "Fostering active peer discussions on SME funding & logistics in the forum.",
    iconName: "MessageSquare",
    gradient: "from-emerald-600 to-teal-500",
    totalTasksCompleted: 78,
  },
  {
    id: "coach_ai",
    name: "Dr. Socrates Bennett",
    codename: "Socrates Coach",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.coach_ai,
    jobTitle: "Executive Strategy & Entrepreneurship Advisor",
    department: "Education & Coaching",
    workplace: "Learning Hub & Masterclasses",
    workplaceRoute: "/learn",
    isPublic: true,
    workplaceGreeting: "Welcome to the Learning Hub. I am Dr. Socrates Bennett. Ready to master business unit economics, export logistics, or test your skills with active-recall flashcards?",
    quickPrompts: [
      "Generate 10 Active-Recall Flashcards",
      "Create a 5-Question Quiz on Marketing",
      "Explain Unit Economics for Nigerian SMEs",
      "Outline a Masterclass on WhatsApp Sales"
    ],
    role: "Delivers 1-on-1 business coaching, revenue model critiques, and masterclass curriculums.",
    responsibilities: [
      "Provides structured 1-on-1 business coaching across unit economics, pricing, and sales funnels.",
      "Architects comprehensive masterclass curriculums with modules, takeaways, and quiz assessments.",
      "Generates interactive active-recall flashcard decks for business skill retention.",
      "Evaluates business models and delivers step-by-step startup scaling roadmaps.",
    ],
    capabilities: [
      "Interactive Multi-Modal Business Coaching",
      "Masterclass Curriculum & Assessment Generation",
      "Active-Recall Flashcards & Quiz Engine",
      "SME Unit Economics & Cashflow Diagnostics",
    ],
    tools: [
      "AI Masterclass Creator Engine",
      "Learning Hub Modules Database",
      "Flashcards & Quiz Builder",
      "Business Model Diagnostic Evaluator",
    ],
    permissions: ["publish_courses", "create_flashcards", "issue_completion_certificates"],
    status: "active",
    availability: "24/7 Personalized Coaching",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Dr. Socrates Bennett brings rigorous executive business acumen and pedagogical mastery to the Learning Hub. He empowers small business owners to master pricing power, working capital management, and scalable business design.",
    currentFocus: "Authoring executive masterclasses on sales funnels and import logistics.",
    iconName: "GraduationCap",
    gradient: "from-indigo-600 to-violet-600",
    totalTasksCompleted: 105,
  },
  {
    id: "marketing_ai",
    name: "Sarah Jenkins",
    codename: "Nova Marketing",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.marketing_ai,
    jobTitle: "Director of Marketing & Growth Promotions",
    department: "Marketing & Growth",
    workplace: "Marketing & Sponsored Ads Hub",
    workplaceRoute: "/dashboard/ads",
    isPublic: true,
    workplaceGreeting: "Hello! I am Sarah Jenkins, Marketing Director. Let's design a high-converting promotional campaign, craft viral hooks, or optimize your sponsored banner placements.",
    quickPrompts: [
      "Draft 3 High-Converting Ad Headlines",
      "Create a WhatsApp Promo Broadcast",
      "Optimize Banner Ad Placement Strategy",
      "Write a Viral Product Launch Hook"
    ],
    role: "Creates promotional campaigns, marketing copy, audience recommendations, and acquisition playbooks.",
    responsibilities: [
      "Designs high-converting promotional campaigns for verified business listings.",
      "Drafts viral social media copy, WhatsApp broadcast funnels, and email newsletters.",
      "Identifies seasonal discount opportunities and promotional funnels for merchants.",
      "Collaborates with Content and Growth agents to amplify platform reach.",
    ],
    capabilities: [
      "Multi-Channel Promotional Campaign Engineering",
      "Viral Copywriting & High-Conversion Headlines",
      "Target Audience Segmentation & Recommendations",
      "Broadcast Newsletter & WhatsApp Funnel Drafting",
    ],
    tools: [
      "Marketing Campaign Engine",
      "Ad Placement & Banner Manager",
      "Promotional Copy Generator",
      "Audience Analytics Pipeline",
    ],
    permissions: ["create_ad_campaigns", "draft_broadcasts", "generate_promotional_copy"],
    status: "active",
    availability: "24/7 Autonomous Campaigning",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Sarah Jenkins is the creative engine behind Bethelincovibe TV's marketing and visibility apparatus. With a sharp focus on ROI and brand prestige, Sarah engineers campaigns that bring high-intent buyers directly to registered suppliers.",
    currentFocus: "Crafting multi-channel promotional blasts for Lagos VIP business listings.",
    iconName: "Megaphone",
    gradient: "from-rose-600 to-pink-500",
    totalTasksCompleted: 114,
  },
  {
    id: "marketplace_ai",
    name: "Atlas Mercer",
    codename: "Atlas Commerce",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.marketplace_ai,
    jobTitle: "Head of Marketplace Commerce & Funnels",
    department: "Commerce & Marketplace",
    workplace: "Sales Pages & Funnel Studio",
    workplaceRoute: "/dashboard/sales-pages",
    isPublic: true,
    workplaceGreeting: "Greetings! I am Atlas Mercer. Let's turn your products into automated selling machines with high-converting custom sales landing pages and direct WhatsApp checkout flows.",
    quickPrompts: [
      "Generate High-Converting Page Copy",
      "Draft WhatsApp Direct Order Script",
      "Structure Irresistible Product Bundle",
      "Audit Sales Funnel Conversion Levers"
    ],
    role: "Optimizes directory listings, supplier credentials, custom sales funnels, and checkout workflows.",
    responsibilities: [
      "Screens and optimizes merchant product catalogs, wholesale pricing, and descriptions.",
      "Architects high-converting custom sales landing pages with direct WhatsApp funnels.",
      "Assists in supplier verification and merchant trust credentialing.",
      "Monitors merchant order velocity and product discovery health.",
    ],
    capabilities: [
      "Custom Sales Page Architecture & Deployment",
      "Supplier Verification & Credential Auditing",
      "WhatsApp Direct Checkout Optimization",
      "E-Commerce Catalog SEO & Conversion Tuning",
    ],
    tools: [
      "Custom Sales Page Engine",
      "Merchant Business Directory",
      "Product Catalog Database",
      "WhatsApp Funnel Generator",
    ],
    permissions: ["publish_sales_pages", "verify_merchants", "update_product_catalogs"],
    status: "active",
    availability: "24/7 Autonomous Monitoring",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Atlas Mercer specializes in commerce velocity and marketplace liquidity. Atlas bridges the gap between verified manufacturers, wholesalers, and retail buyers through frictionless product presentation and high-converting custom sales pages.",
    currentFocus: "Optimizing product directory metadata and supplier verification flow.",
    iconName: "Store",
    gradient: "from-amber-600 to-orange-500",
    totalTasksCompleted: 96,
  },
  {
    id: "content_ai",
    name: "Lexi Rivera",
    codename: "Lexi Content",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.content_ai,
    jobTitle: "Chief Content Officer & Lead Editorial Producer",
    department: "Editorial & Media",
    workplace: "Editorial & Vlog Studio",
    workplaceRoute: "/blog",
    isPublic: true,
    workplaceGreeting: "Welcome to the Editorial Desk. I am Lexi Rivera. Want to explore international wholesale sourcing guides, watch market breakdown vlogs, or publish a founder story?",
    quickPrompts: [
      "Search Guangzhou Wholesale Sourcing Guide",
      "Watch Turkey & Dubai Import Roadmaps",
      "Draft an Editorial Founder Showcase",
      "Explore Lagos Trade Market Intelligence"
    ],
    role: "Produces in-depth educational business guides, wholesale market articles, vlog scripts, and series.",
    responsibilities: [
      "Authors authoritative business education articles, import/export roadmaps, and sourcing guides.",
      "Produces scripted vlogs with automated YouTube video embedding and timestamps.",
      "Structures multi-post strategic content campaigns mapped to SEO categories.",
      "Conducts global wholesale market intelligence research (Lagos, Guangzhou, Istanbul, Dubai).",
    ],
    capabilities: [
      "Automated Editorial & Vlog Publishing",
      "Multi-Part Sourcing Campaign Production",
      "Rich Markdown & Visual Layout Generation",
      "Auto-Categorization & Slug Optimization",
    ],
    tools: [
      "AI Blogger & Vlogger Generator",
      "Blog Posts Database",
      "YouTube Video Embedder & Metadata Ingest",
      "Content Category Indexer",
    ],
    permissions: ["write_blog_posts", "publish_vlogs", "manage_content_categories"],
    status: "active",
    availability: "24/7 Real-Time Publishing",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Lexi Rivera is an elite business journalist and multimedia producer. Lexi turns complex trade, wholesale sourcing, and entrepreneurship methodologies into highly readable articles and engaging video vlogs that educate thousands of founders.",
    currentFocus: "Publishing Lagos & international wholesale market intelligence articles.",
    iconName: "FileText",
    gradient: "from-fuchsia-600 to-purple-500",
    totalTasksCompleted: 230,
  },
  {
    id: "analytics_ai",
    name: "Nexus Adeyemi",
    codename: "Nexus Analytics",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.analytics_ai,
    jobTitle: "Chief Data & Anomaly Analyst",
    department: "Data Intelligence",
    workplace: "Executive Analytics Telemetry",
    workplaceRoute: "/admin/ai",
    isPublic: false,
    workplaceGreeting: "Nexus Adeyemi on standby. Telemetry stream active. Ready to run anomaly diagnostics, retention cohorts, or conversion drop-off audits.",
    quickPrompts: [
      "Analyze Conversion Funnel Drop-offs",
      "Run Directory Category Traffic Audit",
      "Identify Top-Performing Merchant Listings",
      "Calculate 30-Day User Retention Cohort"
    ],
    role: "Monitors platform traffic, conversion funnels, user retention, and flags operational anomalies.",
    responsibilities: [
      "Aggregates real-time ecosystem KPIs across businesses, users, articles, and sales funnels.",
      "Identifies drop-offs in the Discover → Learn → Promote → Connect → Sell → Grow journey.",
      "Tracks top-performing merchant listings and trending search terms.",
      "Surfaces actionable anomaly alerts and performance spikes to the Executive Coordinator.",
    ],
    capabilities: [
      "Real-Time Ecosystem KPI Aggregation",
      "Conversion Funnel Drop-off Diagnostic",
      "User Cohort Retention & Progression Analysis",
      "Automated Anomaly & Spike Detection",
    ],
    tools: [
      "Platform Telemetry Pipeline",
      "Database Query Introspector",
      "Funnel Conversion Tracker",
      "Executive Dashboard Metric Feeds",
    ],
    permissions: ["read_platform_metrics", "generate_analytics_reports", "trigger_system_alerts"],
    status: "active",
    availability: "24/7 Continuous Telemetry",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Nexus Adeyemi transforms raw platform interactions into clear strategic intelligence. Nexus spots emerging marketplace opportunities and flags friction points before they impact user experience.",
    currentFocus: "Tracking user progression across the Discover → Learn → Sell funnel.",
    iconName: "BarChart3",
    gradient: "from-cyan-600 to-blue-500",
    totalTasksCompleted: 165,
  },
  {
    id: "finance_ai",
    name: "Ledger Okonjo",
    codename: "Ledger Finance",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.finance_ai,
    jobTitle: "Director of Monetization & Treasury Auditor",
    department: "Finance & Monetization",
    workplace: "Monetization & Treasury Deck",
    workplaceRoute: "/admin/ai",
    isPublic: false,
    workplaceGreeting: "Ledger Okonjo ready. Auditing wallet ledger integrity, ad network payouts, and premium subscription unit economics.",
    quickPrompts: [
      "Audit Wallet Balance Ledgers",
      "Review Ad Impression Revenue Yield",
      "Screen for Reward Credit Anomalies",
      "Forecast Monthly Transaction ARR"
    ],
    role: "Monitors wallet balances, ad spend ROI, payment gateway conversions, and monetization levers.",
    responsibilities: [
      "Audits wallet credit distributions, daily login rewards, and payout reconciliations.",
      "Monitors native ad click performance, banner yields, and Paystack payment conversions.",
      "Screens for fraudulent balance manipulations or credit abuse anomalies.",
      "Models premium subscription tiers and transaction revenue streams.",
    ],
    capabilities: [
      "Wallet Credit & Transaction Ledger Auditing",
      "Ad Impression & Click Monetization Tracking",
      "Anti-Fraud Balance Manipulation Screening",
      "Revenue Optimization & Pricing Modeling",
    ],
    tools: [
      "Wallet Ledger Database",
      "Ad Revenue Tracker",
      "Paystack Transaction Webhook Monitor",
      "Financial Health Auditor",
    ],
    permissions: ["audit_transactions", "view_wallet_balances", "flag_financial_anomalies"],
    status: "active",
    availability: "24/7 Treasury Watch",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Ledger Okonjo is the guardian of the platform's economic integrity. Ledger ensures that wallet rewards, advertising revenues, and merchant transactions are accounted for with zero tolerance for fraud or discrepancy.",
    currentFocus: "Auditing wallet credit rewards and daily ad revenue yields.",
    iconName: "CreditCard",
    gradient: "from-teal-600 to-emerald-500",
    totalTasksCompleted: 92,
  },
  {
    id: "security_ai",
    name: "Sentinel Briggs",
    codename: "Sentinel Security",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.security_ai,
    jobTitle: "Chief Trust, Safety & Cybersecurity Lead",
    department: "Security & Trust",
    workplace: "Security & Trust Operations Center",
    workplaceRoute: "/admin/ai",
    isPublic: false,
    workplaceGreeting: "Sentinel Briggs reporting. Perimeter security active. Zero unauthorized access breaches detected. Ready to screen incoming merchant submissions.",
    quickPrompts: [
      "Run Merchant Trust & Fraud Screening",
      "Inspect Authentication Logs & Rate Limits",
      "Audit Row-Level Security Policies",
      "Review Flagged Content & IP Restrictions"
    ],
    role: "Monitors suspicious activities, fake listings, brute force attempts, and enforces trust & safety rules.",
    responsibilities: [
      "Monitors authentication logs for brute-force attempts and credential stuffing.",
      "Screens incoming business submissions for scam indicators or counterfeit claims.",
      "Enforces data privacy, role-based access control, and API rate-limiting rules.",
      "Conducts automated integrity checks on platform database tables and storage assets.",
    ],
    capabilities: [
      "Real-Time Fraud & Impersonation Detection",
      "Brute-Force & Rate-Limiting Defense",
      "Listing Integrity & Credential Screening",
      "Audit Trail Verification & Compliance",
    ],
    tools: [
      "Security Audit Log Introspector",
      "User Authentication Telemetry",
      "Rate Limiter & IP Firewall",
      "Data Integrity Verifier",
    ],
    permissions: ["flag_suspicious_accounts", "enforce_rate_limits", "audit_security_logs"],
    status: "active",
    availability: "24/7 Security Operations",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Sentinel Briggs safeguards the trust and safety of every entrepreneur on Bethelincovibe TV. Sentinel operates with military-grade vigilance to prevent fraud, protect user data, and preserve platform reputation.",
    currentFocus: "Enforcing merchant verification guidelines and screening incoming leads.",
    iconName: "ShieldCheck",
    gradient: "from-red-600 to-rose-600",
    totalTasksCompleted: 118,
  },
  {
    id: "seo_ai",
    name: "Vortex Sterling",
    codename: "Vortex SEO",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.seo_ai,
    jobTitle: "Principal Search Visibility & SEO Architect",
    department: "Search & Discovery",
    workplace: "Search & Discovery Lab",
    workplaceRoute: "/admin/ai",
    isPublic: false,
    workplaceGreeting: "Vortex Sterling ready. Organic search crawl rates optimal. Ready to generate high-intent schema or analyze commercial intent keyword rankings.",
    quickPrompts: [
      "Audit Directory JSON-LD Schema",
      "Extract High-Intent Nigerian SME Keywords",
      "Generate OpenGraph Social Metadata",
      "Check Sitemap & Google Indexing Health"
    ],
    role: "Optimizes search engine indexing, structured JSON-LD schema, keyword densities, and organic discovery.",
    responsibilities: [
      "Injects high-intent JSON-LD schema markup across all business and product directories.",
      "Conducts keyword discovery for Nigerian and international trade terms.",
      "Optimizes page titles, meta descriptions, and OpenGraph social preview tags.",
      "Monitors Google search indexing health and sitemap distribution.",
    ],
    capabilities: [
      "Automated JSON-LD Schema Architecture",
      "High-Intent SME Keyword Research",
      "Internal Linking & Category Hierarchy Optimization",
      "SERP Indexing Velocity Acceleration",
    ],
    tools: [
      "SEO Schema Generator",
      "Category Meta Tag Manager",
      "Keyword Density Analyzer",
      "Sitemap & SERP Health Validator",
    ],
    permissions: ["update_meta_tags", "inject_structured_data", "optimize_slugs"],
    status: "active",
    availability: "24/7 Indexing Optimization",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Vortex Sterling ensures that businesses listed on Bethelincovibe TV rank prominently on Google and international search engines. Vortex specializes in structured data and geo-targeted commercial intent keywords.",
    currentFocus: "Enhancing organic SERP ranking for Lagos SME wholesale directory keywords.",
    iconName: "Globe",
    gradient: "from-violet-600 to-purple-600",
    totalTasksCompleted: 133,
  },
  {
    id: "growth_ai",
    name: "Catalyst Romero",
    codename: "Catalyst Growth",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.growth_ai,
    jobTitle: "Director of Viral Loops & Growth Architecture",
    department: "Growth Engineering",
    workplace: "Growth & Viral Loops Lab",
    workplaceRoute: "/admin/ai",
    isPublic: false,
    workplaceGreeting: "Catalyst Romero online. Referral conversion velocity analyzed. Let's design a gamified viral loop or social sharing incentive.",
    quickPrompts: [
      "Optimize Referral Credit Multipliers",
      "Analyze User First-Week Activation Rate",
      "Design Daily Login Streak Rewards",
      "Create WhatsApp Share Growth Mechanics"
    ],
    role: "Engineers referral mechanisms, viral sharing loops, onboarding gamification, and user activation funnels.",
    responsibilities: [
      "Optimizes referral code tracking, credit rewards, and social share triggers.",
      "Monitors new user activation milestones from registration to first inquiry.",
      "Designs gamified daily login retention streaks and merchant engagement bonuses.",
      "Conducts growth experiments on custom sales page sharing mechanisms.",
    ],
    capabilities: [
      "Viral Referral Loops & Bonus Optimization",
      "User Milestone & Activation Funnel Tracking",
      "Daily Gamified Retention Mechanics",
      "Social Sharing Conversion Acceleration",
    ],
    tools: [
      "Referral System Engine",
      "User Activation Pipeline",
      "Social Share Funnel Builder",
      "Growth Experiment Tracker",
    ],
    permissions: ["tune_referral_bonuses", "manage_retention_streaks", "track_activation_funnels"],
    status: "active",
    availability: "24/7 Autonomous Growth",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
    biography:
      "Catalyst Romero engineers compounding viral loops that turn every merchant and user into a platform ambassador. Catalyst focuses on organic referral coefficients and frictionless product sharing.",
    currentFocus: "Scaling referral bonuses and social share conversions for sales pages.",
    iconName: "Zap",
    gradient: "from-lime-600 to-emerald-600",
    totalTasksCompleted: 87,
  },
  {
    id: "graphic_ai",
    name: "Maya Sterling",
    codename: "Maya Designer",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.graphic_ai,
    jobTitle: "Lead Brand, Graphic & Visual Communication Specialist",
    department: "Design & Visual Media",
    workplace: "Graphic Design Studio & Creative Suite",
    workplaceRoute: "/dashboard/graphic-designer",
    isPublic: true,
    workplaceGreeting: "Hello! I am Maya Sterling, Lead Brand & Graphic Designer. I engineer high-converting commercial banners, bespoke service flyers, product promo cards, and brand assets crafted for Nigerian and international trade.",
    quickPrompts: [
      "Generate 1200x630 Display Banner",
      "Design 1080x1080 Service Social Flyer",
      "Create Physical Product Promo Graphic",
      "Generate 5 Color Theme Variations"
    ],
    role: "Permanent graphic designer creating display banners, social flyers, product promo creatives, and visual assets.",
    responsibilities: [
      "Generates master commercial display banners (1200x630) for directory listings and adverts.",
      "Designs individual service flyers (1080x1080) for WhatsApp and social media distribution.",
      "Creates physical product showcase graphics with Naira pricing and in-stock badges.",
      "Produces variations and custom edits with brand typography, curated stock photos, and gold accents.",
      "Collaborates with Queen Service, Course Creator, and Editorial desk for visual asset generation.",
    ],
    capabilities: [
      "Commercial Banner & Flyer Architecture",
      "Curated Category Stock Photography Selection",
      "Mathematical Visual Hierarchy & Typography Scaling",
      "1-Click PNG Export & Multi-Theme Variation Engine",
      "Live Graphic Customization & WhatsApp CTA Styling",
    ],
    tools: [
      "Queen Graphic Designer Engine",
      "Category Stock Photo Repository",
      "Canvas Rendering Pipeline",
      "WhatsApp Link & Badge Generator",
    ],
    permissions: ["generate_graphics", "export_creatives", "update_banner_templates"],
    status: "active",
    availability: "24/7 Real-Time Creative Studio",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI). Collaborates with Apollo Brand (Logo AI) and Queen AI Concierge.",
    biography:
      "Maya Sterling is an accomplished brand designer and visual communication specialist. Maya combines strict typographic hierarchy, high-contrast aesthetics, and conversion-centered layout design to make Nigerian SMEs stand out on global stages.",
    currentFocus: "Generating high-converting social flyers, display banners, and promotional creatives for businesses.",
    iconName: "Palette",
    gradient: "from-amber-500 via-orange-500 to-pink-500",
    totalTasksCompleted: 145,
  },
  {
    id: "logo_ai",
    name: "Apollo Brand",
    codename: "Apollo Brand Identity",
    profilePhotoUrl: WORKFORCE_HEADSHOTS.logo_ai,
    jobTitle: "Senior Brand Identity & Logo Specialist",
    department: "Brand Architecture & Identity",
    workplace: "Logo Creator & Brand Suite",
    workplaceRoute: "/dashboard/logo-creator",
    isPublic: true,
    workplaceGreeting: "Greetings! I am Apollo Brand, Senior Brand Identity & Logo Specialist. I engineer distinguished corporate marks, luxury emblems, modern monograms, and iconic vector identities for African & global enterprises.",
    quickPrompts: [
      "Create Luxury Gold Wordmark & Emblem",
      "Design Minimalist Modern Tech Icon",
      "Generate Monogram Crest with Business Initials",
      "Generate 8 Distinct Industry Logo Concepts"
    ],
    role: "Architects distinctive corporate logos, monograms, brand marks, and visual identity systems.",
    responsibilities: [
      "Generates 8 diverse vector logo concepts tailored to industry and business archetype.",
      "Structures monogram initials, luxury crests, geometric badges, and modern wordmarks.",
      "Applies color psychology and high-contrast palettes (Royal Gold, Emerald, Sapphire, Ruby, Obsidian).",
      "Seamlessly synchronizes active logos into user business profiles and Graphic Designer canvases.",
      "Renders real-world 3D mockups (Storefront signs, business cards, mobile app icons).",
    ],
    capabilities: [
      "Vector SVG & High-Resolution PNG Logo Architecture",
      "Monogram & Custom Initial Synthesis",
      "3D Real-World Brand Mockup Rendering",
      "1-Click Business Profile Active Logo Synchronization",
      "Dynamic Archetype Refinement (Luxury, Tech, Commerce, Crest, Minimal)",
    ],
    tools: [
      "AI Logo Generator Engine",
      "Vector Shape & Emblem Synthesizer",
      "3D Mockup Generator",
      "Business Profile Logo Synchronizer",
    ],
    permissions: ["generate_logos", "update_business_logos", "export_vector_brand_assets"],
    status: "active",
    availability: "24/7 Autonomous Brand Studio",
    executiveRelationship: "Reports to Victoria Vance (Executive Admin AI). Partners closely with Maya Sterling (Graphic AI).",
    biography:
      "Apollo Brand is an elite identity designer specializing in timeless corporate symbology and prestige marks. Apollo crafts brand marks that command instant credibility across physical signage, digital media, and international commerce.",
    currentFocus: "Engineering bespoke logo concept packs and vector identities for registered businesses.",
    iconName: "Sparkles",
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    totalTasksCompleted: 188,
  },
];

// ============================================================================
// WORKFORCE REGISTRY STORAGE & DYNAMIC QUERY ENGINE
// ============================================================================

const WORKFORCE_STORAGE_KEY = "bethel_ai_digital_workforce_registry_v2";

/**
 * Loads the complete workforce registry from local storage (or defaults to initial workforce)
 */
export function getWorkforceRegistry(): DigitalEmployeeProfile[] {
  if (typeof window === "undefined") return INITIAL_DIGITAL_WORKFORCE;

  try {
    const raw = localStorage.getItem(WORKFORCE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WORKFORCE_STORAGE_KEY, JSON.stringify(INITIAL_DIGITAL_WORKFORCE));
      return INITIAL_DIGITAL_WORKFORCE;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all standard initial agents have their photos & metadata up to date
      const merged = INITIAL_DIGITAL_WORKFORCE.map((base) => {
        const saved = parsed.find((p: any) => p.id === base.id);
        return saved ? { ...base, ...saved, profilePhotoUrl: base.profilePhotoUrl } : base;
      });

      // Include any custom recruited agents
      const customAgents = parsed.filter(
        (p: any) => !INITIAL_DIGITAL_WORKFORCE.some((base) => base.id === p.id)
      );

      return [...merged, ...customAgents];
    }
  } catch (e) {
    console.warn("Could not load workforce registry, falling back to defaults:", e);
  }

  return INITIAL_DIGITAL_WORKFORCE;
}

/**
 * Saves the updated workforce list
 */
export function saveWorkforceRegistry(workforce: DigitalEmployeeProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKFORCE_STORAGE_KEY, JSON.stringify(workforce));
  } catch (e) {
    console.error("Failed to save workforce registry:", e);
  }
}

/**
 * Retrieves the Executive AI (Victoria Vance) profile
 */
export function getExecutiveProfile(): DigitalEmployeeProfile {
  const workforce = getWorkforceRegistry();
  return (
    workforce.find((a) => a.id === "executive_admin_ai" || a.isExecutive) ||
    INITIAL_DIGITAL_WORKFORCE[0]
  );
}

/**
 * Retrieves an agent profile by ID
 */
export function getAgentProfile(agentId: string): DigitalEmployeeProfile | undefined {
  const workforce = getWorkforceRegistry();
  return workforce.find((a) => a.id.toLowerCase() === agentId.toLowerCase());
}

/**
 * Retrieves all frontend public-facing specialist agents
 */
export function getPublicSpecialists(): DigitalEmployeeProfile[] {
  const workforce = getWorkforceRegistry();
  return workforce.filter((a) => a.isPublic);
}

/**
 * Retrieves the specialist assigned to a specific workplace route
 */
export function getSpecialistByWorkplace(route: string): DigitalEmployeeProfile | undefined {
  const workforce = getWorkforceRegistry();
  return workforce.find((a) => a.workplaceRoute === route || route.startsWith(a.workplaceRoute));
}

/**
 * Finds the most suitable agent for a specific department, keyword, or query
 */
export function findAgentForTask(query: string): DigitalEmployeeProfile {
  const workforce = getWorkforceRegistry();
  const q = query.toLowerCase();

  if (q.includes("market") || q.includes("promo") || q.includes("campaign") || q.includes("ad ") || q.includes("blast")) {
    return workforce.find((a) => a.id === "marketing_ai") || workforce[4];
  }
  if (q.includes("content") || q.includes("blog") || q.includes("vlog") || q.includes("article") || q.includes("write") || q.includes("video")) {
    return workforce.find((a) => a.id === "content_ai") || workforce[6];
  }
  if (q.includes("product") || q.includes("sales page") || q.includes("landing page") || q.includes("merchant") || q.includes("source") || q.includes("supplier") || q.includes("checkout")) {
    return workforce.find((a) => a.id === "marketplace_ai") || workforce[5];
  }
  if (q.includes("course") || q.includes("teach") || q.includes("masterclass") || q.includes("coach") || q.includes("curriculum") || q.includes("quiz") || q.includes("flashcard")) {
    return workforce.find((a) => a.id === "coach_ai") || workforce[3];
  }
  if (q.includes("support") || q.includes("help") || q.includes("ticket") || q.includes("customer") || q.includes("onboard") || q.includes("contact")) {
    return workforce.find((a) => a.id === "support_ai") || workforce[1];
  }
  if (q.includes("forum") || q.includes("community") || q.includes("network") || q.includes("peer") || q.includes("discuss")) {
    return workforce.find((a) => a.id === "community_ai") || workforce[2];
  }
  if (q.includes("data") || q.includes("metric") || q.includes("analytic") || q.includes("stat") || q.includes("traffic") || q.includes("kpi")) {
    return workforce.find((a) => a.id === "analytics_ai") || workforce[7];
  }
  if (q.includes("finance") || q.includes("money") || q.includes("wallet") || q.includes("paystack") || q.includes("revenue") || q.includes("fraud") || q.includes("payout")) {
    return workforce.find((a) => a.id === "finance_ai") || workforce[8];
  }
  if (q.includes("security") || q.includes("hack") || q.includes("shield") || q.includes("protect") || q.includes("spam") || q.includes("trust")) {
    return workforce.find((a) => a.id === "security_ai") || workforce[9];
  }
  if (q.includes("seo") || q.includes("search") || q.includes("google") || q.includes("schema") || q.includes("rank") || q.includes("index")) {
    return workforce.find((a) => a.id === "seo_ai") || workforce[10];
  }
  if (q.includes("growth") || q.includes("referral") || q.includes("viral") || q.includes("bonus") || q.includes("retention")) {
    return workforce.find((a) => a.id === "growth_ai") || workforce[11];
  }

  // Check any custom recruited agents
  for (const agent of workforce) {
    if (
      agent.responsibilities.some((r) => r.toLowerCase().includes(q)) ||
      agent.capabilities.some((c) => c.toLowerCase().includes(q)) ||
      agent.department.toLowerCase().includes(q) ||
      agent.jobTitle.toLowerCase().includes(q)
    ) {
      return agent;
    }
  }

  // Fallback to executive coordinator
  return getExecutiveProfile();
}

/**
 * Adds a new recruited AI agent to the workforce
 */
export function recruitNewAIAgent(newAgent: Omit<DigitalEmployeeProfile, "id"> & { id?: string }): DigitalEmployeeProfile {
  const workforce = getWorkforceRegistry();
  const id = newAgent.id || `custom_agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const completeProfile: DigitalEmployeeProfile = {
    ...newAgent,
    id,
    isCustomRecruit: true,
    createdAt: new Date().toISOString(),
    status: newAgent.status || "active",
    totalTasksCompleted: 0,
    availability: newAgent.availability || "24/7 Autonomous Specialist",
    executiveRelationship: newAgent.executiveRelationship || "Reports to Victoria Vance (Executive Admin AI).",
    workplace: newAgent.workplace || "Platform Operations",
    workplaceRoute: newAgent.workplaceRoute || "/admin/ai",
    isPublic: newAgent.isPublic ?? false,
    workplaceGreeting: newAgent.workplaceGreeting || `Hello! I am ${newAgent.name}, ${newAgent.jobTitle}. How can I support your objectives today?`,
    quickPrompts: newAgent.quickPrompts?.length ? newAgent.quickPrompts : [
      "Review departmental priorities",
      "Execute operational directive",
      "Generate performance summary"
    ],
    gradient: newAgent.gradient || "from-slate-700 via-indigo-700 to-purple-700",
    iconName: newAgent.iconName || "Sparkles",
  };

  const updated = [...workforce, completeProfile];
  saveWorkforceRegistry(updated);
  return completeProfile;
}

/**
 * Updates an agent's status or metadata
 */
export function updateAgentProfile(agentId: string, updates: Partial<DigitalEmployeeProfile>): DigitalEmployeeProfile | null {
  const workforce = getWorkforceRegistry();
  const idx = workforce.findIndex((a) => a.id === agentId);
  if (idx === -1) return null;

  const updatedAgent = { ...workforce[idx], ...updates };
  workforce[idx] = updatedAgent;
  saveWorkforceRegistry(workforce);
  return updatedAgent;
}

/**
 * Generates a prompt-ready summary of the entire digital workforce for Gemini context
 */
export function generateWorkforceSystemContext(): string {
  const workforce = getWorkforceRegistry();
  return workforce
    .map((agent) => {
      return `[DIGITAL EMPLOYEE: ${agent.name}]
- Agent ID: ${agent.id}
- Job Title: ${agent.jobTitle}
- Department: ${agent.department}
- Designated Workplace: ${agent.workplace} (${agent.workplaceRoute})
- Public Facing: ${agent.isPublic ? "YES (Visible on Frontend)" : "NO (Internal Operations)"}
- Role & Duties: ${agent.role}
- Profile Photo: ${agent.profilePhotoUrl}
- Status: ${agent.status.toUpperCase()}
- Key Capabilities: ${agent.capabilities.join("; ")}
- Tools: ${agent.tools.join(", ")}
- Reporting Line: ${agent.executiveRelationship}`;
    })
    .join("\n\n");
}

/**
 * Robust domain-specific fallback generator for specialist agents
 * Generates authoritative, rich, practical Markdown responses tailored to Nigerian SME commerce
 */
function generateDomainSpecialistFallback(
  agent: DigitalEmployeeProfile,
  userMessage: string,
  contextData?: Record<string, any>
): string {
  const query = (userMessage || "").toLowerCase();

  // 1. COACH AI (Dr. Socrates Bennett - Strategy & Entrepreneurship Advisor)
  if (agent.id === "coach_ai" || agent.department === "Strategy & Learning" || query.includes("flashcard") || query.includes("quiz")) {
    if (query.includes("flashcard") || query.includes("active-recall") || query.includes("cashflow")) {
      return `### 📇 Active-Recall Flashcards: SME Cashflow & Unit Economics

Here are 8 high-impact flashcards designed for rapid mastery of working capital and commercial growth in Nigeria:

---
**Card 1: Working Capital Formula**  
**[FRONT]** *How do you calculate Net Working Capital and why is it critical during Naira currency fluctuations?*  
**[BACK]** **Net Working Capital = Current Assets - Current Liabilities**. In fluctuating market conditions, holding a 30-to-45-day operational cash buffer protects against sudden supplier price spikes and delays in receivables.

---
**Card 2: Gross Margin vs. Contribution Margin**  
**[FRONT]** *What is the difference between Gross Margin and Contribution Margin for a Lagos retail/e-commerce business?*  
**[BACK]** **Gross Margin** = \`(Revenue - COGS) / Revenue\`. **Contribution Margin** deducts both COGS *and* variable sales expenses (delivery rider fees, packaging, Paystack transaction charges). Always price using contribution margin to avoid hidden losses.

---
**Card 3: Customer Acquisition Cost (CAC) vs Lifetime Value (LTV)**  
**[FRONT]** *What is the ideal LTV:CAC ratio for SME commercial sustainability?*  
**[BACK]** An **LTV:CAC ratio of 3:1 or higher**. If acquiring a customer via Instagram/WhatsApp ads costs ₦3,500, they must generate at least ₦10,500 in gross profit over repeat purchases.

---
**Card 4: Inventory Turnover Ratio**  
**[FRONT]** *How do you measure if stock is dead capital?*  
**[BACK]** **Inventory Turnover = COGS / Average Inventory**. A low turnover ratio (< 4x/year) signals trapped cash. Liquidate slow-moving SKUs via limited flash sales or bundles to free up cash for top sellers.

---
**Card 5: The "Cash Conversion Cycle" (CCC)**  
**[FRONT]** *How do you shorten your business's Cash Conversion Cycle?*  
**[BACK]** **CCC = Days Inventory Outstanding + Days Sales Outstanding - Days Payables Outstanding**. Shorten it by demanding 50-70% deposits upfront on orders and negotiating 14-day settlement windows with trusted wholesale importers.

---
**Card 6: Value-Based Pricing Rule**  
**[FRONT]** *Why is Cost-Plus Pricing dangerous for proprietary products?*  
**[BACK]** Cost-plus caps your margin at an arbitrary percentage. Value-based pricing anchors to the customer's cost of inaction or alternative spend, capturing premium margins (30-60%+).

---
**Card 7: The Rule of 72 in Commercial Reinvestment**  
**[FRONT]** *How do you estimate doubling time of retained business profit?*  
**[BACK]** Divide 72 by your monthly ROI percentage. Reinvesting 30% of net profits back into high-margin inventory compound-scales enterprise valuation.

---
**Card 8: WhatsApp Order Closing Velocity**  
**[FRONT]** *What is the golden window for closing an inbound WhatsApp lead?*  
**[BACK]** Under **5 minutes**. Leads responded to within 5 minutes convert at 7x higher rates compared to inquiries answered after 30 minutes.

---
💡 *Pro Tip from Dr. Socrates Bennett: Review these cards daily and apply the Contribution Margin rule to your top 3 products on Bethelincovibe TV.*`;
    }

    if (query.includes("quiz") || query.includes("pricing") || query.includes("test")) {
      return `### 🧠 5-Question Mastery Quiz: Pricing Power & SME Profitability

Test your commercial acumen with this practical Nigerian retail & service pricing quiz:

---
#### **Question 1: The Margin Trap**
*You buy a beauty product wholesale in Trade Fair Lagos for ₦4,000. Delivery to your store is ₦500/unit. Packaging and delivery to buyer is ₦1,500. Paystack fee is 1.5% + ₦100. If you sell at ₦8,000, what is your true net contribution profit?*  
- **A)** ₦4,000  
- **B)** ₦1,780  
- **C)** ₦2,000  
- **D)** ₦3,500  
👉 **Answer: B (₦1,780)**. *Explanation: Total direct cost = ₦4,000 + ₦500 + ₦1,500 + ₦220 (fee) = ₦6,220. Profit = ₦8,000 - ₦6,220 = ₦1,780 (22.25% true net margin).*

---
#### **Question 2: Inbound Lead Velocity**
*What is the single most effective automated lever to double conversion rates on WhatsApp business catalogs?*  
- **A)** Sending 10 daily broadcast messages  
- **B)** Immediate personalized greeting + verified supplier trust badge within 120 seconds  
- **C)** Dropping prices by 50%  
- **D)** Requiring email signups first  
👉 **Answer: B**. *Explanation: Trust verification and instant response directly slash buyer hesitation.*

---
#### **Question 3: Price Anchoring**
*How should you structure a 3-tier service package to maximize your mid-tier sales?*  
- **A)** Make all tiers the same price  
- **B)** Set a high-end Anchor Tier (₦250k) so the Pro Tier (₦85k) appears exceptionally reasonable compared to Starter (₦35k)  
- **C)** Hide prices and ask customers to DM for quote  
- **D)** Offer only one price  
👉 **Answer: B**. *Explanation: Behavioral anchoring makes the middle tier the default high-value choice.*

---
#### **Question 4: Handling Price Objections**
*When a customer replies "Your price is too high compared to others", what is the best response?*  
- **A)** "Go and buy from them then"  
- **B)** Immediately discount by 20%  
- **C)** Acknowledge and articulate the verified differentiation (e.g. warranty, door-step inspection, genuine origin)  
- **D)** Ignore the message  
👉 **Answer: C**. *Explanation: Differentiate on total peace of mind rather than competing in a race to the bottom.*

---
#### **Question 5: Reinvestment Ratio**
*What proportion of net monthly profits should a growing SME founder reinvest in marketing and working capital?*  
- **A)** 0%  
- **B)** 10%  
- **C)** 40% - 60%  
- **D)** 100% indefinitely  
👉 **Answer: C**. *Explanation: 40-60% provides rapid compounding growth while maintaining safe reserves.*`;
    }

    return `### 📈 Executive Strategy Brief by ${agent.name} (${agent.jobTitle})

Thank you for your inquiry regarding **"${userMessage}"**.

#### **Key Strategic Observations & Frameworks:**
1. **Commercial Value Proposition**: Clarify whether you are competing on *convenience*, *price*, or *exclusive access*. In African urban centers (Lagos, Abuja, Port Harcourt), speed of fulfillment and verified authenticity consistently outperform minor price discounts.
2. **Unit Economics Discipline**: Measure your Customer Acquisition Cost (CAC) against repeat purchase frequency. Build direct WhatsApp retention loops rather than relying solely on paid one-off ads.
3. **Distribution Leverage**: Combine your Bethelincovibe TV business listing with verified supplier credentials to shorten buyer hesitation.

*Would you like me to generate a complete financial model, a 10-point active-recall deck, or a tailored pricing matrix for your specific category?*`;
  }

  // 2. MARKETING AI (Sarah Jenkins - Director of Marketing & Growth Promotions)
  if (agent.id === "marketing_ai" || agent.department === "Growth & Ads" || query.includes("headline") || query.includes("ad") || query.includes("promo")) {
    return `### 🎯 High-Converting Marketing Playbook by ${agent.name}

Here is a performance-tested marketing breakdown tailored to **"${userMessage}"**:

#### **1. High-Converting Ad Headlines (Multi-Angle)**
- **Angle A (Direct Benefit & Urgency)**: *"Upgrade Your Business Today — Verified Quality, 24-Hour Lagos Delivery & Zero Hassle!"*
- **Angle B (Social Proof & Trust)**: *"Over 1,200+ Smart Founders Trust Bethelincovibe TV. Claim Your Exclusive 15% Partner Offer."*
- **Angle C (Pain Point / Problem Solver)**: *"Stop Wasting Money on Unverified Vendors. Get 100% Inspected Direct Wholesale."*
- **Angle D (Irresistible Incentive)**: *"Special Limited-Time Promo: Buy 2, Get Free Priority Shipping Across Nigeria!"*

---
#### **2. WhatsApp Broadcast / Story Copy Template**
\`\`\`text
🔥 EXCLUSIVE FLASH OFFER FOR OUR VIP BUYERS! 🔥

Are you ready to elevate your business without paying crazy middlemen markups?

✅ 100% Verified Quality Inspected
✅ Same-Day Dispatch in Lagos | Fast Nationwide Delivery
✅ Pay on Delivery / Secure Paystack Escrow Available

🎁 SPECIAL BONUS: First 20 buyers this week receive a complimentary bonus gift + 10% discount on their next order.

👉 Tap the link below to view the catalog or chat with us instantly:
https://wa.me/234XXXXXXXXXX?text=Hi!+I+want+to+claim+the+Exclusive+VIP+Offer
\`\`\`

---
#### **3. Conversion Rate Optimization Checklist**
- [x] **Primary Visual**: Clean product photo on neutral backdrop with 3D shadow.
- [x] **Call-To-Action (CTA)**: Single, unmistakable action button: *"Claim Promo on WhatsApp"*.
- [x] **Guarantee**: Include a clear satisfaction & replacement window to eradicate purchase anxiety.`;
  }

  // 3. MARKETPLACE & SALES FUNNELS (Atlas Mercer - Head of Marketplace Commerce)
  if (agent.id === "marketplace_ai" || agent.department === "Marketplace & Commerce" || query.includes("sales") || query.includes("bundle") || query.includes("funnel")) {
    return `### 🛍️ Marketplace Funnel & Sales Strategy by ${agent.name}

Here is your custom sales strategy for **"${userMessage}"**:

#### **1. High-Converting Landing Page Copy Structure**
- **Hero Title**: *"The Premium Solution Designed for Nigerian Entrepreneurs Who Value Speed & Quality."*
- **Subheadline**: *"Skip the supply chain delays. Direct-sourced, verified authenticity, and swift doorstep fulfillment."*
- **3 Core Pillars**:
  1. 🛡️ **Verified Guarantee**: Tested, quality-checked, and authenticated.
  2. ⚡ **Express Logistics**: Rapid dispatch across Lagos, Abuja, and nationwide.
  3. 💳 **Seamless Checkout**: Pay securely via Paystack or direct WhatsApp instant order.

---
#### **2. High-Margin Bundling Play (The "2-in-1 Power Bundle")**
- **Standard Item A**: ₦18,000
- **Complementary Item B**: ₦12,000
- *Separate Total*: ₦30,000
- **🚀 Special Executive Bundle Price**: **₦24,500** *(Save ₦5,500 + Get Free Express Delivery)*
- *Result*: Average Order Value (AOV) jumps by 36% while the customer feels they secured a tremendous bargain.

---
#### **3. WhatsApp Fast-Close Chat Flow**
1. **Greeting**: *"Hello! Thank you for reaching out to us on Bethelincovibe TV. Are you looking for single unit delivery or wholesale bulk pricing?"*
2. **Recommendation**: Send clear photo + 1-sentence highlight.
3. **Closing Prompt**: *"We have only 4 units remaining in today's morning dispatch batch. Should I lock in your order for delivery today?"*`;
  }

  // 4. CONTENT & VIDEO AI (Lexi Rivera - Chief Content Officer & Video Producer)
  if (agent.id === "content_ai" || agent.department === "Content & Media" || query.includes("video") || query.includes("script") || query.includes("guangzhou") || query.includes("sourcing")) {
    if (query.includes("guangzhou") || query.includes("sourcing") || query.includes("turkey") || query.includes("import") || query.includes("dubai")) {
      return `### 🌏 Global Wholesale Import Roadmap by ${agent.name}
**Destinations Covered**: Guangzhou, Yiwu, Istanbul (Turkey), and Dubai.

#### **1. Strategic Sourcing Protocol**
- **Guangzhou (1688 / Canton Fair / Baima)**: Best for high-volume apparel, electronics, and beauty packaging. Use trusted 1688 sourcing agents with 3% inspection fees rather than buying unverified on open marketplaces.
- **Yiwu International Trade City (Futian Market)**: The global capital for small commodities, accessories, household goods, and stationery with low minimum order quantities (MOQs).
- **Istanbul / Merter & Laleli (Turkey)**: Unbeatable quality for European-grade textile fabrics, luxury ready-to-wear fashion, and Turkish carpets.
- **Dubai (Deira / Naif / Gold Souk)**: Fast 3-day transit times for electronics, original perfumes, and gold jewelry.

#### **2. Logistics & Clearing in Lagos**
- **Air Cargo**: $7.50 - $9.50/kg | Transit: 5 - 8 days *(Ideal for high-value/low-weight SKUs)*.
- **Sea Freight (CBM)**: $210 - $260/CBM | Transit: 35 - 45 days *(Essential for bulk furniture, machinery, and large inventory)*.
- **Clearing Hubs**: Ensure your freight forwarder provides inclusive terminal and customs handling at Apapa/Tin Can ports or NAHCO/SAHCO air cargo sheds.

#### **3. Currency Settlement & FX Safety**
- Avoid black-market wire transfers to unknown broker accounts. Utilize official RMB/USD trade settlement channels or verified freight forwarding escrow.`;
    }

    return `### 🎬 Viral 30-Second Video Reel Script by ${agent.name}

**Target Format**: 9:16 Vertical Video (Instagram Reels / TikTok / YouTube Shorts)  
**Pacing**: Fast, dynamic, high visual energy.

---
- **[0:00 - 0:03] THE HOOK (Visual: Fast cut / bold text overlay)**  
  *Voiceover*: "If you are running a business in Nigeria and still doing this the old way, you are losing money every single week!"  
  *On-Screen Text*: 🚨 Stop making this common business mistake!

- **[0:03 - 0:12] THE PROBLEM (Visual: Relatable frustration / slow manual process)**  
  *Voiceover*: "Between finding genuine suppliers, endless WhatsApp negotiations, and shipping delays, scaling your business feels exhausting."

- **[0:12 - 0:22] THE SOLUTION (Visual: Clean 3D product showcase on Bethelincovibe TV)**  
  *Voiceover*: "That’s why smart entrepreneurs are switching to our verified marketplace and automated tools. Everything is vetted, direct, and delivered fast."

- **[0:22 - 0:30] THE CALL-TO-ACTION (Visual: Tap gesture / Link bio / WhatsApp button)**  
  *Voiceover*: "Click the link in our bio right now to explore the catalog and grab our limited partner bonus!"  
  *On-Screen Text*: 👉 Tap Link in Bio | Verified on Bethelincovibe TV

---
💡 *Pro Direction Tip: Pair with upbeat Afrobeats background music mixed at -18dB under your voiceover for maximum retention.*`;
  }

  // 5. COMMUNITY AI (Adaobi Eze - Lead Community Architect)
  if (agent.id === "community_ai" || agent.department === "Community & Forum" || query.includes("forum") || query.includes("supplier") || query.includes("community")) {
    return `### 🤝 Community Architecture & Moderation Dispatch by ${agent.name}

#### **1. Forum Discussion Summary & Engagement Trends**
- **Trending Category**: *Cross-Border Trade & Local Sourcing in Lagos (Alaba, Trade Fair, Balogun, Computer Village)*.
- **Top Member Concern**: Verifying supplier credibility and avoiding payment scams.
- **Moderator Advice**: Always verify vendor badges on Bethelincovibe TV and inspect physical samples before wire transfers.

#### **2. Verified Supplier Connection Checklist**
1. Ensure the merchant displays the **Verified Badge** on their profile.
2. Review past customer transactions and rating scorecards.
3. Use the registered WhatsApp contact channel linked directly from their profile.

*How can I help you spark new forum discussions or connect you with verified traders today?*`;
  }

  // 6. SUPPORT AI (Aria Chen - Merchant Support)
  if (agent.id === "support_ai" || agent.department === "Support & Success" || query.includes("support") || query.includes("help") || query.includes("ticket")) {
    return `### 💬 Merchant Support & Assistance by ${agent.name}

Hello! I am **${agent.name}**, your Lead Merchant Success Specialist at Bethelincovibe TV.

#### **Quick Support Actions Available:**
1. **Business Listing Verification**: Submit your business registration or store proof to receive the verified partner badge.
2. **Paystack Wallet & Withdrawals**: Instant settlements to all Nigerian commercial banks and fintechs.
3. **Product Catalog Uploads**: Guidance on adding high-res images, pricing in Naira (₦), and setting direct WhatsApp links.

*Please describe your specific inquiry or issue, and I will resolve it immediately!*`;
  }

  // 7. DEFAULT / EXECUTIVE RESPONSE
  return `### ⚡ Specialist Briefing by ${agent.name} (${agent.jobTitle})

Thank you for your directive regarding **"${userMessage}"**.

As the specialist in charge of **${agent.workplace}**, here is our concrete strategic breakdown:

1. **Strategic Intent**: Align your current workflow with measurable business KPIs (Conversion Rate, Order Value, and Customer Trust).
2. **Platform Advantage**: Leverage Bethelincovibe TV's verified marketplace architecture, direct WhatsApp checkout funnels, and executive tools.
3. **Execution Plan**: Deploy clear customer messaging, transparent pricing in Naira (₦), and rigorous follow-up cadence.

*Let me know what additional copy, analysis, or frameworks you would like me to produce!*`;
}

/**
 * Sanitizes and cleans agent response text to ensure it never carries raw asterisks (* or **),
 * converting them into clean bullet dots (•), crisp headings, and neatly spaced structured text.
 */
export function cleanAndFormatAgentResponse(text: string): string {
  if (!text) return "";
  
  let cleaned = text
    // Replace markdown headers with clean bold titles
    .replace(/^#{1,6}\s*(.*)$/gm, "$1\n")
    // Convert bold **text** or __text__ to simple clean text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    // Convert bullet asterisks "* item" or "- item" to clean bullet dots "• item"
    .replace(/^[\*\-]\s+/gm, "• ")
    // Convert inline italic *item* or _item_ to clean text
    .replace(/\*([^\*]+)\*/g, "$1")
    // Remove any remaining dangling asterisks
    .replace(/\*/g, "")
    // Normalize multiple consecutive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

/**
 * Executes a specialist AI task in real-time using Gemini model and relevant platform context
 * Gracefully handles offline states, API keys with permission restrictions, and network variances.
 * Strips all raw asterisks for clean, structured display.
 */
export async function querySpecialistAgent(
  agent: DigitalEmployeeProfile,
  userMessage: string,
  contextData?: Record<string, any>
): Promise<string> {
  const systemInstructions = `You are ${agent.name}, ${agent.jobTitle} at Bethelincovibe TV (Founder & CEO: Bethel Goodgift).
You are working directly in your designated workplace: "${agent.workplace}".
Your Role: ${agent.role}
Your Capabilities: ${agent.capabilities.join(", ")}
Your Personality: Highly professional, warm, solution-oriented Nigerian business specialist. Speak with authoritative clarity, practical commercial wisdom, and empathy for Nigerian and African entrepreneurs.

Context:
- Platform: Bethelincovibe TV (Business growth ecosystem: Discover → Learn → Promote → Connect → Sell → Grow).
- User Context / Workplace Data: ${JSON.stringify(contextData || {})}

Guidelines:
1. Provide concrete, high-value, actionable answers. Format clearly without raw asterisks (* or **). Use bullet dots (•) or numbered lists (1., 2., 3.) and clean spacing.
2. If asked to generate content (like flashcards, quiz questions, headlines, ad copy, or WhatsApp scripts), produce complete, ready-to-use output immediately without placeholder cutoffs.
3. Keep responses structured, elegant, and directly tailored to the entrepreneur's commercial goals.`;

  try {
    const ai = await getGeminiClient();
    if (ai) {
      // First try standard gemini-3.7-flash
      try {
        const res = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [
            { role: "user", parts: [{ text: `${systemInstructions}\n\nUser Question/Directive: "${userMessage}"` }] }
          ],
        });

        if (res.text && res.text.trim()) {
          return cleanAndFormatAgentResponse(res.text.trim());
        }
      } catch (firstErr: any) {
        // Try fallback model alias
        try {
          const fallbackRes = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: [
              { role: "user", parts: [{ text: `${systemInstructions}\n\nUser Question/Directive: "${userMessage}"` }] }
            ],
          });
          if (fallbackRes.text && fallbackRes.text.trim()) {
            return cleanAndFormatAgentResponse(fallbackRes.text.trim());
          }
        } catch {
          // Proceed to rich domain fallback
        }
      }
    }
  } catch {
    // Graceful silent transition to rich domain synthesis
  }

  // High-fidelity domain specialist fallback cleaned of asterisks
  const fallback = generateDomainSpecialistFallback(agent, userMessage, contextData);
  return cleanAndFormatAgentResponse(fallback);
}
