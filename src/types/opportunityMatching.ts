export type RequestStatus =
  | "DRAFT"
  | "OPEN"
  | "RECEIVING_OFFERS"
  | "AWAITING_CUSTOMER"
  | "AWARDED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type UrgencyLevel = "low" | "medium" | "high" | "urgent";

export type RequestServiceType = "service" | "product" | "consultation" | "project";

export interface ExtractedRequestInfo {
  category: string;
  categorySlug: string;
  serviceTitle: string;
  serviceType: RequestServiceType;
  purpose: string;
  budget: number | null;
  budgetFormatted: string;
  budgetType: "fixed" | "range" | "negotiable";
  deadline: string;
  deadlineDate?: string;
  urgency: UrgencyLevel;
  locationPreference: string;
  specificRequirements: string[];
  clarificationQuestion?: string;
  confidenceScore: number;
}

export interface BusinessRequest {
  id: string;
  user_id: string;
  customer_name: string;
  customer_avatar?: string;
  customer_phone?: string;
  customer_email?: string;
  raw_prompt: string;
  category: string;
  category_slug: string;
  service_title: string;
  service_type: RequestServiceType;
  purpose: string;
  budget: number | null;
  budget_formatted: string;
  budget_type: "fixed" | "range" | "negotiable";
  deadline: string;
  deadline_date?: string;
  urgency: UrgencyLevel;
  location_preference: string;
  specific_requirements: string[];
  clarification_notes?: string;
  status: RequestStatus;
  matched_provider_ids: string[];
  matched_provider_count: number;
  expanded_search: boolean;
  selected_offer_id?: string;
  selected_provider_id?: string;
  selected_business_id?: string;
  selected_business_name?: string;
  agreed_price?: number;
  payment_status?: "unpaid" | "escrow_funded" | "released" | "refunded";
  views_count: number;
  offers_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ProviderOffer {
  id: string;
  request_id: string;
  provider_user_id: string;
  provider_name: string;
  provider_avatar?: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  business_logo_url?: string;
  business_category: string;
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  proposed_price: number;
  delivery_time: string;
  proposal: string;
  portfolio_samples?: Array<{ title: string; url: string }>;
  clarification_question?: string;
  status: "submitted" | "accepted" | "rejected" | "withdrawn";
  ai_match_score?: number;
  ai_match_badge?: "⭐ Best Match" | "⚡ Fastest Delivery" | "💰 Great Value" | "🛡️ Top Verified" | string;
  created_at: string;
  updated_at: string;
}

export interface ProviderOpportunityPreferences {
  user_id: string;
  business_id?: string;
  notifications_enabled: boolean;
  subscribed_categories: string[];
  min_budget: number;
  max_budget: number;
  preferred_locations: string[];
  instant_push_alerts: boolean;
  instant_sound_alerts: boolean;
  updated_at?: string;
}

export interface AdminMatchingConfig {
  system_enabled: boolean;
  ai_understanding_enabled: boolean;
  auto_matching_enabled: boolean;
  provider_notifications_enabled: boolean;
  max_providers_per_request: number;
  min_match_score: number;
  request_expiration_days: number;
  allow_sponsored_providers: boolean;
  require_verified_providers: boolean;
  updated_at?: string;
}

export interface MatchingBusinessCandidate {
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessLogo?: string;
  category: string;
  categorySlug: string;
  ownerUserId: string;
  isVerified: boolean;
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  location: string;
  matchScore: number;
  matchReasons: string[];
  servicesOffered: string[];
}

export interface RequestAnalyticsMetrics {
  totalRequests: number;
  openRequests: number;
  awardedRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  totalOffersSubmitted: number;
  averageOffersPerRequest: number;
  averageResponseTimeMinutes: number;
  awardRatePercent: number;
  completionRatePercent: number;
  topRequestedCategories: Array<{ category: string; count: number; percentage: number }>;
}

export const POPULAR_REQUEST_CATEGORIES = [
  { name: "Graphic Design", slug: "graphic-design", icon: "Palette", examples: ["Business Flyer", "Logo & Brand Kit", "Social Media Graphics", "Product Packaging"] },
  { name: "Web & Software Development", slug: "web-development", icon: "Code", examples: ["E-commerce Store", "Company Website", "Mobile App", "Landing Page"] },
  { name: "Photography & Videography", slug: "media-production", icon: "Camera", examples: ["Product Shoot", "Event Coverage", "Promotional Video", "Drone Capture"] },
  { name: "Digital Marketing & Ads", slug: "digital-marketing", icon: "Megaphone", examples: ["Facebook & Instagram Ads", "SEO Optimization", "Influencer Marketing", "TikTok Viral Ads"] },
  { name: "Catering & Event Planning", slug: "catering-events", icon: "Utensils", examples: ["Corporate Lunch", "Wedding Catering", "Birthday Cake & Small Chops", "Event Hall Setup"] },
  { name: "Printing & Branding", slug: "printing-branding", icon: "Printer", examples: ["T-Shirt Printing", "Roll-up Banners", "Branded Souvenirs", "Business Cards"] },
  { name: "Logistics & Delivery", slug: "logistics", icon: "Truck", examples: ["Interstate Haulage", "Same-Day Dispatch", "Procurement & Sourcing", "Cargo Shipping"] },
  { name: "Fashion & Tailoring", slug: "fashion-tailoring", icon: "Scissors", examples: ["Bespoke Native Attire", "Corporate Uniforms", "Ankara Styles", "Aso Ebi"] },
  { name: "Cleaning & Janitorial", slug: "cleaning", icon: "Sparkles", examples: ["Post-Construction Cleaning", "Office Fumigation", "Home Deep Cleaning", "Carpet Wash"] },
  { name: "Legal & Business Registration", slug: "legal-cac", icon: "FileText", examples: ["CAC Business Name / Ltd", "Trademark Registration", "Contract Drafting", "TIN & Tax Filing"] },
];
