// Decide se o produto entra no índice do Google e explica, em texto claro, o que falta
// (plano 002 §5, spec 002 CA6.10; spec 003 CA4.10).

export type DadosIndexacao = {
  situacao: "RASCUNHO" | "PUBLICADO" | "INATIVO";
  revisarNome: boolean;
  temFoto: boolean;
  temReferencia: boolean;
  aplicacao: string;
  especificacoes: string;
  /** Título ou descrição iguais aos de outro produto do catálogo. */
  textosRepetidos: boolean;
};

export const SINAIS_MINIMOS = 2;

export function avaliarIndexacao(d: DadosIndexacao): { indexavel: boolean; motivos: string[] } {
  const motivos: string[] = [];
  if (d.situacao === "RASCUNHO") motivos.push("Ainda não publicado");
  if (d.situacao === "INATIVO") motivos.push("Desativado");
  if (d.revisarNome) motivos.push("Nome a confirmar");

  const sinais = [d.temFoto, d.temReferencia, d.aplicacao.trim() !== "", d.especificacoes.trim() !== ""].filter(
    Boolean,
  ).length;
  if (sinais < SINAIS_MINIMOS) {
    motivos.push(`Precisa de mais ${SINAIS_MINIMOS - sinais} destes: foto, referência, aplicação ou especificações`);
  }
  if (d.textosRepetidos) motivos.push("Título ou descrição iguais aos de outro produto");

  return { indexavel: motivos.length === 0, motivos };
}
