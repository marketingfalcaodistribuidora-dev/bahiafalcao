// Endereço legível do produto (plano 002, §5): ASCII minúsculo com hífens, até 70 caracteres,
// cortado em fim de palavra. Em colisão, acrescenta os sufixos na ordem dada
// (marca → medida → referência). Nunca número sequencial nem código interno.
import { createHash } from "node:crypto";

export const TAMANHO_MAXIMO_SLUG = 70;

export function paraSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Corta no último hífen que caiba no limite (fim de palavra). */
function cortar(slug: string, limite: number): string {
  if (slug.length <= limite) return slug;
  const corte = slug.slice(0, limite + 1).lastIndexOf("-");
  return corte > 0 ? slug.slice(0, corte) : slug.slice(0, limite);
}

function comSufixo(base: string, sufixo: string): string {
  if (!sufixo) return cortar(base, TAMANHO_MAXIMO_SLUG);
  return `${cortar(base, TAMANHO_MAXIMO_SLUG - sufixo.length - 1)}-${sufixo}`;
}

/**
 * @param nome nome por extenso do produto
 * @param sufixos candidatos para desempate, na ordem de preferência
 * @param ocupado diz se um slug já existe (inclusive entre os slugs antigos)
 */
export function gerarSlug(nome: string, sufixos: string[], ocupado: (slug: string) => boolean): string {
  const base = paraSlug(nome);
  const partes = sufixos.map(paraSlug).filter(Boolean);

  for (let quantos = 0; quantos <= partes.length; quantos++) {
    const candidato = comSufixo(base, partes.slice(0, quantos).join("-"));
    if (!ocupado(candidato)) return candidato;
  }

  // Último recurso: sufixo curto derivado do próprio texto (determinístico, não sequencial).
  const prefixo = partes.join("-");
  for (let tentativa = 0; ; tentativa++) {
    const hash = createHash("sha1").update(`${base}|${prefixo}|${tentativa}`).digest("hex").slice(0, 6);
    const candidato = comSufixo(base, prefixo ? `${prefixo}-${hash}` : hash);
    if (!ocupado(candidato)) return candidato;
  }
}
