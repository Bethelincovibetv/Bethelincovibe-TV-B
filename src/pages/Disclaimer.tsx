import { Helmet } from "react-helmet-async";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function Disclaimer() {
  return (
    <>
      <Helmet>
        <title>Disclaimer - Bethelincovibe TV</title>
        <meta name="description" content="Disclaimer for Bethelincovibe TV. Important information about the limitations of our content and services." />
      </Helmet>
      <LegalPageLayout title="Disclaimer" subtitle="Important information about our content & services">


        <h2>General Information</h2>
        <p>The information provided on Bethelincovibe TV is for general informational purposes only. All information on the website is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the website.</p>

        <h2>No Professional Advice</h2>
        <p>The website does not provide professional business, legal, financial, or tax advice. The content is intended to provide general guidance for entrepreneurs. Before making any business decisions, we recommend consulting with qualified professionals.</p>

        <h2>External Links Disclaimer</h2>
        <p>The website may contain links to external websites that are not provided or maintained by us. We do not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites.</p>

        <h2>Advertising Disclaimer</h2>
        <p>Bethelincovibe TV may display advertisements provided by third-party ad networks, including Google AdSense. These advertisements are not endorsements of the products or services advertised. We are not responsible for the content of these advertisements or any transactions that may result from clicking on them.</p>

        <h2>Affiliate Disclaimer</h2>
        <p>Some links on this website may be affiliate links. This means we may earn a commission if you make a purchase through these links, at no additional cost to you. This does not influence our content or recommendations.</p>

        <h2>Business Directory Disclaimer</h2>
        <p>The business listings on our website are provided for informational purposes. We do not endorse, guarantee, or assume responsibility for any business listed on our platform. Users should conduct their own due diligence before engaging with any listed business.</p>

        <h2>Errors and Omissions</h2>
        <p>While we strive to keep the information up to date and correct, we make no representations or warranties about the completeness, accuracy, reliability, suitability, or availability of the information, products, services, or related graphics contained on the website.</p>

        <h2>Contact Us</h2>
        <p>If you require any more information or have any questions about our disclaimer, please contact us at:</p>
        <ul>
          <li>Email: bethelgoobdgift3@gmail.com</li>
          <li>Location: Lagos, Nigeria</li>
        </ul>
      </LegalPageLayout>
    </>
  );
}
