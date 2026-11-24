// Desligamento ao receber SIGTERM ou SIGINT (spec 000, T011; CA1.4): espera o servidor terminar o
// que está em andamento e sai com 0; se falhar, sai com 1; se passar do limite de tempo (uma
// requisição presa, uma conexão que não fecha), força a saída com 1 em vez de ficar pendurado.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarDesligamento } from "../../src/desligamento.js";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Um encerrar que só termina quando o teste manda. */
function encerrarControlado() {
  let terminar: () => void = () => undefined;
  let falhar: (erro: unknown) => void = () => undefined;
  const encerrar = vi.fn(
    () =>
      new Promise<void>((resolver, rejeitar) => {
        terminar = resolver;
        falhar = rejeitar;
      }),
  );
  return {
    encerrar,
    terminar: () => {
      terminar();
    },
    falhar: (erro: unknown) => {
      falhar(erro);
    },
  };
}

const logDeTeste = () => ({ info: vi.fn(), error: vi.fn() });

describe("criarDesligamento", () => {
  it("espera o encerramento terminar e sai com 0", async () => {
    const { encerrar, terminar } = encerrarControlado();
    const sair = vi.fn();
    const desligar = criarDesligamento({ encerrar, sair, log: logDeTeste(), limiteMs: 10_000 });

    const desligando = desligar("SIGTERM");
    expect(sair).not.toHaveBeenCalled();
    terminar();
    await desligando;

    expect(sair).toHaveBeenCalledExactlyOnceWith(0);
  });

  it("registra o sinal recebido", async () => {
    const { encerrar, terminar } = encerrarControlado();
    const log = logDeTeste();
    const desligar = criarDesligamento({ encerrar, sair: vi.fn(), log, limiteMs: 10_000 });

    const desligando = desligar("SIGINT");
    terminar();
    await desligando;

    expect(log.info).toHaveBeenCalledWith({ sinal: "SIGINT" }, "desligando");
  });

  it("sai com 1 se o encerramento falhar, registrando só o tipo do erro", async () => {
    const { encerrar, falhar } = encerrarControlado();
    const sair = vi.fn();
    const log = logDeTeste();
    const desligar = criarDesligamento({ encerrar, sair, log, limiteMs: 10_000 });

    const desligando = desligar("SIGTERM");
    falhar(new TypeError("detalhe interno com ana@exemplo.com"));
    await desligando;

    expect(sair).toHaveBeenCalledExactlyOnceWith(1);
    expect(log.error).toHaveBeenCalledWith({ tipo: "TypeError" }, "falha ao desligar");
  });

  it("registra o tipo também quando o que falhou não é um Error", async () => {
    const { encerrar, falhar } = encerrarControlado();
    const log = logDeTeste();
    const desligar = criarDesligamento({ encerrar, sair: vi.fn(), log, limiteMs: 10_000 });

    const desligando = desligar("SIGTERM");
    falhar("texto solto");
    await desligando;

    expect(log.error).toHaveBeenCalledWith({ tipo: "string" }, "falha ao desligar");
  });

  it("força a saída com 1 quando o encerramento passa do limite de tempo", async () => {
    const { encerrar } = encerrarControlado();
    const sair = vi.fn();
    const log = logDeTeste();
    const desligar = criarDesligamento({ encerrar, sair, log, limiteMs: 10_000 });

    void desligar("SIGTERM");
    await vi.advanceTimersByTimeAsync(9_999);
    expect(sair).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(sair).toHaveBeenCalledExactlyOnceWith(1);
    expect(log.error).toHaveBeenCalledWith({ limiteMs: 10_000 }, "desligamento passou do limite; saída forçada");
  });

  it("não sai duas vezes quando o encerramento termina depois do limite", async () => {
    const { encerrar, terminar } = encerrarControlado();
    const sair = vi.fn();
    const desligar = criarDesligamento({ encerrar, sair, log: logDeTeste(), limiteMs: 10_000 });

    const desligando = desligar("SIGTERM");
    await vi.advanceTimersByTimeAsync(10_000);
    terminar();
    await desligando;

    expect(sair).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("um segundo sinal durante o desligamento não encerra de novo", async () => {
    const { encerrar, terminar } = encerrarControlado();
    const sair = vi.fn();
    const desligar = criarDesligamento({ encerrar, sair, log: logDeTeste(), limiteMs: 10_000 });

    const primeiro = desligar("SIGTERM");
    const segundo = desligar("SIGINT");
    terminar();
    await Promise.all([primeiro, segundo]);

    expect(encerrar).toHaveBeenCalledOnce();
    expect(sair).toHaveBeenCalledExactlyOnceWith(0);
  });

  // 8 s, abaixo dos 10 s que o Docker espera antes de matar o processo: a saída forçada e o log
  // dela acontecem antes do SIGKILL.
  it("usa 8 s como limite quando nenhum é informado", async () => {
    const { encerrar } = encerrarControlado();
    const sair = vi.fn();
    const desligar = criarDesligamento({ encerrar, sair, log: logDeTeste() });

    void desligar("SIGTERM");
    await vi.advanceTimersByTimeAsync(7_999);
    const antesDoLimite = sair.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1);

    expect(antesDoLimite).toBe(0);
    expect(sair).toHaveBeenCalledExactlyOnceWith(1);
  });
});
