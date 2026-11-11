// Nome por extenso (spec 002 R3) a partir do nome abreviado do catálogo, com um dicionário
// versionado. Nomes incertos continuam marcados "a revisar" pela extração.
import { z } from "zod";

/** Valida o dicionário versionado (dicionarios/nomes.json) ao carregar. */
export const DicionarioNomesSchema = z.object({
  abreviacoes: z.record(z.string(), z.union([z.string(), z.tuple([z.string(), z.string()])])),
  acentos: z.record(z.string(), z.string()),
  preservar: z.array(z.string()),
  masculinosEmA: z.array(z.string()),
});

export type DicionarioNomes = {
  /** Abreviação → expansão; um par [masculino, feminino] concorda com o 1º substantivo. */
  abreviacoes: Record<string, string | [string, string]>;
  /** Palavra sem acento → com acento (minúscula). */
  acentos: Record<string, string>;
  /** Marcas e modelos com grafia própria (ex.: "Mercedes-Benz", "Cargo"). */
  preservar: string[];
  /** Substantivos masculinos terminados em "a" (ex.: "sistema"). */
  masculinosEmA: string[];
};

type Contexto = { dic: DicionarioNomes; feminino: boolean; preservar: Map<string, string> };

function palavra(parte: string, ctx: Contexto): string {
  const maiuscula = parte.toUpperCase();
  if (/\d/.test(parte)) return parte;
  if (maiuscula === "X") return "x";
  const preservada = ctx.preservar.get(maiuscula);
  if (preservada) return preservada;
  const abreviacao = ctx.dic.abreviacoes[maiuscula];
  if (Array.isArray(abreviacao)) return ctx.feminino ? abreviacao[1] : abreviacao[0];
  if (abreviacao) return abreviacao;
  return ctx.dic.acentos[maiuscula] ?? parte.toLowerCase();
}

function token(t: string, ctx: Contexto): string {
  // Abreviação com barra colada à palavra seguinte: "P/DIANT" → "para dianteiro".
  for (const chave of Object.keys(ctx.dic.abreviacoes).filter((k) => k.endsWith("/"))) {
    if (t.toUpperCase().startsWith(chave) && t.length > chave.length) {
      return `${palavra(chave, ctx)} ${token(t.slice(chave.length), ctx)}`;
    }
  }
  if (ctx.dic.abreviacoes[t.toUpperCase()] !== undefined) return palavra(t, ctx);
  return t
    .split("/")
    .map((p) => (p ? palavra(p, ctx) : p))
    .join("/");
}

export function nomePorExtenso(abreviado: string, dic: DicionarioNomes): string {
  const tokens = abreviado.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "";
  const preservar = new Map(dic.preservar.map((p) => [p.toUpperCase(), p]));
  const primeira = token(tokens[0]!, { dic, feminino: false, preservar }).toLowerCase();
  const feminino = primeira.endsWith("a") && !dic.masculinosEmA.includes(primeira);
  const ctx: Contexto = { dic, feminino, preservar };
  const texto = tokens.map((t) => token(t, ctx)).join(" ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
