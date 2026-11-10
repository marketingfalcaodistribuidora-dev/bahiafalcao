import { fullAddress, site, whatsappLink } from "@/lib/site";

/**
 * /llms.txt: resumo da empresa para buscadores com IA (ChatGPT, Gemini, Perplexity).
 * Gerado a partir de lib/site.ts (fonte única de dados) e servido como arquivo estático.
 */
export const dynamic = "force-static";

export function GET() {
  const { contact, address } = site;
  const ig = contact.instagram.replace(/^@/, "").trim();
  const whatsappUrl = whatsappLink().split("?")[0];

  const contato = [
    `- Área atendida: toda a ${address.stateName} (sede em ${address.city})`,
    `- Endereço: ${fullAddress}`,
    ...(contact.phone ? [`- Telefone: ${contact.phone}`] : []),
    `- WhatsApp: ${contact.whatsappDisplay} (${whatsappUrl})`,
    ...(ig ? [`- Instagram: https://instagram.com/${ig}`] : []),
    ...(contact.hoursText ? [`- Horário: ${contact.hoursText}`] : []),
    `- Site: ${site.url}`,
    `- Como chegar: ${site.mapsUrl}`,
  ];

  const text = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `Também conhecida como: ${site.alternateNames.join(", ")}.`,
    "",
    "## Sobre",
    `Distribuidora de autopeças e ferramentas para linha pesada (caminhões, carretas e veículos pesados) em ${address.city}, ${address.stateName}, desde ${site.foundingYear}. Catálogo com mais de ${site.catalogItems} itens e atendimento especializado.`,
    "",
    "## Segmentos",
    ...site.segments.map((s) => `- ${s}`),
    "",
    "## Contato",
    ...contato,
    "",
  ].join("\n");

  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
