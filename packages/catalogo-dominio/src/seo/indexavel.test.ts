import { describe, expect, it } from "vitest";
import { avaliarIndexacao } from "./indexavel";

const completo = {
  situacao: "PUBLICADO" as const,
  revisarNome: false,
  temFoto: true,
  temReferencia: true,
  aplicacao: "- Scania 124",
  especificacoes: "",
  textosRepetidos: false,
};

describe("avaliarIndexacao (002 CA6.10, 003 CA4.10)", () => {
  it("indexa produto publicado, com nome confirmado e pelo menos 2 sinais", () => {
    expect(avaliarIndexacao(completo)).toEqual({ indexavel: true, motivos: [] });
  });

  it("explica em texto claro o que falta quando há só 1 sinal", () => {
    expect(avaliarIndexacao({ ...completo, temReferencia: false, aplicacao: "" })).toEqual({
      indexavel: false,
      motivos: ["Precisa de mais 1 destes: foto, referência, aplicação ou especificações"],
    });
  });

  it("pede 2 quando não há nenhum sinal (texto só com espaços não conta)", () => {
    const resultado = avaliarIndexacao({ ...completo, temFoto: false, temReferencia: false, aplicacao: "  " });

    expect(resultado.motivos).toEqual(["Precisa de mais 2 destes: foto, referência, aplicação ou especificações"]);
  });

  it("não indexa com nome a confirmar", () => {
    expect(avaliarIndexacao({ ...completo, revisarNome: true }).motivos).toEqual(["Nome a confirmar"]);
  });

  it("não indexa rascunho nem desativado", () => {
    expect(avaliarIndexacao({ ...completo, situacao: "RASCUNHO" }).motivos).toEqual(["Ainda não publicado"]);
    expect(avaliarIndexacao({ ...completo, situacao: "INATIVO" }).motivos).toEqual(["Desativado"]);
  });

  it("não indexa quando título ou descrição repetem os de outro produto", () => {
    expect(avaliarIndexacao({ ...completo, textosRepetidos: true }).motivos).toEqual([
      "Título ou descrição iguais aos de outro produto",
    ]);
  });

  it("lista todos os motivos juntos, na ordem em que a pessoa resolve", () => {
    const resultado = avaliarIndexacao({
      ...completo,
      situacao: "RASCUNHO",
      revisarNome: true,
      temFoto: false,
      temReferencia: false,
    });

    expect(resultado.motivos).toEqual([
      "Ainda não publicado",
      "Nome a confirmar",
      "Precisa de mais 1 destes: foto, referência, aplicação ou especificações",
    ]);
  });
});
