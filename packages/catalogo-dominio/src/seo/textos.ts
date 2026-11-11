// Título e descrição automáticos do produto (plano 002, §5).
// Título ≤ 37 (o site acrescenta " | Falcão Distribuidora"); descrição ≤ 155, sempre com a cidade.
import { textoSimples } from "@falcao/texto-formatado";

export const TAMANHO_MAXIMO_TITULO = 37;
export const TAMANHO_MAXIMO_DESCRICAO = 155;

export type DadosTextoSeo = {
  nome: string;
  marca: string | null;
  referencias: string[];
  /** Aplicação em texto formatado. */
  aplicacao: string;
  categoria: string;
  /** Cidade e UF, vindas da fonte única do site. */
  local: string;
};

function cortarPalavra(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite + 1).lastIndexOf(" ");
  return (corte > 0 ? texto.slice(0, corte) : texto.slice(0, limite)).replace(/[\s,;:.–-]+$/, "");
}

export function gerarTextosSeo(d: DadosTextoSeo): { titulo: string; descricao: string } {
  const comMarca = d.marca ? `${d.nome} ${d.marca}` : d.nome;
  const titulo = comMarca.length <= TAMANHO_MAXIMO_TITULO ? comMarca : cortarPalavra(d.nome, TAMANHO_MAXIMO_TITULO);

  const refs = d.referencias.slice(0, 3);
  const inicio = refs.length ? `${comMarca}.` : `${comMarca}, categoria ${d.categoria}.`;
  const referencias = refs.length ? ` Ref. ${refs.join(", ")}.` : "";
  const fim = ` Linha pesada em ${d.local}.`;
  const aplicacao = textoSimples(d.aplicacao).replace(/[.;:,\s]+$/, "");

  const fixo = inicio + referencias + fim;
  const rotulo = " Aplicação: ";
  if (aplicacao && fixo.length + rotulo.length + aplicacao.length + 1 <= TAMANHO_MAXIMO_DESCRICAO) {
    return { titulo, descricao: `${inicio}${referencias}${rotulo}${aplicacao}.${fim}` };
  }
  const espaco = TAMANHO_MAXIMO_DESCRICAO - fixo.length - rotulo.length - 2; // "…" e "."
  if (aplicacao && espaco >= 15) {
    return { titulo, descricao: `${inicio}${referencias}${rotulo}${cortarPalavra(aplicacao, espaco)}….${fim}` };
  }
  return { titulo, descricao: cortarPalavra(fixo, TAMANHO_MAXIMO_DESCRICAO) };
}
