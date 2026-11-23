// Liga a API de verdade (spec 000, T011; CA1.1–CA1.4): lê a configuração, cria o banco, monta a
// API e abre a porta. Separado do server.ts (a porta de entrada do processo) para ser testado.
import type { FastifyInstance } from "fastify";
import { montarApp } from "./app.js";
import { lerConfiguracao } from "./config/env.js";
import { criarBanco, verificadorDoBanco, type Banco } from "./shared/banco.js";

export interface Servidor {
  app: FastifyInstance;
  banco: Banco;
  /** Endereço em que a API escuta, ex.: http://127.0.0.1:3333 */
  endereco: string;
  /** Desliga: termina as requisições em andamento e fecha as conexões com o banco. */
  encerrar(): Promise<void>;
}

/**
 * Sobe a API. Com configuração inválida, rejeita com ErroDeConfiguracao (que cita só os nomes
 * das variáveis). `registrarExtras` é só para os testes acrescentarem rotas antes de abrir a porta.
 */
export async function iniciarServidor(
  env: Record<string, string | undefined>,
  registrarExtras?: (app: FastifyInstance) => void,
): Promise<Servidor> {
  const configuracao = lerConfiguracao(env);
  const banco = criarBanco({ url: configuracao.urlDoBanco });
  const app = await montarApp({
    configuracao,
    verificarBanco: verificadorDoBanco(banco),
    aoFechar: () => banco.fechar(),
  });
  registrarExtras?.(app);

  await app.listen({ host: configuracao.endereco, port: configuracao.porta });
  // Com PORTA=0 o sistema escolhe a porta; ela é lida do servidor já aberto.
  const aberto = app.server.address();
  const porta = typeof aberto === "object" && aberto !== null ? aberto.port : configuracao.porta;
  return {
    app,
    banco,
    endereco: `http://${configuracao.endereco}:${String(porta)}`,
    encerrar: () => app.close(),
  };
}
