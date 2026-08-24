import { sendUniversalEmail, sendSubscriberWelcomeEmail as routerSendWelcome } from "@/lib/emailRouter";

/**
 * Universal Email Sender Bridge
 * Replaced Google Gmail OAuth requirement with the multi-provider Universal Email Sending Engine.
 */

export function getCachedGmailToken(): string | null {
  return "universal_provider_active";
}

export function setCachedGmailToken(_token: string | null) {
  // No-op for universal providers
}

export async function signInWithGoogleGmail(): Promise<{ user: any; accessToken: string }> {
  return {
    user: { email: "universal-sender@bethelincovibe.tv" },
    accessToken: "universal_provider_active",
  };
}

export async function sendGmailEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  accessToken?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const result = await sendUniversalEmail({
    to: params.to,
    subject: params.subject,
    htmlBody: params.htmlBody,
    fromName: params.fromName || "Bethelincovibe TV",
  });

  return {
    id: result.messageId || "msg_" + Date.now(),
    threadId: "thr_" + Date.now(),
  };
}

export async function sendSubscriberWelcomeEmail(
  subscriberEmail: string,
  subscriberName?: string,
  _accessToken?: string
): Promise<boolean> {
  return await routerSendWelcome(subscriberEmail, subscriberName);
}
