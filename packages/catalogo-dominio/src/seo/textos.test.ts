import { describe, expect, it } from "vitest";
import { gerarTextosSeo } from "./textos";

const LOCAL = "Feira de Santana – BA";

describe("gerarTextosSeo (002 CA6.2)", () => {
  it("monta o título com nome e marca quando cabe em 37 caracteres", () => {
    const { titulo } = gerarTextosSeo({
      nome: "Catraca de freio",
      marca: "Master",
      referencias: [],
      aplicacao: "",
      categoria: "Freios",
      local: LOCAL,
    });

    expect(titulo).toBe("Catraca de freio Master");
  });

  it("corta o título em fim de palavra quando passa de 37 caracteres", () => {
    const { titulo } = gerarTextosSeo({
      nome: "Jogo de reparo da válvula pneumática do freio",
      marca: "Wabco",
      referencias: [],
      aplicacao: "",
      categoria: "Freios",
      local: LOCAL,
    });

    expect(titulo).toBe("Jogo de reparo da válvula pneumática");
  });

  it("descreve com marca, referências, aplicação, linha pesada e a cidade", () => {
    const { descricao } = gerarTextosSeo({
      nome: "Anel elástico externo",
      marca: "Silc",
      referencias: ["SC-03.158", "4100-20"],
      aplicacao: "- Scania 124\n- Volvo FH",
      categoria: "Anéis",
      local: LOCAL,
    });

    expect(descricao).toBe(
      "Anel elástico externo Silc. Ref. SC-03.158, 4100-20. Aplicação: Scania 124, Volvo FH. Linha pesada em Feira de Santana – BA.",
    );
  });

  it("sem referência, usa a categoria e a aplicação", () => {
    const { descricao } = gerarTextosSeo({
      nome: "Lona de freio",
      marca: null,
      referencias: [],
      aplicacao: "Mercedes-Benz 1113",
      categoria: "Freios",
      local: LOCAL,
    });

    expect(descricao).toBe(
      "Lona de freio, categoria Freios. Aplicação: Mercedes-Benz 1113. Linha pesada em Feira de Santana – BA.",
    );
  });

  it("encurta a aplicação longa para caber em 155, mantendo a cidade no fim", () => {
    const { descricao } = gerarTextosSeo({
      nome: "Parafuso de roda",
      marca: null,
      referencias: [],
      aplicacao:
        "- Scania 112, 113, 124, 143, 164, R420, R440, R480, R500, P310, P340, P360, G380, G420, G440, G470, G480",
      categoria: "Parafusos",
      local: LOCAL,
    });

    expect(descricao.length).toBeLessThanOrEqual(155);
    expect(descricao).toMatch(/^Parafuso de roda, categoria Parafusos\. Aplicação: Scania 112, 113, .+…\. /);
    expect(descricao.endsWith(" Linha pesada em Feira de Santana – BA.")).toBe(true);
  });
});
