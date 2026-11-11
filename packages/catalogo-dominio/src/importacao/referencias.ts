// Referências (spec 002 R7): código, tipo e marca, lidos dos rótulos usados no catálogo.
// O que não for referência volta como "restante", para a classificação seguinte.
import { normalizarCodigo } from "../busca/normalizar";

export type TipoReferencia = "ORIGINAL" | "SIMILAR" | "EQUIVALENTE" | "FABRICANTE";
export type ReferenciaLida = { codigo: string; tipo: TipoReferencia; marca: string | null };

// Um código: grupos de letras, números, ".", "-" e "/", separados por espaço só quando o
// grupo seguinte tem número e pelo menos 2 caracteres ("2R0 201 100", "ARL 6070";
// mas "3588 BATISTA" para em 3588 e "1234 2 PECAS" para em 1234).
const CODIGO = String.raw`[A-Za-z0-9][A-Za-z0-9.\-/]*(?:\s(?=[A-Za-z0-9.\-/]*\d)[A-Za-z0-9][A-Za-z0-9.\-/]+)*`;
const RotuloOriginal = String.raw`(?:C[ÓO]D\.?\s*ORIG(?:INAL)?\.?\s*:?|REF\.?\s*OR(?:I)?G(?:INAL)?\.?\s*:?|\bORIG(?:INAL)?\.?\s*:)`;

const REGRAS: { padrao: RegExp; tipo: TipoReferencia; marca: (m: RegExpExecArray) => string | null; grupo: number }[] =
  [
    { padrao: new RegExp(`${RotuloOriginal}\\s*(${CODIGO})`, "gi"), tipo: "ORIGINAL", marca: () => null, grupo: 1 },
    {
      padrao: new RegExp(`(?:C[óo]digo|\\bREF\\.?)\\s+Silc\\s*:?\\s*(${CODIGO})`, "gi"),
      tipo: "SIMILAR",
      marca: () => "Silc",
      grupo: 1,
    },
    { padrao: /\b(SC-\d{2}\.\d{3})\b/g, tipo: "SIMILAR", marca: () => "Silc", grupo: 1 },
    {
      padrao: new RegExp(`\\bREF\\.?\\s+((?!ORIG|ORG|APLICA)[A-Z]{2,12})\\s*:?\\s*(${CODIGO})`, "g"),
      tipo: "EQUIVALENTE",
      marca: (m) => m[1] ?? null,
      grupo: 2,
    },
    {
      padrao: new RegExp(`\\bREF(?:ER[ÊE]NCIA)?\\.?\\s*:\\s*(${CODIGO})`, "gi"),
      tipo: "EQUIVALENTE",
      marca: () => null,
      grupo: 1,
    },
  ];

const limparCodigo = (c: string) => c.trim().replace(/[.\-/]+$/, "");
const temNumero = (c: string) => /\d/.test(c);
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Rótulo sem valor ("CUBO: LONA:") seguido de outro rótulo ou do fim do texto.
const ROTULO_VAZIO = /[A-ZÀ-Ý][A-ZÀ-Ý.]{1,20}:\s*(?=[A-ZÀ-Ý][A-ZÀ-Ý.]{1,20}:|$)/gu;

/**
 * @param detalhes texto de detalhes do card
 * @param jaSeparadas referências que a extração já isolou
 * @param textoDoCard texto completo do card, para saber se uma referência separada era "original"
 * @param marcasDeConversao marcas que aparecem como "MARCA: código" nas tabelas de conversão
 */
export function extrairReferencias(
  detalhes: string,
  jaSeparadas: string[],
  textoDoCard: string,
  marcasDeConversao: string[],
): { referencias: ReferenciaLida[]; restante: string } {
  const referencias: ReferenciaLida[] = [];
  const vistas = new Set<string>();
  const adicionar = (ref: ReferenciaLida) => {
    const chave = normalizarCodigo(ref.codigo);
    if (!chave || vistas.has(chave)) return;
    vistas.add(chave);
    referencias.push(ref);
  };

  const regras = [
    ...REGRAS,
    ...marcasDeConversao.map((marca) => ({
      padrao: new RegExp(`\\b${escapar(marca)}\\s*:\\s*(${CODIGO})`, "gi"),
      tipo: "EQUIVALENTE" as const,
      marca: () => marca,
      grupo: 1,
    })),
  ];

  let restante = detalhes;
  for (const regra of regras) {
    restante = restante.replace(regra.padrao, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      const codigo = limparCodigo(m[regra.grupo] ?? "");
      if (!temNumero(codigo)) return m[0];
      adicionar({ codigo, tipo: regra.tipo, marca: regra.marca(m) });
      return " ";
    });
  }

  const originaisNoCard = new Set(
    [...textoDoCard.matchAll(new RegExp(`${RotuloOriginal}\\s*(${CODIGO})`, "gi"))].map((m) =>
      normalizarCodigo(limparCodigo(m[1] ?? "")),
    ),
  );
  for (const codigo of jaSeparadas.map(limparCodigo).filter(temNumero)) {
    adicionar({
      codigo,
      tipo: originaisNoCard.has(normalizarCodigo(codigo)) ? "ORIGINAL" : "EQUIVALENTE",
      marca: null,
    });
  }

  restante = restante
    .replace(/\s+/g, " ")
    .trim()
    .replace(ROTULO_VAZIO, "")
    .replace(/^[\s.,;:]+|[\s,;:]+$/g, "")
    .trim();
  return { referencias, restante };
}
