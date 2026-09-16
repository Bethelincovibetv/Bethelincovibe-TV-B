import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bot, Sparkles, Eye, Save, Loader2, TrendingUp, Zap, Clock, Link2, Trash2,
  Plus, Video, CheckCircle2, FileText, RefreshCw,
  Image as ImageIcon, PenTool, Play, Youtube, Check,
  ExternalLink, Building2, Briefcase
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getGeminiClient,
  conductStrategicBrainstorm,
  generateStrategicArticle,
  StrategicDirective,
  GeneratedArticle,
  TRENDING_MARKET_INTELLIGENCE,
  AffiliateReferralLink,
} from "@/lib/aiCollaborationEngine";
import { getCategoryImage } from "@/lib/categoryImages";
import { cn } from "@/lib/utils";

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function formatVideoEmbedUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // YouTube match
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}

// Curated high-resolution presets by category
const CURATED_IMAGE_PRESETS: Record<string, { label: string; url: string }[]> = {
  "Business & Startups": [
    { label: "Modern Corporate Center", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80" },
    { label: "African Entrepreneurs", url: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&auto=format&fit=crop&q=80" },
    { label: "Strategic Planning", url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80" },
    { label: "Lagos Hub", url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80" },
  ],
  "Tech & Innovation": [
    { label: "Digital Technology & AI", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80" },
    { label: "Hardware & Devices", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80" },
    { label: "Modern Workspace", url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80" },
  ],
  "Finance & Investment": [
    { label: "Financial Analytics & Charts", url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&auto=format&fit=crop&q=80" },
    { label: "Investment & Capital Growth", url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&auto=format&fit=crop&q=80" },
  ],
  "Wholesale & Sourcing": [
    { label: "Cargo Logistics & Trade", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80" },
    { label: "Market Warehouse & Stock", url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200&auto=format&fit=crop&q=80" },
  ],
  "Marketing & Growth": [
    { label: "Digital Marketing & Ads", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80" },
    { label: "E-Commerce & Online Store", url: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80" },
  ],
};

export default function AdminAIBlogger() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"generator" | "scheduler" | "referral-vlog">("generator");

  // --- Main AI Blogger Form State ---
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("casual");
  const [depth, setDepth] = useState<"standard" | "indepth" | "concise">("standard");
  const [categoryId, setCategoryId] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [embedVideoInPost, setEmbedVideoInPost] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInstantPublishing, setIsInstantPublishing] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isTestingAutoblog, setIsTestingAutoblog] = useState(false);
  const [publishedResult, setPublishedResult] = useState<{
    id?: string;
    title: string;
    slug: string;
    featured_image?: string;
    has_youtube?: boolean;
    excerpt?: string;
  } | null>(null);

  // Generated post state for review and live-editing
  const [preview, setPreview] = useState<{
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featured_image: string;
    category_id: string;
    tags: string[];
    video_url?: string;
  } | null>(null);

  const [previewEditMode, setPreviewEditMode] = useState<"rendered" | "source">("rendered");

  // Business Public Profile & Service Listing Embedding State
  const [embedBusinessProfile, setEmbedBusinessProfile] = useState<boolean>(true);
  const [selectedBusinessSlug, setSelectedBusinessSlug] = useState<string>("auto");
  const [includeServiceListings, setIncludeServiceListings] = useState<boolean>(true);

  // Fetch verified businesses from directory for AI Blogger injection
  const { data: businessDirectory = [] } = useQuery({
    queryKey: ["admin-ai-blogger-suppliers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, slug, description, logo_url, rating, verified, services, categories(name)")
        .eq("active", true)
        .order("rating", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "blog");
      return data ?? [];
    },
  });

  // --- Autoblog Schedule State ---
  const { data: schedule, refetch: refetchSchedule } = useQuery({
    queryKey: ["autoblog-schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("autoblog_schedule").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: scheduleCats, refetch: refetchScheduleCats } = useQuery({
    queryKey: ["autoblog-categories", schedule?.id],
    enabled: !!schedule?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("autoblog_categories")
        .select("category_id")
        .eq("schedule_id", schedule!.id);
      return (data || []).map((d: any) => d.category_id);
    },
  });

  const updateSchedule = async (patch: any) => {
    if (schedule?.id) {
      const { error } = await supabase.from("autoblog_schedule").update(patch).eq("id", schedule.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("autoblog_schedule").insert({
        enabled: patch.enabled ?? false,
        interval_hours: patch.interval_hours ?? 24,
        keywords: patch.keywords ?? "",
        category_id: patch.category_id ?? null,
        mode: patch.mode ?? "single",
        posts_per_run: patch.posts_per_run ?? 1,
        auto_approve: patch.auto_approve ?? true,
      });
      if (error) throw error;
    }
    refetchSchedule();
    toast.success("Autoblog schedule updated successfully");
  };

  const toggleCategory = async (catId: string, checked: boolean) => {
    if (!schedule?.id) {
      await updateSchedule({ enabled: false });
      setTimeout(() => toggleCategory(catId, checked), 300);
      return;
    }
    if (checked) {
      await supabase.from("autoblog_categories").insert({ schedule_id: schedule.id, category_id: catId });
    } else {
      await supabase.from("autoblog_categories").delete().eq("schedule_id", schedule.id).eq("category_id", catId);
    }
    refetchScheduleCats();
  };

  // Trigger Autoblog Run Now
  const handleTriggerAutoblogNow = async () => {
    setIsTestingAutoblog(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-blogger", {
        body: { runNow: true, scheduleId: schedule?.id },
      });
      if (error) throw error;
      toast.success(data?.message || "Autoblog executed successfully! Check 'Manage All Posts' for the new article.");
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    } catch (e: any) {
      toast.error("Autoblog trigger failed: " + (e.message || "Unknown error"));
    } finally {
      setIsTestingAutoblog(false);
    }
  };

  // --- Referral & Affiliate Links State (Secondary Tab) ---
  const { data: affiliateLinks = [], refetch: refetchAffiliates } = useQuery({
    queryKey: ["affiliate-links-manager"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as AffiliateReferralLink[];
    },
  });

  const [newAff, setNewAff] = useState({ label: "", url: "", keywords: "", description: "" });
  const [isAddingAff, setIsAddingAff] = useState(false);
  const [activeDirective, setActiveDirective] = useState<StrategicDirective | null>(null);
  const [brainstormTheme, setBrainstormTheme] = useState("Lagos SME Scaling, Verified Sourcing, Tech & Real Estate");
  const [brainstormCount, setBrainstormCount] = useState<number>(3);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [batchGeneratedPosts, setBatchGeneratedPosts] = useState<GeneratedArticle[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);

  const addAffiliate = async () => {
    if (!newAff.label.trim() || !newAff.url.trim()) {
      return toast.error("Label and destination URL are required");
    }
    setIsAddingAff(true);
    try {
      const kwList = newAff.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const { error } = await supabase.from("affiliate_links").insert({
        label: newAff.label.trim(),
        url: newAff.url.trim(),
        keywords: kwList.length > 0 ? kwList : [newAff.label.toLowerCase().trim()],
        description: newAff.description.trim() || null,
        active: true,
      });
      if (error) throw error;

      setNewAff({ label: "", url: "", keywords: "", description: "" });
      refetchAffiliates();
      toast.success("Referral partner link added successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add affiliate link");
    } finally {
      setIsAddingAff(false);
    }
  };

  const deleteAffiliate = async (id: string) => {
    try {
      const { error } = await supabase.from("affiliate_links").delete().eq("id", id);
      if (error) throw error;
      refetchAffiliates();
      toast.success("Referral link deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Trending Topics Query & Selection Handler
  const handleSelectTrendingTopic = (item: { topic: string; category?: string; keywords?: string[]; isVlog?: boolean; videoUrl?: string }) => {
    setTopic(item.topic);
    if (item.keywords && item.keywords.length > 0) {
      setKeywords(item.keywords.join(", "));
    } else {
      generateKeywordsFromTopic(item.topic);
    }

    if (item.category) {
      const match = categories.find((c: any) => c.name.toLowerCase() === item.category?.toLowerCase());
      if (match) setCategoryId(match.id);
    }

    if (item.videoUrl) {
      setVideoUrl(item.videoUrl);
      setEmbedVideoInPost(true);
    }
    toast.success(`Loaded "${item.topic.slice(0, 45)}..." with targeted keywords!`);
  };

  // AI / Intelligent Keyword Generator from Topic
  const generateKeywordsFromTopic = (topicText?: string) => {
    const raw = (topicText || topic).trim();
    if (!raw) {
      toast.error("Please enter a topic first to generate targeted keywords.");
      return;
    }

    // Smart keyword taxonomy extraction
    const words = raw
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["with", "from", "that", "this", "what", "where", "guide", "strategy", "2026"].includes(w.toLowerCase()));

    const baseKeywords: string[] = [];
    const lower = raw.toLowerCase();

    if (lower.includes("turkey") || lower.includes("istanbul") || lower.includes("laleli")) {
      baseKeywords.push("Turkey Wholesale", "Istanbul Sourcing", "Laleli Market", "Merter Textile", "Cargo Turkey to Nigeria", "Direct Factory Import");
    } else if (lower.includes("china") || lower.includes("1688") || lower.includes("guangzhou")) {
      baseKeywords.push("China 1688", "Guangzhou Wholesale", "Procurement Agent", "Air Cargo Lagos", "Yuan Payment", "Factory Direct");
    } else if (lower.includes("dubai") || lower.includes("deira") || lower.includes("perfume")) {
      baseKeywords.push("Dubai Wholesale", "Deira Market", "Perfume Oil Import", "Dubai Cargo Lagos", "Gold Sourcing");
    } else if (lower.includes("thrift") || lower.includes("okrika") || lower.includes("bale")) {
      baseKeywords.push("UK Bale Clothes", "Okrika Wholesale", "First Grade Bales", "Lagos Boutique Sourcing", "Thrift Profit Margin");
    } else if (lower.includes("alaba") || lower.includes("trade fair") || lower.includes("computer village")) {
      baseKeywords.push("Wholesale Nigeria", "Alaba Market", "Electronics Sourcing", "Verified Suppliers Lagos", "Trade Fair Complex");
    } else if (lower.includes("solar") || lower.includes("inverter") || lower.includes("energy")) {
      baseKeywords.push("Solar Power Lagos", "Business Energy Cost", "Inverter Battery", "Cost Reduction", "Solar Sourcing");
    } else if (lower.includes("whatsapp") || lower.includes("sales") || lower.includes("marketing")) {
      baseKeywords.push("WhatsApp Marketing", "Lagos Sales", "Automated Catalog", "Customer Retention", "High-Ticket Closing");
    } else {
      // General business extraction
      baseKeywords.push(raw.slice(0, 30), "Nigerian Business", "Wholesale Sourcing", "Lagos Commerce", "Profit Strategy");
    }

    // Add salient words from title
    words.slice(0, 3).forEach((w) => {
      const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      if (!baseKeywords.some((k) => k.toLowerCase().includes(w.toLowerCase()))) {
        baseKeywords.push(cap);
      }
    });

    const generated = baseKeywords.slice(0, 6).join(", ");
    setKeywords(generated);
    toast.success("AI generated targeted SEO & commercial keywords!");
  };

  const WORLD_MARKET_PRESETS = [
    {
      label: "🇹🇷 Turkey Fashion & Textile",
      topic: "Turkey Sourcing & Istanbul Laleli Wholesale Fashion Import Guide (2026)",
      category: "Wholesale & Sourcing",
      keywords: ["Turkey Wholesale", "Istanbul Sourcing", "Laleli Market", "Merter Wholesale", "Cargo Turkey to Lagos", "Turkish Textile"],
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      label: "🇨🇳 China 1688 Factory Direct",
      topic: "China 1688 & Guangzhou Factory Direct Import Guide for Nigerian Sellers",
      category: "Wholesale & Sourcing",
      keywords: ["China 1688", "Guangzhou Wholesale", "Procurement Agent", "Air Cargo Lagos", "Yuan Exchange", "Factory Direct"],
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      label: "🇦🇪 Dubai Deira & Perfumes",
      topic: "Dubai Deira Wholesale Perfume, Electronics & Luxury Gold Import Playbook",
      category: "Wholesale & Sourcing",
      keywords: ["Dubai Wholesale", "Deira Market", "Perfume Oil Import", "Dubai Cargo Lagos", "Gold Souk Sourcing"],
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      label: "🇬🇧 UK & US Okrika Bales",
      topic: "UK & US First Grade Thrift Bales (Okrika) Sourcing & Import Guide",
      category: "Wholesale & Sourcing",
      keywords: ["UK Bale Clothes", "Okrika Wholesale", "First Grade Bales", "Lagos Boutique", "Thrift Fashion Profit"],
    },
    {
      label: "🇳🇬 Lagos Market Powerhouses",
      topic: "Wholesale Sourcing & Verified Suppliers in Alaba & Computer Village",
      category: "Marketplace & Directory",
      keywords: ["Wholesale Nigeria", "Alaba Market", "Electronics Sourcing", "Verified Suppliers", "Imports"],
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
  ];

  const fetchTrendingTopics = async () => {
    try {
      const { data } = await supabase.functions.invoke("ai-blogger", {
        body: { useTrending: "list", keywords, categoryId: categoryId || undefined },
      });
      if (data?.trending && Array.isArray(data.trending)) {
        setTrendingTopics(data.trending);
      } else {
        setTrendingTopics(TRENDING_MARKET_INTELLIGENCE.map((t) => t.topic));
      }
      toast.success("Trending business topics loaded!");
    } catch {
      setTrendingTopics(TRENDING_MARKET_INTELLIGENCE.map((t) => t.topic));
      toast.success("Trending business topics loaded!");
    }
  };

  // =========================================================================
  // CORE AUTOBLOGGER PUBLISHING PIPELINE (Exact AI Autoblogger Engine)
  // =========================================================================

  // Helper to construct rich autoblogger article content if fallback is needed
  const buildAutoblogFallbackContent = async (postTopic: string, catName: string, kwList: string[]) => {
    const cleanedTitle = postTopic.trim().replace(/^["']|["']$/g, "");
    const formattedSlug = generateSlug(cleanedTitle);

    // Fetch supplier links for backlink injection
    let supplierLinks: { name: string; slug: string }[] = [];
    try {
      const { data } = await supabase
        .from("suppliers")
        .select("name, slug")
        .eq("status", "approved")
        .eq("active", true)
        .limit(10);
      supplierLinks = data || [];
    } catch {}

    // Fetch affiliate links
    let affLinks: { label: string; url: string }[] = [];
    try {
      const { data } = await supabase
        .from("affiliate_links")
        .select("label, url")
        .eq("active", true)
        .limit(5);
      affLinks = data || [];
    } catch {}

    const selectedImage =
      customImageUrl.trim() ||
      getCategoryImage(catName) ||
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80";

    const formattedEmbedVideo = videoUrl.trim() ? formatVideoEmbedUrl(videoUrl) : "";

    let html = "";

    // 1. Lead paragraph
    html += `<p class="lead text-lg font-medium text-foreground/90 leading-relaxed mb-6">In today's fast-evolving Nigerian and African commercial landscape, mastering <strong>${cleanedTitle}</strong> has become a vital strategic advantage for ambitious entrepreneurs, corporate executives, and trade operators seeking scalable business growth.</p>`;

    // 2. Table of Contents
    html += `<nav aria-label="Table of Contents" class="my-6 p-5 rounded-2xl bg-muted/40 border border-border/80">
  <h2 class="text-sm font-extrabold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
    📑 Table of Contents
  </h2>
  <ul class="space-y-1.5 text-xs text-primary font-medium pl-4 list-disc">
    <li><a href="#section-1" class="hover:underline">1. Market Dynamics & Growth Fundamentals in ${catName}</a></li>
    <li><a href="#section-2" class="hover:underline">2. Proven Step-by-Step Scaling & Operational Checklist</a></li>
    <li><a href="#section-3" class="hover:underline">3. Financial Risk Management & Margin Optimization</a></li>
    <li><a href="#section-faq" class="hover:underline">4. Frequently Asked Questions (FAQ)</a></li>
  </ul>
</nav>`;

    // 3. Key Takeaways Aside Box
    html += `<aside aria-label="Key Takeaways" style="background:#faf5ff;border:1px solid #e9d5ff;border-left:5px solid #8b5cf6;border-radius:14px;padding:18px 20px;margin:24px 0">
  <h3 style="margin:0 0 10px 0;font-size:1.05rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#7c3aed">
    💡 Executive Takeaways & Key Insights
  </h3>
  <ul style="margin:0;padding-left:1.2rem;color:#1e1b4b;line-height:1.6;font-size:0.925rem">
    <li><strong>Commercial Acceleration:</strong> Rapid digital adoption across Lagos, Abuja, and regional trade hubs is lowering customer acquisition hurdles.</li>
    <li><strong>Sourcing Integrity:</strong> Partnering directly with accredited suppliers and manufacturers reduces operational bottlenecks by up to 35%.</li>
    <li><strong>Distribution Automation:</strong> Leveraging multi-channel digital catalogs, video walkthroughs, and instant WhatsApp inquiry flows drives predictable recurring cash flow.</li>
  </ul>
</aside>`;

    // 4. Section 1: Market Fundamentals
    html += `<h2 id="section-1" class="text-2xl font-black tracking-tight text-foreground mt-8 mb-4 border-b pb-2">1. Market Dynamics & Growth Fundamentals in ${catName}</h2>
<p class="text-base text-foreground/85 leading-relaxed mb-4">Navigating the nuances of ${catName} demands an acute understanding of customer acquisition costs, supplier verification, and logistical execution. Industry veterans across commercial hubs emphasize that businesses prioritizing verified credibility consistently outperform competitors relying strictly on sporadic promotions.</p>
<p class="text-base text-foreground/85 leading-relaxed mb-4">When scaling operations, maintaining cash flow velocity while automating repetitive sales follow-ups enables your enterprise to withstand macroeconomic headwinds and capture emerging market share.</p>`;

    // Optional Embedded Video
    if (formattedEmbedVideo && embedVideoInPost) {
      html += `<div class="my-6 aspect-video w-full rounded-2xl overflow-hidden shadow-lg border bg-black">
  <iframe src="${formattedEmbedVideo}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`;
    }

    // 5. Section 2: Implementation Checklist
    html += `<h2 id="section-2" class="text-2xl font-black tracking-tight text-foreground mt-8 mb-4 border-b pb-2">2. Proven Step-by-Step Scaling & Operational Checklist</h2>
<p class="text-base text-foreground/85 leading-relaxed mb-4">To execute these principles effectively, implement this structured four-phase operational roadmap:</p>
<ul class="list-disc pl-6 space-y-2.5 mb-6 text-foreground/85">
  <li><strong>Phase 1: Demand & Price Point Validation</strong> — Confirm actual buyer willingness to pay using lean status broadcasts and sample catalogs before deploying heavy capital.</li>
  <li><strong>Phase 2: Verified Sourcing & Quality Control</strong> — Partner with accredited manufacturers and wholesale suppliers to protect gross profit margins and product consistency.</li>
  <li><strong>Phase 3: Omnichannel Visibility & Sales Pages</strong> — Launch dedicated product pages, video demos, and responsive WhatsApp inquiry funnels to capture inbound leads around the clock.</li>
  <li><strong>Phase 4: Retention & Re-order Automation</strong> — Implement structured post-purchase follow-up loops to compound customer lifetime value and drive organic referrals.</li>
</ul>`;

    // 6. Section 3: Risk Management
    html += `<h2 id="section-3" class="text-2xl font-black tracking-tight text-foreground mt-8 mb-4 border-b pb-2">3. Financial Risk Management & Margin Optimization</h2>
<p class="text-base text-foreground/85 leading-relaxed mb-4">Many emerging enterprises struggle with logistics unpredictability and unhedged foreign exchange fluctuations. Proactively protect your operations by maintaining a 60-day cash reserve, negotiating volume-tiered delivery agreements, and establishing backup sourcing channels.</p>`;

    // Backlinks injection
    if (supplierLinks.length > 0) {
      html += `<div class="my-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
  <p class="text-xs font-bold text-primary mb-1">🔗 Verified Industry Directory & Supplier Partners</p>
  <p class="text-xs text-foreground/80">Connect with vetted suppliers such as ${supplierLinks.map(s => `<a href="/suppliers/${s.slug}" class="font-bold underline text-primary hover:text-primary/80">${s.name}</a>`).join(", ")} to protect supply chain reliability.</p>
</div>`;
    }

    if (affLinks.length > 0) {
      html += `<div class="my-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
  <p class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">⚡ Recommended Growth Resources</p>
  <p class="text-xs text-foreground/80">Explore top partner tools: ${affLinks.map(a => `<a href="${a.url}" target="_blank" rel="sponsored noopener" class="font-bold underline text-purple-600 hover:text-purple-500">${a.label}</a>`).join(", ")}.</p>
</div>`;
    }

    // 7. FAQs Accordion
    html += `<h2 id="section-faq" class="text-2xl font-black tracking-tight text-foreground mt-8 mb-4 border-b pb-2">Frequently Asked Questions</h2>
<details style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:10px;padding:14px">
  <summary style="font-weight:700;font-size:0.95rem;cursor:pointer">What is the typical timeframe to see measurable results?</summary>
  <p style="margin-top:8px;font-size:0.875rem;color:#4b5563;line-height:1.6">Operators executing this structured framework typically observe marked increases in qualified inquiry volume and customer conversion within 14 to 30 days of active implementation.</p>
</details>
<details style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:10px;padding:14px">
  <summary style="font-weight:700;font-size:0.95rem;cursor:pointer">What initial tools are recommended to get started?</summary>
  <p style="margin-top:8px;font-size:0.875rem;color:#4b5563;line-height:1.6">A verified business profile on Bethelincovibe TV, high-converting digital product catalogs, and automated WhatsApp inquiry channels provide the fastest return on investment.</p>
</details>`;

    // 8. Conclusion
    html += `<h2 class="text-2xl font-black tracking-tight text-foreground mt-8 mb-4 border-b pb-2">Conclusion & Next Steps</h2>
<p class="text-base text-foreground/85 leading-relaxed mb-4">Mastering <strong>${cleanedTitle}</strong> is a high-yield endeavor when approached with clarity, disciplined execution, and modern digital visibility. Begin by executing Phase 1 today, secure your verified listings on Bethelincovibe TV, and build long-term enterprise value.</p>`;

    // Embed Business Public Site Profile & Service Listings Mini-Apps
    if (embedBusinessProfile && businessDirectory.length > 0) {
      const chosenBiz = selectedBusinessSlug === "auto"
        ? businessDirectory[0]
        : (businessDirectory.find((b: any) => b.slug === selectedBusinessSlug) || businessDirectory[0]);

      if (chosenBiz?.slug) {
        html += `\n\n<div class="my-6">\n[miniapp type="business" slug="${chosenBiz.slug}"]\n</div>\n`;
        if (includeServiceListings) {
          html += `\n<div class="my-6">\n[miniapp type="business-services" slug="${chosenBiz.slug}"]\n</div>\n\n`;
        }
      }
    }

    return {
      title: cleanedTitle,
      slug: formattedSlug,
      excerpt: `A comprehensive strategic guide on ${cleanedTitle}, covering market dynamics, proven scaling frameworks, and actionable risk management.`,
      content: html,
      featured_image: selectedImage,
      category_id: categoryId || (categories[0]?.id ?? ""),
      tags: kwList.length > 0 ? kwList : ["Business", "Growth", "Nigeria", "Enterprise"],
      video_url: formattedEmbedVideo || undefined,
    };
  };

  // 1. INSTANT 1-CLICK AUTO-PUBLISH (Exact AI Autoblogger Workflow)
  const handleInstantAutoPublish = async (overrideTopic?: string) => {
    const targetTopic = (overrideTopic || topic).trim();
    setIsInstantPublishing(true);
    setPublishedResult(null);

    try {
      const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const selectedCat = categories.find((c: any) => c.id === categoryId);
      const catName = selectedCat?.name || "Business & Entrepreneurship";

      let publishedData: any = null;

      // STEP 1: Invoke Edge Function with autoPublish: true (Same as AI Autoblogger scheduler)
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("ai-blogger", {
          body: {
            topic: targetTopic || undefined,
            useTrending: !targetTopic,
            keywords: kwList.join(", "),
            tone,
            categoryId: categoryId || undefined,
            autoPublish: true,
            authorId: user?.id,
          },
        });

        if (!edgeErr && edgeData && (edgeData.auto_published || edgeData.post_id || edgeData.slug)) {
          publishedData = edgeData;
        } else if (edgeData?.error) {
          console.warn("AI Autoblogger edge warning:", edgeData.error, edgeData.message);
        }
      } catch (e) {
        console.warn("Edge function invocation failed, trying client autoblog pipeline:", e);
      }

      // STEP 2: Client Fallback Autoblog Pipeline if Edge Function is offline or rate-limited
      if (!publishedData) {
        const fallbackPost = await buildAutoblogFallbackContent(
          targetTopic || "Strategic Business Growth in Nigeria",
          catName,
          kwList
        );

        const finalSlug = `${fallbackPost.slug}-${Date.now().toString().slice(-4)}`;
        const { data: newPost, error: dbErr } = await supabase
          .from("blog_posts")
          .insert({
            title: fallbackPost.title,
            slug: finalSlug,
            excerpt: fallbackPost.excerpt,
            content: fallbackPost.content,
            featured_image: fallbackPost.featured_image,
            category_id: categoryId || (categories[0]?.id ?? null),
            published: true,
            published_at: new Date().toISOString(),
            author_id: user?.id || null,
            is_featured: true,
          })
          .select("id, title, slug, excerpt, featured_image")
          .single();

        if (dbErr) throw dbErr;

        publishedData = {
          auto_published: true,
          post_id: newPost?.id,
          title: newPost?.title,
          slug: newPost?.slug,
          excerpt: newPost?.excerpt,
          featured_image: newPost?.featured_image,
          has_youtube: !!videoUrl,
        };
      }

      // Invalidate queries to refresh lists
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });

      setPublishedResult({
        id: publishedData.post_id,
        title: publishedData.title,
        slug: publishedData.slug,
        featured_image: publishedData.featured_image,
        has_youtube: publishedData.has_youtube,
        excerpt: publishedData.excerpt,
      });

      toast.success(`🎉 Post "${publishedData.title}" published live via AI Autoblogger!`);

      // Clear input fields on success
      setTopic("");
      setKeywords("");
      setVideoUrl("");
      setCustomImageUrl("");
      setPreview(null);
    } catch (err: any) {
      toast.error("Instant auto-publish failed: " + (err.message || "Unknown error"));
    } finally {
      setIsInstantPublishing(false);
    }
  };

  // 2. GENERATE FOR REVIEW & PREVIEW (Autoblogger Engine with Review Step)
  const handleGenerateMainBlogPost = async () => {
    if (!topic.trim()) {
      return toast.error("Please enter a topic or click one of the trending ideas below");
    }

    setIsGenerating(true);
    setPublishedResult(null);

    try {
      const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const selectedCat = categories.find((c: any) => c.id === categoryId);
      const catName = selectedCat?.name || "Business & Entrepreneurship";

      const formattedEmbedVideo = videoUrl.trim() ? formatVideoEmbedUrl(videoUrl) : "";

      let generatedData: any = null;

      // Try Supabase Edge Function first (Autoblogger engine with autoPublish: false)
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("ai-blogger", {
          body: {
            topic: topic.trim(),
            keywords: kwList.join(", "),
            tone,
            categoryId: categoryId || undefined,
            categoryName: catName,
            depth,
            videoUrl: formattedEmbedVideo || undefined,
            autoPublish: false,
          },
        });
        if (!edgeErr && edgeData && (edgeData.content || edgeData.title)) {
          generatedData = edgeData;
        }
      } catch (e) {
        console.warn("Edge function invocation fallback:", e);
      }

      // Client-Side Gemini direct fallback
      if (!generatedData) {
        const gemini = await getGeminiClient();
        if (gemini) {
          try {
            const depthWords = depth === "indepth" ? "1500-2500" : depth === "concise" ? "600-900" : "1000-1400";
            const prompt = `You are the Lead Editorial AI Journalist for Bethelincovibe TV.
Write an original, comprehensive, deeply researched, SEO-optimized blog article in clean semantic HTML for:
TOPIC: "${topic.trim()}"
CATEGORY: "${catName}"
TARGET KEYWORDS: ${kwList.join(", ") || "Business, Growth, Nigeria, Enterprise"}
TONE: ${tone}
TARGET LENGTH: ${depthWords} words

Include:
1. Strong lead paragraph (<p class="lead">).
2. Key Takeaways highlight box.
3. 3-4 structured <h2> sections exploring real Nigerian trade dynamics and practical methods.
4. Step-by-Step Action Checklist.
5. FAQ section with questions and answers.

Return ONLY valid JSON matching this exact format:
{
  "title": "Compelling Click-Worthy Headline",
  "slug": "${generateSlug(topic.trim())}",
  "excerpt": "A concise 2-sentence summary (under 160 characters).",
  "content": "Complete semantic HTML body...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

            const res = await gemini.models.generateContent({
              model: "gemini-3.8-flash",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
            });

            const text = res.text || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed && (parsed.content || parsed.title)) {
                generatedData = parsed;
              }
            }
          } catch (gemErr) {
            console.warn("Direct Gemini generation error:", gemErr);
          }
        }
      }

      // Robust Domain Fallback
      if (!generatedData) {
        generatedData = await buildAutoblogFallbackContent(topic, catName, kwList);
      }

      // Handle video embedding if provided
      let finalContent = generatedData.content || "";
      if (formattedEmbedVideo && embedVideoInPost && !finalContent.includes(formattedEmbedVideo)) {
        const videoBlock = `
<div class="my-6 aspect-video w-full rounded-2xl overflow-hidden shadow-lg border bg-black">
  <iframe src="${formattedEmbedVideo}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
`;
        if (finalContent.includes("</p>")) {
          finalContent = finalContent.replace("</p>", `</p>\n${videoBlock}`);
        } else {
          finalContent = `${videoBlock}\n${finalContent}`;
        }
      }

      // Handle Business Profile & Service Listings embedding
      if (embedBusinessProfile && businessDirectory.length > 0 && !finalContent.includes('[miniapp type="business"')) {
        const chosenBiz = selectedBusinessSlug === "auto"
          ? businessDirectory[0]
          : (businessDirectory.find((b: any) => b.slug === selectedBusinessSlug) || businessDirectory[0]);

        if (chosenBiz?.slug) {
          const bizBlock = `\n\n<div class="my-6">\n[miniapp type="business" slug="${chosenBiz.slug}"]\n</div>\n`;
          const srvBlock = includeServiceListings ? `\n<div class="my-6">\n[miniapp type="business-services" slug="${chosenBiz.slug}"]\n</div>\n\n` : "\n\n";
          finalContent += `${bizBlock}${srvBlock}`;
        }
      }

      const defaultCover =
        customImageUrl.trim() ||
        generatedData.featured_image ||
        getCategoryImage(catName) ||
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80";

      setPreview({
        title: generatedData.title || topic.trim(),
        slug: generatedData.slug || generateSlug(generatedData.title || topic),
        excerpt: generatedData.excerpt || generatedData.meta_description || topic.slice(0, 160),
        content: finalContent,
        featured_image: defaultCover,
        category_id: generatedData.category_id || categoryId || (categories[0]?.id ?? ""),
        tags: generatedData.tags || kwList,
        video_url: formattedEmbedVideo || undefined,
      });

      toast.success("AI Blog Post generated successfully! Review, edit and publish below.");
    } catch (err: any) {
      toast.error("Generation error: " + (err.message || "Failed to generate blog post"));
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish / Save Mutation
  const publishMutation = useMutation({
    mutationFn: async (publishLive: boolean) => {
      if (!preview) throw new Error("No generated post to publish");

      const finalSlug = preview.slug || generateSlug(preview.title);
      const targetCatId = preview.category_id || categoryId || null;

      const { data, error } = await supabase.from("blog_posts").insert({
        title: preview.title.trim(),
        slug: finalSlug,
        excerpt: preview.excerpt.trim(),
        content: preview.content,
        featured_image: preview.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
        category_id: targetCatId,
        published: publishLive,
        published_at: publishLive ? new Date().toISOString() : null,
        author_id: user?.id || null,
        is_featured: true,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, publishLive) => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success(
        publishLive
          ? "🎉 Blog post published live on the website!"
          : "Saved blog post to drafts!"
      );
      setPreview(null);
      setTopic("");
      setKeywords("");
      setVideoUrl("");
      setCustomImageUrl("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to publish post"),
  });

  // Secondary Tab Strategic Handlers
  const handleStartStrategicBrainstorm = async () => {
    setIsBrainstorming(true);
    try {
      const availableCategories = (categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      }));

      const directive = await conductStrategicBrainstorm({
        theme: brainstormTheme,
        targetNiche: "Lagos Businesses, Tech Startups & Traders",
        campaignGoal: "traffic & directory discovery",
        numberOfPosts: brainstormCount,
        availableCategories,
      });

      setActiveDirective(directive);
      toast.success("Strategic session completed! Multi-post blueprint ready.");
    } catch (err: any) {
      toast.error("Brainstorming failed: " + err.message);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleGenerateBatchPosts = async () => {
    if (!activeDirective) return;
    setIsBatchGenerating(true);
    setBatchGeneratedPosts([]);
    try {
      const generated: GeneratedArticle[] = [];
      for (const topicItem of activeDirective.suggestedTopics) {
        const art = await generateStrategicArticle({
          topic: topicItem.title,
          angle: topicItem.angle,
          categoryName: topicItem.targetCategory,
          isVlog: topicItem.isVlog,
          videoUrl: topicItem.suggestedVideoUrl,
          keywords: topicItem.keywords,
        });
        generated.push(art);
      }
      setBatchGeneratedPosts(generated);
      toast.success(`Generated ${generated.length} articles with embedded partner referrals!`);
    } catch (err: any) {
      toast.error("Batch generation error: " + err.message);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleBatchPublish = async (publishLive: boolean) => {
    if (batchGeneratedPosts.length === 0) return;
    setIsBatchPublishing(true);
    try {
      let published = 0;
      for (const post of batchGeneratedPosts) {
        const matchCat = categories.find(
          (c: any) => c.name.toLowerCase() === post.category_name?.toLowerCase()
        );

        let catId = matchCat?.id;
        if (!catId && post.category_name) {
          const slug = post.category_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const { data: newCat } = await supabase
            .from("categories")
            .insert({ name: post.category_name, slug, type: "blog" })
            .select("id")
            .maybeSingle();
          if (newCat) catId = newCat.id;
        }

        const { error } = await supabase.from("blog_posts").insert({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category_id: catId || null,
          published: publishLive,
          published_at: publishLive ? new Date().toISOString() : null,
          is_featured: true,
          author_id: user?.id || null,
          featured_image: post.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
        });

        if (!error) published++;
      }

      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(`Successfully ${publishLive ? "published" : "saved to draft"} ${published} articles!`);
      setBatchGeneratedPosts([]);
      setActiveDirective(null);
    } catch (err: any) {
      toast.error("Batch publishing failed: " + err.message);
    } finally {
      setIsBatchPublishing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl w-full mx-auto px-1 sm:px-0 pb-20 sm:pb-16 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/15 via-indigo-600/10 to-pink-500/15 border border-primary/20 shadow-xs">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
          <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-purple-600 text-white shadow-md ring-1 ring-white/30">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-tight text-foreground">
                AI Blogger & Content Studio
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5">
                Auto-SEO & Media Ready
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
              Generate, customize, and publish complete blog articles with featured images, video embeds, and auto-supplier backlinks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full sm:w-auto h-9 font-bold text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Link to="/admin/posts">
              <FileText className="h-3.5 w-3.5" />
              Manage All Posts
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          <TabsList className="h-auto p-1 bg-muted rounded-2xl gap-1 border flex w-full min-w-max sm:min-w-0">
            <TabsTrigger
              value="generator"
              className="h-10 text-xs font-bold gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>AI Blog Generator</span>
            </TabsTrigger>
            <TabsTrigger
              value="scheduler"
              className="h-10 text-xs font-bold gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Autoblog Scheduler</span>
            </TabsTrigger>
            <TabsTrigger
              value="referral-vlog"
              className="h-10 text-xs font-bold gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Link2 className="h-4 w-4 text-purple-600 shrink-0" />
              <span>Vlog & Referral Hub</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: MAIN AI BLOGGER GENERATOR */}
        <TabsContent value="generator" className="space-y-4 sm:space-y-6 m-0 focus-visible:outline-none">
          {/* SUCCESS BANNER WHEN INSTANTLY PUBLISHED */}
          {publishedResult && (
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-primary/15 border-2 border-emerald-500/30 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 w-full sm:w-auto">
                  {publishedResult.featured_image ? (
                    <img
                      src={publishedResult.featured_image}
                      alt={publishedResult.title}
                      className="h-14 w-20 sm:h-16 sm:w-24 object-cover rounded-xl sm:rounded-2xl border border-emerald-500/30 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide">
                        🚀 Published Live
                      </Badge>
                      {publishedResult.has_youtube && (
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30">
                          <Youtube className="h-3 w-3 mr-1" /> Video
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-foreground mt-1 line-clamp-1">
                      {publishedResult.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      URL: /blog/{publishedResult.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    size="sm"
                    asChild
                    className="h-10 sm:h-9 px-4 font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs gap-1.5 flex-1 sm:flex-initial"
                  >
                    <Link to={`/blog/${publishedResult.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Live Article
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPublishedResult(null)}
                    className="h-10 sm:h-9 px-3 text-xs font-bold rounded-xl"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Card className="rounded-2xl sm:rounded-3xl shadow-sm border-border/80 overflow-hidden">
            <CardHeader className="bg-muted/20 border-b p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    <PenTool className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-extrabold">Instant AI Autoblogger & Post Studio</CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs line-clamp-1">
                      Generate, embed videos, attach supplier links, and publish live articles in 1-click.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] sm:text-[11px] font-bold">
                  {categories.length} Categories
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Turkey & World Sourcing Presets */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-1.5 text-xs font-black text-primary">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>Turkey & World Wholesale Generator (1-Click Fill & Publish):</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Autofills Topic, Keywords, Category & Video</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WORLD_MARKET_PRESETS.map((preset, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectTrendingTopic(preset)}
                      className="h-8 rounded-xl text-xs font-bold bg-background hover:bg-primary hover:text-primary-foreground border-primary/30 transition-all duration-150 gap-1.5 shadow-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trending Topics Click-to-Fill Bar */}
              <div className="rounded-2xl border border-dashed p-3.5 sm:p-4 space-y-2.5 bg-muted/10">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Real-time Nigerian & African Trends (Tap to Auto-Fill Everything):</span>
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTrendingTopics}
                    className="h-7 rounded-xl text-[10px] sm:text-[11px] font-bold gap-1 px-2.5"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 sm:max-h-48 overflow-y-auto pr-1">
                  {(trendingTopics.length > 0
                    ? trendingTopics.map((t) => typeof t === "string" ? { topic: t } : t)
                    : TRENDING_MARKET_INTELLIGENCE
                  ).map((t, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors text-[10px] sm:text-[11px] py-1.5 px-2.5 rounded-lg bg-background flex items-center gap-1 text-left"
                      onClick={() => handleSelectTrendingTopic(t)}
                    >
                      <span className="truncate max-w-[280px] sm:max-w-none">📰 {t.topic}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Main Topic Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <Label className="text-xs font-bold text-foreground">Article Topic or Title Idea</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateKeywordsFromTopic()}
                    className="h-6 text-[10px] sm:text-[11px] text-primary hover:text-primary font-bold gap-1 p-0 hover:bg-transparent"
                  >
                    <Sparkles className="h-3 w-3" />
                    Auto-Fill Keywords from Topic
                  </Button>
                </div>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Turkey Sourcing & Istanbul Laleli Wholesale Fashion Import Guide (or leave blank to auto-detect latest trending headline)"
                  rows={2}
                  className="w-full text-xs sm:text-sm rounded-xl font-medium resize-none min-h-[60px]"
                />
              </div>

              {/* Category, Keywords, Tone & Depth */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-[11px] sm:text-xs font-bold">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full text-xs rounded-xl h-10">
                      <SelectValue placeholder="Auto-Detect Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] sm:text-xs font-bold">Target Keywords</Label>
                    <button
                      type="button"
                      onClick={() => generateKeywordsFromTopic()}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="h-2.5 w-2.5" /> AI Fill
                    </button>
                  </div>
                  <Input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. Turkey Wholesale, Istanbul Sourcing, Laleli"
                    className="w-full text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] sm:text-xs font-bold">Writing Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="w-full text-xs rounded-xl h-10 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual & Engaging</SelectItem>
                      <SelectItem value="professional">Executive & Authoritative</SelectItem>
                      <SelectItem value="educational">Step-by-Step Practical</SelectItem>
                      <SelectItem value="persuasive">High-Converting Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] sm:text-xs font-bold">Depth / Length</Label>
                  <Select value={depth} onValueChange={(v) => setDepth(v as any)}>
                    <SelectTrigger className="w-full text-xs rounded-xl h-10 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (800 - 1200 words)</SelectItem>
                      <SelectItem value="indepth">Deep Dive (1500 - 2500 words)</SelectItem>
                      <SelectItem value="concise">Quick Read (500 - 800 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Media Settings: Video URL & Featured Image */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-2 border-t">
                {/* Video Embed Section */}
                <div className="space-y-2 p-3 sm:p-3.5 rounded-2xl bg-muted/20 border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span>Featured Video / Vlog Embed</span>
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        id="embed-video"
                        checked={embedVideoInPost}
                        onCheckedChange={setEmbedVideoInPost}
                      />
                      <Label htmlFor="embed-video" className="text-[10px] text-muted-foreground cursor-pointer">
                        Embed in Body
                      </Label>
                    </div>
                  </div>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... (Auto-matched if blank)"
                    className="text-xs rounded-xl h-10"
                  />
                  {videoUrl && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="truncate flex items-center gap-1 mr-2">
                        <Play className="h-3 w-3 text-purple-600 shrink-0" />
                        <span className="truncate">{formatVideoEmbedUrl(videoUrl)}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVideoUrl("")}
                        className="h-6 px-2 text-[10px] shrink-0"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                {/* Featured Image Section */}
                <div className="space-y-2 p-3 sm:p-3.5 rounded-2xl bg-muted/20 border">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>Featured Cover Image</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... (Stock cover auto-generated if empty)"
                      className="text-xs rounded-xl h-10 flex-1"
                    />
                    {customImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomImageUrl("")}
                        className="h-10 px-3 text-xs rounded-xl"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Preset quick pickers */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold">Presets:</span>
                    {Object.entries(CURATED_IMAGE_PRESETS).slice(0, 3).map(([cat, list]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCustomImageUrl(list[0]?.url || "")}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-background border hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {cat.split("&")[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Business Public Site Profile & Service Listing Embedding Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs font-black flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>Embed Business Public Site Profile & Service Listings Card</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="embed-biz-profile"
                      checked={embedBusinessProfile}
                      onCheckedChange={setEmbedBusinessProfile}
                    />
                    <Label htmlFor="embed-biz-profile" className="text-xs font-bold cursor-pointer">
                      {embedBusinessProfile ? "Active" : "Off"}
                    </Label>
                  </div>
                </div>

                {embedBusinessProfile && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Select Business to Showcase</Label>
                      <Select value={selectedBusinessSlug} onValueChange={setSelectedBusinessSlug}>
                        <SelectTrigger className="w-full text-xs rounded-xl h-9 font-medium bg-background">
                          <SelectValue placeholder="Select business profile..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">
                            🌟 Auto-select Top Business {businessDirectory[0]?.name ? `(${businessDirectory[0].name})` : ""}
                          </SelectItem>
                          {businessDirectory.map((b: any) => (
                            <SelectItem key={b.id} value={b.slug}>
                              {b.name} ({b.categories?.name || "Verified"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border mt-auto">
                      <div className="space-y-0.5">
                        <Label htmlFor="include-services" className="text-xs font-bold cursor-pointer flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-primary" />
                          <span>Include Service Listings Card</span>
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Renders interactive service offerings and booking CTA</p>
                      </div>
                      <Switch
                        id="include-services"
                        checked={includeServiceListings}
                        onCheckedChange={setIncludeServiceListings}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS: Instant 1-Click Auto-Publish vs Generate & Review */}
              <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 pt-2 border-t">
                {/* 1. INSTANT AUTO-PUBLISH BUTTON (Core AI Autoblogger Workflow) */}
                <Button
                  onClick={() => handleInstantAutoPublish()}
                  disabled={isInstantPublishing || isGenerating}
                  className="w-full min-h-[48px] h-12 font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white rounded-2xl shadow-md gap-2 transition-all"
                >
                  {isInstantPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>AI is Generating & Publishing Live…</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-current shrink-0" />
                      <span>⚡ Instant 1-Click Auto-Publish</span>
                    </>
                  )}
                </Button>

                {/* 2. GENERATE & REVIEW FIRST BUTTON */}
                <Button
                  variant="outline"
                  onClick={handleGenerateMainBlogPost}
                  disabled={isGenerating || isInstantPublishing || !topic.trim()}
                  className="w-full min-h-[48px] h-12 font-extrabold text-xs sm:text-sm border-primary/40 text-primary hover:bg-primary/10 rounded-2xl shadow-xs gap-2 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      <span>Drafting Content Blueprint…</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 shrink-0" />
                      <span>Generate & Preview First</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* LIVE GENERATED ARTICLE PREVIEW & IN-PLACE EDITOR */}
          {preview && (
            <Card className="rounded-2xl sm:rounded-3xl border-2 border-primary/40 shadow-lg bg-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <CardHeader className="bg-primary/5 border-b p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-black">Generated Article Review & Editor</CardTitle>
                      <CardDescription className="text-[11px] sm:text-xs">
                        Review the generated content, refine the title or copy, and publish directly.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex rounded-xl bg-muted p-1 border w-full sm:w-auto justify-center">
                      <button
                        type="button"
                        onClick={() => setPreviewEditMode("rendered")}
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-lg transition-colors flex-1 sm:flex-initial",
                          previewEditMode === "rendered" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                        )}
                      >
                        Visual View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewEditMode("source")}
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-lg transition-colors flex-1 sm:flex-initial",
                          previewEditMode === "source" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                        )}
                      >
                        Edit HTML Source
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(false)}
                        className="h-9 text-xs font-bold rounded-xl gap-1 flex-1 sm:flex-initial"
                      >
                        Save Draft
                      </Button>

                      <Button
                        size="sm"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(true)}
                        className="h-9 text-xs font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5 px-4 flex-1 sm:flex-initial"
                      >
                        {publishMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Publish Live
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Editable Title, Slug, and Excerpt */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold text-foreground">Post Title</Label>
                    <Input
                      value={preview.title}
                      onChange={(e) => setPreview({ ...preview, title: e.target.value, slug: generateSlug(e.target.value) })}
                      className="text-sm sm:text-base font-extrabold rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">URL Slug</Label>
                    <Input
                      value={preview.slug}
                      onChange={(e) => setPreview({ ...preview, slug: e.target.value })}
                      className="text-xs font-mono rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Category</Label>
                    <Select
                      value={preview.category_id}
                      onValueChange={(val) => setPreview({ ...preview, category_id: val })}
                    >
                      <SelectTrigger className="text-xs rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold text-foreground">SEO Excerpt / Summary</Label>
                    <Textarea
                      value={preview.excerpt}
                      onChange={(e) => setPreview({ ...preview, excerpt: e.target.value })}
                      rows={2}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold text-foreground">Featured Image URL</Label>
                    <div className="flex gap-2 sm:gap-3 items-center">
                      {preview.featured_image && (
                        <img
                          src={preview.featured_image}
                          alt="Thumbnail preview"
                          className="h-10 w-16 sm:h-12 sm:w-20 object-cover rounded-lg border shrink-0"
                        />
                      )}
                      <Input
                        value={preview.featured_image}
                        onChange={(e) => setPreview({ ...preview, featured_image: e.target.value })}
                        className="text-xs font-mono rounded-xl h-10 flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Article Content Display / Editor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Article Body Content</Label>

                  {previewEditMode === "source" ? (
                    <Textarea
                      value={preview.content}
                      onChange={(e) => setPreview({ ...preview, content: e.target.value })}
                      rows={14}
                      className="font-mono text-xs rounded-2xl bg-muted/20"
                    />
                  ) : (
                    <div className="rounded-2xl border bg-background p-4 sm:p-6 max-h-[450px] sm:max-h-[500px] overflow-y-auto">
                      <div
                        className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: preview.content }}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview(null)}
                    className="text-xs text-muted-foreground hover:text-foreground h-9 order-2 sm:order-1"
                  >
                    Discard Generated Draft
                  </Button>

                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={publishMutation.isPending}
                      onClick={() => publishMutation.mutate(false)}
                      className="h-10 sm:h-9 text-xs font-bold rounded-xl flex-1 sm:flex-initial"
                    >
                      Save Draft
                    </Button>
                    <Button
                      size="sm"
                      disabled={publishMutation.isPending}
                      onClick={() => publishMutation.mutate(true)}
                      className="h-10 sm:h-9 text-xs font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs px-5 flex-1 sm:flex-initial"
                    >
                      {publishMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Publish to Live Blog
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: AUTONOMOUS SCHEDULER */}
        <TabsContent value="scheduler" className="space-y-4 sm:space-y-6 m-0 focus-visible:outline-none">
          <Card className="rounded-2xl sm:rounded-3xl shadow-sm border-border/80 overflow-hidden">
            <CardHeader className="bg-muted/20 border-b p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-extrabold">Autonomous AI Blogger Scheduler</CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs">
                      Automatically generate and publish high-quality articles at set intervals around the clock.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isTestingAutoblog}
                    onClick={handleTriggerAutoblogNow}
                    className="h-9 text-xs font-bold rounded-xl gap-1.5 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10"
                  >
                    {isTestingAutoblog ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Run Autoblog Now
                  </Button>
                  <Switch
                    checked={schedule?.enabled || false}
                    onCheckedChange={(enabled) => updateSchedule({ enabled })}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {schedule?.enabled ? (
                <div className="space-y-4 sm:space-y-5 animate-in fade-in">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Publish Interval</Label>
                      <Select
                        value={String(schedule?.interval_hours || 24)}
                        onValueChange={(v) => updateSchedule({ interval_hours: parseInt(v) })}
                      >
                        <SelectTrigger className="rounded-xl h-10 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">Every 6 hours (4 posts/day)</SelectItem>
                          <SelectItem value="12">Every 12 hours (2 posts/day)</SelectItem>
                          <SelectItem value="24">Every 24 hours (Daily)</SelectItem>
                          <SelectItem value="48">Every 2 days</SelectItem>
                          <SelectItem value="72">Every 3 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Focus Topic Keywords</Label>
                      <Input
                        value={schedule?.keywords || ""}
                        onChange={(e) => updateSchedule({ keywords: e.target.value })}
                        placeholder="e.g. Lagos, business, suppliers, tech, logistics"
                        className="rounded-xl h-10 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Default Category</Label>
                      <Select
                        value={schedule?.category_id || ""}
                        onValueChange={(v) => updateSchedule({ category_id: v || null })}
                      >
                        <SelectTrigger className="rounded-xl h-10 text-xs">
                          <SelectValue placeholder="Auto-detect category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-muted/30 border">
                    <Switch
                      checked={schedule?.auto_approve !== false}
                      onCheckedChange={(v) => updateSchedule({ auto_approve: v })}
                      id="auto-pub"
                      className="mt-0.5 sm:mt-0 shrink-0"
                    />
                    <Label htmlFor="auto-pub" className="text-xs font-bold cursor-pointer leading-relaxed">
                      Publish immediately to Live Blog (when turned off, generated posts are stored in Drafts for manual review)
                    </Label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 border border-dashed rounded-2xl bg-muted/10 space-y-2 px-4">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                  <h4 className="font-extrabold text-sm text-foreground">Autoblog Scheduler is currently inactive</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Toggle the switch above to activate automated daily content generation, or use "Run Autoblog Now" to test immediately.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STRATEGIC REFERRAL & VLOG STUDIO */}
        <TabsContent value="referral-vlog" className="space-y-4 sm:space-y-6 m-0 focus-visible:outline-none">
          {/* Referral Partner Links Manager */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-card via-purple-500/5 to-indigo-500/5 shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden">
            <CardHeader className="border-b bg-purple-500/10 p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Link2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                      Strategic Referral & Partner Link Manager
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs font-medium">
                      Configure affiliate and partner links for inclusion in sponsored or referral-driven campaigns.
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white font-extrabold text-[10px]">
                  {affiliateLinks.length} Active Partner{affiliateLinks.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Add New Referral Form */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-background/80 border border-purple-500/20 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add New Referral / Affiliate Partner Link
                </h3>

                <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Partner / Button Label *</Label>
                    <Input
                      placeholder="e.g. Verified Lagos Directory"
                      value={newAff.label}
                      onChange={(e) => setNewAff({ ...newAff, label: e.target.value })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Destination URL *</Label>
                    <Input
                      placeholder="https://... or /businesses"
                      value={newAff.url}
                      onChange={(e) => setNewAff({ ...newAff, url: e.target.value })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Match Keywords (comma-separated)</Label>
                    <Input
                      placeholder="business, supplier, wholesale, lagos"
                      value={newAff.keywords}
                      onChange={(e) => setNewAff({ ...newAff, keywords: e.target.value })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">CTA Card Pitch / Description</Label>
                    <Input
                      placeholder="Find verified suppliers & boost sales"
                      value={newAff.description}
                      onChange={(e) => setNewAff({ ...newAff, description: e.target.value })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  onClick={addAffiliate}
                  disabled={isAddingAff || !newAff.label.trim() || !newAff.url.trim()}
                  className="w-full sm:w-auto h-10 px-5 text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs gap-1.5"
                >
                  {isAddingAff ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Save Referral Partner
                </Button>
              </div>

              {/* List of Referral Links */}
              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                {affiliateLinks.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border bg-card/90 shadow-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-extrabold text-sm text-foreground truncate">{a.label}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{a.url}</p>
                      {a.description && (
                        <p className="text-xs text-foreground/80 line-clamp-1 italic">{a.description}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteAffiliate(a.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Multi-Post Collaboration & Vlog Hub */}
          <Card className="border-border/80 shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/20 border-b p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold shrink-0">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-extrabold">Multi-Post Strategy & Vlog Hub</CardTitle>
                  <CardDescription className="text-[11px] sm:text-xs">
                    Brainstorm thematic multi-post directives with vlog video embeds and structured referral placements.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-4 items-end">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-bold text-foreground">Strategic Theme / Niche Focus</Label>
                  <Input
                    value={brainstormTheme}
                    onChange={(e) => setBrainstormTheme(e.target.value)}
                    placeholder="e.g. Lagos SME Scaling, Verified Sourcing, Tech Startups..."
                    className="h-10 text-xs rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Quantity</Label>
                  <Select value={String(brainstormCount)} onValueChange={(v) => setBrainstormCount(Number(v))}>
                    <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Posts (Blog + Vlog)</SelectItem>
                      <SelectItem value="3">3 Posts (Series)</SelectItem>
                      <SelectItem value="4">4 Posts (Omni-Category)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleStartStrategicBrainstorm}
                  disabled={isBrainstorming}
                  className="w-full h-10 font-extrabold text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shadow-sm"
                >
                  {isBrainstorming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Reasoning…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" /> Start Strategy Session
                    </>
                  )}
                </Button>
              </div>

              {/* Active Directive Output Feed */}
              {activeDirective && (
                <div className="p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 bg-background/95 space-y-3 sm:space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3">
                    <div>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 border-purple-500/30">
                        Strategic Directive
                      </Badge>
                      <h3 className="text-xs sm:text-sm font-black text-foreground mt-1">{activeDirective.theme}</h3>
                    </div>
                    <Button
                      onClick={handleGenerateBatchPosts}
                      disabled={isBatchGenerating}
                      className="w-full sm:w-auto h-10 sm:h-9 font-black text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl gap-1.5 shadow-sm"
                    >
                      {isBatchGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Series…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> Generate All {activeDirective.suggestedTopics.length} Posts
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
                    {activeDirective.suggestedTopics.map((t, i) => (
                      <div key={i} className="p-3 rounded-xl border bg-card/60 flex flex-col justify-between gap-2 shadow-xs">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <Badge variant="secondary" className="text-[9px] font-bold">
                              {t.isVlog ? "🎥 Vlog Video" : "📰 Guide"}
                            </Badge>
                            <span className="text-[10px] font-extrabold text-primary">{t.targetCategory}</span>
                          </div>
                          <p className="font-bold text-xs text-foreground line-clamp-2">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.angle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Generated Posts Review */}
              {batchGeneratedPosts.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 sm:space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <h4 className="text-xs sm:text-sm font-black text-foreground">
                        {batchGeneratedPosts.length} Strategic Articles Ready
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBatchPublishing}
                        onClick={() => handleBatchPublish(false)}
                        className="h-9 text-xs font-bold rounded-xl flex-1 sm:flex-initial"
                      >
                        Save All Drafts
                      </Button>
                      <Button
                        size="sm"
                        disabled={isBatchPublishing}
                        onClick={() => handleBatchPublish(true)}
                        className="h-9 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex-1 sm:flex-initial"
                      >
                        {isBatchPublishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                        Publish All Live Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
