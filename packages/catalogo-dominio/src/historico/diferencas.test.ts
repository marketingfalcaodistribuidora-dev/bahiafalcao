import { describe, expect, it } from "vitest";
import { diferencas } from "./diferencas";

describe("diferencas", () => {
  it("lista só os campos que mudaram, com antes e depois", () => {
    const campos = diferencas(
      { nome: "Catraca", novo: false, ordem: 1 },
      { nome: "Catraca de freio", novo: false, ordem: 2 },
    );

    expect(campos).toEqual({ nome: { antes: "Catraca", depois: "Catraca de freio" }, ordem: { antes: 1, depois: 2 } });
  });

  it("registra campo que passou a existir ou deixou de existir como nulo", () => {
    const campos = diferencas({ embalagem: null }, { embalagem: "Caixa com 10" });

    expect(campos).toEqual({ embalagem: { antes: null, depois: "Caixa com 10" } });
  });

  it("compara datas e decimais pelo valor, não pela referência", () => {
    const campos = diferencas(
      { publicadoEm: new Date("2026-11-11T10:00:00Z"), imposto: { toString: () => "6.50" } },
      { publicadoEm: new Date("2026-11-11T10:00:00Z"), imposto: { toString: () => "6.50" } },
    );

    expect(campos).toEqual({});
  });

  it("guarda datas e decimais como texto", () => {
    const campos = diferencas({ imposto: { toString: () => "5.00" } }, { imposto: { toString: () => "6.50" } });

    expect(campos).toEqual({ imposto: { antes: "5.00", depois: "6.50" } });
  });
});
