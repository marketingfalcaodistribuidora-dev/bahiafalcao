// Montagem da importação sobre a fixture anonimizada (16 cards do formato real).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerCatalogoExtraido } from "./entrada";
import { montarImportacao } from "./montar";

const cards = lerCatalogoExtraido(
  JSON.parse(readFileSync(new URL("../../tests/fixtures/catalogo/produtos.json", import.meta.url), "utf-8")),
);
const resultado = montarImportacao(cards, { local: "Feira de Santana – BA" });
const produto = (chave: string) => {
  const achado = resultado.produtos.find((p) => p.chave === chave);
  if (!achado) throw new Error(`produto ${chave} não montado`);
  return achado;
};

describe("montarImportacao: contagens", () => {
  it("16 cards viram 14 produtos (2 cards repetidos em outra página)", () => {
    expect(resultado.produtos).toHaveLength(14);
    expect(resultado.produtos.flatMap((p) => p.origens)).toHaveLength(16);
  });

  it("cria as categorias na ordem do PDF, sem 'Lançamentos' (002 CA1.8, R5)", () => {
    expect(resultado.categorias.map((c) => c.nome)).toEqual([
      "Importados",
      "Cuícas, catracas e acessórios",
      "Anel elástico, rolete e trava",
      "Sistema de roda",
      "Válvulas",
      "Bolsas e amortecedores de cabine",
      "Balanças, suportes e pinos",
      "Parafusos e porcas",
      "Filtros",
    ]);
  });

  it("não deixa nenhum código interno nem 'IMP (…)' em texto público", () => {
    expect(resultado.violacoesDeSigilo).toEqual([]);
  });

  it("gera endereços únicos", () => {
    const slugs = resultado.produtos.map((p) => p.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("montarImportacao: produtos", () => {
  it("importado com medidas: nome por extenso, uma variação por código e imposto interno", () => {
    const terminal = produto("EX-0101");

    expect(terminal.nome).toBe("Terminal roscado");
    expect(terminal.nomeCatalogo).toBe("TERMINAL ROSCADO");
    expect(terminal.categorias).toEqual([{ nome: "Importados", principal: true }]);
    expect(terminal.variacoes).toEqual([
      { codigoInterno: "EX-0101", descricao: "06 x 06", nomeCatalogo: "TERMINAL ROSCADO 06 X 06", imposto: "9.99" },
      { codigoInterno: "EX-0102", descricao: "08 x 06", nomeCatalogo: "TERMINAL ROSCADO 08 X 06", imposto: "9.99" },
      { codigoInterno: "EX-0103", descricao: "10 x 10", nomeCatalogo: "TERMINAL ROSCADO 10 X 10", imposto: "9.99" },
    ]);
  });

  it("card repetido vira um produto com a categoria da peça como principal e Importados junto", () => {
    const forquilha = produto("EX-0201");

    expect(forquilha.nome).toBe("Forquilha completa 3/4 cuíca");
    expect(forquilha.categorias).toEqual([
      { nome: "Cuícas, catracas e acessórios", principal: true },
      { nome: "Importados", principal: false },
    ]);
    expect(forquilha.variacoes).toEqual([
      { codigoInterno: "EX-0201", descricao: "", nomeCatalogo: "FORQUILHA COMPLETA 3/4 CUICA", imposto: "7.70" },
    ]);
  });

  it("número entre parênteses sem IMP é medida, não imposto", () => {
    expect(produto("EX-0501").variacoes.map((v) => [v.descricao, v.imposto])).toEqual([
      ["1,2", null],
      ["1,5", null],
    ]);
  });

  it("separa fabricante, montadora, logo e tipo de veículo", () => {
    const catraca = produto("EX-0301");

    expect(catraca.nome).toBe("Catraca automática 28 estrias dianteira lado esquerdo");
    expect(catraca.marcas).toEqual([
      { nome: "Master", papel: "FABRICANTE" },
      { nome: "Volvo", papel: "MONTADORA" },
      { nome: "Volvo", papel: "LOGO" },
    ]);
    expect(catraca.aplicacao).toBe("- Carreta / reboque");
  });

  it("lê a tabela de conversão e manda o destaque solto para pendência", () => {
    const tambor = produto("EX-0601");

    expect(tambor.referencias).toEqual([
      { codigo: "2SO-405-615A", codigoNormalizado: "2SO405615A", tipo: "ORIGINAL", marca: null },
      { codigo: "3588", codigoNormalizado: "3588", tipo: "EQUIVALENTE", marca: "Frum" },
      { codigo: "4313/6015", codigoNormalizado: "43136015", tipo: "EQUIVALENTE", marca: "Batista" },
    ]);
    expect(tambor.pendencias).toEqual([{ trecho: "USA-SE", tipo: "destaque" }]);
  });

  it("põe observação e medidas nos campos certos e respeita o 'a revisar' da extração", () => {
    expect(produto("EX-0701").observacoes).toBe("Acompanha reparo");
    const bucha = produto("EX-0801");
    expect(bucha.especificacoes).toBe("- **Dimensão:** 18X27MM\n- **Altura:** 40MM");
    expect(bucha.revisarNome).toBe(true);
  });

  it("lançamento que também está em outra página fica com aquela categoria e o selo Novo", () => {
    const suporte = produto("EX-0901");

    expect(suporte.novo).toBe(true);
    expect(suporte.categorias).toEqual([{ nome: "Balanças, suportes e pinos", principal: true }]);
    expect(suporte.referencias).toEqual([
      { codigo: "SC-03.158", codigoNormalizado: "SC03158", tipo: "SIMILAR", marca: "Silc" },
    ]);
  });

  it("lançamento só na página de lançamentos ganha a categoria deduzida pelo nome, com pendência para conferir", () => {
    const suporte = produto("EX-1001");

    expect(suporte.novo).toBe(true);
    expect(suporte.nome).toBe("Suporte mola Mercedes-Benz para dianteiro e traseiro");
    expect(suporte.categorias).toEqual([{ nome: "Balanças, suportes e pinos", principal: true }]);
    expect(suporte.pendencias).toContainEqual({
      trecho: "Categoria deduzida pelo nome: Balanças, suportes e pinos",
      tipo: "categoria",
    });
    expect(suporte.aplicacao).toBe("- Atego 1418, 1518");
  });

  it("lançamento sem categoria segura fica como rascunho, com pendência", () => {
    const kit = produto("EX-1101");

    expect(kit.categorias).toEqual([]);
    expect(kit.situacao).toBe("RASCUNHO");
    expect(kit.pendencias).toContainEqual({ trecho: "Lançamento sem categoria definida", tipo: "categoria" });
  });

  it("referência igual a código interno não vira referência pública: vira pendência e alerta", () => {
    const parafuso = produto("EX-1201");

    expect(parafuso.referencias).toEqual([]);
    expect(parafuso.pendencias).toContainEqual({
      trecho: "Referência igual a um código interno: EX-0301",
      tipo: "referencia-interna",
    });
    expect(resultado.alertas).toContain("EX-1201: referência igual a um código interno (EX-0301)");
  });

  it("fabricante de implemento é marca do tipo implemento e 'Ônibus' vai para a aplicação", () => {
    const filtro = produto("EX-1301");

    expect(filtro.aplicacao).toBe("- Ônibus");
    expect(resultado.marcas.find((m) => m.nome === "Randon")?.tipo).toBe("IMPLEMENTO");
    expect(filtro.referencias.map((r) => [r.codigo, r.marca])).toEqual([
      ["ARL 6070", "Tecfil"],
      ["C 30 1500", null],
    ]);
  });

  it("publica quem tem categoria e gera título e descrição com a cidade", () => {
    const valvula = produto("EX-0701");

    expect(valvula.situacao).toBe("PUBLICADO");
    expect(valvula.seoTitulo).toBe("Válvula pedal freio Wabco");
    expect(valvula.seoDescricao.endsWith("Linha pesada em Feira de Santana – BA.")).toBe(true);
  });
});

describe("montarImportacao: código interno dentro do nome", () => {
  const base = {
    secao: "RETENTORES E DIAFRAGMAS",
    marcas: [],
    aplicacoes: [],
    detalhes: "",
    destaque: "",
    foto: "",
    revisar: "",
    logos: [],
  };
  const comReferenciaCruzada = montarImportacao(
    [
      {
        ...base,
        nome: "RETENTOR SABO MB DIANT (ARCA - EX-0402)",
        pagina_pdf: 1,
        texto_completo: "RETENTOR SABO MB DIANT (ARCA - EX-0402)",
        variantes: [
          {
            codigo: "EX-0401",
            descricao: "RETENTOR SABO MB DIANT (ARCA - EX-0402)",
            nome_completo: "RETENTOR SABO MB DIANT (ARCA - EX-0402)",
            referencias: [],
            destaque: "",
            detalhes: "",
            valor_parenteses: "",
            revisar: "",
          },
        ],
      },
      {
        ...base,
        nome: "RETENTOR ARCA",
        pagina_pdf: 1,
        texto_completo: "RETENTOR ARCA",
        variantes: [
          {
            codigo: "EX-0402",
            descricao: "RETENTOR ARCA",
            nome_completo: "RETENTOR ARCA",
            referencias: [],
            destaque: "",
            detalhes: "",
            valor_parenteses: "",
            revisar: "",
          },
        ],
      },
    ],
    { local: "Feira de Santana – BA" },
  );

  it("tira o código do nome público e guarda o texto original numa pendência interna", () => {
    const [retentor] = comReferenciaCruzada.produtos;

    expect(retentor?.nome).toBe("Retentor sabo Mercedes-Benz dianteiro");
    expect(retentor?.nomeCatalogo).toBe("RETENTOR SABO MB DIANT");
    expect(retentor?.revisarNome).toBe(true);
    expect(retentor?.variacoes[0]?.nomeCatalogo).toBe("RETENTOR SABO MB DIANT");
    expect(retentor?.pendencias).toContainEqual({
      trecho: "Código interno no texto do catálogo: RETENTOR SABO MB DIANT (ARCA - EX-0402)",
      tipo: "codigo-interno",
    });
    expect(comReferenciaCruzada.violacoesDeSigilo).toEqual([]);
  });

  it("referência que contém códigos internos não é publicada", () => {
    const resultado = montarImportacao(
      [
        {
          ...base,
          nome: "BUCHA",
          pagina_pdf: 2,
          detalhes: "REF ORIG: EX-0401 EX-0402",
          texto_completo: "BUCHA REF ORIG: EX-0401 EX-0402",
          variantes: [
            {
              codigo: "EX-0401",
              descricao: "BUCHA",
              nome_completo: "BUCHA",
              referencias: [],
              destaque: "",
              detalhes: "",
              valor_parenteses: "",
              revisar: "",
            },
          ],
        },
        {
          ...base,
          nome: "PINO",
          pagina_pdf: 2,
          texto_completo: "PINO",
          variantes: [
            {
              codigo: "EX-0402",
              descricao: "PINO",
              nome_completo: "PINO",
              referencias: [],
              destaque: "",
              detalhes: "",
              valor_parenteses: "",
              revisar: "",
            },
          ],
        },
      ],
      { local: "Feira de Santana – BA" },
    );

    expect(resultado.produtos[0]?.referencias).toEqual([]);
    expect(resultado.violacoesDeSigilo).toEqual([]);
  });

  it("marcas com a mesma grafia base viram uma só (ex.: 'Fras-le' e 'FRAS-LE')", () => {
    const resultado = montarImportacao(
      [
        {
          ...base,
          nome: "LONA",
          marcas: ["Fras-le"],
          pagina_pdf: 3,
          detalhes: "FRAS-LE: 1234",
          texto_completo: "LONA FRAS-LE: 1234",
          variantes: [
            {
              codigo: "EX-0501",
              descricao: "LONA",
              nome_completo: "LONA",
              referencias: [],
              destaque: "",
              detalhes: "",
              valor_parenteses: "",
              revisar: "",
            },
          ],
        },
      ],
      { local: "Feira de Santana – BA" },
    );

    expect(resultado.marcas.map((m) => [m.nome, m.slug])).toEqual([["Fras-le", "fras-le"]]);
    expect(resultado.produtos[0]?.referencias[0]?.marca).toBe("Fras-le");
  });

  it("card sem nome usa o começo do texto do card como nome, para conferir", () => {
    const resultado = montarImportacao(
      [
        {
          ...base,
          nome: "",
          pagina_pdf: 4,
          texto_completo: "KIT REPARO VOLVO ALAVANCA REF: 00822 Aplicação: B7",
          variantes: [
            {
              codigo: "EX-0601",
              descricao: "",
              nome_completo: "",
              referencias: [],
              destaque: "",
              detalhes: "",
              valor_parenteses: "",
              revisar: "",
            },
          ],
        },
      ],
      { local: "Feira de Santana – BA" },
    );
    const [kit] = resultado.produtos;

    expect(kit?.nome).toBe("Kit reparo Volvo alavanca");
    expect(kit?.revisarNome).toBe(true);
    expect(kit?.pendencias).toContainEqual({ trecho: "Nome deduzido do texto do card", tipo: "nome" });
    expect(kit?.slug).toBe("kit-reparo-volvo-alavanca");
  });

  it("card sem nome aproveitável vira rascunho com pendência, e o endereço não começa com hífen", () => {
    const resultado = montarImportacao(
      [
        {
          ...base,
          nome: "",
          pagina_pdf: 5,
          texto_completo: "207MM",
          variantes: [
            {
              codigo: "EX-0602",
              descricao: "",
              nome_completo: "",
              referencias: [],
              destaque: "",
              detalhes: "",
              valor_parenteses: "",
              revisar: "",
            },
          ],
        },
      ],
      { local: "Feira de Santana – BA" },
    );
    const [sem] = resultado.produtos;

    expect(sem?.nome).toBe("");
    expect(sem?.situacao).toBe("RASCUNHO");
    expect(sem?.revisarNome).toBe(true);
    expect(sem?.pendencias).toContainEqual({ trecho: "Nome ausente no catálogo", tipo: "nome" });
    expect(sem?.slug).toBe("retentores-e-diafragmas");
  });

  it("só conta a foto para o Google quando as fotos já foram importadas", () => {
    const semFotos = montarImportacao(cards, { local: "Feira de Santana – BA" });
    const comFotos = montarImportacao(cards, { local: "Feira de Santana – BA", comFotos: true });

    expect(semFotos.produtos.find((p) => p.chave === "EX-0701")?.indexavel).toBe(false);
    expect(comFotos.produtos.find((p) => p.chave === "EX-0701")?.indexavel).toBe(true);
  });
});
