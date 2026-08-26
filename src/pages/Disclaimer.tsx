import { Helmet } from "react-helmet-async";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function Disclaimer() {
  return (
    <>
      <Helmet>
        <title>Disclaimer - Bethelincovibe TV | Business Growth Ecosystem</title>
        <meta
          name="description"
          content="Disclaimer for Bethelincovibe TV. Important disclosures regarding our AI business tools, marketplace listings, directory information, and educational startup guides."
        />
        <link rel="canonical" href="https://bethelincovibetv.com/disclaimer" />
      </Helmet>
      <LegalPageLayout
        title="Disclaimer"
        subtitle="Important information regarding our AI tools, marketplace, directory, and startup guides"
      >
        <h2>1. General Information &amp; Educational Purpose</h2>
        <p>
          The information, guides, market playbooks, and calculators published on Bethelincovibe TV are provided in good faith for general business informational and educational purposes only. While we endeavor to keep all market data accurate and relevant to Nigeria's dynamic commercial environment, we make no representations or warranties of any kind regarding completeness, validity, or future profitability.
        </p>

        <h2>2. AI Business Coach &amp; Automated Tools Disclaimer</h2>
        <p>
          Bethelincovibe TV provides AI-powered features, including the AI Business Coach, automated startup cost calculators, and promotional copywriting utilities. 
        </p>
        <ul>
          <li><strong>Not Certified Professional Counsel:</strong> AI outputs are generated algorithmically for ideation, scenario planning, and operational efficiency. They do not constitute formal legal, corporate auditing, tax compliance, or licensed financial advice.</li>
          <li><strong>Verification Required:</strong> Users should independently verify regulatory requirements (such as CAC registration, NAFDAC certifications, and tax obligations) with qualified professionals before committing financial capital.</li>
        </ul>

        <h2>3. Business Directory &amp; Marketplace Transactions</h2>
        <p>
          The business profiles, product inventories, wholesale batches, and service offerings featured on Bethelincovibe TV are submitted by independent entrepreneurs, suppliers, and merchants.
        </p>
        <ul>
          <li><strong>No Universal Warranty:</strong> Unless explicitly verified under an official Bethelincovibe TV guarantee or escrow program, Bethelincovibe TV does not warrant the quality, safety, delivery, or legality of items listed by third-party sellers.</li>
          <li><strong>Buyer &amp; Seller Diligence:</strong> We strongly urge all parties to inspect goods, agree on clear payment terms, and conduct standard commercial diligence before releasing funds.</li>
        </ul>

        <h2>4. Startup &amp; Import Trade Guides</h2>
        <p>
          Our guides (including mini-importation from China, clearing logistics, freight forwarding, and wholesale sourcing) reflect operational strategies at the time of writing. Global shipping rates, exchange rates (FX), customs tariffs, and local port duties fluctuate frequently. Readers must confirm real-time rates with their chosen logistics partners.
        </p>

        <h2>5. Advertising &amp; Affiliate Disclosure</h2>
        <p>
          Bethelincovibe TV may feature third-party advertisements (such as Google AdSense) and affiliate links to verified business tools, domain registrars, or eCommerce equipment. Clicking these links or making purchases through them may generate a small commission for Bethelincovibe TV at zero additional cost to you. We only recommend solutions that provide genuine value to our entrepreneur community.
        </p>

        <h2>6. External Links Disclaimer</h2>
        <p>
          Our platform may contain links to external websites, government portals, or partner applications. We have no control over the content, uptime, or privacy practices of external websites.
        </p>

        <h2>7. Contact Us</h2>
        <p>If you have any questions or require clarification regarding this disclaimer, please contact us at:</p>
        <ul>
          <li><strong>Email:</strong> bethelincovibetv@gmail.com</li>
          <li><strong>Location:</strong> Lagos, Nigeria</li>
          <li><strong>Website:</strong> https://bethelincovibetv.com</li>
        </ul>
      </LegalPageLayout>
    </>
  );
}
