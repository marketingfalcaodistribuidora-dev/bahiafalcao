// Grava a carga inicial (plano 002, §2.3). Como é SÓ a carga inicial, apaga e recria o
// catálogo numa transação, preservando SlugAntigo e ChaveApi. Antes, uma TRAVA recusa
// rodar se houver trabalho feito no painel que seria perdido (spec 002 CA1.7).
import type { ClienteBanco } from "../banco";
import { normalizarCodigo } from "../busca/normalizar";
import { gravarBuscaEmLote, textosDeBusca } from "../busca/recalcular";
import type { ResultadoMontagem } from "./montar";
import { verificarSigilo } from "./sigilo";

export class ImportacaoRecusada extends Error {
  constructor(readonly motivos: string[]) {
    super(`Importação recusada: ${motivos.join("; ")}`);
    this.name = "ImportacaoRecusada";
  }
}

const LOTE = 1000;
const emLotes = <T>(itens: T[]) =>
  Array.from({ length: Math.ceil(itens.length / LOTE) }, (_, i) => itens.slice(i * LOTE, (i + 1) * LOTE));

export async function gravarImportacao(banco: ClienteBanco, r: ResultadoMontagem): Promise<void> {
  if (r.violacoesDeSigilo.length) {
    throw new ImportacaoRecusada([
      `violação de sigilo (${r.violacoesDeSigilo.length}): ${r.violacoesDeSigilo.slice(0, 5).join(" | ")}`,
    ]);
  }

  await banco.$transaction(
    async (tx) => {
      // Uma importação por vez: a segunda espera a primeira terminar.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('falcao-importacao-catalogo'))`;

      // ─── Trava: nada feito no painel pode ser perdido ───
      const motivos: string[] = [];
      const doCadastro = await tx.produto.count({ where: { origem: "CADASTRO" } });
      const editados = await tx.produto.count({ where: { editadoManualmente: true } });
      const comLocalizacao = await tx.produtoInterno.count({ where: { localizacao: { not: "" } } });
      const orcamentos = await tx.orcamento.count();
      const alteracoes = await tx.alteracao.count();
      const grupos = await tx.grupo.count();
      const categoriasOrganizadas = await tx.categoria.count({
        where: {
          OR: [
            { grupoId: { not: null } },
            { descricao: { not: "" } },
            { modeloEspecificacoes: { not: "" } },
            { seoTitulo: { not: null } },
            { seoDescricao: { not: null } },
          ],
        },
      });
      if (doCadastro) motivos.push(`${doCadastro} produto(s) criado(s) pelo cadastro`);
      if (editados) motivos.push(`${editados} produto(s) editado(s) depois da importação`);
      if (comLocalizacao) motivos.push(`${comLocalizacao} produto(s) com localização preenchida`);
      if (orcamentos) motivos.push(`${orcamentos} orçamento(s) que usam as variações`);
      if (alteracoes) motivos.push(`${alteracoes} alteração(ões) no histórico do painel`);
      if (grupos) motivos.push(`${grupos} grupo(s) de categorias criado(s) no painel`);
      if (categoriasOrganizadas)
        motivos.push(`${categoriasOrganizadas} categoria(s) com grupo, texto ou SEO do painel`);
      if (motivos.length) throw new ImportacaoRecusada(motivos);

      // ─── Apaga o catálogo (as tabelas filhas caem em cascata a partir do produto) ───
      await tx.produto.deleteMany();
      await tx.categoria.deleteMany();
      await tx.marca.deleteMany();

      // ─── Categorias e marcas ───
      const categorias = await tx.categoria.createManyAndReturn({
        data: r.categorias.map((c) => ({ nome: c.nome, slug: c.slug, ordem: c.ordem })),
        select: { id: true, nome: true },
      });
      const idCategoria = new Map(categorias.map((c) => [c.nome, c.id]));
      const marcas = await tx.marca.createManyAndReturn({
        data: r.marcas.map((m) => ({ nome: m.nome, slug: m.slug, tipo: m.tipo, logo: m.logo })),
        select: { id: true, nome: true },
      });
      const idMarca = new Map(marcas.map((m) => [m.nome, m.id]));

      // ─── Produtos ───
      const idProduto = new Map<string, number>();
      for (const lote of emLotes(r.produtos)) {
        const criados = await tx.produto.createManyAndReturn({
          data: lote.map((p) => ({
            slug: p.slug,
            nome: p.nome,
            nomeCatalogo: p.nomeCatalogo,
            aplicacao: p.aplicacao,
            especificacoes: p.especificacoes,
            observacoes: p.observacoes,
            situacao: p.situacao,
            origem: "PDF" as const,
            novo: p.novo,
            indexavel: p.indexavel,
            revisarNome: p.revisarNome,
            seoTitulo: p.seoTitulo,
            seoDescricao: p.seoDescricao,
          })),
          select: { id: true, slug: true },
        });
        for (const c of criados) idProduto.set(c.slug, c.id);
      }
      const id = (slug: string) => idProduto.get(slug)!;

      const varios = async <T>(itens: T[], criar: (lote: T[]) => Promise<unknown>) => {
        for (const lote of emLotes(itens)) if (lote.length) await criar(lote);
      };

      await varios(
        r.produtos.map((p) => ({ produtoId: id(p.slug), chaveImportacao: p.chave })),
        (data) => tx.produtoInterno.createMany({ data }),
      );
      await varios(
        r.produtos.flatMap((p, ordem) =>
          p.categorias.map((c) => ({
            produtoId: id(p.slug),
            categoriaId: idCategoria.get(c.nome)!,
            principal: c.principal,
            ordem,
          })),
        ),
        (data) => tx.produtoCategoria.createMany({ data }),
      );
      await varios(
        r.produtos.flatMap((p) =>
          p.marcas.map((m) => ({ produtoId: id(p.slug), marcaId: idMarca.get(m.nome)!, papel: m.papel })),
        ),
        (data) => tx.produtoMarca.createMany({ data }),
      );
      await varios(
        r.produtos.flatMap((p) =>
          p.referencias.map((ref, ordem) => ({
            produtoId: id(p.slug),
            marcaId: ref.marca ? idMarca.get(ref.marca)! : null,
            tipo: ref.tipo,
            codigo: ref.codigo,
            codigoNormalizado: ref.codigoNormalizado,
            ordem,
          })),
        ),
        (data) => tx.referencia.createMany({ data }),
      );
      await varios(
        r.produtos.flatMap((p) =>
          p.origens.map((o) => ({
            produtoId: id(p.slug),
            pagina: o.pagina,
            ordem: o.ordem,
            categoriaId: o.categoria ? (idCategoria.get(o.categoria) ?? null) : null,
            textoOriginal: o.textoOriginal,
          })),
        ),
        (data) => tx.cardOrigem.createMany({ data }),
      );
      await varios(
        r.produtos.flatMap((p) =>
          p.pendencias.map((pd) => ({ produtoId: id(p.slug), trecho: pd.trecho, tipo: pd.tipo })),
        ),
        (data) => tx.pendencia.createMany({ data }),
      );

      // ─── Variações e seus dados internos ───
      const variacoes = r.produtos.flatMap((p) => p.variacoes.map((v, ordem) => ({ produtoId: id(p.slug), ordem, v })));
      for (const lote of emLotes(variacoes)) {
        const criadas = await tx.variacao.createManyAndReturn({
          data: lote.map(({ produtoId, ordem, v }) => ({
            produtoId,
            ordem,
            descricao: v.descricao,
            nomeCatalogo: v.nomeCatalogo,
          })),
          select: { id: true, produtoId: true, ordem: true },
        });
        const idVariacao = new Map(criadas.map((c) => [`${c.produtoId}|${c.ordem}`, c.id]));
        await tx.variacaoInterna.createMany({
          data: lote.map(({ produtoId, ordem, v }) => ({
            variacaoId: idVariacao.get(`${produtoId}|${ordem}`)!,
            codigoInterno: v.codigoInterno,
            codigoNormalizado: normalizarCodigo(v.codigoInterno),
            imposto: v.imposto,
          })),
        });
      }

      // ─── Busca ───
      await gravarBuscaEmLote(
        tx,
        r.produtos.map((p) => ({
          produtoId: id(p.slug),
          textos: textosDeBusca({
            nome: p.nome,
            nomeCatalogo: p.nomeCatalogo,
            aplicacao: p.aplicacao,
            especificacoes: p.especificacoes,
            marcas: [...new Set(p.marcas.map((m) => m.nome))],
            categorias: p.categorias.map((c) => c.nome),
            variacoes: p.variacoes,
            referencias: p.referencias,
          }),
        })),
      );

      // ─── Sigilo sobre o banco gravado (plano 002 §2.3, passo 10): desfaz tudo se vazar ───
      const codigos = (await tx.variacaoInterna.findMany({ select: { codigoInterno: true } })).map(
        (v) => v.codigoInterno,
      );
      const linhas = await tx.$queryRaw<{ onde: string; texto: string }[]>`
        SELECT 'Grupo' AS onde, row_to_json(t)::text AS texto FROM "Grupo" t
        UNION ALL SELECT 'Categoria', row_to_json(t)::text FROM "Categoria" t
        UNION ALL SELECT 'Marca', row_to_json(t)::text FROM "Marca" t
        UNION ALL SELECT 'Produto', (to_jsonb(t) - 'buscaTexto')::text || ' ' || coalesce(t."buscaTexto"::text, '') FROM "Produto" t
        UNION ALL SELECT 'ProdutoCategoria', row_to_json(t)::text FROM "ProdutoCategoria" t
        UNION ALL SELECT 'ProdutoMarca', row_to_json(t)::text FROM "ProdutoMarca" t
        UNION ALL SELECT 'Variacao', row_to_json(t)::text FROM "Variacao" t
        UNION ALL SELECT 'Referencia', row_to_json(t)::text FROM "Referencia" t
        UNION ALL SELECT 'Imagem', row_to_json(t)::text FROM "Imagem" t
        UNION ALL SELECT 'SlugAntigo', row_to_json(t)::text FROM "SlugAntigo" t`;
      const vazamentos = verificarSigilo(linhas, codigos);
      if (vazamentos.length) {
        throw new ImportacaoRecusada([
          `violação de sigilo no banco (${vazamentos.length}): ${vazamentos.slice(0, 5).join(" | ")}`,
        ]);
      }
    },
    { timeout: 10 * 60_000, maxWait: 60_000 },
  );
}
