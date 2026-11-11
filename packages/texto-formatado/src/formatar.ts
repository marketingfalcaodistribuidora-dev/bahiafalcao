// Formatação mínima e segura dos textos livres (aplicação, especificações, observações).
// Permitido: **negrito**, listas com "- " e subtítulos com "## ". Todo o resto é escapado.
// A mesma função gera a pré-visualização do painel e o texto do site (R9 da spec 003).

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Escapa a linha e só então converte **pares** de asteriscos em negrito. */
function linha(texto: string): string {
  return escapar(texto).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

type Bloco = { tipo: "lista"; itens: string[] } | { tipo: "paragrafo"; linhas: string[] };

export function formatar(texto: string): string {
  const html: string[] = [];
  let aberto: Bloco | null = null;

  const fechar = () => {
    if (aberto?.tipo === "lista") html.push(`<ul>${aberto.itens.map((i) => `<li>${i}</li>`).join("")}</ul>`);
    if (aberto?.tipo === "paragrafo") html.push(`<p>${aberto.linhas.join("<br>")}</p>`);
    aberto = null;
  };

  for (const bruta of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const atual = bruta.trimEnd();
    if (!atual.trim()) {
      fechar();
    } else if (atual.startsWith("## ")) {
      fechar();
      html.push(`<h3>${linha(atual.slice(3).trim())}</h3>`);
    } else if (atual.startsWith("- ")) {
      if (aberto?.tipo !== "lista") {
        fechar();
        aberto = { tipo: "lista", itens: [] };
      }
      aberto.itens.push(linha(atual.slice(2).trim()));
    } else {
      if (aberto?.tipo !== "paragrafo") {
        fechar();
        aberto = { tipo: "paragrafo", linhas: [] };
      }
      aberto.linhas.push(linha(atual.trim()));
    }
  }
  fechar();
  return html.join("");
}
