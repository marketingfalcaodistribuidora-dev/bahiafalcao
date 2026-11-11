// Importados (spec 002 R6): "IMP (9,99)" marca o item como importado e 9,99 é o imposto,
// que é dado INTERNO. Só vale com a palavra IMP: "ANEL RETENCAO 1,2" é medida.
// Aceita "IMP (9,99)", "IMP(9,99)", "IMP 9,99", "IMP. 9,99" e "IMP 8" (o OCR às vezes perde os parênteses).
const PADRAO_IMP = /\s*\bIMP\b\.?\s*\(?\s*(\d+)(?:[,.](\d+))?(?=\s|\)|$)\s*\)?/i;

export function extrairImposto(texto: string): { texto: string; imposto: string | null } {
  const achado = PADRAO_IMP.exec(texto);
  if (!achado) return { texto, imposto: null };
  const centavos = (achado[2] ?? "").padEnd(2, "0").slice(0, 2);
  const limpo = texto.replace(PADRAO_IMP, " ").replace(/\s+/g, " ").trim();
  return { texto: limpo, imposto: `${Number(achado[1])}.${centavos}` };
}
