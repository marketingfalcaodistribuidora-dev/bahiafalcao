import { phoneInternational, site } from "@/lib/site";

/**
 * Dados estruturados (schema.org / JSON-LD) para o Google entender a empresa
 * como loja de autopeças local (rich results, Google Maps, painel de conhecimento).
 */
export function buildJsonLd() {
  const { address, contact } = site;
  const phoneDigits = contact.phone.replace(/\D/g, "");
  const waDigits = contact.whatsapp.replace(/\D/g, "");
  const ig = contact.instagram.replace(/^@/, "").trim();

  const business: Record<string, unknown> = {
    "@type": "AutoPartsStore",
    "@id": `${site.url}/#empresa`,
    name: site.name,
    alternateName: site.alternateNames,
    brand: { "@type": "Brand", name: site.shortName },
    url: site.url,
    description: site.description,
    logo: `${site.url}/images/falcao-distribuidora-logo.png`,
    image: [
      `${site.url}/images/fachada-falcao-distribuidora-feira-de-santana.webp`,
      `${site.url}/images/galpao-falcao-distribuidora-feira-de-santana.webp`,
      `${site.url}/images/loja-atendimento-falcao-distribuidora.png`,
    ],
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
    areaServed: [
      { "@type": "City", name: address.city },
      { "@type": "State", name: address.stateName },
    ],
    knowsAbout: ["Autopeças para linha pesada", "Peças para caminhões", "Peças para carretas", "Ferramentas"],
  };

  if (phoneDigits) business.telephone = phoneInternational;
  if (ig) business.sameAs = [`https://instagram.com/${ig}`];
  if (contact.openingHours.length) business.openingHours = contact.openingHours;
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
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        alternateName: site.alternateNames,
        inLanguage: "pt-BR",
        publisher: { "@id": `${site.url}/#empresa` },
      },
    ],
  };
}

/** Serializa com segurança para uso dentro de <script type="application/ld+json">. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
