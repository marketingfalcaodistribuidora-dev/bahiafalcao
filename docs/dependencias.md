# Dependências da API (`api/`)

Registro obrigatório da seção 5 do prompt. **Nenhum pacote entra sem uma linha aqui.** Verificação = `npm view` (idade, scripts de instalação, mantenedores, repositório, assinatura e proveniência) + base OSV (osv.dev) + `npm audit` do conjunto. Ferramenta de reputação (Socket): não disponível neste ambiente; registrado como limitação.

**Situação:** lista da Fase 0 verificada em 19/11/2026, aprovada pelo responsável na mesma data, **verificada de novo e instalada em 23/11/2026** (tarefa T002 da spec 000). As tabelas mostram as versões instaladas.

## Regras aplicadas

- Versão estável mais nova com **7 dias ou mais** de publicada. Se a mais nova tem menos de 7 dias, fica a anterior (coluna "Mais nova").
- Versões exatas (`save-exact=true`), lockfile versionado e `npm ci` no CI.
- Scripts de instalação só para os pacotes de `allowScripts` (veja [decisões em aberto](./decisoes-em-aberto.md), D12).

## Fase 0: execução (produção)

| Pacote | Versão | Publicada | Mais nova | Motivo | Scripts de instalação | Assinatura / proveniência | OSV | Alternativas consideradas |
|---|---|---|---|---|---|---|---|---|
| fastify | 5.12.8 | 02/11/2026 | igual | Servidor HTTP (stack obrigatória) | não | sim / não | nenhuma | — (obrigatório) |
| zod | 4.6.7 | 12/10/2026 | igual | Validação de toda entrada, saída e ambiente | não | sim / sim | nenhuma | — (obrigatório) |
| fastify-type-provider-zod | 7.0.0 | 24/06/2026 | igual | Schemas Zod como validação, serialização e OpenAPI | não | sim / sim | nenhuma | `@fastify/type-provider-json-schema-to-ts` (perde o Zod como fonte única) |
| openapi-types | 12.1.3 | 24/05/2023 | igual | Só tipos; exigido (peer) pelo `fastify-type-provider-zod` | não | sim / — | nenhuma | — (peer obrigatório). Sem versão nova há 30 meses, mas é só declaração de tipos e não tem problema de segurança aberto. |
| @fastify/helmet | 13.2.0 | 13/10/2026 | igual | Cabeçalhos de segurança, CSP em `/docs` | não | sim / sim | nenhuma | Cabeçalhos à mão (mais código próprio) |
| @fastify/cors | 11.4.3 | 13/11/2026 | igual | CORS com lista exata de origens | não | sim / sim | nenhuma | Hook próprio |
| @fastify/cookie | 11.1.5 | 27/10/2026 | igual | Cookie da sessão `__Host-` | não | sim / sim | nenhuma | — |
| @fastify/rate-limit | 11.2.2 | 02/11/2026 | igual | Limites por IP e por identificador | não | sim / sim | nenhuma | Limitador próprio |
| @fastify/swagger | 9.9.5 | 16/11/2026 | igual | Gera o OpenAPI 3.1 | não | sim / sim | nenhuma | — |
| @fastify/swagger-ui | 6.1.4 | 14/11/2026 | igual | Página `/docs` (protegida em produção) | não | sim / sim | nenhuma | Servir só o JSON (sem página) |
| @prisma/client | 7.10.1 | 15/10/2026 | igual | ORM (stack obrigatória) | não | sim / sim | nenhuma | — (obrigatório) |
| @prisma/adapter-pg | 7.10.1 | 15/10/2026 | igual | Driver do PostgreSQL para o Prisma 7 | não | sim / sim | nenhuma | — (exigido pelo Prisma 7) |
| pg | 8.23.1 | 30/09/2026 | igual | Driver do PostgreSQL (usado pelo adaptador) | não | sim / não | nenhuma | — (exigido pelo adaptador). Um mantenedor só. |

`pino` já vem com o Fastify (não entra à parte).

## Fase 0: desenvolvimento

| Pacote | Versão | Publicada | Mais nova | Motivo | Scripts de instalação | Assinatura / proveniência | OSV |
|---|---|---|---|---|---|---|---|
| prisma | 7.10.1 | 15/10/2026 | igual | CLI de migrações e geração do cliente | **`preinstall`** (confere a versão do Node) | sim / sim | nenhuma |
| @prisma/engines (indireta) | 7.10.1 | 15/10/2026 | igual | Motor de migrações | **`postinstall`** (baixa o binário do motor) | sim / sim | nenhuma |
| typescript | 5.9.3 | 30/09/2025 | 7.0.2 | Compilador (decisão D11) | não | sim / não | nenhuma |
| tsx | 4.23.15 | 20/09/2026 | igual | Rodar TypeScript em desenvolvimento | não | sim / sim | nenhuma |
| vitest | 5.1.0 | 02/11/2026 | 5.1.1 (18/11, 1 dia) | Testes (obrigatório) | não | sim / sim | nenhuma |
| @vitest/coverage-v8 | 5.1.0 | 02/11/2026 | 5.1.1 (18/11, 1 dia) | Cobertura ≥ 90% | não | sim / sim | nenhuma |
| testcontainers | 12.2.1 | 13/10/2026 | 12.2.2 (19/11, 0 dia) | PostgreSQL real nos testes (obrigatório) | não (indiretas: veja abaixo) | sim / não | nenhuma |
| @testcontainers/postgresql | 12.2.1 | 13/10/2026 | 12.2.2 (19/11, 0 dia) | Módulo PostgreSQL do Testcontainers | não | sim / não | nenhuma |
| eslint | 10.15.0 | 13/11/2026 | igual | Lint | não | sim / não | nenhuma |
| typescript-eslint | 8.73.0 | 16/11/2026 | igual | Lint strict sem `any` | não | sim / sim | nenhuma |
| eslint-plugin-security | 4.2.1 | 30/10/2026 | igual | Regras de segurança no lint | não | sim / sim | nenhuma |
| @types/node | 26.6.6 | 28/10/2026 | igual | Tipos do Node 26 | não | sim / não | nenhuma |
| @types/pg | 8.23.1 | 17/08/2026 | igual | Tipos do `pg` | não | sim / não | nenhuma |
| effect (indireta, por `overrides`) | 3.22.4 | 22/10/2026 | 4.1.5 (outra linha) | Corrige o GHSA-7589-6fvf-x4pw no CLI do Prisma, que fixa a 3.20.0 vulnerável. **Sai quando o Prisma depender de uma versão corrigida.** | não | sim / sim | nenhuma |
| lint-staged | 17.6.1 | 15/11/2026 | igual | Lint e formatação só no que vai para o commit | não | sim / sim | nenhuma |
| openapi-typescript | 7.13.0 | 11/02/2026 | igual | Tipos do contrato em `contracts/` para o front | não | sim / sim | nenhuma |

**Recusado:** `husky` 9.1.7 (sem versão há 24 meses; o repositório já ativa ganchos por `core.hooksPath`, decisão D10).

**Ferramentas de CI sem pacote npm:** SBOM pelo próprio `npm sbom --sbom-format cyclonedx`; gitleaks, Semgrep e Trivy por ações do GitHub fixadas por SHA (verificadas na tarefa do CI).

## `npm audit` do conjunto (19/11/2026)

Lockfile gerado numa pasta temporária, sem instalar (`npm install --package-lock-only --ignore-scripts`): **599 pacotes** no total.

- **Produção (`--omit=dev`): 0 vulnerabilidades.**
- **Desenvolvimento: 14 moderadas, 0 altas, 0 críticas.** Todas vêm de `minimatch` (GHSA-g3hv-75wg-m249, negação de serviço) e `glob` (GHSA-3g3m-2fjr-6pw4), por dentro do ESLint, do `typescript-eslint` e do Testcontainers. Só rodam na máquina de quem desenvolve e no CI, com entradas nossas. A correção está em `eslint` 10.15.0 e `typescript-eslint` 8.73.0, publicadas há menos de 7 dias: **atualizar a partir de 23/11/2026**, quando passarem no protocolo.

**Scripts de instalação no conjunto:** `prisma` e `@prisma/engines` (liberados, motivo acima); `esbuild` (confere o binário; funciona sem o script); `cpu-features`, `ssh2` e `protobufjs` (indiretas do Testcontainers, opcionais); `fsevents` (só macOS). Fora `prisma` e `@prisma/engines`, nenhum é liberado.

## Instalação de 23/11/2026 (T002)

O protocolo foi refeito no momento da instalação, com o mesmo script.

**Versões trocadas pela mais nova com 7 dias ou mais** (todas sem script de instalação e sem nada na OSV):

| Pacote | De → para |
|---|---|
| @fastify/cors | 11.4.1 → 11.4.3 |
| @fastify/swagger | 9.9.3 → 9.9.5 |
| @fastify/swagger-ui | 6.1.3 → 6.1.4 |
| eslint | 10.14.0 → 10.15.0 (corrige parte dos avisos moderados) |
| lint-staged | 17.6.0 → 17.6.1 |
| typescript-eslint | 8.72.2 → 8.73.0 (completou 7 dias em 23/11; corrige parte dos avisos moderados; o lint do site usa o mesmo pacote) |

**Alerta novo, de 19/11/2026 (depois da verificação daquele dia):**
- [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw), **alta**: ReDoS no `effect` ≤ 3.22.0. O `effect` vem pelo `@prisma/config` (CLI do Prisma), que fixa a 3.20.0.
- **Correção:** `overrides` no `package.json` da raiz, restrito a esse caminho (`"@prisma/config": { "effect": "3.22.4" }`). A 3.22.4 é de 22/10/2026, passou no `check-dep.sh` (sem script, sem OSV, com proveniência) e é da mesma linha 3.x.
- **Conferido:** o `prisma validate` funciona com ela (aceita um schema certo e recusa um errado).
- **Quando tirar:** remover o `override` quando o Prisma passar a depender de um `effect` corrigido.

**Resultado:**
- `npm audit --omit=dev`: **0 vulnerabilidades**;
- `npm audit`: **0 altas e 0 críticas**. Com o `typescript-eslint` 8.73.0 (instalado no mesmo dia, ao completar 7 dias), ficam **7 moderadas**, só de desenvolvimento: `minimatch` e `glob` por dentro do Testcontainers (`archiver`). A correção depende de uma versão nova do Testcontainers; **revisar em 07/12/2026** ou quando o Dependabot abrir a atualização;
- `npm audit signatures`: 856 pacotes com assinatura do registro verificada, 249 com proveniência.

## Imagem auxiliar dos testes (T005, 23/11/2026)

- **`testcontainers/ryuk` 0.14.0:** baixada pelo próprio Testcontainers 12.2.1 (a versão vem fixada na biblioteca). Ela apaga os containers de teste quando a execução termina, inclusive se o processo cair. Conferido: depois dos testes, nenhum container ficou rodando. Muda só quando o Testcontainers for atualizado, e aí passa pelo protocolo junto com ele.

## Ferramentas da esteira (T004, 23/11/2026)

- **`lint-staged` 17.6.1 saiu da API e foi para a raiz.** É ferramenta do repositório inteiro: o gancho `pre-commit` roda na raiz e chama o ESLint de cada workspace.
- **Actions do GitHub**, fixadas pelo SHA do commit, com 7 dias ou mais:

| Action | Versão | Publicada | SHA |
|---|---|---|---|
| `actions/checkout` | v7.0.1 | 20/07/2026 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v7.1.0 | 08/10/2026 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |

- **gitleaks no CI:** binário 8.30.1 (21/03/2026) baixado do release oficial e conferido pelo SHA-256 (`551f6fc8…f2470eb`, linux_x64) antes de rodar. Não usamos a `gitleaks-action`, que exige licença em contas de organização.
- **Dependabot** (`.github/dependabot.yml`): npm, GitHub Actions e as imagens do `api/docker-compose.yml`, toda segunda, com espera de 7 dias e PRs agrupados.

## Imagens Docker do ambiente local (T003, 23/11/2026)

Mesma regra dos pacotes: versão com 7 dias ou mais, fixada por digest (lista multiarquitetura do Docker Hub).

| Imagem | Versão | Publicada | Mais nova | Motivo |
|---|---|---|---|---|
| `postgres` (oficial) | 17.11-alpine, `sha256:e5d2edd2…4700d0` | 11/11/2026 | 17.12-alpine (21/11): trocar a partir de 28/11/2026 | Banco local e da medição de performance |
| `axllent/mailpit` | v1.33.1, `sha256:aef2aacc…7761ce` | 07/11/2026 | v1.34.0 (17/11): trocar a partir de 24/11/2026 | "Falso e-mail" local até a Fase 1 (decisão R8) |

## Fases seguintes (a verificar quando a fase começar)

`argon2` (Fase 1), `@fastify/csrf-protection` (Fase 1), `sharp`, `file-type` e `@fastify/multipart` (Fase 3), `@fastify/compress` e `autocannon` ou k6 (Fase 4), leitor de planilha (`exceljs` ou a distribuição oficial do SheetJS, Fase 5), Stryker (Fase 7).
