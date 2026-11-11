import { describe, expect, it } from "vitest";
import { nomePorExtenso, type DicionarioNomes } from "./nome";

const dicionario: DicionarioNomes = {
  abreviacoes: {
    EST: "estrias",
    DIANT: ["dianteiro", "dianteira"],
    TRAS: ["traseiro", "traseira"],
    LE: "lado esquerdo",
    "P/": "para",
    MB: "Mercedes-Benz",
  },
  acentos: { AUTOMATICA: "automática", VALVULA: "válvula", CUICA: "cuíca" },
  preservar: ["Ford", "Cargo", "Wabco"],
  masculinosEmA: ["sistema"],
};

describe("nomePorExtenso (002 R3)", () => {
  it("expande abreviações, acentua e usa só a primeira letra maiúscula", () => {
    expect(nomePorExtenso("CATRACA AUTOMATICA 28 EST DIANT LE", dicionario)).toBe(
      "Catraca automática 28 estrias dianteira lado esquerdo",
    );
  });

  it("concorda o adjetivo com o primeiro substantivo (masculino)", () => {
    expect(nomePorExtenso("SUPORTE MOLA TRAS", dicionario)).toBe("Suporte mola traseiro");
  });

  it("trata palavras masculinas terminadas em 'a'", () => {
    expect(nomePorExtenso("SISTEMA DIANT", dicionario)).toBe("Sistema dianteiro");
  });

  it("mantém marcas e modelos com a grafia certa, inclusive separados por barra", () => {
    expect(nomePorExtenso("TAMBOR FREIO DIANT FORD/CARGO 1422", dicionario)).toBe(
      "Tambor freio dianteiro Ford/Cargo 1422",
    );
  });

  it("expande abreviações coladas com barra, como P/", () => {
    expect(nomePorExtenso("SUPORTE MB P/DIANT", dicionario)).toBe("Suporte Mercedes-Benz para dianteiro");
  });

  it("mantém medidas e códigos como estão, e usa 'x' minúsculo entre medidas", () => {
    expect(nomePorExtenso("HASTE LONGA CUICA 30 X 30 M22", dicionario)).toBe("Haste longa cuíca 30 x 30 M22");
  });

  it("acentua a primeira palavra mantendo a maiúscula", () => {
    expect(nomePorExtenso("VALVULA PEDAL", dicionario)).toBe("Válvula pedal");
  });
});
