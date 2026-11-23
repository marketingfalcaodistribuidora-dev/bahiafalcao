#!/usr/bin/env bash
# Conferência da esteira (spec 000, T004; CA4.4, CA7.1, CA7.2 e CA7.6). Roda no CI, na raiz do repositório.
# Garante que as proteções da cadeia de suprimentos continuam ligadas e que ninguém as contornou.
# Falha (código 1) no primeiro problema, dizendo qual é.
set -euo pipefail

falha() {
  echo "conferir-esteira: FALHOU. $1" >&2
  exit 1
}

# grep devolve 0 (achou), 1 (não achou) ou 2 (erro). Erro também é falha: uma busca que não
# rodou não pode passar como "nada encontrado".
nada_encontrado() {
  local status=0
  "$@" || status=$?
  case "$status" in
    0) return 1 ;;
    1) return 0 ;;
    *) falha "a busca não rodou (grep devolveu $status)." ;;
  esac
}

# 1) npm 11.20.0 ou mais novo: versões antigas ignoram min-release-age e strict-allow-scripts em silêncio.
versao_npm="$(npm -v)"
node -e '
  const [a, b] = process.argv[1].split(".").map(Number);
  process.exit(a > 11 || (a === 11 && b >= 20) ? 0 : 1);
' "$versao_npm" || falha "npm $versao_npm é antigo demais; o mínimo é 11.20.0."

# 2) As proteções do .npmrc estão ativas.
[ "$(npm config get strict-allow-scripts)" = "true" ] || falha "strict-allow-scripts não está ativo."
[ "$(npm config get min-release-age)" = "7" ] || falha "min-release-age não é 7."
[ "$(npm config get save-exact)" = "true" ] || falha "save-exact não está ativo."

# 3) Nenhuma versão com ^ ou ~ nos package.json do repositório.
node -e '
  const fs = require("node:fs");
  const ruins = [];
  for (const arquivo of ["package.json", "frontend/package.json", "api/package.json"]) {
    const pacote = JSON.parse(fs.readFileSync(arquivo, "utf8"));
    for (const secao of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      for (const [nome, versao] of Object.entries(pacote[secao] ?? {})) {
        if (/[\^~]/.test(versao)) ruins.push(`${arquivo}: ${nome}@${versao}`);
      }
    }
  }
  if (ruins.length) {
    console.error(ruins.join("\n"));
    process.exit(1);
  }
' || falha "há versões com ^ ou ~ (acima); use a versão exata."

# 4) Ninguém desliga a proteção de scripts de instalação (este arquivo fica de fora: ele cita as flags).
proibidas='--ignore-scripts|--dangerously-allow-all-scripts|ignore-scripts=true'
nada_encontrado grep -rEn --exclude=conferir-esteira.sh -e "$proibidas" \
  package.json frontend/package.json api/package.json .npmrc .github .githooks api/scripts ||
  falha "flag que desliga a proteção de scripts de instalação (acima)."

# 5) Nenhum SQL montado com texto nem lint desligado no código da API (segunda camada além do lint).
if [ -d api/src ]; then
  nada_encontrado grep -rEn --include='*.ts' --exclude-dir=generated \
    -e '\$queryRawUnsafe|\$executeRawUnsafe|Prisma\.raw\(|eslint-disable' api/src ||
    falha "SQL montado com texto ou lint desligado em api/src (acima)."
fi

# 6) Workflows do GitHub (CA7.6): toda action fixada por SHA de 40 caracteres (uma tag pode ser
#    movida para outro código), "permissions: contents: read" no topo, nenhuma permissão de
#    escrita em nível nenhum (nem write-all), todo checkout sem guardar credenciais e nenhum
#    gatilho que rode com os segredos do repositório código vindo de fora (pull_request_target,
#    workflow_run). Os comentários são descartados antes, para não enganar a conferência.
#    Sem parser de YAML (seria um pacote novo): as regras olham linha a linha, do jeito mais
#    rígido. PASTA_DOS_WORKFLOWS troca a pasta (para conferir esta própria regra).
node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const pasta = process.argv[1];
  const ruins = [];
  // Comentário do YAML: "#" no começo da linha ou depois de um espaço, até o fim da linha.
  const semComentario = (linha) => linha.replace(/(^|\s)#.*$/, "");
  for (const nome of fs.readdirSync(pasta).filter((arquivo) => /\.ya?ml$/.test(arquivo))) {
    const linhas = fs.readFileSync(path.join(pasta, nome), "utf8").split(/\r?\n/).map(semComentario);
    const texto = linhas.join("\n");
    linhas.forEach((linha, i) => {
      const onde = `${nome}:${i + 1}`;
      const uso = linha.match(/^\s*(?:-\s*)?uses:\s*(\S+)/);
      if (uso && !uso[1].startsWith("./") && !/@[0-9a-f]{40}$/.test(uso[1])) {
        ruins.push(`${onde}: action sem SHA: ${uso[1]}`);
      }
      if (/\bwrite-all\b/.test(linha) || /^\s*[\w-]+:\s*write\s*$/.test(linha)) {
        ruins.push(`${onde}: permissão de escrita: ${linha.trim()}`);
      }
      if (/\b(pull_request_target|workflow_run)\b/.test(linha)) {
        ruins.push(`${onde}: gatilho proibido: ${linha.trim()}`);
      }
    });
    if (!/^permissions:[ \t]*\n[ \t]+contents:[ \t]*read\b/m.test(texto)) {
      ruins.push(`${nome}: sem "permissions: contents: read" no topo`);
    }
    const checkouts = (texto.match(/uses:\s*actions\/checkout@/g) ?? []).length;
    const semCredenciais = (texto.match(/persist-credentials:\s*false/g) ?? []).length;
    if (checkouts !== semCredenciais) ruins.push(`${nome}: checkout sem persist-credentials: false`);
  }
  if (ruins.length) {
    console.error(ruins.join("\n"));
    process.exit(1);
  }
' "${PASTA_DOS_WORKFLOWS:-.github/workflows}" || falha "workflow fora da regra (acima)."

echo "conferir-esteira: tudo certo (npm $versao_npm, .npmrc ativo, versões exatas, sem flags proibidas, workflows fixados)."
