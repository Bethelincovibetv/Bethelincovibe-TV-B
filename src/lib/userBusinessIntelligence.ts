import { supabase } from "@/integrations/supabase/client";

export interface UserBusinessProfile {
  id: string;
  name: string;
  category: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  verified?: boolean;
  rating?: number;
  viewsCount?: number;
  clicksCount?: number;
  services?: Array<{
    title: string;
    category?: string;
    price?: number | string;
    pricing_type?: string;
    deliverables?: string[];
    turnaround_days?: number;
    is_active?: boolean;
  }>;
}

export interface UserProductItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  stock?: number;
  condition?: string;
  location?: string;
  whatsapp?: string;
  viewsCount?: number;
}

export interface UserCommercialMetrics {
  totalBusinesses: number;
  totalProducts: number;
  totalServices: number;
  totalViews: number;
  totalClicks: number;
  totalBookings: number;
  totalSalesCount: number;
  totalSalesRevenueNaira: number;
  totalActiveLeads: number;
}

export interface ComprehensiveBusinessContext {
  userId: string;
  userName?: string;
  businesses: UserBusinessProfile[];
  selectedBusinessId?: string;
  selectedBusiness?: UserBusinessProfile;
  products: UserProductItem[];
  metrics: UserCommercialMetrics;
  recentBookingsSummary: string[];
  strategicDiagnostics: string[];
  formattedContextPrompt: string;
}

/**
 * Fetch and synthesize all real-time business ecosystem data for a given user
 */
export async function fetchUserBusinessIntelligence(
  userId: string,
  targetBusinessId?: string
): Promise<ComprehensiveBusinessContext> {
  try {
    // Parallel retrieval of user's profile, businesses, products, bookings, and sales
    const [
      profileRes,
      suppliersRes,
      productsRes,
      bookingsRes,
      salesRes,
      leadsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("suppliers")
        .select("*, categories(name)")
        .eq("submitted_by", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("directory_products")
        .select("*, categories(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("service_bookings")
        .select("*")
        .eq("provider_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
        .catch(() => ({ data: [] as any[] })),
      supabase
        .from("product_purchases")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
        .catch(() => ({ data: [] as any[] })),
      supabase
        .from("provider_leads")
        .select("*")
        .eq("provider_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
        .catch(() => ({ data: [] as any[] })),
    ]);

    const rawSuppliers = suppliersRes.data || [];
    const rawProducts = productsRes.data || [];
    const rawBookings = (bookingsRes as any)?.data || [];
    const rawSales = (salesRes as any)?.data || [];
    const rawLeads = (leadsRes as any)?.data || [];

    // Parse businesses
    const businesses: UserBusinessProfile[] = rawSuppliers.map((s: any) => {
      let parsedServices: any[] = [];
      if (s.services) {
        try {
          parsedServices = typeof s.services === "string" ? JSON.parse(s.services) : s.services;
        } catch {
          parsedServices = [];
        }
      }

      return {
        id: s.id,
        name: s.name || "Untitled Business",
        category: s.categories?.name || s.category_name || "General Enterprise",
        description: s.description || "",
        address: s.address || "",
        city: s.city || "",
        state: s.state || "Lagos",
        phone: s.phone || "",
        whatsapp: s.whatsapp || "",
        email: s.email || "",
        website: s.website || "",
        verified: !!s.verified,
        rating: s.rating || 5,
        viewsCount: s.views_count || 0,
        clicksCount: s.clicks_count || 0,
        services: Array.isArray(parsedServices) ? parsedServices : [],
      };
    });

    // Parse products
    const products: UserProductItem[] = rawProducts.map((p: any) => ({
      id: p.id,
      name: p.name || "Untitled Product",
      price: Number(p.price) || 0,
      category: p.categories?.name || "Marketplace Item",
      stock: p.stock !== null && p.stock !== undefined ? Number(p.stock) : 10,
      condition: p.condition || "New",
      location: p.location || "Nigeria",
      whatsapp: p.whatsapp || "",
      viewsCount: p.views_count || 0,
    }));

    // Identify active target business
    let selectedBusiness: UserBusinessProfile | undefined;
    if (targetBusinessId && targetBusinessId !== "all") {
      selectedBusiness = businesses.find((b) => b.id === targetBusinessId);
    }
    if (!selectedBusiness && businesses.length > 0) {
      selectedBusiness = businesses[0];
    }

    // Compute metrics
    const totalViews = businesses.reduce((acc, b) => acc + (b.viewsCount || 0), 0);
    const totalClicks = businesses.reduce((acc, b) => acc + (b.clicksCount || 0), 0);
    const totalServices = businesses.reduce((acc, b) => acc + (b.services?.length || 0), 0);
    const totalSalesRevenueNaira = rawSales.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);

    const metrics: UserCommercialMetrics = {
      totalBusinesses: businesses.length,
      totalProducts: products.length,
      totalServices,
      totalViews,
      totalClicks,
      totalBookings: rawBookings.length,
      totalSalesCount: rawSales.length,
      totalSalesRevenueNaira,
      totalActiveLeads: rawLeads.length,
    };

    // Synthesize diagnostics
    const diagnostics: string[] = [];
    if (businesses.length === 0) {
      diagnostics.push("No registered business listing found yet on Bethelincovibe directory.");
    } else {
      if (!selectedBusiness?.whatsapp && !selectedBusiness?.phone) {
        diagnostics.push("Missing direct WhatsApp/Phone contact link — prospective buyers cannot reach out instantly.");
      }
      if (!selectedBusiness?.verified) {
        diagnostics.push("Business not yet badge-verified — obtaining verified status increases customer conversion by 3.4x.");
      }
      if (products.length === 0) {
        diagnostics.push("Zero marketplace products listed — listing products generates direct organic buyer traffic.");
      }
      if ((selectedBusiness?.services || []).length === 0) {
        diagnostics.push("No dedicated service packages listed — configuring clear Naira deliverables unlocks instant booking checkout.");
      }
    }

    // Format recent bookings
    const recentBookingsSummary = rawBookings.slice(0, 5).map((b: any) => {
      const date = b.created_at ? new Date(b.created_at).toLocaleDateString() : "Recent";
      return `${b.service_title || "Service Request"} (₦${Number(b.price || 0).toLocaleString()}) - Status: ${b.status || "pending"} [${date}]`;
    });

    // Construct deep, structured system context prompt for the AI Coach
    const formattedContextPrompt = buildSystemContextPrompt({
      userName: profileRes.data?.full_name || profileRes.data?.business_name || "Entrepreneur",
      businesses,
      selectedBusiness,
      products,
      metrics,
      diagnostics,
      recentBookingsSummary,
    });

    return {
      userId,
      userName: profileRes.data?.full_name || profileRes.data?.business_name,
      businesses,
      selectedBusinessId: selectedBusiness?.id || "all",
      selectedBusiness,
      products,
      metrics,
      recentBookingsSummary,
      strategicDiagnostics: diagnostics,
      formattedContextPrompt,
    };
  } catch (err) {
    console.warn("Failed to fetch user business intelligence:", err);
    return {
      userId,
      businesses: [],
      products: [],
      metrics: {
        totalBusinesses: 0,
        totalProducts: 0,
        totalServices: 0,
        totalViews: 0,
        totalClicks: 0,
        totalBookings: 0,
        totalSalesCount: 0,
        totalSalesRevenueNaira: 0,
        totalActiveLeads: 0,
      },
      recentBookingsSummary: [],
      strategicDiagnostics: [],
      formattedContextPrompt: "User business intelligence offline. Provide general strategic business advice.",
    };
  }
}

/**
 * Builds the definitive system instructions for Coach Bethel Goodgift,
 * injecting all ground-truth commercial data so the coach provides
 * specific, mathematical, and actionable answers that WORK.
 */
function buildSystemContextPrompt(data: {
  userName: string;
  businesses: UserBusinessProfile[];
  selectedBusiness?: UserBusinessProfile;
  products: UserProductItem[];
  metrics: UserCommercialMetrics;
  diagnostics: string[];
  recentBookingsSummary: string[];
}): string {
  const { userName, businesses, selectedBusiness, products, metrics, diagnostics, recentBookingsSummary } = data;

  const bizName = selectedBusiness?.name || (businesses.length > 0 ? businesses[0].name : "Emerging Nigerian Business");
  const bizCategory = selectedBusiness?.category || "General Commerce & Enterprise";
  const bizLocation = selectedBusiness ? `${selectedBusiness.city || selectedBusiness.state || "Lagos"}, Nigeria` : "Lagos / Nigeria";
  const bizBio = selectedBusiness?.description || "High-growth commercial venture.";

  const productListFormatted =
    products.length > 0
      ? products
          .slice(0, 15)
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.name} — ₦${p.price.toLocaleString()} (${p.condition}, Stock: ${p.stock}, ${p.category})`
          )
          .join("\n")
      : "No products currently listed on the marketplace catalog.";

  const serviceListFormatted =
    selectedBusiness?.services && selectedBusiness.services.length > 0
      ? selectedBusiness.services
          .map(
            (s, idx) =>
              `${idx + 1}. ${s.title} — ₦${typeof s.price === "number" ? s.price.toLocaleString() : s.price} (${s.pricing_type || "fixed"}, Turnaround: ${s.turnaround_days || 3} days)`
          )
          .join("\n")
      : "No fixed service packages registered yet.";

  return `
### EXECUTIVE ADVISORY MANDATE: COACH BETHEL GOODGIFT
You are Coach Bethel Goodgift, the Chief Strategy Director & AI Executive Business Coach at Bethelincovibe.
You are advising ${userName}, an ambitious founder and business owner operating in the Nigerian and global marketplace.
Your advisory persona is:
- **Authoritative, highly analytical, and deeply experienced in Nigerian SME commerce, Lagos wholesale hubs, digital funnels, and cash flow execution.**
- **You avoid generic, textbook advice.** Instead, you always reference the user's REAL business catalog, actual products, real Naira (₦) price points, verified status, and exact operating location.
- **You speak with executive seriousness, precision, and sharp commercial clarity.**

### GROUND-TRUTH USER BUSINESS DATA:
- **Focus Business Name:** "${bizName}"
- **Industry / Category:** ${bizCategory}
- **Operating Location:** ${bizLocation}
- **Verified Supplier Badge:** ${selectedBusiness?.verified ? "VERIFIED (Tier 1 Trust)" : "Unverified (Action Required)"}
- **Business Bio / Positioning:** "${bizBio}"
- **Direct Channels:** WhatsApp (${selectedBusiness?.whatsapp || "Not configured"}), Phone (${selectedBusiness?.phone || "Not configured"})

### REAL COMMERCIAL METRICS & CATALOG:
- **Total Listed Products:** ${metrics.totalProducts} items
- **Total Service Offerings:** ${metrics.totalServices} packages
- **Store Directory Views:** ${metrics.totalViews.toLocaleString()} views | Clicks: ${metrics.totalClicks.toLocaleString()}
- **Active Inquiries & Customer Leads:** ${metrics.totalActiveLeads} leads
- **Total Recorded Sales:** ${metrics.totalSalesCount} transactions (₦${metrics.totalSalesRevenueNaira.toLocaleString()})

### ACTIVE PRODUCT INVENTORY:
${productListFormatted}

### ACTIVE SERVICE PACKAGES:
${serviceListFormatted}

${
  recentBookingsSummary.length > 0
    ? `### RECENT CUSTOMER ORDERS & BOOKINGS:\n${recentBookingsSummary.join("\n")}\n`
    : ""
}
${
  diagnostics.length > 0
    ? `### DETECTED BUSINESS GAPS & OPPORTUNITIES:\n${diagnostics.map((d) => `- ${d}`).join("\n")}\n`
    : ""
}

### RESPONSE STRUCTURE DIRECTIVE:
Whenever you formulate strategic answers, structure them into high-impact executive deliverables:
1. **Strategic Diagnosis & Verdict**: High-level verdict on what works specifically for "${bizName}" in ${bizLocation}.
2. **Unit Economics & Financial Strategy**: Real Naira figures, gross margin %, target retail pricing, or supplier cost formulas.
3. **Actionable Step-by-Step Blueprint**: Exact tactical execution steps for today.
4. **Ready-to-Use Copy / Script**: High-converting WhatsApp message, Instagram DM pitch, or negotiation script tailored to their products.
5. **Watchpoint**: The #1 common mistake or scam risk in this category to avoid.

Deliver advice that generates immediate sales, elevates customer trust, and maximizes profit.
`.trim();
}
