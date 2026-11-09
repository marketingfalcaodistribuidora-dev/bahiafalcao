import { describe, expect, it } from "vitest";
import { fullAddress, phoneHref, phoneInternational, site, whatsappLink, whatsappMessages } from "@/lib/site";

describe("whatsappLink", () => {
  it("abre conversa com o número da empresa e a mensagem codificada na URL", () => {
    const link = whatsappLink("Olá! Preciso de peças & ferramentas");

    expect(link).toBe("https://wa.me/557536228260?text=Ol%C3%A1!%20Preciso%20de%20pe%C3%A7as%20%26%20ferramentas");
  });

  it("usa a mensagem geral quando nenhuma é informada", () => {
    const link = whatsappLink();

    expect(link).toBe(`https://wa.me/557536228260?text=${encodeURIComponent(whatsappMessages.geral)}`);
  });
});

describe("telefone 0800", () => {
  it("gera link de discagem sem DDI, como o 0800 exige", () => {
    expect(phoneHref).toBe("tel:08007038260");
  });

  it("gera o formato internacional usado nos dados estruturados", () => {
    expect(phoneInternational).toBe("+55 800 703 8260");
  });
});

describe("metadados para o Google", () => {
  it("tem título de até 60 caracteres, para não ser cortado nos resultados", () => {
    expect(site.title.length).toBeLessThanOrEqual(60);
  });

  it("começa o título pela palavra-chave principal e cita a cidade", () => {
    expect(site.title).toMatch(/^Autopeças para Linha Pesada/);
    expect(site.title).toContain("Feira de Santana");
  });

  it("tem descrição entre 120 e 160 caracteres", () => {
    expect(site.description.length).toBeGreaterThanOrEqual(120);
    expect(site.description.length).toBeLessThanOrEqual(160);
  });
});

describe("endereço", () => {
  it("monta o endereço completo idêntico ao Perfil da Empresa no Google", () => {
    expect(fullAddress).toBe("Rua Venceslau Guimarães, 31 - Sim, Feira de Santana - BA, CEP 44085-520");
  });

  it("aponta o Google Maps para o nome da empresa e o endereço", () => {
    const query = new URL(site.mapsUrl).searchParams.get("query");

    expect(query).toBe("Falcão Distribuidora, R. Venceslau Guimarães, 31 - Sim, Feira de Santana - BA, 44085-520");
  });
});
