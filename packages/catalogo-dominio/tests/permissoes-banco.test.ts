// Garantia estrutural do sigilo (spec 002 CA4.2, R2; spec 003 CA12.9; plano 003 §3):
// o papel público só lê as tabelas públicas. Um "include" esquecido no código público
// vira erro de permissão, e não vazamento.
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conexaoDona, conexaoPublica } from "./apoio/banco";

const TABELAS_PUBLICAS = [
  "Categoria",
  "Grupo",
  "Imagem",
  "Marca",
  "Produto",
  "ProdutoCategoria",
  "ProdutoMarca",
  "Referencia",
  "SlugAntigo",
  "Variacao",
];

const TABELAS_INTERNAS = [
  "Alteracao",
  "CardOrigem",
  "ChaveApi",
  "Orcamento",
  "OrcamentoItem",
  "Pendencia",
  "Perfil",
  "ProdutoInterno",
  "RegistroAcesso",
  "RegistroConsulta",
  "Sessao",
  "TentativaLogin",
  "Usuario",
  "VariacaoInterna",
  "_prisma_migrations",
];

let publico: pg.Client;
let dono: pg.Client;

beforeAll(async () => {
  publico = await conexaoPublica();
  dono = await conexaoDona();
});

afterAll(async () => {
  await publico.end();
  await dono.end();
});

async function publicoConsegueLer(tabela: string): Promise<boolean> {
  try {
    await publico.query(`SELECT 1 FROM "${tabela}" LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

describe("papel público (catalogo_publico)", () => {
  it("toda tabela do banco está classificada como pública ou interna", async () => {
    const { rows } = await dono.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );

    expect(rows.map((r) => r.tablename).sort()).toEqual([...TABELAS_PUBLICAS, ...TABELAS_INTERNAS].sort());
  });

  it.each(TABELAS_PUBLICAS)("lê a tabela pública %s", async (tabela) => {
    expect(await publicoConsegueLer(tabela)).toBe(true);
  });

  it.each(TABELAS_INTERNAS)("NÃO lê a tabela interna %s", async (tabela) => {
    expect(await publicoConsegueLer(tabela)).toBe(false);
  });

  it("não grava nem nas tabelas públicas", async () => {
    await expect(publico.query(`INSERT INTO "Marca" (nome, slug) VALUES ('X', 'x')`)).rejects.toThrow(
      /permission denied|permissão negada/,
    );
  });

  it("não enxerga, por padrão, uma tabela criada depois", async () => {
    await dono.query(`CREATE TABLE "TabelaNovaDeTeste" (id int)`);
    try {
      expect(await publicoConsegueLer("TabelaNovaDeTeste")).toBe(false);
    } finally {
      await dono.query(`DROP TABLE "TabelaNovaDeTeste"`);
    }
  });
});
