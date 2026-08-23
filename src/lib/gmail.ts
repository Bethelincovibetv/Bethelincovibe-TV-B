import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { app } from "@/lib/firebase";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://mail.google.com/",
];

let cachedAccessToken: string | null = null;

/**
 * Get cached access token from memory or sessionStorage
 */
export function getCachedGmailToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const token = sessionStorage.getItem("gmail_access_token");
    if (token) {
      cachedAccessToken = token;
      return token;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Set cached access token in memory and sessionStorage
 */
export function setCachedGmailToken(token: string | null) {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem("gmail_access_token", token);
    } else {
      sessionStorage.removeItem("gmail_access_token");
    }
  } catch {
    // Ignore
  }
}

/**
 * Trigger Google Sign In with Gmail Scopes
 */
export async function signInWithGoogleGmail(): Promise<{ user: User; accessToken: string }> {
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));

  provider.setCustomParameters({
    prompt: "consent",
    access_type: "online",
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error("Failed to acquire Gmail OAuth Access Token from Google Sign In.");
  }

  setCachedGmailToken(token);
  return { user: result.user, accessToken: token };
}

/**
 * Convert email components into Base64URL encoded MIME RFC 2822 format
 */
export function createBase64UrlMimeEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
}): string {
  const { to, subject, htmlBody, fromName = "Bethelincovibe TV" } = params;

  // Encode utf-8 subject safely
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const mimeLines = [
    `Content-Type: text/html; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    `Content-Transfer-Encoding: 7bit`,
    `to: ${to}`,
    `from: "${fromName}" <me>`,
    `subject: ${utf8Subject}`,
    ``,
    htmlBody,
  ];

  const rawMime = mimeLines.join("\r\n");

  // Standard Base64 to Base64URL
  return btoa(unescape(encodeURIComponent(rawMime)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send an email via connected Gmail API
 */
export async function sendGmailEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  accessToken?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const token = params.accessToken || getCachedGmailToken();
  if (!token) {
    throw new Error("Gmail API Access Token required. Please sign in with Google.");
  }

  const raw = createBase64UrlMimeEmail({
    to: params.to,
    subject: params.subject,
    htmlBody: params.htmlBody,
    fromName: params.fromName,
  });

  const response = await fetch("https://gmail.googleapis.com/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Gmail API error (${response.status})`;
    throw new Error(message);
  }

  return await response.json();
}

/**
 * Send Automated Subscriber Welcome Email
 */
export async function sendSubscriberWelcomeEmail(
  subscriberEmail: string,
  subscriberName?: string,
  accessToken?: string
): Promise<boolean> {
  const cleanName = subscriberName?.trim() || "";
  const subject = cleanName
    ? `Welcome to Bethelincovibe TV, ${cleanName}! 🚀 Your Business Insights Hub`
    : "Welcome to Bethelincovibe TV! 🚀 Your Business Insights Hub";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bethelincovibe.tv";

  const greetingHeading = cleanName ? `Welcome aboard, ${cleanName}! 👋` : "Welcome aboard! 👋";

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0; opacity: 0.92; font-size: 14px; font-weight: 500; }
          .content { padding: 32px 24px; }
          .welcome-badge { display: inline-block; background: #e0e7ff; color: #3730a3; font-weight: 800; font-size: 11px; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin-top: 20px; text-align: center; box-shadow: 0 4px 14px rgba(79,70,229,0.3); }
          .blog-card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 14px; padding: 16px; }
          .blog-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #0f172a; }
          .blog-desc { margin: 0 0 10px; font-size: 13px; color: #64748b; line-height: 1.5; }
          .blog-link { color: #4f46e5; text-decoration: none; font-size: 12px; font-weight: 700; }
          .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bethelincovibe TV</h1>
            <p>Your Premier Business & Startup Insights Hub in Lagos</p>
          </div>
          <div class="content">
            <span class="welcome-badge">🎉 Subscription Confirmed</span>
            <h2 style="margin-top:0; color:#0f172a; font-size:22px; font-weight:800;">${greetingHeading}</h2>
            <p style="font-size:15px; color:#334155; line-height:1.6;">Thank you for subscribing to <strong>Bethelincovibe TV</strong>. You are now officially part of our vibrant community of entrepreneurs, business leaders, and creators.</p>
            
            <p style="font-size:15px; color:#334155; line-height:1.6;">Here is what you can look forward to directly in your inbox:</p>
            <ul style="padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.6;">
              <li style="margin-bottom: 8px;"><strong>Exclusive Startup & Business Guides</strong> tailored for growing enterprises</li>
              <li style="margin-bottom: 8px;"><strong>Marketplace Highlights & Verified Directory Updates</strong></li>
              <li style="margin-bottom: 8px;"><strong>Funding, Investment & Loan Opportunities</strong></li>
              <li style="margin-bottom: 8px;"><strong>Expert Marketing Strategies & Growth Hacks</strong></li>
            </ul>

            <h3 style="margin-top: 28px; margin-bottom: 12px; font-size: 17px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px;">📰 Featured Blog Insights</h3>
            
            <div class="blog-card">
              <div class="blog-title">10 Proven Strategies to Scale Your Business in Nigeria</div>
              <div class="blog-desc">Essential growth tactics, cash flow management tips, and marketing frameworks for modern entrepreneurs.</div>
              <a href="${origin}/blog" class="blog-link">Read Full Story →</a>
            </div>

            <div class="blog-card">
              <div class="blog-title">How to Secure Angel Funding & Startup Grants</div>
              <div class="blog-desc">A comprehensive guide on pitch decks, investor metrics, and navigating seed funding.</div>
              <a href="${origin}/blog" class="blog-link">Read Full Story →</a>
            </div>

            <p style="text-align:center; margin-top: 24px;">
              <a href="${origin}/blog" class="btn">Explore All Articles & Guides →</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Bethelincovibe TV. All rights reserved.</p>
            <p>Lagos, Nigeria | You received this because you subscribed on our website.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await sendGmailEmail({
      to: subscriberEmail,
      subject,
      htmlBody,
      accessToken,
    });
    return true;
  } catch (err) {
    console.warn("Subscriber welcome email sending notice:", err);
    return false;
  }
}
