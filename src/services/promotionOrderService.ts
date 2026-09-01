import { supabase } from "@/integrations/supabase/client";
import { PromotionPackage, getPackageById } from "./packageService";
import { WhatsAppCommunity, getCommunityById } from "./communityService";
import { PromoterProfile, getPromoterProfileById, getPromoterProfileByUserId } from "./promoterService";
import { notifyOrderCreated } from "./promotionNotificationService";

export type PromotionOrderStatus =
  | "pending_payment"
  | "paid_escrow"
  | "in_progress"
  | "evidence_submitted"
  | "revision_requested"
  | "approved"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";

export interface PromotionOrder {
  id: string;
  order_reference: string;
  business_user_id: string;
  business_id?: string | null;
  promoter_id: string;
  community_id: string;
  package_id: string;
  amount: number;
  platform_fee: number;
  promoter_net_earning: number;
  payment_method?: string | null;
  payment_reference?: string | null;
  status: PromotionOrderStatus;
  promotion_brief: string;
  creative_assets_urls?: string[] | null;
  special_instructions?: string | null;
  paid_at?: string | null;
  promoter_accepted_at?: string | null;
  promoter_declined_at?: string | null;
  decline_reason?: string | null;
  sla_deadline?: string | null;
  evidence_submitted_at?: string | null;
  review_deadline?: string | null;
  revision_requested_at?: string | null;
  revision_reason?: string | null;
  approved_at?: string | null;
  disputed_at?: string | null;
  dispute_reason?: string | null;
  completed_at?: string | null;
  auto_approved?: boolean;
  proof_version?: number;
  delivery_proofs?: any[];
  audit_trail?: any[];
  created_at: string;
  updated_at: string;
  // Joined display metadata
  package?: PromotionPackage;
  community?: WhatsAppCommunity;
  promoter?: PromoterProfile;
}

export interface CreatePromotionOrderInput {
  packageId: string;
  promoterId?: string;
  communityId?: string;
  promotionBrief: string;
  creativeAssetsUrls?: string[];
  specialInstructions?: string;
  // Attack vectors to test and reject/override
  customAmount?: number;
  customStatus?: string;
  targetUserId?: string;
}

const ORDERS_STORAGE_KEY = "bincovibe_promotion_orders_all";

function generateOrderReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BTV-PROM-${dateStr}-${randomHex}`;
}

// Fallback Local Storage Helper
function getLocalOrders(): PromotionOrder[] {
  try {
    const data = localStorage.getItem(ORDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: PromotionOrder[]) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to persist orders to local store", err);
  }
}

/**
 * Validates promotion order input before processing
 */
export function validatePromotionOrderInput(input: CreatePromotionOrderInput): { valid: boolean; error?: string } {
  if (!input.packageId || typeof input.packageId !== "string" || !input.packageId.trim()) {
    return { valid: false, error: "Package ID is required." };
  }

  if (!input.promotionBrief || typeof input.promotionBrief !== "string" || !input.promotionBrief.trim()) {
    return { valid: false, error: "Promotion brief is required." };
  }

  if (input.promotionBrief.trim().length < 10) {
    return { valid: false, error: "Promotion brief must be at least 10 characters long." };
  }

  if (input.creativeAssetsUrls && !Array.isArray(input.creativeAssetsUrls)) {
    return { valid: false, error: "Creative asset URLs must be an array of strings." };
  }

  return { valid: true };
}

/**
 * Create a new promotion order
 * Enforces authenticated user, active package, verified community, snapshot price, and pending_payment status.
 */
export async function createPromotionOrder(
  input: CreatePromotionOrderInput,
  mockUserId?: string
): Promise<{ order: PromotionOrder | null; error: string | null }> {
  const validation = validatePromotionOrderInput(input);
  if (!validation.valid) {
    return { order: null, error: validation.error || "Invalid order input." };
  }

  // 1. Authenticate user
  let businessUserId = mockUserId;
  if (!businessUserId) {
    const { data: authData } = await supabase.auth.getUser();
    businessUserId = authData?.user?.id;
  }

  if (!businessUserId) {
    return { order: null, error: "Unauthorized: Please log in to book a promotion." };
  }

  // 2. Fetch and validate selected package
  const pkg = await getPackageById(input.packageId);
  if (!pkg) {
    return { order: null, error: "Invalid Package: Promotion package not found." };
  }

  if (!pkg.is_active) {
    return { order: null, error: "Unavailable Package: This promotion package is currently inactive." };
  }

  if (pkg.price < 500) {
    return { order: null, error: "Invalid Price: Package price must be at least 500 Naira." };
  }

  // Check promoter consistency if provided in input
  if (input.promoterId && input.promoterId !== pkg.promoter_id) {
    return { order: null, error: "Forbidden: Promoter does not match package owner." };
  }

  // Check community consistency if provided in input
  if (input.communityId && input.communityId !== pkg.community_id) {
    return { order: null, error: "Forbidden: Community does not match package community." };
  }

  // 3. Validate linked community is verified and published
  const community = await getCommunityById(pkg.community_id);
  if (!community) {
    return { order: null, error: "Invalid Community: Linked WhatsApp community does not exist." };
  }

  if (community.verification_status !== "verified") {
    return { order: null, error: "Forbidden: Cannot book a package on an unverified community." };
  }

  if (!community.is_published) {
    return { order: null, error: "Forbidden: Cannot book a package on an unpublished community." };
  }

  // 4. Fetch promoter profile
  const promoter = await getPromoterProfileById(pkg.promoter_id);

  // 5. Calculate snapshot financials (Cannot be manipulated by client)
  const amount = pkg.price;
  const platformFee = Math.round(amount * 0.10 * 100) / 100;
  const promoterNetEarning = amount - platformFee;

  const orderReference = generateOrderReference();
  const now = new Date().toISOString();

  // Try DB RPC first or direct insert
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("create_promotion_order", {
      p_package_id: pkg.id,
      p_promotion_brief: input.promotionBrief.trim(),
      p_creative_assets_urls: input.creativeAssetsUrls || null,
      p_special_instructions: input.specialInstructions?.trim() || null,
    });

    if (!rpcError && rpcData) {
      const createdOrder: PromotionOrder = {
        ...rpcData,
        package: pkg,
        community: community,
        promoter: promoter || undefined,
      };
      return { order: createdOrder, error: null };
    }
  } catch {
    // RPC not available in local test environment, proceed with fallback table/storage
  }

  // Try standard Supabase table insert
  try {
    const newOrderData = {
      order_reference: orderReference,
      business_user_id: businessUserId,
      promoter_id: pkg.promoter_id,
      community_id: pkg.community_id,
      package_id: pkg.id,
      amount: amount,
      platform_fee: platformFee,
      promoter_net_earning: promoterNetEarning,
      status: "pending_payment" as PromotionOrderStatus,
      promotion_brief: input.promotionBrief.trim(),
      creative_assets_urls: input.creativeAssetsUrls || null,
      special_instructions: input.specialInstructions?.trim() || null,
    };

    const { data: dbData, error: dbError } = await supabase
      .from("promotion_orders")
      .insert(newOrderData)
      .select()
      .single();

    if (!dbError && dbData) {
      const createdOrder: PromotionOrder = {
        ...dbData,
        package: pkg,
        community: community,
        promoter: promoter || undefined,
      };
      return { order: createdOrder, error: null };
    }
  } catch {
    // Table not available in schema cache, proceed to store in local fallback
  }

  // Local storage fallback for test environment & offline support
  const localOrder: PromotionOrder = {
    id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    order_reference: orderReference,
    business_user_id: businessUserId,
    promoter_id: pkg.promoter_id,
    community_id: pkg.community_id,
    package_id: pkg.id,
    amount: amount,
    platform_fee: platformFee,
    promoter_net_earning: promoterNetEarning,
    payment_method: null,
    payment_reference: null,
    status: "pending_payment",
    promotion_brief: input.promotionBrief.trim(),
    creative_assets_urls: input.creativeAssetsUrls || null,
    special_instructions: input.specialInstructions?.trim() || null,
    paid_at: null,
    evidence_submitted_at: null,
    approved_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    package: pkg,
    community: community,
    promoter: promoter || undefined,
  };

  const existingOrders = getLocalOrders();
  existingOrders.unshift(localOrder);
  saveLocalOrders(existingOrders);

  // Dispatch order created notification to promoter
  const promoterUserId = promoter?.user_id || localOrder.promoter_id;
  if (promoterUserId) {
    notifyOrderCreated({
      id: localOrder.id,
      order_reference: localOrder.order_reference,
      promoter_user_id: promoterUserId,
      business_user_id: localOrder.business_user_id,
      package_title: pkg.title,
      amount: localOrder.amount,
    }).catch((err) => console.warn("Notice: order created notification dispatch notice", err));
  }

  return { order: localOrder, error: null };
}

/**
 * Get all promotion orders created by the authenticated business user
 */
export async function getMyBusinessOrders(mockUserId?: string): Promise<PromotionOrder[]> {
  let businessUserId = mockUserId;
  if (!businessUserId) {
    const { data: authData } = await supabase.auth.getUser();
    businessUserId = authData?.user?.id;
  }

  if (!businessUserId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("promotion_orders")
      .select(`
        *,
        package:promotion_packages(*),
        community:whatsapp_communities(*),
        promoter:promoter_profiles(*)
      `)
      .eq("business_user_id", businessUserId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }

  const allOrders = getLocalOrders();
  const userOrders = allOrders.filter((o) => o.business_user_id === businessUserId);

  // Populate joined relations
  for (const order of userOrders) {
    if (!order.package) {
      order.package = (await getPackageById(order.package_id)) || undefined;
    }
    if (!order.community) {
      order.community = (await getCommunityById(order.community_id)) || undefined;
    }
    if (!order.promoter) {
      order.promoter = (await getPromoterProfileById(order.promoter_id)) || undefined;
    }
  }

  return userOrders;
}

/**
 * Get all promotion orders assigned to the authenticated promoter
 */
export async function getMyPromoterOrders(mockPromoterId?: string, mockUserId?: string): Promise<PromotionOrder[]> {
  let promoterId = mockPromoterId;

  if (!promoterId) {
    let userId = mockUserId;
    if (!userId) {
      const { data: authData } = await supabase.auth.getUser();
      userId = authData?.user?.id;
    }

    if (!userId) {
      return [];
    }

    const promoterProfile = await getPromoterProfileByUserId(userId);
    if (!promoterProfile) {
      return [];
    }
    promoterId = promoterProfile.id;
  }

  try {
    const { data, error } = await supabase
      .from("promotion_orders")
      .select(`
        *,
        package:promotion_packages(*),
        community:whatsapp_communities(*),
        promoter:promoter_profiles(*)
      `)
      .eq("promoter_id", promoterId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }

  const allOrders = getLocalOrders();
  const promoterOrders = allOrders.filter((o) => o.promoter_id === promoterId);

  // Populate joined relations
  for (const order of promoterOrders) {
    if (!order.package) {
      order.package = (await getPackageById(order.package_id)) || undefined;
    }
    if (!order.community) {
      order.community = (await getCommunityById(order.community_id)) || undefined;
    }
    if (!order.promoter) {
      order.promoter = (await getPromoterProfileById(order.promoter_id)) || undefined;
    }
  }

  return promoterOrders;
}

/**
 * Get order details by ID with access control validation
 */
export async function getPromotionOrderById(
  orderId: string,
  currentUserId?: string,
  userRole?: string
): Promise<{ order: PromotionOrder | null; error: string | null }> {
  if (!orderId) {
    return { order: null, error: "Order ID is required." };
  }

  let userId = currentUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { order: null, error: "Unauthorized: Please log in to view this order." };
  }

  const isAdmin = userRole === "admin";

  let foundOrder: PromotionOrder | null = null;

  try {
    const { data, error } = await supabase
      .from("promotion_orders")
      .select(`
        *,
        package:promotion_packages(*),
        community:whatsapp_communities(*),
        promoter:promoter_profiles(*)
      `)
      .eq("id", orderId)
      .single();

    if (!error && data) {
      foundOrder = data;
    }
  } catch {
    // fallback
  }

  if (!foundOrder) {
    const allOrders = getLocalOrders();
    foundOrder = allOrders.find((o) => o.id === orderId) || null;
  }

  if (!foundOrder) {
    return { order: null, error: "Order not found." };
  }

  // Populate joined relations if needed
  if (!foundOrder.package) {
    foundOrder.package = (await getPackageById(foundOrder.package_id)) || undefined;
  }
  if (!foundOrder.community) {
    foundOrder.community = (await getCommunityById(foundOrder.community_id)) || undefined;
  }
  if (!foundOrder.promoter) {
    foundOrder.promoter = (await getPromoterProfileById(foundOrder.promoter_id)) || undefined;
  }

  // Access Control Check:
  // 1. Admin can view
  if (isAdmin) {
    return { order: foundOrder, error: null };
  }

  // 2. Business owner can view
  if (foundOrder.business_user_id === userId) {
    return { order: foundOrder, error: null };
  }

  // 3. Assigned promoter can view
  const promoterProfile = await getPromoterProfileByUserId(userId);
  if (promoterProfile && promoterProfile.id === foundOrder.promoter_id) {
    return { order: foundOrder, error: null };
  }

  // Not authorized
  return { order: null, error: "Unauthorized: You do not have permission to view this order." };
}
