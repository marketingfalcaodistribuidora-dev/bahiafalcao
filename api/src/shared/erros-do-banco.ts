// Tradução dos erros do banco para erros de domínio (spec 000, T007; CA2.5, CA1.5).
// O resto da API nunca vê erro do Prisma nem do PostgreSQL: só ErroDeConflito,
// ErroIndisponivel ou o erro original, que vira 500 neutro (sem SQL nem nome de tabela).
//
// Formatos conferidos com o PostgreSQL real (Prisma 7.10.1 com @prisma/adapter-pg):
// - unicidade numa operação de modelo: P2002, com os campos em meta.target ou em
//   meta.driverAdapterError.cause.constraint.fields;
// - unicidade numa consulta SQL direta ($executeRaw): P2010, com
//   meta.driverAdapterError.cause.kind = "UniqueConstraintViolation";
// - banco inalcançável numa consulta direta: P2010 com kind = "DatabaseNotReachable"; numa
//   operação de modelo, P1001/P1002; ao iniciar, PrismaClientInitializationError;
// - consulta cortada pelo statement_timeout: P2010 com originalCode = "57014";
// - conexão derrubada no meio da consulta (banco reiniciando, pg_terminate_backend): P2010 com
//   originalCode = "57P01";
// - pool sem conexão livre no prazo: Error do pg com "timeout exceeded when trying to connect".
// Pelo código do adaptador e do runtime do Prisma 7.10.1 (review-gate, rodada 2), o mesmo vale
// para conexão fechada (P1017, kind ConnectionClosed), tempo esgotado na rede (P1008,
// SocketTimeout), banco cheio (P2037, TooManyConnections, 53300), banco desligando ou
// reiniciando (57P02, 57P03), conexão perdida (classe 08) e as quedas de conexão do pg.
// Tudo isso vira ErroIndisponivel (503): o banco não deu conta agora; tente de novo.
import { Prisma } from "../generated/prisma/client.js";
import { ErroDeConflito, ErroIndisponivel } from "./erros.js";

const MENSAGEM_DO_CAMPO = "Já existe um registro com este valor.";
/** Códigos do Prisma para banco fora do ar, lento demais ou cheio. */
const CODIGOS_DO_PRISMA = new Set(["P1001", "P1002", "P1008", "P1017", "P2037"]);
/** Tipos de erro do adaptador do PostgreSQL para o mesmo. */
const TIPOS_DO_ADAPTADOR = new Set(["DatabaseNotReachable", "ConnectionClosed", "SocketTimeout", "TooManyConnections"]);
/** Códigos do PostgreSQL: consulta cortada por tempo, banco desligando ou reiniciando, banco cheio. */
const CODIGOS_DO_POSTGRES = new Set(["57014", "57P01", "57P02", "57P03", "53300"]);
/** A classe 08 do PostgreSQL é de falha na conexão. */
const CLASSE_DE_CONEXAO = "08";
/** Mensagens do pg (fora do Prisma): pool sem conexão livre e conexão que caiu. */
const QUEDAS_DO_PG = [
  "timeout exceeded when trying to connect",
  "Connection terminated unexpectedly",
  "Connection terminated due to connection timeout",
];

const comoObjeto = (valor: unknown): Record<string, unknown> =>
  typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : {};

/** A causa informada pelo adaptador do PostgreSQL, quando há. */
const causaDoAdaptador = (meta: unknown) => comoObjeto(comoObjeto(comoObjeto(meta)["driverAdapterError"])["cause"]);

const somenteTextos = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : [];

/** Os campos de uma violação de unicidade, quando o Prisma os informa (nunca o nome do índice). */
function camposRepetidos(meta: unknown): Record<string, string> {
  const doAlvo = somenteTextos(comoObjeto(meta)["target"]);
  const daRestricao = somenteTextos(comoObjeto(causaDoAdaptador(meta)["constraint"])["fields"]);
  const nomes = doAlvo.length ? doAlvo : daRestricao;
  return Object.fromEntries(nomes.map((nome) => [nome, MENSAGEM_DO_CAMPO]));
}

/** O banco está fora do ar, lento demais, cheio ou reiniciando: algo passageiro. */
function bancoSemCondicao(codigo: string, causa: Record<string, unknown>): boolean {
  const tipo = causa["kind"];
  const doPostgres = causa["originalCode"];
  return (
    CODIGOS_DO_PRISMA.has(codigo) ||
    (typeof tipo === "string" && TIPOS_DO_ADAPTADOR.has(tipo)) ||
    (typeof doPostgres === "string" &&
      (CODIGOS_DO_POSTGRES.has(doPostgres) || doPostgres.startsWith(CLASSE_DE_CONEXAO)))
  );
}

export function traduzirErroDoBanco(erro: unknown): unknown {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    const causa = causaDoAdaptador(erro.meta);
    const unicidadeNoSql = erro.code === "P2010" && causa["kind"] === "UniqueConstraintViolation";
    if (erro.code === "P2002" || unicidadeNoSql) return new ErroDeConflito(camposRepetidos(erro.meta));
    return bancoSemCondicao(erro.code, causa) ? new ErroIndisponivel() : erro;
  }
  if (erro instanceof Prisma.PrismaClientInitializationError) return new ErroIndisponivel();
  if (erro instanceof Error && QUEDAS_DO_PG.some((queda) => erro.message.includes(queda)))
    return new ErroIndisponivel();
  return erro;
}
