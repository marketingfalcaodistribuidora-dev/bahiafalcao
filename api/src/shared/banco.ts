// Banco da API (spec 000, T007; plano §4): dois pools, cada um com o próprio cliente do Prisma.
// - público (rotas do catálogo): consultas cortadas em 2 s, até 10 conexões;
// - administração: consultas cortadas em 5 s, até 5 conexões.
// Os dois esperam no máximo 2 s por uma conexão livre (pool cheio → erro, que vira 503) e
// fecham conexões ociosas depois de 30 s. Uma sessão parada no meio de uma transação por 10 s
// é encerrada pelo PostgreSQL (não segura bloqueios). Os limites vão na própria conexão
// (options -c), sem um SET a mais por requisição. Um erro numa conexão ociosa (o banco caiu,
// a rede cortou) é sempre ouvido: sem ouvinte, o pg derruba o processo.
// Conta do tamanho: conexões ≈ requisições simultâneas × tempo da consulta ÷ tempo da requisição.
// Para 20 simultâneas, consultas de ~20 ms e requisições de ~60 ms: ~7; daí 10 com folga.
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

const ESPERA_POR_CONEXAO_MS = 2_000;
const CONEXAO_OCIOSA_MS = 30_000;
const CONEXOES_PADRAO = { publico: 10, administracao: 5 };

export interface OpcoesDoBanco {
  url: string;
  /** Máximo de conexões de cada pool (padrão: 10 e 5). */
  conexoes?: { publico: number; administracao: number };
  /** Emite um evento a cada consulta. Só para os testes (contar consultas): custa caro em produção. */
  registrarConsultas?: boolean;
  /** Avisado quando uma conexão ociosa falha, só com o pool e o tipo do erro. */
  aoErroNoPool?: (dados: { pool: NomeDoPool; tipo: string }) => void;
}

export type NomeDoPool = "publico" | "administracao";

export interface Banco {
  publico: PrismaClient;
  administracao: PrismaClient;
  pools: { publico: pg.Pool; administracao: pg.Pool };
  /** Fecha os clientes e as conexões dos dois pools. */
  fechar(): Promise<void>;
}

function criarPool(url: string, maximo: number, limiteDaConsulta: string): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    max: maximo,
    connectionTimeoutMillis: ESPERA_POR_CONEXAO_MS,
    idleTimeoutMillis: CONEXAO_OCIOSA_MS,
    // Fuso UTC explícito: as datas não dependem da configuração do servidor.
    options: `-c statement_timeout=${limiteDaConsulta} -c idle_in_transaction_session_timeout=10s -c TimeZone=UTC`,
  });
}

function criarCliente(pool: pg.Pool, registrarConsultas: boolean): PrismaClient {
  const adapter = new PrismaPg(pool);
  return registrarConsultas
    ? new PrismaClient({ adapter, log: [{ emit: "event", level: "query" }] })
    : new PrismaClient({ adapter });
}

/** Confere se o banco responde (para o /health/ready). */
export const verificadorDoBanco = (banco: Banco) => async (): Promise<void> => {
  await banco.publico.$queryRaw`SELECT 1`;
};

export function criarBanco(opcoes: OpcoesDoBanco): Banco {
  const conexoes = opcoes.conexoes ?? CONEXOES_PADRAO;
  const registrar = opcoes.registrarConsultas ?? false;
  const pools = {
    publico: criarPool(opcoes.url, conexoes.publico, "2s"),
    administracao: criarPool(opcoes.url, conexoes.administracao, "5s"),
  };
  for (const [nome, pool] of Object.entries(pools) as [NomeDoPool, pg.Pool][]) {
    pool.on("error", (erro) => opcoes.aoErroNoPool?.({ pool: nome, tipo: erro.name }));
  }
  const publico = criarCliente(pools.publico, registrar);
  const administracao = criarCliente(pools.administracao, registrar);

  return {
    publico,
    administracao,
    pools,
    async fechar() {
      await Promise.all([publico.$disconnect(), administracao.$disconnect()]);
      await Promise.all(
        Object.values(pools)
          .filter((pool) => !pool.ended)
          .map((pool) => pool.end()),
      );
    },
  };
}
