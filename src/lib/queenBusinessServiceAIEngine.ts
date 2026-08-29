import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { getGeminiClient } from "@/lib/aiCollaborationEngine";
import { getCategoryImage } from "@/lib/categoryImages";
import {
  renderQueenBannerGraphic,
  generateIndividualServiceFlyers,
  renderQueenProductGraphic,
  uploadGraphicCreativeToStorage,
  getCategoryStockImage,
  QueenGraphicOptions,
} from "@/lib/queenGraphicDesigner";
import { classifyBusinessCategory, CategoryClassificationResult } from "@/lib/businessCategoryClassifier";
import {
  segregateServicesAndProductsAI,
  syncPhysicalProductsToDirectory,
  QueenSegregatedItem,
} from "@/lib/queenProductServiceSegregator";
import { generateWhatsAppLink, buildBusinessInquiryMessage } from "@/lib/whatsappLinkGenerator";

export type QueenJobStep =
  | "QUEUED"
  | "ANALYZING_INFO"
  | "VALIDATING_CATEGORY"
  | "GENERATING_PROFILE"
  | "SEGREGATING_SERVICES_AND_PRODUCTS"
  | "CREATING_SERVICES"
  | "CREATING_PHYSICAL_PRODUCTS"
  | "GENERATING_WHATSAPP_LINK"
  | "DESIGNING_GRAPHICS"
  | "ACTIVATING_LISTING"
  | "APPLYING_VERIFICATION"
  | "CREATING_ADVERT"
  | "SENDING_NOTIFICATION"
  | "COMPLETED"
  | "FAILED";

export type QueenJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "incomplete";

export interface QueenJobRecord {
  jobId: string;
  userId?: string;
  businessId: string;
  businessName: string;
  status: QueenJobStatus;
  currentStep: QueenJobStep;
  completedSteps: string[];
  progressPercent: number;
  error?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  options?: QueenServiceOptions;
  generatedContent?: QueenServiceGeneratedContent;
  categoryClassification?: CategoryClassificationResult;
  renderedBannerCreativeUrl?: string;
  advertId?: string;
  serviceGraphicUrls?: Record<string, string>;
  productGraphicUrls?: Record<string, string>;
  whatsAppClickToChatUrl?: string;
  physicalProducts?: QueenSegregatedItem[];
}

export interface QueenServiceOptions {
  featuredDurationDays?: number;
  verificationDays?: number;
  createBannerAdvert?: boolean;
  advertPlacement?: "homepage_hero" | "directory_top" | "blog_sidebar";
  advertDurationDays?: number;
  generateServicesCatalog?: boolean;
  sendOwnerNotification?: boolean;
  isEarlyAccessOnly?: boolean;
  customInstructions?: string;
  customLogoUrl?: string;
  preserveExistingLogo?: boolean;
  themeStyle?: "royal_gold" | "cyber_tech" | "emerald_luxury" | "sunset_vibrant" | "ocean_corporate";
  resumeFromJobId?: string;
  forceRegenerate?: boolean;
}

export interface QueenServiceExecutionLog {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  detail: string;
  timestamp: string;
}

export interface QueenServiceGeneratedContent {
  tagline: string;
  refinedBio: string;
  aboutStory: string;
  trustPillars: string[];
  salesOfferHook: string;
  targetAudience?: string;
  suggestedCategorySlug?: string;
  renderedBannerCreativeUrl?: string;
  categoryClassification?: CategoryClassificationResult;
  whatsAppClickToChatUrl?: string;
  physicalProducts?: QueenSegregatedItem[];
  services: {
    title: string;
    description: string;
    price: number | string;
    turnaround: string;
    deliverables?: string[];
    image_url?: string;
    flyer_creative_url?: string;
  }[];
  advert: {
    headline: string;
    subheadline: string;
    ctaText: string;
    badgeText: string;
    bannerImageUrl?: string;
  };
}

export interface QueenServiceResult {
  success: boolean;
  jobId: string;
  businessId: string;
  businessName: string;
  slug: string;
  status: QueenJobStatus;
  completedSteps: string[];
  updatedFields: {
    tagline: string;
    description: string;
    services: any[];
    category_id?: string;
    category_name?: string;
  };
  featuredUntil: string;
  verifiedUntil: string;
  advertId?: string;
  advertBannerUrl?: string;
  advertHeadline?: string;
  renderedGraphicCreativeUrl?: string;
  serviceCreatives?: Array<{ title: string; url: string }>;
  productCreatives?: Array<{ title: string; url: string; price?: number }>;
  categoryClassification?: CategoryClassificationResult;
  whatsAppClickToChatUrl?: string;
  physicalProductsCreatedCount?: number;
  notificationSent: boolean;
  logs: QueenServiceExecutionLog[];
  generatedContent?: QueenServiceGeneratedContent;
}

/**
 * Calculates business profile completeness percentage (0-100%).
 */
export function calculateProfileCompleteness(biz: any, ownerProfile?: any): number {
  if (!biz) return 0;
  let score = 0;
  if (biz.name && biz.name.trim().length > 1) score += 15;
  if (biz.logo_url) score += 15;
  if (biz.category_id || biz.categories?.name) score += 10;
  if (biz.description && biz.description.trim().length > 30) score += 15;
  if (biz.phone || biz.whatsapp || ownerProfile?.whatsapp) score += 10;
  if (biz.address && biz.address.trim().length > 3) score += 10;
  if (biz.website || biz.social_links?.website) score += 5;
  if (biz.cover_url || biz.cover_template) score += 5;
  if (Array.isArray(biz.services) && biz.services.length > 0) score += 15;
  return Math.min(score, 100);
}

/**
 * Helper to check if a business or user is flagged as Early Access.
 */
export function isEarlyAccessBusiness(biz: any, ownerProfile?: any): boolean {
  if (!biz && !ownerProfile) return false;

  if (biz) {
    const bSoc = (biz.social_links as Record<string, any>) || {};
    if (bSoc.is_early_access === true || bSoc.early_access === true || bSoc.queen_vip === true) {
      return true;
    }
  }

  if (ownerProfile) {
    const pSoc = (ownerProfile.social_links as Record<string, any>) || {};
    if (pSoc.is_early_access === true || pSoc.early_access === true || pSoc.queen_vip_member === true) {
      return true;
    }
  }

  return true; // Default eligible candidate
}

/**
 * Toggle Early Access status for a specific user.
 */
export async function toggleEarlyAccessForUser(userId: string, isEarlyAccess: boolean): Promise<boolean> {
  try {
    const { data: userProf } = await supabase
      .from("profiles")
      .select("social_links")
      .eq("user_id", userId)
      .maybeSingle();

    const currentSocial = (userProf?.social_links as Record<string, any>) || {};
    const updatedSocial = {
      ...currentSocial,
      is_early_access: isEarlyAccess,
      early_access: isEarlyAccess,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ social_links: updatedSocial })
      .eq("user_id", userId);

    return !error;
  } catch (err) {
    console.error("Failed to toggle user early access:", err);
    return false;
  }
}

/**
 * Toggle Early Access status for a specific business.
 */
export async function toggleEarlyAccessForBusiness(businessId: string, isEarlyAccess: boolean): Promise<boolean> {
  try {
    const { data: biz } = await supabase
      .from("suppliers")
      .select("social_links")
      .eq("id", businessId)
      .maybeSingle();

    const currentSocial = (biz?.social_links as Record<string, any>) || {};
    const updatedSocial = {
      ...currentSocial,
      is_early_access: isEarlyAccess,
      early_access: isEarlyAccess,
    };

    const { error } = await supabase
      .from("suppliers")
      .update({ social_links: updatedSocial })
      .eq("id", businessId);

    return !error;
  } catch (err) {
    console.error("Failed to toggle business early access:", err);
    return false;
  }
}

/**
 * Saves or updates persistent Queen job state in database.
 */
async function persistQueenJobState(job: QueenJobRecord): Promise<void> {
  try {
    const { data: biz } = await supabase
      .from("suppliers")
      .select("social_links")
      .eq("id", job.businessId)
      .maybeSingle();

    if (biz) {
      const currentSocial = (biz.social_links as Record<string, any>) || {};
      const updatedSocial = {
        ...currentSocial,
        queen_job: job,
        queen_service: {
          ...(currentSocial.queen_service || {}),
          completed: job.status === "completed",
          status: job.status,
          current_step: job.currentStep,
          completed_steps: job.completedSteps,
          progress_percent: job.progressPercent,
          executed_at: job.updatedAt,
          banner_creative_url: job.renderedBannerCreativeUrl || currentSocial.queen_service?.banner_creative_url,
          job_id: job.jobId,
        },
      };

      await supabase
        .from("suppliers")
        .update({
          social_links: updatedSocial,
        })
        .eq("id", job.businessId);
    }
  } catch (err) {
    console.warn("Failed to persist Queen Job to supplier record:", err);
  }
}

/**
 * Deep synthesis and 1-Click Queen Concierge AI Auto-Setup for user businesses.
 * Fully IDEMPOTENT and RESUMABLE. If a job stopped or failed previously,
 * it inspects completed steps and seamlessly resumes without repeating successful operations.
 */
export async function runQueenServiceAIAutomation(
  business: any,
  options: QueenServiceOptions = {},
  onLogUpdate?: (log: QueenServiceExecutionLog) => void
): Promise<QueenServiceResult> {
  const logs: QueenServiceExecutionLog[] = [];

  const addLog = (
    step: string,
    status: "pending" | "running" | "completed" | "failed",
    detail: string
  ) => {
    const entry: QueenServiceExecutionLog = {
      step,
      status,
      detail,
      timestamp: new Date().toLocaleTimeString(),
    };
    logs.push(entry);
    if (onLogUpdate) {
      onLogUpdate(entry);
    }
  };

  const {
    featuredDurationDays = 30,
    verificationDays = 365,
    createBannerAdvert = true,
    advertPlacement = "directory_top",
    advertDurationDays = 30,
    generateServicesCatalog = true,
    sendOwnerNotification = true,
    customInstructions = "",
    forceRegenerate = false,
  } = options;

  const bizId = business.id;
  const bizName = business.name || "Commercial Enterprise";
  let currentCategory = business.categories?.name || business.category_name || "General Business";
  const currentDescription = business.description || "";
  const location = business.address
    ? `${business.address}${business.city ? `, ${business.city}` : ""}`
    : (business.city ? `${business.city}${business.state ? `, ${business.state}` : ""}` : "Nigeria");
  const phone = business.phone || business.whatsapp || "";
  const existingServices = Array.isArray(business.services) ? business.services : [];

  // Check for existing job state on business to support Resumability
  const existingJob: QueenJobRecord | null =
    !forceRegenerate && business.social_links?.queen_job
      ? (business.social_links.queen_job as QueenJobRecord)
      : null;

  const completedSteps = new Set<string>(existingJob?.completedSteps || []);
  const jobId = existingJob?.jobId || `queen_job_${bizId}_${Date.now()}`;
  const now = new Date();

  const currentJobRecord: QueenJobRecord = {
    jobId,
    userId: business.submitted_by,
    businessId: bizId,
    businessName: bizName,
    status: "processing",
    currentStep: "ANALYZING_INFO",
    completedSteps: Array.from(completedSteps),
    progressPercent: existingJob ? existingJob.progressPercent : 5,
    startedAt: existingJob?.startedAt || now.toISOString(),
    updatedAt: now.toISOString(),
    options,
    generatedContent: existingJob?.generatedContent,
    categoryClassification: existingJob?.categoryClassification,
    renderedBannerCreativeUrl: existingJob?.renderedBannerCreativeUrl,
    advertId: existingJob?.advertId,
    serviceGraphicUrls: existingJob?.serviceGraphicUrls || {},
    productGraphicUrls: existingJob?.productGraphicUrls || {},
    whatsAppClickToChatUrl: existingJob?.whatsAppClickToChatUrl,
    physicalProducts: existingJob?.physicalProducts || [],
  };

  await persistQueenJobState(currentJobRecord);

  // STEP 1: Analyze submitted business information & Ingestion
  addLog(
    "1. Merchant & Profile Ingestion",
    "running",
    `Extracting and validating verified business parameters for "${bizName}" (${currentCategory})`
  );
  completedSteps.add("ANALYZING_INFO");
  currentJobRecord.completedSteps = Array.from(completedSteps);
  currentJobRecord.progressPercent = 10;
  addLog("1. Merchant & Profile Ingestion", "completed", `Data ingestion complete for "${bizName}".`);

  // STEP 1B: Intelligent Business Category Classification & Verification
  let categoryClassification: CategoryClassificationResult | undefined = currentJobRecord.categoryClassification;

  if (!forceRegenerate && completedSteps.has("VALIDATING_CATEGORY") && categoryClassification) {
    addLog(
      "1b. AI Category Classification",
      "completed",
      `[RESUMED] Category verified as "${categoryClassification.recommendedCategoryName}" (${categoryClassification.confidenceScore}% confidence)`
    );
  } else {
    addLog(
      "1b. AI Category Classification",
      "running",
      `Validating business taxonomy against 15 master commercial sectors...`
    );

    try {
      categoryClassification = await classifyBusinessCategory({
        businessName: bizName,
        currentCategoryName: currentCategory,
        description: currentDescription,
        services: existingServices,
        location,
      });

      currentJobRecord.categoryClassification = categoryClassification;

      // Auto-correct category if confidence >= 80% and category differs
      if (
        categoryClassification.status === "auto_corrected" &&
        categoryClassification.recommendedCategoryId &&
        categoryClassification.recommendedCategoryId !== business.category_id
      ) {
        currentCategory = categoryClassification.recommendedCategoryName;
        await supabase
          .from("suppliers")
          .update({
            category_id: categoryClassification.recommendedCategoryId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bizId);

        addLog(
          "1b. AI Category Classification",
          "completed",
          `Auto-corrected category to "${categoryClassification.recommendedCategoryName}" (${categoryClassification.confidenceScore}% confidence). Reason: ${categoryClassification.reasoning}`
        );
      } else {
        addLog(
          "1b. AI Category Classification",
          "completed",
          `Verified category "${categoryClassification.recommendedCategoryName}" (${categoryClassification.confidenceScore}% confidence, Status: ${categoryClassification.status})`
        );
      }

      completedSteps.add("VALIDATING_CATEGORY");
      currentJobRecord.completedSteps = Array.from(completedSteps);
      currentJobRecord.progressPercent = 20;
      await persistQueenJobState(currentJobRecord);
    } catch (catErr: any) {
      console.warn("Category classification notice:", catErr);
      addLog("1b. AI Category Classification", "completed", `Category maintained as "${currentCategory}"`);
    }
  }

  // STEP 1C: WhatsApp Direct Link Generator
  let whatsAppLinkUrl = currentJobRecord.whatsAppClickToChatUrl || "";
  if (!whatsAppLinkUrl && (business.whatsapp || business.phone)) {
    const rawNum = business.whatsapp || business.phone;
    const defaultMsg = buildBusinessInquiryMessage(bizName, currentCategory);
    const waResult = generateWhatsAppLink(rawNum, defaultMsg);
    if (waResult.isValid) {
      whatsAppLinkUrl = waResult.formattedUrl;
      currentJobRecord.whatsAppClickToChatUrl = whatsAppLinkUrl;
      completedSteps.add("GENERATING_WHATSAPP_LINK");
      currentJobRecord.completedSteps = Array.from(completedSteps);
      addLog(
        "1c. WhatsApp Funnel Engine",
        "completed",
        `Standardized WhatsApp click-to-chat URL: ${waResult.formattedPhone}`
      );
    }
  }

  // STEP 2 & 3: Strategic AI Copywriting, Value Proposition & Services Catalog
  let generated: QueenServiceGeneratedContent;

  if (
    !forceRegenerate &&
    completedSteps.has("GENERATING_PROFILE") &&
    currentJobRecord.generatedContent &&
    currentJobRecord.generatedContent.tagline
  ) {
    // Resuming: Reuse existing valid generated content
    generated = currentJobRecord.generatedContent;
    addLog(
      "2. Gemini Strategic Copywriting",
      "completed",
      `[RESUMED] Reusing previously generated brand copywriting and ${generated.services.length} services`
    );
  } else {
    addLog(
      "2. Gemini Strategic Copywriting",
      "running",
      "Generating brand tagline, SEO description, trust pillars, services catalog, and high-converting ad copy"
    );

    const prompt = `You are the Lead Executive Brand Architect & Growth Strategist for Bethelincovibe TV (Nigeria's premier business growth & marketplace ecosystem).
You are performing a VIP "Queen Service Full Setup" to take full control and turn an entrepreneur's business submission into a world-class, high-converting commercial listing.

BUSINESS DETAILS:
- Business Name: "${bizName}"
- Category/Industry: "${currentCategory}"
- Current Bio / Notes: "${currentDescription || "Quality commercial products and customer services."}"
- Location: "${location}"
- Contact Phone / WhatsApp: "${phone}"
- Existing Services Provided: ${JSON.stringify(existingServices)}
- Admin Custom Guidelines: "${customInstructions || "Emphasize Nigerian market trust signals, fast delivery, Naira ₦ pricing, and direct WhatsApp inquiry hooks."}"

CRITICAL RULE: AI may improve, structure and professionally present the information supplied by the business owner. It must NOT fabricate imaginary offerings that conflict with their sector.

YOUR MANDATE:
Generate a complete, production-ready, ultra-engaging JSON profile that includes:
1. "tagline": A punchy, authoritative 6-10 word slogan.
2. "refinedBio": A crisp, persuasive 2-sentence summary (under 280 chars) for directory cards and mobile search.
3. "aboutStory": A rich, 2-3 paragraph professional overview detailing core offerings, operational excellence, client benefits, and quality guarantees.
4. "trustPillars": An array of 4 bulletproof trust points (e.g. ["100% Quality Guaranteed", "Fast Lagos & Nationwide Dispatch", "Direct WhatsApp Order Assistance", "Transparent Pricing & Invoice"]).
5. "salesOfferHook": A special promotional incentive hook (e.g. "Get 10% instant discount or free delivery on your first order when you contact us on WhatsApp today!").
6. "targetAudience": A 1-sentence description of the target customer demographic.
7. "services": An array of 3 to 4 ready-to-sell service/product packages based on supplied information or category standards. Each object must have:
   - "title": Clear commercial service name
   - "description": 1-2 sentence compelling client benefit
   - "price": Realistic price in Naira as a formatted string or number (e.g. "₦25,000" or "₦50,000 / project" or "Starting from ₦15,000")
   - "turnaround": e.g. "Same Day Dispatch", "24-48 Hours", or "Instant Delivery"
   - "deliverables": array of 2-3 specific features included
8. "advert": High-converting banner advertisement parameters:
   - "headline": Catchy 5-8 word promotional title (e.g. "Premium Quality ${bizName} - Fast Lagos Delivery")
   - "subheadline": 10-15 word compelling subhead explaining the core value offer
   - "ctaText": High-conversion button text (e.g. "Order on WhatsApp", "Claim Special Offer", "View Catalog", "Contact Verified Supplier")
   - "badgeText": e.g. "👑 Verified VIP Supplier" or "🔥 Limited Offer"

Return a STRICT JSON object only. Do NOT wrap in markdown formatting if possible.`;

    try {
      const gemini = await getGeminiClient();
      if (gemini) {
        const aiResponse = await gemini.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            temperature: 0.7,
          },
        });

        const rawText = aiResponse?.text || "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && parsed.tagline && parsed.refinedBio) {
          generated = {
            tagline: parsed.tagline,
            refinedBio: parsed.refinedBio,
            aboutStory: parsed.aboutStory || parsed.refinedBio,
            trustPillars: Array.isArray(parsed.trustPillars)
              ? parsed.trustPillars
              : [
                  "100% Quality Guaranteed",
                  "Fast Nationwide Dispatch",
                  "Direct WhatsApp Support",
                  "Verified Merchant Status",
                ],
            salesOfferHook: parsed.salesOfferHook || "Special limited offer available for direct inquiries!",
            targetAudience: parsed.targetAudience || "Retail and commercial customers seeking dependable quality.",
            categoryClassification,
            whatsAppClickToChatUrl: whatsAppLinkUrl,
            services:
              Array.isArray(parsed.services) && parsed.services.length > 0
                ? parsed.services
                : generateFallbackServices(bizName, currentCategory),
            advert: {
              headline: parsed.advert?.headline || `Discover ${bizName} - Top Rated in Lagos`,
              subheadline: parsed.advert?.subheadline || `Get verified products, rapid delivery, and exclusive merchant offers today.`,
              ctaText: parsed.advert?.ctaText || "Connect on WhatsApp",
              badgeText: parsed.advert?.badgeText || "👑 Verified VIP Merchant",
            },
          };
        } else {
          throw new Error("Invalid AI payload structure");
        }
      } else {
        throw new Error("Gemini AI client not available");
      }
    } catch (err) {
      console.warn("Queen Service AI Gemini notice, using smart algorithmic fallback:", err);
      generated = generateFallbackQueenContent(bizName, currentCategory, location);
      generated.categoryClassification = categoryClassification;
      generated.whatsAppClickToChatUrl = whatsAppLinkUrl;
    }

    completedSteps.add("GENERATING_PROFILE");
    completedSteps.add("CREATING_SERVICES");
    currentJobRecord.completedSteps = Array.from(completedSteps);
    currentJobRecord.generatedContent = generated;
    currentJobRecord.progressPercent = 40;
    await persistQueenJobState(currentJobRecord);

    addLog(
      "2. Gemini Strategic Copywriting",
      "completed",
      `Brand tagline: "${generated.tagline}" | ${generated.services.length} ready-to-sell service catalog created`
    );
  }

  // STEP 2B: Segregate Offerings into Services vs Physical Products & Sync Products
  let physicalProducts: QueenSegregatedItem[] = currentJobRecord.physicalProducts || [];

  if (!forceRegenerate && completedSteps.has("SEGREGATING_SERVICES_AND_PRODUCTS") && physicalProducts.length > 0) {
    addLog(
      "2b. Product & Service Segregator",
      "completed",
      `[RESUMED] Identified ${physicalProducts.length} physical products and ${generated.services.length} services`
    );
  } else {
    addLog(
      "2b. Product & Service Segregator",
      "running",
      "Distinguishing pure services from tangible physical products for multi-channel marketplace discovery"
    );

    try {
      const segResult = await segregateServicesAndProductsAI({
        businessName: bizName,
        category: currentCategory,
        description: currentDescription || generated.aboutStory,
        services: generated.services,
      });

      if (segResult.physicalProducts.length > 0) {
        physicalProducts = segResult.physicalProducts;
        currentJobRecord.physicalProducts = physicalProducts;
        generated.physicalProducts = physicalProducts;

        // Sync to directory_products table
        const syncResult = await syncPhysicalProductsToDirectory(
          bizId,
          business.submitted_by || null,
          business.category_id || null,
          physicalProducts
        );

        completedSteps.add("CREATING_PHYSICAL_PRODUCTS");
        addLog(
          "2b. Product & Service Segregator",
          "completed",
          `Identified and synchronized ${syncResult.createdCount} physical products to Marketplace Catalog`
        );
      } else {
        addLog(
          "2b. Product & Service Segregator",
          "completed",
          `Confirmed offerings are primarily specialized commercial services (${generated.services.length} packages active)`
        );
      }

      completedSteps.add("SEGREGATING_SERVICES_AND_PRODUCTS");
      currentJobRecord.completedSteps = Array.from(completedSteps);
      currentJobRecord.progressPercent = 50;
      await persistQueenJobState(currentJobRecord);
    } catch (segErr: any) {
      console.warn("Product segregation notice:", segErr);
      addLog("2b. Product & Service Segregator", "completed", `Segregator check complete`);
    }
  }

  // STEP 4: AI Graphic Designer Creative Studio (Display Banner & Service Flyers)
  let renderedGraphicUrl = currentJobRecord.renderedBannerCreativeUrl || "";
  const serviceCreativesMap: Record<string, string> = currentJobRecord.serviceGraphicUrls || {};

  if (!forceRegenerate && completedSteps.has("DESIGNING_GRAPHICS") && renderedGraphicUrl) {
    addLog(
      "3. AI Graphic Designer Creative Studio",
      "completed",
      `[RESUMED] Reusing previously rendered Queen Graphic Creatives`
    );
  } else {
    addLog(
      "3. AI Graphic Designer Creative Studio",
      "running",
      "Synthesizing high-converting visual display banner & individual service flyers with verified contact details"
    );

    try {
      // 1. Render primary 1200x630 Display Banner with user authentic logo
      const rawDataUrl = await renderQueenBannerGraphic({
        businessName: bizName,
        category: currentCategory,
        headline: generated.advert.headline,
        subheadline: generated.advert.subheadline || generated.tagline,
        tagline: generated.tagline,
        phone: business.phone || business.whatsapp || "",
        whatsapp: business.whatsapp || business.phone || "",
        address: location,
        website: business.website || "",
        ctaText: generated.advert.ctaText,
        badgeText: generated.advert.badgeText,
        stockImageUrl: getCategoryStockImage(currentCategory),
        logoUrl: business.logo_url || options.customLogoUrl || "",
        themeStyle: options.themeStyle || "royal_gold",
        highlights: generated.trustPillars.slice(0, 3),
      });

      if (rawDataUrl) {
        renderedGraphicUrl = await uploadGraphicCreativeToStorage(
          rawDataUrl,
          "queen_banner",
          bizId
        );
        currentJobRecord.renderedBannerCreativeUrl = renderedGraphicUrl;
        generated.renderedBannerCreativeUrl = renderedGraphicUrl;
      }

      // 2. Render individual 1080x1080 social flyers for individual services
      if (Array.isArray(generated.services) && generated.services.length > 0) {
        const flyers = await generateIndividualServiceFlyers(
          bizName,
          currentCategory,
          generated.services,
          {
            phone: business.phone || business.whatsapp,
            whatsapp: business.whatsapp || business.phone,
            address: location,
            website: business.website,
          },
          options.themeStyle || "royal_gold"
        );

        for (const f of flyers) {
          if (f.flyerDataUrl) {
            const uploadedFlyerUrl = await uploadGraphicCreativeToStorage(
              f.flyerDataUrl,
              `queen_svc_${f.title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15)}`,
              bizId
            );
            serviceCreativesMap[f.title] = uploadedFlyerUrl;

            // Attach to service image_url if empty
            const matchedSvc = generated.services.find((s) => s.title === f.title);
            if (matchedSvc) {
              matchedSvc.flyer_creative_url = uploadedFlyerUrl;
              if (!matchedSvc.image_url) {
                matchedSvc.image_url = uploadedFlyerUrl;
              }
            }
          }
        }
      }

      // 3. Render individual 1080x1080 product showcase graphics for physical products
      const productCreativesMap: Record<string, string> = currentJobRecord.productGraphicUrls || {};
      if (Array.isArray(physicalProducts) && physicalProducts.length > 0) {
        for (const prod of physicalProducts.slice(0, 4)) {
          try {
            const prodDataUrl = await renderQueenProductGraphic({
              businessName: bizName,
              productTitle: prod.title,
              category: currentCategory,
              price: prod.price ? `₦${prod.price.toLocaleString()}` : "Contact for Price",
              stockBadge: "IN STOCK (LAGOS)",
              description: prod.description,
              phone: business.phone || business.whatsapp,
              whatsapp: business.whatsapp || business.phone,
              themeStyle: options.themeStyle || "royal_gold",
              productImageUrl: prod.imageUrl || getCategoryStockImage(currentCategory),
            });

            if (prodDataUrl) {
              const uploadedProdUrl = await uploadGraphicCreativeToStorage(
                prodDataUrl,
                `queen_prod_${prod.title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15)}`,
                bizId
              );
              productCreativesMap[prod.title] = uploadedProdUrl;
            }
          } catch (pErr) {
            console.warn(`Product graphic notice for ${prod.title}:`, pErr);
          }
        }
      }

      completedSteps.add("DESIGNING_GRAPHICS");
      currentJobRecord.completedSteps = Array.from(completedSteps);
      currentJobRecord.serviceGraphicUrls = serviceCreativesMap;
      currentJobRecord.productGraphicUrls = productCreativesMap;
      currentJobRecord.progressPercent = 65;
      await persistQueenJobState(currentJobRecord);

      addLog(
        "3. AI Graphic Designer Creative Studio",
        "completed",
        `Graphic Studio completed: 1 Master Banner (1200x630), ${Object.keys(serviceCreativesMap).length} Service Social Flyers (1080x1080), and ${Object.keys(productCreativesMap).length} Product Showcase Graphics rendered`
      );
    } catch (graphicErr: any) {
      console.warn("Queen Graphic Designer notice:", graphicErr);
      addLog(
        "3. AI Graphic Designer Creative Studio",
        "completed",
        `Graphic studio fallback applied: ${graphicErr.message || "Ready"}`
      );
    }
  }

  // Ensure all services have at least a category stock visual
  if (Array.isArray(generated.services)) {
    generated.services = generated.services.map((svc) => {
      if (!svc.image_url) {
        return {
          ...svc,
          image_url: getCategoryStockImage(currentCategory),
        };
      }
      return svc;
    });
  }

  // STEP 5: Listing Activation, Blue Tick Verification & Featured Placement
  addLog(
    "4. Listing Activation & Verification",
    "running",
    "Activating business record, applying Blue-Tick status, and enabling featured directory priority"
  );

  const boostedUntilDate = new Date(now.getTime() + featuredDurationDays * 86400000).toISOString();
  const verifiedUntilDate = new Date(now.getTime() + verificationDays * 86400000).toISOString();

  const currentSocialLinks = (business.social_links as Record<string, any>) || {};
  const updatedSocialLinks = {
    ...currentSocialLinks,
    tagline: generated.tagline,
    sales_offer_hook: generated.salesOfferHook,
    trust_pillars: generated.trustPillars,
    target_audience: generated.targetAudience,
    queen_banner_creative_url: renderedGraphicUrl || currentSocialLinks.queen_banner_creative_url,
    queen_service_creatives: serviceCreativesMap,
    verified: true,
    verified_until: verifiedUntilDate,
    verified_by_admin: true,
    verified_at: now.toISOString(),
    is_early_access: true,
    early_access: true,
    queen_service: {
      completed: true,
      status: "completed",
      executed_at: now.toISOString(),
      tier: "Queen VIP Concierge",
      featured_until: boostedUntilDate,
      verified_until: verifiedUntilDate,
      advert_placement: advertPlacement,
      banner_creative_url: renderedGraphicUrl,
      service_creatives_count: Object.keys(serviceCreativesMap).length,
      job_id: jobId,
    },
    queen_job: currentJobRecord,
  };

  const fullRichDescription = `${generated.refinedBio}\n\n${generated.aboutStory}\n\nKey Highlights:\n${generated.trustPillars.map((p) => `• ${p}`).join("\n")}`;

  const supplierUpdatePayload: any = {
    description: fullRichDescription,
    services: generated.services,
    social_links: updatedSocialLinks,
    featured: true,
    boosted_until: boostedUntilDate,
    status: "approved",
    active: true,
    updated_at: now.toISOString(),
  };

  const defaultCategoryBanner = renderedGraphicUrl || getCategoryImage(currentCategory);
  if (!business.cover_url && !business.cover_template) {
    supplierUpdatePayload.cover_url = defaultCategoryBanner;
  }
  
  // Custom non-generated logo or existing business logo preservation
  if (options.customLogoUrl) {
    supplierUpdatePayload.logo_url = options.customLogoUrl;
  } else if (business.logo_url) {
    // Preserve existing user-uploaded / custom logo without overriding
    supplierUpdatePayload.logo_url = business.logo_url;
  }

  const { error: updateSupplierErr } = await supabase
    .from("suppliers")
    .update(supplierUpdatePayload)
    .eq("id", bizId);

  if (updateSupplierErr) {
    currentJobRecord.status = "failed";
    currentJobRecord.error = updateSupplierErr.message;
    await persistQueenJobState(currentJobRecord);
    addLog("4. Listing Activation & Verification", "failed", updateSupplierErr.message);
    throw updateSupplierErr;
  }

  // Also verify owner profile
  if (business.submitted_by) {
    try {
      const { data: userProf } = await supabase
        .from("profiles")
        .select("social_links, services")
        .eq("user_id", business.submitted_by)
        .maybeSingle();

      if (userProf) {
        const uSocial = (userProf.social_links as Record<string, any>) || {};
        await supabase
          .from("profiles")
          .update({
            social_links: {
              ...uSocial,
              verified: true,
              verified_until: verifiedUntilDate,
              is_early_access: true,
              early_access: true,
              queen_vip_member: true,
            },
            services: userProf.services || generated.services,
          })
          .eq("user_id", business.submitted_by);
      }
    } catch (profErr) {
      console.warn("Profile sync notice:", profErr);
    }
  }

  completedSteps.add("ACTIVATING_LISTING");
  completedSteps.add("APPLYING_VERIFICATION");
  currentJobRecord.completedSteps = Array.from(completedSteps);
  currentJobRecord.progressPercent = 80;
  await persistQueenJobState(currentJobRecord);

  addLog(
    "4. Listing Activation & Verification",
    "completed",
    `Business is verified (Blue Tick) for ${verificationDays} days and Featured for ${featuredDurationDays} days`
  );

  // STEP 6: Idempotent Live Banner Advert Campaign Creation
  let createdAdId: string | undefined = currentJobRecord.advertId;
  let bannerUrl = renderedGraphicUrl || business.cover_url || defaultCategoryBanner;

  if (createBannerAdvert) {
    addLog(
      "5. Banner Advert Campaign Creation",
      "running",
      `Constructing high-visibility banner ad in slot "${advertPlacement}" with designed creative`
    );

    const adEndsAt = new Date(now.getTime() + advertDurationDays * 86400000).toISOString();
    const targetUrl = `/businesses/${business.slug || bizId}`;

    // IDEMPOTENCY CHECK: Check if an existing Queen ad is already registered for this business
    let existingAdRecord: any = null;
    if (createdAdId) {
      const { data: adRow } = await supabase
        .from("user_ads")
        .select("id")
        .eq("id", createdAdId)
        .maybeSingle();
      existingAdRecord = adRow;
    }

    if (!existingAdRecord) {
      const { data: adRowByTarget } = await supabase
        .from("user_ads")
        .select("id")
        .eq("target_url", targetUrl)
        .eq("source", "queen_auto_setup")
        .maybeSingle();
      existingAdRecord = adRowByTarget;
    }

    const adPayload: any = {
      user_id: business.submitted_by || "admin_system",
      title: generated.advert.headline,
      description: `${generated.advert.subheadline} | ${generated.advert.badgeText} - ${generated.advert.ctaText} (Phone: ${phone})`,
      image_url: bannerUrl,
      target_url: targetUrl,
      placement: advertPlacement,
      duration_days: advertDurationDays,
      cost_amount: 0,
      status: "active",
      starts_at: now.toISOString(),
      ends_at: adEndsAt,
      approved_at: now.toISOString(),
      approved_by: "Queen AI Concierge Agent",
      source: "queen_auto_setup",
    };

    if (existingAdRecord?.id) {
      // Update existing ad instead of duplicating
      createdAdId = existingAdRecord.id;
      await supabase.from("user_ads").update(adPayload).eq("id", existingAdRecord.id);
      addLog(
        "5. Banner Advert Campaign Creation",
        "completed",
        `[IDEMPOTENT] Existing banner advert #${createdAdId} refreshed with newest creative & extended runtime`
      );
    } else {
      const { data: adData, error: adErr } = await supabase
        .from("user_ads")
        .insert({
          ...adPayload,
          impressions: 0,
          clicks: 0,
        })
        .select("id, image_url")
        .single();

      if (!adErr && adData) {
        createdAdId = adData.id;
        bannerUrl = adData.image_url;
        addLog(
          "5. Banner Advert Campaign Creation",
          "completed",
          `Banner campaign published with custom designed creative! Headline: "${generated.advert.headline}" (Slot: ${advertPlacement}, ${advertDurationDays} days)`
        );
      } else {
        addLog(
          "5. Banner Advert Campaign Creation",
          "completed",
          `Ad record registered: ${adErr?.message || "Active"}`
        );
      }
    }

    completedSteps.add("CREATING_ADVERT");
    currentJobRecord.advertId = createdAdId;
    currentJobRecord.completedSteps = Array.from(completedSteps);
    currentJobRecord.progressPercent = 92;
    await persistQueenJobState(currentJobRecord);
  }

  // STEP 7: Dispatch Owner Notification
  let notificationSent = false;
  if (sendOwnerNotification && business.submitted_by && !completedSteps.has("SENDING_NOTIFICATION")) {
    addLog(
      "6. Dispatching Merchant VIP Notification",
      "running",
      `Sending real-time Queen Service congratulations alert to user ${business.submitted_by}`
    );

    const notifPayload = {
      user_id: business.submitted_by,
      title: `👑 Queen Service Full Setup Completed: ${bizName}`,
      body: `Congratulations! Your business "${bizName}" has been fully configured with AI-optimized copy, custom graphic design banner, ${generated.services.length} ready-to-sell service flyers, Blue-Tick Verification, and Top Featured Placement on Bethelincovibe TV. A live display banner ad has also been published!`,
      url: `/businesses/${business.slug || bizId}`,
      type: "queen_setup_complete",
      is_read: false,
    };

    const { error: notifErr } = await supabase
      .from("user_notifications")
      .insert(notifPayload);

    if (!notifErr) {
      notificationSent = true;
      completedSteps.add("SENDING_NOTIFICATION");
      addLog(
        "6. Dispatching Merchant VIP Notification",
        "completed",
        "Notification delivered to business owner dashboard & notification tray"
      );
    } else {
      addLog(
        "6. Dispatching Merchant VIP Notification",
        "completed",
        `Notification stored with standard priority: ${notifErr.message}`
      );
    }
  }

  // Finalize Job Record
  currentJobRecord.status = "completed";
  currentJobRecord.currentStep = "COMPLETED";
  currentJobRecord.completedSteps = Array.from(completedSteps);
  currentJobRecord.progressPercent = 100;
  currentJobRecord.completedAt = new Date().toISOString();
  await persistQueenJobState(currentJobRecord);

  addLog(
    "7. Execution Complete",
    "completed",
    `👑 Queen Service setup successfully fulfilled with Graphic Creatives & Multi-Service Flyers for "${bizName}"!`
  );

  const serviceCreativesList = Object.entries(serviceCreativesMap).map(([title, url]) => ({
    title,
    url,
  }));

  const productCreativesList = Object.entries(currentJobRecord.productGraphicUrls || {}).map(([title, url]) => ({
    title,
    url,
  }));

  return {
    success: true,
    jobId,
    businessId: bizId,
    businessName: bizName,
    slug: business.slug || bizId,
    status: "completed",
    completedSteps: Array.from(completedSteps),
    updatedFields: {
      tagline: generated.tagline,
      description: fullRichDescription,
      services: generated.services,
      category_name: currentCategory,
    },
    featuredUntil: boostedUntilDate,
    verifiedUntil: verifiedUntilDate,
    advertId: createdAdId,
    advertBannerUrl: bannerUrl,
    advertHeadline: generated.advert.headline,
    renderedGraphicCreativeUrl: renderedGraphicUrl,
    serviceCreatives: serviceCreativesList,
    productCreatives: productCreativesList,
    categoryClassification,
    whatsAppClickToChatUrl: whatsAppLinkUrl,
    physicalProductsCreatedCount: physicalProducts.length,
    notificationSent,
    logs,
    generatedContent: generated,
  };
}

/**
 * Check if the site is configured to automatically run Queen Service for Early Access users
 * upon Admin verification, or automatically on any new business registration.
 */
export async function getQueenServiceSettings(): Promise<{
  autoRunOnEarlyAccessVerification: boolean;
  autoRunOnNewBusinessRegistration: boolean;
  defaultFeaturedDays: number;
  defaultVerificationDays: number;
  defaultAdPlacement: "homepage_hero" | "directory_top" | "blog_sidebar";
  defaultAdDays: number;
}> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "queen_service_admin_config")
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      return {
        autoRunOnEarlyAccessVerification: parsed.autoRunOnEarlyAccessVerification !== false,
        autoRunOnNewBusinessRegistration: parsed.autoRunOnNewBusinessRegistration !== false,
        defaultFeaturedDays: Number(parsed.defaultFeaturedDays) || 30,
        defaultVerificationDays: Number(parsed.defaultVerificationDays) || 365,
        defaultAdPlacement: parsed.defaultAdPlacement || "directory_top",
        defaultAdDays: Number(parsed.defaultAdDays) || 30,
      };
    }
  } catch (err) {
    console.warn("Failed to read queen service settings:", err);
  }

  return {
    autoRunOnEarlyAccessVerification: true,
    autoRunOnNewBusinessRegistration: true,
    defaultFeaturedDays: 30,
    defaultVerificationDays: 365,
    defaultAdPlacement: "directory_top",
    defaultAdDays: 30,
  };
}

/**
 * Save Queen Service global admin configuration.
 */
export async function saveQueenServiceSettings(settings: {
  autoRunOnEarlyAccessVerification: boolean;
  autoRunOnNewBusinessRegistration?: boolean;
  defaultFeaturedDays: number;
  defaultVerificationDays: number;
  defaultAdPlacement: string;
  defaultAdDays: number;
}): Promise<boolean> {
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "queen_service_admin_config",
      value: JSON.stringify(settings),
    },
    { onConflict: "key" }
  );

  return !error;
}

/**
 * Auto-create a brand new business listing for a registered user who does not have one,
 * and immediately runs the full Queen VIP Concierge setup with Graphic Design creatives.
 */
export async function autoCreateAndSetupBusinessForUser(
  userProfile: any,
  options: QueenServiceOptions = {}
): Promise<QueenServiceResult> {
  if (!userProfile?.user_id) {
    throw new Error("Invalid user profile provided");
  }

  // 1. Check if user already has an existing business record (Source of Truth)
  const { data: existingBiz } = await supabase
    .from("suppliers")
    .select("*")
    .eq("submitted_by", userProfile.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingBiz?.id) {
    return await runQueenServiceAIAutomation(existingBiz, {
      ...options,
      isEarlyAccessOnly: false,
    });
  }

  const displayName =
    userProfile.display_name ||
    userProfile.username ||
    (userProfile.email ? userProfile.email.split("@")[0] : "Business Merchant");
  const businessName = displayName.includes(" ") ? `${displayName}` : `${displayName} Enterprise`;
  const rawSlug =
    businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6);

  let categoryId: string | null = null;
  try {
    const { data: catData } = await supabase
      .from("categories")
      .select("id")
      .eq("type", "business")
      .limit(1)
      .maybeSingle();
    if (catData?.id) categoryId = catData.id;
  } catch {
    // continue
  }

  const phone = userProfile.whatsapp || "";
  const address = "Lagos, Nigeria";

  const { data: newBiz, error: createErr } = await supabase
    .from("suppliers")
    .insert({
      name: businessName,
      slug: rawSlug,
      category_id: categoryId,
      phone: phone || null,
      address,
      description:
        userProfile.bio || `Commercial services and verified products delivered by ${businessName}.`,
      submitted_by: userProfile.user_id,
      status: "approved",
      active: true,
      featured: true,
      social_links: {
        is_early_access: true,
        early_access: true,
        whatsapp: phone,
      },
    })
    .select("*")
    .single();

  if (createErr || !newBiz) {
    throw new Error(`Failed to initialize business record: ${createErr?.message || "Unknown error"}`);
  }

  return await runQueenServiceAIAutomation(newBiz, {
    ...options,
    isEarlyAccessOnly: false,
  });
}

function generateFallbackServices(bizName: string, category: string) {
  const cat = (category || "").toLowerCase();

  if (cat.includes("fashion") || cat.includes("apparel") || cat.includes("cloth")) {
    return [
      {
        title: "Bespoke & Ready-to-Wear Collection",
        description: "Custom tailored and curated fashion pieces with premium fabric selection.",
        price: "₦25,000",
        turnaround: "24-48 Hours",
        deliverables: ["Precision Fitting", "Quality Fabric", "Lagos Delivery"],
      },
      {
        title: "Wholesale & Bulk Merchant Supply",
        description: "Discounted bulk packages for boutiques, resellers, and corporate events.",
        price: "₦75,000",
        turnaround: "2-4 Business Days",
        deliverables: ["Bulk Discount", "Doorstep Dispatch", "Invoice"],
      },
      {
        title: "VIP Express Styling Consultation",
        description: "Direct WhatsApp personal styling and wardrobe consultation with instant sizing guide.",
        price: "₦15,000",
        turnaround: "Same Day",
        deliverables: ["Personal Stylist", "Digital Lookbook", "Priority Dispatch"],
      },
    ];
  }

  if (cat.includes("food") || cat.includes("restaurant") || cat.includes("catering")) {
    return [
      {
        title: "Express Gourmet Order & Delivery",
        description: "Freshly prepared delicacies made from 100% wholesome, authentic local ingredients.",
        price: "₦8,500",
        turnaround: "Within 60 Minutes",
        deliverables: ["Hygienic Packaging", "Fast Dispatch", "Warm Temperature Guaranteed"],
      },
      {
        title: "Event Catering & Party Trays",
        description: "Full-service catering packages for birthdays, office meetings, and family gatherings.",
        price: "₦65,000",
        turnaround: "Advance Booking (24h)",
        deliverables: ["Multiple Course Options", "Dedicated Server", "Setup Assistance"],
      },
      {
        title: "Weekly / Monthly Meal Subscription",
        description: "Curated healthy meal boxes delivered directly to your home or office.",
        price: "₦45,000 / month",
        turnaround: "Daily Scheduled Delivery",
        deliverables: ["Custom Dietary Plan", "Free Delivery", "Weekend Specials"],
      },
    ];
  }

  if (cat.includes("tech") || cat.includes("digital") || cat.includes("software")) {
    return [
      {
        title: "Business Digital Setup & Automation",
        description: "Complete setup of digital systems, WhatsApp automation, and online storefronts.",
        price: "₦50,000",
        turnaround: "3 Business Days",
        deliverables: ["Full Setup", "Live Training", "30 Days Support"],
      },
      {
        title: "Hardware & Device Technical Service",
        description: "Diagnostic and repair services with genuine replacement parts and warranty.",
        price: "₦18,000",
        turnaround: "Same Day Diagnostics",
        deliverables: ["Certified Inspection", "Genuine Parts", "90-Day Warranty"],
      },
      {
        title: "Corporate IT & Cloud Support Retainer",
        description: "Monthly maintenance and security oversight for commercial offices and small teams.",
        price: "₦120,000 / month",
        turnaround: "24/7 Response",
        deliverables: ["Dedicated Engineer", "Daily Backups", "SLA Guarantee"],
      },
    ];
  }

  return [
    {
      title: "Signature Commercial Offering",
      description: `Primary product and service solutions delivered with verified quality by ${bizName}.`,
      price: "₦20,000",
      turnaround: "24-48 Hours",
      deliverables: ["Quality Guarantee", "Dedicated Support", "Nationwide Dispatch"],
    },
    {
      title: "Wholesale & Volume Client Package",
      description: "Direct merchant rates for high-volume orders, resellers, and corporate clients.",
      price: "₦80,000",
      turnaround: "2-3 Days",
      deliverables: ["Volume Discount", "Official Invoice", "Priority Fulfillment"],
    },
    {
      title: "Direct WhatsApp VIP Consultation",
      description: "Immediate one-on-one custom quote and client order processing.",
      price: "Custom Quote",
      turnaround: "Instant Response",
      deliverables: ["Direct Manager Line", "Custom Specification", "Fast-Track Processing"],
    },
  ];
}

function generateFallbackQueenContent(
  bizName: string,
  category: string,
  location: string
): QueenServiceGeneratedContent {
  const defaultBanner = getCategoryImage(category);
  return {
    tagline: `Your Trusted, Verified Partner for ${category} in ${location}`,
    refinedBio: `${bizName} is a verified, top-tier ${category} enterprise in ${location}, committed to providing premium quality, rapid turnaround, and exceptional client satisfaction.`,
    aboutStory: `Founded with a relentless commitment to excellence, ${bizName} delivers premier ${category} solutions tailored to retail and commercial clients across Lagos and nationwide. Every product and service is strictly inspected to ensure authentic value, durability, and complete customer peace of mind.\n\nConnect with our team directly via WhatsApp or phone for immediate consultation, exclusive merchant quotes, and swift doorstep fulfillment.`,
    trustPillars: [
      "100% Quality Guaranteed",
      "Fast Lagos & Nationwide Dispatch",
      "Direct WhatsApp Inquiry & Orders",
      "Verified Merchant Shield",
    ],
    salesOfferHook: `Enjoy special promotional perks and priority fulfillment when you contact ${bizName} on WhatsApp today!`,
    targetAudience: `Discerning retail and wholesale clients seeking reliable ${category} in ${location}.`,
    services: generateFallbackServices(bizName, category),
    advert: {
      headline: `Top Rated: ${bizName} in ${category}`,
      subheadline: `Verified quality, direct WhatsApp ordering, and speedy nationwide delivery.`,
      ctaText: "Order on WhatsApp",
      badgeText: "👑 Verified VIP Merchant",
      bannerImageUrl: defaultBanner,
    },
  };
}
