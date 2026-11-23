// Banco da API com PostgreSQL real (spec 000, T007; plano §4): extensões e f_unaccent (CA6.3),
// dois pools com limites próprios, tradução de erros (CA2.5, CA1.5) e contagem de consultas (CA8.3).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarBanco, type Banco } from "../../../src/shared/banco.js";
import { ErroDeConflito, ErroIndisponivel } from "../../../src/shared/erros.js";
import { traduzirErroDoBanco } from "../../../src/shared/erros-do-banco.js";
import { criarBancoDoArquivo, type BancoDoArquivo } from "../../apoio/banco.js";
import { contarConsultas } from "../../apoio/contar-consultas.js";

let doArquivo: BancoDoArquivo;
let banco: Banco;
let cliente: pg.Client;

beforeAll(async () => {
  doArquivo = await criarBancoDoArquivo();
  banco = criarBanco({ url: doArquivo.url, conexoes: { publico: 2, administracao: 2 } });
  cliente = new pg.Client({ connectionString: doArquivo.url });
  await cliente.connect();
});

afterAll(async () => {
  await cliente.end();
  await banco.fechar();
  await doArquivo.apagar();
});

const valor = async (sql: string): Promise<unknown> => (await cliente.query<{ valor: unknown }>(sql)).rows[0]?.valor;

/** O erro que a promessa rejeitou, já traduzido para erro de domínio. */
async function erroTraduzido(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (erro) {
    return traduzirErroDoBanco(erro);
  }
  throw new Error("a operação deveria ter falhado");
}

describe("migration de extensões (CA6.3)", () => {
  it("f_unaccent tira os acentos", async () => {
    expect(await valor("SELECT public.f_unaccent('Ação Mecânica') AS valor")).toBe("Acao Mecanica");
  });

  it("f_unaccent é IMMUTABLE e funciona com o search_path mínimo (como no CREATE INDEX)", async () => {
    expect(await valor("SELECT provolatile::text AS valor FROM pg_proc WHERE proname = 'f_unaccent'")).toBe("i");

    await cliente.query("SET search_path = pg_catalog");
    expect(await valor("SELECT public.f_unaccent('Ação') AS valor")).toBe("Acao");
    await cliente.query("RESET search_path");
  });

  it("serve para um índice GIN trigram sem acentos", async () => {
    await cliente.query("CREATE TEMP TABLE pecas (nome text)");

    await expect(
      cliente.query("CREATE INDEX ON pecas USING gin (public.f_unaccent(lower(nome)) public.gin_trgm_ops)"),
    ).resolves.toBeDefined();
  });
});

describe("dois pools com limites próprios (plano §4)", () => {
  it("sem informar, o público tem até 10 conexões e a administração até 5", async () => {
    const padrao = criarBanco({ url: doArquivo.url });

    expect(padrao.pools.publico.options.max).toBe(10);
    expect(padrao.pools.administracao.options.max).toBe(5);
    await padrao.fechar();
  });

  it("o público corta consultas em 2 s e a administração em 5 s", async () => {
    const [publico] = await banco.publico.$queryRaw<{ statement_timeout: string }[]>`SHOW statement_timeout`;
    const [administracao] = await banco.administracao.$queryRaw<
      { statement_timeout: string }[]
    >`SHOW statement_timeout`;

    expect(publico?.statement_timeout).toBe("2s");
    expect(administracao?.statement_timeout).toBe("5s");
  });

  it("os dois usam o fuso UTC", async () => {
    const [linha] = await banco.publico.$queryRaw<{ TimeZone: string }[]>`SHOW TimeZone`;

    expect(linha?.TimeZone).toBe("UTC");
  });
});

describe("tradução dos erros do banco", () => {
  it("valor repetido numa restrição de unicidade vira ErroDeConflito (CA2.5)", async () => {
    await cliente.query("CREATE TABLE contatos (email text UNIQUE)");
    await banco.administracao.$executeRaw`INSERT INTO contatos (email) VALUES ('ana@exemplo.com')`;

    const erro = await erroTraduzido(
      banco.administracao.$executeRaw`INSERT INTO contatos (email) VALUES ('ana@exemplo.com')`,
    );

    expect(erro).toBeInstanceOf(ErroDeConflito);
  });

  it("pool sem conexão livre por 2 s vira ErroIndisponivel, sem esperar além disso (CA1.5)", async () => {
    const pequeno = criarBanco({ url: doArquivo.url, conexoes: { publico: 1, administracao: 1 } });
    const presa = await pequeno.pools.publico.connect();
    const inicio = performance.now();

    const erro = await erroTraduzido(pequeno.publico.$queryRaw`SELECT 1`);
    const segundos = (performance.now() - inicio) / 1000;

    presa.release();
    await pequeno.fechar();
    expect(erro).toBeInstanceOf(ErroIndisponivel);
    expect(segundos).toBeGreaterThanOrEqual(1.9);
    expect(segundos).toBeLessThan(4);
  });
});

describe("contagem de consultas (CA8.3)", () => {
  it("conta as consultas dos dois clientes", async () => {
    const contado = criarBanco({
      url: doArquivo.url,
      conexoes: { publico: 1, administracao: 1 },
      registrarConsultas: true,
    });
    const contador = contarConsultas(contado);

    await contado.publico.$queryRaw`SELECT 1`;
    await contado.administracao.$queryRaw`SELECT 2`;
    await contado.administracao.$queryRaw`SELECT 3`;

    expect(contador.total()).toBe(3);
    await contado.fechar();
  });

  it("zerar recomeça a contagem (para medir só a requisição do teste)", async () => {
    const contado = criarBanco({
      url: doArquivo.url,
      conexoes: { publico: 1, administracao: 1 },
      registrarConsultas: true,
    });
    const contador = contarConsultas(contado);
    await contado.publico.$queryRaw`SELECT 1`;

    contador.zerar();
    await contado.publico.$queryRaw`SELECT 2`;

    expect(contador.total()).toBe(1);
    await contado.fechar();
  });
});

describe("fechar", () => {
  it("encerra as conexões dos dois pools", async () => {
    const temporario = criarBanco({ url: doArquivo.url, conexoes: { publico: 1, administracao: 1 } });
    await temporario.publico.$queryRaw`SELECT 1`;

    await temporario.fechar();

    expect(temporario.pools.publico.totalCount).toBe(0);
    expect(temporario.pools.administracao.totalCount).toBe(0);
  });
});
