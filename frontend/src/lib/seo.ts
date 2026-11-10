import { images } from "@/lib/images";
import { phoneInternational, site } from "@/lib/site";

/**
 * Dados estruturados (schema.org / JSON-LD) para o Google entender a empresa
 * como loja de autopeças local (rich results, Google Maps, painel de conhecimento).
 * Tudo aqui reflete conteúdo visível na página — nada de marcar o que não existe.
 */
export function buildJsonLd() {
  const { address, contact } = site;
  const phoneDigits = contact.phone.replace(/\D/g, "");
  const waDigits = contact.whatsapp.replace(/\D/g, "");
  const ig = contact.instagram.replace(/^@/, "").trim();

  const empresaId = `${site.url}/#empresa`;
  const websiteId = `${site.url}/#website`;

  const business: Record<string, unknown> = {
    "@type": "AutoPartsStore",
    "@id": empresaId,
    name: site.name,
    alternateName: site.alternateNames,
    brand: { "@type": "Brand", name: site.shortName },
    url: site.url,
    description: site.description,
    logo: {
      "@type": "ImageObject",
      url: `${site.url}${images.logoQuadrada.src}`,
      width: images.logoQuadrada.width,
      height: images.logoQuadrada.height,
    },
    image: [`${site.url}${images.fachada.src}`, `${site.url}${images.bahiaFalcao.src}`],
    foundingDate: site.foundingYear,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    hasMap: site.mapsUrl,
    // Sede em Feira de Santana (address) e distribuição para todo o estado da Bahia.
    areaServed: [
      { "@type": "State", name: address.stateName, containedInPlace: { "@type": "Country", name: "Brasil" } },
      { "@type": "City", name: address.city, containedInPlace: { "@type": "State", name: address.stateName } },
    ],
    knowsAbout: ["Autopeças para linha pesada", "Peças para caminhões", "Peças para carretas", "Ferramentas"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Autopeças e ferramentas para linha pesada",
      itemListElement: site.segments.map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Product", name },
      })),
    },
    currenciesAccepted: "BRL",
    availableLanguage: "pt-BR",
  };

  if (phoneDigits) business.telephone = phoneInternational;
  if (ig) business.sameAs = [`https://instagram.com/${ig}`];
  if (contact.openingHours.length) business.openingHours = contact.openingHours;
  if (contact.openingHoursSpec.length) {
    business.openingHoursSpecification = contact.openingHoursSpec.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  if (waDigits) {
    business.contactPoint = {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: `+${waDigits}`,
      availableLanguage: "Portuguese",
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: site.url,
        name: site.name,
        alternateName: site.alternateNames,
        inLanguage: "pt-BR",
        publisher: { "@id": empresaId },
      },
      {
        "@type": "WebPage",
        "@id": `${site.url}/#pagina`,
        url: site.url,
        name: site.title,
        description: site.description,
        inLanguage: "pt-BR",
        isPartOf: { "@id": websiteId },
        about: { "@id": empresaId },
        primaryImageOfPage: { "@type": "ImageObject", url: `${site.url}${images.fachada.src}` },
      },
    ],
  };
}

/** Serializa com segurança para uso dentro de <script type="application/ld+json">. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
