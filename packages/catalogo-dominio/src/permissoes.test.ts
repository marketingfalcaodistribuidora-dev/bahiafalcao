import { describe, expect, it } from "vitest";
import { exigirPermissao, pode, SemPermissao, SemSessao, TODAS_AS_PERMISSOES } from "./permissoes";

const administrador = { administrador: true, permissoes: [] };
const comercial = { administrador: false, permissoes: ["consulta_rapida", "orcamentos"] as const };

describe("pode", () => {
  it("dá ao perfil Administrador todas as permissões, mesmo com a lista vazia (CA12.6)", () => {
    expect(TODAS_AS_PERMISSOES.every((p) => pode(administrador, p))).toBe(true);
  });

  it("dá a um perfil comum só as permissões marcadas", () => {
    expect(pode(comercial, "orcamentos")).toBe(true);
    expect(pode(comercial, "consulta_rapida")).toBe(true);
    expect(pode(comercial, "editar_produtos")).toBe(false);
    expect(pode(comercial, "ver_codigo_interno")).toBe(false);
  });

  it("conhece as 14 permissões do plano", () => {
    expect(TODAS_AS_PERMISSOES).toHaveLength(14);
  });
});

describe("exigirPermissao", () => {
  const ana = { id: 7, nome: "Ana", perfil: comercial };

  it("recusa quem não tem sessão", () => {
    expect(() => exigirPermissao(null, "orcamentos")).toThrow(SemSessao);
  });

  it("recusa quem não tem a permissão (CA1.5)", () => {
    expect(() => exigirPermissao(ana, "editar_produtos")).toThrow(SemPermissao);
  });

  it("devolve o usuário quando ele tem a permissão", () => {
    expect(exigirPermissao(ana, "orcamentos")).toBe(ana);
  });
});
