/**
 * WhatsApp Status Engine — Networking, Mutual Exchange & Status Monetization
 * 
 * Compliant with:
 * - Google API Services User Data Policy (Explicit single-user OAuth & People API)
 * - NDPR (Nigeria Data Protection Regulation — Affirmative consent, no data scraping)
 */

export interface NetworkMember {
  id: string;
  name: string;
  businessName: string;
  category: string;
  location: string;
  phone: string;
  email?: string;
  statusViewsEstimate: number;
  verified: boolean;
  openForAds: boolean;
  ratePerPost?: number; // in NGN
  bundlePrice?: number; // 3-post bundle in NGN
  bio: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface ConnectionLog {
  id: string;
  contactId: string;
  contactName: string;
  businessName: string;
  category: string;
  phone: string;
  syncedAt: string;
  method: "google_api" | "vcf_export";
  googleResourceName?: string;
  mutualConfirmed: boolean;
}

export interface StatusAdBooking {
  id: string;
  creatorId: string;
  creatorName: string;
  advertiserId: string;
  advertiserName: string;
  advertiserPhone: string;
  advertiserEmail?: string;
  campaignTitle: string;
  caption: string;
  mediaUrl?: string;
  targetDate: string;
  slotCount: number;
  totalAmount: number;
  status: "pending" | "accepted" | "declined" | "posted_with_proof" | "completed";
  proofScreenshotUrl?: string;
  proofSubmittedAt?: string;
  proofViewerCount?: number;
  notes?: string;
  createdAt: string;
}

export interface UserEnginePreferences {
  autoExchangeEnabled: boolean;
  isPaused: boolean;
  targetCategories: string[];
  targetLocations: string[];
  openForAds: boolean;
  ratePerPost: number;
  bundlePrice: number;
  audienceNiche: string;
  estimatedViews: number;
  customWhatsAppNumber: string;
}

// Initial curated verified Lagos business pool
export const INITIAL_VERIFIED_POOL: NetworkMember[] = [
  {
    id: "pool-1",
    name: "Adewale Adeleke",
    businessName: "Lagos Tech Gadgets & Accessories",
    category: "Tech & Electronics",
    location: "Computer Village, Ikeja",
    phone: "+2348031234567",
    email: "adewale@techgadgetslagos.ng",
    statusViewsEstimate: 1450,
    verified: true,
    openForAds: true,
    ratePerPost: 2500,
    bundlePrice: 6500,
    bio: "Wholesale & retail supplier of Apple, Samsung, audio accessories & power banks. 1.4k+ daily tech buyers on status.",
    joinedAt: "2026-08-10T09:00:00Z",
  },
  {
    id: "pool-2",
    name: "Chioma Okonkwo",
    businessName: "Lekki Luxe Fabrics & Ready-to-Wear",
    category: "Fashion & Apparel",
    location: "Lekki Phase 1, Lagos",
    phone: "+2348129876543",
    email: "chioma@lekkiluxefabrics.com",
    statusViewsEstimate: 2200,
    verified: true,
    openForAds: true,
    ratePerPost: 4000,
    bundlePrice: 10000,
    bio: "Premium bridal lace, silk, and corporate bespoke tailoring. Daily status viewers are high-income Lagos professionals.",
    joinedAt: "2026-08-12T14:30:00Z",
  },
  {
    id: "pool-3",
    name: "Oluwaseun Babatunde",
    businessName: "Surulere Sound & Event Rentals",
    category: "Events & Entertainment",
    location: "Surulere, Lagos",
    phone: "+2347065544332",
    email: "seun@suruleresound.ng",
    statusViewsEstimate: 980,
    verified: true,
    openForAds: true,
    ratePerPost: 2000,
    bundlePrice: 5000,
    bio: "Heavy sound system, stage lighting, and generator leasing for wedding receptions, concerts and private parties.",
    joinedAt: "2026-08-15T11:00:00Z",
  },
  {
    id: "pool-4",
    name: "Fatima Al-Hassan",
    businessName: "Yaba Gourmet Treats & Chops",
    category: "Food & Catering",
    location: "Yaba / Akoka, Lagos",
    phone: "+2349081122334",
    email: "fatima@yabatreats.ng",
    statusViewsEstimate: 1850,
    verified: true,
    openForAds: true,
    ratePerPost: 3000,
    bundlePrice: 7500,
    bio: "Finger foods, small chops packs, and office lunch bowls delivered across Lagos Mainland. Huge student & techies viewership.",
    joinedAt: "2026-08-18T16:20:00Z",
  },
  {
    id: "pool-5",
    name: "Emeka Nwosu",
    businessName: "Alaba Direct Solar & Inverter Hub",
    category: "Solar & Energy",
    location: "Alaba International Market, Ojo",
    phone: "+2348023456789",
    email: "emeka@alabainverters.com",
    statusViewsEstimate: 3100,
    verified: true,
    openForAds: true,
    ratePerPost: 5000,
    bundlePrice: 12000,
    bio: "Lithium battery systems, pure sine wave inverters, and commercial solar installations nationwide.",
    joinedAt: "2026-08-20T08:15:00Z",
  },
  {
    id: "pool-6",
    name: "Blessing Effiong",
    businessName: "Island Drone & Visuals Studio",
    category: "Media & Photography",
    location: "Victoria Island, Lagos",
    phone: "+2348145678901",
    email: "blessing@islandvisuals.ng",
    statusViewsEstimate: 1250,
    verified: true,
    openForAds: true,
    ratePerPost: 3500,
    bundlePrice: 9000,
    bio: "4K cinematic drone footage, real estate video tours, and corporate documentary production.",
    joinedAt: "2026-08-22T10:45:00Z",
  },
  {
    id: "pool-7",
    name: "Kunle Ajayi",
    businessName: "Lagos Logistics & Haulage Swift",
    category: "Logistics & Transport",
    location: "Ikeja / Maryland, Lagos",
    phone: "+2347012345678",
    email: "kunle@lagoslogistics.ng",
    statusViewsEstimate: 1600,
    verified: true,
    openForAds: false,
    ratePerPost: 2500,
    bundlePrice: 6000,
    bio: "Interstate haulage trucks, dispatch bike fleet, and warehouse cargo clearance at Apapa Port.",
    joinedAt: "2026-08-24T12:00:00Z",
  },
  {
    id: "pool-8",
    name: "Zainab Mohammed",
    businessName: "Gbagada Organic Skincare & Spa",
    category: "Beauty & Wellness",
    location: "Gbagada, Lagos",
    phone: "+2348099887766",
    email: "zainab@gbagadaorganics.ng",
    statusViewsEstimate: 2400,
    verified: true,
    openForAds: true,
    ratePerPost: 3500,
    bundlePrice: 9000,
    bio: "Natural skincare serums, body polishes, and bridal glow treatments. Highly engaged female shopping audience.",
    joinedAt: "2026-08-24T17:30:00Z",
  }
];

export const LAGOS_LOCATIONS = [
  "All Lagos Locations",
  "Computer Village, Ikeja",
  "Ikeja / Maryland",
  "Lekki Phase 1 & 2",
  "Victoria Island",
  "Ikoyi",
  "Yaba / Akoka",
  "Surulere",
  "Alaba International, Ojo",
  "Trade Fair Complex",
  "Balogun / Idumota",
  "Gbagada / Ogudu",
  "Ikorodu",
  "Festac Town",
  "Ajah / Sangotedo",
];

export const BUSINESS_CATEGORIES = [
  "All Categories",
  "Tech & Electronics",
  "Fashion & Apparel",
  "Food & Catering",
  "Events & Entertainment",
  "Solar & Energy",
  "Media & Photography",
  "Logistics & Transport",
  "Beauty & Wellness",
  "Real Estate & Property",
  "Professional Services",
  "Automotive & Spare Parts",
];

const LOGS_STORAGE_KEY = "leos_wa_connection_logs_v1";
const PREFS_STORAGE_KEY = "leos_wa_user_preferences_v1";
const BOOKINGS_STORAGE_KEY = "leos_wa_ad_bookings_v1";

export const DEFAULT_PREFERENCES: UserEnginePreferences = {
  autoExchangeEnabled: true,
  isPaused: false,
  targetCategories: ["All Categories"],
  targetLocations: ["All Lagos Locations"],
  openForAds: true,
  ratePerPost: 2500,
  bundlePrice: 6500,
  audienceNiche: "Lagos Entrepreneurs, Tech Professionals, and Shoppers",
  estimatedViews: 850,
  customWhatsAppNumber: "",
};

/**
 * Get stored connection logs
 */
export function getConnectionLogs(): ConnectionLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load connection logs", e);
    return [];
  }
}

/**
 * Add a new connection log
 */
export function recordConnectionLog(log: Omit<ConnectionLog, "id" | "syncedAt">): ConnectionLog {
  const existing = getConnectionLogs();
  const newEntry: ConnectionLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    syncedAt: new Date().toISOString(),
  };

  // Avoid duplicate records for same contact
  const updated = [newEntry, ...existing.filter((e) => e.contactId !== log.contactId)];
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save connection log", e);
  }
  return newEntry;
}

/**
 * Check if a member is already connected
 */
export function isContactConnected(contactId: string): boolean {
  const logs = getConnectionLogs();
  return logs.some((l) => l.contactId === contactId);
}

/**
 * Get User Preferences
 */
export function getUserEnginePreferences(): UserEnginePreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save User Preferences
 */
export function saveUserEnginePreferences(prefs: UserEnginePreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save preferences", e);
  }
}

/**
 * Get all Ad Bookings
 */
export function getStatusAdBookings(): StatusAdBooking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) {
      // Seed an initial demo booking for testing
      const demo: StatusAdBooking[] = [
        {
          id: "bk-sample-1",
          creatorId: "current-user",
          creatorName: "My WhatsApp Status",
          advertiserId: "adv-1",
          advertiserName: "Lagos Gadget Fair 2026",
          advertiserPhone: "+2348011223344",
          advertiserEmail: "ads@lagosgadgetfair.ng",
          campaignTitle: "Special Weekend Tech Flash Sale Announcement",
          caption: "🔥 Weekend Tech Flash Sale at Computer Village! Use code LEOS20 for 20% discount on all iPhone & Mac accessories. Tap the link below! 📱💻 https://bethelincovibetv.com/deals",
          targetDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          slotCount: 1,
          totalAmount: 2500,
          status: "pending",
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ];
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(demo));
      return demo;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save Ad Booking
 */
export function createStatusAdBooking(booking: Omit<StatusAdBooking, "id" | "createdAt" | "status">): StatusAdBooking {
  const current = getStatusAdBookings();
  const newBooking: StatusAdBooking = {
    ...booking,
    id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const updated = [newBooking, ...current];
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
  return newBooking;
}

/**
 * Update Ad Booking Status & Proof
 */
export function updateBookingStatus(
  bookingId: string,
  update: Partial<StatusAdBooking>
): StatusAdBooking[] {
  const current = getStatusAdBookings();
  const updated = current.map((b) => (b.id === bookingId ? { ...b, ...update } : b));
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Clear All Stored Data (NDPR Compliance)
 */
export function clearAllEngineData(): void {
  localStorage.removeItem(LOGS_STORAGE_KEY);
  localStorage.removeItem(PREFS_STORAGE_KEY);
  localStorage.removeItem(BOOKINGS_STORAGE_KEY);
}
