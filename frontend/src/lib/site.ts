import { isIndexable, resolveSiteUrl, runtimeEnv } from "@/lib/env";

/**
 * Dados da empresa num único lugar.
 * Tudo o que aparece no site, nos metadados e nos dados estruturados (SEO) sai daqui.
 * Campos vazios simplesmente não aparecem na página.
 */
export const site = {
  /** Nome completo, como na logo. Contém as formas curtas "Bahia Falcão" e "Falcão Distribuidora". */
  name: "Bahia Falcão Distribuidora",
  /** Marca curta (título da página, manifest). */
  shortName: "Bahia Falcão",
  /** Outras formas como os clientes procuram a empresa (schema.org alternateName). */
  alternateNames: ["Falcão Distribuidora", "Bahia Falcão", "Falcão Distribuidora Bahia"],
  /** NEXT_PUBLIC_SITE_URL (domínio próprio) > domínio de produção da Vercel > localhost. Ver lib/env.ts. */
  url: resolveSiteUrl(runtimeEnv),
  /** false nas URLs de preview da Vercel (não indexar). */
  indexable: isIndexable(runtimeEnv),
  /** Até 60 caracteres, palavra-chave primeiro (coberto por teste). */
  title: "Autopeças Linha Pesada em Feira de Santana | Bahia Falcão",
  /** Entre 120 e 160 caracteres, com o nome completo (coberto por teste). */
  description:
    "Bahia Falcão Distribuidora: autopeças e ferramentas para caminhões e carretas em Feira de Santana, BA. Mais de 7 mil itens desde 2006. Fale no WhatsApp.",
  keywords: [
    "Bahia Falcão Distribuidora",
    "Bahia Falcão",
    "Falcão Distribuidora",
    "Falcão Distribuidora Feira de Santana",
    "autopeças linha pesada",
    "autopeças Feira de Santana",
    "peças para caminhão Feira de Santana",
    "peças para carretas",
    "distribuidora de autopeças Bahia",
    "ferramentas para caminhão",
    "peças para veículos pesados",
  ],

  foundingYear: "2006",
  catalogItems: "7 mil",

  address: {
    /** Mesmo endereço do Perfil da Empresa no Google (consistência de NAP para SEO local). */
    street: "Rua Venceslau Guimarães, 31 - Sim",
    city: "Feira de Santana",
    state: "BA",
    stateName: "Bahia",
    postalCode: "44085-520",
    country: "BR",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Falc%C3%A3o+Distribuidora%2C+R.+Venceslau+Guimar%C3%A3es%2C+31+-+Sim%2C+Feira+de+Santana+-+BA%2C+44085-520",

  contact: {
    /** Somente dígitos, com DDI e DDD. Ex.: "5575999999999". Vazio: o WhatsApp abre e a pessoa escolhe o contato. */
    whatsapp: "557536228260",
    /** Como o número do WhatsApp aparece na página. */
    whatsappDisplay: "(75) 3622-8260",
    /** Como aparece na página. Ex.: "0800 703 8260" ou "(75) 3000-0000". */
    phone: "0800 703 8260",
    /** Sem @. Ex.: "falcaodistribuidora" */
    instagram: "falcaodistribuidora.br",
    /** Texto exibido na página. Ex.: "Seg. a sex., 8h às 18h · Sáb., 8h às 12h" */
    hoursText: "Seg. a sáb., 8h às 12h e 14h às 18h",
    /** Formato schema.org para o Google. Ex.: ["Mo-Fr 08:00-18:00", "Sa 08:00-12:00"] */
    openingHours: ["Mo-Sa 08:00-12:00", "Mo-Sa 14:00-18:00"] as string[],
  },
};

export const whatsappMessages = {
  geral: "Olá! Gostaria de falar com um especialista da Falcão Distribuidora.",
  hero: "Olá! Vim pelo site da Falcão Distribuidora e gostaria de falar com a equipe.",
  cta: "Olá! Preciso de peças para linha pesada e gostaria de atendimento da equipe da Falcão Distribuidora.",
  contato: "Olá! Gostaria de entrar em contato com a Falcão Distribuidora.",
  linhaPesada: "Olá! Gostaria de consultar autopeças para linha pesada com a equipe da Falcão Distribuidora.",
  carretas: "Olá! Gostaria de consultar peças para carretas com a equipe da Falcão Distribuidora.",
  ferramentas: "Olá! Gostaria de consultar ferramentas com a equipe da Falcão Distribuidora.",
  peca: "Olá! Gostaria de consultar a disponibilidade de uma peça com a equipe da Falcão Distribuidora.",
} as const;

export const navLinks = [
  { href: "/#empresa", label: "Empresa" },
  { href: "/#segmentos", label: "Segmentos" },
  { href: "/#estrutura", label: "Estrutura" },
  { href: "/#contato", label: "Contato" },
] as const;

export function whatsappLink(message: string = whatsappMessages.geral): string {
  const number = site.contact.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const phoneDigits = site.contact.phone.replace(/\D/g, "");
const isTollFree = /^0(800|300|500|900)/.test(phoneDigits);

/** Link "tel:" do telefone. 0800 é discado sem DDI; números comuns recebem +55. */
export const phoneHref = phoneDigits ? (isTollFree ? `tel:${phoneDigits}` : `tel:+55${phoneDigits}`) : "";

/** Telefone em formato internacional para dados estruturados (ex.: +55 800 703 8260). */
export const phoneInternational = phoneDigits
  ? isTollFree
    ? `+55 ${phoneDigits.slice(1, 4)} ${phoneDigits.slice(4, 7)} ${phoneDigits.slice(7)}`
    : `+55${phoneDigits}`
  : "";

/** Mapa incorporado do Google Maps (sem chave de API), com a mesma busca do link de rota. */
export const mapsEmbedUrl = `https://www.google.com/maps?${new URLSearchParams({
  q: new URL(site.mapsUrl).searchParams.get("query") ?? "",
  output: "embed",
  hl: "pt-BR",
})}`;

export const fullAddress = `${site.address.street}, ${site.address.city} - ${site.address.state}, CEP ${site.address.postalCode}`;
