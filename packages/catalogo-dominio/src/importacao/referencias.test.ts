import { describe, expect, it } from "vitest";
import { extrairReferencias } from "./referencias";

const MARCAS_DE_CONVERSAO = ["FRUM", "BATISTA", "TECFIL"];

describe("extrairReferencias (002 R7, CA1.3)", () => {
  it("lê código original com os rótulos usados no catálogo", () => {
    for (const detalhes of [
      "CÓD. ORIG: 2R0 201 100",
      "COD. ORIG:2R0 201 100",
      "REF ORIG: 2R0 201 100",
      "ORIGINAL: 2R0 201 100",
    ]) {
      expect(extrairReferencias(detalhes, [], "", MARCAS_DE_CONVERSAO).referencias).toEqual([
        { codigo: "2R0 201 100", tipo: "ORIGINAL", marca: null },
      ]);
    }
  });

  it("lê código SILC com rótulo ou solto no texto", () => {
    expect(extrairReferencias("Código Silc: SC-01.151", [], "", MARCAS_DE_CONVERSAO).referencias).toEqual([
      { codigo: "SC-01.151", tipo: "SIMILAR", marca: "Silc" },
    ]);
    expect(extrairReferencias("SUPORTE TRUCK CENTRAL LE SC-03.158", [], "", MARCAS_DE_CONVERSAO)).toEqual({
      referencias: [{ codigo: "SC-03.158", tipo: "SIMILAR", marca: "Silc" }],
      restante: "SUPORTE TRUCK CENTRAL LE",
    });
  });

  it("lê 'REF MARCA: código' como equivalente daquela marca", () => {
    expect(extrairReferencias("REF TECFIL: ARL 6070", [], "", MARCAS_DE_CONVERSAO).referencias).toEqual([
      { codigo: "ARL 6070", tipo: "EQUIVALENTE", marca: "TECFIL" },
    ]);
  });

  it("lê a tabela de conversão (marca: código) e descarta rótulos vazios", () => {
    expect(
      extrairReferencias("CUBO: LONA: FRUM: 3588 BATISTA: 4313/6015 ORIG: 2SO-405-615A", [], "", MARCAS_DE_CONVERSAO),
    ).toEqual({
      referencias: [
        { codigo: "2SO-405-615A", tipo: "ORIGINAL", marca: null },
        { codigo: "3588", tipo: "EQUIVALENTE", marca: "FRUM" },
        { codigo: "4313/6015", tipo: "EQUIVALENTE", marca: "BATISTA" },
      ],
      restante: "",
    });
  });

  it("lê 'REF. SILC código' como similar Silc, sem deixar sobra", () => {
    expect(extrairReferencias("REF. SILC SC-03.158", [], "", MARCAS_DE_CONVERSAO)).toEqual({
      referencias: [{ codigo: "SC-03.158", tipo: "SIMILAR", marca: "Silc" }],
      restante: "",
    });
  });

  it("não emenda ao código um número solto de um dígito que vem depois", () => {
    expect(extrairReferencias("REF ORIG: 1234 2 PECAS", [], "", MARCAS_DE_CONVERSAO)).toEqual({
      referencias: [{ codigo: "1234", tipo: "ORIGINAL", marca: null }],
      restante: "2 PECAS",
    });
  });

  it("devolve o que não é referência como restante", () => {
    expect(extrairReferencias("REF ORIG: 1-428-337. OBS: acompanha reparo", [], "", MARCAS_DE_CONVERSAO)).toEqual({
      referencias: [{ codigo: "1-428-337", tipo: "ORIGINAL", marca: null }],
      restante: "OBS: acompanha reparo",
    });
  });

  it("inclui as referências já separadas pela extração, como original quando o texto do card diz 'REF ORIG'", () => {
    const { referencias } = extrairReferencias(
      "",
      ["A958.325.1701", "C 30 1500"],
      "SUPORTE REF ORIG: A958.325.1701 C 30 1500",
      MARCAS_DE_CONVERSAO,
    );

    expect(referencias).toEqual([
      { codigo: "A958.325.1701", tipo: "ORIGINAL", marca: null },
      { codigo: "C 30 1500", tipo: "EQUIVALENTE", marca: null },
    ]);
  });

  it("não repete a mesma referência escrita de formas diferentes", () => {
    const { referencias } = extrairReferencias("REF ORIG: 1-428-337", ["1428337"], "", MARCAS_DE_CONVERSAO);

    expect(referencias).toEqual([{ codigo: "1-428-337", tipo: "ORIGINAL", marca: null }]);
  });
});
