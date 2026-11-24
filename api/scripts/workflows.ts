// Regras dos workflows do GitHub (spec 000, CA7.6), em função pura para ser testada. O
// conferir-workflows.ts aplica as regras a cada arquivo da pasta .github/workflows.
// Sem parser de YAML (seria um pacote novo): as regras olham linha a linha, do jeito mais rígido,
// depois de descartar os comentários (que poderiam enganar a conferência).

/** Commit de 40 caracteres: uma tag (v4) pode ser movida para outro código. */
const FIXADA_POR_SHA = /@[0-9a-f]{40}$/;

/** "chave: write", com ou sem aspas, ou "write" dentro de chaves ({ contents: write }), ou write-all. */
const PERMISSAO_DE_ESCRITA = [
  /\bwrite-all\b/,
  /^\s*[\w-]+:\s*["']?write["']?\s*$/,
  /\{[^}]*:\s*["']?write["']?\s*[,}]/,
];

/** Gatilhos que rodam código vindo de fora com os segredos do repositório. */
const GATILHO_PROIBIDO = /\b(pull_request_target|workflow_run)\b/;

/** Escape de caractere (_, \x5f): esconderia um nome proibido do texto conferido. */
const ESCAPE = /\\[ux]/i;

/** "uses: x@y" em qualquer lugar da linha: no começo, num mapa inline ou entre aspas. */
const USOS = /\buses:\s*["']?([^\s,}\]"']+)/g;

/**
 * Comentário do YAML: "#" no começo da linha ou depois de um espaço, FORA de aspas, até o fim da
 * linha. Um " #" dentro de aspas é texto e não pode esconder o resto da linha.
 */
function semComentario(linha: string): string {
  let aspas: string | null = null;
  for (let i = 0; i < linha.length; i++) {
    const letra = linha.charAt(i);
    if (aspas) {
      if (letra === aspas) aspas = null;
    } else if (letra === '"' || letra === "'") {
      aspas = letra;
    } else if (letra === "#" && (i === 0 || /\s/.test(linha.charAt(i - 1)))) {
      return linha.slice(0, i);
    }
  }
  return linha;
}

/** Os problemas de um workflow, com o arquivo e a linha. Lista vazia: o workflow está certo. */
export function problemasDoWorkflow(nome: string, conteudo: string): string[] {
  const linhas = conteudo.split(/\r?\n/).map(semComentario);
  const texto = linhas.join("\n");
  const problemas: string[] = [];

  linhas.forEach((linha, indice) => {
    const onde = `${nome}:${String(indice + 1)}`;
    for (const [, uso = ""] of linha.matchAll(USOS)) {
      if (!uso.startsWith("./") && !FIXADA_POR_SHA.test(uso)) problemas.push(`${onde}: action sem SHA: ${uso}`);
    }
    if (ESCAPE.test(linha)) problemas.push(`${onde}: escape de caractere proibido: ${linha.trim()}`);
    if (PERMISSAO_DE_ESCRITA.some((regra) => regra.test(linha))) {
      problemas.push(`${onde}: permissão de escrita: ${linha.trim()}`);
    }
    if (GATILHO_PROIBIDO.test(linha)) problemas.push(`${onde}: gatilho proibido: ${linha.trim()}`);
  });

  if (!/^permissions:[ \t]*\n[ \t]+contents:[ \t]*read\b/m.test(texto)) {
    problemas.push(`${nome}: sem "permissions: contents: read" no topo`);
  }
  const checkouts = (texto.match(/uses:\s*actions\/checkout@/g) ?? []).length;
  const semCredenciais = (texto.match(/persist-credentials:\s*false/g) ?? []).length;
  if (checkouts !== semCredenciais) problemas.push(`${nome}: checkout sem persist-credentials: false`);
  return problemas;
}
