/**
 * WhatsApp Link Generator & Click-to-Chat Suite
 * Standardizes Nigerian and international phone numbers into validated wa.me links
 * with customizable, high-converting pre-filled messages.
 */

export interface WhatsAppLinkResult {
  rawPhone: string;
  formattedNumber: string;
  isValid: boolean;
  clickToChatUrl: string;
  prefilledMessage: string;
  displayText: string;
}

/**
 * Normalizes phone numbers (Nigerian 080..., 090..., +234... or international)
 * into pure international digits without '+', dashes, or spaces.
 */
export function normalizeWhatsAppNumber(rawPhone?: string | null): {
  normalized: string;
  isValid: boolean;
} {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { normalized: "", isValid: false };
  }

  // Remove all non-digits except a leading plus
  let cleaned = rawPhone.replace(/[^\d+]/g, "").trim();

  // If starts with +, remove +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle Nigerian local format (e.g. 08012345678, 070..., 090..., 081...)
  if (cleaned.startsWith("0") && (cleaned.length === 11 || cleaned.length === 10)) {
    cleaned = "234" + cleaned.substring(1);
  }

  // Handle 234 prefix
  if (cleaned.startsWith("234") && cleaned.length >= 12 && cleaned.length <= 14) {
    return { normalized: cleaned, isValid: true };
  }

  // Handle other international numbers (min 8 digits, max 15 digits)
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return { normalized: cleaned, isValid: true };
  }

  return { normalized: cleaned, isValid: cleaned.length >= 8 };
}

/**
 * Formats a clean click-to-chat WhatsApp URL with pre-filled encoded text
 */
export function generateWhatsAppLink(
  phone?: string | null,
  prefilledMessage?: string
): WhatsAppLinkResult {
  const { normalized, isValid } = normalizeWhatsAppNumber(phone);

  const defaultMsg =
    prefilledMessage && prefilledMessage.trim().length > 0
      ? prefilledMessage.trim()
      : "Hello! I saw your business on Bethelincovibe TV and I would like to inquire about your services.";

  if (!isValid || !normalized) {
    return {
      rawPhone: phone || "",
      formattedNumber: "",
      isValid: false,
      clickToChatUrl: "",
      prefilledMessage: defaultMsg,
      displayText: "No WhatsApp contact available",
    };
  }

  const encodedMessage = encodeURIComponent(defaultMsg);
  const clickToChatUrl = `https://wa.me/${normalized}?text=${encodedMessage}`;

  return {
    rawPhone: phone || "",
    formattedNumber: `+${normalized}`,
    isValid: true,
    clickToChatUrl,
    prefilledMessage: defaultMsg,
    displayText: `Chat on WhatsApp (+${normalized})`,
  };
}

/**
 * Generates context-aware prefilled inquiry messages tailored to specific services or products
 */
export function buildBusinessInquiryMessage(
  businessName: string,
  itemTitle?: string,
  itemType: "service" | "product" | "general" = "general"
): string {
  const biz = businessName ? businessName.trim() : "your business";

  if (itemType === "service" && itemTitle) {
    return `Hello ${biz}! I saw your "${itemTitle}" service on Bethelincovibe TV and would love to get more details and book an order.`;
  }

  if (itemType === "product" && itemTitle) {
    return `Hello ${biz}! I am interested in purchasing "${itemTitle}" listed on Bethelincovibe TV. Is this still available for order?`;
  }

  return `Hello ${biz}! I found your verified profile on Bethelincovibe TV and I'd like to inquire about your available products and services.`;
}
