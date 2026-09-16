import { getGeminiClient } from "./aiCollaborationEngine";
import { supabase } from "@/integrations/supabase/client";

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
  { id: "other-physical", name: "Other Physical Merchandise", slug: "other-physical", type: "physical", image3D: physicalGoods3D, color: "from-slate-600 to-slate-800", badge: "General Goods", description: "Other physical merchandise and custom physical products" },
];

export const DIGITAL_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: "ebooks-guides", name: "E-books & Sourcing Guides", slug: "ebooks-guides", type: "digital", image3D: startupGuide3D, color: "from-purple-600 to-indigo-600", badge: "PDF Manuals", description: "PDF blueprints, business playbooks, China/Turkey sourcing manuals & guides" },
  { id: "courses-masterclasses", name: "Online Courses & Masterclasses", slug: "courses-masterclasses", type: "digital", image3D: academyCardImg, color: "from-fuchsia-600 to-pink-600", badge: "Video Training", description: "Online video masterclasses, recorded bootcamps, workshops & training modules" },
  { id: "templates-spreadsheets", name: "Templates & Spreadsheets", slug: "templates-spreadsheets", type: "digital", image3D: marketingSales3D, color: "from-emerald-500 to-teal-600", badge: "Notion & Excel", description: "Financial models, Notion dashboards, Canva design kits, Excel trackers & resume kits" },
  { id: "graphics-design-assets", name: "Graphics & Design Assets", slug: "graphics-design-assets", type: "digital", image3D: digitalGoods3D, color: "from-violet-500 to-purple-600", badge: "Design Assets", description: "UI design kits, 3D icons, vector illustrations, mockups & design templates" },
  { id: "logos-branding", name: "Logos & Brand Identity Kits", slug: "logos-branding", type: "digital", image3D: digitalGoods3D, color: "from-amber-500 to-orange-600", badge: "Brand Identity", description: "Vector logos, brand style guides, stationery packs & business identity bundles" },
  { id: "software-apps", name: "Software, Apps & Automation Bots", slug: "software-apps", type: "digital", image3D: digitalGoods3D, color: "from-cyan-500 to-blue-600", badge: "Bots & Apps", description: "Web tools, desktop apps, WhatsApp automation bots, WordPress plugins & CRM scripts" },
  { id: "source-code-scripts", name: "Source Code & Developer Scripts", slug: "source-code-scripts", type: "digital", image3D: digitalGoods3D, color: "from-sky-600 to-indigo-700", badge: "Code & APIs", description: "Full stack web templates, React/Next.js codebases, mobile app source codes & scripts" },
  { id: "digital-planners-printables", name: "Digital Planners & Printables", slug: "digital-planners-printables", type: "digital", image3D: marketingSales3D, color: "from-teal-500 to-emerald-600", badge: "Printables", description: "GoodNotes / iPad planners, daily organizers, printable art, checklists & journals" },
  { id: "stock-photos-presets", name: "Stock Photos, Fonts & Presets", slug: "stock-photos-presets", type: "digital", image3D: digitalGoods3D, color: "from-rose-500 to-pink-600", badge: "Stock & Presets", description: "High-resolution photography, Lightroom color presets, typography fonts & overlays" },
  { id: "audio-music-jingles", name: "Audio Files, Beats & Jingles", slug: "audio-music-jingles", type: "digital", image3D: academyCardImg, color: "from-orange-500 to-amber-600", badge: "Audio & Jingles", description: "Commercial radio jingles, Afrobeat beats, royalty-free background audio & voiceovers" },
  { id: "business-contracts-legal", name: "Business Contracts & Legal Kits", slug: "business-contracts-legal", type: "digital", image3D: startupGuide3D, color: "from-blue-600 to-indigo-700", badge: "Legal Templates", description: "Verified Nigerian business contract agreements, NDAs, employee agreements & invoices" },
  { id: "other-digital", name: "Other Digital Products", slug: "other-digital", type: "digital", image3D: digitalGoods3D, color: "from-slate-600 to-slate-800", badge: "Digital Goods", description: "Miscellaneous digital assets, licensed digital content & downloadable downloads" },
];

export const ALL_PRODUCT_CATEGORIES = [
  ...PHYSICAL_PRODUCT_CATEGORIES,
  ...DIGITAL_PRODUCT_CATEGORIES,
];

export const PRODUCT_CATEGORY_MAP: Record<
  string,
  {
    name: string;
    slug: string;
    type: ProductType;
    dbFallbackSlug: string;
    description: string;
    badge: string;
  }
> = {
  "software-apps": {
    name: "Software, Apps & Automation Bots",
    slug: "software-apps",
    type: "digital",
    dbFallbackSlug: "technology",
    description: "Web tools, desktop apps, WhatsApp automation bots, WordPress plugins & CRM scripts",
    badge: "Bots & Apps",
  },
  "source-code-scripts": {
    name: "Source Code & Developer Scripts",
    slug: "source-code-scripts",
    type: "digital",
    dbFallbackSlug: "technology",
    description: "Full stack web templates, React/Next.js codebases, mobile app source codes & scripts",
    badge: "Code & APIs",
  },
  "ebooks-guides": {
    name: "E-books & Sourcing Guides",
    slug: "ebooks-guides",
    type: "digital",
    dbFallbackSlug: "education-training",
    description: "PDF blueprints, business playbooks, China/Turkey sourcing manuals & guides",
    badge: "PDF Manuals",
  },
  "courses-masterclasses": {
    name: "Online Courses & Masterclasses",
    slug: "courses-masterclasses",
    type: "digital",
    dbFallbackSlug: "education-training",
    description: "Online video masterclasses, recorded bootcamps, workshops & training modules",
    badge: "Video Training",
  },
  "templates-spreadsheets": {
    name: "Templates & Spreadsheets",
    slug: "templates-spreadsheets",
    type: "digital",
    dbFallbackSlug: "digital-services",
    description: "Financial models, Notion dashboards, Canva design kits, Excel trackers & resume kits",
    badge: "Notion & Excel",
  },
  "graphics-design-assets": {
    name: "Graphics & Design Assets",
    slug: "graphics-design-assets",
    type: "digital",
    dbFallbackSlug: "digital-services",
    description: "UI design kits, 3D icons, vector illustrations, mockups & design templates",
    badge: "Design Assets",
  },
  "logos-branding": {
    name: "Logos & Brand Identity Kits",
    slug: "logos-branding",
    type: "digital",
    dbFallbackSlug: "digital-services",
    description: "Vector logos, brand style guides, stationery packs & business identity bundles",
    badge: "Brand Identity",
  },
  "digital-planners-printables": {
    name: "Digital Planners & Printables",
    slug: "digital-planners-printables",
    type: "digital",
    dbFallbackSlug: "digital-services",
    description: "GoodNotes / iPad planners, daily organizers, printable art, checklists & journals",
    badge: "Printables",
  },
  "stock-photos-presets": {
    name: "Stock Photos, Fonts & Presets",
    slug: "stock-photos-presets",
    type: "digital",
    dbFallbackSlug: "digital-services",
    description: "High-resolution photography, Lightroom color presets, typography fonts & overlays",
    badge: "Stock & Presets",
  },
  "audio-music-jingles": {
    name: "Audio Files, Beats & Jingles",
    slug: "audio-music-jingles",
    type: "digital",
    dbFallbackSlug: "events-entertainment",
    description: "Commercial radio jingles, Afrobeat beats, royalty-free background audio & voiceovers",
    badge: "Audio & Jingles",
  },
  "business-contracts-legal": {
    name: "Business Contracts & Legal Kits",
    slug: "business-contracts-legal",
    type: "digital",
    dbFallbackSlug: "professional-services",
    description: "Verified Nigerian business contract agreements, NDAs, employee agreements & invoices",
    badge: "Legal Templates",
  },
  "other-digital": {
    name: "Other Digital Products",
    slug: "other-digital",
    type: "digital",
    dbFallbackSlug: "digital-services",
    description: "Miscellaneous digital assets, licensed digital content & downloadable downloads",
    badge: "Digital Goods",
  },
  "food-groceries": {
    name: "Food & Groceries",
    slug: "food-groceries",
    type: "physical",
    dbFallbackSlug: "food-restaurants",
    description: "Packaged foods, fresh farm produce, raw spices, beverages, snacks & pantry staples",
    badge: "Fresh & Packaged",
  },
  "fashion-apparel": {
    name: "Fashion & Apparel",
    slug: "fashion-apparel",
    type: "physical",
    dbFallbackSlug: "fashion-clothing",
    description: "Clothing, shoes, bags, wristwatches, jewelry & tailored native wear",
    badge: "Clothing & Wear",
  },
  "phones-tablets": {
    name: "Phones & Tablets",
    slug: "phones-tablets",
    type: "physical",
    dbFallbackSlug: "technology",
    description: "Smartphones, iPads, tablets, smartwatches, chargers & phone accessories",
    badge: "Gadgets & Gear",
  },
  "electronics-appliances": {
    name: "Electronics & Appliances",
    slug: "electronics-appliances",
    type: "physical",
    dbFallbackSlug: "technology",
    description: "Laptops, TVs, home audio, power banks, blenders, refrigerators & inverters",
    badge: "Appliances & TVs",
  },
  "health-beauty": {
    name: "Health & Beauty",
    slug: "health-beauty",
    type: "physical",
    dbFallbackSlug: "beauty-salon",
    description: "Skincare, haircare, perfumes, organic oils, makeup & wellness products",
    badge: "Cosmetics & Care",
  },
  "home-living": {
    name: "Home, Furniture & Kitchen",
    slug: "home-living",
    type: "physical",
    dbFallbackSlug: "retail-shopping",
    description: "Home decor, living room furniture, cookware, beddings & lighting",
    badge: "Interior & Kitchen",
  },
  "automotive-parts": {
    name: "Automotive & Spare Parts",
    slug: "automotive-parts",
    type: "physical",
    dbFallbackSlug: "automobile",
    description: "Car accessories, engine parts, car care, tyres & tracking devices",
    badge: "Auto & Parts",
  },
  "baby-kids": {
    name: "Baby, Kids & Toys",
    slug: "baby-kids",
    type: "physical",
    dbFallbackSlug: "retail-shopping",
    description: "Children clothing, educational toys, strollers & baby feeding essentials",
    badge: "Toys & Strollers",
  },
  "agro-industrial": {
    name: "Agro, Tools & Industrial",
    slug: "agro-industrial",
    type: "physical",
    dbFallbackSlug: "agriculture",
    description: "Agricultural machinery, seeds, industrial supplies, generators & hardware tools",
    badge: "Equipment & Agro",
  },
  "other-physical": {
    name: "Other Physical Merchandise",
    slug: "other-physical",
    type: "physical",
    dbFallbackSlug: "retail-shopping",
    description: "Other physical merchandise and custom physical products",
    badge: "General Goods",
  },
};

export function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Safely resolves a category UUID for database insertion.
 * Guarantees that selected category maps deterministically to the proper DB category UUID.
 * Strictly guarantees that non-agro categories NEVER fall back to Agriculture.
 */
export function resolveSafeProductCategoryUuid(
  categoryIdOrSlug: string | undefined | null,
  dbCategories: Array<{ id: string; slug?: string; name?: string; type?: string }> = []
): string | null {
  if (!categoryIdOrSlug) return null;
  const clean = String(categoryIdOrSlug).trim();

  // 1. If already a valid UUID, return it
  if (isValidUuid(clean)) return clean;

  // 2. Direct match in DB categories by slug or name
  const directMatch = dbCategories.find(
    (c) =>
      c.id === clean ||
      (c.slug && c.slug.toLowerCase() === clean.toLowerCase()) ||
      (c.name && c.name.toLowerCase() === clean.toLowerCase())
  );
  if (directMatch && isValidUuid(directMatch.id)) {
    return directMatch.id;
  }

  // 3. Match against canonical PRODUCT_CATEGORY_MAP presets
  const preset =
    PRODUCT_CATEGORY_MAP[clean] ||
    ALL_PRODUCT_CATEGORIES.find(
      (p) => p.slug === clean || p.id === clean || p.name.toLowerCase() === clean.toLowerCase()
    );

  if (preset) {
    const targetDbSlug = (preset as any).dbFallbackSlug || preset.slug;

    // Find the mapped category in dbCategories
    const matchedDbCat = dbCategories.find(
      (c) =>
        (c.slug && c.slug.toLowerCase() === targetDbSlug.toLowerCase()) ||
        (c.name && c.name.toLowerCase().includes(targetDbSlug.toLowerCase()))
    );
    if (matchedDbCat && isValidUuid(matchedDbCat.id)) {
      return matchedDbCat.id;
    }

    // Secondary fallback based on type (NEVER Agriculture)
    if (preset.type === "digital") {
      const techOrDigital = dbCategories.find(
        (c) => c.slug === "technology" || c.slug === "digital-services" || c.slug === "education-training"
      );
      if (techOrDigital && isValidUuid(techOrDigital.id)) return techOrDigital.id;
    } else if (clean === "agro-industrial") {
      const agroCat = dbCategories.find((c) => c.slug === "agriculture");
      if (agroCat && isValidUuid(agroCat.id)) return agroCat.id;
    } else {
      const retailOrService = dbCategories.find(
        (c) => c.slug === "retail-shopping" || c.slug === "fashion-clothing" || c.slug === "food-restaurants"
      );
      if (retailOrService && isValidUuid(retailOrService.id)) return retailOrService.id;
    }
  }

  return null;
}

/**
 * Resolves or automatically registers a product category in the database.
 */
export async function resolveOrCreateProductCategoryUuid(
  categoryIdOrSlug: string | undefined | null,
  dbCategories: Array<{ id: string; slug?: string; name?: string; type?: string }> = []
): Promise<string | null> {
  if (!categoryIdOrSlug) return null;
  const clean = String(categoryIdOrSlug).trim();

  // Check safe synchronous resolution first
  const existingUuid = resolveSafeProductCategoryUuid(clean, dbCategories);
  if (existingUuid) return existingUuid;

  return null;
}

/**
 * Single, platform-wide canonical source of truth for resolving any product's category display.
 * Guarantees that digital products always display digital categories (Software, Ebooks, Templates, etc.),
 * physical products display physical categories, and never incorrectly shows Agriculture or No Category.
 */
export function getProductCategoryInfo(
  product: any,
  _dbCategories?: Array<{ id: string; slug?: string; name?: string }>
): {
  name: string;
  slug: string;
  type: ProductType;
  badge: string;
  color?: string;
  image3D?: string;
} {
  if (!product) {
    return {
      name: "Marketplace Product",
      slug: "other-physical",
      type: "physical",
      badge: "Marketplace",
    };
  }

  const isDigital =
    product.product_type === "digital" ||
    product.condition === "digital" ||
    String(product.delivery_method || "").toLowerCase().includes("file") ||
    String(product.delivery_method || "").toLowerCase().includes("link");

  // 1. Direct check on product.category_slug or preset ID
  const directSlug = product.category_slug || product.category_id;
  if (directSlug && PRODUCT_CATEGORY_MAP[directSlug]) {
    const item = PRODUCT_CATEGORY_MAP[directSlug];
    const preset = ALL_PRODUCT_CATEGORIES.find((p) => p.slug === item.slug);
    return {
      name: item.name,
      slug: item.slug,
      type: item.type,
      badge: item.badge,
      color: preset?.color,
      image3D: preset?.image3D,
    };
  }

  // 2. Check if product.categories (joined from DB) matches a preset
  const dbCatName = product.categories?.name || "";
  const dbCatSlug = (product.categories?.slug || "").toLowerCase();

  const presetByJoin = ALL_PRODUCT_CATEGORIES.find(
    (p) =>
      p.slug.toLowerCase() === dbCatSlug ||
      p.name.toLowerCase() === dbCatName.toLowerCase() ||
      p.id.toLowerCase() === dbCatSlug
  );
  if (presetByJoin) {
    return {
      name: presetByJoin.name,
      slug: presetByJoin.slug,
      type: presetByJoin.type,
      badge: presetByJoin.badge || presetByJoin.name,
      color: presetByJoin.color,
      image3D: presetByJoin.image3D,
    };
  }

  // 3. Match by name or title keywords if digital or physical
  const pName = (product.name || "").toLowerCase();
  const pDesc = (product.description || "").toLowerCase();

  if (isDigital) {
    if (
      pName.includes("software") ||
      pName.includes("bot") ||
      pName.includes("app") ||
      pName.includes("crm") ||
      pName.includes("viral") ||
      pDesc.includes("software") ||
      pDesc.includes("automation")
    ) {
      const p = PRODUCT_CATEGORY_MAP["software-apps"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("code") || pName.includes("script") || pName.includes("api") || pDesc.includes("source code")) {
      const p = PRODUCT_CATEGORY_MAP["source-code-scripts"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("ebook") || pName.includes("guide") || pName.includes("playbook") || pName.includes("pdf") || pDesc.includes("ebook")) {
      const p = PRODUCT_CATEGORY_MAP["ebooks-guides"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("course") || pName.includes("masterclass") || pName.includes("training") || pName.includes("bootcamp")) {
      const p = PRODUCT_CATEGORY_MAP["courses-masterclasses"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("template") || pName.includes("spreadsheet") || pName.includes("notion") || pName.includes("excel")) {
      const p = PRODUCT_CATEGORY_MAP["templates-spreadsheets"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("graphic") || pName.includes("design") || pName.includes("icon") || pName.includes("mockup")) {
      const p = PRODUCT_CATEGORY_MAP["graphics-design-assets"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("logo") || pName.includes("branding") || pName.includes("brand kit")) {
      const p = PRODUCT_CATEGORY_MAP["logos-branding"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("planner") || pName.includes("printable") || pName.includes("journal")) {
      const p = PRODUCT_CATEGORY_MAP["digital-planners-printables"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("photo") || pName.includes("preset") || pName.includes("font")) {
      const p = PRODUCT_CATEGORY_MAP["stock-photos-presets"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("audio") || pName.includes("music") || pName.includes("beat") || pName.includes("jingle")) {
      const p = PRODUCT_CATEGORY_MAP["audio-music-jingles"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (pName.includes("contract") || pName.includes("legal") || pName.includes("nda") || pName.includes("agreement")) {
      const p = PRODUCT_CATEGORY_MAP["business-contracts-legal"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }

    if (dbCatSlug === "technology") {
      const p = PRODUCT_CATEGORY_MAP["software-apps"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }
    if (dbCatSlug === "education-training") {
      const p = PRODUCT_CATEGORY_MAP["ebooks-guides"];
      return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
    }

    const p = PRODUCT_CATEGORY_MAP["other-digital"];
    return { name: p.name, slug: p.slug, type: "digital", badge: p.badge };
  }

  // Physical matching
  if (dbCatSlug === "fashion-clothing" || pName.includes("cloth") || pName.includes("wear") || pName.includes("shoe") || pName.includes("jean")) {
    const p = PRODUCT_CATEGORY_MAP["fashion-apparel"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }
  if (dbCatSlug === "food-restaurants" || pName.includes("food") || pName.includes("spice") || pName.includes("grocery")) {
    const p = PRODUCT_CATEGORY_MAP["food-groceries"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }
  if (pName.includes("phone") || pName.includes("tablet") || pName.includes("iphone") || pName.includes("samsung")) {
    const p = PRODUCT_CATEGORY_MAP["phones-tablets"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }
  if (dbCatSlug === "technology" || pName.includes("laptop") || pName.includes("tv") || pName.includes("appliance")) {
    const p = PRODUCT_CATEGORY_MAP["electronics-appliances"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }
  if (dbCatSlug === "beauty-salon" || dbCatSlug === "health-pharmacy" || pName.includes("skin") || pName.includes("hair") || pName.includes("cream")) {
    const p = PRODUCT_CATEGORY_MAP["health-beauty"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }
  if (dbCatSlug === "automobile" || pName.includes("car") || pName.includes("auto") || pName.includes("tyre")) {
    const p = PRODUCT_CATEGORY_MAP["automotive-parts"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }
  if (dbCatSlug === "agriculture" || pName.includes("farm") || pName.includes("agro") || pName.includes("machinery")) {
    const p = PRODUCT_CATEGORY_MAP["agro-industrial"];
    return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
  }

  if (product.categories?.name && product.categories.name !== "Agriculture") {
    return {
      name: product.categories.name,
      slug: product.categories.slug || "other-physical",
      type: "physical",
      badge: product.categories.name,
    };
  }

  const p = PRODUCT_CATEGORY_MAP["other-physical"];
  return { name: p.name, slug: p.slug, type: "physical", badge: p.badge };
}

/**
 * Ensures all standard product categories exist in the database.
 */
export async function ensureAllProductCategoriesSeeded(): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("categories")
      .select("slug")
      .in("type", ["product", "business"]);

    const existingSlugs = new Set((existing || []).map((c) => c.slug?.toLowerCase()));

    const missingPresets = ALL_PRODUCT_CATEGORIES.filter(
      (p) => !existingSlugs.has(p.slug.toLowerCase())
    );

    if (missingPresets.length > 0) {
      const inserts = missingPresets.map((p) => ({
        name: p.name,
        slug: p.slug,
        type: "product",
        icon: "Package",
        description: p.description || `${p.name} category`,
      }));

      await supabase.from("categories").insert(inserts).catch(() => {});
    }
  } catch (err) {
    console.warn("Notice checking product categories seed:", err);
  }
}

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
        model: "gemini-3.8-flash",
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
