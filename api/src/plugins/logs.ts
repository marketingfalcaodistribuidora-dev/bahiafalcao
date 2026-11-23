// Logs da API (spec 000, T008; CA3.2; RN4), com o pino nativo do Fastify.
// - Requisição e resposta por lista permitida: método, rota SEM query string, id e IP; status.
//   Nada de cabeçalhos, corpo, cookie ou set-cookie.
// - O que a própria API registra passa por um mascarador que percorre o objeto em qualquer
//   profundidade e esconde as chaves de senha, token, cookie e authorization. (O "redact" do pino
//   não serve: ele não casa parte do nome e cada "*." cobre um nível só.)
import type { FastifyServerOptions } from "fastify";
import type { DestinationStream } from "pino";
import type { NivelDoLog } from "../config/env.js";

const CHAVE_SENSIVEL = /senha|token|authorization|cookie/i;
const ESCONDIDO = "[ESCONDIDO]";

const ehObjetoSimples = (valor: object) => {
  const prototipo: unknown = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
};

/**
 * Cópia do valor com as chaves sensíveis escondidas, em qualquer nível. Só objetos simples e
 * listas são percorridos: instâncias de classe (a requisição e a resposta do Fastify, erros)
 * seguem inteiras para os serializadores, que já usam lista permitida. O pino chama este
 * mascarador ANTES dos serializadores; copiar a requisição perderia o url (um getter da classe).
 */
export function mascarar(valor: unknown, vistos = new WeakSet<object>()): unknown {
  if (typeof valor !== "object" || valor === null) return valor;
  if (vistos.has(valor)) return "[referência circular]";
  vistos.add(valor);
  if (Array.isArray(valor)) return valor.map((item) => mascarar(item, vistos));
  if (!ehObjetoSimples(valor)) return valor;
  return Object.fromEntries(
    Object.entries(valor).map(([chave, item]) => [
      chave,
      CHAVE_SENSIVEL.test(chave) ? ESCONDIDO : mascarar(item, vistos),
    ]),
  );
}

interface PedidoParaLog {
  method: string;
  url: string;
  id: string;
  ip: string;
}

/** As opções de logger que o Fastify aceita (sem os atalhos true/false). */
type OpcoesDeLogger = Exclude<FastifyServerOptions["logger"], boolean | undefined>;

/** Opções do logger do Fastify. `destino` serve aos testes (guardar o log em memória). */
export function opcoesDoLog(nivel: NivelDoLog, destino?: DestinationStream): OpcoesDeLogger {
  return {
    level: nivel,
    ...(destino && { stream: destino }),
    serializers: {
      req: (pedido: PedidoParaLog) => ({
        metodo: pedido.method,
        rota: pedido.url.split("?")[0],
        id: pedido.id,
        ip: pedido.ip,
      }),
      res: (resposta: { statusCode: number }) => ({ status: resposta.statusCode }),
    },
    formatters: { log: (objeto) => mascarar(objeto) as Record<string, unknown> },
  };
}
