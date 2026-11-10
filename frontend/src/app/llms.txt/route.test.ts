import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/llms.txt", () => {
  it("responde em texto puro para buscadores de IA", async () => {
    const response = GET();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("apresenta a empresa por todos os nomes e com os dados de contato", async () => {
    const text = await GET().text();

    expect(text).toMatch(/^# Bahia Falcão Distribuidora/);
    expect(text).toContain("Também conhecida como: Falcão Distribuidora, Bahia Falcão, Falcão Distribuidora Bahia");
    expect(text).toContain("Rua Venceslau Guimarães, 31 - Sim, Feira de Santana - BA, CEP 44085-520");
    expect(text).toContain("0800 703 8260");
    expect(text).toContain("https://wa.me/557536228260");
    expect(text).toContain("Seg. a sex., 8h às 12h e 14h às 18h · Sáb., 8h às 12h");
    expect(text).toContain("Área atendida: toda a Bahia (sede em Feira de Santana)");
  });
});
