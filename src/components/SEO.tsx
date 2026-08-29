import React from "react";
import { Helmet } from "react-helmet-async";
import { absUrl, SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "@/lib/seo";

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string | null;
  imageAlt?: string;
  imageWidth?: number | string;
  imageHeight?: number | string;
  imageType?: string;
  url?: string;
  type?: "website" | "article" | "product" | "profile" | "business.business";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  keywords?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  jsonLd?: Record<string, any> | Array<Record<string, any>> | null;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  imageAlt,
  imageWidth = "1200",
  imageHeight = "630",
  imageType = "image/png",
  url,
  type = "website",
  author = SITE_NAME,
  publishedTime,
  modifiedTime,
  section,
  keywords,
  twitterCard = "summary_large_image",
  noIndex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : DEFAULT_TITLE;

  const currentUrl = absUrl(url || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"));
  const fullImage = absUrl(image, DEFAULT_OG_IMAGE);
  const altText = imageAlt || title || SITE_NAME;

  return (
    <Helmet>
      {/* Standard HTML & Search Engine Discovery */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />
      <link rel="canonical" href={currentUrl} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph Protocol (Facebook, WhatsApp, LinkedIn, Telegram, Discord) */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:secure_url" content={fullImage} />
      <meta property="og:image:alt" content={altText} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      {imageType && <meta property="og:image:type" content={imageType} />}
      <meta property="og:locale" content="en_NG" />

      {/* Article Specific Open Graph */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Cards (X) */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@bethelincovibetv" />
      <meta name="twitter:creator" content="@bethelincovibetv" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={altText} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
