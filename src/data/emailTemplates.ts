export interface EmailTemplate {
  id: string;
  category: "newsletter" | "promotion" | "event" | "onboarding" | "announcement" | "spotlight";
  categoryLabel: string;
  title: string;
  badge: string;
  description: string;
  subject: string;
  preheader: string;
  ctaText?: string;
  ctaLink?: string;
  accentColor: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "product-feature-launch",
    category: "promotion",
    categoryLabel: "Product Launch",
    badge: "🚀 High-Impact Launch",
    title: "New Feature & Product Launch",
    description: "Announce brand-new platform features, mobile app updates, or new business tools with strong visual hierarchy and clear CTA.",
    subject: "🚀 Big Announcement for {{name}}: Introducing the New Bethelincovibe TV Experience!",
    preheader: "Discover new growth tools, verified marketplace features, and video streaming upgrades.",
    ctaText: "Explore New Features Now",
    ctaLink: "{{site_url}}/businesses",
    accentColor: "#2563eb",
    body: `Hello {{name}},

We are thrilled to unveil a massive platform update designed specifically to accelerate your business growth, audience reach, and sales across Nigeria and beyond!

Here is what's new for you today:
• 🏢 Instant Verified Business Profiles: Showcase your inventory with custom storefronts and zero listing fees.
• 📹 High-Definition Video & TV Streaming: Watch daily market guides, supplier reviews, and expert interviews.
• ⚡ AI Business Tools & Instant Invoicing: Create branded sales pages and lead magnets in seconds.
• 🔒 Safe Trade Protection: Verified badge verification for suppliers and buyers.

Take advantage of these new capabilities today to elevate your brand presence and connect with thousands of active buyers.

Click the button below to get started immediately:
{{cta_button}}

Warm regards,
The Bethelincovibe TV Leadership Team`,
  },
  {
    id: "weekly-business-digest",
    category: "newsletter",
    categoryLabel: "Newsletter",
    badge: "📰 Weekly Roundup",
    title: "Weekly Business & Market Digest",
    description: "Curated weekly business news, top 3 market analysis articles, supplier of the week, and actionable entrepreneurial tips.",
    subject: "📰 Weekly Executive Digest for {{name}}: Top Business & Sourcing Insights",
    preheader: "Your 5-minute weekly briefing on local markets, logistics, and startup opportunities.",
    ctaText: "Read All Articles & Guides",
    ctaLink: "{{site_url}}/blog",
    accentColor: "#059669",
    body: `Hello {{name}},

Here is your hand-picked weekly briefing on market trends, high-margin opportunities, and verified business practices on Bethelincovibe TV:

🔥 TOP STORIES THIS WEEK:
1. Navigating Wholesale Sourcing & Bulk Trade in Lagos (2026 Edition)
   Actionable breakdown of logistics corridors, price negotiation frameworks, and trusted distributor networks.

2. How Local Retailers Are Scaling with Digital Sales Pages
   Real case studies from entrepreneurs who doubled their inbound WhatsApp leads this month.

3. Supplier Spotlight of the Week
   Discover new verified agricultural, technology, and fashion vendors in our business directory.

💡 ENTREPRENEURIAL TIP OF THE WEEK:
"Consistency in customer follow-up beats aggressive discounting every time. Build trust through prompt communication and clear shipping terms."

Read the complete guides and watch accompanying video walkthroughs on our portal:
{{cta_button}}

Stay empowered and keep building!
Editorial Desk, Bethelincovibe TV`,
  },
  {
    id: "special-discount-promo",
    category: "promotion",
    categoryLabel: "Special Promotion",
    badge: "🎁 Limited-Time Promo",
    title: "Flash Sale & Promotional Discount",
    description: "Urgent promotional offer with discount coupon code, expiration timer warning, and direct claim link.",
    subject: "🎁 Exclusive 48-Hour Partner Offer for {{name}} (Save 30% Today)",
    preheader: "Claim your special promotional rate on verified supplier listings and premium directory spots.",
    ctaText: "Claim Your 30% Discount",
    ctaLink: "{{referral_link}}",
    accentColor: "#db2777",
    body: `Dear {{name}},

For the next 48 hours only, we are extending an exclusive partner promotion to select community members and business leaders!

Unlock 30% OFF on all premium business promotion packages, featured directory banners, and high-conversion sales landing pages.

YOUR PROMO CODE:
┌────────────────────────────────────────┐
│   PROMO CODE: BETHEL30 (30% OFF)       │
│   Valid until midnight this Sunday!    │
└────────────────────────────────────────┘

WHY UPGRADE YOUR BUSINESS LISTING TODAY?
✓ Guaranteed priority placement at the top of category searches
✓ Direct WhatsApp & call lead capture buttons
✓ Video review embedding from Bethelincovibe TV
✓ Verified Gold Merchant badge on your company profile

Don't miss out on high-intent buyer traffic this season. Click below to activate your discount instantly:
{{cta_button}}

Best regards,
Growth & Partnerships Team`,
  },
  {
    id: "webinar-event-invitation",
    category: "event",
    categoryLabel: "Event & Webinar",
    badge: "🎓 Live Masterclass",
    title: "Live Webinar & Masterclass Invite",
    description: "Invite your audience to an upcoming virtual masterclass, workshop, or live Q&A session with agenda and calendar link.",
    subject: "🎓 Live Masterclass: Scaling Your Business Online in 2026 (Free RSVP for {{name}})",
    preheader: "Join top industry experts this Thursday at 6:00 PM WAT for a practical 60-minute growth masterclass.",
    ctaText: "Reserve Your Free Seat Now",
    ctaLink: "{{site_url}}/learn",
    accentColor: "#7c3aed",
    body: `Hello {{name}},

You are cordially invited to an exclusive live virtual workshop hosted by Bethelincovibe TV!

EVENT DETAILS:
• Topic: Mastering Online Sourcing, Digital Marketing & Capital Acquisition
• Date: This Thursday, 6:00 PM West Africa Time (WAT)
• Format: Live Interactive Stream + Real-Time Q&A
• Cost: 100% Free for Registered Members

WHAT YOU WILL LEARN IN 60 MINUTES:
1. Sourcing high-demand products directly from verified manufacturers.
2. Automating your order intake using dedicated single-page sales funnels.
3. Accessing startup grants, local funding, and trade financing.

Seats are limited to ensure smooth video streaming and Q&A interaction. Secure your spot now:
{{cta_button}}

We look forward to seeing you live!
Host: Bethelincovibe TV Education Hub`,
  },
  {
    id: "welcome-community-onboarding",
    category: "onboarding",
    categoryLabel: "Welcome & Onboarding",
    badge: "👋 Welcome Onboarding",
    title: "New Member Welcome & Quick Start",
    description: "Warm welcome message for new subscribers and users with 3 simple steps to get maximum value from the platform.",
    subject: "👋 Welcome to Bethelincovibe TV, {{name}}! Here is your quick start guide",
    preheader: "Everything you need to grow your business, discover verified suppliers, and access market guides.",
    ctaText: "Complete Your Profile & Explore",
    ctaLink: "{{site_url}}/businesses",
    accentColor: "#0284c7",
    body: `Hi {{name}},

Welcome to the Bethelincovibe TV family! We are thrilled to have you join our vibrant network of entrepreneurs, suppliers, and business leaders across the nation.

Here are 3 quick steps to get the most out of your membership today:

Step 1: 🏢 List Your Business or Services
Create a verified company profile in under 2 minutes so buyers can discover your products.

Step 2: 📺 Explore Free Business Guides & TV Videos
Check out our extensive library of strategic videos, funding alerts, and market pricing teardowns.

Step 3: 💬 Join the WhatsApp Community
Connect directly with fellow business owners, exchange trade leads, and participate in weekly giveaways.

Ready to begin? Click below to jump straight into your dashboard:
{{cta_button}}

If you ever need help or have questions, simply reply directly to this email. We are here to support your success every step of the way!

Warmly,
The Bethelincovibe TV Community Team`,
  },
  {
    id: "verified-supplier-spotlight",
    category: "spotlight",
    categoryLabel: "Supplier Spotlight",
    badge: "💼 Supplier Feature",
    title: "Verified Supplier of the Week",
    description: "Spotlight a verified merchant, manufacturer, or service provider to build trust and drive marketplace transactions.",
    subject: "💼 Verified Supplier Spotlight for {{name}}: Meet Top Rated Merchants of the Week",
    preheader: "Discover trusted wholesale partners, competitive pricing, and verified contact channels.",
    ctaText: "View Featured Suppliers Directory",
    ctaLink: "{{site_url}}/businesses",
    accentColor: "#d97706",
    body: `Hello {{name}},

Looking for reliable, verified suppliers with proven track records and fair wholesale rates?

This week on Bethelincovibe TV, we are highlighting our top-rated verified partners across wholesale goods, logistics, and digital services:

⭐ FEATURED VENDORS OF THE WEEK:
• Supreme Agro & Food Supplies — Bulk grains, spices, and export-grade packaged foods.
• Zenith Express Logistics — Inter-state freight, last-mile delivery, and warehousing.
• Alpha Tech Hardware — Wholesale electronics, solar equipment, and accessories.

All featured businesses have completed our verification checklist and maintain responsive customer support.

Explore their complete catalogs, price lists, and contact details directly:
{{cta_button}}

Have a business you want featured next week? Reply to this message to submit your inquiry!

Happy trading,
Marketplace Curation Team`,
  },
  {
    id: "funding-grant-alert",
    category: "announcement",
    categoryLabel: "Grant Alert",
    badge: "💰 Funding & Grants",
    title: "Startup Funding & Grant Alert",
    description: "Alert your audience to newly opened government, NGO, and private investment grants with eligibility criteria.",
    subject: "💰 Grant Opportunity Alert: New Funding Programs Open for Nigerian Businesses, {{name}}",
    preheader: "Application window is now open. Learn how to qualify and submit your pitch.",
    ctaText: "Check Eligibility & Apply",
    ctaLink: "{{site_url}}/blog",
    accentColor: "#16a34a",
    body: `Hello {{name}},

We have important news regarding active funding opportunities for small and medium-scale businesses!

Several verified grant programs, non-dilutive seed funds, and local startup empowerment funds have recently opened their application portals.

KEY DETAILS:
• Eligible Sectors: Agriculture, Tech, Retail, Logistics, Manufacturing, Services
• Grant Sizes: Up to ₦5,000,000 for qualifying early-stage and growth enterprises
• Requirements: Registered Nigerian business (or in process), valid business plan, and clear use-of-funds roadmap.

We have compiled a comprehensive step-by-step application walkthrough covering winning pitch structures and required documentation.

Review the full guide and application links here:
{{cta_button}}

Do not let this application window pass by. Prepare your pitch and submit early!

Best regards,
Entrepreneurship & Capital Desk`,
  },
  {
    id: "strategic-partner-referral",
    category: "promotion",
    categoryLabel: "Partner Referral",
    badge: "🤝 Referral Program",
    title: "Partner Referral & Affiliate Invitation",
    description: "Invite members to join your referral or affiliate program with custom tracking links and commission breakdowns.",
    subject: "🤝 Earn with Bethelincovibe TV: Invite Fellow Business Owners and Get Rewarded, {{name}}",
    preheader: "Share your unique partner link to earn rewards and help fellow entrepreneurs thrive.",
    ctaText: "Access Your Partner Toolkit",
    ctaLink: "{{referral_link}}",
    accentColor: "#4f46e5",
    body: `Dear {{name}},

Do you know fellow business owners, creators, or suppliers who could benefit from more exposure, verified listings, and automated sales funnels?

Through our Strategic Partner Program, you can share the power of Bethelincovibe TV with your network and receive attractive referral bonuses and listing credits!

HOW IT WORKS:
1. Share your dedicated referral link with friends and business associates.
2. When they register and list their company, you both earn bonus promotional credits.
3. Track your referrals and earnings in real time through your personal portal.

YOUR DEDICATED PARTNER LINK:
{{referral_link}}

Click below to access promotional graphics, social media banners, and sample invitation messages:
{{cta_button}}

Thank you for being an integral part of our growing ecosystem!

Warm regards,
Partnership & Growth Operations`,
  },
  {
    id: "system-platform-update",
    category: "announcement",
    categoryLabel: "System Update",
    badge: "📢 Important Update",
    title: "Platform Maintenance & Service Notice",
    description: "Notify users of important platform improvements, scheduled maintenance windows, or policy updates.",
    subject: "📢 Important Notice for {{name}}: Platform Enhancements & Service Optimization",
    preheader: "We are upgrading our servers and user experience for faster speeds and greater security.",
    ctaText: "Check System Status",
    ctaLink: "{{site_url}}",
    accentColor: "#475569",
    body: `Dear {{name}},

At Bethelincovibe TV, we are committed to delivering the fastest, most reliable business directory and media streaming experience possible.

We are rolling out crucial infrastructure upgrades this weekend to boost system speed, enhance video playback performance, and strengthen end-to-end user security.

WHAT YOU NEED TO KNOW:
• Service Availability: The platform will remain 100% accessible with zero downtime expected for business listings.
• Faster Loading Times: Directory searches and video streams will load up to 2.5x faster.
• Enhanced Account Security: Improved verification protocols for merchant profiles.

If you notice any questions or need technical support, our customer success team is available 24/7.

Click below to visit your dashboard and verify your profile details:
{{cta_button}}

Thank you for your ongoing partnership and trust.

Sincerely,
Engineering & Operations Team, Bethelincovibe TV`,
  },
  {
    id: "executive-founder-letter",
    category: "newsletter",
    categoryLabel: "Founder Letter",
    badge: "✍️ Plaintext Letter",
    title: "Executive Letter from the Founder",
    description: "High-touch, personal, distraction-free letter format ideal for milestone celebrations, community updates, or heartfelt messages.",
    subject: "A personal note of appreciation from Bethelincovibe TV, {{name}}",
    preheader: "Reflecting on our journey, celebrating our community, and looking ahead to what's next.",
    ctaText: "Visit Bethelincovibe TV",
    ctaLink: "{{site_url}}",
    accentColor: "#1e293b",
    body: `Hi {{name}},

I wanted to take a moment today to reach out personally and say thank you for being a cherished part of the Bethelincovibe TV community.

When we set out to build this platform, our singular vision was to give every hardworking entrepreneur, vendor, and creator a trusted stage to shine, trade safely, and reach new heights.

Seeing thousands of connections forged, products sold, and businesses empowered across our nation has been immensely inspiring. Every single day, your dedication fuels our mission to keep innovating and providing world-class tools.

If there is ever anything our team can do to better support your venture, please hit "Reply" to this email. I read every message and value your feedback deeply.

Here's to your continued growth, prosperity, and success!

With gratitude,
Founder & Executive Director
Bethelincovibe TV
{{site_url}}`,
  },
];
