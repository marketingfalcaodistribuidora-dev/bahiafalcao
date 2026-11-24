---
name: dependency-check
description: Protocolo de segurança da cadeia de suprimentos (seção 5 do prompt) antes de instalar ou atualizar QUALQUER pacote npm, no site ou na API. Use sempre antes de npm install/update, ao revisar mudança em package.json ou lockfile, e quando o Dependabot ou o Renovate abrir um PR.
argument-hint: "<pacote>@<versão> [outro@versão ...]"
---

# Protocolo de dependências

Houve vários ataques recentes ao npm:
- contas de mantenedores comprometidas;
- versões maliciosas de pacotes populares;
- *worms* que se espalham pelo `postinstall`.

**Nenhuma dependência entra sem este protocolo, e nada é instalado antes da aprovação do responsável.**

## Passos

1. **Necessidade:** dá para fazer com a biblioteca padrão do Node ou com algo já instalado? Se der, não instale. Menos dependências = menos superfície de ataque.
2. **Verificação no momento, sem confiar na memória:**
   - `bash api/scripts/check-dep.sh <pacote>@<versão>`: idade, scripts de instalação, mantenedores, repositório, depreciação, assinatura, proveniência e OSV;
   - `npm audit` do conjunto: gere o lockfile numa pasta temporária com `npm install --package-lock-only` (só resolve versões, não roda scripts) e rode `npm audit` e `npm audit --omit=dev`;
   - dependências indiretas: `node api/scripts/check-lock.ts <lockfile-anterior> <lockfile-novo>` confere o lockfile novo inteiro sem rede (registro do npm, integridade sha512, versão) e compara os dois (o mesmo `nome@versão` com outro endereço ou integridade conta como alterado; recusa versão com menos de 7 dias, falha alta ou crítica, origem fora do registro e script fora do `allowScripts`; falha moderada vira aviso) (idade, OSV e `hasInstallScript` de cada pacote novo ou alterado);
   - se houver ferramenta de reputação (Socket), consulte: código ofuscado, acesso à rede ou ao disco, scripts de instalação.
3. **Critérios de recusa** (qualquer um bloqueia):
   - versão com **menos de 7 dias**: use a anterior estável (o `.npmrc` tem `min-release-age=7`);
   - troca recente de mantenedor;
   - `preinstall`/`postinstall` sem justificativa;
   - pacote abandonado: sem release há mais de 18 meses **e** com issues de segurança abertas;
   - *typosquatting* (nome parecido com pacote famoso);
   - vulnerabilidade **alta ou crítica** sem correção.
4. **Fixação:**
   - versão **exata** no `package.json` (`save-exact=true`), sem `^` nem `~`;
   - lockfile versionado;
   - `npm ci` no CI;
   - preferir pacotes com assinatura e proveniência, e rodar `npm audit signatures`.
5. **Scripts de instalação:**
   - só rodam os pacotes listados em `allowScripts` no `package.json` da raiz;
   - `strict-allow-scripts=true` no `.npmrc` faz a instalação falhar se aparecer outro;
   - cada liberação tem o motivo registrado.
6. **Registro:** atualize `docs/dependencias.md` com versão, motivo, data da verificação, resultado do audit e alternativas consideradas.
7. **Relatório ao responsável:** uma tabela com pacote, versão, idade, scripts, OSV e audit, e a recomendação. **Espere a aprovação antes do `npm install`.**

## Atualizações

A mesma checagem vale para cada versão nova. O Dependabot ou o Renovate agrupam as atualizações e esperam 7 dias; o CI bloqueia o merge com vulnerabilidade alta.
