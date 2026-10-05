import { supabase } from "@/integrations/supabase/client";

/**
 * In-memory cache for user display names to avoid redundant queries
 */
const userNameCache = new Map<string, string>();

/**
 * Extracts the cleanest human-friendly name for a user from their auth/profile metadata.
 * Always resolves to the user's actual personal name, never a generic placeholder.
 */
export function getBestUserName(user?: any, profile?: any): string {
  // 1. Profile display name
  if (profile?.display_name && String(profile.display_name).trim()) {
    return String(profile.display_name).trim();
  }

  // 2. User metadata display_name, full_name, or name
  if (user?.user_metadata?.display_name && String(user.user_metadata.display_name).trim()) {
    return String(user.user_metadata.display_name).trim();
  }
  if (user?.user_metadata?.full_name && String(user.user_metadata.full_name).trim()) {
    return String(user.user_metadata.full_name).trim();
  }
  if (user?.user_metadata?.name && String(user.user_metadata.name).trim()) {
    return String(user.user_metadata.name).trim();
  }

  // 3. Profile or metadata username
  if (profile?.username && String(profile.username).trim()) {
    const u = String(profile.username).trim();
    return u.charAt(0).toUpperCase() + u.slice(1);
  }
  if (user?.user_metadata?.username && String(user.user_metadata.username).trim()) {
    const u = String(user.user_metadata.username).trim();
    return u.charAt(0).toUpperCase() + u.slice(1);
  }

  // 4. Clean human name from user's email address
  if (user?.email) {
    const emailPrefix = String(user.email).split("@")[0] || "";
    const clean = emailPrefix.replace(/[._\d]+$/, "").replace(/[._-]/g, " ");
    if (clean.trim()) {
      return clean
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return "";
}

/**
 * Asynchronously fetch a user's display name by userId with in-memory caching.
 */
export async function fetchUserNameById(userId: string): Promise<string> {
  if (!userId) return "";
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId)!;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username, email")
      .eq("user_id", userId)
      .maybeSingle();

    let name = "";
    if (data?.display_name?.trim()) {
      name = data.display_name.trim();
    } else if (data?.username?.trim()) {
      name = data.username.trim().charAt(0).toUpperCase() + data.username.trim().slice(1);
    } else if (data?.email) {
      const prefix = (data.email.split("@")[0] || "").replace(/[._\d]+$/, "").replace(/[._-]/g, " ");
      if (prefix.trim()) {
        name = prefix
          .split(" ")
          .filter(Boolean)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
      }
    }

    if (!name) {
      const { data: supp } = await supabase
        .from("suppliers")
        .select("name")
        .or(`user_id.eq.${userId},submitted_by.eq.${userId}`)
        .maybeSingle();
      if (supp?.name?.trim()) {
        name = supp.name.trim();
      }
    }

    userNameCache.set(userId, name);
    return name;
  } catch {
    return "";
  }
}

/**
 * Ensures template tags are populated cleanly and the user's exact name is incorporated.
 */
export function personalizeNotificationTitle(title: string | null | undefined, userName?: string): string {
  if (!title) return "Notification";
  const exactName = (userName || "").trim();
  let t = title.trim();

  // Replace common template tags if present
  if (exactName) {
    t = t.replace(/\{\{\s*(name|username|displayName|user)\s*\}\}/gi, exactName);
    t = t.replace(/\{\s*(name|username|displayName|user)\s*\}/gi, exactName);
  } else {
    // If no exact name available yet, strip placeholders gracefully
    t = t.replace(/\{\{\s*(name|username|displayName|user)\s*\}\},?\s*/gi, "");
    t = t.replace(/\{\s*(name|username|displayName|user)\s*\},?\s*/gi, "");
  }

  return t;
}

/**
 * Ensures every notification body addresses the user personalized with their exact name.
 */
export function personalizeNotificationBody(body: string | null | undefined, userName?: string): string {
  if (!body) return "";
  const exactName = (userName || "").trim();
  let b = body.trim();

  // Replace common template tags if present
  if (exactName) {
    b = b.replace(/\{\{\s*(name|username|displayName|user)\s*\}\}/gi, exactName);
    b = b.replace(/\{\s*(name|username|displayName|user)\s*\}/gi, exactName);

    // If the body does not already contain the user's name or a greeting, weave it in naturally
    const containsName = b.toLowerCase().includes(exactName.toLowerCase());
    if (!containsName) {
      if (/^(hi|hello|hey|welcome|congrats|congratulations)\b/i.test(b)) {
        b = b.replace(/^(hi|hello|hey|welcome)\s*([^,.:!]*)[,.:!]/i, `$1 ${exactName},`);
      } else {
        b = `Hi ${exactName}, ${b.charAt(0).toLowerCase() + b.slice(1)}`;
      }
    }
  } else {
    // Strip unfulfilled placeholders cleanly
    b = b.replace(/\{\{\s*(name|username|displayName|user)\s*\}\},?\s*/gi, "");
    b = b.replace(/\{\s*(name|username|displayName|user)\s*\},?\s*/gi, "");
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
