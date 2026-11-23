# Tarefas 000: Fundação da API do catálogo

- **Plano:** [plan.md](./plan.md)
- **Progresso:** 3 de 12

Regras:
- o teste vem sempre antes do código, com a falha mostrada;
- o `review-gate` roda no fim da fundação (T012).

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
- [x] T003 `api/docker-compose.yml` (PostgreSQL 17 com `pg_stat_statements` + Mailpit, por *digest*, portas em 127.0.0.1) e `api/.env.example` comentado (plano §3).
  - **Feito em 23/11/2026:**
    - PostgreSQL 17.11-alpine e Mailpit v1.33.1, por digest; comandos `db:subir` e `db:descer`;
    - conferido com o ambiente no ar (usuário e senha temporários, passados só no comando):
      - os dois serviços saudáveis, com portas só em 127.0.0.1;
      - provedor `builtin` com `C.UTF-8`, e `lower('AÇÃO Ü')` = `ação ü`;
      - `pg_stat_statements` 1.11 ativo e fuso America/Bahia;
      - digests em execução iguais aos fixados;
      - um e-mail enviado por SMTP chegou à página do Mailpit;
      - sem `POSTGRES_USUARIO`/`POSTGRES_SENHA`, o compose se recusa a subir;
    - volume temporário removido no fim.
  - **Review-gate (23/11/2026): APROVADO pelos quatro revisores**, sem Crítico nem Alto. Corrigido na própria T003:
    - o healthcheck agora usa a rede (`-h 127.0.0.1`), para o "pronto" não sair antes do servidor final;
    - `pg_stat_statements` num schema próprio, `medicao`, com `track=top`;
    - `jit=off`, `random_page_cost=1.1`, `effective_io_concurrency=200` e `shm_size` de 256 MB;
    - fuso UTC, sem reinício automático e Mailpit sem consultar a internet;
    - senha do exemplo em branco (o compose recusa subir) e `.env.example` dizendo o que a API não lê;
    - conferido de novo com o ambiente no ar.
## Fundação enxuta (reorganizada em 23/11/2026 a pedido do responsável)

Cada tarefa abaixo junta o teste e o código (o teste continua sempre antes, com a falha mostrada). O `review-gate` roda **uma vez, no fim** (T012), e não a cada tarefa. O que não é preciso antes da Fase 1 foi para a fase que o usa (seção seguinte).

- [ ] T004 Esteira essencial:
  - `.githooks/pre-commit` com `lint-staged` e `gitleaks git --staged`; sem gitleaks, barra com a instrução (D17). O `lint-staged` roda o ESLint de cada workspace (o site usa o 9.39.5, a API o 10.15.0);
  - `check-lock.sh` para as dependências indiretas: compara dois lockfiles e confere idade, OSV e `hasInstallScript` de cada pacote novo ou alterado, sem `--ignore-scripts`;
  - CI:
    - Node 26 no job do site (D15);
    - job `api` com conferência do `npm config`, `^`/`~` e flags proibidos, `check-lock.sh` quando o lockfile muda, lint, tipos, testes com cobertura, `npm audit --audit-level=high`, `npm audit signatures` e gitleaks;
    - todas as actions por SHA, `permissions: contents: read` e `persist-credentials: false`;
    - `.github/dependabot.yml` com espera de 7 dias;
  - uma varredura única do histórico inteiro com o gitleaks, com o resultado anexado aqui.
  - Critérios: CA4.4, CA7.1, CA7.2, CA7.4, CA7.5, CA7.6.
- [ ] T005 Apoio de testes:
  - Testcontainers com a **mesma imagem, os mesmos `POSTGRES_INITDB_ARGS` e o fuso UTC** do `api/docker-compose.yml`, mais um teste que lê o compose e compara;
  - `fsync=off`, banco-modelo `falcao_modelo` (`IS_TEMPLATE`, `ALLOW_CONNECTIONS false`) e banco por arquivo (`CREATE DATABASE … TEMPLATE`, `DROP … WITH (FORCE)`);
  - pool pequeno, `maxWorkers` calculado, `hookTimeout` e `teardownTimeout` medidos;
  - **`test:integration` separado do `npm test`**: o push não exige Docker, e o CI roda os dois;
  - `Clock` fixo, `IdGenerator` previsível, `montarApp` e `contarQueries`.
- [ ] T006 Configuração (`config/env.ts`):
  - teste antes: variável faltando ou inválida (inclusive `NODE_ENV`), lista só os nomes, CORS (`*`, `null`, `http`, origem não exata), `TRUST_PROXY` com `true` ou número recusado, `LIMITE_IGNORAR_IPS` e `DOCS_HABILITADO` recusados em produção;
  - variáveis desconhecidas são ignoradas (ex.: `POSTGRES_USUARIO`/`POSTGRES_SENHA`, que são só do compose);
  - um teste confere que toda chave do schema está no `api/.env.example`.
  - Critérios: CA1.1, CA4.6, CA4.7.
- [ ] T007 Banco (Prisma):
  - teste antes: extensões e `f_unaccent` (`search_path` mínimo, `IMMUTABLE`, índice GIN numa tabela temporária, `SHOW lc_ctype`); P2002 → 409; pool esgotado → 503 em ~2 s, segurando a conexão com `pool.connect()`;
  - migration `0001_extensoes` (skill `prisma-migration`);
  - plugin `prisma` com os dois pools e o mapeamento dos erros;
  - gerador `prisma-client` com `output = "../src/generated/prisma"`, `moduleFormat = "esm"` e `importFileExtension = "js"`;
  - como o CLI e a API leem o `api/.env` (`process.loadEnvFile` ou `node --env-file`), sem o `NODE_ENV` de desenvolvimento vazar para os testes.
  - Critérios: CA6.3, CA2.5, CA1.5.
- [ ] T008 Erros e logs:
  - teste antes: 404, 400 `validacao` com `campos`, campo extra, `__proto__`, 500 neutro, 413 e 415; `x-request-id`; logs por lista permitida, sem query, `set-cookie` nem campos aninhados em até 3 níveis;
  - `shared/erros.ts` e os plugins `erros`, `request-id` e `logs`.
  - Critérios: CA2.1–CA2.4, CA2.6, CA3.1, CA3.2.
- [ ] T009 Segurança das respostas:
  - teste antes: cabeçalhos e CSP do JSON, CORS (`null`, domínio parecido, `Vary`), 429 também no 404, `X-Forwarded-For` de origem confiável e não confiável;
  - plugins `seguranca` (helmet), `cors`, `rate-limit` e `trustProxy`.
  - Critérios: CA4.1–CA4.3, CA4.5.
- [ ] T010 Acesso obrigatório:
  - teste antes: rota sem `acesso` ou sem schema de resposta → o servidor não sobe; lista fechada de exceções (CORS); rota não pública → 401; matriz de autorização (5 papéis × todas as rotas); campo fora do schema não sai;
  - plugin `acesso` (`onRoute` e `onRequest`) e o `serializerCompiler`.
  - Critérios: CA5.2, CA5.5, CA5.6.
- [ ] T011 Saúde e servidor:
  - teste antes: `/health/live`; `/health/ready` (200, 503, cache de 2 s, uma consulta só para chamadas simultâneas); desligamento gracioso;
  - módulo `saude`, `server.ts` e o script `dev`;
  - `tsconfig.build.json` (`noEmit: false`, `rootDir: src`, `outDir: dist`, só `src/**`) e o script `build`.
  - Critérios: CA1.2–CA1.4, CA8.3.
- [ ] T012 Fechamento da fundação:
  - `api/README.md` (comandos, pool, as duas opções de domínio com CORS, cookie e `TRUST_PROXY`, D1), `CHANGELOG.md` e `docs/aplicacao/api-fundacao.md`;
  - passo a passo da proteção da `main` (D19), conferido com `gh api …/branches/main/protection`;
  - **`review-gate` da fundação inteira**, com os quatro revisores, e correção de todo Crítico e Alto.

## Adiado para a fase que usa

| O que | Critérios | Vai para | Por quê |
|---|---|---|---|
| Normalização de códigos e texto, equivalência código × banco | CA6.1, CA6.2, CA6.5 | Fase 3 (produtos) | É usada pelos códigos e similares dos produtos |
| Paginação com tetos (24 / 25) | CA6.4 | Fase 3 (primeira lista paginada) | Nenhuma rota lista nada antes disso |
| `/docs`, OpenAPI e tipos em `contracts/` | CA5.1, CA5.3, CA5.4 | Fase 4 (catálogo público) | Ninguém consome o contrato antes do front. O schema de resposta obrigatório (CA5.2) fica na fundação. |
| Medidor de performance e registro em `docs/perf/` | CA8.1, CA8.2 | Fase 4 | Só há o que medir quando existir a busca. As notas da revisão da T003 (`medicao`, `pg_settings`, CPUs) valem para lá. |
| Semgrep, SBOM e gitleaks do histórico no CI | parte do CA7.3 | Fase 7 (endurecimento) | O gitleaks no commit e no CI, o audit e as assinaturas já cobrem o principal agora |
| Senha na página do Mailpit | — | Antes da Fase 1 | As mensagens com links de convite e de senha começam na Fase 1 |

## Verificação

- [ ] Cobertura ≥ 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`.
- [ ] Matriz de autorização verde.
- [ ] `review-gate` da fundação aprovado (sem Crítico nem Alto).
- [ ] `README`, `.env.example`, `docs/` e `CHANGELOG.md` atualizados.

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
| T003 | PostgreSQL 17.11 e Mailpit v1.33.1, e não as mais novas (17.12 de 21/11 e v1.34.0 de 17/11) | Regra dos 7 dias aplicada às imagens. A 17.12 entra a partir de 28/11/2026 (anotado no compose). |
| T003 | Fuso do banco em UTC (o compose chegou a ter `TZ: America/Bahia`) | O mesmo fuso dos testes; datas guardadas sem ambiguidade, e a API converte para o horário da Bahia (review-gate). |
| T003 | Proteger a página do Mailpit com senha ficou para antes da Fase 1 | Hoje a caixa só tem mensagens de teste, e ela já fica só em 127.0.0.1. Na Fase 1, as mensagens terão links de convite e de senha (anotado no compose). |
| T003 | Além do provedor `builtin`, o `--locale=C.UTF-8` | Sem ele, o `lc_collate`/`lc_ctype` do sistema vinham da imagem (`en_US.utf8`). Agora o banco não herda nada da máquina. |
| T003 | Usuário e senha do banco são obrigatórios no `api/.env`, sem valor padrão no compose | Nenhuma senha, nem a de desenvolvimento, fica no repositório público. |
| — | As 30 tarefas viraram 12; normalização, paginação, `/docs`, contratos, medidor de performance e parte do CI foram para as fases que os usam; o `review-gate` passa a rodar por bloco | Pedido do responsável em 23/11/2026: a fundação estava lenta para o que entrega, e esses itens não são usados antes da Fase 1. Os critérios adiados estão listados na seção "Adiado para a fase que usa". |
| T001 | A sincronização do lockfile rodou uma vez com `--engine-strict=false` | O lockfile guardava o `24.x` antigo do `frontend/`, e o `engine-strict` recém-ligado barrava justamente a instalação que o corrige. Depois disso, `npm ci` passa com tudo ligado. |
