// Monta a carga inicial a partir dos cards extraídos (plano 002, §2.3), sem tocar no banco.
// Ordem: agrupar → importados → nome → referências → classificar → categorias (e lançamentos)
// → marcas → SEO → sigilo. Tudo determinístico: a mesma entrada gera a mesma saída (CA1.5).
import { normalizarCodigo } from "../busca/normalizar";
import { avaliarIndexacao } from "../seo/indexavel";
import { gerarSlug, paraSlug } from "../seo/slug";
import { gerarTextosSeo } from "../seo/textos";
import { agrupar, type OrigemCard } from "./agrupar";
import { classificar, type Pendencia } from "./classificar";
import dicCategorias from "./dicionarios/categorias.json";
import dicMarcas from "./dicionarios/marcas.json";
import dicNomes from "./dicionarios/nomes.json";
import type { CardExtraido } from "./entrada";
import { extrairImposto } from "./importados";
import { DicionarioNomesSchema, nomePorExtenso } from "./nome";
import { extrairReferencias, type ReferenciaLida } from "./referencias";
import { codigosNoTexto, removerCodigosInternos, verificarSigilo, type TextoPublico } from "./sigilo";

const SECAO_LANCAMENTOS = "LANÇAMENTOS";
const IMPORTADOS = "Importados";
const nomes = DicionarioNomesSchema.parse(dicNomes);
const categoriasDoPdf = dicCategorias as Record<string, string | null>;

export type PendenciaImportada = {
  trecho: string;
  tipo: Pendencia["tipo"] | "categoria" | "referencia-interna" | "nome";
};
export type PapelMarca = "FABRICANTE" | "MONTADORA" | "LOGO";

export type ProdutoMontado = {
  chave: string;
  slug: string;
  nome: string;
  nomeCatalogo: string;
  aplicacao: string;
  especificacoes: string;
  observacoes: string;
  novo: boolean;
  revisarNome: boolean;
  situacao: "RASCUNHO" | "PUBLICADO";
  seoTitulo: string;
  seoDescricao: string;
  indexavel: boolean;
  categorias: { nome: string; principal: boolean }[];
  marcas: { nome: string; papel: PapelMarca }[];
  variacoes: { codigoInterno: string; descricao: string; nomeCatalogo: string; imposto: string | null }[];
  referencias: { codigo: string; codigoNormalizado: string; tipo: ReferenciaLida["tipo"]; marca: string | null }[];
  pendencias: PendenciaImportada[];
  /** Origem de cada card, com o nome da categoria da página (null em Lançamentos). */
  origens: (OrigemCard & { categoria: string | null })[];
  fotos: string[];
};

export type MarcaMontada = {
  nome: string;
  slug: string;
  tipo: "FABRICANTE" | "MONTADORA" | "IMPLEMENTO";
  logo: string | null;
};

export type ResultadoMontagem = {
  categorias: { nome: string; slug: string; ordem: number }[];
  marcas: MarcaMontada[];
  produtos: ProdutoMontado[];
  alertas: string[];
  violacoesDeSigilo: string[];
};

const preservadas = new Map(nomes.preservar.map((p) => [p.toUpperCase(), p]));

/** Grafia única para marcas: a do dicionário, ou "FRUM" → "Frum". */
function nomeDeMarca(bruto: string): string {
  const limpo = bruto.trim();
  const conhecida = preservadas.get(limpo.toUpperCase());
  if (conhecida) return conhecida;
  if (limpo !== limpo.toUpperCase()) return limpo;
  return limpo
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

function nomeDaCategoria(secao: string): string | null {
  if (secao in categoriasDoPdf) return categoriasDoPdf[secao] ?? null;
  const minuscula = secao.trim().toLowerCase();
  return minuscula ? minuscula.charAt(0).toUpperCase() + minuscula.slice(1) : null;
}

const palavras = (texto: string, n: number) => texto.toUpperCase().split(/\s+/).filter(Boolean).slice(0, n).join(" ");

/** Categoria dominante (≥ 60% e ≥ 2 produtos) entre produtos cujo nome começa igual. */
function deduzirCategoria(nomeCatalogo: string, indice: Map<string, Map<string, number>>): string | null {
  for (const n of [2, 1]) {
    const contagem = indice.get(`${n}:${palavras(nomeCatalogo, n)}`);
    if (!contagem) continue;
    const total = [...contagem.values()].reduce((a, b) => a + b, 0);
    const [categoria, vezes] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]!;
    if (vezes >= 2 && vezes / total >= 0.6) return categoria;
  }
  return null;
}

/**
 * @param opcoes.local cidade e UF dos textos de SEO
 * @param opcoes.comFotos as fotos já foram importadas (T090)? Só então a foto conta para o Google.
 */
export function montarImportacao(
  cards: CardExtraido[],
  opcoes: { local: string; comFotos?: boolean },
): ResultadoMontagem {
  const grupos = agrupar(cards);
  const codigosInternos = new Set(cards.flatMap((c) => c.variantes.map((v) => v.codigo.toUpperCase())));
  const codigosNormalizados = new Set([...codigosInternos].map(normalizarCodigo));
  const tiposDeVeiculo = new Set(dicMarcas.tiposDeVeiculo);
  const implementos = new Set(dicMarcas.implementos.map((m) => m.toUpperCase()));
  const alertas: string[] = [];

  // Índice "primeiras palavras do nome → categoria", só com produtos fora de Lançamentos.
  const indice = new Map<string, Map<string, number>>();
  for (const g of grupos) {
    const categoria = g.secoes.map(nomeDaCategoria).find((c) => c && c !== IMPORTADOS);
    if (!categoria) continue;
    const nomeCatalogo = extrairImposto(g.cards[0]!.nome).texto;
    for (const n of [1, 2]) {
      const chave = `${n}:${palavras(nomeCatalogo, n)}`;
      const contagem = indice.get(chave) ?? new Map<string, number>();
      contagem.set(categoria, (contagem.get(categoria) ?? 0) + 1);
      indice.set(chave, contagem);
    }
  }

  // Marcas com o mesmo endereço são a mesma marca: vale a primeira grafia encontrada.
  const grafiaPorSlug = new Map<string, string>();
  const marcaCanonica = (bruto: string) => {
    const nome = nomeDeMarca(bruto);
    const slug = paraSlug(nome);
    const conhecida = grafiaPorSlug.get(slug);
    if (conhecida) return conhecida;
    grafiaPorSlug.set(slug, nome);
    return nome;
  };

  const marcas = new Map<string, MarcaMontada>();
  const registrarMarca = (nome: string, tipo: MarcaMontada["tipo"], logo: string | null = null) => {
    const atual = marcas.get(nome);
    if (!atual) marcas.set(nome, { nome, slug: paraSlug(nome), tipo, logo });
    else {
      if (atual.tipo === "FABRICANTE" && tipo !== "FABRICANTE") atual.tipo = tipo;
      if (!atual.logo && logo) atual.logo = logo;
    }
  };

  const produtos: Omit<ProdutoMontado, "slug" | "seoTitulo" | "seoDescricao" | "indexavel">[] = grupos.map((g) => {
    const primeiro = g.cards[0]!;
    const pendencias: PendenciaImportada[] = [];
    // Código interno citado no texto (ex.: "(ARCA - 1110002)") sai do público e vira pendência.
    const semCodigo = (texto: string) => {
      const r = removerCodigosInternos(texto, codigosInternos);
      if (r.removidos.length) {
        const trecho = `Código interno no texto do catálogo: ${texto}`;
        if (!pendencias.some((p) => p.trecho === trecho)) pendencias.push({ trecho, tipo: "codigo-interno" });
      }
      return r.texto;
    };
    const nomeDoCard = semCodigo(extrairImposto(primeiro.nome).texto);
    const nomePerdeuCodigo = pendencias.some((p) => p.tipo === "codigo-interno");
    // Card sem nome: tenta a variação e depois o começo do texto do card (antes de "REF:", "Aplicação:"...).
    const nomeDeduzido = nomeDoCard
      ? ""
      : semCodigo(
          extrairImposto(
            g.variantes.map((v) => v.descricao.trim()).find(Boolean) ??
              primeiro.texto_completo.split(/\b(?:REF|C[ÓO]D|APLICA[ÇC][ÃA]O|VE[ÍI]CULO|OBS)\b|:/i)[0] ??
              "",
          ).texto,
        ).trim();
    const nomeCatalogo = nomeDoCard || (/\p{L}{3}/u.test(nomeDeduzido) ? nomeDeduzido : "");
    if (!nomeDoCard) {
      pendencias.push(
        nomeCatalogo
          ? { trecho: "Nome deduzido do texto do card", tipo: "nome" }
          : { trecho: "Nome ausente no catálogo", tipo: "nome" },
      );
    }

    const variacoes = g.variantes.map((v) => {
      const { texto: bruto, imposto } = extrairImposto(v.descricao);
      const texto = semCodigo(bruto);
      const igualAoNome = g.variantes.length === 1 && texto.toUpperCase() === nomeCatalogo.toUpperCase();
      return {
        codigoInterno: v.codigo,
        descricao: igualAoNome ? "" : nomePorExtenso(texto, nomes),
        nomeCatalogo: semCodigo(extrairImposto(v.nome_completo).texto),
        imposto,
      };
    });

    // Categorias: a da peça como principal; Importados junto; Lançamentos vira selo "novo".
    const novo = g.secoes.includes(SECAO_LANCAMENTOS);
    const nomesCategoria = [...new Set(g.secoes.map(nomeDaCategoria).filter((c): c is string => !!c))];
    if (variacoes.some((v) => v.imposto) && !nomesCategoria.includes(IMPORTADOS)) nomesCategoria.push(IMPORTADOS);
    if (!nomesCategoria.length && novo) {
      const deduzida = deduzirCategoria(nomeCatalogo, indice);
      if (deduzida) {
        nomesCategoria.push(deduzida);
        pendencias.push({ trecho: `Categoria deduzida pelo nome: ${deduzida}`, tipo: "categoria" });
      } else {
        pendencias.push({ trecho: "Lançamento sem categoria definida", tipo: "categoria" });
      }
    }
    const principal = nomesCategoria.find((c) => c !== IMPORTADOS) ?? nomesCategoria[0];
    const categorias = principal
      ? [principal, ...nomesCategoria.filter((c) => c !== principal)].map((nome) => ({
          nome,
          principal: nome === principal,
        }))
      : [];

    // Marcas: fabricantes, montadoras (ou implementos) e logos; tipos de veículo vão para a aplicação.
    const papeis: { nome: string; papel: PapelMarca }[] = [];
    const veiculos: string[] = [];
    for (const m of g.cards.flatMap((c) => c.marcas)) {
      const nome = marcaCanonica(m);
      registrarMarca(nome, "FABRICANTE");
      papeis.push({ nome, papel: "FABRICANTE" });
    }
    for (const a of g.cards.flatMap((c) => c.aplicacoes)) {
      if (tiposDeVeiculo.has(a)) {
        veiculos.push(a);
        continue;
      }
      const nome = marcaCanonica(a);
      registrarMarca(nome, implementos.has(nome.toUpperCase()) ? "IMPLEMENTO" : "MONTADORA");
      papeis.push({ nome, papel: "MONTADORA" });
    }
    for (const l of g.cards.flatMap((c) => c.logos)) {
      const nome = marcaCanonica(l.nome);
      registrarMarca(nome, "FABRICANTE", l.img);
      papeis.push({ nome, papel: "LOGO" });
    }
    const marcasDoProduto = [...new Map(papeis.map((p) => [`${p.papel}|${p.nome}`, p])).values()];

    // Referências: as rotuladas no texto e as já separadas pela extração.
    const lidas: ReferenciaLida[] = [];
    const restantes: string[] = [];
    for (const card of g.cards) {
      const textos = [...new Set([card.detalhes, ...card.variantes.map((v) => v.detalhes)].filter(Boolean))];
      const jaSeparadas = card.variantes.flatMap((v) => v.referencias);
      textos.forEach((texto, i) => {
        const r = extrairReferencias(texto, i === 0 ? jaSeparadas : [], card.texto_completo, dicMarcas.conversao);
        lidas.push(...r.referencias);
        if (r.restante) restantes.push(r.restante);
      });
      if (!textos.length && jaSeparadas.length) {
        lidas.push(...extrairReferencias("", jaSeparadas, card.texto_completo, dicMarcas.conversao).referencias);
      }
    }
    const referencias: ProdutoMontado["referencias"] = [];
    for (const ref of lidas) {
      const codigoNormalizado = normalizarCodigo(ref.codigo);
      if (referencias.some((r) => r.codigoNormalizado === codigoNormalizado)) continue;
      if (codigosNormalizados.has(codigoNormalizado) || codigosNoTexto(ref.codigo, codigosInternos).length) {
        pendencias.push({ trecho: `Referência igual a um código interno: ${ref.codigo}`, tipo: "referencia-interna" });
        alertas.push(`${g.chave}: referência igual a um código interno (${ref.codigo})`);
        continue;
      }
      const marca = ref.marca ? marcaCanonica(ref.marca) : null;
      if (marca) registrarMarca(marca, "FABRICANTE");
      referencias.push({ codigo: ref.codigo, codigoNormalizado, tipo: ref.tipo, marca });
    }

    const destaque = [...new Set(g.cards.map((c) => c.destaque.trim()).filter(Boolean))].join(" / ");
    const classificacao = classificar({
      textos: restantes,
      destaque,
      tiposDeVeiculo: [...new Set(veiculos)],
      codigosInternos,
    });
    pendencias.push(...classificacao.pendencias);

    return {
      chave: g.chave,
      nome: nomePorExtenso(nomeCatalogo, nomes),
      nomeCatalogo,
      aplicacao: classificacao.aplicacao,
      especificacoes: classificacao.especificacoes,
      observacoes: classificacao.observacoes,
      novo,
      revisarNome:
        !nomeDoCard ||
        nomePerdeuCodigo ||
        g.cards.some((c) => c.revisar === "pendente" || c.variantes.some((v) => v.revisar === "pendente")),
      situacao: categorias.length && nomeCatalogo ? ("PUBLICADO" as const) : ("RASCUNHO" as const),
      categorias,
      marcas: marcasDoProduto,
      variacoes,
      referencias,
      pendencias,
      origens: g.origens.map((o) => ({ ...o, categoria: nomeDaCategoria(o.secao) })),
      fotos: [...new Set(g.cards.map((c) => c.foto).filter(Boolean))],
    };
  });

  // SEO: endereços em ordem do PDF (determinístico) e textos automáticos.
  const ocupados = new Set<string>();
  const comSeo = produtos.map((p) => {
    const marcaPrincipal =
      p.marcas.find((m) => m.papel === "FABRICANTE")?.nome ??
      p.marcas.find((m) => m.papel === "MONTADORA")?.nome ??
      null;
    const slug = gerarSlug(
      p.nome,
      // Sem nome, a base vira a categoria (nunca a chave, que é código interno).
      p.nome
        ? [marcaPrincipal ?? "", p.variacoes[0]?.descricao ?? "", p.referencias[0]?.codigoNormalizado ?? ""]
        : [p.categorias.find((c) => c.principal)?.nome ?? p.origens[0]?.secao ?? "", marcaPrincipal ?? ""],
      (s) => ocupados.has(s),
    );
    ocupados.add(slug);
    const textos = gerarTextosSeo({
      nome: p.nome,
      marca: marcaPrincipal,
      referencias: p.referencias.map((r) => r.codigo),
      aplicacao: p.aplicacao,
      categoria: p.categorias.find((c) => c.principal)?.nome ?? "Lançamentos",
      local: opcoes.local,
    });
    return { ...p, slug, seoTitulo: textos.titulo, seoDescricao: textos.descricao };
  });

  // Título ou descrição repetidos: fica no índice só o produto mais forte de cada grupo.
  const sinais = (p: (typeof comSeo)[number]) =>
    [p.fotos.length > 0, p.referencias.length > 0, !!p.aplicacao.trim(), !!p.especificacoes.trim()].filter(Boolean)
      .length;
  const repetidos = new Set<string>();
  for (const campo of ["seoTitulo", "seoDescricao"] as const) {
    const porTexto = new Map<string, (typeof comSeo)[number][]>();
    for (const p of comSeo) porTexto.set(p[campo], [...(porTexto.get(p[campo]) ?? []), p]);
    for (const iguais of porTexto.values()) {
      if (iguais.length < 2) continue;
      const maisForte = iguais.reduce((a, b) => (sinais(b) > sinais(a) ? b : a));
      for (const p of iguais) if (p !== maisForte) repetidos.add(p.chave);
    }
  }
  const final: ProdutoMontado[] = comSeo.map((p) => ({
    ...p,
    indexavel: avaliarIndexacao({
      situacao: p.situacao,
      revisarNome: p.revisarNome,
      temFoto: !!opcoes.comFotos && p.fotos.length > 0,
      temReferencia: p.referencias.length > 0,
      aplicacao: p.aplicacao,
      especificacoes: p.especificacoes,
      textosRepetidos: repetidos.has(p.chave),
    }).indexavel,
  }));

  // Categorias na ordem do PDF (Importados entra mesmo se só vier do "IMP").
  const ordemCategorias = [...new Set(cards.map((c) => nomeDaCategoria(c.secao)).filter((c): c is string => !!c))];
  for (const nome of final.flatMap((p) => p.categorias.map((c) => c.nome))) {
    if (!ordemCategorias.includes(nome)) ordemCategorias.push(nome);
  }

  const textosPublicos: TextoPublico[] = final.flatMap((p) => [
    { onde: `${p.chave} · nome`, texto: `${p.nome} ${p.nomeCatalogo}` },
    { onde: `${p.chave} · textos`, texto: `${p.aplicacao}\n${p.especificacoes}\n${p.observacoes}` },
    { onde: `${p.chave} · SEO`, texto: `${p.slug} ${p.seoTitulo} ${p.seoDescricao}` },
    ...p.variacoes.map((v) => ({ onde: `${p.chave} · variação`, texto: `${v.descricao} ${v.nomeCatalogo}` })),
    ...p.referencias.map((r) => ({ onde: `${p.chave} · referência`, texto: r.codigo })),
  ]);

  return {
    categorias: ordemCategorias.map((nome, ordem) => ({ nome, slug: paraSlug(nome), ordem })),
    marcas: [...marcas.values()],
    produtos: final,
    alertas,
    violacoesDeSigilo: verificarSigilo(textosPublicos, codigosInternos),
  };
}
