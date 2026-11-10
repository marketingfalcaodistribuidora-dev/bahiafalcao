import { describe, expect, it } from "vitest";
import { buildJsonLd, jsonLdScript } from "@/lib/seo";

type Node = Record<string, unknown>;

function findNode(type: string): Node {
  const graph = buildJsonLd()["@graph"] as Node[];
  const node = graph.find((n) => n["@type"] === type);
  if (!node) throw new Error(`Nó ${type} não encontrado no JSON-LD`);
  return node;
}

describe("buildJsonLd", () => {
  it("descreve a empresa como loja de autopeças com endereço completo", () => {
    const business = findNode("AutoPartsStore");

    expect(business.name).toBe("Bahia Falcão Distribuidora");
    expect(business.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Rua Venceslau Guimarães, 31 - Sim",
      addressLocality: "Feira de Santana",
      addressRegion: "BA",
      postalCode: "44085-520",
      addressCountry: "BR",
    });
  });

  it("inclui telefone, Instagram e horário de funcionamento", () => {
    const business = findNode("AutoPartsStore");

    expect(business.telephone).toBe("+55 800 703 8260");
    expect(business.sameAs).toEqual(["https://instagram.com/falcaodistribuidora.br"]);
    expect(business.openingHours).toEqual(["Mo-Sa 08:00-12:00", "Mo-Sa 14:00-18:00"]);
  });

  it("descreve o horário no formato estruturado que o Google usa para 'aberto agora'", () => {
    const business = findNode("AutoPartsStore");
    const dias = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    expect(business.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: dias, opens: "08:00", closes: "12:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: dias, opens: "14:00", closes: "18:00" },
    ]);
  });

  it("usa a logo quadrada oficial, no tamanho mínimo exigido pelo Google", () => {
    const business = findNode("AutoPartsStore");

    expect(business.logo).toEqual({
      "@type": "ImageObject",
      url: "http://localhost:3000/images/bahia-falcao-distribuidora-logo.png",
      width: 512,
      height: 512,
    });
  });

  it("lista os segmentos como subcatálogos (categorias), não como produtos com preço", () => {
    const business = findNode("AutoPartsStore");

    expect(business.hasOfferCatalog).toEqual({
      "@type": "OfferCatalog",
      name: "Autopeças e ferramentas para linha pesada",
      itemListElement: [
        { "@type": "OfferCatalog", name: "Autopeças para linha pesada" },
        { "@type": "OfferCatalog", name: "Peças para carretas" },
        { "@type": "OfferCatalog", name: "Ferramentas" },
      ],
    });
  });

  it("não declara nenhum Product, que exigiria preço, avaliações ou nota (erro no Search Console)", () => {
    const json = JSON.stringify(buildJsonLd());

    expect(json).not.toContain('"@type":"Product"');
  });

  it("declara a sede em Feira de Santana e o atendimento em toda a Bahia", () => {
    const business = findNode("AutoPartsStore");

    expect(business.areaServed).toEqual([
      {
        "@type": "State",
        name: "Bahia",
        containedInPlace: { "@type": "Country", name: "Brasil" },
      },
      {
        "@type": "City",
        name: "Feira de Santana",
        containedInPlace: { "@type": "State", name: "Bahia" },
      },
    ]);
    expect((business.address as { addressLocality: string }).addressLocality).toBe("Feira de Santana");
  });

  it("informa moeda e idioma do atendimento", () => {
    const business = findNode("AutoPartsStore");

    expect(business.currenciesAccepted).toBe("BRL");
    expect(business.availableLanguage).toBe("pt-BR");
  });

  it("descreve a página inicial ligada à empresa e ao site", () => {
    const page = findNode("WebPage");

    expect(page.name).toBe("Autopeças Linha Pesada | Bahia Falcão");
    expect(page.inLanguage).toBe("pt-BR");
    expect(page.isPartOf).toEqual({ "@id": "http://localhost:3000/#website" });
    expect(page.about).toEqual({ "@id": "http://localhost:3000/#empresa" });
  });

  it("informa ao Google os nomes alternativos da empresa", () => {
    const business = findNode("AutoPartsStore");

    expect(business.alternateName).toEqual(["Falcão Distribuidora", "Bahia Falcão", "Falcão Distribuidora Bahia"]);
    expect(business.brand).toEqual({ "@type": "Brand", name: "Bahia Falcão" });
  });

  it("informa o nome do site e as variações para aparecer nos resultados de busca", () => {
    const website = findNode("WebSite");

    expect(website.name).toBe("Bahia Falcão Distribuidora");
    expect(website.alternateName).toEqual(["Falcão Distribuidora", "Bahia Falcão", "Falcão Distribuidora Bahia"]);
  });

  it("declara o site em português ligado à empresa", () => {
    const website = findNode("WebSite");
    const business = findNode("AutoPartsStore");

    expect(website.inLanguage).toBe("pt-BR");
    expect(website.publisher).toEqual({ "@id": business["@id"] });
  });
});

describe("jsonLdScript", () => {
  it("escapa '<' para impedir que o conteúdo feche a tag <script>", () => {
    const output = jsonLdScript({ texto: "</script><script>alert(1)</script>" });

    expect(output).not.toContain("</script>");
    expect(JSON.parse(output)).toEqual({ texto: "</script><script>alert(1)</script>" });
  });
});
