// A fixture vai para o repositório PÚBLICO: só dados fictícios (plano 003, desvio T034).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const texto = readFileSync(new URL("./fixtures/catalogo/produtos.json", import.meta.url), "utf-8");

describe("fixture do catálogo", () => {
  it("não tem sequência de 6 ou mais dígitos, que poderia ser um código interno real", () => {
    expect(texto.match(/\d{6,}/g)).toBeNull();
  });

  it("usa só códigos internos fictícios (EX-…)", () => {
    const cartoes = JSON.parse(texto) as { variantes: { codigo: string }[] }[];
    const codigos = cartoes.flatMap((c) => c.variantes.map((v) => v.codigo));

    expect(codigos.every((c) => /^EX-\d{4}$/.test(c))).toBe(true);
  });
});

describe("fixture do catálogo: imposto", () => {
  it("usa só valores de imposto fictícios (9,99, 7,7 ou 8,8)", () => {
    const valores = [...texto.matchAll(/IMP\s*\(?\s*(\d+(?:,\d+)?)/g)].map((m) => m[1]);

    expect(valores.length).toBeGreaterThan(0);
    expect(valores.every((v) => ["9,99", "7,7", "8,8"].includes(v ?? ""))).toBe(true);
  });
});
