# Tarefas 000: Fundação da API do catálogo

- **Plano:** [plan.md](./plan.md)
- **Progresso:** 11 de 12

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

- [x] T004 Esteira essencial:
  - `.githooks/pre-commit` com `lint-staged` e `gitleaks git --staged`; sem gitleaks, barra com a instrução (D17). O `lint-staged` roda o ESLint de cada workspace (o site usa o 9.39.5, a API o 10.15.0);
  - `check-lock.sh` para as dependências indiretas: compara dois lockfiles e confere idade, OSV e `hasInstallScript` de cada pacote novo ou alterado, sem `--ignore-scripts`;
  - CI:
    - Node 26 no job do site (D15);
    - job `api` com conferência do `npm config`, `^`/`~` e flags proibidos, `check-lock.sh` quando o lockfile muda, lint, tipos, testes com cobertura, `npm audit --audit-level=high`, `npm audit signatures` e gitleaks;
    - todas as actions por SHA, `permissions: contents: read` e `persist-credentials: false`;
    - `.github/dependabot.yml` com espera de 7 dias;
  - uma varredura única do histórico inteiro com o gitleaks, com o resultado anexado aqui.
  - Critérios: CA4.4, CA7.1, CA7.2, CA7.4, CA7.5, CA7.6.
  - **Feito em 23/11/2026:**
    - varredura do histórico inteiro com o gitleaks: 23 commits, nenhum segredo;
    - `check-lock.ts` com as regras em `scripts/lockfile.ts`, testadas antes (13 casos: novos e alterados, escopo, aninhados, apelidos `npm:`, workspaces, idade, versão desconhecida, gravidade da falha, origem e `allowScripts`);
    - rodado de verdade entre o lockfile da T001 e o atual: 415 pacotes, 0 recusados, 2 avisos (as moderadas já conhecidas);
    - a primeira versão recusava qualquer falha (o protocolo só bloqueia alta e crítica) e confundia apelidos com o nome verdadeiro. Os dois casos viraram teste antes da correção;
    - `pre-commit` provado: sem gitleaks, barrado; um token falso no formato do GitHub, barrado, sem mudar o histórico;
    - `conferir-esteira.sh` provado: passa no repositório; barra `^`, flag proibida, `eslint-disable` em `api/src` e busca que não rodou. A primeira versão deixava passar a flag proibida por um erro no `grep`; corrigido e provado de novo;
    - CI e Dependabot validados localmente (YAML bem formado, conferência verde). **A primeira execução real acontece no próximo push.**
- [x] T005 Apoio de testes:
  - Testcontainers com a **mesma imagem, os mesmos `POSTGRES_INITDB_ARGS` e o fuso UTC** do `api/docker-compose.yml`, mais um teste que lê o compose e compara;
  - `fsync=off`, banco-modelo `falcao_modelo` (`IS_TEMPLATE`, `ALLOW_CONNECTIONS false`) e banco por arquivo (`CREATE DATABASE … TEMPLATE`, `DROP … WITH (FORCE)`);
  - pool pequeno, `maxWorkers` calculado, `hookTimeout` e `teardownTimeout` medidos;
  - **`test:integration` separado do `npm test`**: o push não exige Docker, e o CI roda os dois;
  - `Clock` fixo, `IdGenerator` previsível, `montarApp` e `contarQueries`.
  - **Feito em 23/11/2026:**
    - a imagem, o initdb e as configurações do banco de teste são **lidos do `api/docker-compose.yml`** (`tests/apoio/postgres-do-compose.ts`, 4 testes unitários antes). Assim os dois bancos não têm como se separar, em vez de só um teste que compare;
    - `global-setup.ts` (container com `fsync=off`, modelo `falcao_modelo` com `IS_TEMPLATE` e `ALLOW_CONNECTIONS false`) e `banco.ts` (`criarBancoDoArquivo`, `DROP … WITH (FORCE)`), com 5 testes de integração escritos antes;
    - projetos do Vitest: `unit` (o `npm test`, sem Docker) e `integracao` (`test:integration`); `test:coverage` roda os dois;
    - medido: a cópia do modelo leva de 8 a 13 ms (mediana), com `WAL_LOG` ≈ `FILE_COPY`; ficou o padrão;
    - suíte de integração completa em ~13 s, com o container; nenhum container sobrou depois.
- [x] T006 Configuração (`config/env.ts`):
  - teste antes: variável faltando ou inválida (inclusive `NODE_ENV`), lista só os nomes, CORS (`*`, `null`, `http`, origem não exata), `TRUST_PROXY` com `true` ou número recusado, `LIMITE_IGNORAR_IPS` e `DOCS_HABILITADO` recusados em produção;
  - variáveis desconhecidas são ignoradas (ex.: `POSTGRES_USUARIO`/`POSTGRES_SENHA`, que são só do compose);
  - um teste confere que toda chave do schema está no `api/.env.example`.
  - Critérios: CA1.1, CA4.6, CA4.7.
  - **Feito em 23/11/2026:**
    - 24 testes escritos antes (vermelho: o módulo não existia);
    - `src/config/env.ts` passou nos 24 de primeira; tipos e lint limpos;
    - `src/config/**` entrou na cobertura de 90%: 100% das linhas e 91% dos ramos;
    - provado que a cobertura reprova abaixo do mínimo (só a integração rodando: 0%, saída 1), item que a T005 deixou anotado.
- [x] T007 Banco (Prisma):
  - teste antes: extensões e `f_unaccent` (`search_path` mínimo, `IMMUTABLE`, índice GIN numa tabela temporária, `SHOW lc_ctype`); P2002 → 409; pool esgotado → 503 em ~2 s, segurando a conexão com `pool.connect()`;
  - migration `0001_extensoes` (skill `prisma-migration`);
  - plugin `prisma` com os dois pools e o mapeamento dos erros;
  - gerador `prisma-client` com `output = "../src/generated/prisma"`, `moduleFormat = "esm"` e `importFileExtension = "js"`;
  - como o CLI e a API leem o `api/.env` (`process.loadEnvFile` ou `node --env-file`), sem o `NODE_ENV` de desenvolvimento vazar para os testes.
  - Critérios: CA6.3, CA2.5, CA1.5.
  - **Feito em 23/11/2026:**
    - testes antes: 8 unitários (tradução dos erros) e 11 de integração (extensões, pools, erros, contagem e fechamento);
    - o teste de integração mostrou os formatos reais. A unicidade em SQL direto é P2010 (não P2002), e o pool esgotado é um erro do `pg`. Esses formatos viraram testes unitários (vermelhos) antes de ajustar a tradução;
    - pool esgotado responde em ~2 s;
    - `npm ci` gera o cliente do Prisma sozinho (`postinstall`), com as proteções de scripts ligadas;
    - o `global-setup` aplica as migrations no banco-modelo com `prisma migrate deploy`;
    - 82 testes da API, 100% das linhas e 94% dos ramos.
- [x] T008 Erros e logs:
  - teste antes: 404, 400 `validacao` com `campos`, campo extra, `__proto__`, 500 neutro, 413 e 415; `x-request-id`; logs por lista permitida, sem query, `set-cookie` nem campos aninhados em até 3 níveis;
  - `shared/erros.ts` e os plugins `erros`, `request-id` e `logs`.
  - Critérios: CA2.1–CA2.4, CA2.6, CA3.1, CA3.2.
  - **Feito em 23/11/2026:**
    - testes antes: 12 do formato de erro e 8 de logs e `x-request-id`, todos vermelhos (o servidor não existia);
    - dois defeitos achados pelos testes e corrigidos com teste antes:
      - o mascarador copiava a requisição do Fastify e perdia o `url`, e toda requisição ficava sem resposta;
      - o Fastify aceitava texto puro, que virava 400 em vez de 415;
    - 4 testes do `request-id` (IP único, IPv6, vizinho fora da lista, sem endereço) escritos **depois** do código, como rede de segurança dos ramos (passaram de primeira);
    - **prova por mutação (review-gate, T012):** 7 ramos do `request-id` quebrados de propósito; 6 deixaram testes vermelhos. A 7ª (tirar `versao !== 0`) sobreviveu por ser equivalente: o `BlockList` já devolve `false` para o que não é IP. A guarda saiu;
    - 110 testes da API, 100% das linhas e 94% dos ramos.
- [x] T009 Segurança das respostas:
  - teste antes: cabeçalhos e CSP do JSON, CORS (`null`, domínio parecido, `Vary`), 429 também no 404, `X-Forwarded-For` de origem confiável e não confiável;
  - plugins `seguranca` (helmet), `cors`, `rate-limit` e `trustProxy`.
  - Critérios: CA4.1–CA4.3, CA4.5.
  - **Feito em 23/11/2026:**
    - 16 testes antes: 7 vermelhos (cabeçalhos, CORS, limite, IP do proxy); os 9 que já passavam eram casos negativos, que só ganharam sentido com os plugins ligados;
    - dois ajustes apontados pelos testes:
      - o helmet escreve a CSP sem espaço depois do `;` (é a mesma política; o teste aceita as duas formas);
      - o CORS mandava `Allow-Credentials` para origem recusada; agora não sai nenhum cabeçalho de CORS sem origem permitida;
    - mais um teste (rota com o próprio cache mantém o dela), escrito depois, para o ramo que a Fase 4 vai usar;
    - 127 testes da API, 100% das linhas e 94,6% dos ramos.
- [x] T010 Acesso obrigatório:
  - teste antes: rota sem `acesso` ou sem schema de resposta → o servidor não sobe; lista fechada de exceções (CORS); rota não pública → 401; matriz de autorização (5 papéis × todas as rotas); campo fora do schema não sai;
  - plugin `acesso` (`onRoute` e `onRequest`) e o `serializerCompiler`.
  - Critérios: CA5.2, CA5.5, CA5.6.
  - **Feito em 23/11/2026:**
    - 12 testes antes (vermelhos: o módulo não existia), mais 1 para rota com vários métodos;
    - ao ligar a regra, as 5 rotas dos testes anteriores sem `acesso` foram recusadas (a trava funcionou); elas passaram a declarar, com o auxiliar `ROTA_PUBLICA_DE_TESTE`;
    - matriz de autorização criada; ganha as primeiras entradas na T011, com as rotas de saúde;
    - 140 testes da API, 99,6% das linhas e 94% dos ramos.
- [x] T011 Saúde e servidor:
  - teste antes: `/health/live`; `/health/ready` (200, 503, cache de 2 s, uma consulta só para chamadas simultâneas); desligamento gracioso;
  - módulo `saude`, `server.ts` e o script `dev`;
  - `tsconfig.build.json` (`noEmit: false`, `rootDir: src`, `outDir: dist`, só `src/**`) e o script `build`.
  - Critérios: CA1.2–CA1.4, CA8.3.
  - **Feito em 23/11/2026:**
    - testes antes: 6 da prontidão, 5 das rotas, 5 do servidor real e 4 de `PORTA`/`ENDERECO`, todos vermelhos;
    - o teste do desligamento travava: a conexão mantida pelo cliente segurava o fim. Corrigido com `Connection: close` durante o desligamento;
    - a matriz de autorização reclamou das 2 rotas novas e ganhou as entradas (2 rotas × 5 papéis);
    - `build`, `start` e `dev` conferidos à mão: a versão compilada recusa configuração inválida (código 1) e responde pela rede com os cabeçalhos de segurança;
    - **prova por mutação (review-gate, T012):** 6 mutações no cache da prontidão (sem cache, sem chamada única, sem nova conferência, borda dos 2 s, limite de 1 s, limite padrão). O limite de 1 s sobreviveu, porque o teste usava 20 ms reais e não conferia o tempo. O teste passou a usar relógio controlado e a conferir 999 ms e 1000 ms; agora as 6 deixam testes vermelhos;
    - 169 testes da API, 100% das linhas e 95,7% dos ramos.
- [ ] T012 Fechamento da fundação:
  - `api/README.md` (comandos, pool, as duas opções de domínio com CORS, cookie e `TRUST_PROXY`, D1), `CHANGELOG.md` e `docs/aplicacao/api-fundacao.md`;
  - passo a passo da proteção da `main` (D19), conferido com `gh api …/branches/main/protection`;
  - **`review-gate` da fundação inteira**, com os quatro revisores, e correção de todo Crítico e Alto.
  - **Andamento em 23/11/2026:**
    - README, CHANGELOG e documentação escritos;
    - **rodada 1 do review-gate:** desempenho e qualidade APROVADO; backend e segurança REPROVADO (2 Altos e 7 Médios). Todos os Altos, todos os Médios e os Baixos baratos foram corrigidos (lista em `docs/aplicacao/api-fundacao.md`, seção "Review-gate da fundação"):
      - 32 testes novos escritos antes e vistos vermelhos (401 com as proteções 3, erros do banco 5, check-lock 5, desligamento 7, porta ocupada 1, resposta 2xx 1, `TRUST_PROXY` 4, molde da rota 1, banco 4, mensagem de várias linhas 1);
      - passaram de primeira, de propósito, os casos de aceitação que servem de controle (rotas com 201, 204 e 2xx; faixas no limite, `/8` e `/32`);
      - passou de primeira **um teste de caracterização**: "recusa conexão nova enquanto desliga". O comportamento já existia e só não tinha teste;
      - essas correções saíram num commit só (`e5c4ca9`), que misturava assuntos. Em 24/11/2026, a pedido do responsável, ele foi dividido em 14 commits, um por assunto, cada um com tipos e testes unitários verdes (`fe23857` a `2077e56`). O conteúdo final ficou idêntico, conferido com `git diff`. A partir da rodada 2, um commit por achado;
    - **rodada 2 do review-gate:** desempenho, qualidade e backend APROVADO; segurança REPROVADO (1 Alto e 1 Médio no check-lock). Corrigidos o Alto, o Médio e os Baixos baratos de todos os revisores, um commit por achado:
      - vistos vermelhos antes: tarball de outro pacote ou de outra versão 2, marca `inBundle` 3, forma do lockfile 3, novos 503 do banco 14 unitários e 1 de integração (conexão derrubada, `57P01`), IPv4 mapeado no `TRUST_PROXY` 3, log com os códigos e sem a mensagem disfarçada 2, desligamento em 8 s 1;
      - passaram de primeira, como caracterização no banco real de formatos já tratados: consulta cortada pelo limite de 2 s e banco inalcançável. Também os controles de aceitação (escopo e apelido no check-lock, IPv4 mapeado estreito);
      - a conferência CA7.6 (`conferir-esteira.sh`) não tinha teste automatizado e deixava passar escrita entre aspas e em chaves (Médio da rodada 3, qualidade). Na rodada 3, as regras viraram o módulo testado `api/scripts/workflows.ts`;
    - 241 testes da API; linhas, comandos e funções em 100%, ramos em 96%;
    - **rodada 3 do review-gate:** desempenho, qualidade e backend APROVADO; segurança REPROVADO (1 Alto: `name` forjado no lockfile). Corrigidos o Alto, o Médio de qualidade (CA7.6 sem teste e com frestas) e os Baixos, um commit por achado:
      - vistos vermelhos antes: CA7.6 17 casos (o módulo não existia; depois, 4 para as frestas novas), `name` forjado e formato de nome e versão 4, regra do bundle 3, data de publicação inválida 1, pilha que não começa pela mensagem 1;
      - os testes de integração ficaram mais rígidos (57P01 conferido no erro cru, espera com prazo, `finally`, qualquer saída menos 2xx). `codigoDoPostgres` virou função única (refatoração, sem mudança de comportamento);
    - 268 testes da API; linhas, comandos e funções em 100%, ramos em 96%;
    - **rodada 4 do review-gate:** desempenho, qualidade e backend APROVADO; segurança REPROVADO (1 Alto: o apelido `npm:` também vinha do lockfile, e bastava declará-lo em qualquer entrada). Corrigidos o Alto, o Médio de qualidade (CA7.6 ainda com formatos que escapavam) e os Baixos, um commit por achado:
      - vistos vermelhos antes: apelido só pela base ou pelo `allowAliases` 8, CA7.6 falhando fechado 11, quadros reais da pilha 1, `bundleDependencies: true` e `name` no bundle 2;
      - passaram de primeira os dois testes positivos da pilha (caso comum e erro sem mensagem), que caracterizam um comportamento existente sem teste;
      - o teste da conexão nova no desligamento voltou à lista exata de saídas;
    - a branch foi enviada ao GitHub em 24/11/2026 (o CI roda no pull request);
    - **rodada 5 do review-gate:** desempenho, qualidade e backend APROVADO; segurança REPROVADO (1 Alto: uma entrada `link` no lockfile punha o código de outro pacote na pasta, provado com o npm 11.20.0). Corrigidos o Alto, o Médio (quebra de linha dentro de aspas na CA7.6) e os Baixos, um commit por achado:
      - vistos vermelhos antes: link só para workspace 5, `allowAliases` com valor que não é texto 1, CA7.6 10 (quebra de linha em aspas 3, `Write` 1, `Actions/checkout` 1, `persist-credentials` no próprio passo 2, e 3 testes antigos que passaram a esperar a linha na mensagem);
      - o check-lock destaca "APELIDO NOVO" para cada apelido aceito só pelo `allowAliases`;
    - falta: a rodada 6 do review-gate e a proteção da `main` (D19). A proteção precisa do responsável: o `gh` não está instalado, e o uso da credencial guardada pelo Git foi bloqueado pelas permissões do Claude Code.

## Adiado para a fase que usa

| O que | Critérios | Vai para | Por quê |
|---|---|---|---|
| Normalização de códigos e texto, equivalência código × banco | CA6.1, CA6.2, CA6.5 | Fase 3 (produtos) | É usada pelos códigos e similares dos produtos |
| Paginação com tetos (24 / 25) | CA6.4 | Fase 3 (primeira lista paginada) | Nenhuma rota lista nada antes disso |
| `/docs`, OpenAPI e tipos em `contracts/` | CA5.1, CA5.3, CA5.4 | Fase 4 (catálogo público) | Ninguém consome o contrato antes do front. O schema de resposta obrigatório (CA5.2) fica na fundação. |
| Medidor de performance e registro em `docs/perf/` | CA8.1, CA8.2 | Fase 4 | Só há o que medir quando existir a busca. As notas da revisão da T003 (`medicao`, `pg_settings`, CPUs) valem para lá. |
| Semgrep, SBOM e gitleaks do histórico no CI | parte do CA7.3 | Fase 7 (endurecimento) | O gitleaks no commit e no CI, o audit e as assinaturas já cobrem o principal agora |
| Senha na página do Mailpit | — | Antes da Fase 1 | As mensagens com links de convite e de senha começam na Fase 1 |
| CODEOWNERS em `.github/**`, `api/scripts/**`, `.npmrc` e `package.json`, e checks obrigatórios na `main` | CA7.6, D19 | Com a proteção da `main` (depende do responsável) | Hoje um PR pode mudar o próprio portão (`check-lock.ts`, `ci.yml`); a proteção da `main` com revisão obrigatória fecha isso (review-gate, rodada 2) |
| Pilha de erro cuja mensagem foi encurtada depois de lida e que trazia uma linha falsa no formato `at x (arquivo:1:2)` | — | Quando houver caso real | Cenário improvável (review-gate, rodada 5, backend). Fechar de vez exigiria trocar a montagem da pilha do Node (`Error.prepareStackTrace`) em toda a API |
| `allowAliases` e o próprio check-lock podem ser mudados no mesmo PR | CA7.1, D19 | Com a proteção da `main` (D19) e um CODEOWNERS | O check-lock destaca o apelido novo para quem revisa, mas só a revisão obrigatória na `main` barra um PR mal-intencionado (review-gate, rodada 5) |
| Importação de planilha e imagens fora do ciclo da requisição | — | Fases da importação e das imagens | O desligamento força a saída em 8 s e o `requestTimeout` é de 30 s: trabalho longo dentro da requisição seria cortado (review-gate, rodada 2) |

## Verificação

- [x] Cobertura ≥ 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**` (e também em `src/config/**`, `src/app.ts`, `src/servidor.ts` e `src/desligamento.ts`).
- [x] Matriz de autorização verde.
- [ ] `review-gate` da fundação aprovado (sem Crítico nem Alto).
- [x] `README`, `.env.example`, `docs/` e `CHANGELOG.md` atualizados.

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
| T011 | Duas variáveis novas: `ENDERECO` (padrão `127.0.0.1`) e `PORTA` (padrão 3333) | O plano não dizia onde a API escuta. O padrão fechado (só a própria máquina) atende ao revisor de segurança (S2: na VPS, só o Caddy fala com a internet). |
| T011 | `src/servidor.ts` (`iniciarServidor`) separado do `src/server.ts` | O `server.ts` só cuida do processo (sinais, saída); o resto fica testável. |
| T009 | `montarApp` ficou assíncrona | Os plugins (limite, CORS, cabeçalhos) só alcançam as rotas registradas depois que carregam; esperar o carregamento evita rota sem proteção. |
| T008 | O `serializerCompiler` do Zod entrou na T008, e não na T010 | O formato único de erro já usa rotas com schema de resposta. A T010 continua com a regra de que toda rota declare o schema. |
| T008 | Removido o leitor de `text/plain` do Fastify | A API só aceita JSON (RN6); sem isso, texto puro virava 400 em vez de 415. |
| T008 | Nos testes, a regra `no-unsafe-assignment` do lint fica desligada | O `expect.any()` do Vitest tem tipo `any`; no código da API a regra continua valendo. |
| T007 | O banco é o módulo `src/shared/banco.ts`; o registro no Fastify fica para a T011 (quando existir o `app.ts`) | Ainda não há servidor. Sem `fastify-plugin` (não está na lista aprovada): os plugins serão registrados direto na raiz. |
| T007 | `contarQueries` virou `contarConsultas`, em `tests/apoio/`, e soma os dois clientes | Fica junto do resto do apoio de testes; nome em português. |
| T005 | `Clock`, `IdGenerator`, `montarApp` e `contarQueries` ficam para as tarefas que os usam primeiro (T007: `contarQueries`; T008: `IdGenerator` e `montarApp`; T011: `Clock`) | São código de produção ou dependem dele (Prisma, `app.ts`). Criá-los antes seria código sem uso nem teste de verdade. |
| T005 | Em vez de um teste que compara o compose com o Testcontainers, o Testcontainers **lê** o compose | Uma fonte só elimina a divergência, em vez de só detectá-la. |
| T003 | PostgreSQL 17.11 e Mailpit v1.33.1, e não as mais novas (17.12 de 21/11 e v1.34.0 de 17/11) | Regra dos 7 dias aplicada às imagens. A 17.12 entra a partir de 28/11/2026 (anotado no compose). |
| T003 | Fuso do banco em UTC (o compose chegou a ter `TZ: America/Bahia`) | O mesmo fuso dos testes; datas guardadas sem ambiguidade, e a API converte para o horário da Bahia (review-gate). |
| T003 | Proteger a página do Mailpit com senha ficou para antes da Fase 1 | Hoje a caixa só tem mensagens de teste, e ela já fica só em 127.0.0.1. Na Fase 1, as mensagens terão links de convite e de senha (anotado no compose). |
| T003 | Além do provedor `builtin`, o `--locale=C.UTF-8` | Sem ele, o `lc_collate`/`lc_ctype` do sistema vinham da imagem (`en_US.utf8`). Agora o banco não herda nada da máquina. |
| T003 | Usuário e senha do banco são obrigatórios no `api/.env`, sem valor padrão no compose | Nenhuma senha, nem a de desenvolvimento, fica no repositório público. |
| — | As 30 tarefas viraram 12; normalização, paginação, `/docs`, contratos, medidor de performance e parte do CI foram para as fases que os usam; o `review-gate` passa a rodar por bloco | Pedido do responsável em 23/11/2026: a fundação estava lenta para o que entrega, e esses itens não são usados antes da Fase 1. Os critérios adiados estão listados na seção "Adiado para a fase que usa". |
| T012 | `TRUST_PROXY` recusa faixa larga demais: menor que `/8` no IPv4, `/32` no IPv6 e `/104` no IPv4 mapeado (`::ffff:0:0/96`) | A spec pede só "IPs ou CIDR". Uma faixa como `0.0.0.0/0` ou `::ffff:0:0/96` confiaria na internet inteira, e qualquer um forjaria o IP do cliente (review-gate). |
| T012 | O check-lock só aceita `resolved` igual ao endereço do tarball do próprio pacote no registro | Mais rígido que "vem do registro": fecha a troca pelo tarball de outro pacote ou de outra versão (Alto da rodada 2). Um pacote novo que venha em bundle (sem `resolved`) seria recusado pela origem: falha fechada, a revisar quando acontecer. |
| T012 | A conferência CA7.6 lê os workflows linha a linha, sem parser de YAML, num módulo testado (`api/scripts/workflows.ts`) | Um parser (ou um binário como o zizmor) seria um pacote novo. Sem ele, as regras falham fechado (recusam a palavra `write` e os recursos do YAML que escreveriam o mesmo de outro jeito), mas são uma heurística, não uma garantia. O controle de verdade fica do lado do GitHub: proteção da `main`, SHA completo obrigatório nas actions e token só de leitura (D19). |
| T012 | O `IdGenerator` não é injetado: o `request-id` usa `randomUUID` direto | Nenhum teste precisa do valor exato do id; os testes conferem o formato (UUID) e quando o id do proxy é aceito. Vira dependência injetada se uma fase precisar. |
| T012 | `campos` sai da resposta de erro quando está vazio | A RN1 diz "campos só quando há"; um objeto vazio não informa nada. |
| T012 | A mensagem de conflito (409) é fixa ("Já existe um registro com este valor.") | Cada fase com unicidade (e-mail, código do produto) troca pela mensagem do campo, quando houver o caso real. |
| T012 | O `tsconfig.json` liga `allowImportingTsExtensions` (o build desliga) | O check-lock roda antes do `npm ci`, no node puro, que exige import com `.ts`. |
| T012 | O `idle_in_transaction_session_timeout` (10 s) vale nos dois pools, e não só na administração | Não custa nada e protege também uma transação que o público venha a abrir. |
| T012 | O 401 das rotas não públicas saiu do `onRequest` (como dizia a T010) para o `preParsing` | No `onRequest`, ele cortava os cabeçalhos de segurança, o CORS e o limite de requisições (Alto do review-gate). |
| T001 | A sincronização do lockfile rodou uma vez com `--engine-strict=false` | O lockfile guardava o `24.x` antigo do `frontend/`, e o `engine-strict` recém-ligado barrava justamente a instalação que o corrige. Depois disso, `npm ci` passa com tudo ligado. |
