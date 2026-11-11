import { describe, expect, it } from "vitest";
import { lerCatalogoExtraido } from "./entrada";

const cartao = (texto: string) => ({
  nome: texto,
  pagina_pdf: "4",
  texto_completo: texto,
  variantes: [{ codigo: "EX-0001", descricao: texto }],
});

describe("lerCatalogoExtraido", () => {
  it("tira caracteres de controle que o OCR deixa (o banco recusa \u0000), mantendo quebras de linha", () => {
    const [card] = lerCatalogoExtraido([cartao("FILTRO\u0000 AR\u0007\nLINHA 2")]);

    expect(card?.nome).toBe("FILTRO AR\nLINHA 2");
    expect(card?.texto_completo).toBe("FILTRO AR\nLINHA 2");
    expect(card?.variantes[0]?.descricao).toBe("FILTRO AR\nLINHA 2");
  });

  it("completa campos ausentes com vazio e converte a página em número", () => {
    const [card] = lerCatalogoExtraido([cartao("FILTRO")]);

    expect(card).toMatchObject({ pagina_pdf: 4, marcas: [], aplicacoes: [], detalhes: "", foto: "" });
  });

  it("recusa card sem variação", () => {
    expect(() => lerCatalogoExtraido([{ nome: "X", pagina_pdf: 1, variantes: [] }])).toThrow();
  });
});
