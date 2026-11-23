// Acesso obrigatório em toda rota (spec 000, T010; CA5.2, CA5.5; RN5; plano §3, "Acesso").
// - Toda rota declara config.acesso (publico, logado, editor ou admin) e o schema de resposta.
//   Faltou um dos dois: o servidor não sobe, e o erro cita a rota.
// - Exceções só nesta lista fechada, por método e URL exatos (rotas criadas por plugins que não
//   têm schema de resposta). Elas recebem acesso "publico".
// - Até a Fase 1 (login), qualquer rota que não seja "publico" responde 401. A Fase 1 troca esta
//   regra pela conferência da sessão e do papel.
// - A lista das rotas registradas alimenta a matriz de autorização dos testes.
import type { FastifyInstance, HTTPMethods } from "fastify";
import { ErroNaoAutenticado } from "../shared/erros.js";

export type Acesso = "publico" | "logado" | "editor" | "admin";

declare module "fastify" {
  interface FastifyContextConfig {
    /** Quem pode acessar a rota. Obrigatório em toda rota. */
    acesso?: Acesso;
  }
  interface FastifyInstance {
    /** As rotas registradas (sem os HEAD automáticos), para a matriz de autorização. */
    rotasDaApi: EntradaDaMatriz[];
  }
}

export interface EntradaDaMatriz {
  metodo: HTTPMethods;
  url: string;
}

/** Rotas que não precisam de schema de resposta. Crescer esta lista exige revisão (há teste). */
export const EXCECOES_DO_SCHEMA_DE_RESPOSTA: readonly EntradaDaMatriz[] = [
  // Consulta prévia do CORS (@fastify/cors): responde 204, sem corpo.
  { metodo: "OPTIONS", url: "*" },
];

const ehExcecao = (metodo: string, url: string) =>
  EXCECOES_DO_SCHEMA_DE_RESPOSTA.some((excecao) => excecao.metodo === metodo && excecao.url === url);

/** Registra as regras. Precisa vir antes de qualquer plugin que crie rotas (ex.: o CORS). */
export function registrarAcesso(app: FastifyInstance): void {
  const rotas: EntradaDaMatriz[] = [];
  app.decorate("rotasDaApi", rotas);

  app.addHook("onRoute", (rota) => {
    const metodos = Array.isArray(rota.method) ? rota.method : [rota.method];
    for (const metodo of metodos) {
      if (ehExcecao(metodo, rota.url)) {
        rota.config = { ...rota.config, acesso: "publico" };
        continue;
      }
      if (!rota.config?.acesso) {
        throw new Error(
          `Rota ${metodo} ${rota.url} sem config.acesso: declare quem pode acessá-la (publico, logado, editor ou admin).`,
        );
      }
      if (!rota.schema?.response) {
        throw new Error(`Rota ${metodo} ${rota.url} sem schema de resposta: declare o que ela devolve.`);
      }
      // O HEAD automático repete o GET (mesmo acesso); a matriz confere o GET.
      if (metodo !== "HEAD") rotas.push({ metodo, url: rota.url });
    }
  });

  app.addHook("onRequest", (pedido, _resposta, pronto) => {
    const acesso = pedido.routeOptions.config.acesso;
    pronto(acesso && acesso !== "publico" ? new ErroNaoAutenticado() : undefined);
  });
}

/** As rotas registradas que não têm entrada na matriz ("MÉTODO /url"). */
export function rotasSemEntrada(app: FastifyInstance, matriz: readonly EntradaDaMatriz[]): string[] {
  return app.rotasDaApi
    .filter((rota) => !matriz.some((entrada) => entrada.metodo === rota.metodo && entrada.url === rota.url))
    .map((rota) => `${rota.metodo} ${rota.url}`);
}
