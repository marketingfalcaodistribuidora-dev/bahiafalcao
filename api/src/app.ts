// Monta a API (spec 000; plano §1 e §3): plugins e rotas, sem abrir a porta (isso é do server.ts).
// Os testes chamam montarApp e usam app.inject, sem rede.
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { DestinationStream } from "pino";
import { z } from "zod";
import type { Configuracao } from "./config/env.js";
import { registrarErros } from "./plugins/erros.js";
import { opcoesDoLog } from "./plugins/logs.js";
import { geradorDeId } from "./plugins/request-id.js";

// Mensagens de validação em português, para a tela mostrar como vieram.
z.config(z.locales.ptBR());

export interface DependenciasDaApp {
  configuracao: Configuracao;
  /** Para onde vai o log (padrão: saída padrão). Os testes passam um destino em memória. */
  destinoDoLog?: DestinationStream;
}

export function montarApp({ configuracao, destinoDoLog }: DependenciasDaApp): FastifyInstance {
  const app = Fastify({
    logger: opcoesDoLog(configuracao.nivelDoLog, destinoDoLog),
    genReqId: geradorDeId(configuracao.proxiesConfiaveis),
    // O id vem do genReqId (que só aceita o do proxy confiável), nunca direto do cabeçalho.
    requestIdHeader: false,
    // Corpo: até 100 KB por padrão (cada rota pode mudar). Conexões lentas são cortadas.
    bodyLimit: 100 * 1024,
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
    // __proto__ ou constructor no corpo JSON: recusado (400), em vez de removido em silêncio.
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
  });

  // Zod valida a entrada e serializa a saída: só sai o que o schema de resposta declara.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // A API só aceita JSON (RN6): sem o leitor de texto puro que o Fastify traz por padrão, outro
  // formato recebe 415. Os envios de arquivo (Fases 3 e 5) registram o próprio leitor.
  app.removeContentTypeParser("text/plain");
  app.addHook("onRequest", async (pedido, resposta) => {
    void resposta.header("x-request-id", pedido.id);
  });
  registrarErros(app);
  return app;
}
