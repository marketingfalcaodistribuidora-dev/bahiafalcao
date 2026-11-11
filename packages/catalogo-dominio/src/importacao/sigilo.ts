// Verificação de sigilo da importação (plano 002 §2.3, etapa 10; spec 002 CA4.2).
// Nenhum texto público pode conter um código interno nem a marca de imposto "IMP (…)".

/** Trechos com cara de código: "EX-0301", "1110001" — e cada sequência de partes entre hífens
 * ("LE-EX-0402" também gera "EX-0402"). */
function candidatos(texto: string): string[] {
  const corridas = texto.toUpperCase().match(/[A-Z0-9]+(?:-[A-Z0-9]+)*/g) ?? [];
  return corridas.flatMap((c) => {
    const partes = c.split("-");
    const saida: string[] = [];
    for (let i = 0; i < partes.length; i++)
      for (let j = i + 1; j <= partes.length; j++) saida.push(partes.slice(i, j).join("-"));
    return saida;
  });
}

/**
 * Códigos internos que aparecem no texto como código inteiro (não como parte de um número maior).
 * Código só de dígitos vale com fronteira de dígito: "IABV1110001" e "1110001ANEL" contam.
 */
export function codigosNoTexto(texto: string, codigosInternos: ReadonlySet<string>): string[] {
  const corridasDeDigitos = texto.match(/\d+/g) ?? [];
  return [...new Set([...candidatos(texto), ...corridasDeDigitos].filter((c) => codigosInternos.has(c)))];
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tira do texto os códigos internos (referências cruzadas como "(ARCA - 1110002)") e o rótulo
 * vazio que sobra. Quem chama guarda o texto original numa pendência interna.
 */
export function removerCodigosInternos(
  texto: string,
  codigosInternos: ReadonlySet<string>,
): { texto: string; removidos: string[] } {
  const removidos = codigosNoTexto(texto, codigosInternos);
  if (!removidos.length) return { texto, removidos };
  let limpo = texto;
  for (const codigo of removidos) {
    const fronteira = /^\d+$/.test(codigo) ? ["(?<!\\d)", "(?!\\d)"] : ["(?<![A-Za-z0-9])", "(?![A-Za-z0-9])"];
    const alvo = `${fronteira[0]}${escapar(codigo)}${fronteira[1]}`;
    // Primeiro o parêntese que contém o código, inteiro ("(ARCA - 1110002)"); depois o código solto.
    limpo = limpo.replace(new RegExp(`\\([^()]*${alvo}[^()]*\\)`, "gi"), " ");
    limpo = limpo.replace(new RegExp(alvo, "gi"), " ");
  }
  limpo = limpo
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s\-/(]+$/, "")
    .trim();
  return { texto: limpo, removidos };
}

// Do lado seguro: "IMP (9,99)", "IMP 9,99", "IMP: 9" e a forma de endereço "imp-9-99".
// Número seguido de letra é medida, não imposto: "IMP 14T" (14 toneladas) não conta.
const MARCA_DE_IMPOSTO = /\bIMP\b\.?\s*[(:-]?\s*\d+(?:[.,-]\d+)?(?![\dA-Za-z])/i;

export type TextoPublico = { onde: string; texto: string };

export function verificarSigilo(textos: TextoPublico[], codigosInternos: Iterable<string>): string[] {
  const codigos = new Set([...codigosInternos].map((c) => c.toUpperCase()));
  const violacoes: string[] = [];
  for (const { onde, texto } of textos) {
    for (const codigo of codigosNoTexto(texto, codigos)) violacoes.push(`${onde}: contém o código interno ${codigo}`);
    if (MARCA_DE_IMPOSTO.test(texto)) violacoes.push(`${onde}: contém a marca de imposto IMP (…)`);
  }
  return violacoes;
}
