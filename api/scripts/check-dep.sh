#!/usr/bin/env bash
# Protocolo de dependências (seção 5 do PROMPT_BACKEND_FALCAO.md) para UMA versão de UM pacote.
# Uso: bash api/scripts/check-dep.sh <pacote>@<versão>
# Consulta o registro do npm e a base OSV no momento da execução (nunca confie na memória).
# Saída: um resumo legível e, no fim, APROVADO ou RECUSADO/REVISAR com os motivos (código 1).
# As dependências indiretas são conferidas pelo check-lock.sh (tarefa T006 da spec 000).
set -euo pipefail

alvo="${1:?Uso: check-dep.sh <pacote>@<versão>}"
pacote="${alvo%@*}"
versao="${alvo##*@}"

# Nome de pacote npm válido (com ou sem escopo) e versão semver exata. Impede que um argumento
# vire opção do npm (ex.: "--registry=...") ou quebre o JSON enviado à OSV.
if ! [[ "$pacote" =~ ^(@[a-z0-9][a-z0-9._~-]*/)?[a-z0-9][a-z0-9._~-]*$ ]]; then
  echo "Nome de pacote inválido: '$pacote'" >&2
  exit 2
fi
if ! [[ "$versao" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]] || [[ "$pacote" == "$versao" ]]; then
  echo "Informe a versão exata: <pacote>@<versão> (ex.: fastify@5.12.8)" >&2
  exit 2
fi

info="$(npm view --json -- "$pacote" time maintainers repository dist-tags)"
detalhe="$(npm view --json -- "$pacote@$versao" scripts deprecated dist license)"

INFO="$info" DETALHE="$detalhe" PACOTE="$pacote" VERSAO="$versao" node --input-type=module -e '
const info = JSON.parse(process.env.INFO);
const detalhe = JSON.parse(process.env.DETALHE || "{}");
const { PACOTE: pacote, VERSAO: versao } = process.env;
const dia = 24 * 60 * 60 * 1000;
const motivos = [];

// OSV, com paginação (next_page_token).
const vulns = [];
let pagina;
do {
  const corpo = { package: { name: pacote, ecosystem: "npm" }, version: versao, ...(pagina && { page_token: pagina }) };
  const resposta = await fetch("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`OSV respondeu ${resposta.status}`);
  const dados = await resposta.json();
  vulns.push(...(dados.vulns ?? []).map((v) => v.id));
  pagina = dados.next_page_token;
} while (pagina);

const publicada = info.time?.[versao];
if (!publicada) motivos.push(`a versão ${versao} não existe no registro`);
const idade = publicada ? Math.floor((Date.now() - Date.parse(publicada)) / dia) : null;
if (idade !== null && idade < 7) motivos.push(`publicada há ${idade} dia(s): o mínimo é 7`);

const estaveis = Object.entries(info.time ?? {}).filter(([v]) => /^\d+\.\d+\.\d+$/.test(v));
const ultima = estaveis.map(([, t]) => Date.parse(t)).sort((a, b) => b - a)[0];
const mesesSemRelease = ultima ? Math.floor((Date.now() - ultima) / (30 * dia)) : null;

const scripts = Object.keys(detalhe.scripts ?? {}).filter((s) => ["preinstall", "install", "postinstall"].includes(s));
if (scripts.length) motivos.push(`tem script de instalação (${scripts.join(", ")}): só entra se justificado e listado em allowScripts`);
if (detalhe.deprecated) motivos.push(`depreciado: ${detalhe.deprecated}`);
if (vulns.length) motivos.push(`vulnerabilidades na OSV: ${vulns.join(", ")} (bloqueia se alta ou crítica sem correção)`);

const repo = typeof info.repository === "object" ? info.repository?.url : info.repository;
if (!repo) motivos.push("sem repositório declarado");
console.log(`Pacote:             ${pacote}@${versao}`);
console.log(`Publicada em:       ${publicada?.slice(0, 10) ?? "?"} (${idade ?? "?"} dias)`);
console.log(`Mais nova:          ${info["dist-tags"]?.latest} (${info.time?.[info["dist-tags"]?.latest]?.slice(0, 10)})`);
console.log(`Sem release há:     ${mesesSemRelease ?? "?"} meses${mesesSemRelease > 18 ? "  <- ABANDONO? confira issues de segurança abertas" : ""}`);
console.log(`Mantenedores:       ${(info.maintainers ?? []).length}`);
console.log(`Repositório:        ${repo ?? "nenhum"}`);
console.log(`Licença:            ${detalhe.license ?? "?"}`);
console.log(`Proveniência:       ${detalhe.dist?.attestations ? "sim" : "não (preferir pacotes com proveniência)"}`);
console.log(`Scripts instalação: ${scripts.length ? scripts.join(", ") : "nenhum"}`);
console.log(`OSV:                ${vulns.length ? vulns.join(", ") : "nenhuma"}`);
console.log("");
console.log("Conferência manual obrigatória (registre o resultado em docs/dependencias.md):");
console.log("- troca recente de mantenedor (histórico de releases e do repositório);");
console.log("- typosquatting (nome parecido com pacote famoso);");
console.log("- reputação no Socket, se disponível;");
console.log("- depois de instalar: npm audit signatures.");
console.log(motivos.length ? `\nRECUSADO OU REVISAR:\n- ${motivos.join("\n- ")}` : "\nAPROVADO pelo protocolo automático.");
process.exit(motivos.length ? 1 : 0);
'
