// Apoio dos testes de HTTP sem banco: monta a API com uma configuração de teste e guarda os
// logs em memória, para conferir o que foi (e o que não foi) registrado.
import { Writable } from "node:stream";
import { z } from "zod";
import type { Configuracao } from "../../../src/config/env.js";
import { montarApp } from "../../../src/app.js";

export const configuracaoDeTeste = (ajustes: Partial<Configuracao> = {}): Configuracao => ({
  ambiente: "test",
  urlDoBanco: "postgresql://nao-usado@127.0.0.1:1/nada",
  origensDoCors: [],
  proxiesConfiaveis: [],
  limiteGeralPorMinuto: 300,
  ipsForaDoLimite: [],
  docsHabilitado: false,
  nivelDoLog: "info",
  ...ajustes,
});

/** Opções de uma rota de teste pública com resposta { ok } (toda rota declara acesso e schema). */
export const ROTA_PUBLICA_DE_TESTE = {
  config: { acesso: "publico" as const },
  schema: { response: { 200: z.object({ ok: z.boolean() }) } },
};

/** A API de teste e o texto de tudo o que ela registrou no log. */
export async function appDeTeste(ajustes: Partial<Configuracao> = {}) {
  const linhas: string[] = [];
  const destinoDoLog = new Writable({
    write(pedaco: Buffer, _codificacao, pronto) {
      linhas.push(pedaco.toString("utf8"));
      pronto();
    },
  });
  const app = await montarApp({ configuracao: configuracaoDeTeste(ajustes), destinoDoLog });
  return { app, log: () => linhas.join("") };
}
