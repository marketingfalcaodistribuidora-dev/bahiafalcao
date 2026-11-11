import { describe, expect, it } from "vitest";
import { classificar } from "./classificar";

describe("classificar (002 CA1.3, CA1.4)", () => {
  it("põe o trecho 'Aplicação:' na aplicação, em lista", () => {
    const r = classificar({
      textos: ["Aplicação: Atego 1418, 1518."],
      destaque: "",
      tiposDeVeiculo: [],
      codigosInternos: [],
    });

    expect(r.aplicacao).toBe("- Atego 1418, 1518");
    expect(r.pendencias).toEqual([]);
  });

  it("põe medidas rotuladas nas especificações, com o rótulo em negrito", () => {
    const r = classificar({
      textos: ["DIMENSÃO: 18X27MM ALTURA: 40MM"],
      destaque: "",
      tiposDeVeiculo: [],
      codigosInternos: [],
    });

    expect(r.especificacoes).toBe("- **Dimensão:** 18X27MM\n- **Altura:** 40MM");
  });

  it("põe medida solta nas especificações", () => {
    const r = classificar({ textos: ["18X27MM"], destaque: "", tiposDeVeiculo: [], codigosInternos: [] });

    expect(r.especificacoes).toBe("- 18X27MM");
  });

  it("põe 'OBS:' nas observações", () => {
    const r = classificar({ textos: ["OBS: acompanha reparo"], destaque: "", tiposDeVeiculo: [], codigosInternos: [] });

    expect(r.observacoes).toBe("Acompanha reparo");
  });

  it("acrescenta tipos de veículo (carreta, ônibus) à aplicação", () => {
    const r = classificar({ textos: [], destaque: "", tiposDeVeiculo: ["Carreta / reboque"], codigosInternos: [] });

    expect(r.aplicacao).toBe("- Carreta / reboque");
  });

  it("transforma o que não reconhece em pendência, sem perder o texto", () => {
    const r = classificar({
      textos: ["SUPORTE TRUCK CENTRAL LE"],
      destaque: "USA-SE",
      tiposDeVeiculo: [],
      codigosInternos: [],
    });

    expect(r.pendencias).toEqual([
      { trecho: "SUPORTE TRUCK CENTRAL LE", tipo: "texto" },
      { trecho: "USA-SE", tipo: "destaque" },
    ]);
    expect(r.aplicacao).toBe("");
  });

  it("manda para pendência (interna) qualquer trecho com código interno, mesmo reconhecido", () => {
    const r = classificar({
      textos: ["OBS: substitui o EX-0301"],
      destaque: "",
      tiposDeVeiculo: [],
      codigosInternos: ["EX-0301"],
    });

    expect(r.observacoes).toBe("");
    expect(r.pendencias).toEqual([{ trecho: "OBS: substitui o EX-0301", tipo: "codigo-interno" }]);
  });

  it("não repete o mesmo texto vindo do card e da variação", () => {
    const r = classificar({
      textos: ["DIMENSÃO: 18X27MM", "DIMENSÃO: 18X27MM"],
      destaque: "",
      tiposDeVeiculo: [],
      codigosInternos: [],
    });

    expect(r.especificacoes).toBe("- **Dimensão:** 18X27MM");
  });
});
