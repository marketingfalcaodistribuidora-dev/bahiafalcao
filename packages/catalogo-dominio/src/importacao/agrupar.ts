// Etapa 1 da importação (plano 002 §2.3; spec 002 E1): cards que compartilham um código
// interno são o mesmo produto (componentes conectados). Cards sem código em comum
// continuam separados: 1 card do PDF = 1 produto, com as medidas como variações.
import type { CardExtraido, VarianteExtraida } from "./entrada";

export type OrigemCard = { pagina: number; ordem: number; secao: string; textoOriginal: string };

export type GrupoImportado = {
  /** Menor código interno do grupo: chave estável entre importações. */
  chave: string;
  cards: CardExtraido[];
  origens: OrigemCard[];
  /** Seções do PDF em que o produto aparece, na ordem do PDF, sem repetição. */
  secoes: string[];
  /** Variações sem repetição de código, na ordem em que aparecem. */
  variantes: VarianteExtraida[];
};

const menor = (a: string, b: string) => (a.localeCompare(b, "pt-BR", { numeric: true }) <= 0 ? a : b);

export function agrupar(cards: CardExtraido[]): GrupoImportado[] {
  const pai = cards.map((_, i) => i);
  const raiz = (i: number): number => {
    while (pai[i] !== i) {
      pai[i] = pai[pai[i]!]!;
      i = pai[i]!;
    }
    return i;
  };

  const donoDoCodigo = new Map<string, number>();
  cards.forEach((card, i) => {
    for (const { codigo } of card.variantes) {
      const dono = donoDoCodigo.get(codigo);
      if (dono === undefined) donoDoCodigo.set(codigo, i);
      else pai[raiz(i)] = raiz(dono);
    }
  });

  // Ordem dentro da página: posição do card entre os cards da mesma página.
  const ordemNaPagina: number[] = [];
  const contagem = new Map<number, number>();
  for (const card of cards) {
    const n = (contagem.get(card.pagina_pdf) ?? 0) + 1;
    contagem.set(card.pagina_pdf, n);
    ordemNaPagina.push(n);
  }

  // Map preserva a ordem de inserção: cada grupo entra na posição do seu primeiro card.
  const indicesPorGrupo = new Map<number, number[]>();
  cards.forEach((_, i) => {
    const r = raiz(i);
    indicesPorGrupo.set(r, [...(indicesPorGrupo.get(r) ?? []), i]);
  });
  const ordenados = [...indicesPorGrupo.values()].sort((a, b) => a[0]! - b[0]!);

  return ordenados.map((indices) => {
    const doGrupo = indices.map((i) => cards[i]!);
    const variantes = new Map<string, VarianteExtraida>();
    for (const v of doGrupo.flatMap((c) => c.variantes)) if (!variantes.has(v.codigo)) variantes.set(v.codigo, v);
    return {
      chave: [...variantes.keys()].reduce(menor),
      cards: doGrupo,
      origens: indices.map((i) => ({
        pagina: cards[i]!.pagina_pdf,
        ordem: ordemNaPagina[i]!,
        secao: cards[i]!.secao,
        textoOriginal: cards[i]!.texto_completo,
      })),
      secoes: [...new Set(doGrupo.map((c) => c.secao))],
      variantes: [...variantes.values()],
    };
  });
}
