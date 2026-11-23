// Formato único de erro (spec 000, T008; CA2.1–CA2.6; RN1 e RN2). Toda falha vira
// { "erro": "codigo_maquina", "mensagem": "texto para pessoas", "campos": { … } }
// (campos só quando há), sem stack trace, SQL ou detalhe interno. O erro inesperado é
// registrado no log com o tipo, o id da requisição e a pilha, mas nunca com a mensagem,
// que pode trazer dados pessoais.
import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import {
  ErroDeDominio,
  ErroDeValidacao,
  ErroMuitoGrande,
  ErroNaoEncontrado,
  ErroTipoNaoSuportado,
} from "../shared/erros.js";
import { traduzirErroDoBanco } from "../shared/erros-do-banco.js";

const MENSAGEM_DO_ERRO_INTERNO = "Algo deu errado do nosso lado. Tente de novo em instantes.";

function responder(resposta: FastifyReply, erro: ErroDeDominio): FastifyReply {
  const corpo = Object.keys(erro.campos).length
    ? { erro: erro.codigo, mensagem: erro.message, campos: erro.campos }
    : { erro: erro.codigo, mensagem: erro.message };
  return resposta.code(erro.status).type("application/json; charset=utf-8").send(corpo);
}

/** "/endereco/cep" → "endereco.cep"; a raiz do corpo fica vazia. */
const nomeDoCampo = (caminho: string) => caminho.replace(/^\//, "").replaceAll("/", ".");

/** Os erros de validação do Zod, campo a campo, com as mensagens em português. */
function camposInvalidos(validacao: { keyword: string; instancePath: string; message?: string; params: unknown }[]) {
  const campos: Record<string, string> = {};
  for (const problema of validacao) {
    const chaves = (problema.params as { keys?: unknown }).keys;
    if (problema.keyword === "unrecognized_keys" && Array.isArray(chaves)) {
      for (const chave of chaves)
        campos[[nomeDoCampo(problema.instancePath), String(chave)].filter(Boolean).join(".")] ??=
          "Campo não permitido.";
      continue;
    }
    campos[nomeDoCampo(problema.instancePath) || "corpo"] ??= problema.message ?? "Valor inválido.";
  }
  return campos;
}

/** O erro em forma de erro de domínio, ou null se for inesperado (500). */
function comoErroDeDominio(erro: FastifyError): ErroDeDominio | null {
  const traduzido = traduzirErroDoBanco(erro);
  if (traduzido instanceof ErroDeDominio) return traduzido;
  if (hasZodFastifySchemaValidationErrors(erro)) return new ErroDeValidacao(camposInvalidos(erro.validation));
  if (erro.code === "FST_ERR_CTP_BODY_TOO_LARGE") return new ErroMuitoGrande();
  if (erro.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") return new ErroTipoNaoSuportado();
  // JSON quebrado, corpo vazio, __proto__ ou constructor no corpo: o Fastify recusa com 400.
  if (erro.statusCode === 400) return new ErroDeValidacao();
  return null;
}

export function registrarErros(app: FastifyInstance): void {
  // O limite de requisições vale também para rota que não existe (contra varredura de rotas).
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (_pedido, resposta) =>
    responder(resposta, new ErroNaoEncontrado()),
  );

  app.setErrorHandler((erro: FastifyError, pedido, resposta) => {
    const deDominio = comoErroDeDominio(erro);
    if (deDominio) return responder(resposta, deDominio);

    // Da pilha, só as linhas de localização no código ("at ..."). A mensagem pode ter várias
    // linhas com dados (as do Prisma listam os argumentos, como e-mails) e fica de fora.
    const pilha = (erro.stack ?? "")
      .split("\n")
      .filter((linha) => /^\s+at /.test(linha))
      .join("\n");
    pedido.log.error({ tipo: erro.name, pilha }, "erro inesperado");
    return resposta
      .code(500)
      .type("application/json; charset=utf-8")
      .send({ erro: "erro_interno", mensagem: MENSAGEM_DO_ERRO_INTERNO });
  });
}
