// Rotas de saúde (spec 000, T011; CA1.2, CA1.3): /health/live (o processo está de pé) e
// /health/ready (o banco responde). Públicas; o live fica fora do limite de requisições
// (o monitor chama sempre), o ready dentro dele.
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { appDeTeste } from "./apoio-app.js";

let app: FastifyInstance | undefined;
afterEach(() => app?.close());

const bancoQueResponde = () => Promise.resolve();
const bancoForaDoAr = () => Promise.reject(new Error("connect ECONNREFUSED"));

describe("/health/live (CA1.2)", () => {
  it("responde 200 { status: ok }", async () => {
    ({ app } = await appDeTeste({}, { verificarBanco: bancoForaDoAr }));

    const resposta = await app.inject({ method: "GET", url: "/health/live" });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: "ok" });
  });

  it("fica fora do limite de requisições", async () => {
    ({ app } = await appDeTeste({ limiteGeralPorMinuto: 10 }, { verificarBanco: bancoQueResponde }));
    for (let vez = 0; vez < 10; vez++) await app.inject({ method: "GET", url: "/health/live" });

    const resposta = await app.inject({ method: "GET", url: "/health/live" });

    expect(resposta.statusCode).toBe(200);
  });
});

describe("/health/ready (CA1.3)", () => {
  it("banco respondendo: 200 { status: ok, banco: ok }", async () => {
    ({ app } = await appDeTeste({}, { verificarBanco: bancoQueResponde }));

    const resposta = await app.inject({ method: "GET", url: "/health/ready" });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: "ok", banco: "ok" });
  });

  it("banco fora do ar: 503 indisponivel, sem o detalhe do erro", async () => {
    ({ app } = await appDeTeste({}, { verificarBanco: bancoForaDoAr }));

    const resposta = await app.inject({ method: "GET", url: "/health/ready" });

    expect(resposta.statusCode).toBe(503);
    expect(resposta.json()).toEqual({ erro: "indisponivel", mensagem: expect.any(String) });
    expect(resposta.body).not.toContain("ECONNREFUSED");
  });

  it("conta no limite de requisições", async () => {
    ({ app } = await appDeTeste({ limiteGeralPorMinuto: 10 }, { verificarBanco: bancoQueResponde }));
    for (let vez = 0; vez < 10; vez++) await app.inject({ method: "GET", url: "/health/ready" });

    const resposta = await app.inject({ method: "GET", url: "/health/ready" });

    expect(resposta.statusCode).toBe(429);
  });
});
