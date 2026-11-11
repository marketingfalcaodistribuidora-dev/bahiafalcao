// Calcula o "antes e depois" dos campos que mudaram, para o histórico (CA13.1).
export type Diferencas = Record<string, { antes: ValorHistorico; depois: ValorHistorico }>;
export type ValorHistorico = string | number | boolean | null;

/** Datas viram ISO; decimais (Prisma.Decimal) e outros objetos viram texto. */
function normalizar(valor: unknown): ValorHistorico {
  if (valor === undefined || valor === null) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") return valor;
  return String(valor);
}

export function diferencas(antes: Record<string, unknown>, depois: Record<string, unknown>): Diferencas {
  const campos: Diferencas = {};
  for (const campo of new Set([...Object.keys(antes), ...Object.keys(depois)])) {
    const a = normalizar(antes[campo]);
    const d = normalizar(depois[campo]);
    if (a !== d) campos[campo] = { antes: a, depois: d };
  }
  return campos;
}
