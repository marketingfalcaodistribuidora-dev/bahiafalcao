// Apoio dos testes de integração (spec 000, T005; plano §7): um PostgreSQL real (Testcontainers),
// com um banco próprio para cada arquivo de teste, copiado de um banco-modelo já migrado.
// O banco é igual ao local (mesma imagem, locale e fuso) e um arquivo não enxerga o outro.
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conectarNoModelo, criarBancoDoArquivo, type BancoDoArquivo } from "../../apoio/banco.js";

let banco: BancoDoArquivo;
let cliente: pg.Client;

beforeAll(async () => {
  banco = await criarBancoDoArquivo();
  cliente = new pg.Client({ connectionString: banco.url });
  await cliente.connect();
});

afterAll(async () => {
  await cliente.end();
  await banco.apagar();
});

const valor = async (sql: string): Promise<unknown> => (await cliente.query<{ valor: unknown }>(sql)).rows[0]?.valor;

describe("banco de cada arquivo de teste", () => {
  it("é um banco só deste arquivo, criado a partir do modelo", async () => {
    expect(await valor("SELECT current_database() AS valor")).toMatch(/^t_[0-9a-f]+$/);
  });

  it("tem o mesmo locale do banco local (provedor builtin, C.UTF-8)", async () => {
    const locale = await valor(
      "SELECT datlocprovider::text || ' ' || datlocale AS valor FROM pg_database WHERE datname = current_database()",
    );

    expect(locale).toBe("b C.UTF-8");
    expect(await valor("SELECT lower('AÇÃO Ü') AS valor")).toBe("ação ü");
  });

  it("tem o mesmo fuso e as mesmas configurações do banco local", async () => {
    expect(await valor("SELECT current_setting('TimeZone') AS valor")).toBe("UTC");
    expect(await valor("SELECT current_setting('jit') AS valor")).toBe("off");
  });

  it("não enxerga o que outro banco de arquivo criou", async () => {
    const outro = await criarBancoDoArquivo();
    const clienteDoOutro = new pg.Client({ connectionString: outro.url });
    await clienteDoOutro.connect();
    await clienteDoOutro.query("CREATE TABLE so_do_outro (id int)");
    await clienteDoOutro.end();

    expect(await valor("SELECT to_regclass('so_do_outro')::text AS valor")).toBeNull();

    await outro.apagar();
  });

  it("o banco-modelo não aceita conexões (uma conexão esquecida travaria todas as cópias)", async () => {
    await expect(conectarNoModelo()).rejects.toThrow(/not currently accepting connections/);
  });
});
