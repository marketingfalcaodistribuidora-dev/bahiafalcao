// Recalcula as colunas de busca do produto (plano 002, §2.2). Chamada na MESMA transação
// de qualquer alteração que mude o que é buscável.
//   Peso A: nome por extenso (portuguese_unaccent)
//   Peso B: marcas, montadoras e categorias (portuguese_unaccent)
//   Peso C: nome abreviado, variações e referências (simple, sem radicalização)
//   Peso D: aplicação e especificações (portuguese_unaccent)
// SÓ dados públicos entram: a consulta abaixo nem carrega as tabelas internas,
// e referências não publicadas (em alerta) ficam de fora.
import { textoSimples } from "@falcao/texto-formatado";
import type { Prisma } from "../generated/prisma/client";
import { normalizarCodigo } from "./normalizar";

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
      referencias: { where: { publicada: true }, select: { codigo: true, codigoNormalizado: true } },
    },
  });

  const pesoA = p.nome;
  const pesoB = [...p.marcas.map((m) => m.marca.nome), ...p.categorias.map((c) => c.categoria.nome)].join(" ");
  const pesoC = [
    p.nomeCatalogo,
    ...p.variacoes.flatMap((v) => [v.descricao, v.nomeCatalogo]),
    ...p.referencias.map((r) => r.codigo),
  ].join(" ");
  const pesoD = [textoSimples(p.aplicacao), textoSimples(p.especificacoes)].join(" ");
  const codigos = [...new Set(p.referencias.map((r) => r.codigoNormalizado || normalizarCodigo(r.codigo)))].join(" ");

  await tx.$executeRaw`
    UPDATE "Produto" SET
      "buscaTexto" =
        setweight(to_tsvector('portuguese_unaccent', ${pesoA}), 'A') ||
        setweight(to_tsvector('portuguese_unaccent', ${pesoB}), 'B') ||
        setweight(to_tsvector('simple', unaccent(${pesoC})), 'C') ||
        setweight(to_tsvector('portuguese_unaccent', ${pesoD}), 'D'),
      "buscaCodigos" = ${codigos}
    WHERE id = ${produtoId}`;
}
