import { supabase } from "@/integrations/supabase/client";

/**
 * In-memory cache for user display names to avoid redundant queries
 */
const userNameCache = new Map<string, string>();

/**
 * Extracts the cleanest human-friendly name for a user from their auth/profile metadata.
 */
export function getBestUserName(user?: any, profile?: any): string {
  if (profile?.display_name && profile.display_name.trim()) {
    return profile.display_name.trim();
  }
  if (user?.user_metadata?.display_name && String(user.user_metadata.display_name).trim()) {
    return String(user.user_metadata.display_name).trim();
  }
  if (user?.user_metadata?.full_name && String(user.user_metadata.full_name).trim()) {
    return String(user.user_metadata.full_name).trim();
  }
  if (user?.user_metadata?.name && String(user.user_metadata.name).trim()) {
    return String(user.user_metadata.name).trim();
  }
  if (profile?.username && profile.username.trim()) {
    const u = profile.username.trim();
    return u.charAt(0).toUpperCase() + u.slice(1);
  }
  if (user?.user_metadata?.username && String(user.user_metadata.username).trim()) {
    const u = String(user.user_metadata.username).trim();
    return u.charAt(0).toUpperCase() + u.slice(1);
  }
  if (user?.email) {
    const lower = user.email.toLowerCase();
    if (lower.includes("bethelchukwunyere") || lower.includes("bethelincovibe")) {
      return "Entrepreneur";
    }
    const emailPrefix = user.email.split("@")[0] || "";
    const clean = emailPrefix.replace(/[._\d]+$/, "").replace(/[._]/g, " ");
    if (clean.trim()) {
      return clean
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return "Entrepreneur";
}

/**
 * Asynchronously fetch a user's display name by userId with in-memory caching.
 */
export async function fetchUserNameById(userId: string): Promise<string> {
  if (!userId) return "Entrepreneur";
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId)!;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username, email")
      .eq("user_id", userId)
      .maybeSingle();

    let name = "Entrepreneur";
    if (data?.display_name?.trim()) {
      name = data.display_name.trim();
    } else if (data?.username?.trim()) {
      name = data.username.trim().charAt(0).toUpperCase() + data.username.trim().slice(1);
    } else if (data?.email) {
      const lower = data.email.toLowerCase();
      if (!lower.includes("bethelchukwunyere") && !lower.includes("bethelincovibe")) {
        const prefix = data.email.split("@")[0] || "";
        name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }

    userNameCache.set(userId, name);
    return name;
  } catch {
    return "Entrepreneur";
  }
}

/**
 * Ensures template tags are populated cleanly and the user's name is incorporated.
 */
export function personalizeNotificationTitle(title: string | null | undefined, userName?: string): string {
  if (!title) return "Notification";
  const safeName = (userName || "").trim() || "Entrepreneur";
  let t = title.trim();

  // Replace common template tags if present
  t = t.replace(/\{\{\s*(name|username|displayName|user)\s*\}\}/gi, safeName);
  t = t.replace(/\{\s*(name|username|displayName|user)\s*\}/gi, safeName);

  return t;
}

/**
 * Ensures every notification body addresses the user personalized with their username.
 */
export function personalizeNotificationBody(body: string | null | undefined, userName?: string): string {
  if (!body) return "";
  const safeName = (userName || "").trim() || "Entrepreneur";
  let b = body.trim();

  // Replace common template tags if present
  b = b.replace(/\{\{\s*(name|username|displayName|user)\s*\}\}/gi, safeName);
  b = b.replace(/\{\s*(name|username|displayName|user)\s*\}/gi, safeName);

  // If the body does not already contain the user's name or a greeting, weave it in naturally
  const containsName = b.toLowerCase().includes(safeName.toLowerCase());
  if (!containsName) {
    if (/^(hi|hello|hey|welcome|congrats|congratulations)\b/i.test(b)) {
      b = b.replace(/^(hi|hello|hey|welcome)\s*([^,.:!]*)[,.:!]/i, `$1 ${safeName},`);
    } else {
      b = `Hi ${safeName}, ${b.charAt(0).toLowerCase() + b.slice(1)}`;
    }
  }

  return b;
}

/**
 * Formats a full notification object so both title and body include the user name.
 */
export function personalizeNotificationItem<T extends { title: string; body?: string | null }>(
  item: T,
  userName: string
): T {
  return {
    ...item,
    title: personalizeNotificationTitle(item.title, userName),
    body: item.body ? personalizeNotificationBody(item.body, userName) : item.body,
  };
}
