// Formato do catálogo extraído do PDF (produtos.json gerado pela ferramenta de extração).
// Um item = um card do PDF, na ordem das páginas.
import { z } from "zod";

// Caracteres de controle que o OCR deixa (o PostgreSQL recusa \u0000); quebras de linha ficam.
const semControle = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
const limpo = z.string().transform(semControle);
const texto = limpo.default("");

export const VarianteExtraida = z.object({
  codigo: limpo.pipe(z.string().min(1)),
  descricao: texto,
  nome_completo: texto,
  referencias: z.array(limpo).default([]),
  destaque: texto,
  detalhes: texto,
  valor_parenteses: texto,
  revisar: texto,
});

export const CardExtraido = z.object({
  nome: limpo,
  secao: texto,
  marcas: z.array(limpo).default([]),
  aplicacoes: z.array(limpo).default([]),
  detalhes: texto,
  destaque: texto,
  pagina_pdf: z.coerce.number().int().positive(),
  foto: texto,
  revisar: texto,
  texto_completo: texto,
  variantes: z.array(VarianteExtraida).min(1),
  logos: z.array(z.object({ nome: limpo, img: limpo })).default([]),
});

export type VarianteExtraida = z.infer<typeof VarianteExtraida>;
export type CardExtraido = z.infer<typeof CardExtraido>;

export function lerCatalogoExtraido(json: unknown): CardExtraido[] {
  return z.array(CardExtraido).parse(json);
}
