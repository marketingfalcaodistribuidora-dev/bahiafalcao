// Grava uma entrada do histórico dentro da transação de quem altera (plano 003 §2.4).
// Se a alteração falhar, a transação desfaz o registro junto.
import type { Prisma } from "../generated/prisma/client";
import { diferencas } from "./diferencas";

export type DadosAlteracao = {
  usuarioId: number | null;
  entidade: string;
  entidadeId: number;
  versao?: number;
  /** "criar", "editar", "publicar", "excluir"... */
  acao: string;
  antes: Record<string, unknown>;
  depois: Record<string, unknown>;
};

export async function registrarAlteracao(tx: Prisma.TransactionClient, dados: DadosAlteracao): Promise<void> {
  const campos = diferencas(dados.antes, dados.depois);
  // Uma edição sem mudança real não polui o histórico; eventos (publicar, excluir...) sempre ficam.
  if (dados.acao === "editar" && Object.keys(campos).length === 0) return;
  await tx.alteracao.create({
    data: {
      usuarioId: dados.usuarioId,
      entidade: dados.entidade,
      entidadeId: dados.entidadeId,
      versao: dados.versao ?? null,
      acao: dados.acao,
      campos,
    },
  });
}
