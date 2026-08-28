import { getGeminiClient } from "./aiCollaborationEngine";

import catFoodImg from "@/assets/images/cat_food_1787472795354.jpg";
import catFashionImg from "@/assets/images/cat_fashion_1787472783551.jpg";
import catTechImg from "@/assets/images/cat_tech_1787472827051.jpg";
import catBeautyImg from "@/assets/images/cat_beauty_1787472844524.jpg";
import catHomeImg from "@/assets/images/cat_realestate_1787472809208.jpg";
import catLogisticsImg from "@/assets/images/cat_logistics_1787472858667.jpg";
import digitalGoods3D from "@/assets/images/digital_goods_3d_1787915095364.jpg";
import physicalGoods3D from "@/assets/images/physical_goods_3d_1787915108745.jpg";
import startupGuide3D from "@/assets/images/icon_startup_guide_3d_1787553506436.jpg";
import marketingSales3D from "@/assets/images/icon_marketing_sales_3d_1787553549641.jpg";
import academyCardImg from "@/assets/images/learning_academy_card_1787779443703.jpg";

export type ProductType = "physical" | "digital";

export interface ProductCategoryOption {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  icon?: string;
  image3D?: string;
  color?: string;
  badge?: string;
  description?: string;
}

export const PHYSICAL_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: "food-groceries", name: "Food & Groceries", slug: "food-groceries", type: "physical", image3D: catFoodImg, color: "from-amber-500 to-orange-600", badge: "Fresh & Packaged", description: "Packaged foods, fresh farm produce, raw spices, beverages, snacks & pantry staples" },
  { id: "fashion-apparel", name: "Fashion & Apparel", slug: "fashion-apparel", type: "physical", image3D: catFashionImg, color: "from-pink-500 to-rose-600", badge: "Clothing & Wear", description: "Clothing, shoes, bags, wristwatches, jewelry & tailored native wear" },
  { id: "phones-tablets", name: "Phones & Tablets", slug: "phones-tablets", type: "physical", image3D: catTechImg, color: "from-sky-500 to-blue-600", badge: "Gadgets & Gear", description: "Smartphones, iPads, tablets, smartwatches, chargers & phone accessories" },
  { id: "electronics-appliances", name: "Electronics & Appliances", slug: "electronics-appliances", type: "physical", image3D: catTechImg, color: "from-indigo-500 to-violet-600", badge: "Appliances & TVs", description: "Laptops, TVs, home audio, power banks, blenders, refrigerators & inverters" },
  { id: "health-beauty", name: "Health & Beauty", slug: "health-beauty", type: "physical", image3D: catBeautyImg, color: "from-rose-400 to-pink-500", badge: "Cosmetics & Care", description: "Skincare, haircare, perfumes, organic oils, makeup & wellness products" },
  { id: "home-living", name: "Home, Furniture & Kitchen", slug: "home-living", type: "physical", image3D: catHomeImg, color: "from-emerald-500 to-teal-600", badge: "Interior & Kitchen", description: "Home decor, living room furniture, cookware, beddings & lighting" },
  { id: "automotive-parts", name: "Automotive & Spare Parts", slug: "automotive-parts", type: "physical", image3D: catLogisticsImg, color: "from-blue-600 to-slate-700", badge: "Auto & Parts", description: "Car accessories, engine parts, car care, tyres & tracking devices" },
  { id: "baby-kids", name: "Baby, Kids & Toys", slug: "baby-kids", type: "physical", image3D: physicalGoods3D, color: "from-amber-400 to-orange-500", badge: "Toys & Strollers", description: "Children clothing, educational toys, strollers & baby feeding essentials" },
  { id: "agro-industrial", name: "Agro, Tools & Industrial", slug: "agro-industrial", type: "physical", image3D: physicalGoods3D, color: "from-green-600 to-lime-700", badge: "Equipment & Agro", description: "Agricultural machinery, seeds, industrial supplies, generators & hardware tools" },
];

export const DIGITAL_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: "ebooks-guides", name: "eBooks & Sourcing Guides", slug: "ebooks-guides", type: "digital", image3D: startupGuide3D, color: "from-purple-600 to-indigo-600", badge: "PDF Manuals", description: "PDF blueprints, business playbooks, China/Turkey sourcing manuals & guides" },
  { id: "courses-masterclasses", name: "Courses & Video Masterclasses", slug: "courses-masterclasses", type: "digital", image3D: academyCardImg, color: "from-fuchsia-600 to-pink-600", badge: "Video Training", description: "Online video masterclasses, recorded bootcamps, workshops & training modules" },
  { id: "software-apps-scripts", name: "Software, Apps & Automation Bots", slug: "software-apps-scripts", type: "digital", image3D: digitalGoods3D, color: "from-cyan-500 to-blue-600", badge: "Bots & Scripts", description: "Web tools, desktop apps, WhatsApp automation bots, WordPress plugins & scripts" },
  { id: "templates-spreadsheets", name: "Templates & Spreadsheets", slug: "templates-spreadsheets", type: "digital", image3D: marketingSales3D, color: "from-emerald-500 to-teal-600", badge: "Notion & Excel", description: "Financial models, Notion dashboards, Canva design kits, Excel trackers & resume kits" },
  { id: "graphics-ui-3d", name: "Graphics, UI Kits & 3D Assets", slug: "graphics-ui-3d", type: "digital", image3D: digitalGoods3D, color: "from-violet-500 to-purple-600", badge: "Vectors & 3D", description: "Vector logos, 3D icons, UI design kits, stock photography & branding mockups" },
  { id: "music-audio-jingles", name: "Music, Beats & Jingles", slug: "music-audio-jingles", type: "digital", image3D: academyCardImg, color: "from-orange-500 to-amber-600", badge: "Audio & Jingles", description: "Commercial jingles, afrobeat beats, royalty-free audio, podcast intros & voiceovers" },
  { id: "business-contracts-legal", name: "Business Contracts & Legal Kits", slug: "business-contracts-legal", type: "digital", image3D: startupGuide3D, color: "from-blue-600 to-indigo-700", badge: "Legal Templates", description: "Verified Nigerian business contract agreements, NDAs, employee agreements & invoices" },
];

export const ALL_PRODUCT_CATEGORIES = [
  ...PHYSICAL_PRODUCT_CATEGORIES,
  ...DIGITAL_PRODUCT_CATEGORIES,
];

export function getCategoryBySlug(slug?: string | null) {
  if (!slug) return null;
  return ALL_PRODUCT_CATEGORIES.find((c) => c.slug === slug || c.name.toLowerCase() === slug.toLowerCase());
}

/**
 * Clean stray asterisks, hashes, and markdown formatting artifacts from text
 */
export function cleanRawAsterisks(text: string): string {
  if (!text) return "";
  return text
    // Replace markdown bold **text** or ***text*** with plain text
    .replace(/\*{2,3}([^*]+)\*{2,3}/g, "$1")
    // Replace single asterisk *text* with plain text
    .replace(/\*([^*]+)\*/g, "$1")
    // Replace leading list asterisks like "* Item" with bullet character "• Item"
    .replace(/^\s*\*\s+/gm, "• ")
    // Remove stray single asterisks
    .replace(/\*/g, "")
    // Remove raw markdown headers like "### Title" to "Title"
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

/**
 * AI Product Description Generator
 * Takes user inputs and returns a structured, high-converting product description
 */
export async function generateProductDescriptionAI(params: {
  productName: string;
  roughNotes?: string;
  category?: string;
  productType?: "physical" | "digital";
  price?: number | string;
  condition?: string;
  location?: string;
}): Promise<string> {
  const {
    productName,
    roughNotes = "",
    category = "General",
    productType = "physical",
    price,
    condition = "New",
    location = "Lagos, Nigeria",
  } = params;

  if (!productName.trim() && !roughNotes.trim()) {
    throw new Error("Please provide at least a product title or a few rough notes.");
  }

  const prompt = `You are a professional e-commerce copywriter and commercial marketing expert for Nigerian buyers and international trade.
Write a clear, high-converting, professional product description for the following product:

Product Name: ${productName || "Product"}
Product Type: ${productType === "digital" ? "Digital Download / Electronic Asset" : "Physical Goods"}
Category: ${category}
Condition: ${condition}
Price / Value: ${price ? `₦${Number(price).toLocaleString()}` : "Market competitive"}
Seller Location: ${location}
Seller's Notes/Key Details: ${roughNotes || "Top quality, verified authenticity, immediate availability"}

Formatting Instructions:
- Do NOT use raw asterisks like * or **. Instead, write clean headings in uppercase or clear labels, and use "• " for bullet points.
- Structure the description clearly with:
  1. An attention-grabbing 2-sentence opening summary explaining why this is valuable.
  2. KEY HIGHLIGHTS & SPECIFICATIONS (bullet points with "• ").
  3. WHY CHOOSE THIS / BENEFITS (2-3 bullet points with "• ").
  4. ${productType === "digital" ? "DELIVERY & ACCESS (Instant download / lifetime access instructions)" : "DELIVERY & PACKAGING (Inspection before payment, delivery timelines across Lagos and nationwide)"}.
- Keep the tone trustworthy, persuasive, and easy for any customer to read.`;

  try {
    const ai = await getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      const raw = response.text || "";
      if (raw.trim()) {
        return cleanRawAsterisks(raw);
      }
    }
  } catch (err) {
    console.warn("Gemini API call failed, generating localized fallback template:", err);
  }

  // Fallback high-quality template generator
  const isDigital = productType === "digital";
  const title = productName.trim() || "Premium Commercial Product";

  if (isDigital) {
    return `OVERVIEW
Get instant access to ${title}, crafted to save you time, increase efficiency, and provide step-by-step practical value for your business and personal growth.

KEY HIGHLIGHTS & FEATURES
• Instant Digital Access: Download immediately upon purchase with 24/7 lifetime availability.
• Practical & Actionable: Packed with field-tested insights, customizable templates, and easy-to-follow steps.
• Device Compatible: Works seamlessly across all smartphones, tablets, laptops, and desktop computers.
• Verified Quality: Designed according to top industry standards with clear guidance.

WHAT YOU RECEIVE
• Complete digital files in high-resolution, ready-to-use formats.
• Step-by-step implementation guide and reference notes.
• Direct customer support for any questions or access assistance.

INSTANT ACCESS & DELIVERY
Upon confirmation, your download link is provided immediately and also sent directly to your registered email and WhatsApp. No waiting, start using right away!`;
  }

  return `OVERVIEW
Discover the ${title}, offering reliable quality, high performance, and exceptional value. Carefully sourced and verified for buyers who demand the best.

KEY FEATURES & SPECIFICATIONS
• Condition: ${condition} - thoroughly inspected for full functionality and premium finish.
• Premium Durability: Built with authentic materials for long-lasting daily use.
• Performance: Fast, efficient, and ready to use immediately out of the box.
• Verified Seller: Direct contact with verified Lagos supplier with transparent pricing.

WHY CHOOSE THIS ITEM
• High return on investment with superior durability compared to standard market alternatives.
• Backed by responsive customer service and prompt delivery coordination.

DELIVERY & PURCHASE TERMS
• Fast delivery available across Lagos and prompt interstate shipping nationwide.
• Item inspection available upon delivery or pickup. Contact seller directly on WhatsApp for orders, custom requests, or inquiries.`;
}
