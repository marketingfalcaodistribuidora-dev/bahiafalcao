import { describe, expect, it } from "vitest";
import { serializarProdutoPainel, serializarProdutoPublico } from "./produto";

// Produto como vem do banco, com dados internos e campos de controle.
function produtoDoBanco() {
  return {
    id: 10,
    chaveImportacao: "EX-0001",
    slug: "anel-elastico-externo",
    nome: "Anel elástico externo",
    nomeCatalogo: "ANEL ELAST EXT",
    aplicacao: "- Scania 124",
    especificacoes: "- **Diâmetro:** 20 mm",
    observacoes: "",
    embalagem: "Caixa com 10",
    situacao: "PUBLICADO" as const,
    novo: false,
    revisarNome: false,
    editadoManualmente: true,
    versao: 3,
    atualizadoEm: new Date("2026-11-11T12:00:00Z"),
    campoNovoQueNinguemRevisou: "segredo",
    interno: { localizacao: "Corredor 3, prateleira B" },
    variacoes: [
      {
        id: 1,
        descricao: "20 mm",
        ordem: 0,
        excluidaEm: null,
        interno: { codigoInterno: "EX-0001", imposto: { toString: () => "9.99" } },
      },
      {
        id: 2,
        descricao: "22 mm",
        ordem: 1,
        excluidaEm: new Date("2026-11-10T00:00:00Z"),
        interno: { codigoInterno: "EX-0002", imposto: null },
      },
    ],
    referencias: [
      {
        id: 5,
        variacaoId: 1,
        tipo: "SIMILAR" as const,
        codigo: "SC-03.158",
        publicada: true,
        marca: { nome: "SILC", slug: "silc" },
      },
      { id: 6, variacaoId: null, tipo: "EQUIVALENTE" as const, codigo: "EX-0001", publicada: false, marca: null },
    ],
    pendencias: [{ id: 1, trecho: "texto solto EX-0001" }],
    cardsOrigem: [{ id: 1, pagina: 12, textoOriginal: "ANEL ELAST EXT EX-0001 IMP (9,99)" }],
  };
}

const semNada = { administrador: false, permissoes: ["ver_produtos"] as const };
const comTudo = {
  administrador: false,
  permissoes: ["ver_produtos", "ver_codigo_interno", "ver_imposto", "ver_localizacao"] as const,
};

describe("serializarProdutoPainel (CA12.9)", () => {
  it("sem as permissões, não traz código interno, imposto nem localização: os campos nem existem", () => {
    const produto = serializarProdutoPainel(produtoDoBanco(), semNada);

    expect(produto).not.toHaveProperty("localizacao");
    expect(produto.variacoes[0]).not.toHaveProperty("codigoInterno");
    expect(produto.variacoes[0]).not.toHaveProperty("imposto");
    expect(JSON.stringify(produto)).not.toContain("EX-0001");
    expect(JSON.stringify(produto)).not.toContain("9.99");
    expect(JSON.stringify(produto)).not.toContain("Corredor 3");
  });

  it("com as permissões, traz código interno, imposto e localização", () => {
    const produto = serializarProdutoPainel(produtoDoBanco(), comTudo);

    expect(produto.localizacao).toBe("Corredor 3, prateleira B");
    expect(produto.variacoes[0]).toMatchObject({ codigoInterno: "EX-0001", imposto: "9.99" });
  });

  it("cada permissão libera só o seu campo", () => {
    const produto = serializarProdutoPainel(produtoDoBanco(), {
      administrador: false,
      permissoes: ["ver_codigo_interno"],
    });

    expect(produto.variacoes[0]).toHaveProperty("codigoInterno", "EX-0001");
    expect(produto.variacoes[0]).not.toHaveProperty("imposto");
    expect(produto).not.toHaveProperty("localizacao");
  });

  it("não deixa passar campo que não está na lista de permitidos", () => {
    const produto = serializarProdutoPainel(produtoDoBanco(), comTudo);

    expect(JSON.stringify(produto)).not.toContain("campoNovoQueNinguemRevisou");
    expect(JSON.stringify(produto)).not.toContain("segredo");
  });

  it("mostra a referência em alerta (igual a código interno) só a quem pode ver código interno", () => {
    const comCodigo = serializarProdutoPainel(produtoDoBanco(), comTudo);
    const semCodigo = serializarProdutoPainel(produtoDoBanco(), semNada);

    expect(comCodigo.referencias.map((r) => r.codigo)).toEqual(["SC-03.158", "EX-0001"]);
    expect(semCodigo.referencias.map((r) => r.codigo)).toEqual(["SC-03.158"]);
  });

  it("não mostra referência de variação removida, nem no painel nem no site", () => {
    const comReferenciaDaRemovida = {
      ...produtoDoBanco(),
      referencias: [
        ...produtoDoBanco().referencias,
        { id: 7, variacaoId: 2, tipo: "ORIGINAL" as const, codigo: "XYZ-999", publicada: true, marca: null },
      ],
    };

    expect(JSON.stringify(serializarProdutoPainel(comReferenciaDaRemovida, comTudo))).not.toContain("XYZ-999");
    expect(JSON.stringify(serializarProdutoPublico(comReferenciaDaRemovida))).not.toContain("XYZ-999");
  });

  it("não mostra variações removidas", () => {
    const produto = serializarProdutoPainel(produtoDoBanco(), comTudo);

    expect(produto.variacoes.map((v) => v.descricao)).toEqual(["20 mm"]);
  });
});

describe("serializarProdutoPublico (002 CA4.2)", () => {
  it("nunca traz código interno, imposto, localização, pendências, origem do card ou controle", () => {
    const texto = JSON.stringify(serializarProdutoPublico(produtoDoBanco()));

    for (const proibido of [
      "EX-0001",
      "EX-0002",
      "9.99",
      "9,99",
      "Corredor 3",
      "texto solto",
      "ANEL ELAST EXT",
      "chaveImportacao",
      "editadoManualmente",
      "versao",
      "segredo",
    ]) {
      expect(texto).not.toContain(proibido);
    }
  });

  it("traz o que o site mostra: nome, textos, variações ativas e referências publicadas com a marca", () => {
    const produto = serializarProdutoPublico(produtoDoBanco());

    expect(produto).toEqual({
      slug: "anel-elastico-externo",
      nome: "Anel elástico externo",
      aplicacao: "- Scania 124",
      especificacoes: "- **Diâmetro:** 20 mm",
      observacoes: "",
      embalagem: "Caixa com 10",
      novo: false,
      variacoes: [{ id: 1, descricao: "20 mm" }],
      referencias: [{ variacaoId: 1, tipo: "SIMILAR", codigo: "SC-03.158", marca: { nome: "SILC", slug: "silc" } }],
    });
  });
});
