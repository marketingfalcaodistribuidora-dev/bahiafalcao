// Regras dos workflows do GitHub (spec 000, CA7.6), em função pura para ser testada. O
// conferir-workflows.ts aplica as regras a cada arquivo da pasta .github/workflows.
//
// Sem parser de YAML (seria um pacote novo), as regras olham linha a linha e falham FECHADO: em
// vez de reconhecer cada jeito de escrever uma permissão de escrita, recusam a palavra "write" em
// qualquer lugar e os recursos do YAML que permitem escrever a mesma coisa de outro jeito (âncora,
// tag, chave complexa, valor na linha de baixo, escape). É uma heurística rígida, não um parser:
// o controle de verdade, do lado do GitHub, é a proteção da main (D19).

/** Commit de 40 caracteres: uma tag (v4) pode ser movida para outro código. */
const FIXADA_POR_SHA = /@[0-9a-f]{40}$/;

/** "write" em qualquer lugar fora de comentário: é o único valor de escrita (inclui write-all). */
const ESCRITA = /\bwrite\b/;

/** Gatilhos que rodam código vindo de fora com os segredos do repositório. */
const GATILHO_PROIBIDO = /\b(pull_request_target|workflow_run)\b/;

/** Escape de caractere (_, \x5f): esconderia um nome proibido do texto conferido. */
const ESCAPE = /\\[ux]/i;

/** "uses: x@y" em qualquer lugar da linha, com ou sem aspas na chave e no valor. */
const USOS = /["']?\buses["']?\s*:\s*["']?([^\s,}\]"']*)/g;

/** Âncora (&nome) ou apelido (*nome) do YAML, fora de aspas. */
const ANCORA = /(^|[\s:,[{-])[&*][A-Za-z0-9_-]/;
/** Tag do YAML (!!str, !tag) logo depois de uma chave ou de um item de lista, fora de aspas. */
const TAG = /!!|[:-]\s*![A-Za-z<]/;
/** Chave complexa do YAML ("? chave" e ": valor" na linha de baixo). */
const CHAVE_COMPLEXA = /^\s*\?(\s|$)/;

/** Varre a linha marcando o que está entre aspas; devolve o texto sem comentário e sem aspas. */
function partes(linha: string): { semComentario: string; foraDeAspas: string } {
  let aspas: string | null = null;
  let foraDeAspas = "";
  for (let i = 0; i < linha.length; i++) {
    const letra = linha.charAt(i);
    if (aspas) {
      if (letra === aspas) aspas = null;
      continue;
    }
    if (letra === '"' || letra === "'") {
      aspas = letra;
      continue;
    }
    // Comentário: "#" no começo ou depois de um espaço, fora de aspas, até o fim da linha.
    if (letra === "#" && (i === 0 || /\s/.test(linha.charAt(i - 1)))) {
      return { semComentario: linha.slice(0, i), foraDeAspas };
    }
    foraDeAspas += letra;
  }
  return { semComentario: linha, foraDeAspas };
}

/** Os problemas de um workflow, com o arquivo e a linha. Lista vazia: o workflow está certo. */
export function problemasDoWorkflow(nome: string, conteudo: string): string[] {
  const linhas = conteudo.split(/\r?\n/).map(partes);
  const texto = linhas.map((linha) => linha.semComentario).join("\n");
  const problemas: string[] = [];
  let checkouts = 0;

  linhas.forEach(({ semComentario: linha, foraDeAspas }, indice) => {
    const onde = `${nome}:${String(indice + 1)}`;
    const trecho = linha.trim();
    for (const [, uso = ""] of linha.matchAll(USOS)) {
      if (!uso) problemas.push(`${onde}: uses sem valor na mesma linha`);
      else if (uso.startsWith("./")) {
        if (uso.includes("..")) problemas.push(`${onde}: action local fora do repositório: ${uso}`);
      } else if (!FIXADA_POR_SHA.test(uso)) problemas.push(`${onde}: action sem SHA: ${uso}`);
      if (uso.startsWith("actions/checkout@")) checkouts++;
    }
    if (ESCAPE.test(linha)) problemas.push(`${onde}: escape de caractere proibido: ${trecho}`);
    if (ESCRITA.test(linha)) problemas.push(`${onde}: permissão de escrita: ${trecho}`);
    if (GATILHO_PROIBIDO.test(linha)) problemas.push(`${onde}: gatilho proibido: ${trecho}`);
    if (ANCORA.test(foraDeAspas)) problemas.push(`${onde}: âncora ou apelido do YAML: ${trecho}`);
    if (TAG.test(foraDeAspas)) problemas.push(`${onde}: tag do YAML: ${trecho}`);
    if (CHAVE_COMPLEXA.test(foraDeAspas)) problemas.push(`${onde}: chave complexa do YAML: ${trecho}`);
  });

  if (!/^permissions:[ \t]*\n[ \t]+contents:[ \t]*read\b/m.test(texto)) {
    problemas.push(`${nome}: sem "permissions: contents: read" no topo`);
  }
  // Só conta a chave na própria linha (um "persist-credentials: false" dentro de um texto não vale).
  const semCredenciais = (texto.match(/^\s+persist-credentials:\s*false\s*$/gm) ?? []).length;
  if (checkouts !== semCredenciais) problemas.push(`${nome}: checkout sem persist-credentials: false`);
  return problemas;
}
