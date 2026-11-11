// Classifica os detalhes do card em aplicação, especificações e observações (texto formatado).
// O que não for reconhecido vira PENDÊNCIA (spec 002 CA1.4), sem perder nada.
// Trecho com código interno nunca vai para campo público: vira pendência (interna).
import { codigosNoTexto } from "./sigilo";

type Campo = "aplicacao" | "observacao" | "especificacao";

/** Rótulos conhecidos → campo e nome canônico (para o negrito das especificações). */
const ROTULOS: [RegExp, Campo, string][] = [
  [/APLICA[ÇC](?:[ÃA]O|[ÕO]ES)/, "aplicacao", "Aplicação"],
  [/OBSERVA[ÇC](?:[ÃA]O|[ÕO]ES)|OBS/, "observacao", "Observação"],
  [/DIMENS(?:[ÃA]O|[ÕO]ES)/, "especificacao", "Dimensão"],
  [/DI[ÂA]METRO\s+EXT(?:ERNO)?/, "especificacao", "Diâmetro externo"],
  [/DI[ÂA]METRO\s+INT(?:ERNO)?/, "especificacao", "Diâmetro interno"],
  [/DI[ÂA]METRO/, "especificacao", "Diâmetro"],
  [/ALTURA/, "especificacao", "Altura"],
  [/LARGURA/, "especificacao", "Largura"],
  [/COMPRIMENTO|COMP/, "especificacao", "Comprimento"],
  [/ESPESSURA/, "especificacao", "Espessura"],
  [/ROSCA/, "especificacao", "Rosca"],
  [/PESO/, "especificacao", "Peso"],
  [/CAPACIDADE/, "especificacao", "Capacidade"],
  [/TENS[ÃA]O/, "especificacao", "Tensão"],
  [/POT[ÊE]NCIA/, "especificacao", "Potência"],
  [/MEDIDAS?/, "especificacao", "Medida"],
  [/SHORE\s+A/, "especificacao", "Dureza (Shore A)"],
];

const ROTULO = new RegExp(`(?<![\\p{L}])(${ROTULOS.map(([r]) => r.source).join("|")})\\s*:`, "giu");
const MEDIDA_SOLTA = /^[\d.,]+\s*(?:[xX×]\s*[\d.,]+\s*)*(?:mm|cm|m|pol|")?$/i;

const semPontaFinal = (s: string) => s.trim().replace(/[\s.,;:]+$/, "");
const maiusculaInicial = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function rotuloCanonico(rotulo: string): [Campo, string] {
  const r = rotulo.toUpperCase().replace(/\s+/g, " ");
  for (const [padrao, campo, nome] of ROTULOS)
    if (new RegExp(`^(?:${padrao.source})$`, "u").test(r)) return [campo, nome];
  return ["especificacao", maiusculaInicial(rotulo.toLowerCase())];
}

export type Pendencia = { trecho: string; tipo: "texto" | "destaque" | "codigo-interno" };

export type Classificacao = {
  aplicacao: string;
  especificacoes: string;
  observacoes: string;
  pendencias: Pendencia[];
};

export function classificar(entrada: {
  textos: string[];
  destaque: string;
  tiposDeVeiculo: string[];
  codigosInternos: Iterable<string>;
}): Classificacao {
  const codigos = new Set([...entrada.codigosInternos].map((c) => c.toUpperCase()));
  const aplicacao: string[] = [];
  const especificacoes: string[] = [];
  const observacoes: string[] = [];
  const pendencias: Pendencia[] = [];

  const textos = [...new Set(entrada.textos.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean))];
  for (const texto of textos) {
    const rotulos = [...texto.matchAll(ROTULO)];
    const solto = semPontaFinal(texto.slice(0, rotulos[0]?.index ?? texto.length));
    const trechos: { bruto: string; rotulo: string | null; valor: string }[] = [];
    if (solto) trechos.push({ bruto: solto, rotulo: null, valor: solto });
    rotulos.forEach((m, i) => {
      const fim = rotulos[i + 1]?.index ?? texto.length;
      const valor = semPontaFinal(texto.slice(m.index + m[0].length, fim));
      if (valor) trechos.push({ bruto: semPontaFinal(texto.slice(m.index, fim)), rotulo: m[1] ?? "", valor });
    });

    for (const t of trechos) {
      if (codigosNoTexto(t.bruto, codigos).length) {
        pendencias.push({ trecho: t.bruto, tipo: "codigo-interno" });
      } else if (t.rotulo === null) {
        if (MEDIDA_SOLTA.test(t.valor)) especificacoes.push(`- ${t.valor}`);
        else pendencias.push({ trecho: t.bruto, tipo: "texto" });
      } else {
        const [campo, nome] = rotuloCanonico(t.rotulo);
        if (campo === "aplicacao") aplicacao.push(`- ${t.valor}`);
        else if (campo === "observacao") observacoes.push(maiusculaInicial(t.valor));
        else especificacoes.push(`- **${nome}:** ${t.valor}`);
      }
    }
  }

  for (const tipo of entrada.tiposDeVeiculo) aplicacao.push(`- ${tipo}`);
  if (entrada.destaque.trim()) pendencias.push({ trecho: entrada.destaque.trim(), tipo: "destaque" });

  const unicos = (linhas: string[]) => [...new Set(linhas)].join("\n");
  return {
    aplicacao: unicos(aplicacao),
    especificacoes: unicos(especificacoes),
    observacoes: unicos(observacoes),
    pendencias,
  };
}
