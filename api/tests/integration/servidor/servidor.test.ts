// Servidor de verdade, com PostgreSQL real (spec 000, T011; CA1.2–CA1.4): sobe com uma
// configuração válida, responde pela rede, e desliga terminando a requisição em andamento e
// fechando as conexões com o banco.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { iniciarServidor, type Servidor } from "../../../src/servidor.js";
import { criarBancoDoArquivo, type BancoDoArquivo } from "../../apoio/banco.js";

let doArquivo: BancoDoArquivo;

beforeAll(async () => {
  doArquivo = await criarBancoDoArquivo();
});
afterAll(() => doArquivo.apagar());

const ambiente = (url: string) => ({
  NODE_ENV: "test",
  DATABASE_URL: url,
  PORTA: "0",
  LOG_NIVEL: "warn",
});

describe("servidor (CA1.2 e CA1.3)", () => {
  let servidor: Servidor;

  beforeAll(async () => {
    servidor = await iniciarServidor(ambiente(doArquivo.url));
  });
  afterAll(() => servidor.encerrar());

  it("sobe e responde /health/live pela rede", async () => {
    const resposta = await fetch(`${servidor.endereco}/health/live`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: "ok" });
  });

  it("/health/ready responde 200 com o banco no ar", async () => {
    const resposta = await fetch(`${servidor.endereco}/health/ready`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: "ok", banco: "ok" });
  });
});

describe("banco fora do ar (CA1.3)", () => {
  it("/health/ready responde 503 em pouco mais de 1 s", async () => {
    const servidor = await iniciarServidor(ambiente("postgresql://ninguem:x@127.0.0.1:1/nada"));
    const inicio = performance.now();

    const resposta = await fetch(`${servidor.endereco}/health/ready`);
    const segundos = (performance.now() - inicio) / 1000;
    await servidor.encerrar();

    expect(resposta.status).toBe(503);
    expect(segundos).toBeLessThan(3);
  });
});

describe("configuração inválida (CA1.1)", () => {
  it("não sobe, citando a variável", async () => {
    await expect(iniciarServidor({ NODE_ENV: "test" })).rejects.toThrow(/DATABASE_URL/);
  });
});

describe("desligamento gracioso (CA1.4)", () => {
  it("termina a requisição em andamento e fecha as conexões com o banco", async () => {
    const servidor = await iniciarServidor(ambiente(doArquivo.url), (app) => {
      app.get(
        "/teste/demorada",
        { config: { acesso: "publico" }, schema: { response: { 200: z.object({ ok: z.boolean() }) } } },
        async () => {
          await new Promise((pronto) => setTimeout(pronto, 300));
          return { ok: true };
        },
      );
    });
    const emAndamento = fetch(`${servidor.endereco}/teste/demorada`);
    await new Promise((pronto) => setTimeout(pronto, 50));

    await servidor.encerrar();
    const resposta = await emAndamento;

    expect(resposta.status).toBe(200);
    expect(servidor.banco.pools.publico.ended).toBe(true);
    expect(servidor.banco.pools.administracao.ended).toBe(true);
  });
});
