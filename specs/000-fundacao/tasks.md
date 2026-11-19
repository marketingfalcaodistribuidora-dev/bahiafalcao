# Tarefas 000: Fundação da API do catálogo

- **Plano:** [plan.md](./plan.md)
- **Progresso:** 0 de 30

Regras:
- cada tarefa leva **até 2 h**;
- o teste fica numa tarefa **antes** da do código;
- `[P]` marca as que podem correr em paralelo.

## Preparação (configuração: sem lógica, coberta pelos testes de integração)

- [ ] T001 Atualizar o Node local para 26.13.1. Na raiz:
  - `.nvmrc`;
  - `.npmrc` (`save-exact`, `min-release-age=7`, `strict-allow-scripts`, `engine-strict`);
  - `engines`, `devEngines` e `allowScripts` (plano §2);
  - `^` → versão exata do lockfile na raiz e no `frontend/` (D18).
  - Conferir que `npm ci` e `npm run check` do site continuam passando e que a Vercel oferece Node 26 (senão o build do site quebra com `engine-strict`).
- [ ] T002 Workspace `api/`:
  - `package.json` com as versões exatas da Fase 0;
  - `tsconfig.json` strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`);
  - ESLint strict + `eslint-plugin-security` + regras contra `any`, `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw`, `eval` e `new Function`;
  - `vitest.config.ts` com 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`;
  - `vitest.perf.config.ts` separado.
  - **Instalação só depois da aprovação.**
- [ ] T003 `api/docker-compose.yml` (PostgreSQL 17 com `pg_stat_statements` + Mailpit, por *digest*, portas em 127.0.0.1) e `api/.env.example` comentado (plano §3).
- [ ] T004 `.githooks/pre-commit`: `lint-staged` + `gitleaks git --staged`; sem gitleaks, barra com a instrução (D17). Conferir a versão do gitleaks no `winget`. Varredura única do histórico inteiro do repositório com o gitleaks, com o resultado anexado aqui.
- [ ] T005 Apoio de testes:
  - `globalSetup` (container com `fsync=off`, locale fixo, as migrations no `falcao_modelo` e depois `IS_TEMPLATE true ALLOW_CONNECTIONS false`);
  - banco por arquivo (`CREATE DATABASE … TEMPLATE`, `DROP … WITH (FORCE)`; medir `FILE_COPY` × `WAL_LOG`);
  - pool de teste pequeno e `maxWorkers` calculado;
  - `Clock` fixo, `IdGenerator` previsível e `montarApp`.
- [ ] T006 [P] `check-lock.sh` para as dependências indiretas (compara dois lockfiles; idade, OSV e `hasInstallScript` de cada pacote novo ou alterado; sem `--ignore-scripts`; confirmar que `--package-lock-only` não roda scripts). Rodar sobre o lockfile da Fase 0 e anexar a saída. O `check-dep.sh` já foi corrigido em 19/11/2026: validação do nome e da versão, `--`, proveniência e paginação da OSV.

## Testes que falham (Red) e implementação (Green)

- [ ] T007 [P] Teste: `config/env` (CA1.1, CA4.6, CA4.7, `TRUST_PROXY=true` recusado).
- [ ] T008 Implementar `config/env.ts` (faz passar T007).
- [ ] T009 [P] Testes: `normalizarCodigo`, `normalizarTexto` (CA6.1, CA6.2); `paginacao` com tetos e `pagina` máxima (CA6.4).
- [ ] T010 Implementar `shared/normalizar.ts` e `shared/paginacao.ts` (faz passar T009).
- [ ] T011 Testes: extensões, `f_unaccent` com `search_path` mínimo, `IMMUTABLE`, índice GIN numa tabela temporária e equivalência código × banco (CA6.3, CA6.5).
- [ ] T012 Migration `0001_extensoes` (skill `prisma-migration`) e plugin `prisma` com os dois pools (faz passar T011).
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
- [ ] T024 Módulo `saude`, auxiliar `contarQueries` e `server.ts` com desligamento (faz passar T023).
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
