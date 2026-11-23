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
// - pool sem conexão livre no prazo: Error do pg com "timeout exceeded when trying to connect".
// Os quatro últimos viram ErroIndisponivel (503): o banco não deu conta agora; tente de novo.
import { Prisma } from "../generated/prisma/client.js";
import { ErroDeConflito, ErroIndisponivel } from "./erros.js";

const MENSAGEM_DO_CAMPO = "Já existe um registro com este valor.";
const BANCO_INALCANCAVEL = new Set(["P1001", "P1002"]);
const CONSULTA_CORTADA_POR_TEMPO = "57014";
const ESPERA_ESGOTADA_NO_POOL = "timeout exceeded when trying to connect";

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

export function traduzirErroDoBanco(erro: unknown): unknown {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    const causa = causaDoAdaptador(erro.meta);
    const unicidadeNoSql = erro.code === "P2010" && causa["kind"] === "UniqueConstraintViolation";
    if (erro.code === "P2002" || unicidadeNoSql) return new ErroDeConflito(camposRepetidos(erro.meta));
    const inalcancavel = BANCO_INALCANCAVEL.has(erro.code) || causa["kind"] === "DatabaseNotReachable";
    if (inalcancavel || causa["originalCode"] === CONSULTA_CORTADA_POR_TEMPO) return new ErroIndisponivel();
    return erro;
  }
  if (erro instanceof Prisma.PrismaClientInitializationError) return new ErroIndisponivel();
  if (erro instanceof Error && erro.message.includes(ESPERA_ESGOTADA_NO_POOL)) return new ErroIndisponivel();
  return erro;
}
