// Importação completa da fixture para o PostgreSQL (spec 002 CA1.1, CA1.5–CA1.8, CA4.2; 003 CA14.3).
import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lerCatalogoExtraido } from "../src/importacao/entrada";
import { gravarImportacao, ImportacaoRecusada } from "../src/importacao/gravar";
import { montarImportacao } from "../src/importacao/montar";
import { montarRelatorio } from "../src/importacao/relatorio";
import { verificarSigilo } from "../src/importacao/sigilo";
import { clientePainel, conexaoPublica, limparBanco } from "./apoio/banco";

const banco = clientePainel();
const cards = lerCatalogoExtraido(
  JSON.parse(readFileSync(new URL("./fixtures/catalogo/produtos.json", import.meta.url), "utf-8")),
);
const codigosDaFixture = [...new Set(cards.flatMap((c) => c.variantes.map((v) => v.codigo)))].sort();
const montar = () => montarImportacao(cards, { local: "Feira de Santana – BA" });

beforeEach(limparBanco);
afterAll(() => banco.$disconnect());

describe("gravarImportacao", () => {
  it("importa todo código interno e registra a origem de cada card (002 CA1.1)", async () => {
    await gravarImportacao(banco, montar());

    const codigos = await banco.variacaoInterna.findMany({ select: { codigoInterno: true } });
    expect(codigos.map((c) => c.codigoInterno).sort()).toEqual(codigosDaFixture);
    expect(await banco.produto.count()).toBe(14);
    expect(await banco.cardOrigem.count()).toBe(16);
  });

  it("guarda o imposto só na tabela interna", async () => {
    await gravarImportacao(banco, montar());

    const interna = await banco.variacaoInterna.findUniqueOrThrow({ where: { codigoInterno: "EX-0101" } });
    expect(interna.imposto?.toString()).toBe("9.99");
  });

  it("mantém a ordem do PDF dentro da categoria (002 CA1.8, 003 CA14.3)", async () => {
    await gravarImportacao(banco, montar());

    const balancas = await banco.categoria.findUniqueOrThrow({
      where: { slug: "balancas-suportes-e-pinos" },
      include: { produtos: { orderBy: { ordem: "asc" }, include: { produto: { select: { nome: true } } } } },
    });
    expect(balancas.produtos.map((pc) => pc.produto.nome)).toEqual([
      "Suporte mola traseiro",
      "Suporte mola dianteiro",
      "Suporte mola Mercedes-Benz para dianteiro e traseiro",
    ]);
  });

  it("importar duas vezes gera o mesmo banco, com os mesmos endereços (002 CA1.5)", async () => {
    await gravarImportacao(banco, montar());
    const antes = await banco.produto.findMany({ orderBy: { slug: "asc" }, select: { slug: true, nome: true } });

    await gravarImportacao(banco, montar());

    const depois = await banco.produto.findMany({ orderBy: { slug: "asc" }, select: { slug: true, nome: true } });
    expect(depois).toEqual(antes);
    expect(await banco.variacaoInterna.count()).toBe(codigosDaFixture.length);
  });

  it("deixa a busca pronta: acha o produto pelo nome", async () => {
    await gravarImportacao(banco, montar());

    const achados = await banco.$queryRaw<{ nome: string }[]>`
      SELECT nome FROM "Produto" WHERE "buscaTexto" @@ websearch_to_tsquery('portuguese_unaccent', 'valvula pedal')`;
    expect(achados.map((a) => a.nome)).toEqual(["Válvula pedal freio"]);
  });

  it("nenhuma tabela pública, lida pelo papel público, contém código interno (002 CA4.2)", async () => {
    await gravarImportacao(banco, montar());
    const publico = await conexaoPublica();

    try {
      const textos = [];
      for (const tabela of [
        "Categoria",
        "Grupo",
        "Imagem",
        "Marca",
        "Produto",
        "ProdutoCategoria",
        "ProdutoMarca",
        "Referencia",
        "SlugAntigo",
        "Variacao",
      ]) {
        const { rows } = await publico.query<{ linha: string }>(
          `SELECT row_to_json(t)::text AS linha FROM "${tabela}" t`,
        );
        textos.push(...rows.map((r) => ({ onde: tabela, texto: r.linha })));
      }
      expect(textos.length).toBeGreaterThan(0);
      expect(verificarSigilo(textos, codigosDaFixture)).toEqual([]);
    } finally {
      await publico.end();
    }
  });

  it("liga cada card de origem à categoria da sua página (Lançamentos não é categoria)", async () => {
    await gravarImportacao(banco, montar());

    expect(await banco.cardOrigem.count({ where: { categoriaId: { not: null } } })).toBe(13);
    const cuica = await banco.cardOrigem.findFirstOrThrow({ where: { pagina: 13 }, include: { categoria: true } });
    expect(cuica.categoria?.nome).toBe("Cuícas, catracas e acessórios");
  });

  it("confere o banco depois de gravar e desfaz tudo se achar código interno em tabela pública", async () => {
    const comVazamento = montar();
    const filtro = comVazamento.produtos.find((p) => p.chave === "EX-1301")!;
    filtro.observacoes = "Substitui o EX-0102";

    await expect(gravarImportacao(banco, comVazamento)).rejects.toThrow(/sigilo/);
    expect(await banco.produto.count()).toBe(0);
  });
});

describe("trava da importação (002 CA1.7)", () => {
  it("recusa banco com produto editado depois da importação, sem mexer em nada", async () => {
    await gravarImportacao(banco, montar());
    await banco.produto.updateMany({ where: { nome: "Filtro ar" }, data: { editadoManualmente: true } });

    await expect(gravarImportacao(banco, montar())).rejects.toThrow(ImportacaoRecusada);
    expect(await banco.produto.count()).toBe(14);
  });

  it("recusa banco com produto criado pelo cadastro", async () => {
    await banco.produto.create({ data: { nome: "Produto novo", slug: "produto-novo", origem: "CADASTRO" } });

    await expect(gravarImportacao(banco, montar())).rejects.toThrow(/cadastro/);
  });

  it("recusa banco com localização preenchida", async () => {
    await gravarImportacao(banco, montar());
    const produto = await banco.produto.findFirstOrThrow();
    await banco.produtoInterno.update({ where: { produtoId: produto.id }, data: { localizacao: "Corredor 3" } });

    await expect(gravarImportacao(banco, montar())).rejects.toThrow(/localização/);
  });

  it("recusa banco com orçamento", async () => {
    await gravarImportacao(banco, montar());
    const perfil = await banco.perfil.create({ data: { nome: "Comercial", permissoes: ["orcamentos"] } });
    const ana = await banco.usuario.create({
      data: { nome: "Ana", email: "ana@exemplo.com", senhaHash: "x", perfilId: perfil.id },
    });
    await banco.orcamento.create({ data: { criadoPorId: ana.id } });

    await expect(gravarImportacao(banco, montar())).rejects.toThrow(/orçamento/);
  });

  it("recusa banco com qualquer alteração registrada no histórico do painel", async () => {
    await gravarImportacao(banco, montar());
    await banco.alteracao.create({ data: { entidade: "Categoria", entidadeId: 1, acao: "editar" } });

    await expect(gravarImportacao(banco, montar())).rejects.toThrow(/histórico/);
  });

  it("recusa banco com categoria organizada no painel (grupo, texto ou SEO)", async () => {
    await gravarImportacao(banco, montar());
    await banco.categoria.updateMany({ where: { slug: "filtros" }, data: { descricao: "Filtros de ar e óleo" } });

    await expect(gravarImportacao(banco, montar())).rejects.toThrow(/categoria/);
  });

  it("não deixa duas importações rodarem ao mesmo tempo", async () => {
    const resultados = await Promise.allSettled([gravarImportacao(banco, montar()), gravarImportacao(banco, montar())]);

    expect(resultados.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await banco.produto.count()).toBe(14);
  });

  it("recusa montagem com violação de sigilo", async () => {
    const comVazamento = montar();
    comVazamento.violacoesDeSigilo = ["EX-0101 · nome: contém o código interno EX-0102"];

    await expect(gravarImportacao(banco, comVazamento)).rejects.toThrow(/sigilo/);
    expect(await banco.produto.count()).toBe(0);
  });
});

describe("montarRelatorio (002 CA1.6)", () => {
  it("conta cards, produtos, cards unidos, sem foto, a revisar, pendências e alertas", () => {
    const relatorio = montarRelatorio(montar());

    expect(relatorio.contagens).toEqual({
      cards: 16,
      produtos: 14,
      cardsUnidos: 2,
      variacoes: 18,
      referencias: 10,
      semFoto: 2,
      nomesARevisar: 1,
      rascunhos: 1,
      comPendencia: 5,
      alertas: 1,
    });
    expect(relatorio.alertas).toEqual(["EX-1201: referência igual a um código interno (EX-0301)"]);
  });
});
