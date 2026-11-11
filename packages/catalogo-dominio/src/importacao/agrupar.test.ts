import { describe, expect, it } from "vitest";
import type { CardExtraido } from "./entrada";
import { agrupar } from "./agrupar";

/** Card mínimo: só o que cada teste precisa difere do padrão. */
function card(pagina: number, secao: string, codigos: string[], nome = "PECA"): CardExtraido {
  return {
    nome,
    secao,
    marcas: [],
    aplicacoes: [],
    detalhes: "",
    destaque: "",
    pagina_pdf: pagina,
    foto: "",
    revisar: "",
    texto_completo: nome,
    logos: [],
    variantes: codigos.map((codigo) => ({
      codigo,
      descricao: `${nome} ${codigo}`,
      nome_completo: `${nome} ${codigo}`,
      referencias: [],
      destaque: "",
      detalhes: "",
      valor_parenteses: "",
      revisar: "",
    })),
  };
}

describe("agrupar (002 CA1.2, CA6.7)", () => {
  it("card com várias medidas vira um produto com uma variação por código", () => {
    const [produto] = agrupar([card(4, "IMPORTADOS", ["EX-0101", "EX-0102", "EX-0103"])]);

    expect(produto?.variantes.map((v) => v.codigo)).toEqual(["EX-0101", "EX-0102", "EX-0103"]);
  });

  it("cards separados continuam produtos separados", () => {
    const produtos = agrupar([card(4, "FILTROS", ["EX-0001"]), card(4, "FILTROS", ["EX-0002"])]);

    expect(produtos).toHaveLength(2);
  });

  it("cards com o mesmo código viram um produto, em todas as seções em que aparecem", () => {
    const produtos = agrupar([
      card(5, "IMPORTADOS", ["EX-0201"]),
      card(12, "CUICAS, CATRACAS E ACESSÓRIOS", ["EX-0201"]),
    ]);

    expect(produtos).toHaveLength(1);
    expect(produtos[0]?.secoes).toEqual(["IMPORTADOS", "CUICAS, CATRACAS E ACESSÓRIOS"]);
    expect(produtos[0]?.variantes.map((v) => v.codigo)).toEqual(["EX-0201"]);
  });

  it("junta em cadeia: A divide código com B, e B com C", () => {
    const produtos = agrupar([
      card(1, "S1", ["EX-0001", "EX-0002"]),
      card(2, "S2", ["EX-0002", "EX-0003"]),
      card(3, "S3", ["EX-0003"]),
    ]);

    expect(produtos).toHaveLength(1);
    expect(produtos[0]?.variantes.map((v) => v.codigo)).toEqual(["EX-0001", "EX-0002", "EX-0003"]);
  });

  it("guarda a origem de cada card: página e ordem dentro da página (CA1.1)", () => {
    const produtos = agrupar([card(4, "S", ["EX-0001"]), card(4, "S", ["EX-0002"]), card(5, "S", ["EX-0001"])]);

    expect(produtos[0]?.origens.map((o) => [o.pagina, o.ordem])).toEqual([
      [4, 1],
      [5, 1],
    ]);
    expect(produtos[1]?.origens.map((o) => [o.pagina, o.ordem])).toEqual([[4, 2]]);
  });

  it("mantém a ordem do PDF: produto na posição do seu primeiro card (CA1.8)", () => {
    const produtos = agrupar([
      card(1, "S", ["EX-0003"], "A"),
      card(2, "S", ["EX-0001"], "B"),
      card(3, "S", ["EX-0003"], "A"),
    ]);

    expect(produtos.map((p) => p.cards[0]?.nome)).toEqual(["A", "B"]);
  });

  it("usa o menor código interno do grupo como chave estável", () => {
    const [produto] = agrupar([card(1, "S", ["EX-0900", "EX-0120", "EX-0500"])]);

    expect(produto?.chave).toBe("EX-0120");
  });
});
