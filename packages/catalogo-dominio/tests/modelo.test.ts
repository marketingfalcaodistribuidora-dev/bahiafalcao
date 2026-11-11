// Modelo do catálogo e do painel (spec 002 CA7.1–7.3; plano 003 §5).
// Médio: PostgreSQL real, papel do painel (o mesmo que a aplicação usa).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { clientePainel, limparBanco } from "./apoio/banco";

const banco = clientePainel();

beforeEach(limparBanco);
afterAll(() => banco.$disconnect());

describe("produto", () => {
  it("nasce como rascunho, do cadastro, na versão 1 e com datas preenchidas (002 CA7.1)", async () => {
    const produto = await banco.produto.create({ data: { nome: "Catraca de freio", slug: "catraca-de-freio" } });

    expect(produto.situacao).toBe("RASCUNHO");
    expect(produto.origem).toBe("CADASTRO");
    expect(produto.versao).toBe(1);
    expect(produto.criadoEm).toBeInstanceOf(Date);
    expect(produto.atualizadoEm).toBeInstanceOf(Date);
  });

  it("guarda aplicação, especificações e observações como texto formatado (002 CA7.3)", async () => {
    const produto = await banco.produto.create({
      data: {
        nome: "Parafuso de roda",
        slug: "parafuso-de-roda",
        aplicacao: "- Scania 124\n- Volvo FH",
        especificacoes: "- **Rosca:** M22 x 1,5",
        observacoes: "Vendido em caixa com 10.",
      },
    });

    expect(produto.aplicacao).toBe("- Scania 124\n- Volvo FH");
    expect(produto.especificacoes).toBe("- **Rosca:** M22 x 1,5");
    expect(produto.observacoes).toBe("Vendido em caixa com 10.");
  });

  it("não aceita dois produtos com o mesmo endereço (slug)", async () => {
    await banco.produto.create({ data: { nome: "Catraca", slug: "catraca" } });

    await expect(banco.produto.create({ data: { nome: "Outra catraca", slug: "catraca" } })).rejects.toThrow();
  });
});

describe("categorias do produto", () => {
  it("guarda o modelo de especificações da categoria (002 CA7.3)", async () => {
    const categoria = await banco.categoria.create({
      data: { nome: "Parafusos", slug: "parafusos", modeloEspecificacoes: "- **Diâmetro:**\n- **Comprimento:**" },
    });

    expect(categoria.modeloEspecificacoes).toBe("- **Diâmetro:**\n- **Comprimento:**");
  });

  it("aceita o mesmo produto em várias categorias", async () => {
    const produto = await banco.produto.create({ data: { nome: "Lona de freio", slug: "lona-de-freio" } });
    const freios = await banco.categoria.create({ data: { nome: "Freios", slug: "freios" } });
    const importados = await banco.categoria.create({ data: { nome: "Importados", slug: "importados" } });

    await banco.produtoCategoria.create({ data: { produtoId: produto.id, categoriaId: freios.id, principal: true } });
    await banco.produtoCategoria.create({ data: { produtoId: produto.id, categoriaId: importados.id } });

    expect(await banco.produtoCategoria.count({ where: { produtoId: produto.id } })).toBe(2);
  });

  it("recusa uma segunda categoria principal para o mesmo produto", async () => {
    const produto = await banco.produto.create({ data: { nome: "Lona de freio", slug: "lona-de-freio" } });
    const freios = await banco.categoria.create({ data: { nome: "Freios", slug: "freios" } });
    const importados = await banco.categoria.create({ data: { nome: "Importados", slug: "importados" } });
    await banco.produtoCategoria.create({ data: { produtoId: produto.id, categoriaId: freios.id, principal: true } });

    await expect(
      banco.produtoCategoria.create({ data: { produtoId: produto.id, categoriaId: importados.id, principal: true } }),
    ).rejects.toThrow();
  });
});

describe("marcas do produto", () => {
  it("aceita a mesma marca como fabricante e como montadora do mesmo produto", async () => {
    const produto = await banco.produto.create({ data: { nome: "Filtro", slug: "filtro" } });
    const marca = await banco.marca.create({
      data: { nome: "Mercedes-Benz", slug: "mercedes-benz", tipo: "MONTADORA" },
    });

    await banco.produtoMarca.create({ data: { produtoId: produto.id, marcaId: marca.id, papel: "FABRICANTE" } });
    await banco.produtoMarca.create({ data: { produtoId: produto.id, marcaId: marca.id, papel: "MONTADORA" } });

    expect(await banco.produtoMarca.count({ where: { produtoId: produto.id } })).toBe(2);
  });
});

describe("variações e código interno", () => {
  it("recusa duas variações com o mesmo código interno", async () => {
    const produto = await banco.produto.create({ data: { nome: "Anel elástico", slug: "anel-elastico" } });
    const v1 = await banco.variacao.create({ data: { produtoId: produto.id, descricao: "20 mm" } });
    const v2 = await banco.variacao.create({ data: { produtoId: produto.id, descricao: "22 mm" } });
    await banco.variacaoInterna.create({ data: { variacaoId: v1.id, codigoInterno: "EX-0001" } });

    await expect(
      banco.variacaoInterna.create({ data: { variacaoId: v2.id, codigoInterno: "EX-0001" } }),
    ).rejects.toThrow();
  });
});

describe("orçamentos", () => {
  it("numera os orçamentos em sequência", async () => {
    const usuario = await criarUsuario();

    const primeiro = await banco.orcamento.create({ data: { criadoPorId: usuario.id } });
    const segundo = await banco.orcamento.create({ data: { criadoPorId: usuario.id } });

    expect(segundo.numero).toBe(primeiro.numero + 1);
    expect(primeiro.situacao).toBe("RASCUNHO");
  });

  it("recusa a mesma variação duas vezes no mesmo orçamento", async () => {
    const usuario = await criarUsuario();
    const orcamento = await banco.orcamento.create({ data: { criadoPorId: usuario.id } });
    const variacao = await criarVariacao();
    const item = { orcamentoNumero: orcamento.numero, variacaoId: variacao.id, nomeNoMomento: "Catraca", ordem: 1 };
    await banco.orcamentoItem.create({ data: item });

    await expect(banco.orcamentoItem.create({ data: item })).rejects.toThrow();
  });

  it("recusa quantidade menor que 1", async () => {
    const usuario = await criarUsuario();
    const orcamento = await banco.orcamento.create({ data: { criadoPorId: usuario.id } });
    const variacao = await criarVariacao();

    await expect(
      banco.orcamentoItem.create({
        data: {
          orcamentoNumero: orcamento.numero,
          variacaoId: variacao.id,
          nomeNoMomento: "Catraca",
          ordem: 1,
          quantidade: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it("guarda o valor unitário com centavos exatos", async () => {
    const usuario = await criarUsuario();
    const orcamento = await banco.orcamento.create({ data: { criadoPorId: usuario.id } });
    const variacao = await criarVariacao();

    const item = await banco.orcamentoItem.create({
      data: {
        orcamentoNumero: orcamento.numero,
        variacaoId: variacao.id,
        nomeNoMomento: "Catraca",
        ordem: 1,
        valorUnitario: "1234.56",
      },
    });

    expect(item.valorUnitario?.toString()).toBe("1234.56");
  });
});

async function criarUsuario() {
  const perfil = await banco.perfil.create({ data: { nome: "Comercial", permissoes: ["orcamentos"] } });
  return banco.usuario.create({
    data: { nome: "Ana", email: "ana@exemplo.com", senhaHash: "x", perfilId: perfil.id },
  });
}

async function criarVariacao() {
  const produto = await banco.produto.create({ data: { nome: "Catraca", slug: "catraca" } });
  return banco.variacao.create({ data: { produtoId: produto.id, descricao: "Lado direito" } });
}
