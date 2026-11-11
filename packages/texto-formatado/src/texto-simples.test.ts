import { describe, expect, it } from "vitest";
import { textoSimples } from "./texto-simples";

describe("textoSimples", () => {
  it("tira a marcação e junta as linhas com separadores legíveis", () => {
    expect(textoSimples("## Linha Scania\n- **Scania** 124\n- Scania 114")).toBe(
      "Linha Scania: Scania 124, Scania 114",
    );
  });

  it("junta parágrafos com ponto e espaço", () => {
    expect(textoSimples("Primeiro\n\nSegundo")).toBe("Primeiro. Segundo");
  });

  it("não duplica a pontuação que já existe", () => {
    expect(textoSimples("Primeiro.\n\nSegundo.")).toBe("Primeiro. Segundo.");
  });

  it("devolve vazio para texto vazio", () => {
    expect(textoSimples("  \n")).toBe("");
  });
});
