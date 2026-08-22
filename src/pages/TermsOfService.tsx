import { Helmet } from "react-helmet-async";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service - Bethelincovibe TV</title>
        <meta name="description" content="Terms of Service for Bethelincovibe TV. Read the terms and conditions governing your use of our website." />
      </Helmet>
      <LegalPageLayout title="Terms of Service" subtitle="The rules for using Bethelincovibe TV">


        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using Bethelincovibe TV ("the Website"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website.</p>

        <h2>2. Description of Service</h2>
        <p>Bethelincovibe TV provides business information, startup guides, a Lagos business directory, and marketing tips for entrepreneurs in Lagos, Nigeria. Our services include blog content, business listings, and related resources.</p>

        <h2>3. User Accounts</h2>
        <p>When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
        <ul>
          <li>Maintaining the security of your account and password</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized use</li>
        </ul>

        <h2>4. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the website for any unlawful purpose</li>
          <li>Post or transmit any harmful, threatening, or offensive content</li>
          <li>Attempt to interfere with the proper functioning of the website</li>
          <li>Impersonate any person or entity</li>
          <li>Collect or store personal data about other users without their consent</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>All content on this website, including text, graphics, logos, images, and software, is the property of Bethelincovibe TV and is protected by copyright and intellectual property laws. You may not reproduce, distribute, or create derivative works without our prior written consent.</p>

        <h2>6. Business Listings</h2>
        <p>We strive to provide accurate business information. However, we do not guarantee the accuracy, completeness, or reliability of any business listing. We are not responsible for any transactions between you and listed businesses.</p>

        <h2>7. Disclaimer of Warranties</h2>
        <p>The website is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the website will be uninterrupted, error-free, or free of viruses or other harmful components.</p>

        <h2>8. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Bethelincovibe TV shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the website.</p>

        <h2>9. Third-Party Links</h2>
        <p>Our website may contain links to third-party websites. We are not responsible for the content or practices of these external sites. Visiting these links is at your own risk.</p>

        <h2>10. Modifications to Terms</h2>
        <p>We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting on this page. Your continued use of the website after any modifications constitutes acceptance of the updated terms.</p>

        <h2>11. Governing Law</h2>
        <p>These Terms of Service are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.</p>

        <h2>12. Contact Us</h2>
        <p>If you have any questions about these Terms of Service, please contact us at:</p>
        <ul>
          <li>Email: bethelgoobdgift3@gmail.com</li>
          <li>Location: Lagos, Nigeria</li>
        </ul>
      </LegalPageLayout>
    </>
  );
}
