# Dependências da API (`api/`)

Registro obrigatório da seção 5 do prompt. **Nenhum pacote entra sem uma linha aqui.** Verificação = `npm view` (idade, scripts de instalação, mantenedores, repositório, assinatura e proveniência) + base OSV (osv.dev) + `npm audit` do conjunto. Ferramenta de reputação (Socket): não disponível neste ambiente; registrado como limitação.

**Situação:** lista da Fase 0 verificada em **19/11/2026** e **aprovada** pelo responsável na mesma data. A instalação acontece nas tarefas T001 e T002 da spec 000.

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
| @fastify/cors | 11.4.1 | 05/11/2026 | 11.4.3 (13/11, 6 dias) | CORS com lista exata de origens | não | sim / sim | nenhuma | Hook próprio |
| @fastify/cookie | 11.1.5 | 27/10/2026 | igual | Cookie da sessão `__Host-` | não | sim / sim | nenhuma | — |
| @fastify/rate-limit | 11.2.2 | 02/11/2026 | igual | Limites por IP e por identificador | não | sim / sim | nenhuma | Limitador próprio |
| @fastify/swagger | 9.9.3 | 01/11/2026 | 9.9.5 (16/11, 3 dias) | Gera o OpenAPI 3.1 | não | sim / sim | nenhuma | — |
| @fastify/swagger-ui | 6.1.3 | 03/11/2026 | 6.1.4 (14/11, 5 dias) | Página `/docs` (protegida em produção) | não | sim / sim | nenhuma | Servir só o JSON (sem página) |
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
| eslint | 10.14.0 | 30/10/2026 | 10.15.0 (13/11, 6 dias) | Lint | não | sim / não | nenhuma |
| typescript-eslint | 8.72.2 | 09/11/2026 | 8.73.0 (16/11, 3 dias) | Lint strict sem `any` | não | sim / sim | nenhuma |
| eslint-plugin-security | 4.2.1 | 30/10/2026 | igual | Regras de segurança no lint | não | sim / sim | nenhuma |
| @types/node | 26.6.6 | 28/10/2026 | igual | Tipos do Node 26 | não | sim / não | nenhuma |
| @types/pg | 8.23.1 | 17/08/2026 | igual | Tipos do `pg` | não | sim / não | nenhuma |
| lint-staged | 17.6.0 | 26/09/2026 | 17.6.1 (15/11, 4 dias) | Lint e formatação só no que vai para o commit | não | sim / sim | nenhuma |
| openapi-typescript | 7.13.0 | 11/02/2026 | igual | Tipos do contrato em `contracts/` para o front | não | sim / sim | nenhuma |

**Recusado:** `husky` 9.1.7 (sem versão há 24 meses; o repositório já ativa ganchos por `core.hooksPath`, decisão D10).

**Ferramentas de CI sem pacote npm:** SBOM pelo próprio `npm sbom --sbom-format cyclonedx`; gitleaks, Semgrep e Trivy por ações do GitHub fixadas por SHA (verificadas na tarefa do CI).

## `npm audit` do conjunto (19/11/2026)

Lockfile gerado numa pasta temporária, sem instalar (`npm install --package-lock-only --ignore-scripts`): **599 pacotes** no total.

- **Produção (`--omit=dev`): 0 vulnerabilidades.**
- **Desenvolvimento: 14 moderadas, 0 altas, 0 críticas.** Todas vêm de `minimatch` (GHSA-g3hv-75wg-m249, negação de serviço) e `glob` (GHSA-3g3m-2fjr-6pw4), por dentro do ESLint, do `typescript-eslint` e do Testcontainers. Só rodam na máquina de quem desenvolve e no CI, com entradas nossas. A correção está em `eslint` 10.15.0 e `typescript-eslint` 8.73.0, publicadas há menos de 7 dias: **atualizar a partir de 23/11/2026**, quando passarem no protocolo.

**Scripts de instalação no conjunto:** `prisma` e `@prisma/engines` (liberados, motivo acima); `esbuild` (confere o binário; funciona sem o script); `cpu-features`, `ssh2` e `protobufjs` (indiretas do Testcontainers, opcionais); `fsevents` (só macOS). Fora `prisma` e `@prisma/engines`, nenhum é liberado.

## Fases seguintes (a verificar quando a fase começar)

`argon2` (Fase 1), `@fastify/csrf-protection` (Fase 1), `sharp`, `file-type` e `@fastify/multipart` (Fase 3), `@fastify/compress` e `autocannon` ou k6 (Fase 4), leitor de planilha (`exceljs` ou a distribuição oficial do SheetJS, Fase 5), Stryker (Fase 7).
