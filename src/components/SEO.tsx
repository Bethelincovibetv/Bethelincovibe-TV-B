import React from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product" | "profile";
  author?: string;
  publishedTime?: string;
  keywords?: string;
}

const DEFAULT_TITLE = "Bethelincovibe TV - Business Information & Marketplace for Lagos Entrepreneurs";
const DEFAULT_DESCRIPTION = "Startup guides, verified Lagos suppliers, directory, courses, and AI business growth tools for Nigerian entrepreneurs.";
const DEFAULT_IMAGE = "https://bethelincovibetv.com/logo.png";
const SITE_NAME = "Bethelincovibe TV";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  author = "Bethelincovibe TV",
  publishedTime,
  keywords,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | Bethelincovibe TV`
    : DEFAULT_TITLE;

  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "https://bethelincovibetv.com");

  // Ensure absolute image URL for WhatsApp and social scrapers
  const fullImage = image?.startsWith("http")
    ? image
    : typeof window !== "undefined"
    ? `${window.location.origin}${image?.startsWith("/") ? "" : "/"}${image}`
    : DEFAULT_IMAGE;

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:alt" content={title || SITE_NAME} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content="en_NG" />

      {/* Article Specific */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@bethelincovibetv" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
    </Helmet>
  );
}
