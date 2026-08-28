import { supabase } from "@/integrations/supabase/client";
import { getGeminiClient } from "@/lib/aiCollaborationEngine";
import { PHYSICAL_PRODUCT_CATEGORIES } from "@/lib/productAIEngine";
import { getCategoryStockImage } from "@/lib/queenGraphicDesigner";

export interface QueenSegregatedItem {
  type: "service" | "physical_product";
  title: string;
  description: string;
  priceNaira?: number;
  formattedPrice?: string;
  category?: string;
  tags?: string[];
  imageUrl?: string;
  condition?: "New" | "Refurbished" | "Custom Made";
  stock?: number;
  features?: string[];
}

export interface QueenSegregationResult {
  services: QueenSegregatedItem[];
  physicalProducts: QueenSegregatedItem[];
  reasoning: string;
}

/**
 * Intelligent AI Segregator: Examines raw business offerings, descriptions, and keywords
 * to cleanly segregate intangible services from tangible physical products.
 */
export async function segregateServicesAndProductsAI(params: {
  businessName: string;
  category: string;
  rawDescription: string;
  rawServices?: any[];
  rawProducts?: any[];
}): Promise<QueenSegregationResult> {
  const {
    businessName,
    category,
    rawDescription = "",
    rawServices = [],
    rawProducts = [],
  } = params;

  const rawServicesText = Array.isArray(rawServices)
    ? rawServices.map((s) => (typeof s === "string" ? s : `${s.title || ""} - ${s.description || ""}`)).join("; ")
    : "";
  const rawProductsText = Array.isArray(rawProducts)
    ? rawProducts.map((p) => (typeof p === "string" ? p : `${p.name || p.title || ""} - ${p.description || ""}`)).join("; ")
    : "";

  const prompt = `You are the Lead Commercial Product & Service Architect for Bethelincovibe TV.
Analyze the business details below and strictly segregate their offerings into:
1. SERVICES (Intangible professional offerings, bespoke consulting, custom tailoring labor, repair, development, catering service, photography, coaching)
2. PHYSICAL PRODUCTS (Tangible items delivered/shipped to customers, e.g., ready-to-wear clothing, packaged foods, shoes, phones, solar inverters, wigs, cosmetics, electronics)

BUSINESS INFO:
- Name: "${businessName}"
- Sector/Category: "${category}"
- Overview: "${rawDescription}"
- User-listed Services: "${rawServicesText || "None specified"}"
- User-listed Products: "${rawProductsText || "None specified"}"

RULES:
- ONLY derive offerings grounded in the real business context and Nigerian commerce practices.
- Do NOT invent fake unmentioned industries.
- If the business is purely service-based (e.g. Accounting, Law Firm, Web Agency), return 2-4 comprehensive Services and an empty physicalProducts array.
- If the business sells physical items (e.g. Boutique, Phone Store, Solar Vendor), generate high-converting physical products with realistic Naira pricing and condition.

OUTPUT STRICT JSON ONLY:
{
  "reasoning": "Identified 2 core custom services and 2 tangible physical inventory products.",
  "services": [
    {
      "type": "service",
      "title": "Service Name",
      "description": "Clear explanation of what the client receives.",
      "priceNaira": 25000,
      "formattedPrice": "₦25,000",
      "tags": ["Tag1", "Tag2"],
      "features": ["Deliverable 1", "Deliverable 2"]
    }
  ],
  "physicalProducts": [
    {
      "type": "physical_product",
      "title": "Product Name",
      "description": "Commercial description for buyers.",
      "priceNaira": 45000,
      "formattedPrice": "₦45,000",
      "condition": "New",
      "stock": 10,
      "category": "Fashion & Apparel",
      "tags": ["Tag1", "Tag2"],
      "features": ["Feature 1", "Feature 2"]
    }
  ]
}`;

  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      const res = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: { temperature: 0.2 },
      });

      const raw = res?.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && (Array.isArray(parsed.services) || Array.isArray(parsed.physicalProducts))) {
        return {
          services: (parsed.services || []).map((s: any) => ({
            ...s,
            type: "service",
            imageUrl: s.imageUrl || getCategoryStockImage(category),
          })),
          physicalProducts: (parsed.physicalProducts || []).map((p: any) => ({
            ...p,
            type: "physical_product",
            condition: p.condition || "New",
            stock: p.stock || 5,
            imageUrl: p.imageUrl || getCategoryStockImage(p.category || category),
          })),
          reasoning: parsed.reasoning || "Successfully segregated services and products.",
        };
      }
    }
  } catch (err) {
    console.warn("AI Segregator notice, falling back to heuristic segregation:", err);
  }

  // Heuristic Fallback
  return fallbackSegregation(businessName, category, rawServices, rawProducts);
}

function fallbackSegregation(
  businessName: string,
  category: string,
  rawServices: any[],
  rawProducts: any[]
): QueenSegregationResult {
  const isProductHeavy =
    category.toLowerCase().includes("retail") ||
    category.toLowerCase().includes("fashion") ||
    category.toLowerCase().includes("solar") ||
    category.toLowerCase().includes("phone");

  const services: QueenSegregatedItem[] = (rawServices && rawServices.length > 0
    ? rawServices
    : [{ title: `${businessName} Consultation & Solutions`, description: `Standard service offerings by ${businessName}.` }]
  ).map((s: any) => ({
    type: "service" as const,
    title: s.title || `${businessName} Professional Service`,
    description: s.description || `High-quality ${category} service delivered with guaranteed excellence.`,
    imageUrl: s.image_url || getCategoryStockImage(category),
  }));

  const physicalProducts: QueenSegregatedItem[] = [];

  if (isProductHeavy || (rawProducts && rawProducts.length > 0)) {
    const list = rawProducts && rawProducts.length > 0 ? rawProducts : [{ title: `${businessName} Premium Package` }];
    for (const p of list) {
      physicalProducts.push({
        type: "physical_product" as const,
        title: p.name || p.title || `${businessName} Verified Product`,
        description: p.description || `Original authentic ${category} product with warranty and fast delivery.`,
        priceNaira: p.price || 25000,
        formattedPrice: "₦25,000",
        condition: "New",
        stock: 10,
        category: category,
        imageUrl: p.cover_image || getCategoryStockImage(category),
      });
    }
  }

  return {
    services,
    physicalProducts,
    reasoning: "Heuristically segregated catalog into standard service and product items.",
  };
}

/**
 * Persists physical products cleanly into the `directory_products` database table
 * without duplicating existing items.
 */
export async function syncPhysicalProductsToDirectory(
  userId: string,
  businessData: {
    id: string;
    name: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
  },
  productsToSync: QueenSegregatedItem[]
): Promise<Array<{ id: string; name: string; price: number | null }>> {
  if (!userId || !productsToSync || productsToSync.length === 0) {
    return [];
  }

  // Fetch existing products for this user to avoid duplicates
  const { data: existingProducts } = await supabase
    .from("directory_products")
    .select("id, name, slug")
    .eq("user_id", userId);

  const existingNames = new Set(
    (existingProducts || []).map((p) => p.name.toLowerCase().trim())
  );

  const insertedResults: Array<{ id: string; name: string; price: number | null }> = [];

  for (const item of productsToSync) {
    const cleanName = item.title.trim();
    if (existingNames.has(cleanName.toLowerCase())) {
      const existing = (existingProducts || []).find((p) => p.name.toLowerCase().trim() === cleanName.toLowerCase());
      if (existing) {
        insertedResults.push({ id: existing.id, name: cleanName, price: item.priceNaira || null });
      }
      continue;
    }

    const slug =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const { data: inserted, error } = await supabase
      .from("directory_products")
      .insert({
        user_id: userId,
        name: cleanName,
        slug,
        description: item.description,
        price: item.priceNaira || null,
        currency: "NGN",
        product_type: "physical",
        condition: item.condition || "New",
        stock: item.stock || 5,
        cover_image: item.imageUrl || null,
        location: businessData.address || "Lagos, Nigeria",
        phone: businessData.phone || null,
        whatsapp: businessData.whatsapp || businessData.phone || null,
        status: "active",
        active: true,
        featured: false,
      })
      .select("id, name, price")
      .single();

    if (!error && inserted) {
      insertedResults.push({
        id: inserted.id,
        name: inserted.name,
        price: inserted.price,
      });
      existingNames.add(cleanName.toLowerCase());
    }
  }

  return insertedResults;
}
