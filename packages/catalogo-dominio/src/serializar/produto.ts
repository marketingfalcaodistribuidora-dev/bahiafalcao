// Serializadores por LISTA DE PERMITIDOS (plano 003 §2.3; plano 002 §4.3).
// Cada campo de saída é escrito à mão: um campo novo no banco nunca sai por omissão.
// Dado sensível (código interno, imposto, localização) só entra se o perfil puder vê-lo;
// sem permissão, a chave nem existe na resposta (não é mascarada).
import { pode, type PerfilDeAcesso } from "../permissoes";

type Situacao = "RASCUNHO" | "PUBLICADO" | "INATIVO";
type TipoReferencia = "ORIGINAL" | "SIMILAR" | "EQUIVALENTE" | "FABRICANTE";

/** Formato mínimo que os serializadores leem do produto carregado do banco. */
export type ProdutoCarregado = {
  id: number;
  slug: string;
  nome: string;
  nomeCatalogo: string;
  aplicacao: string;
  especificacoes: string;
  observacoes: string;
  embalagem: string | null;
  situacao: Situacao;
  novo: boolean;
  revisarNome: boolean;
  versao: number;
  atualizadoEm: Date;
  interno: { localizacao: string } | null;
  variacoes: {
    id: number;
    descricao: string;
    ordem: number;
    excluidaEm: Date | null;
    interno: { codigoInterno: string; imposto: { toString(): string } | null } | null;
  }[];
  referencias: {
    id: number;
    variacaoId: number | null;
    tipo: TipoReferencia;
    codigo: string;
    publicada: boolean;
    marca: { nome: string; slug: string } | null;
  }[];
};

export type VariacaoPainel = {
  id: number;
  descricao: string;
  ordem: number;
  codigoInterno?: string;
  imposto?: string | null;
};

export type ProdutoPainel = {
  id: number;
  slug: string;
  nome: string;
  nomeCatalogo: string;
  aplicacao: string;
  especificacoes: string;
  observacoes: string;
  embalagem: string | null;
  situacao: Situacao;
  novo: boolean;
  revisarNome: boolean;
  versao: number;
  atualizadoEm: Date;
  localizacao?: string;
  variacoes: VariacaoPainel[];
  referencias: {
    id: number;
    variacaoId: number | null;
    tipo: TipoReferencia;
    codigo: string;
    publicada: boolean;
    marca: { nome: string; slug: string } | null;
  }[];
};

const ativas = (p: ProdutoCarregado) => p.variacoes.filter((v) => v.excluidaEm === null);

export function serializarProdutoPainel(p: ProdutoCarregado, perfil: PerfilDeAcesso): ProdutoPainel {
  const verCodigo = pode(perfil, "ver_codigo_interno");
  const verImposto = pode(perfil, "ver_imposto");
  const verLocalizacao = pode(perfil, "ver_localizacao");

  const saida: ProdutoPainel = {
    id: p.id,
    slug: p.slug,
    nome: p.nome,
    nomeCatalogo: p.nomeCatalogo,
    aplicacao: p.aplicacao,
    especificacoes: p.especificacoes,
    observacoes: p.observacoes,
    embalagem: p.embalagem,
    situacao: p.situacao,
    novo: p.novo,
    revisarNome: p.revisarNome,
    versao: p.versao,
    atualizadoEm: p.atualizadoEm,
    variacoes: ativas(p).map((v) => {
      const variacao: VariacaoPainel = { id: v.id, descricao: v.descricao, ordem: v.ordem };
      if (verCodigo && v.interno) variacao.codigoInterno = v.interno.codigoInterno;
      if (verImposto && v.interno) variacao.imposto = v.interno.imposto?.toString() ?? null;
      return variacao;
    }),
    // Referência não publicada está em alerta (ex.: igual a um código interno):
    // só aparece para quem pode ver código interno.
    referencias: p.referencias
      .filter((r) => r.publicada || verCodigo)
      .map((r) => ({
        id: r.id,
        variacaoId: r.variacaoId,
        tipo: r.tipo,
        codigo: r.codigo,
        publicada: r.publicada,
        marca: r.marca && { nome: r.marca.nome, slug: r.marca.slug },
      })),
  };
  if (verLocalizacao) saida.localizacao = p.interno?.localizacao ?? "";
  return saida;
}

export type ProdutoPublico = {
  slug: string;
  nome: string;
  aplicacao: string;
  especificacoes: string;
  observacoes: string;
  embalagem: string | null;
  novo: boolean;
  variacoes: { id: number; descricao: string }[];
  referencias: {
    variacaoId: number | null;
    tipo: TipoReferencia;
    codigo: string;
    marca: { nome: string; slug: string } | null;
  }[];
};

export function serializarProdutoPublico(p: ProdutoCarregado): ProdutoPublico {
  return {
    slug: p.slug,
    nome: p.nome,
    aplicacao: p.aplicacao,
    especificacoes: p.especificacoes,
    observacoes: p.observacoes,
    embalagem: p.embalagem,
    novo: p.novo,
    variacoes: ativas(p).map((v) => ({ id: v.id, descricao: v.descricao })),
    referencias: p.referencias
      .filter((r) => r.publicada)
      .map((r) => ({
        variacaoId: r.variacaoId,
        tipo: r.tipo,
        codigo: r.codigo,
        marca: r.marca && { nome: r.marca.nome, slug: r.marca.slug },
      })),
  };
}
