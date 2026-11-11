import { describe, expect, it } from "vitest";
import { gerarSlug } from "./slug";

const livre = () => false;

describe("gerarSlug (002 CA6.1)", () => {
  it("gera endereço em minúsculas, sem acentos, com hífens", () => {
    expect(gerarSlug("Anel Elástico Externo 20 mm", [], livre)).toBe("anel-elastico-externo-20-mm");
  });

  it("corta em até 70 caracteres, no fim de uma palavra", () => {
    const slug = gerarSlug(
      "Jogo de reparo completo da válvula pneumática do freio de estacionamento traseiro reforçado",
      [],
      livre,
    );

    expect(slug).toBe("jogo-de-reparo-completo-da-valvula-pneumatica-do-freio-de");
    expect(slug.length).toBeLessThanOrEqual(70);
  });

  it("em colisão, acrescenta os sufixos na ordem dada (marca, medida, referência)", () => {
    const ocupados = new Set(["catraca-de-freio", "catraca-de-freio-master"]);

    expect(gerarSlug("Catraca de freio", ["Master", "Lado direito", "SC03158"], (s) => ocupados.has(s))).toBe(
      "catraca-de-freio-master-lado-direito",
    );
  });

  it("nunca usa número sequencial: no último caso, um sufixo curto e determinístico", () => {
    const ocupados = new Set(["catraca", "catraca-master"]);
    const primeira = gerarSlug("Catraca", ["Master"], (s) => ocupados.has(s));
    const segunda = gerarSlug("Catraca", ["Master"], (s) => ocupados.has(s));

    expect(primeira).toMatch(/^catraca-master-[a-z0-9]{6}$/);
    expect(primeira).toBe(segunda);
  });

  it("ignora sufixos vazios", () => {
    const ocupados = new Set(["filtro"]);

    expect(gerarSlug("Filtro", ["", "  ", "Mann"], (s) => ocupados.has(s))).toBe("filtro-mann");
  });

  it("nunca passa de 70 nem começa ou termina com hífen, mesmo com sufixos longos", () => {
    const sempreOcupadoSemHash = (s: string) => !/-[0-9a-f]{6}$/.test(s);
    const slug = gerarSlug(
      "Cubo de roda traseiro",
      ["Mercedes-Benz", "22 x 150 pf flange aço 10.9 Mercedes-Benz 1,5 torque macho completo reforçado", "2SO405615A"],
      sempreOcupadoSemHash,
    );

    expect(slug.length).toBeLessThanOrEqual(70);
    expect(slug).toMatch(/^cubo-/);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("sem nome, usa o primeiro sufixo como base", () => {
    expect(gerarSlug("", ["Sistema de roda"], livre)).toBe("sistema-de-roda");
  });

  it("sem nome nem sufixo, usa 'produto' como base", () => {
    expect(gerarSlug("", [], livre)).toBe("produto");
  });
});
