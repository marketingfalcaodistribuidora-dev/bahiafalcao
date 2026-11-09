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
