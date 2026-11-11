// Colunas de busca do produto (plano 002 §2.2; spec 002 CA3.1, CA3.3, CA3.4).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { recalcularBusca } from "../src/busca/recalcular";
import { clientePainel, limparBanco } from "./apoio/banco";

const banco = clientePainel();

beforeEach(limparBanco);
afterAll(() => banco.$disconnect());

/** Catraca de freio, montadora Scania, categoria Freios, com dado interno e referência em alerta. */
async function criarCatraca() {
  const produto = await banco.produto.create({
    data: {
      nome: "Catraca de freio",
      slug: "catraca-de-freio",
      nomeCatalogo: "CATR FR AUT",
      aplicacao: "- Eixo traseiro",
    },
  });
  const scania = await banco.marca.create({ data: { nome: "Scania", slug: "scania", tipo: "MONTADORA" } });
  const freios = await banco.categoria.create({ data: { nome: "Freios", slug: "freios" } });
  await banco.produtoMarca.create({ data: { produtoId: produto.id, marcaId: scania.id, papel: "MONTADORA" } });
  await banco.produtoCategoria.create({ data: { produtoId: produto.id, categoriaId: freios.id, principal: true } });
  const variacao = await banco.variacao.create({ data: { produtoId: produto.id, descricao: "Lado direito" } });
  await banco.variacaoInterna.create({
    data: { variacaoId: variacao.id, codigoInterno: "EX-0001", codigoNormalizado: "EX0001", imposto: "6.50" },
  });
  await banco.referencia.create({
    data: { produtoId: produto.id, codigo: "SC-03.158", codigoNormalizado: "SC03158" },
  });
  await banco.referencia.create({
    data: { produtoId: produto.id, codigo: "EX-0001", codigoNormalizado: "EX0001", publicada: false },
  });
  return produto;
}

async function casa(produtoId: number, config: string, consulta: string): Promise<boolean> {
  const [linha] = await banco.$queryRaw<{ casa: boolean }[]>`
    SELECT "buscaTexto" @@ to_tsquery(${config}::regconfig, ${consulta}) AS casa FROM "Produto" WHERE id = ${produtoId}`;
  return linha?.casa ?? false;
}

describe("recalcularBusca", () => {
  it("acha pelo nome e pela montadora, sem acento e sem diferença de caixa (002 CA3.1)", async () => {
    const produto = await criarCatraca();

    await banco.$transaction((tx) => recalcularBusca(tx, produto.id));

    const [linha] = await banco.$queryRaw<{ casa: boolean }[]>`
      SELECT "buscaTexto" @@ websearch_to_tsquery('portuguese_unaccent', 'CATRÁCA scania') AS casa
        FROM "Produto" WHERE id = ${produto.id}`;
    expect(linha?.casa).toBe(true);
  });

  it("dá peso A ao nome e peso B à montadora e à categoria", async () => {
    const produto = await criarCatraca();

    await banco.$transaction((tx) => recalcularBusca(tx, produto.id));

    expect(await casa(produto.id, "portuguese_unaccent", "catraca:A")).toBe(true);
    expect(await casa(produto.id, "portuguese_unaccent", "scania:B")).toBe(true);
    expect(await casa(produto.id, "portuguese_unaccent", "freios:B")).toBe(true);
    expect(await casa(produto.id, "portuguese_unaccent", "scania:A")).toBe(false);
  });

  it("acha pelo nome abreviado do catálogo antigo (002 CA3.3)", async () => {
    const produto = await criarCatraca();

    await banco.$transaction((tx) => recalcularBusca(tx, produto.id));

    expect(await casa(produto.id, "simple", "catr & fr")).toBe(true);
  });

  it("guarda as referências publicadas normalizadas para a busca por código (002 CA3.2)", async () => {
    const produto = await criarCatraca();

    await banco.$transaction((tx) => recalcularBusca(tx, produto.id));

    const { buscaCodigos } = await banco.produto.findUniqueOrThrow({ where: { id: produto.id } });
    expect(buscaCodigos).toBe("SC03158");
  });

  it("nunca põe código interno nem imposto nas colunas de busca (002 CA3.4)", async () => {
    const produto = await criarCatraca();

    await banco.$transaction((tx) => recalcularBusca(tx, produto.id));

    const [linha] = await banco.$queryRaw<{ texto: string; codigos: string }[]>`
      SELECT "buscaTexto"::text AS texto, "buscaCodigos" AS codigos FROM "Produto" WHERE id = ${produto.id}`;
    const tudo = `${linha?.texto} ${linha?.codigos}`.toLowerCase();
    expect(tudo).not.toContain("0001");
    expect(tudo).not.toContain("ex0001");
    expect(tudo).not.toContain("6.5");
    expect(tudo).not.toContain("6,5");
  });
});
