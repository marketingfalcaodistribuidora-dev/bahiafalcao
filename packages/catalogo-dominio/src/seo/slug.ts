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

/** Corta no último hífen que caiba no limite (fim de palavra), sem hífen nas pontas. */
function cortar(slug: string, limite: number): string {
  if (limite <= 0) return "";
  if (slug.length <= limite) return slug;
  const corte = slug.slice(0, limite + 1).lastIndexOf("-");
  return (corte > 0 ? slug.slice(0, corte) : slug.slice(0, limite)).replace(/^-+|-+$/g, "");
}

/**
 * Base + sufixo em até `limite` caracteres. A base encolhe primeiro, mas nunca abaixo da
 * primeira palavra; depois o sufixo é cortado no que sobrar.
 */
function comSufixo(base: string, sufixo: string, limite = TAMANHO_MAXIMO_SLUG): string {
  if (!sufixo) return cortar(base, limite);
  const primeiraPalavra = base.split("-")[0] ?? base;
  const b = cortar(base, Math.max(limite - sufixo.length - 1, primeiraPalavra.length));
  const s = cortar(sufixo, limite - b.length - 1);
  return s ? `${b}-${s}` : b;
}

/**
 * @param nome nome por extenso do produto (se vazio, a base é o primeiro sufixo)
 * @param sufixos candidatos para desempate, na ordem de preferência
 * @param ocupado diz se um slug já existe (inclusive entre os slugs antigos)
 */
export function gerarSlug(nome: string, sufixos: string[], ocupado: (slug: string) => boolean): string {
  const partes = sufixos.map(paraSlug).filter(Boolean);
  const base = paraSlug(nome) || partes.shift() || "produto";

  for (let quantos = 0; quantos <= partes.length; quantos++) {
    const candidato = comSufixo(base, partes.slice(0, quantos).join("-"));
    if (!ocupado(candidato)) return candidato;
  }

  // Último recurso: sufixo curto derivado do próprio texto (determinístico, não sequencial).
  const prefixo = partes.join("-");
  for (let tentativa = 0; ; tentativa++) {
    const hash = createHash("sha1").update(`${base}|${prefixo}|${tentativa}`).digest("hex").slice(0, 6);
    const candidato = `${comSufixo(base, prefixo, TAMANHO_MAXIMO_SLUG - hash.length - 1)}-${hash}`;
    if (!ocupado(candidato)) return candidato;
  }
}
