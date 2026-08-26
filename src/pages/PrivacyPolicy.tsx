import { Helmet } from "react-helmet-async";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Bethelincovibe TV | Business Growth Ecosystem</title>
        <meta
          name="description"
          content="Privacy Policy for Bethelincovibe TV. Learn how our AI-powered business growth ecosystem collects, uses, and safeguards your business and personal information."
        />
        <link rel="canonical" href="https://bethelincovibetv.com/privacy-policy" />
      </Helmet>
      <LegalPageLayout
        title="Privacy Policy"
        subtitle="How we collect, use, and protect your information in the Bethelincovibe TV ecosystem"
      >
        <h2>1. Introduction</h2>
        <p>
          Welcome to Bethelincovibe TV ("we", "our", "us"). We are dedicated to empowering entrepreneurs, MSMEs, and creators while fiercely protecting your personal and business privacy. This Privacy Policy details how we collect, handle, store, and safeguard your information when you interact with our website, business directory, marketplace, AI coaching tools, and community services.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>A. Information You Voluntarily Provide</h3>
        <p>We may collect information you provide directly to us when you:</p>
        <ul>
          <li>Create an account or complete your entrepreneur user profile.</li>
          <li>Submit a business or service listing for directory verification.</li>
          <li>Publish products, wholesale inventories, or digital assets to the marketplace.</li>
          <li>Generate single-page sales pages or configure WhatsApp leads routing.</li>
          <li>Interact with the AI Business Coach or input queries into startup planning utilities.</li>
          <li>Post topics, comments, or inquiries in the community forum.</li>
          <li>Subscribe to our newsletters, intelligence briefs, or contact our support team.</li>
        </ul>
        <p>
          This may include your name, business name, phone number, WhatsApp contact, business email address, physical store address, category tags, product images, and commercial descriptions.
        </p>

        <h3>B. Optional Integrations (Google Contacts &amp; Social Leads)</h3>
        <p>
          If you explicitly opt in to use our networking features (such as mutual WhatsApp contact synchronization), we use official client-side Google OAuth to facilitate the direct export or import of business contacts with your explicit, revocable consent. We never sell, rent, or misuse your private contact books.
        </p>

        <h3>C. Automatically Collected Device &amp; Usage Data</h3>
        <p>When you browse our platform, our servers may automatically log:</p>
        <ul>
          <li>Browser type, operating system, and device screen resolution.</li>
          <li>IP address and approximate geographic location (e.g. Lagos, Nigeria).</li>
          <li>Pages visited, referring URLs, search queries, and duration of visits.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the data we collect to power and enhance the Bethelincovibe TV ecosystem:</p>
        <ul>
          <li>To display and index verified business directory listings and products to interested buyers.</li>
          <li>To deliver personalized, contextual responses via our AI Business Coach.</li>
          <li>To facilitate direct buyer-to-seller communication via verified WhatsApp and phone channels.</li>
          <li>To calculate platform analytics, track referral rewards, and maintain system health.</li>
          <li>To distribute curated startup playbooks, market intelligence briefs, and platform updates.</li>
          <li>To detect, prevent, and mitigate fraudulent listings, spam, and security risks.</li>
        </ul>

        <h2>4. Cookies, Analytics &amp; Third-Party Advertising</h2>
        <p>
          We use cookies and local storage to keep you authenticated, remember your preferences, and understand user traffic. Third-party advertising partners, including Google AdSense, may deploy cookies to deliver relevant commercial advertisements based on your browsing patterns.
        </p>
        <p>
          You may manage or opt out of personalized Google advertising at any time by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
        </p>

        <h2>5. Data Sharing &amp; Third Parties</h2>
        <p>
          We do not sell your personal data. We only share information in the following limited circumstances:
        </p>
        <ul>
          <li><strong>Public Business Data:</strong> Information you publish to your public business profile, sales page, or marketplace listing is intended to be publicly discoverable by buyers.</li>
          <li><strong>Service Providers:</strong> Trusted cloud infrastructure (e.g., Supabase database, hosting, email delivery) strictly bound by data confidentiality agreements.</li>
          <li><strong>Legal Compliance:</strong> When required by enforceable legal requests or applicable regulations under the Federal Republic of Nigeria.</li>
        </ul>

        <h2>6. Data Security &amp; Retention</h2>
        <p>
          We deploy industry-standard encryption, role-based access controls, and secure database protocols to guard your personal and business records. While no internet transmission is 100% immune from risks, we continually audit and harden our security defenses.
        </p>

        <h2>7. Your Rights &amp; Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access, update, or edit your account information and business listings anytime via your dashboard.</li>
          <li>Request deletion of your account and associated personal data.</li>
          <li>Opt out of marketing emails by clicking the unsubscribe link in any newsletter.</li>
        </ul>

        <h2>8. Updates to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy periodically to reflect new ecosystem features. Any updates will be posted on this page with a revised date.
        </p>

        <h2>9. Contact Our Data Protection Team</h2>
        <p>If you have any questions or data privacy requests, please contact us at:</p>
        <ul>
          <li><strong>Email:</strong> bethelincovibetv@gmail.com</li>
          <li><strong>Location:</strong> Lagos, Nigeria</li>
          <li><strong>Website:</strong> https://bethelincovibetv.com</li>
        </ul>
      </LegalPageLayout>
    </>
  );
}
