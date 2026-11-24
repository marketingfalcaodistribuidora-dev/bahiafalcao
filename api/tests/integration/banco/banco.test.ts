// Banco da API com PostgreSQL real (spec 000, T007; plano §4): extensões e f_unaccent (CA6.3),
// dois pools com limites próprios, tradução de erros (CA2.5, CA1.5) e contagem de consultas (CA8.3).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarBanco, type Banco } from "../../../src/shared/banco.js";
import { ErroDeConflito, ErroIndisponivel } from "../../../src/shared/erros.js";
import { codigoDoPostgres, traduzirErroDoBanco } from "../../../src/shared/erros-do-banco.js";
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

interface Linha {
  idle_in_transaction_session_timeout: string;
}

const valor = async (sql: string): Promise<unknown> => (await cliente.query<{ valor: unknown }>(sql)).rows[0]?.valor;

const PRAZO_PARA_A_CONSULTA_APARECER_MS = 3_000;

/** Espera a consulta aparecer como ativa no banco (sem sleep: pergunta até ela aparecer). */
async function esperarConsultaNoBanco(sql: string): Promise<void> {
  const inicio = performance.now();
  while (performance.now() - inicio < PRAZO_PARA_A_CONSULTA_APARECER_MS) {
    const { rowCount } = await cliente.query("SELECT 1 FROM pg_stat_activity WHERE query = $1 AND state = 'active'", [
      sql,
    ]);
    if (rowCount) return;
    await new Promise((pronto) => setTimeout(pronto, 10));
  }
  throw new Error(`a consulta "${sql}" não apareceu no pg_stat_activity em 3 s`);
}

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

  it("os dois encerram a sessão parada no meio de uma transação há 10 s", async () => {
    const [publico] = await banco.publico.$queryRaw<Linha[]>`SHOW idle_in_transaction_session_timeout`;
    const [administracao] = await banco.administracao.$queryRaw<Linha[]>`SHOW idle_in_transaction_session_timeout`;

    expect(publico?.idle_in_transaction_session_timeout).toBe("10s");
    expect(administracao?.idle_in_transaction_session_timeout).toBe("10s");
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

  it("consulta cortada pelo limite de 2 s do público vira ErroIndisponivel (plano, ameaças)", async () => {
    const erro = await erroTraduzido(banco.publico.$queryRaw`SELECT pg_sleep(3)`);

    expect(erro).toBeInstanceOf(ErroIndisponivel);
  });

  it("banco inalcançável vira ErroIndisponivel", async () => {
    const semBanco = criarBanco({ url: "postgresql://ninguem:x@127.0.0.1:1/nada" });

    let erro: unknown;
    try {
      erro = await erroTraduzido(semBanco.publico.$queryRaw`SELECT 1`);
    } finally {
      await semBanco.fechar();
    }

    expect(erro).toBeInstanceOf(ErroIndisponivel);
  });

  it("conexão derrubada no meio da consulta (banco reiniciando) vira ErroIndisponivel", async () => {
    const consulta = banco.administracao.$queryRaw`SELECT pg_sleep(4.5)`.then(
      () => null,
      (erro: unknown) => erro,
    );
    await esperarConsultaNoBanco("SELECT pg_sleep(4.5)");

    await cliente.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query = 'SELECT pg_sleep(4.5)' AND pid <> pg_backend_pid()",
    );
    const erro = await consulta;

    // 57P01, e não o corte por tempo (57014), que também viraria 503 e esconderia o caso.
    expect(codigoDoPostgres(erro)).toBe("57P01");
    expect(traduzirErroDoBanco(erro)).toBeInstanceOf(ErroIndisponivel);
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
