// Prontidão da API (spec 000, T011; CA1.3): "pronta" quando o banco responde em até 1 s.
// O resultado vale por 2 s, e chamadas ao mesmo tempo esperam a MESMA verificação: uma rajada
// no /health/ready não ocupa o pool de conexões.
import { describe, expect, it } from "vitest";
import { criarProntidao } from "../../../../src/modules/saude/prontidao.js";

/** Relógio que só anda quando o teste manda. */
function relogioFixo(inicio = 0) {
  let agora = inicio;
  return { agora: () => agora, avancar: (ms: number) => (agora += ms) };
}

/** Verificação do banco que conta as chamadas; `falhar` decide a resposta. */
function bancoFalso({ falhar = false } = {}) {
  let chamadas = 0;
  return {
    chamadas: () => chamadas,
    verificar: () => {
      chamadas++;
      return falhar ? Promise.reject(new Error("banco fora do ar")) : Promise.resolve();
    },
  };
}

describe("criarProntidao", () => {
  it("está pronta quando o banco responde", async () => {
    const banco = bancoFalso();
    const estaPronta = criarProntidao({ verificarBanco: banco.verificar, relogio: relogioFixo() });

    expect(await estaPronta()).toBe(true);
  });

  it("não está pronta quando o banco falha", async () => {
    const estaPronta = criarProntidao({
      verificarBanco: bancoFalso({ falhar: true }).verificar,
      relogio: relogioFixo(),
    });

    expect(await estaPronta()).toBe(false);
  });

  it("não está pronta quando o banco não responde no limite", async () => {
    const semResposta = () => new Promise<void>(() => undefined);
    const estaPronta = criarProntidao({ verificarBanco: semResposta, relogio: relogioFixo(), limiteMs: 20 });

    expect(await estaPronta()).toBe(false);
  });

  it("reaproveita o resultado por 2 s, sem ir ao banco", async () => {
    const banco = bancoFalso();
    const relogio = relogioFixo();
    const estaPronta = criarProntidao({ verificarBanco: banco.verificar, relogio });
    await estaPronta();

    relogio.avancar(1_999);
    await estaPronta();

    expect(banco.chamadas()).toBe(1);
  });

  it("depois de 2 s, confere o banco de novo", async () => {
    const banco = bancoFalso();
    const relogio = relogioFixo();
    const estaPronta = criarProntidao({ verificarBanco: banco.verificar, relogio });
    await estaPronta();

    relogio.avancar(2_000);
    await estaPronta();

    expect(banco.chamadas()).toBe(2);
  });

  it("chamadas ao mesmo tempo fazem uma verificação só", async () => {
    const banco = bancoFalso();
    const estaPronta = criarProntidao({ verificarBanco: banco.verificar, relogio: relogioFixo() });

    await Promise.all(Array.from({ length: 10 }, () => estaPronta()));

    expect(banco.chamadas()).toBe(1);
  });
});
