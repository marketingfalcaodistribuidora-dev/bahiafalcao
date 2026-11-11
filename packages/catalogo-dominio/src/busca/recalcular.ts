// Colunas de busca do produto (plano 002, §2.2). Atualizadas na MESMA transação
// de qualquer alteração que mude o que é buscável.
//   Peso A: nome por extenso (portuguese_unaccent)
//   Peso B: marcas, montadoras e categorias (portuguese_unaccent)
//   Peso C: nome abreviado, variações e referências (simple, sem radicalização)
//   Peso D: aplicação e especificações (portuguese_unaccent)
// SÓ dados públicos entram: nada de tabela interna, e só referências publicadas.
import { textoSimples } from "@falcao/texto-formatado";
import type { Prisma } from "../generated/prisma/client";
import { normalizarCodigo } from "./normalizar";

export type DadosDeBusca = {
  nome: string;
  nomeCatalogo: string;
  aplicacao: string;
  especificacoes: string;
  marcas: string[];
  categorias: string[];
  variacoes: { descricao: string; nomeCatalogo: string }[];
  /** Só as referências publicadas. */
  referencias: { codigo: string; codigoNormalizado?: string }[];
};

export type TextosDeBusca = { a: string; b: string; c: string; d: string; codigos: string };

export function textosDeBusca(p: DadosDeBusca): TextosDeBusca {
  return {
    a: p.nome,
    b: [...p.marcas, ...p.categorias].join(" "),
    c: [
      p.nomeCatalogo,
      ...p.variacoes.flatMap((v) => [v.descricao, v.nomeCatalogo]),
      ...p.referencias.map((r) => r.codigo),
    ].join(" "),
    d: [textoSimples(p.aplicacao), textoSimples(p.especificacoes)].join(" "),
    codigos: [...new Set(p.referencias.map((r) => r.codigoNormalizado || normalizarCodigo(r.codigo)))].join(" "),
  };
}

/** Grava as colunas de busca de vários produtos num único comando. */
export async function gravarBuscaEmLote(
  tx: Prisma.TransactionClient,
  itens: { produtoId: number; textos: TextosDeBusca }[],
): Promise<void> {
  if (!itens.length) return;
  const coluna = (f: (t: TextosDeBusca) => string) => itens.map((i) => f(i.textos));
  await tx.$executeRaw`
    UPDATE "Produto" AS p SET
      "buscaTexto" =
        setweight(to_tsvector('portuguese_unaccent', u.a), 'A') ||
        setweight(to_tsvector('portuguese_unaccent', u.b), 'B') ||
        setweight(to_tsvector('simple', unaccent(u.c)), 'C') ||
        setweight(to_tsvector('portuguese_unaccent', u.d), 'D'),
      "buscaCodigos" = u.codigos
    FROM unnest(
      ${itens.map((i) => i.produtoId)}::int[],
      ${coluna((t) => t.a)}::text[], ${coluna((t) => t.b)}::text[],
      ${coluna((t) => t.c)}::text[], ${coluna((t) => t.d)}::text[],
      ${coluna((t) => t.codigos)}::text[]
    ) AS u(id, a, b, c, d, codigos)
    WHERE p.id = u.id`;
}

export async function recalcularBusca(tx: Prisma.TransactionClient, produtoId: number): Promise<void> {
  const p = await tx.produto.findUniqueOrThrow({
    where: { id: produtoId },
    select: {
      nome: true,
      nomeCatalogo: true,
      aplicacao: true,
      especificacoes: true,
      marcas: { select: { marca: { select: { nome: true } } } },
      categorias: { select: { categoria: { select: { nome: true } } } },
      variacoes: { where: { excluidaEm: null }, select: { descricao: true, nomeCatalogo: true } },
      referencias: {
        where: { publicada: true, OR: [{ variacaoId: null }, { variacao: { excluidaEm: null } }] },
        select: { codigo: true, codigoNormalizado: true },
      },
    },
  });
  const textos = textosDeBusca({
    ...p,
    marcas: p.marcas.map((m) => m.marca.nome),
    categorias: p.categorias.map((c) => c.categoria.nome),
  });
  await gravarBuscaEmLote(tx, [{ produtoId, textos }]);
}
