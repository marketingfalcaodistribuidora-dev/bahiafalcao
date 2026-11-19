# Prompt — Backend do Catálogo Falcão Distribuidora

> Cole este prompt inteiro no Claude Code, na raiz de um repositório vazio.
> Antes, exporte a especificação técnica para Markdown e salve em `docs/especificacao.md` (link abaixo).

---

## 1. Papel e objetivo

Você é um engenheiro de software sênior especialista em Node.js, segurança de aplicações e performance de banco de dados. Vai construir **somente o backend (API)** do catálogo online da Falcão Distribuidora: autopeças para linha pesada, em Feira de Santana/BA.

O frontend (Next.js) será feito **depois**, em outra etapa. Nesta etapa:
- **não** crie telas;
- deixe a API pronta para ser consumida por ele: contrato OpenAPI, tipos gerados, cookies e CORS corretos.

O produto:
- **Catálogo público:** busca de peças por código, código original, similares, nome e veículo, com filtros. O cliente monta uma lista e envia a cotação pelo WhatsApp. O servidor **não** guarda cotações.
- **Administração com login:** produtos, categorias, importação de planilha, usuários com papéis Administrador e Editor por convite, configurações e registro de atividades.

## 2. Fontes da verdade

| Fonte | Onde | Uso |
| --- | --- | --- |
| Especificação técnica | `docs/especificacao.md` (exportada de https://claude.ai/artifact/MLJ9cpyBsP5HktWkxcF9oC) | Regras de negócio, modelo de dados, API, estados, permissões, critérios de aceite. **É a fonte principal.** |
| Design (UI/UX) | https://claude.ai/artifact/WoLa2hTTJcvpmxojRsTv2X | Referência para o time humano e para a fase do frontend. Você provavelmente não consegue abrir este link (é privado); não dependa dele. Toda regra relevante está na especificação. |

Regras sobre as fontes:
- Se a especificação e este prompt divergirem, **pare e pergunte**.
- Se algo não estiver especificado, **não invente regra de negócio**. Registre em `docs/decisoes-em-aberto.md` e pergunte.

## 3. Stack obrigatória

- **Runtime:** Node.js LTS ativo (confirme qual é a LTS atual em nodejs.org antes de fixar). Fixe a versão em `.nvmrc` e em `engines`.
- **Linguagem:** TypeScript em modo `strict`, com `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `noImplicitOverride`. Proibido `any` (lint bloqueia); use `unknown` + validação.
- **Framework:** Fastify, com `fastify-type-provider-zod` (ou equivalente mantido) para validação e serialização a partir de schemas Zod.
- **Validação:** Zod em **toda** entrada: body, query, params, headers relevantes, variáveis de ambiente, linhas de planilha.
- **ORM:** Prisma.
- **Banco:** PostgreSQL. Extensões: `unaccent` e `pg_trgm`.
- **Testes:** Vitest.
  - Integração com PostgreSQL real via Testcontainers. Nunca SQLite nem mocks de banco para testar queries.
  - Chamadas HTTP de teste com `app.inject()` do Fastify.
- **Bibliotecas de apoio**, avalie cada uma pelo protocolo da seção 5 antes de instalar:
  - `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/cookie`, `@fastify/multipart`, `@fastify/swagger`;
  - `argon2`;
  - `pino` (log nativo do Fastify);
  - `sharp` para reprocessar imagens;
  - `file-type` para checar o tipo real de arquivos;
  - uma biblioteca de leitura de planilha **segura e mantida** (atenção: o pacote `xlsx` publicado no npm ficou desatualizado e com vulnerabilidade conhecida; avalie `exceljs` ou a distribuição oficial atual do SheetJS e documente a escolha);
  - e-mail atrás de uma interface própria (`EmailSender`), com Mailpit no ambiente local.
- **Qualidade:**
  - ESLint (typescript-eslint em modo strict + regras de segurança) e Prettier;
  - Husky + lint-staged;
  - commits no padrão Conventional Commits.
- **Infra local:** Docker Compose com Postgres e Mailpit.

## 4. Metodologia obrigatória: SDD + TDD

### 4.1 SDD — Spec-Driven Development

Nenhuma funcionalidade começa sem especificação aprovada. Para cada funcionalidade, crie `specs/NNN-nome-curto/` com três arquivos:

1. **`spec.md`** — o quê e por quê:
   - objetivo e regras de negócio, com referência à seção de `docs/especificacao.md`;
   - fora de escopo;
   - critérios de aceite no formato **Dado / Quando / Então**, cobrindo caminho feliz, erros, permissões e casos-limite;
   - requisitos de segurança e performance específicos (ex.: "busca p95 < 300 ms com 10.000 produtos").
2. **`plan.md`** — o como:
   - rotas e contratos (schemas Zod);
   - mudanças no banco (migrations e índices, com justificativa);
   - módulos afetados;
   - riscos e ameaças (mini *threat model*: STRIDE resumido);
   - estratégia de testes.
3. **`tasks.md`** — lista ordenada de tarefas pequenas (≤ 2 h cada), cada uma ligada a critérios de aceite e testes.

Depois de escrever os três arquivos, rode os agentes revisores sobre a spec (seção 8). Em seguida, **mostre o resumo e aguarde minha aprovação** antes de codar.

### 4.2 TDD — Test-Driven Development

Para cada tarefa, siga o ciclo **Red → Green → Refactor**:
1. Escreva o teste que falha, ligado a um critério de aceite.
2. Rode e **mostre a falha**.
3. Implemente o mínimo para passar.
4. Refatore com os testes verdes.

Regras:
- Proibido escrever código de produção sem um teste falhando antes. Exceções: configuração, migrations e tipos, que são cobertos por testes de integração.
- **Pirâmide de testes:**
  - unitários para regras de domínio, normalização de código e busca, e validação de planilha;
  - integração (HTTP + banco real) para cada rota e cada critério de aceite;
  - contrato: a resposta real bate com o OpenAPI gerado.
- **Matriz de autorização obrigatória:** um teste parametrizado que percorre **todas as rotas × todos os papéis** (anônimo, editor, administrador, usuário desativado, sessão expirada) e verifica o status esperado (200/401/403). Rota nova sem entrada na matriz faz o teste falhar.
- **Testes de segurança:** injeção (SQL/ORM, prototype pollution), XSS armazenado (texto com `<script>` volta escapado ou intacto, nunca executável), IDOR, enumeração de e-mail, reuso de token, *mass assignment* (campos extras rejeitados), upload malicioso (tipo falso, imagem gigante, zip bomb na planilha).
- **Testes de performance de busca:** seed de 10.000 produtos realistas e asserção de tempo, com `EXPLAIN (ANALYZE, BUFFERS)` salvo em `docs/perf/` para as queries críticas.
- **Cobertura mínima:** 90% de linhas e ramos em `src/modules/**` (CI falha abaixo disso). Rode mutation testing (Stryker) nos módulos de auth e busca antes da entrega final.
- Testes determinísticos: relógio controlado (`vi.useFakeTimers` ou um `Clock` injetado), sem `sleep`, banco isolado por arquivo de teste (transação ou schema por worker).

## 5. Segurança da cadeia de suprimentos (OBRIGATÓRIO antes de cada dependência)

Houve vários ataques recentes ao ecossistema npm: contas de mantenedores comprometidas, versões maliciosas de pacotes populares e *worms* que se espalham pelo `postinstall`. **Nenhuma dependência entra sem este protocolo.** Transforme-o na skill `dependency-check` (seção 9).

Antes de instalar ou atualizar qualquer pacote:
1. **Necessidade:** dá para fazer com a biblioteca padrão do Node ou com algo já instalado? Menos dependências = menos superfície de ataque.
2. **Verificação, sem confiar na memória:** consulte o registro e as bases de vulnerabilidade **no momento da instalação**:
   - `npm view <pacote> time versions maintainers repository dist.signatures`;
   - `npm audit` e a base OSV (osv.dev) ou GitHub Advisories para a versão escolhida;
   - se disponível, ferramenta de reputação (ex.: Socket) para detectar scripts de instalação, código ofuscado, acesso à rede ou ao sistema de arquivos.
3. **Critérios de recusa** (qualquer um bloqueia):
   - versão publicada há **menos de 7 dias**: use a anterior estável, configurando *minimum release age* se o gerenciador suportar;
   - troca recente de mantenedor;
   - script `preinstall`/`postinstall` não justificado;
   - pacote abandonado (sem release há mais de 18 meses, com issues de segurança abertas);
   - *typosquatting*;
   - vulnerabilidade alta ou crítica sem correção.
4. **Fixação:**
   - versões **exatas** no `package.json` (`save-exact=true` no `.npmrc`), sem `^` nem `~`;
   - lockfile versionado;
   - instalação sempre com `npm ci` no CI;
   - preferir pacotes com *provenance*/assinatura e rodar `npm audit signatures`.
5. **Scripts de instalação:** `ignore-scripts=true` no `.npmrc`. Libere explicitamente só os pacotes que precisam compilar binário (ex.: `argon2`, `sharp`, `prisma`), depois de verificados, e documente a razão.
6. **Registro:** mantenha `docs/dependencias.md` com, para cada dependência:
   - versão;
   - motivo;
   - data da verificação;
   - resultado do audit;
   - alternativas consideradas.
7. **CI:** `npm audit --audit-level=high`, verificação de assinaturas, SBOM (CycloneDX) gerado a cada build, Dependabot ou Renovate com agrupamento e **espera mínima de 7 dias** para novas versões, e bloqueio de merge com vulnerabilidade alta.
8. **Imagem Docker:** base mínima (distroless ou `node:<lts>-slim`) fixada por *digest*, usuário não-root, sem ferramentas de build na imagem final, scan da imagem (Trivy ou equivalente).

## 6. Arquitetura

```
src/
  app.ts                 # monta o Fastify (plugins, rotas); sem listen
  server.ts              # listen + graceful shutdown
  config/env.ts          # Zod valida process.env; falha no boot se inválido
  plugins/               # helmet, cors, cookie, rate-limit, auth, csrf, error-handler, swagger, prisma
  shared/                # erros de domínio, Clock, IdGenerator, normalização de texto, paginação
  modules/
    auth/                # login, logout, sessões, esqueci/redefinir senha, aceitar convite
    usuarios/            # CRUD, convites, papéis, bloqueio, proteções (último admin, si mesmo)
    produtos/            # CRUD admin, visibilidade, fotos, busca pública, detalhe, lote
    categorias/
    importacao/          # upload → validação → prévia → confirmação (transação) → progresso
    configuracoes/
    atividades/          # registro de auditoria
    email/               # interface EmailSender + adaptadores (SMTP/serviço, Mailpit local)
  cli/criar-admin.ts     # bootstrap do primeiro administrador (envia convite, não define senha)
prisma/schema.prisma + migrations/
tests/ (unit/, integration/, contract/, security/, perf/) + factories/
specs/NNN-*/  docs/
```

Princípios:
- **Camadas por módulo:**
  - `routes`: só HTTP e schemas;
  - `service`: regras de negócio, puro e testável;
  - `repository`: Prisma e SQL.
  - O service não conhece o Fastify. O repository não tem regra de negócio.
- **Dependências injetadas** (Clock, EmailSender, Storage, repositórios), para os testes não precisarem de mocks globais.
- **Schemas Zod** como fonte única: validam a entrada, serializam a saída (só campos permitidos; nunca devolva `senha_hash`, tokens ou campos internos) e geram o **OpenAPI 3.1** em `/docs`, protegido em produção. Gere também os tipos em `contracts/` para o frontend consumir depois.
- **Formato único de erro**, como na especificação: `{ "erro": "codigo_maquina", "mensagem": "texto para pessoas", "campos": { … } }`.
  - Erros do Prisma (ex.: `P2002`, violação de unicidade) viram erros de domínio.
  - Nunca vaze stack trace nem SQL.
- **Logs:**
  - Pino com `requestId` (`x-request-id` gerado ou propagado);
  - redação (`redact`) de senha, tokens, cookies e `authorization`;
  - log de segurança separado para login, falhas, bloqueios e mudanças de papel.
- **Desligamento gracioso:** fecha o servidor, termina as requisições em andamento e desconecta o Prisma.
- **Health checks:** `/health/live` e `/health/ready` (checa o banco).

## 7. Requisitos específicos

### 7.1 Segurança da aplicação (alvo: OWASP ASVS nível 2)

- **Senhas:**
  - Argon2id com parâmetros recomendados pela OWASP no momento (verifique e documente);
  - regra mínima da especificação (≥ 8, letras e números, diferente do e-mail);
  - checagem contra lista de senhas comuns.
- **Sessões:**
  - token opaco aleatório (≥ 256 bits) no cookie `HttpOnly; Secure; SameSite=Lax; Path=/`, com prefixo `__Host-` quando possível;
  - no banco guarde **só o hash** (SHA-256) do token;
  - expiração por inatividade (8 h) e "manter conectado" (30 dias), tudo configurável;
  - revogação imediata ao desativar o usuário, trocar a senha ou trocar o papel (quando necessário);
  - rotação do token após o login (evita *session fixation*).
- **CSRF:**
  - rotas de escrita da administração exigem token anti-CSRF (double-submit ou sincronizado);
  - verificação de `Origin`/`Referer` contra uma lista permitida.
- **Tokens de e-mail** (convite, redefinição, troca de e-mail):
  - aleatórios, guardados só o hash, uso único, com expiração (7 dias / 1 h);
  - reenviar invalida o anterior;
  - comparação em tempo constante.
- **Anti-enumeração:**
  - login e "esqueci a senha" respondem igual, exista ou não o e-mail;
  - tempo de resposta equalizado (rode um hash falso quando o usuário não existir).
- **Rate limit** (por IP **e** por identificador):
  - login 5 falhas em 15 min, com bloqueio da conta conforme a especificação;
  - esqueci a senha 3 por hora;
  - busca pública com limite generoso;
  - importação 1 em andamento por usuário.
  - Use um store compartilhado se houver mais de uma instância.
- **Autorização (RBAC):**
  - checada no servidor em **toda** rota, por decorator ou hook, nunca dentro do handler de forma ad hoc;
  - proteções: não pode haver zero administradores ativos; ninguém desativa, exclui ou rebaixa a si mesmo.
- **Validação:**
  - Zod `strict()` (rejeita campos extras, o que evita *mass assignment*);
  - limites de tamanho em todo texto, array e número;
  - `bodyLimit` do Fastify configurado por rota.
- **Uploads:**
  - **Foto:** checar o tipo real pelos *magic bytes* (JPG/PNG/WebP), limite de 5 MB e de dimensões, reprocessar com `sharp` (gera WebP de 400 e 800 px e remove metadados/EXIF), nome gerado pelo servidor;
  - guardar fora da pasta pública ou em storage de objetos, atrás de uma interface `Storage`;
  - **Planilha:** limite de 10 MB e 10.000 linhas, proteção contra *zip bomb* (limite de tamanho descompactado), leitura em *stream* quando possível; fórmulas são lidas como valor, nunca executadas.
- **Saída:**
  - API só JSON, com `Content-Type` correto;
  - texto devolvido sem transformar em HTML (o frontend escapa);
  - na exportação de "linhas com erro" (.xlsx/.csv), neutralizar *CSV/formula injection* (prefixar `'` em células que começam com `= + - @`).
- **Cabeçalhos:**
  - `@fastify/helmet` com CSP restritiva para `/docs`, HSTS e `X-Content-Type-Options`;
  - CORS com lista de origens exata (o domínio do site); nunca `*` com credenciais.
- **SQL:**
  - só Prisma ou `$queryRaw` com *tagged template* (parametrizado);
  - **proibido** `$queryRawUnsafe` e `$executeRawUnsafe` (regra de lint + grep no CI).
- **Segredos:**
  - só em variáveis de ambiente validadas, `.env` fora do git com `.env.example` documentado;
  - gitleaks no pre-commit e no CI.
- **Auditoria:** gravar em `atividade` todo login (sucesso e falha), bloqueio, CRUD de produto e categoria, importação, ação sobre usuários e mudança de configuração, guardando quem, quando, o quê e o IP.
- **LGPD:** excluir um usuário apaga nome, e-mail e hash, mantendo o `id` para o histórico ("Usuário excluído"). Atividades guardadas por 12 meses (job de limpeza).
- **CI de segurança:** Semgrep (ou CodeQL), `npm audit`, gitleaks, Trivy na imagem, SBOM.

### 7.2 Performance de banco e de busca

Metas: busca pública **p95 < 300 ms** e detalhe **p95 < 100 ms** com 10.000 produtos e 20 requisições simultâneas, medidas em teste (autocannon ou k6) com o resultado salvo em `docs/perf/`.

- **Normalização:**
  - coluna `codigo_normalizado` (minúsculo, sem espaço, ponto, hífen e barra), mantida pela aplicação ou por coluna gerada;
  - o mesmo para original e similares, numa tabela `produto_codigo` (`produto_id`, `tipo`, `valor_normalizado`) para busca exata por índice B-tree.
- **Texto:**
  - coluna `busca_texto` com `unaccent(lower(...))` de nome, aplicação, categoria e veículos;
  - índice **GIN `gin_trgm_ops`** para busca parcial/aproximada;
  - avalie também um `tsvector` em português (com `unaccent`) e índice GIN para palavras completas.
  - Escolha pelo resultado do `EXPLAIN ANALYZE`, não por preferência, e documente.
  - Para `unaccent` em índice, crie um wrapper `IMMUTABLE` (`f_unaccent`), como manda a documentação do Postgres.
- **Relevância** conforme a especificação: código exato > original/similar exato > prefixo do nome > similaridade (`similarity()`/`word_similarity()`) > resto. Implemente numa única query SQL parametrizada (CTE) e teste a ordem com casos reais.
- **Paginação:**
  - lista pública com `limit` máximo de 24 (validado);
  - administração com 25 por página e teto rígido;
  - nunca `OFFSET` sem limite; para listas grandes de administração, avalie paginação por cursor (keyset).
- **Contagens dos filtros** (por segmento e categoria) numa query agregada só, nunca N queries.
- **Índices:**
  - `produto(visivel, categoria_id)`, `produto(segmento)`, `produto(atualizado_em DESC)`;
  - únicos em `codigo` e `usuario.email`;
  - `sessao(token_hash)`, `token(hash)`;
  - parciais onde fizer sentido (ex.: `WHERE visivel = true`).
  - Cada índice com justificativa no `plan.md`.
- **N+1 proibido:**
  - use `select` explícito (nunca devolver a linha inteira);
  - `include` só com o necessário;
  - teste que conta queries nas rotas de lista.
- **Importação:**
  - validar tudo primeiro;
  - gravar numa **transação única** com `createMany`/`upsert` em lotes (ex.: 500), ou tabela temporária + `INSERT … ON CONFLICT`;
  - progresso persistido em `importacao`;
  - processamento fora do ciclo da requisição (fila simples no banco ou job em processo), sem bloquear o *event loop*.
- **Pool de conexões** do Prisma dimensionado e documentado. *Timeouts* configurados: `statement_timeout` no Postgres para rotas públicas e timeout de requisição no Fastify.
- **Cache HTTP nas rotas públicas:**
  - `Cache-Control: public, max-age=60, stale-while-revalidate=300` + `ETag`;
  - configuração pública com cache e invalidação ao salvar;
  - compressão (`@fastify/compress`) para respostas > 1 KB.
- **Serialização rápida** pelos schemas de resposta do Fastify, com payload mínimo: a lista devolve só o que o card mostra.
- **Seed realista** (`npm run seed:perf`) com 10.000 produtos, 30 categorias e aplicações por veículo, usado nos testes de performance.

## 8. Agentes (crie em `.claude/agents/`)

Crie os arquivos abaixo com o frontmatter do Claude Code (`name`, `description`, `tools`). Os revisores são **somente leitura**:
- ferramentas: `Read, Grep, Glob, Bash`;
- o Bash serve só para rodar testes, lint, audit e `EXPLAIN`, nunca para editar.

Cada revisor devolve um relatório com:
- achados por severidade (**Crítico / Alto / Médio / Baixo**);
- arquivo e linha;
- por que importa;
- correção sugerida;
- veredito final: **APROVADO** ou **REPROVADO**.

Qualquer Crítico ou Alto reprova.

1. **`backend-reviewer`**
   - Arquitetura em camadas, tipagem strict sem `any`, aderência à spec e ao `plan.md`, contratos Zod/OpenAPI coerentes;
   - tratamento de erros no formato único, transações corretas, idempotência, nomes claros;
   - código morto, duplicação.
2. **`security-reviewer`**
   - Checklist da seção 7.1 + OWASP ASVS L2 + OWASP API Top 10;
   - AuthN/AuthZ em cada rota (confere a matriz de autorização), CSRF, sessões, tokens, rate limit, uploads, injeção, *mass assignment*, enumeração, vazamento em logs e erros, segredos;
   - **cadeia de suprimentos**: roda o protocolo da seção 5 sobre qualquer mudança em `package.json` ou lockfile e reprova se faltar registro em `docs/dependencias.md`;
   - faz *threat modeling* (STRIDE) de cada spec nova.
3. **`performance-reviewer`**
   - Queries geradas (liga o log de queries do Prisma nos testes), N+1, `select` excessivo, índices faltando ou sobrando;
   - roda `EXPLAIN (ANALYZE, BUFFERS)` nas queries críticas com o seed de 10 mil e reprova *Seq Scan* em tabela grande nas rotas quentes;
   - paginação, cache HTTP, tamanho de payload, bloqueio do *event loop*, metas de p95.
4. **`quality-reviewer`**
   - TDD de fato: testes antes do código (confere a ordem dos commits), testes ligados aos critérios de aceite, cobertura ≥ 90%;
   - testes frágeis ou não determinísticos, nomes de teste que descrevem comportamento;
   - lint e format limpos, Conventional Commits, documentação (`README`, `.env.example`, OpenAPI, `docs/`) atualizada, *Definition of Done* cumprida.
5. **`frontend-reviewer`** (criar agora, usar só na fase do front)
   - Next.js (App Router) + TypeScript + Tailwind CSS;
   - Server Components por padrão, `"use client"` só onde há interatividade;
   - streaming com `Suspense`/`loading.tsx`, `next/image` com `sizes` corretos, `next/font`, metadata e dados estruturados;
   - cache e revalidação de dados corretos (`revalidate`/tags), rotas estáticas onde possível, sem *waterfalls* de fetch;
   - componentes pequenos e reutilizáveis, design tokens no Tailwind (cores e medidas da especificação);
   - acessibilidade WCAG 2.1 AA, Core Web Vitals (LCP < 2,5 s, INP < 200 ms, CLS < 0,1);
   - nada de segredo no bundle do cliente, *bundle size*.

Crie também dois agentes de execução, que podem editar:
- **`spec-writer`**: escreve `spec.md`, `plan.md` e `tasks.md` a partir de `docs/especificacao.md`, usando a skill `sdd-feature`.
- **`test-writer`**: escreve primeiro os testes que falham para uma tarefa, usando a skill `tdd-cycle`. Nunca escreve código de produção.

## 9. Skills (crie em `.claude/skills/<nome>/SKILL.md`)

Cada skill tem frontmatter `name` e `description` (quando usar) e passos objetivos. Crie scripts auxiliares em `scripts/` quando ajudarem.

| Skill | Conteúdo |
| --- | --- |
| `sdd-feature` | Gera `specs/NNN-*/` com modelos de spec, plan e tasks. Critérios Dado/Quando/Então obrigatórios para: caminho feliz, validação, permissão (cada papel), concorrência, limites, falhas externas. Checklist de "spec pronta" antes de pedir aprovação. |
| `tdd-cycle` | Red → Green → Refactor passo a passo. Como escrever teste de integração com Testcontainers + `app.inject`, factories, relógio controlado, matriz de autorização. Mostrar a falha antes de implementar. |
| `dependency-check` | O protocolo completo da seção 5, com script `scripts/check-dep.sh <pacote>@<versão>` (consulta `npm view`, idade da versão, scripts de instalação, `npm audit`, OSV) e atualização de `docs/dependencias.md`. |
| `secure-endpoint` | Checklist para toda rota nova: schema Zod strict de entrada e saída, `bodyLimit`, papel exigido, CSRF, rate limit, registro em `atividade`, entrada na matriz de autorização, erros no formato único, teste de *mass assignment* e de IDOR. |
| `prisma-migration` | Migrations seguras: revisar o SQL gerado, índices com justificativa, `CREATE INDEX CONCURRENTLY` via migration SQL quando a tabela já tiver dados, nunca editar migration aplicada, plano de rollback, teste de migration em banco limpo e com dados. |
| `search-tuning` | Como medir e ajustar a busca: seed de 10 mil, `EXPLAIN (ANALYZE, BUFFERS)`, trigram vs tsvector, `f_unaccent` IMMUTABLE, limites de similaridade, testes de relevância com casos reais (código com hífen, nome sem acento, veículo). |
| `review-gate` | Roda em paralelo `backend-reviewer`, `security-reviewer`, `performance-reviewer` e `quality-reviewer` sobre a mudança. Consolida os relatórios. Só libera se todos aprovarem; senão, lista o que corrigir e roda de novo. |

Crie ainda um **`CLAUDE.md`** na raiz com:
- as regras inegociáveis deste prompt (SDD, TDD, protocolo de dependências, proibições);
- os comandos do projeto (`dev`, `test`, `test:integration`, `test:perf`, `lint`, `db:migrate`, `seed`, `seed:perf`, `audit`);
- o fluxo de trabalho da seção 10.

## 10. Fluxo de trabalho por funcionalidade

1. `spec-writer` cria a spec (skill `sdd-feature`).
2. `security-reviewer` faz o threat model e `performance-reviewer` revisa o plano de dados.
3. **Você me mostra o resumo e espera minha aprovação.**
4. Para cada tarefa: `test-writer` escreve o teste que falha → você implementa → refatora (skill `tdd-cycle`).
5. `review-gate` com os quatro revisores. Corrija tudo que for Crítico ou Alto e rode de novo.
6. Atualize a documentação, o OpenAPI e o `CHANGELOG.md`.
7. Faça commits pequenos (Conventional Commits) e me dê um resumo curto do que foi entregue e do que ficou pendente.

## 11. Ordem de entrega (fases)

| Fase | Entrega |
| --- | --- |
| 0 — Fundação | Repositório, `CLAUDE.md`, agentes, skills, Docker Compose (Postgres + Mailpit), TypeScript strict, lint, Vitest + Testcontainers, `.npmrc` seguro, CI (testes, cobertura, lint, audit, gitleaks, Semgrep, SBOM), config Zod, plugins base, erro único, logs com redação, health checks, OpenAPI. Cada dependência passa pelo protocolo da seção 5. |
| 1 — Acesso e usuários | Modelo `usuario`, `sessao`, `token`, `atividade`. CLI `criar-admin`. Convite e aceitar convite, login/logout, esqueci/redefinir senha, bloqueio, sessões e aparelhos, Minha conta (troca de e-mail com confirmação), CRUD de usuários com papéis e proteções, CSRF, rate limit, matriz de autorização. |
| 2 — Categorias | CRUD, ordenação, exclusão só quando vazia. |
| 3 — Produtos (admin) | CRUD, códigos e similares normalizados, especificações, aplicação por veículo, visibilidade, fotos (upload seguro + `sharp`), controle de concorrência por `atualizado_em` (conflito → 409 com quem alterou), histórico. |
| 4 — Catálogo público | Busca com relevância, filtros com contagens, detalhe, relacionadas, lote para revalidar a cotação, configuração pública, cache HTTP, metas de performance comprovadas. |
| 5 — Importação | Upload, validação por linha, prévia, confirmação transacional em lotes, progresso, arquivo de linhas com erro (sem formula injection). |
| 6 — Configurações e atividades | Configurações com validação do número de WhatsApp, registro de atividades com filtros, job de retenção de 12 meses. |
| 7 — Endurecimento | Teste de carga, mutation testing (auth e busca), revisão final de segurança completa, Dockerfile endurecido + scan, guia de deploy, backup e restauração testados, contrato OpenAPI e tipos prontos para o front. |

## 12. Preparar o terreno para o frontend (Next.js)

- O front vai rodar no **mesmo domínio** (ex.: `bahiafalcao.com.br`, com a API em `/api`, ou num subdomínio do mesmo site), para os cookies funcionarem com `SameSite=Lax`. Documente as duas opções e as configurações de CORS e cookie de cada uma.
- Publique o contrato OpenAPI e gere os tipos TypeScript (ex.: `openapi-typescript`) em `contracts/`.
- Respostas públicas pensadas para Server Components:
  - cacheáveis;
  - com `ETag`;
  - payload mínimo;
  - campos já prontos para exibição (ex.: `codigoFormatado: "cód.0103"`, URL da foto em 400 e 800 px).
- Endpoint de sitemap (`/api/sitemap-produtos`) e dados para `schema.org/Product` no detalhe.

## 13. Definition of Done (vale para toda tarefa)

- [ ] Critérios de aceite da spec cobertos por testes que passam.
- [ ] Teste escrito antes do código (visível no histórico).
- [ ] Cobertura ≥ 90% no módulo; lint, format e `tsc --noEmit` limpos.
- [ ] Matriz de autorização atualizada e verde.
- [ ] `review-gate` aprovado pelos quatro revisores (sem Crítico ou Alto).
- [ ] Nenhuma dependência nova sem registro em `docs/dependencias.md`; `npm audit` sem alto ou crítico.
- [ ] Queries novas com `EXPLAIN` revisado; metas de performance respeitadas.
- [ ] OpenAPI, `README`, `.env.example` e `CHANGELOG.md` atualizados.

## 14. Proibições

- Código de produção sem teste falhando antes.
- `any`, `@ts-ignore` sem justificativa escrita, `$queryRawUnsafe`/`$executeRawUnsafe`, `eval`, `new Function`.
- Instalar pacote sem o protocolo da seção 5, ou versões com `^`/`~`.
- Guardar senha ou token em texto puro; logar dados sensíveis.
- Inventar regra de negócio fora da especificação.
- Commits gigantes ou que misturam assuntos.
- Desativar testes, regras de lint ou checagens de segurança para "passar".

## 15. Decisões ainda em aberto (pergunte antes de assumir)

Estão no fim de `docs/especificacao.md`. Para o backend, as mais importantes:
- **Hospedagem e domínio:** onde a API vai rodar e se fica no mesmo domínio do site.
- **Serviço de e-mail** e remetente. Até decidir, use a interface `EmailSender` + Mailpit.
- **Regras de segurança:** confirmar 5 tentativas / 15 min, sessão de 8 h / 30 dias, convite de 7 dias, link de senha de 1 h. Deixe tudo configurável por variável de ambiente.
- **Storage das fotos:** disco do servidor ou serviço de objetos. Use a interface `Storage` com implementação local primeiro.
- **Permissão de exclusão:** se o Editor pode excluir produtos.

## 16. Primeira ação

1. Leia `docs/especificacao.md` inteira.
2. Liste em até 15 linhas o que entendeu, as dúvidas e as decisões em aberto que bloqueiam a Fase 0 e a Fase 1.
3. Proponha a lista de dependências da Fase 0 **já verificadas pelo protocolo da seção 5**, com versão exata, idade da versão e resultado do audit.
4. Crie `CLAUDE.md`, os agentes (seção 8), as skills (seção 9) e a spec `specs/000-fundacao/`.
5. **Pare e espere minha aprovação** antes de instalar qualquer coisa ou escrever código de produção.
