// Prontidão da API (spec 000, T011; CA1.3; plano §3): pronta quando o banco responde em até 1 s.
// - O resultado vale por 2 s: chamadas repetidas não vão ao banco.
// - Chamadas ao mesmo tempo esperam a MESMA verificação (single-flight): uma rajada no
//   /health/ready não ocupa o pool de conexões.
import type { Relogio } from "../../shared/relogio.js";

export interface OpcoesDaProntidao {
  /** Confere se o banco responde; rejeita se não. */
  verificarBanco: () => Promise<void>;
  relogio: Relogio;
  /** Por quanto tempo o último resultado vale (padrão 2 s). */
  validadeMs?: number;
  /** Quanto esperar pelo banco antes de considerar fora do ar (padrão 1 s). */
  limiteMs?: number;
}

/** O banco respondeu dentro do limite? Nunca rejeita. */
async function respondeuNoLimite(verificar: () => Promise<void>, limiteMs: number): Promise<boolean> {
  let cronometro: NodeJS.Timeout | undefined;
  const estourou = new Promise<false>((pronto) => {
    cronometro = setTimeout(() => {
      pronto(false);
    }, limiteMs);
  });
  try {
    return await Promise.race([verificar().then(() => true as const), estourou]);
  } catch {
    return false;
  } finally {
    clearTimeout(cronometro);
  }
}

export function criarProntidao({
  verificarBanco,
  relogio,
  validadeMs = 2_000,
  limiteMs = 1_000,
}: OpcoesDaProntidao): () => Promise<boolean> {
  let ultimo: { quando: number; pronta: boolean } | undefined;
  let emAndamento: Promise<boolean> | undefined;

  return () => {
    if (ultimo && relogio.agora() - ultimo.quando < validadeMs) return Promise.resolve(ultimo.pronta);
    emAndamento ??= respondeuNoLimite(verificarBanco, limiteMs).then((pronta) => {
      ultimo = { quando: relogio.agora(), pronta };
      emAndamento = undefined;
      return pronta;
    });
    return emAndamento;
  };
}
