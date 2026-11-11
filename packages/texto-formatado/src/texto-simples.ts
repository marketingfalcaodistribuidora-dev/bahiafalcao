// Versão sem marcação de um texto formatado, para títulos e descrições de SEO e para a busca.
// "## Título" + lista vira "Título: item, item"; parágrafos viram frases separadas por ponto.

type Bloco = { tipo: "titulo" | "lista" | "paragrafo"; partes: string[] };

const semNegrito = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").trim();
const terminaComPontuacao = (s: string) => /[.!?:;]$/.test(s);

export function textoSimples(texto: string): string {
  const blocos: Bloco[] = [];
  let aberto = null as Bloco | null;

  for (const bruta of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const linha = bruta.trim();
    const tipo: Bloco["tipo"] = linha.startsWith("## ") ? "titulo" : linha.startsWith("- ") ? "lista" : "paragrafo";
    if (!linha) {
      aberto = null;
      continue;
    }
    const conteudo = semNegrito(tipo === "titulo" ? linha.slice(3) : tipo === "lista" ? linha.slice(2) : linha);
    if (!conteudo) continue;
    if (tipo === "titulo" || aberto?.tipo !== tipo) {
      aberto = { tipo, partes: [] };
      blocos.push(aberto);
    }
    aberto.partes.push(conteudo);
  }

  let saida = "";
  let anterior: Bloco | null = null;
  for (const bloco of blocos) {
    const texto = bloco.partes.join(bloco.tipo === "lista" ? ", " : " ");
    if (!anterior) saida = texto;
    else if (anterior.tipo === "titulo") saida += `: ${texto}`;
    else saida += terminaComPontuacao(saida) ? ` ${texto}` : `. ${texto}`;
    anterior = bloco;
  }
  return saida;
}
