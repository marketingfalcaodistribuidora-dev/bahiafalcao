// Formato único de erro (spec 000, T008; CA2.1–CA2.6; RN1 e RN2):
// { "erro": "codigo_maquina", "mensagem": "texto para pessoas", "campos": { … } },
// sem stack trace, SQL ou detalhe interno.
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { ErroDeConflito, ErroIndisponivel } from "../../../src/shared/erros.js";
import { appDeTeste, ROTA_PUBLICA_DE_TESTE } from "./apoio-app.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = (await appDeTeste()).app;
  const rotas = app.withTypeProvider<ZodTypeProvider>();
  rotas.post(
    "/teste/cadastro",
    {
      config: { acesso: "publico" },
      schema: {
        body: z.strictObject({ email: z.email(), idade: z.number().int() }),
        response: { 200: z.object({ ok: z.boolean() }) },
      },
    },
    () => ({ ok: true }),
  );
  rotas.get("/teste/quebra", ROTA_PUBLICA_DE_TESTE, () => {
    throw new Error('SELECT * FROM "Usuario" WHERE senha = $1');
  });
  rotas.get("/teste/conflito", ROTA_PUBLICA_DE_TESTE, () => {
    throw new ErroDeConflito({ email: "Já existe um registro com este valor." });
  });
  rotas.get("/teste/indisponivel", ROTA_PUBLICA_DE_TESTE, () => {
    throw new ErroIndisponivel();
  });
  rotas.get("/teste/repetido-no-banco", ROTA_PUBLICA_DE_TESTE, () => {
    throw new Prisma.PrismaClientKnownRequestError("detalhe interno", {
      code: "P2002",
      clientVersion: "7.10.1",
      meta: { target: ["email"] },
    });
  });
  await app.ready();
});

afterEach(() => app.close());

const postJson = (payload: unknown) =>
  app.inject({ method: "POST", url: "/teste/cadastro", payload: payload as Record<string, unknown> });

describe("formato único de erro", () => {
  it("rota que não existe: 404 nao_encontrado (CA2.1)", async () => {
    const resposta = await app.inject({ method: "GET", url: "/nao-existe" });

    expect(resposta.statusCode).toBe(404);
    expect(resposta.json()).toEqual({ erro: "nao_encontrado", mensagem: expect.any(String) });
  });

  it("campo inválido: 400 validacao, com o erro de cada campo em português (CA2.2)", async () => {
    const resposta = await postJson({ email: "isso-nao-e-email", idade: "dez" });

    expect(resposta.statusCode).toBe(400);
    const corpo = resposta.json<{ erro: string; campos: Record<string, string> }>();
    expect(corpo.erro).toBe("validacao");
    expect(Object.keys(corpo.campos).sort()).toEqual(["email", "idade"]);
    expect(corpo.campos["idade"]).toMatch(/esperado|inválid/i);
  });

  it("campo que o schema não conhece: 400, apontando o campo (CA2.3)", async () => {
    const resposta = await postJson({ email: "ana@exemplo.com", idade: 30, administrador: true });

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json()).toMatchObject({ erro: "validacao", campos: { administrador: "Campo não permitido." } });
  });

  it("__proto__ no corpo: 400 validacao (CA2.3)", async () => {
    const resposta = await app.inject({
      method: "POST",
      url: "/teste/cadastro",
      headers: { "content-type": "application/json" },
      payload: '{"email":"ana@exemplo.com","idade":30,"__proto__":{"administrador":true}}',
    });

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json()).toMatchObject({ erro: "validacao" });
  });

  it("JSON quebrado: 400 validacao", async () => {
    const resposta = await app.inject({
      method: "POST",
      url: "/teste/cadastro",
      headers: { "content-type": "application/json" },
      payload: '{"email": ',
    });

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json()).toMatchObject({ erro: "validacao" });
  });

  it("erro inesperado: 500 com mensagem neutra, sem SQL nem detalhe (CA2.4)", async () => {
    const resposta = await app.inject({ method: "GET", url: "/teste/quebra" });

    expect(resposta.statusCode).toBe(500);
    expect(resposta.json()).toEqual({ erro: "erro_interno", mensagem: expect.any(String) });
    expect(resposta.body).not.toMatch(/SELECT|Usuario|senha|stack|at /);
  });

  it("valor repetido: 409 conflito, com o campo (CA2.5)", async () => {
    const resposta = await app.inject({ method: "GET", url: "/teste/conflito" });

    expect(resposta.statusCode).toBe(409);
    expect(resposta.json()).toEqual({
      erro: "conflito",
      mensagem: expect.any(String),
      campos: { email: "Já existe um registro com este valor." },
    });
  });

  it("erro de unicidade vindo do Prisma também vira 409, sem o detalhe interno (CA2.5)", async () => {
    const resposta = await app.inject({ method: "GET", url: "/teste/repetido-no-banco" });

    expect(resposta.statusCode).toBe(409);
    expect(resposta.json()).toMatchObject({ erro: "conflito", campos: { email: expect.any(String) } });
    expect(resposta.body).not.toContain("detalhe interno");
  });

  it("banco indisponível: 503 indisponivel", async () => {
    const resposta = await app.inject({ method: "GET", url: "/teste/indisponivel" });

    expect(resposta.statusCode).toBe(503);
    expect(resposta.json()).toEqual({ erro: "indisponivel", mensagem: expect.any(String) });
  });

  it("corpo acima do limite (100 KB): 413 muito_grande (CA2.6)", async () => {
    const resposta = await postJson({ email: "ana@exemplo.com", idade: 30, sobra: "x".repeat(110_000) });

    expect(resposta.statusCode).toBe(413);
    expect(resposta.json()).toEqual({ erro: "muito_grande", mensagem: expect.any(String) });
  });

  it("corpo que não é JSON: 415 tipo_nao_suportado (CA2.6)", async () => {
    const resposta = await app.inject({
      method: "POST",
      url: "/teste/cadastro",
      headers: { "content-type": "text/plain" },
      payload: "email=ana@exemplo.com",
    });

    expect(resposta.statusCode).toBe(415);
    expect(resposta.json()).toEqual({ erro: "tipo_nao_suportado", mensagem: expect.any(String) });
  });

  it("toda resposta de erro é JSON", async () => {
    const resposta = await app.inject({ method: "GET", url: "/nao-existe" });

    expect(resposta.headers["content-type"]).toMatch(/^application\/json/);
  });
});
