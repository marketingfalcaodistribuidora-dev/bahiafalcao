// Valores fictícios: o imposto real é dado interno e o repositório é público.
import { describe, expect, it } from "vitest";
import { extrairImposto } from "./importados";

describe("extrairImposto (002 CA4.5, R6)", () => {
  it("lê 'IMP (9,99)' como imposto 9.99 e tira a marca do texto", () => {
    expect(extrairImposto("TERMINAL ROSCADO 06 X 06 IMP (9,99)")).toEqual({
      texto: "TERMINAL ROSCADO 06 X 06",
      imposto: "9.99",
    });
  });

  it("completa os centavos: 'IMP (7,0)' vira 7.00 e 'IMP (8,8)' vira 8.80", () => {
    expect(extrairImposto("PECA IMP (7,0)").imposto).toBe("7.00");
    expect(extrairImposto("PECA IMP (8,8)").imposto).toBe("8.80");
  });

  it("número sem a palavra IMP é medida, não imposto", () => {
    expect(extrairImposto("ANEL RETENCAO 1,2")).toEqual({ texto: "ANEL RETENCAO 1,2", imposto: null });
  });

  it("aceita variações de espaço e caixa", () => {
    expect(extrairImposto("OLHAL imp(9,99)")).toEqual({ texto: "OLHAL", imposto: "9.99" });
  });

  it("lê o imposto mesmo quando o OCR perdeu os parênteses", () => {
    expect(extrairImposto("CATRACA 28 EST IMP 9,99")).toEqual({ texto: "CATRACA 28 EST", imposto: "9.99" });
    expect(extrairImposto("CINTA CUICA IMP. 7,7 30X30")).toEqual({ texto: "CINTA CUICA 30X30", imposto: "7.70" });
    expect(extrairImposto("PECA IMP 8")).toEqual({ texto: "PECA", imposto: "8.00" });
  });

  it("não confunde palavras que começam com IMP", () => {
    expect(extrairImposto("TAMPA IMPORTADA 30")).toEqual({ texto: "TAMPA IMPORTADA 30", imposto: null });
  });
});
