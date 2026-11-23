// Segurança das respostas (spec 000, T009; CA4.1–CA4.3, CA4.5; RN6 e RN7).
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { Configuracao } from "../../../src/config/env.js";
import { appDeTeste } from "./apoio-app.js";

let app: FastifyInstance | undefined;
afterEach(() => app?.close());

const SITE = "https://bahiafalcao.com.br";
// O helmet junta as diretivas sem espaço depois do ";"; para o navegador é a mesma política.
const CSP_FECHADA = /^default-src 'none'; ?frame-ancestors 'none'$/;

/** API de teste com uma rota que devolve o IP que ela enxerga. */
async function appComRotaDeIp(ajustes: Partial<Configuracao> = {}): Promise<FastifyInstance> {
  const novo = (await appDeTeste(ajustes)).app;
  novo
    .withTypeProvider<ZodTypeProvider>()
    .get("/teste/ip", { schema: { response: { 200: z.object({ ip: z.string() }) } } }, (pedido) => ({ ip: pedido.ip }));
  return novo;
}

describe("cabeçalhos de segurança (CA4.1)", () => {
  it("toda resposta JSON traz HSTS, nosniff, CSP fechada e no-store", async () => {
    app = await appComRotaDeIp();

    const resposta = await app.inject({ method: "GET", url: "/teste/ip" });

    expect(resposta.headers["strict-transport-security"]).toMatch(/max-age=\d+; includeSubDomains/);
    expect(resposta.headers["x-content-type-options"]).toBe("nosniff");
    expect(resposta.headers["content-security-policy"]).toMatch(CSP_FECHADA);
    expect(resposta.headers["cache-control"]).toBe("no-store");
    expect(resposta.headers["content-type"]).toMatch(/^application\/json/);
  });

  it("as respostas de erro também", async () => {
    app = await appComRotaDeIp();

    const resposta = await app.inject({ method: "GET", url: "/nao-existe" });

    expect(resposta.headers["content-security-policy"]).toMatch(CSP_FECHADA);
    expect(resposta.headers["cache-control"]).toBe("no-store");
  });

  it("a rota que declara o próprio cache mantém o dela (rotas públicas da Fase 4)", async () => {
    app = await appComRotaDeIp();
    app.get("/teste/publica", (_pedido, resposta) => {
      void resposta.header("cache-control", "public, max-age=60");
      return { ok: true };
    });

    const resposta = await app.inject({ method: "GET", url: "/teste/publica" });

    expect(resposta.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("não anuncia o servidor (sem x-powered-by)", async () => {
    app = await appComRotaDeIp();

    const resposta = await app.inject({ method: "GET", url: "/teste/ip" });

    expect(resposta.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS com lista exata (CA4.2)", () => {
  it("origem da lista recebe a própria origem, com credenciais e Vary: Origin", async () => {
    app = await appComRotaDeIp({ origensDoCors: [SITE] });

    const resposta = await app.inject({ method: "GET", url: "/teste/ip", headers: { origin: SITE } });

    expect(resposta.headers["access-control-allow-origin"]).toBe(SITE);
    expect(resposta.headers["access-control-allow-credentials"]).toBe("true");
    expect(resposta.headers.vary).toMatch(/Origin/);
  });

  it.each(["https://outro.com.br", "null", "https://bahiafalcao.com.br.exemplo.com", "http://bahiafalcao.com.br"])(
    "a origem %s não recebe nenhum cabeçalho de CORS",
    async (origem) => {
      app = await appComRotaDeIp({ origensDoCors: [SITE] });

      const resposta = await app.inject({ method: "GET", url: "/teste/ip", headers: { origin: origem } });

      expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
      expect(resposta.headers["access-control-allow-credentials"]).toBeUndefined();
    },
  );

  it("nunca responde * (nem sem lista configurada)", async () => {
    app = await appComRotaDeIp({ origensDoCors: [] });

    const resposta = await app.inject({ method: "GET", url: "/teste/ip", headers: { origin: SITE } });

    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("a consulta prévia (OPTIONS) da origem da lista é aceita", async () => {
    app = await appComRotaDeIp({ origensDoCors: [SITE] });

    const resposta = await app.inject({
      method: "OPTIONS",
      url: "/teste/ip",
      headers: { origin: SITE, "access-control-request-method": "GET" },
    });

    expect(resposta.statusCode).toBe(204);
    expect(resposta.headers["access-control-allow-origin"]).toBe(SITE);
  });
});

describe("limite de requisições (CA4.3)", () => {
  it("passou do limite por minuto: 429 muitas_requisicoes, com Retry-After", async () => {
    app = await appComRotaDeIp({ limiteGeralPorMinuto: 10 });
    for (let vez = 0; vez < 10; vez++) await app.inject({ method: "GET", url: "/teste/ip" });

    const resposta = await app.inject({ method: "GET", url: "/teste/ip" });

    expect(resposta.statusCode).toBe(429);
    expect(resposta.json()).toEqual({ erro: "muitas_requisicoes", mensagem: expect.any(String) });
    expect(Number(resposta.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("rotas que não existem também contam (contra varredura de rotas)", async () => {
    app = await appComRotaDeIp({ limiteGeralPorMinuto: 10 });
    for (let vez = 0; vez < 10; vez++) await app.inject({ method: "GET", url: `/procurando-${String(vez)}` });

    const resposta = await app.inject({ method: "GET", url: "/procurando-mais" });

    expect(resposta.statusCode).toBe(429);
  });

  it("os IPs fora do limite (só para medir performance) não são barrados", async () => {
    app = await appComRotaDeIp({ ambiente: "development", limiteGeralPorMinuto: 10, ipsForaDoLimite: ["127.0.0.1"] });
    for (let vez = 0; vez < 10; vez++) await app.inject({ method: "GET", url: "/teste/ip" });

    const resposta = await app.inject({ method: "GET", url: "/teste/ip" });

    expect(resposta.statusCode).toBe(200);
  });
});

describe("IP do cliente (CA4.5)", () => {
  it("sem proxy confiável, ignora o X-Forwarded-For e usa o endereço da conexão", async () => {
    app = await appComRotaDeIp({ proxiesConfiaveis: [] });

    const resposta = await app.inject({
      method: "GET",
      url: "/teste/ip",
      remoteAddress: "10.0.0.5",
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    expect(resposta.json()).toEqual({ ip: "10.0.0.5" });
  });

  it("vindo do proxy confiável, usa o IP informado por ele", async () => {
    app = await appComRotaDeIp({ proxiesConfiaveis: ["10.0.0.0/8"] });

    const resposta = await app.inject({
      method: "GET",
      url: "/teste/ip",
      remoteAddress: "10.0.0.5",
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    expect(resposta.json()).toEqual({ ip: "203.0.113.9" });
  });

  it("vindo de fora da lista, ignora o X-Forwarded-For mesmo com proxy configurado", async () => {
    app = await appComRotaDeIp({ proxiesConfiaveis: ["10.0.0.0/8"] });

    const resposta = await app.inject({
      method: "GET",
      url: "/teste/ip",
      remoteAddress: "198.51.100.7",
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    expect(resposta.json()).toEqual({ ip: "198.51.100.7" });
  });
});
