// Segurança das respostas (spec 000, T009; CA4.1–CA4.3; RN6).
// - helmet: HSTS (2 anos, subdomínios), nosniff e CSP fechada para JSON
//   (default-src 'none'; frame-ancestors 'none'). O /docs terá a própria CSP (Fase 4).
// - Cache-Control: no-store por padrão; as rotas públicas da Fase 4 declaram o próprio cache.
// - CORS: só as origens exatas da configuração, com credenciais; nunca "*". Sem lista, sem CORS.
// - Limite de requisições por IP (request.ip, que respeita TRUST_PROXY), também nas rotas que
//   não existem. LIMITE_IGNORAR_IPS (só fora de produção) serve à medição de performance.
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Configuracao } from "../config/env.js";
import { ErroMuitasRequisicoes } from "../shared/erros.js";

export async function registrarSeguranca(app: FastifyInstance, configuracao: Configuracao): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: { maxAge: 63_072_000, includeSubDomains: true },
  });

  app.addHook("onSend", async (_pedido, resposta) => {
    if (!resposta.hasHeader("cache-control")) void resposta.header("cache-control", "no-store");
    // O plugin de CORS manda Allow-Credentials mesmo para origem recusada. Sem origem
    // permitida, nenhum cabeçalho de CORS sai (CA4.2).
    if (!resposta.hasHeader("access-control-allow-origin")) resposta.removeHeader("access-control-allow-credentials");
  });

  await app.register(cors, {
    origin: configuracao.origensDoCors.length ? configuracao.origensDoCors : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });

  await app.register(rateLimit, {
    max: configuracao.limiteGeralPorMinuto,
    timeWindow: "1 minute",
    allowList: configuracao.ipsForaDoLimite,
    errorResponseBuilder: () => new ErroMuitasRequisicoes(),
  });
}
