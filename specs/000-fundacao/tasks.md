# Tarefas 000: Fundação da API do catálogo

- **Plano:** [plan.md](./plan.md)
- **Progresso:** 2 de 30

Regras:
- cada tarefa leva **até 2 h**;
- o teste fica numa tarefa **antes** da do código;
- `[P]` marca as que podem correr em paralelo.

## Preparação (configuração: sem lógica, coberta pelos testes de integração)

- [x] T001 Atualizar o Node local para 26.13.1. Na raiz:
  - `.nvmrc`;
  - `.npmrc` (`save-exact`, `min-release-age=7`, `strict-allow-scripts`, `engine-strict`);
  - `engines`, `devEngines` e `allowScripts` (plano §2);
  - `^` → versão exata do lockfile na raiz e no `frontend/` (D18).
  - Conferir que `npm ci` e `npm run check` do site continuam passando e que a Vercel oferece Node 26 (senão o build do site quebra com `engine-strict`).
  - **Feito em 19/11/2026:**
    - Node 26.13.1 e npm 11.20.0;
    - `npm ci` e `npm run check` verdes (95 testes, build ok), sem nenhuma versão alterada no lockfile;
    - a Vercel oferece Node 26 com npm 11;
    - prova numa pasta temporária: `vitest@5.1.1` (1 dia) recusado com `ETARGET … with a date before 12/11/2026`, e `core-js@3.45.1` (postinstall fora do `allowScripts`) recusado com `ESTRICTALLOWSCRIPTS`, sem instalar.
- [x] T002 Workspace `api/`:
  - `package.json` com as versões exatas da Fase 0;
  - `tsconfig.json` strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`);
  - ESLint strict + `eslint-plugin-security` + regras contra `any`, `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw`, `eval` e `new Function`;
  - `vitest.config.ts` com 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`;
  - `vitest.perf.config.ts` separado.
  - **Instalação só depois da aprovação.**
  - **Feito em 23/11/2026:**
    - protocolo refeito na instalação; versões e alerta novo em `docs/dependencias.md`;
    - teste `tests/unit/lint/regras-proibidas.test.ts` escrito antes da configuração: vermelho (sem configuração), depois verde (8 casos do CA4.4);
    - `npm run check` da raiz verde (site com 95 testes, API com 8, build ok);
    - `npm audit --omit=dev`: 0; `npm audit`: 0 altas e 0 críticas;
    - `npm audit signatures`: 856 verificados.
  - **Review-gate (23/11/2026): APROVADO pelos quatro revisores**, sem Crítico nem Alto. Corrigido na própria T002:
    - o lint barrava só a forma literal. Agora também barra colchetes, constante, template, desestruturação, apelido do `Prisma` e `raw` do runtime, e ignora comentários `eslint-disable` (`noInlineConfig`). São 10 casos novos no teste, todos vermelhos antes da correção;
    - os exemplos do teste declaravam o banco com o nome proibido, o que fazia a regra disparar pela declaração. Agora declaram sem o nome, e o caso do template mostrou um seletor errado, corrigido;
    - `typescript-eslint` 8.73.0 (as moderadas caíram de 13 para 7);
    - `pool: "forks"` explícito;
    - `hookTimeout` na configuração de performance;
    - `effect` na tabela de dependências.
- [ ] T003 `api/docker-compose.yml` (PostgreSQL 17 com `pg_stat_statements` + Mailpit, por *digest*, portas em 127.0.0.1) e `api/.env.example` comentado (plano §3).
- [ ] T004 `.githooks/pre-commit`: `lint-staged` + `gitleaks git --staged`; sem gitleaks, barra com a instrução (D17). O `lint-staged` está declarado em `api/`, mas o gancho roda na raiz: decidir onde ele fica e rodar o ESLint de cada workspace (o site usa o 9.39.5, a API o 10.15.0), conforme o review-gate da T002. Conferir a versão do gitleaks no `winget`. Varredura única do histórico inteiro do repositório com o gitleaks, com o resultado anexado aqui.
- [ ] T005 Apoio de testes:
  - `globalSetup` (container com `fsync=off`, locale fixo, as migrations no `falcao_modelo` e depois `IS_TEMPLATE true ALLOW_CONNECTIONS false`);
  - banco por arquivo (`CREATE DATABASE … TEMPLATE`, `DROP … WITH (FORCE)`; medir `FILE_COPY` × `WAL_LOG`);
  - pool de teste pequeno e `maxWorkers` calculado;
  - **separar os testes que precisam de Docker** (integração) do `npm test`, com `test:integration` próprio, ou decidir que o `pre-push` exige o Docker ligado e registrar a decisão (review-gate da T002);
  - `hookTimeout` e `teardownTimeout` medidos para o `globalSetup` e o `DROP … WITH (FORCE)`;
  - confirmar que a cobertura reprova abaixo de 90% assim que houver código em `src/`;
  - `Clock` fixo, `IdGenerator` previsível e `montarApp`.
- [ ] T006 [P] `check-lock.sh` para as dependências indiretas (compara dois lockfiles; idade, OSV e `hasInstallScript` de cada pacote novo ou alterado; sem `--ignore-scripts`; confirmar que `--package-lock-only` não roda scripts). Rodar sobre o lockfile da Fase 0 e anexar a saída. O `check-dep.sh` já foi corrigido em 19/11/2026: validação do nome e da versão, `--`, proveniência e paginação da OSV.

## Testes que falham (Red) e implementação (Green)

- [ ] T007 [P] Teste: `config/env` (CA1.1, CA4.6, CA4.7, `TRUST_PROXY=true` recusado).
- [ ] T008 Implementar `config/env.ts` (faz passar T007).
- [ ] T009 [P] Testes: `normalizarCodigo`, `normalizarTexto` (CA6.1, CA6.2); `paginacao` com tetos e `pagina` máxima (CA6.4).
- [ ] T010 Implementar `shared/normalizar.ts` e `shared/paginacao.ts` (faz passar T009).
- [ ] T011 Testes: extensões, `f_unaccent` com `search_path` mínimo, `IMMUTABLE`, índice GIN numa tabela temporária e equivalência código × banco (CA6.3, CA6.5).
- [ ] T012 Migration `0001_extensoes` (skill `prisma-migration`) e plugin `prisma` com os dois pools (faz passar T011). Gerador `prisma-client` com `output = "../src/generated/prisma"`, `moduleFormat = "esm"` e `importFileExtension = "js"`, coerentes com NodeNext (review-gate da T002).
- [ ] T013 Testes: formato único de erro: 404, 400 `validacao`, campo extra, `__proto__`, 500 neutro, 413, 415 (CA2.1–CA2.4, CA2.6).
- [ ] T014 Implementar `shared/erros.ts` e o plugin `erros` (faz passar T013).
- [ ] T015 Testes: P2002 → 409 (CA2.5); pool esgotado → 503 em ~2 s, segurando a conexão com `pool.connect()` (CA1.5).
- [ ] T016 Mapear erros do Prisma e a falta de conexão para erros de domínio (faz passar T015).
- [ ] T017 Testes: `x-request-id` (CA3.1) e logs por lista permitida, sem query, `set-cookie` nem campos aninhados em até 3 níveis (CA3.2).
- [ ] T018 Plugins `request-id` e `logs` (faz passar T017).
- [ ] T019 Testes: cabeçalhos e CSP do JSON, CORS (`null`, domínio parecido, `Vary`), 429 também no 404, `X-Forwarded-For` confiável e não confiável (CA4.1–CA4.3, CA4.5).
- [ ] T020 Plugins `seguranca` (helmet), `cors`, `rate-limit` e `trustProxy` (faz passar T019).
- [ ] T021 Testes: rota sem `acesso` ou sem schema → boot falha; lista fechada de exceções (CORS e `/docs`); rota não pública → 401; matriz de autorização; campo fora do schema não sai (CA5.2, CA5.5, CA5.6).
- [ ] T022 Plugin `acesso` (`onRoute` e `onRequest`) e o `serializerCompiler` (faz passar T021).
- [ ] T023 Testes: `/health/live`, `/health/ready` (200, 503, cache de 2 s e uma consulta só para chamadas simultâneas) e desligamento gracioso (CA1.2–CA1.4); `contarQueries` (CA8.3).
- [ ] T024 Módulo `saude`, auxiliar `contarQueries` e `server.ts` com desligamento (faz passar T023). Junto com o script `build`: `tsconfig.build.json` herdando o `tsconfig.json`, com `noEmit: false`, `rootDir: src`, `outDir: dist` e só `src/**` (review-gate da T002).
- [ ] T025 Testes: `/docs` ligado só com `development` ou `DOCS_HABILITADO`; respostas válidas contra o OpenAPI (CA5.1, CA5.3).
- [ ] T026 Plugin `swagger` (+ `transformStaticCSP`) e geração de `contracts/` com `openapi-typescript` (faz passar T025 e CA5.4).

## Medição, esteira e documentação

- [ ] T027 Medidor `scripts/medir.ts` (API compilada num processo filho; carga noutro processo; 30 s; aborta em não 2xx; `pg_stat_statements` zerado e anexado) + `docs/perf/README.md` (modelo de registro) + `perf/saude.perf.ts`. Medir `/health` contra o `docker-compose` e registrar em `docs/perf/` (CA8.1, CA8.2).
- [ ] T028 CI:
  - Node 26 no job do site (D15);
  - job `api` (plano §9);
  - todas as actions por SHA, `permissions: contents: read` e `persist-credentials: false`;
  - `.github/dependabot.yml` com espera de 7 dias.
  - Conferir CA4.4 e CA7.1–CA7.6 e anexar a saída aqui.
- [ ] T029 Passo a passo da proteção da `main` (D19) para o responsável; conferir com `gh api …/branches/main/protection` e anexar a saída.
- [ ] T030 Documentação:
  - `api/README.md`: comandos, pool, as duas opções de domínio com CORS, cookie e `TRUST_PROXY` de cada uma (D1);
  - `CHANGELOG.md`;
  - `docs/aplicacao/api-fundacao.md` (o quê, como e por quê).

## Verificação

- [ ] Cobertura ≥ 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`.
- [ ] Matriz de autorização verde.
- [ ] `review-gate` aprovado (sem Crítico nem Alto).
- [ ] OpenAPI, `README`, `.env.example`, `docs/` e `CHANGELOG.md` atualizados.

## Desvios registrados

| Tarefa | O que mudou | Por quê |
|---|---|---|
| T001 | `engines.node` ficou `26.x` (raiz e `frontend/`), e não `>=26.13.1 <27` | A Vercel reconhece `26.x` e pode estar numa 26 abaixo da 26.13.1 (o boletim dela cita a 26.12.1). O `.nvmrc` fixa a 26.13.1 no ambiente local. |
| T001 | `devEngines` (npm ≥ 11.20.0) com `onFail: "warn"`, e não `"error"` | A doc da Vercel diz só "npm 11" para o Node 26. Um erro aqui derrubaria o deploy do site. O erro fica no CI (T028). |
| T001 | O site passa a declarar Node 26 (`frontend/package.json` era `24.x`) | Decisão do responsável em 19/11/2026. Os testes e o build do site já passam em Node 26. Vale para a produção quando este ramo for juntado ao `main`. |
| T002 | Algumas versões ficaram mais novas que a lista de 19/11: `@fastify/cors` 11.4.3, `@fastify/swagger` 9.9.5, `@fastify/swagger-ui` 6.1.4, `eslint` 10.15.0 e `lint-staged` 17.6.1 | O protocolo manda a mais nova com 7 dias ou mais **no momento da instalação**. O `eslint` 10.15.0 era a correção prevista para 23/11. |
| T002 | `overrides` do `effect` 3.22.4 só dentro do `@prisma/config` | Alerta alto (GHSA-7589-6fvf-x4pw) publicado em 19/11, depois da verificação daquele dia; o Prisma 7.10.1 fixa a versão vulnerável. Detalhes em `docs/dependencias.md`. |
| T002 | Os scripts `lint`, `typecheck`, `test` e `test:coverage` da raiz passaram a rodar em todos os workspaces (site e API) | O portão local (`npm run check`, também no `pre-push`) cobre a API desde já. |
| T002 | Os scripts `dev`, `build`, `db:*`, `seed*`, `audit` e `test:integration` da API ainda não existem | Cada um entra na tarefa que cria o que ele roda, para não haver comando quebrado. |
| T002 | `vitest.perf.config.ts` com `passWithNoTests` | Até a T027 não há medições. |
| T001 | A sincronização do lockfile rodou uma vez com `--engine-strict=false` | O lockfile guardava o `24.x` antigo do `frontend/`, e o `engine-strict` recém-ligado barrava justamente a instalação que o corrige. Depois disso, `npm ci` passa com tudo ligado. |
