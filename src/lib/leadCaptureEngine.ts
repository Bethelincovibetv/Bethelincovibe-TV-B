import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BusinessLeadPayload {
  userId: string; // Business owner user_id
  businessId?: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceTitle?: string;
  message?: string;
  source?: "directory_listing" | "business_profile" | "service_booking" | "whatsapp_click" | "call_click" | "direct_inquiry";
}

/**
 * Automatically records a lead into the business owner's lead management system.
 * Creates an entry in sales_page_leads and generates a user-scoped in-app notification.
 */
export async function recordBusinessLead(payload: BusinessLeadPayload): Promise<{ success: boolean; error?: string }> {
  if (!payload.userId) {
    console.warn("Cannot capture lead: missing owner userId");
    return { success: false, error: "Missing owner ID" };
  }

  try {
    const formattedNotes = [
      payload.serviceTitle ? `Requested Service: ${payload.serviceTitle}` : null,
      payload.businessName ? `Business: ${payload.businessName}` : null,
      payload.source ? `Source Channel: ${payload.source.replace("_", " ").toUpperCase()}` : null,
      payload.message ? `Customer Message: ${payload.message}` : null,
    ].filter(Boolean).join(" | ");

    // 1. Insert into sales_page_leads table for the business owner
    const { error: leadErr } = await supabase.from("sales_page_leads").insert({
      user_id: payload.userId,
      name: payload.customerName || "Website Visitor",
      phone: payload.customerPhone || "Not specified",
      email: payload.customerEmail || null,
      message: formattedNotes || "Direct business inquiry via Bethelincovibe TV",
      status: "new",
      sales_page_id: payload.businessId || "directory_direct",
    } as any);

    if (leadErr) {
      console.warn("Lead insertion notice (falling back gracefully):", leadErr);
    }

    // 2. Trigger instant user-based notification strictly for this specific business owner
    await supabase.from("user_notifications").insert({
      user_id: payload.userId,
      title: `🎯 New Lead: ${payload.customerName || "Prospective Client"}`,
      body: `Interested in ${payload.serviceTitle || payload.businessName}. Contact: ${payload.customerPhone || payload.customerEmail || "Direct via app"}.`,
      type: "lead",
      url: "/dashboard/leads",
      is_read: false,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Lead capture failed:", err);
    return { success: false, error: err.message };
  }
}
