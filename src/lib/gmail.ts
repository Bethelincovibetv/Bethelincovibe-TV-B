/**
 * Google Gmail REST API & OAuth 2.0 Identity Service
 * Integrates Google Identity Services (GSI) with Gmail API (gmail.send & gmail.readonly).
 * Allows the admin (e.g. bethelincovibetv@gmail.com) to securely authenticate and dispatch
 * direct email broadcasts, newsletter campaigns, and transactional emails.
 */

import { ensureGoogleGsiLoaded, DEFAULT_GOOGLE_CLIENT_ID, getEffectiveGoogleClientId } from "@/services/googleContactsService";
import { sendUniversalEmail } from "@/lib/emailRouter";

export interface GmailAccountProfile {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  expiresAt: number; // Unix timestamp ms
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
  connectedAt: string;
}

const STORAGE_GMAIL_SESSION_KEY = "leos_admin_gmail_session_v1";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

/**
 * Get active cached Gmail session if valid
 */
export function getAdminGmailSession(): GmailAccountProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_GMAIL_SESSION_KEY);
    if (!raw) return null;
    const session: GmailAccountProfile = JSON.parse(raw);
    
    // Check if expired (with 60s buffer)
    if (session.expiresAt && Date.now() > session.expiresAt - 60000) {
      console.warn("Cached Gmail access token has expired.");
      // We keep session for display purposes but caller can trigger refresh
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Save Gmail session
 */
export function setAdminGmailSession(session: GmailAccountProfile | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(STORAGE_GMAIL_SESSION_KEY);
  } else {
    localStorage.setItem(STORAGE_GMAIL_SESSION_KEY, JSON.stringify(session));
  }
}

/**
 * Disconnect and revoke Gmail session
 */
export async function disconnectAdminGmail(): Promise<void> {
  const session = getAdminGmailSession();
  if (session?.accessToken && typeof window !== "undefined" && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(session.accessToken, () => {});
    } catch {}
  }
  setAdminGmailSession(null);
}

/**
 * Authenticate Admin with Google Gmail OAuth 2.0
 */
export async function signInWithGoogleGmail(): Promise<GmailAccountProfile> {
  const loaded = await ensureGoogleGsiLoaded();
  if (!loaded || !window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services (GSI) could not be loaded. Please check your network connection.");
  }

  const clientId = getEffectiveGoogleClientId();

  return new Promise((resolve, reject) => {
    let tokenClient: any;
    try {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GMAIL_SCOPES,
        callback: async (resp) => {
          if (resp.error) {
            return reject(new Error(resp.error_description || resp.error || "Google authentication failed."));
          }
          if (!resp.access_token) {
            return reject(new Error("No access token received from Google."));
          }

          try {
            const accessToken = resp.access_token;
            const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3599;
            const expiresAt = Date.now() + expiresIn * 1000;

            // 1. Fetch user identity profile
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = userRes.ok ? await userRes.json() : {};

            // 2. Fetch Gmail mailbox details
            let messagesTotal = 0;
            let threadsTotal = 0;
            let historyId = "";

            try {
              const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (profileRes.ok) {
                const pData = await profileRes.json();
                messagesTotal = pData.messagesTotal || 0;
                threadsTotal = pData.threadsTotal || 0;
                historyId = pData.historyId || "";
              }
            } catch {}

            const session: GmailAccountProfile = {
              email: userData.email || "bethelincovibetv@gmail.com",
              name: userData.name || userData.email || "Administrator",
              picture: userData.picture,
              accessToken,
              expiresAt,
              messagesTotal,
              threadsTotal,
              historyId,
              connectedAt: new Date().toISOString(),
            };

            setAdminGmailSession(session);
            resolve(session);
          } catch (err: any) {
            reject(new Error("Failed fetching Google account details: " + err.message));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "Google OAuth popup was closed or blocked."));
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (err: any) {
      reject(new Error("Failed to initialize Google OAuth client: " + err.message));
    }
  });
}

/**
 * Encode a string into base64url format for Gmail API
 */
function toBase64Url(str: string): string {
  // UTF-8 safe base64 encoding
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const base64 = btoa(utf8Bytes);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build RFC 2822 compliant MIME email string
 */
function buildMimeEmail(params: {
  fromEmail: string;
  fromName?: string;
  to: string;
  subject: string;
  htmlBody: string;
}): string {
  const fromHeader = params.fromName
    ? `From: =?utf-8?B?${btoa(encodeURIComponent(params.fromName))}?= <${params.fromEmail}>`
    : `From: <${params.fromEmail}>`;

  const subjectHeader = `Subject: =?utf-8?B?${btoa(encodeURIComponent(params.subject))}?=`;

  const emailLines = [
    fromHeader,
    `To: <${params.to}>`,
    subjectHeader,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    // Base64 encode the HTML body with 76 char line wraps
    btoa(encodeURIComponent(params.htmlBody).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )),
  ];

  return emailLines.join("\r\n");
}

/**
 * Send an email directly via Google Gmail API v1
 */
export async function sendEmailViaGmailApi(params: {
  to: string;
  subject: string;
  htmlBody: string;
  accessToken?: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ id: string; threadId: string }> {
  let token = params.accessToken;
  let senderEmail = params.fromEmail;

  if (!token) {
    const session = getAdminGmailSession();
    if (!session || !session.accessToken) {
      throw new Error("No connected Gmail account found. Please sign in with your Gmail account first.");
    }
    token = session.accessToken;
    senderEmail = senderEmail || session.email;
  }

  senderEmail = senderEmail || "bethelincovibetv@gmail.com";
  const rawMime = buildMimeEmail({
    fromEmail: senderEmail,
    fromName: params.fromName || "Bethelincovibe TV",
    to: params.to,
    subject: params.subject,
    htmlBody: params.htmlBody,
  });

  const rawBase64Url = toBase64Url(rawMime);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const message =
      errJson.error?.message ||
      `Gmail API returned HTTP ${response.status} (${response.statusText})`;
    
    if (response.status === 401) {
      throw new Error("Gmail authorization expired. Please re-authenticate your Google Account.");
    }
    throw new Error(message);
  }

  const result = await response.json();
  return {
    id: result.id || `gmail_${Date.now()}`,
    threadId: result.threadId || `thr_${Date.now()}`,
  };
}

/**
 * Universal sender wrapper with Gmail priority and fallback
 */
export async function sendGmailEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  accessToken?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const session = getAdminGmailSession();

  // If valid Gmail session is active, prioritize sending directly via Google Gmail API
  if (session?.accessToken) {
    try {
      return await sendEmailViaGmailApi({
        to: params.to,
        subject: params.subject,
        htmlBody: params.htmlBody,
        accessToken: session.accessToken,
        fromName: params.fromName || session.name || "Bethelincovibe TV",
        fromEmail: session.email,
      });
    } catch (err: any) {
      console.warn("Direct Gmail API send failed, trying universal provider fallback:", err);
    }
  }

  // Fallback to configured Universal Email Router
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

/**
 * Send subscriber welcome email
 */
export async function sendSubscriberWelcomeEmail(
  subscriberEmail: string,
  subscriberName?: string,
  accessToken?: string
): Promise<boolean> {
  try {
    const welcomeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Welcome to Bethelincovibe TV! 🚀</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Your premier platform for business growth, creative media, and Nigerian commerce.</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin-top: 0; font-size: 15px; line-height: 1.6;">Hello <strong>${subscriberName || "Friend"}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Thank you for connecting with us! You'll now receive top business opportunities, marketplace updates, and daily insights directly in your inbox.</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://bethelincovibe.tv'}/businesses" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 14px;">Explore Verified Businesses</a>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Bethelincovibe TV. All rights reserved.
        </div>
      </div>
    `;

    await sendGmailEmail({
      to: subscriberEmail,
      subject: `Welcome to Bethelincovibe TV, ${subscriberName || "Entrepreneur"}! 🚀`,
      htmlBody: welcomeHtml,
      accessToken,
      fromName: "Bethelincovibe TV",
    });
    return true;
  } catch (err) {
    console.error("Welcome email delivery error:", err);
    return false;
  }
}
