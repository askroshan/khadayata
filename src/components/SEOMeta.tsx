import { useEffect } from "react";

interface SEOMetaProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  schema?: object;
  noIndex?: boolean;
}

const BASE_TITLE = "Khadayata Online";
const BASE_DESCRIPTION = "Khadayata Online — the global digital home for the Khadayata community. Verified member directory, events, business network, matrimonial, heritage archives, and Kotyark Temple, across 28 countries and 67 chapters.";
const BASE_URL = "https://khadayataonline.com";
const BASE_IMAGE = "/Screenshot_2026-03-16_at_9.18.14_AM.png";

export default function SEOMeta({
  title,
  description = BASE_DESCRIPTION,
  keywords,
  image = BASE_IMAGE,
  url,
  type = "website",
  schema,
  noIndex = false,
}: SEOMetaProps) {
  const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} — Connecting Khadayata Community Worldwide`;
  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const imageUrl = image.startsWith("http") ? image : `${BASE_URL}${image}`;

  const defaultSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "Khadayata Online",
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: imageUrl,
          width: 400,
          height: 200,
        },
        description: BASE_DESCRIPTION,
        address: {
          "@type": "PostalAddress",
          streetAddress: "1320 Pepperhill Ln",
          addressLocality: "Fort Worth",
          addressRegion: "TX",
          postalCode: "76131",
          addressCountry: "US",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-682-432-9400",
          contactType: "customer support",
          email: "support@khadayataonline.com",
          availableLanguage: ["English", "Gujarati", "Hindi"],
        },
        sameAs: [
          "https://www.facebook.com/KhadayataOnline",
          "https://twitter.com/KhadayataOnline",
          "https://www.instagram.com/KhadayataOnline",
        ],
        knowsAbout: [
          "Khadayata community",
          "Gujarati community",
          "Hindu community",
          "Kotyark Temple",
          "Indian diaspora",
          "Community directory",
          "Cultural heritage preservation",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "Khadayata Online",
        description: BASE_DESCRIPTION,
        publisher: { "@id": `${BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        inLanguage: "en-US",
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}/#webpage`,
        url: canonicalUrl,
        name: fullTitle,
        description,
        isPartOf: { "@id": `${BASE_URL}/#website` },
        about: { "@id": `${BASE_URL}/#organization` },
        inLanguage: "en-US",
      },
      ...(schema ? [schema] : []),
    ],
  };

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    const setScript = (id: string, content: object) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("script");
        el.id = id;
        (el as HTMLScriptElement).type = "application/ld+json";
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(content);
    };

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("robots", noIndex ? "noindex,nofollow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1");
    setMeta("author", "Khadayata Online");
    setMeta("language", "en");
    setMeta("revisit-after", "7 days");
    setMeta("rating", "general");

    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:type", type, true);
    setMeta("og:image", imageUrl, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:site_name", "Khadayata Online", true);
    setMeta("og:locale", "en_US", true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", imageUrl);
    setMeta("twitter:site", "@KhadayataOnline");

    setLink("canonical", canonicalUrl);

    setScript("schema-ld-json", defaultSchema);
  }, [fullTitle, description, keywords, imageUrl, canonicalUrl, type, noIndex]);

  return null;
}
