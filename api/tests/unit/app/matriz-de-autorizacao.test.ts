// Matriz de autorização (spec 000, T010; CA5.5; prompt §4.2): TODAS as rotas da API × todos os
// papéis, com o status esperado. Rota nova sem entrada na matriz faz este teste falhar.
// Na Fase 0 não há login: os papéis "editor", "administrador", "desativado" e "sessão expirada"
// chegam como anônimos. A Fase 1 põe em CABECALHOS_DO_PAPEL a sessão de verdade.
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { rotasSemEntrada, type EntradaDaMatriz } from "../../../src/plugins/acesso.js";
import { appDeTeste } from "./apoio-app.js";

const PAPEIS = ["anonimo", "editor", "administrador", "desativado", "sessao_expirada"] as const;
type Papel = (typeof PAPEIS)[number];

/** Status esperado de cada rota para cada papel. Toda rota registrada precisa estar aqui. */
const TODOS_200: Record<Papel, number> = {
  anonimo: 200,
  editor: 200,
  administrador: 200,
  desativado: 200,
  sessao_expirada: 200,
};

const MATRIZ: (EntradaDaMatriz & { esperado: Record<Papel, number> })[] = [
  // Saúde (T011): públicas, para o monitor e o proxy.
  { metodo: "GET", url: "/health/live", esperado: TODOS_200 },
  { metodo: "GET", url: "/health/ready", esperado: TODOS_200 },
];

/** Cabeçalhos de quem faz a requisição. Fase 0: ninguém tem sessão; a Fase 1 põe o cookie de cada papel. */
const CABECALHOS_DO_PAPEL: Record<Papel, Record<string, string>> = {
  anonimo: {},
  editor: {},
  administrador: {},
  desativado: {},
  sessao_expirada: {},
};

let app: FastifyInstance;

beforeAll(async () => {
  ({ app } = await appDeTeste());
  await app.ready();
});
afterAll(() => app.close());

describe("matriz de autorização", () => {
  it("toda rota registrada na API tem entrada na matriz", () => {
    expect(rotasSemEntrada(app, MATRIZ)).toEqual([]);
  });

  it.each(MATRIZ.flatMap((entrada) => PAPEIS.map((papel) => [entrada, papel] as const)))(
    "%o como %s",
    async (entrada, papel) => {
      const resposta = await app.inject({
        method: entrada.metodo,
        url: entrada.url,
        headers: CABECALHOS_DO_PAPEL[papel],
      });

      expect(resposta.statusCode).toBe(entrada.esperado[papel]);
    },
  );
});

describe("rotasSemEntrada", () => {
  it("aponta a rota que alguém registrou e esqueceu de pôr na matriz", async () => {
    const { app: outra } = await appDeTeste();
    outra.get("/rota-nova", { config: { acesso: "publico" }, schema: { response: { 200: z.object({}) } } }, () => ({}));
    await outra.ready();

    expect(rotasSemEntrada(outra, MATRIZ)).toEqual(["GET /rota-nova"]);
    await outra.close();
  });
});
