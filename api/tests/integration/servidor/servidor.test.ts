// Servidor de verdade, com PostgreSQL real (spec 000, T011; CA1.2–CA1.4): sobe com uma
// configuração válida, responde pela rede, e desliga terminando a requisição em andamento,
// recusando conexão nova e fechando as conexões com o banco. Sem sleep: a requisição demorada
// avisa quando chegou e só termina quando o teste libera.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { iniciarServidor, type Servidor } from "../../../src/servidor.js";
import type { Banco } from "../../../src/shared/banco.js";
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

  it("um erro numa conexão ociosa do banco vai para o log (só o tipo) e não derruba o processo", () => {
    const registrarErro = vi.spyOn(servidor.app.log, "error").mockImplementation(() => undefined);

    servidor.banco.pools.publico.emit("error", new TypeError("conexão caiu"));

    expect(registrarErro).toHaveBeenCalledWith(
      { pool: "publico", tipo: "TypeError" },
      "erro numa conexão ociosa do banco",
    );
    registrarErro.mockRestore();
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

describe("porta ocupada (sem CA próprio: achado do review-gate da fundação)", () => {
  it("não sobe e fecha as conexões com o banco que já tinha aberto", async () => {
    const primeiro = await iniciarServidor(ambiente(doArquivo.url));
    const porta = new URL(primeiro.endereco).port;
    let bancoDoSegundo: Banco | undefined;

    const segundo = iniciarServidor({ ...ambiente(doArquivo.url), PORTA: porta }, (_app, banco) => {
      bancoDoSegundo = banco;
    });
    await expect(segundo).rejects.toThrow(/EADDRINUSE/);
    await primeiro.encerrar();

    expect(bancoDoSegundo?.pools.publico.ended).toBe(true);
    expect(bancoDoSegundo?.pools.administracao.ended).toBe(true);
  });
});

describe("desligamento gracioso (CA1.4)", () => {
  /** O que uma conexão nova pode receber durante o desligamento (nunca uma resposta normal). */
  const SAIDAS_DO_DESLIGAMENTO = ["ECONNREFUSED", "ECONNRESET", "UND_ERR_SOCKET", "atendida com 503"];

  /** Sobe o servidor com uma rota que avisa quando chegou e só responde quando o teste libera. */
  async function servidorComRotaPresa() {
    let avisarChegada: () => void = () => undefined;
    let liberar: () => void = () => undefined;
    const chegou = new Promise<void>((pronto) => (avisarChegada = pronto));
    const liberada = new Promise<void>((pronto) => (liberar = pronto));
    const servidor = await iniciarServidor(ambiente(doArquivo.url), (app) => {
      app.get(
        "/teste/demorada",
        { config: { acesso: "publico" }, schema: { response: { 200: z.object({ ok: z.boolean() }) } } },
        async () => {
          avisarChegada();
          await liberada;
          return { ok: true };
        },
      );
    });
    return { servidor, chegou, liberar };
  }

  /**
   * Uma conexão nova durante o desligamento: recusada (ECONNREFUSED), cortada depois de aceita
   * pelo sistema (ECONNRESET, UND_ERR_SOCKET) ou, se chegar antes de a porta fechar, respondida
   * com 503 pelo Fastify. Nunca atendida normalmente (2xx).
   */
  async function conexaoNovaRecusada(endereco: string): Promise<string> {
    try {
      const resposta = await fetch(`${endereco}/health/live`);
      return `atendida com ${String(resposta.status)}`;
    } catch (erro) {
      return (erro as { cause?: { code?: string } }).cause?.code ?? "erro sem código";
    }
  }

  it("espera a requisição em andamento terminar e só então fecha as conexões com o banco", async () => {
    const { servidor, chegou, liberar } = await servidorComRotaPresa();
    const emAndamento = fetch(`${servidor.endereco}/teste/demorada`);
    await chegou;

    const encerrando = servidor.encerrar();
    try {
      // A conexão nova recusada mostra que o desligamento já começou; o banco segue aberto.
      expect(SAIDAS_DO_DESLIGAMENTO).toContain(await conexaoNovaRecusada(servidor.endereco));
      expect(servidor.banco.pools.publico.ended).toBe(false);
    } finally {
      liberar();
    }
    const resposta = await emAndamento;
    await encerrando;

    expect(resposta.status).toBe(200);
    expect(servidor.banco.pools.publico.ended).toBe(true);
    expect(servidor.banco.pools.administracao.ended).toBe(true);
  });

  it("recusa conexão nova enquanto desliga", async () => {
    const { servidor, chegou, liberar } = await servidorComRotaPresa();
    const emAndamento = fetch(`${servidor.endereco}/teste/demorada`);
    await chegou;

    const encerrando = servidor.encerrar();
    let resultado: string;
    try {
      resultado = await conexaoNovaRecusada(servidor.endereco);
    } finally {
      liberar();
      await emAndamento;
      await encerrando;
    }

    expect(SAIDAS_DO_DESLIGAMENTO).toContain(resultado);
  });
});
