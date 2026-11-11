// Histórico de alterações (plano 003 §2.4): grava quem, quando, entidade, versão e
// campos (antes e depois) NA MESMA TRANSAÇÃO da alteração.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { registrarAlteracao } from "../src/historico/registrar";
import { clientePainel, limparBanco } from "./apoio/banco";

const banco = clientePainel();

beforeEach(limparBanco);
afterAll(() => banco.$disconnect());

async function criarAna() {
  const perfil = await banco.perfil.create({ data: { nome: "Cadastro", permissoes: ["editar_produtos"] } });
  return banco.usuario.create({ data: { nome: "Ana", email: "ana@exemplo.com", senhaHash: "x", perfilId: perfil.id } });
}

describe("registrarAlteracao", () => {
  it("grava quem alterou, a entidade, a versão e o antes e depois de cada campo alterado", async () => {
    const ana = await criarAna();
    const produto = await banco.produto.create({ data: { nome: "Catraca", slug: "catraca" } });

    await banco.$transaction(async (tx) => {
      const depois = await tx.produto.update({
        where: { id: produto.id },
        data: { nome: "Catraca de freio", versao: 2 },
      });
      await registrarAlteracao(tx, {
        usuarioId: ana.id,
        entidade: "Produto",
        entidadeId: produto.id,
        versao: depois.versao,
        acao: "editar",
        antes: { nome: produto.nome },
        depois: { nome: depois.nome },
      });
    });

    const [registro] = await banco.alteracao.findMany();
    expect(registro).toMatchObject({
      usuarioId: ana.id,
      entidade: "Produto",
      entidadeId: produto.id,
      versao: 2,
      acao: "editar",
      campos: { nome: { antes: "Catraca", depois: "Catraca de freio" } },
    });
  });

  it("não grava nada se a alteração falhar depois do registro", async () => {
    const ana = await criarAna();
    const produto = await banco.produto.create({ data: { nome: "Catraca", slug: "catraca" } });

    await expect(
      banco.$transaction(async (tx) => {
        await registrarAlteracao(tx, {
          usuarioId: ana.id,
          entidade: "Produto",
          entidadeId: produto.id,
          acao: "editar",
          antes: { nome: "Catraca" },
          depois: { nome: "Outro" },
        });
        throw new Error("falha na gravação do produto");
      }),
    ).rejects.toThrow("falha na gravação do produto");

    expect(await banco.alteracao.count()).toBe(0);
  });

  it("não grava registro quando nenhum campo mudou", async () => {
    const ana = await criarAna();

    await banco.$transaction((tx) =>
      registrarAlteracao(tx, {
        usuarioId: ana.id,
        entidade: "Produto",
        entidadeId: 1,
        acao: "editar",
        antes: { nome: "Catraca" },
        depois: { nome: "Catraca" },
      }),
    );

    expect(await banco.alteracao.count()).toBe(0);
  });
});
