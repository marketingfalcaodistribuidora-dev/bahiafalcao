import { describe, expect, it } from "vitest";
import { removerCodigosInternos, verificarSigilo } from "./sigilo";

describe("verificarSigilo (002 CA4.2)", () => {
  it("acusa código interno em qualquer texto público, dizendo onde", () => {
    const violacoes = verificarSigilo(
      [
        { onde: "produto 3 · nome", texto: "Catraca de freio" },
        { onde: "produto 7 · observações", texto: "Substitui o EX-0301." },
      ],
      ["EX-0301", "EX-0101"],
    );

    expect(violacoes).toEqual(["produto 7 · observações: contém o código interno EX-0301"]);
  });

  it("acusa a marca de imposto 'IMP (x)' esquecida no texto", () => {
    expect(verificarSigilo([{ onde: "produto 1 · nome", texto: "Terminal IMP (9,99)" }], [])).toEqual([
      "produto 1 · nome: contém a marca de imposto IMP (…)",
    ]);
  });

  it("acusa a marca de imposto sem parênteses", () => {
    expect(verificarSigilo([{ onde: "produto 1 · nome", texto: "Catraca IMP 9,99" }], [])).toEqual([
      "produto 1 · nome: contém a marca de imposto IMP (…)",
    ]);
    expect(verificarSigilo([{ onde: "slug", texto: "catraca-imp-9-99" }], [])).toEqual([
      "slug: contém a marca de imposto IMP (…)",
    ]);
  });

  it("não confunde IMP seguido de medida com letra (ex.: '14T' = 14 toneladas) com imposto", () => {
    expect(verificarSigilo([{ onde: "nome", texto: "PE DE CARRETA IMP 14T DOLLY" }], [])).toEqual([]);
  });

  it("não confunde código interno com parte de um número maior", () => {
    expect(verificarSigilo([{ onde: "produto 2 · referência", texto: "9111000123" }], ["1110001"])).toEqual([]);
  });

  it("acusa código numérico grudado em letras, como o OCR deixa", () => {
    const codigos = ["1110001"];

    expect(verificarSigilo([{ onde: "a", texto: "IABV1110001" }], codigos)).toHaveLength(1);
    expect(verificarSigilo([{ onde: "b", texto: "22 1110001ANEL elástico" }], codigos)).toHaveLength(1);
    expect(verificarSigilo([{ onde: "c", texto: "1110001m-16-x-femea" }], codigos)).toHaveLength(1);
  });

  it("código numérico dentro de um número maior não conta", () => {
    expect(verificarSigilo([{ onde: "a", texto: "A91110001 11100012" }], ["1110001"])).toEqual([]);
  });

  it("passa quando não há nada interno", () => {
    expect(verificarSigilo([{ onde: "produto 1 · nome", texto: "Filtro de ar" }], ["EX-0001"])).toEqual([]);
  });
});

describe("removerCodigosInternos", () => {
  const codigos = new Set(["EX-0401", "EX-0402"]);

  it("tira o código interno e o rótulo vazio que sobra entre parênteses", () => {
    expect(removerCodigosInternos("RETENTOR SABO MB DIANT 01549BRA (ARCA - EX-0401)", codigos)).toEqual({
      texto: "RETENTOR SABO MB DIANT 01549BRA",
      removidos: ["EX-0401"],
    });
  });

  it("tira o código colado com hífen ou barra no fim", () => {
    expect(removerCodigosInternos("REPARO CATRACA LD/LE-EX-0402", codigos).texto).toBe("REPARO CATRACA LD/LE");
    expect(removerCodigosInternos("FOLE PNEUM SUSP JOST/( MESMA EX-0401)", codigos).texto).toBe("FOLE PNEUM SUSP JOST");
  });

  it("tira código numérico grudado em letras", () => {
    const numericos = new Set(["1110001"]);

    expect(removerCodigosInternos("22 1110001ANEL ELASTICO", numericos)).toEqual({
      texto: "22 ANEL ELASTICO",
      removidos: ["1110001"],
    });
    expect(removerCodigosInternos("IABV1110001", numericos).texto).toBe("IABV");
  });

  it("tira só o parêntese que contém o código, e mantém os outros", () => {
    expect(removerCodigosInternos("RETENTOR SABO (LADO ESQ) (ARCA - EX-0401)", codigos).texto).toBe(
      "RETENTOR SABO (LADO ESQ)",
    );
  });

  it("tira o código sozinho mas preserva o número maior que o contém", () => {
    expect(removerCodigosInternos("REF 21110001 SUBST 1110001", new Set(["1110001"])).texto).toBe("REF 21110001 SUBST");
  });

  it("não mexe em texto sem código interno, nem em parênteses com medida", () => {
    expect(removerCodigosInternos("OLHAL PF 10MM ESPIGAO 5/16 (07,7MM)", codigos)).toEqual({
      texto: "OLHAL PF 10MM ESPIGAO 5/16 (07,7MM)",
      removidos: [],
    });
  });
});
