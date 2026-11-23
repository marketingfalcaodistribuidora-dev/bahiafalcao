// Acesso obrigatório em toda rota (spec 000, T010; CA5.2, CA5.5, CA5.6; RN5).
// - Rota sem declarar quem acessa (config.acesso) ou sem schema de resposta: o servidor não sobe.
// - Exceções só numa lista fechada (a consulta prévia do CORS), por método e URL exatos.
// - Até a Fase 1 (login), rota que não é pública responde 401.
// - Só sai na resposta o que o schema de resposta declara.
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { EXCECOES_DO_SCHEMA_DE_RESPOSTA } from "../../../src/plugins/acesso.js";
import { appDeTeste } from "./apoio-app.js";

let app: FastifyInstance | undefined;
afterEach(() => app?.close());

const RESPOSTA_OK = { 200: z.object({ ok: z.boolean() }) };

/** A mensagem do erro que impede o servidor de subir, ou null se ele subir. */
async function erroAoSubir(novo: FastifyInstance, registrar: (novo: FastifyInstance) => void): Promise<string | null> {
  try {
    registrar(novo);
    await novo.ready();
    return null;
  } catch (erro) {
    return erro instanceof Error ? erro.message : String(erro);
  }
}

describe("o servidor não sobe com rota sem declarações (CA5.2)", () => {
  it("recusa rota sem config.acesso, citando a rota", async () => {
    ({ app } = await appDeTeste());

    const erro = await erroAoSubir(app, (novo) =>
      novo.get("/teste/sem-acesso", { schema: { response: RESPOSTA_OK } }, () => ({ ok: true })),
    );

    expect(erro).toMatch(/GET \/teste\/sem-acesso/);
    expect(erro).toMatch(/acesso/);
  });

  it("recusa rota sem schema de resposta, citando a rota", async () => {
    ({ app } = await appDeTeste());

    const erro = await erroAoSubir(app, (novo) =>
      novo.post("/teste/sem-schema", { config: { acesso: "publico" } }, () => ({ ok: true })),
    );

    expect(erro).toMatch(/POST \/teste\/sem-schema/);
    expect(erro).toMatch(/schema de resposta/);
  });

  it("recusa rota cujo schema de resposta não declara nenhuma resposta de sucesso (2xx)", async () => {
    ({ app } = await appDeTeste());

    const erro = await erroAoSubir(app, (novo) =>
      novo.get(
        "/teste/so-erro",
        { config: { acesso: "publico" }, schema: { response: { 404: z.object({ erro: z.string() }) } } },
        () => ({ ok: true }),
      ),
    );

    expect(erro).toMatch(/GET \/teste\/so-erro/);
    expect(erro).toMatch(/2xx/);
  });

  it("aceita resposta de sucesso declarada como 201, 204 ou 2xx", async () => {
    ({ app } = await appDeTeste());

    const erro = await erroAoSubir(app, (novo) => {
      novo.post(
        "/teste/criada",
        { config: { acesso: "publico" }, schema: { response: { 201: z.object({}) } } },
        () => ({}),
      );
      novo.delete(
        "/teste/apagada",
        { config: { acesso: "publico" }, schema: { response: { 204: z.null() } } },
        () => null,
      );
      novo.put(
        "/teste/faixa",
        { config: { acesso: "publico" }, schema: { response: { "2xx": z.object({}) } } },
        () => ({}),
      );
    });

    expect(erro).toBeNull();
  });

  it("aceita rota com acesso e schema de resposta", async () => {
    ({ app } = await appDeTeste());

    const erro = await erroAoSubir(app, (novo) =>
      novo.get("/teste/completa", { config: { acesso: "publico" }, schema: { response: RESPOSTA_OK } }, () => ({
        ok: true,
      })),
    );

    expect(erro).toBeNull();
  });

  it("confere cada método de uma rota registrada com vários de uma vez", async () => {
    ({ app } = await appDeTeste());

    const erro = await erroAoSubir(app, (novo) =>
      novo.route({ method: ["GET", "POST"], url: "/teste/varios", handler: () => ({ ok: true }) }),
    );

    expect(erro).toMatch(/GET \/teste\/varios/);
  });

  it("as exceções são uma lista fechada: só a consulta prévia do CORS", () => {
    expect(EXCECOES_DO_SCHEMA_DE_RESPOSTA).toEqual([{ metodo: "OPTIONS", url: "*" }]);
  });
});

describe("rota não pública antes da Fase 1 (CA5.5)", () => {
  it.each(["logado", "editor", "admin"] as const)("acesso %s responde 401 nao_autenticado", async (acesso) => {
    ({ app } = await appDeTeste());
    app.get("/teste/restrita", { config: { acesso }, schema: { response: RESPOSTA_OK } }, () => ({ ok: true }));

    const resposta = await app.inject({ method: "GET", url: "/teste/restrita" });

    expect(resposta.statusCode).toBe(401);
    expect(resposta.json()).toEqual({ erro: "nao_autenticado", mensagem: expect.any(String) });
  });

  it("acesso publico responde normalmente, inclusive no HEAD automático", async () => {
    ({ app } = await appDeTeste());
    app.get("/teste/aberta", { config: { acesso: "publico" }, schema: { response: RESPOSTA_OK } }, () => ({
      ok: true,
    }));

    const get = await app.inject({ method: "GET", url: "/teste/aberta" });
    const head = await app.inject({ method: "HEAD", url: "/teste/aberta" });

    expect(get.statusCode).toBe(200);
    expect(head.statusCode).toBe(200);
  });

  it("a consulta prévia do CORS continua funcionando", async () => {
    ({ app } = await appDeTeste({ origensDoCors: ["https://bahiafalcao.com.br"] }));
    app.get("/teste/aberta", { config: { acesso: "publico" }, schema: { response: RESPOSTA_OK } }, () => ({
      ok: true,
    }));

    const resposta = await app.inject({
      method: "OPTIONS",
      url: "/teste/aberta",
      headers: { origin: "https://bahiafalcao.com.br", "access-control-request-method": "GET" },
    });

    expect(resposta.statusCode).toBe(204);
  });
});

describe("o 401 passa pelas mesmas proteções das outras respostas (review-gate da fundação)", () => {
  const SITE = "https://bahiafalcao.com.br";

  async function appComRotaRestrita(ajustes: Parameters<typeof appDeTeste>[0] = {}) {
    const novo = (await appDeTeste({ origensDoCors: [SITE], ...ajustes })).app;
    novo.get("/teste/restrita", { config: { acesso: "admin" }, schema: { response: RESPOSTA_OK } }, () => ({
      ok: true,
    }));
    return novo;
  }

  it("leva os cabeçalhos de segurança (CA4.1)", async () => {
    app = await appComRotaRestrita();

    const resposta = await app.inject({ method: "GET", url: "/teste/restrita" });

    expect(resposta.statusCode).toBe(401);
    expect(resposta.headers["strict-transport-security"]).toBeDefined();
    expect(resposta.headers["x-content-type-options"]).toBe("nosniff");
    expect(resposta.headers["content-security-policy"]).toMatch(/default-src 'none'/);
    expect(resposta.headers["cache-control"]).toBe("no-store");
  });

  it("leva o CORS da origem permitida, para o site conseguir ler o 401 (CA4.2)", async () => {
    app = await appComRotaRestrita();

    const resposta = await app.inject({ method: "GET", url: "/teste/restrita", headers: { origin: SITE } });

    expect(resposta.headers["access-control-allow-origin"]).toBe(SITE);
  });

  it("conta no limite de requisições: depois do limite, 429 (CA4.3)", async () => {
    app = await appComRotaRestrita({ limiteGeralPorMinuto: 10 });
    for (let vez = 0; vez < 10; vez++) await app.inject({ method: "GET", url: "/teste/restrita" });

    const resposta = await app.inject({ method: "GET", url: "/teste/restrita" });

    expect(resposta.statusCode).toBe(429);
  });
});

describe("só sai o que o schema de resposta declara (CA5.6)", () => {
  it("um campo a mais devolvido pelo código não chega à resposta", async () => {
    ({ app } = await appDeTeste());
    app.get(
      "/teste/usuario",
      { config: { acesso: "publico" }, schema: { response: { 200: z.object({ nome: z.string() }) } } },
      () => ({ nome: "Ana", senhaHash: "$argon2id$segredo" }),
    );

    const resposta = await app.inject({ method: "GET", url: "/teste/usuario" });

    expect(resposta.json()).toEqual({ nome: "Ana" });
    expect(resposta.body).not.toContain("argon2");
  });
});
