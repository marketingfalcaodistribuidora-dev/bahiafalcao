import { describe, expect, it } from "vitest";
import { normalizarCodigo } from "./normalizar";

describe("normalizarCodigo (002 CA3.2)", () => {
  it("ignora pontuação, espaços e caixa", () => {
    expect(normalizarCodigo("SC-03.158")).toBe("SC03158");
    expect(normalizarCodigo("sc 03 158")).toBe("SC03158");
    expect(normalizarCodigo("SC03158")).toBe("SC03158");
  });

  it("ignora acentos e barras", () => {
    expect(normalizarCodigo("Ç-12/ã")).toBe("C12A");
  });
});
