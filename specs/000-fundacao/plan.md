# Plano 000: Fundação da API do catálogo

- **Spec:** [spec.md](./spec.md)
- **Status:** Aprovado (19/11/2026), junto com a spec. Revisado em 19/11/2026 em duas rodadas do `security-reviewer` e do `performance-reviewer`, ambos **APROVADO** na segunda.

## 1. Abordagem

A API entra como um **workspace npm** novo, `api/`, ao lado de `frontend/`, no mesmo repositório (decisão R1). A estrutura é a da seção 6 do prompt, dentro de `api/`:

```
api/
  src/
    app.ts                 # monta o Fastify (plugins e rotas); não chama listen
    server.ts              # listen + desligamento gracioso (SIGTERM/SIGINT)
    config/env.ts          # Zod valida process.env; falha no boot listando só os nomes
    plugins/               # seguranca (helmet), cors, cookie, rate-limit, request-id, logs,
                           # erros, swagger, prisma, acesso (exige papel e schema de resposta)
    shared/                # erros de domínio, Clock, IdGenerator, normalização, paginação
    modules/
      saude/               # /health/live e /health/ready (único módulo da Fase 0)
  prisma/schema.prisma + migrations/   # só extensões e f_unaccent nesta fase
  tests/ (unit/, integration/, contract/, security/, perf/) + factories/ + apoio/
  contracts/               # tipos gerados do OpenAPI (openapi-typescript)
  scripts/check-dep.sh, scripts/check-lock.ts, scripts/conferir-esteira.sh
  docker-compose.yml       # PostgreSQL 17 + Mailpit, por digest, portas só em 127.0.0.1
  vitest.config.ts, vitest.perf.config.ts
  .env.example, README.md, CHANGELOG.md
```

**Alternativas descartadas:**
- **Repositório separado:** o responsável escolheu `api/` (R1).
- **Route Handlers do Next:** o prompt exige Fastify, e a API precisa de processo próprio.

## 2. Configuração do repositório (cadeia de suprimentos)

| Arquivo | Mudança | Motivo |
|---|---|---|
| `.npmrc` (raiz) | `save-exact=true`, `min-release-age=7`, `strict-allow-scripts=true`, `engine-strict=true` | Seção 5: versões exatas, 7 dias, scripts só os liberados (D12) |
| `package.json` (raiz) | (1) `workspaces: ["frontend", "api"]`; (2) `engines.node: ">=26.13.1 <27"` (conferir antes se a Vercel oferece Node 26, senão o build do site quebra com `engine-strict`); (3) `devEngines.packageManager: { name: "npm", version: ">=11.20.0", onFail: "error" }`; (4) `allowScripts` | (2) Node LTS (R4). (3) Um npm antigo ignoraria as chaves da seção 5 em silêncio. (4) Detalhado abaixo. |
| `package.json` (raiz e `frontend/`) | `^` trocado pela versão exata do lockfile (nenhuma versão muda) | D18 |
| `.nvmrc` | `26.13.1` | R4 |
| `.githooks/pre-commit` | `lint-staged` + `gitleaks git --staged` (o `protect` está obsoleto desde o gitleaks 8.19); sem gitleaks, barra com a instrução | D10, D17 |
| `.github/workflows/ci.yml` | Node 26 no job do site (D15) + job `api` (§9); todas as actions por SHA; `permissions: contents: read`; `persist-credentials: false` | Seção 5.7; revisão de segurança |
| `.github/dependabot.yml` | npm (raiz) e GitHub Actions, agrupados, com `cooldown` de 7 dias | Seção 5.7 |

**`allowScripts`** (com `strict-allow-scripts`, todo pacote com script de instalação precisa estar na lista, liberado ou negado):

| Pacote | Decisão | Motivo |
|---|---|---|
| `prisma@7.10.1` | liberado | `preinstall` confere a versão do Node |
| `@prisma/engines@7.10.1` | liberado | `postinstall` baixa o motor de migrações. O Prisma confere o checksum do binário; nunca usar `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING`. |
| `esbuild` | negado | O script só confere o binário; o binário vem por `optionalDependencies` e funciona sem ele |
| `cpu-features`, `ssh2` | negados | Compilação nativa opcional, indireta do Testcontainers; há alternativa em JS |
| `protobufjs` | negado | Só imprime aviso de versão |
| `fsevents` | negado | Só macOS |

Se um pacote negado precisar do script, a instalação falha e a decisão é revista com o protocolo. Nenhum script do projeto nem do CI usa `--ignore-scripts` ou `--dangerously-allow-all-scripts` (o CI confere com `grep`).

As versões de cada pacote são as de [`docs/dependencias.md`](../../docs/dependencias.md) (verificadas em 19/11/2026).

## 3. Servidor, rotas e contratos

### Rotas

| Método e rota | Acesso | Limite de taxa | Entrada | Saída | Erros |
|---|---|---|---|---|---|
| `GET /health/live` | `publico` | fora do limite geral (não toca no banco) | nenhuma | `{ status: "ok" }` | — |
| `GET /health/ready` | `publico` | limite geral; resultado em cache por 2 s; ping com limite de 1 s | nenhuma | `{ status: "ok", banco: "ok" }` | 503 `indisponivel` |
| `GET /docs`, `/docs/json`, `/docs/static/*` | `publico`, registradas **só** com `NODE_ENV=development` ou `DOCS_HABILITADO=true` (D16) | geral | — | página e OpenAPI 3.1 | 404 quando desligadas |

### Configuração do servidor (`config/env.ts`, tudo validado por Zod)

| Variável | Regra | Padrão |
|---|---|---|
| `NODE_ENV` | `development`, `test` ou `production`; **obrigatória** | — |
| `DATABASE_URL` | URL `postgresql://` | — |
| `CORS_ORIGENS` | lista de origens exatas `https://…`, cada uma igual a `new URL(x).origin`; recusa `*`, `null` e `http://`, exceto `http://localhost:<porta>` com `NODE_ENV=development` | vazia (sem CORS) |
| `TRUST_PROXY` | lista de IPs ou CIDRs do proxy; **recusa `true` e número de saltos** (os dois confiariam no `X-Forwarded-For` vindo de qualquer lugar) | nenhum (usa o IP da conexão) |
| `LIMITE_GERAL_POR_MIN` | inteiro de 10 a 10.000 | 300 |
| `LIMITE_IGNORAR_IPS` | lista de IPs fora do limite, só para medição; **recusada se `NODE_ENV=production`** | vazia |
| `DOCS_HABILITADO` | `true`/`false`; `true` com `NODE_ENV=production` é recusado até a Fase 1 pôr o `/docs` atrás do login de Administrador | `false` |
| `LOG_NIVEL` | `fatal` … `debug` | `info` (`warn` na medição) |

### Padrões do Fastify

- **Corpo e conexão:** `bodyLimit` de 100 KB (cada rota pode mudar), `connectionTimeout` de 10 s, `requestTimeout` de 30 s.
  - No Node, o `requestTimeout` limita só o **recebimento** da requisição, não o processamento.
  - O processamento fica limitado pelo `statement_timeout` (§4) e pelo tempo de espera do pool.
  - O `keepAliveTimeout` precisa ser maior que o do proxy da VPS (conferir na Fase 7).
- **Corpo malicioso:** `onProtoPoisoning: "error"` e `onConstructorPoisoning: "error"`.
- **IP do cliente:** `trustProxy` recebe a lista de `TRUST_PROXY`. Sem lista, `request.ip` é o endereço da conexão e o `X-Forwarded-For` é ignorado.
- **Serialização:**
  - `validatorCompiler` e `serializerCompiler` do `fastify-type-provider-zod`;
  - a saída passa pelo schema de resposta, e campo fora do schema não sai (CA5.6). Os schemas de **resposta** usam `z.object` padrão, que descarta o campo a mais; o `.strict()` é só para **entrada** (na saída, ele transformaria o campo a mais em 500);
  - o custo do parse na saída é medido no medidor (§7).
- **Cabeçalhos** (`@fastify/helmet`): HSTS; `nosniff`; `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` nas respostas JSON; `Cache-Control: no-store` por padrão (as rotas públicas da Fase 4 declaram o próprio cache). O `/docs` tem CSP própria pelo `transformStaticCSP` do `swagger-ui`.
- **Limite de taxa:** limite geral por `request.ip`, valendo também para o 404 (contra varredura de rotas).

### Acesso (plugin `acesso`)

- Toda rota declara `config.acesso`: `publico`, `logado`, `editor` ou `admin`.
- O plugin `acesso` é registrado na raiz (com `fastify-plugin`) **antes** do CORS, do swagger e de qualquer rota, senão o hook `onRoute` não vê as rotas deles.
- O hook `onRoute` **recusa registrar** rota sem `acesso` ou sem `schema.response`, e o servidor não sobe (CA5.2). Ele guarda a lista para a matriz de autorização.
- Rotas criadas por plugins recebem `acesso` explícito, sem exceção genérica:
  - `OPTIONS` do CORS: `publico`;
  - `HEAD` automático: o mesmo da rota `GET`;
  - arquivos do `/docs`: `publico`, só quando o `/docs` está ligado.
- **Lista fechada de exceções à regra do schema de resposta** (método + URL exatos, num arquivo só, com teste que falha se a lista crescer sem revisão): o `OPTIONS` do CORS e o HTML e os arquivos estáticos do `/docs`.
- O hook `onRequest` responde **401 `nao_autenticado`** para qualquer rota que não seja `publico`, até a Fase 1 trocar isso pela checagem da sessão (CA5.5).

### Logs (Pino, nativo do Fastify)

- Serializers por **lista permitida:**
  - requisição: método, rota **sem query string**, `requestId`, IP;
  - resposta: status e tempo.
  - Nada de cabeçalhos, corpo nem `set-cookie`.
- Para os objetos que nós mesmos registramos: um **serializer que percorre o objeto em qualquer profundidade** e mascara as chaves que casam com `/senha|token|authorization|cookie/i` (inclui `set-cookie`). O `redact` do Pino não serve aqui: ele não casa parte do nome e cada `*.` cobre um nível só. O teste cobre pelo menos 3 níveis.
- `x-request-id` aceito só quando a conexão vem de um endereço de `TRUST_PROXY` e o valor tem até 128 caracteres seguros; senão, gerado por `IdGenerator`.
- O log de segurança separado entra na Fase 1, com o login.

### Formato de erro (`shared/erros.ts`)

| Código | Status | Quando |
|---|---|---|
| `validacao` | 400 | Zod recusou (`campos` com a mensagem de cada campo, em português) |
| `nao_autenticado` / `sem_permissao` | 401 / 403 | rota não pública antes da Fase 1 / papel insuficiente (Fase 1) |
| `nao_encontrado` | 404 | rota ou recurso inexistente |
| `conflito` | 409 | P2002 e conflito de versão |
| `muito_grande` / `tipo_nao_suportado` | 413 / 415 | corpo acima do limite / não JSON |
| `muitas_requisicoes` | 429 | limite de taxa (com `Retry-After`) |
| `indisponivel` | 503 | banco fora do ar ou pool sem conexão em 2 s |
| `erro_interno` | 500 | qualquer outro, com mensagem neutra |

## 4. Banco de dados

### Migration `0001_extensoes`

```sql
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;
CREATE FUNCTION public.f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
```

- **Justificativa:**
  - a busca (Fase 4) precisa de `unaccent` em índice, mas `unaccent` é só `STABLE`, daí o wrapper `IMMUTABLE`;
  - tudo qualificado com `public.`, porque no PostgreSQL 17 `CREATE INDEX`, `REINDEX`, `VACUUM` e `ANALYZE` rodam com `search_path` restrito, e uma chamada sem schema quebraria o índice;
  - sem `SET search_path` na função: com ele, cada chamada pagaria a troca de configuração. O planejador **não** expande essa função (o corpo chama uma função `STABLE`), mas o índice de expressão funciona igual. Se o *recheck* pesar no `EXPLAIN` da Fase 4, medir o wrapper em C (`immutable_unaccent` de `$libdir/unaccent`);
  - `pg_trgm` para o índice GIN de busca parcial.
- **Rollback:** `DROP FUNCTION public.f_unaccent(text); DROP EXTENSION pg_trgm; DROP EXTENSION unaccent;`.
- Nenhum índice nesta fase.

### Conexões e tempos

- **Dois pools**, cada um com o próprio cliente do Prisma (`@prisma/adapter-pg`):
  - **público:** `statement_timeout = 2s`, `max = 10`. Usado pelas rotas públicas da Fase 4 e pelo `/health/ready`;
  - **administração:** `statement_timeout = 5s`, `max = 5`. Usado pelas rotas da administração.
  - Os dois têm `connectionTimeoutMillis = 2000` (pool cheio → 503, CA1.5) e `idleTimeoutMillis = 30000`.
  - O `statement_timeout` vai na conexão (`options: "-c statement_timeout=…"`), sem `SET LOCAL` por requisição, que custaria idas e voltas a mais no detalhe (meta < 100 ms).
- **Conta do `max`:** conexões ≈ requisições simultâneas × tempo da consulta ÷ tempo da requisição. Para 20 requisições simultâneas com consultas de ~20 ms em requisições de ~60 ms, cerca de 7 conexões; daí 10 com folga no público. Revisto na Fase 4 com o teste de carga.
- **Importação (Fase 5):** a transação longa usa o pool da administração com `SET LOCAL statement_timeout` maior, decidido no plano dela.

### Ambiente local (`api/docker-compose.yml`)

- PostgreSQL 17 com `shared_preload_libraries=pg_stat_statements` (a extensão é criada por um script de inicialização do compose, fora das migrations; o medidor zera as estatísticas antes e as anexa ao registro depois) e configuração realista;
- **locale fixo** (provedor `builtin`, `C.UTF-8`), o mesmo no Testcontainers, para `lower()` tratar acentos igual em todo lugar (o teste confere `SHOW lc_ctype`);
- Mailpit;
- imagens fixadas por *digest*;
- portas só em `127.0.0.1`.

### Contrato do `seed:perf` (entregue na Fase 4)

- Semente fixa e só dados fictícios.
- 10.000 produtos e 30 categorias.
- Distribuição realista:
  - códigos com hífen, ponto, barra e zeros à esquerda;
  - nomes com acentos;
  - aplicações por veículo;
  - 10% ocultos.
- `VACUUM ANALYZE` no fim, senão o `EXPLAIN` engana.

## 5. Módulos afetados

- **Novos:** `api/` inteiro.
- **Repositório:** `package.json` (raiz e `frontend/`, só o `^` → versão exata), `.npmrc`, `.nvmrc`, `.githooks/pre-commit`, `.github/workflows/ci.yml` e `.github/dependabot.yml`.
- **Site:** nenhum código muda.

## 6. Riscos e ameaças (STRIDE resumido)

| Ameaça | Ativo | Mitigação | Teste que comprova |
|---|---|---|---|
| **Falsificação de identidade:** `X-Forwarded-For` forjado fura o limite de taxa e falsifica o IP dos logs (e, na Fase 1, o bloqueio de login e a auditoria) | Limites, logs, auditoria | `TRUST_PROXY` só com IPs/CIDRs; `true` e número de saltos recusados; padrão sem confiança | CA4.5 |
| **Falsificação:** proxy mal configurado faz todos parecerem o mesmo IP e dividirem o limite | Disponibilidade | O mesmo `TRUST_PROXY`, documentado para as duas opções de domínio (D1) | CA4.5 + README |
| **Falsificação:** cliente forja `x-request-id` | Logs | Aceito só de conexão vinda de endereço de `TRUST_PROXY` e com formato seguro | CA3.1 |
| **Adulteração:** campos a mais, `__proto__`, `constructor` | Dados futuros | Zod `.strict()` + `onProtoPoisoning`/`onConstructorPoisoning: "error"` | CA2.3 |
| **Adulteração:** pacote npm malicioso | Servidor e CI | `min-release-age`, `strict-allow-scripts` + `allowScripts`, `devEngines` (npm ≥ 11.20), versões exatas nos três `package.json`, `npm audit signatures`, `check-lock.sh` nas indiretas, Dependabot com espera | CA7.1, CA7.2 |
| **Adulteração:** action do GitHub trocada por versão maliciosa | CI e segredos | Todas por SHA; `permissions: contents: read`; `persist-credentials: false` | CA7.6 |
| **Repúdio:** não saber quem fez o quê | Auditoria | `requestId` em todo log; tabela `atividade` e log de segurança na Fase 1 | CA3.1 |
| **Vazamento:** stack trace, SQL ou segredo na resposta | Banco e credenciais | Manipulador de erro único; env validado sem mostrar valor | CA1.1, CA2.4 |
| **Vazamento:** cookie, token na query ou `set-cookie` no log | Sessões e tokens (Fase 1) | Serializers por lista permitida + mascaramento por regex em qualquer profundidade | CA3.2 |
| **Vazamento:** segredo no Git (repositório público) | Credenciais | gitleaks no `pre-commit` (obrigatório) e no CI com o histórico inteiro; varredura única do histórico na Fase 0 | CA7.3, CA7.4 |
| **Vazamento:** `/docs` expõe a superfície da administração | Mapa da API | Fechado por padrão; só registrado com `development` ou `DOCS_HABILITADO` fora de produção | CA5.1 |
| **Vazamento:** campo interno sai na resposta | Dados futuros | Schema de resposta obrigatório + serializer | CA5.2, CA5.6 |
| **Vazamento:** página JSON aberta num navegador ou guardada em cache | Respostas | CSP `default-src 'none'`, `frame-ancestors 'none'`, `no-store` por padrão | CA4.1 |
| **Negação de serviço:** corpo gigante ou conexão lenta | Memória e conexões | `bodyLimit`, `connectionTimeout`, `requestTimeout`, limite de taxa geral (inclusive no 404) | CA2.6, CA4.3 |
| **Negação de serviço:** `/health/ready` em massa ocupa o pool | Banco | Cache de 2 s com consulta única em andamento (*single-flight*), ping de 1 s, limite geral | CA1.3 |
| **Negação de serviço:** consulta lenta ou pool cheio segura as requisições | Banco | `statement_timeout` por pool, `connectionTimeoutMillis` 2 s → 503 | CA1.5 + teste com `pg_sleep` |
| **Elevação de privilégio:** rota nova esquecida sem controle de acesso | Toda a administração | `onRoute` recusa rota sem `acesso`; rota não pública responde 401 até a Fase 1; matriz de autorização | CA5.2, CA5.5 |
| **Elevação de privilégio:** CORS aberto, `null` ou domínio parecido | Sessões (Fase 1) | Lista exata validada no boot; teste de `null` e de domínio que só começa igual | CA4.2, CA4.6 |
| **Elevação de privilégio:** limite de taxa desligado em produção | Disponibilidade | `LIMITE_IGNORAR_IPS` recusado com `NODE_ENV=production` | CA4.7 |

## 7. Estratégia de testes

### Isolamento e velocidade (achado Alto do `performance-reviewer`)

- **`globalSetup`:**
  - sobe **um** container PostgreSQL 17 (Testcontainers) com `fsync=off`, `synchronous_commit=off` e `full_page_writes=off`. Esse container nunca é usado para medir performance;
  - aplica as migrations **uma vez** num banco-modelo, `falcao_modelo`.
  - depois das migrations, `ALTER DATABASE falcao_modelo WITH IS_TEMPLATE true ALLOW_CONNECTIONS false`: uma conexão esquecida no modelo faria todo `CREATE DATABASE` falhar.
- **Cada arquivo de teste** cria o seu banco com `CREATE DATABASE t_<id> TEMPLATE falcao_modelo` (cerca de 100 ms, já com extensões, `f_unaccent` e, nas fases seguintes, as tabelas) e o apaga no fim com `DROP DATABASE … WITH (FORCE)`. Assim os testes usam transações de verdade e não precisam rodar as migrations de novo. Na T005, medir `STRATEGY = FILE_COPY` contra o padrão `WAL_LOG` e ficar com o mais rápido.
- **Pool:** nos testes, `max` de 2 a 3. O `maxWorkers` do Vitest é calculado para que workers × pool × 2 fique abaixo do `max_connections`.
- **Auxiliar `contarQueries`** (evento `query` do Prisma, somando os dois clientes), para os testes de N+1 das fases seguintes (CA8.3). O log de `query` fica ligado só nos testes, porque custa caro em produção.
- **Relógio:** `Clock` injetado. Nunca `sleep`.

### Medição de performance (achado Alto do `performance-reviewer`)

- **Medidor próprio**, sem dependência nova (`api/scripts/medir.ts`), em **dois processos** (decisão D20):
  - a API **compilada** (`tsc`) sobe com `server.ts` num processo filho (`child_process`), em `127.0.0.1`. Quem gera a carga não divide o event loop com o servidor, e o código medido é o do build;
  - o servidor mede o próprio atraso do event loop (`monitorEventLoopDelay`) e o informa ao medidor no fim;
  - o medidor usa `http.Agent` com keep-alive e 20 sockets, aquecimento e depois **duração fixa de 30 s** (mais amostras acima do p99 que um número fixo de requisições);
  - `perf_hooks.createHistogram` para p50, p95 e p99;
  - qualquer resposta que não seja 2xx **aborta** a medição (ex.: 429 se o IP chegar como `::1` ou `::ffff:127.0.0.1` fora de `LIMITE_IGNORAR_IPS`).
- **Onde roda:** contra o banco do `docker-compose` (configuração realista), com `LOG_NIVEL=warn` e `LIMITE_IGNORAR_IPS=127.0.0.1`.
- **`vitest.perf.config.ts` separado,** fora da cobertura e fora do `npm test`.
  - O comando é `npm run test:perf -w api` e exige o banco do `docker-compose` no ar.
  - **Não roda no CI**: a máquina compartilhada varia e não há o banco do compose. A medição que vale é a local, registrada em `docs/perf/`.
- **`docs/perf/README.md`** traz o modelo de registro: data, commit, CPU, sistema, versões do Node e do PostgreSQL, configuração do PostgreSQL, ferramenta, concorrência, duração e aquecimento.
- O autocannon ou o k6 continuam previstos para a Fase 4, se o medidor próprio não bastar, passando pelo protocolo.

### Mapa critério → teste

| Critério | Teste | Tipo |
|---|---|---|
| CA1.1, CA4.6, CA4.7 | `env.test.ts`: faltando, inválido, `NODE_ENV` ausente, CORS com `*`/`null`/`http`, `TRUST_PROXY=true`, `LIMITE_IGNORAR_IPS` em produção | unitário |
| CA1.2, CA1.3 | `saude.test.ts`: live 200; ready 200; ready 503 com o banco fora; segunda chamada em 2 s não vai ao banco; 10 chamadas simultâneas geram uma consulta só (`contarQueries`) | integração |
| CA1.4 | `desligamento.test.ts`: requisição lenta + `app.close` → termina e desconecta | integração |
| CA1.5 | `pool.test.ts`: o teste passa ao `PrismaPg` um `pg.Pool` próprio de 1 conexão e a **segura** com `pool.connect()` sem soltar (sem `pg_sleep`, que correria contra o `statement_timeout`) → a requisição recebe 503 em ~2 s | integração |
| CA2.1–CA2.6 | `erros.test.ts`, com rotas de teste registradas só no teste (com `acesso` e schema) | integração |
| CA2.5 | `prisma-erros.test.ts`: P2002 real numa tabela criada no banco do teste | integração |
| CA3.1, CA3.2 | `logs.test.ts`: logger em memória; confere a lista permitida, a query cortada, `set-cookie` e os campos aninhados ausentes | integração |
| CA4.1–CA4.3, CA4.5 | `seguranca-respostas.test.ts`: cabeçalhos, CORS (`null`, domínio parecido, `Vary`), 429 também no 404, XFF de origem confiável e não confiável | integração |
| CA4.4 | lint com arquivos de exemplo + `grep` no CI | unitário (lint) |
| CA5.1, CA5.3, CA5.4 | `contrato.test.ts`: respostas válidas contra o OpenAPI; `/docs` 404 sem habilitar | contrato |
| CA5.2, CA5.5, CA5.6 | `acesso.test.ts`: rota sem `acesso` ou sem schema → boot falha; rota `editor` → 401; matriz (5 papéis × rotas); campo fora do schema não sai | integração |
| CA6.1, CA6.2, CA6.4 | `normalizar.test.ts`, `paginacao.test.ts` | unitário |
| CA6.3, CA6.5 | `extensoes.test.ts`: `f_unaccent` com `search_path = pg_catalog`, `provolatile = 'i'`, `CREATE INDEX … gin (public.f_unaccent(lower(x)) gin_trgm_ops)` numa tabela temporária; `SHOW lc_ctype`; tabela de caracteres comparando o código (NFKD, para º e ª virarem letra) e o banco | integração |
| CA7.1–CA7.6 | passos do CI (conferência de `npm config`, `grep` dos flags proibidos, `^`/`~` nos três `package.json`) + `api/tests/unit/scripts/lockfile.test.ts` (check-lock) e `api/tests/unit/scripts/workflows.test.ts` (CA7.6), com as provas manuais registradas no `tasks.md` | CI + unitários |
| CA8.1, CA8.2 | `perf/saude.perf.ts` pelo medidor | perf |
| CA8.3 | `contar-queries.test.ts` | integração |

## 8. Dependências e ferramentas

- **Pacotes da Fase 0:** os de [`docs/dependencias.md`](../../docs/dependencias.md), verificados em 19/11/2026. **Nada é instalado antes da aprovação.**
- **Dependências indiretas:** `api/scripts/check-lock.ts` compara dois lockfiles (o da `main` e o atual, ou o atual e um gerado numa pasta temporária com `--package-lock-only`, que só resolve versões e não roda scripts, a confirmar na T006) e passa cada pacote novo ou alterado pela idade, pela OSV e pelo campo `hasInstallScript` do lockfile (que também pega `binding.gyp`, que o `check-dep.sh` sozinho não vê). Não usa `--ignore-scripts`, que o CI proíbe.
- **Programas fora do npm:**
  - Docker Desktop (já instalado);
  - gitleaks, por `winget` na máquina local e como binário com checksum conferido no CI (a `gitleaks-action` exige licença em contas de organização), com a versão conferida na tarefa T004.
- **Imagens Docker:** PostgreSQL 17 e Mailpit, fixadas por *digest*, conferido na tarefa T003.

## 9. CI

**Os dois jobs (`site` e `api`):** `permissions: contents: read` no topo, actions por SHA, `actions/checkout` com `persist-credentials: false` e Node 26.

**Job `api`:**
1. Conferências:
   - npm ≥ 11.20.0;
   - `npm config get strict-allow-scripts` = `true` e `min-release-age` = `7`;
   - nenhum `--ignore-scripts` nem `--dangerously-allow-all-scripts` nos scripts e workflows (`grep`);
   - nenhum `^` ou `~` nos três `package.json`.
2. Se o PR altera o `package-lock.json`: `check-lock.ts` contra o lockfile da `main` (idade, scripts de instalação, OSV de cada pacote novo ou alterado), falhando no primeiro problema. É isso que faz o `min-release-age` valer também para lockfiles editados e PRs do Dependabot.
3. `npm ci`.
4. `grep` por `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw(`, `eval(` e `new Function`.
5. Lint, tipos e testes com cobertura (90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`).
6. `npm audit --audit-level=high` e `npm audit signatures`.
7. gitleaks (binário com checksum, `fetch-depth: 0`, histórico inteiro) e Semgrep.
8. SBOM com `npm sbom --sbom-format cyclonedx`, publicado como artefato.

O `test:perf` não roda no CI (§7).

**Proteção da branch `main`** (D19): os jobs `site` e `api` obrigatórios para o merge. É configuração no GitHub, feita com o responsável e conferida com `gh api repos/<dono>/<repo>/branches/main/protection`, com a saída anexada à T029.

**Fase 7:** avaliar uma conexão própria para o `/health/ready`, para um pico de busca não tirar a instância do proxy.

Trivy e a imagem Docker entram na Fase 7.

## 10. Complexidade justificada

- **Testcontainers com banco-modelo:** exigência do prompt (PostgreSQL real), e é a forma rápida de isolar arquivos com transações de verdade.
- **Dois pools:** o único jeito de ter `statement_timeout` diferente no público e na administração sem custo por requisição.
- **Medidor próprio:** evita uma dependência nova na Fase 0 e mede com sockets reais.
