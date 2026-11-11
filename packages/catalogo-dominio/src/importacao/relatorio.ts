// Relatório da importação (spec 002 CA1.6). Lista alertas com códigos internos:
// é gravado só em pasta fora do Git (importacao-relatorios/).
import type { ResultadoMontagem } from "./montar";

export type Relatorio = {
  contagens: {
    cards: number;
    produtos: number;
    cardsUnidos: number;
    variacoes: number;
    referencias: number;
    semFoto: number;
    nomesARevisar: number;
    rascunhos: number;
    comPendencia: number;
    alertas: number;
  };
  alertas: string[];
  pendenciasPorTipo: Record<string, number>;
};

export function montarRelatorio(r: ResultadoMontagem): Relatorio {
  const cards = r.produtos.reduce((n, p) => n + p.origens.length, 0);
  const pendenciasPorTipo: Record<string, number> = {};
  for (const p of r.produtos.flatMap((p) => p.pendencias))
    pendenciasPorTipo[p.tipo] = (pendenciasPorTipo[p.tipo] ?? 0) + 1;
  return {
    contagens: {
      cards,
      produtos: r.produtos.length,
      cardsUnidos: cards - r.produtos.length,
      variacoes: r.produtos.reduce((n, p) => n + p.variacoes.length, 0),
      referencias: r.produtos.reduce((n, p) => n + p.referencias.length, 0),
      semFoto: r.produtos.filter((p) => !p.fotos.length).length,
      nomesARevisar: r.produtos.filter((p) => p.revisarNome).length,
      rascunhos: r.produtos.filter((p) => p.situacao === "RASCUNHO").length,
      comPendencia: r.produtos.filter((p) => p.pendencias.length).length,
      alertas: r.alertas.length,
    },
    alertas: r.alertas,
    pendenciasPorTipo,
  };
}

export function relatorioEmMarkdown(rel: Relatorio): string {
  const c = rel.contagens;
  return [
    "# Relatório da importação do catálogo",
    "",
    "> Contém códigos internos: não versionar.",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Cards do PDF | ${c.cards} |`,
    `| Produtos | ${c.produtos} |`,
    `| Cards unidos (repetidos) | ${c.cardsUnidos} |`,
    `| Variações | ${c.variacoes} |`,
    `| Referências publicadas | ${c.referencias} |`,
    `| Sem foto | ${c.semFoto} |`,
    `| Nomes a revisar | ${c.nomesARevisar} |`,
    `| Rascunhos (sem categoria) | ${c.rascunhos} |`,
    `| Produtos com pendência | ${c.comPendencia} |`,
    `| Alertas | ${c.alertas} |`,
    "",
    "## Pendências por tipo",
    "",
    ...Object.entries(rel.pendenciasPorTipo).map(([tipo, n]) => `- ${tipo}: ${n}`),
    "",
    "## Alertas",
    "",
    ...(rel.alertas.length ? rel.alertas.map((a) => `- ${a}`) : ["Nenhum."]),
    "",
  ].join("\n");
}
