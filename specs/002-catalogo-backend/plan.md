# Plano 002: Backend do catálogo de produtos

- **Spec:** [spec.md](./spec.md)
- **Status:** Rascunho, revisado pelos agentes de backend, SEO e segurança (2026-11-11). **Ajustado em 2026-11-11 pelo plano 003:** aplicação e especificações viram texto formatado no produto (saem as tabelas Aplicacao, Especificacao e AtributoSugerido); montadoras em ProdutoMarca (papel MONTADORA); regras e Prisma passam a morar em `packages/catalogo-dominio`, compartilhado com o painel; a hospedagem passa a ser a VPS Hostinger. **Pausado** pelo responsável em 2026-11-11 até confirmar o acesso à **VPS da Hostinger**.
- **Ao retomar:** trocar a hospedagem do §2.4 (Neon/Vercel/Blob) por **VPS Hostinger** (PostgreSQL, API e imagens em Docker, HTTPS, backup diário fora da VPS, firewall e SSH por chave, monitoramento e deploy). Pendentes de resposta: link do produto na mensagem do WhatsApp; mudança do CA6.4 na spec (dados estruturados sem `Product`); exceção ao TDD para os scripts Python da extração.

> O plano descreve **COMO**. Stack definida pelo responsável: **TypeScript, Node, Prisma e PostgreSQL**.

## 1. Portões da constituição

| Artigo | Atende? | Observação |
|---|---|---|
| II: Testes primeiro | ✅ | Toda lógica (importação, normalização, busca, SEO, sigilo, API) nasce de teste vermelho. Exceção: a ferramenta de extração do PDF em Python (§9). |
| III: Testes como o Google | ✅ | Comportamento pela API HTTP e pelas funções exportadas; PostgreSQL **real** nos testes médios (sem mock de Prisma); mocks só para relógio, armazenamento de imagens e revalidação do site. Pirâmide ≈ 70/20/10 (§6). |
| IV: Simplicidade | ✅ | Um serviço, um banco, busca no próprio PostgreSQL, importação por linha de comando. O domínio não depende do framework HTTP (§9). |
| V: SEO | ✅ | O backend fornece endereço estável (com histórico e 301), título e descrição dentro dos limites, `alt`, trilha de navegação, dados estruturados **válidos sem preço**, sitemap com imagens e `lastmod` real, sinal de indexação por produto, categoria e combinação de filtros, e gatilho de revalidação (§5). |
| VI: Fonte única de dados | ✅ | NAP continua só em `frontend/src/lib/site.ts`. O backend recebe cidade/UF para os textos de SEO por configuração. |
| VII: Segurança e LGPD | ✅ | Dados internos em **tabelas separadas**, que o usuário de banco da API pública **não pode ler**; serializador por lista de permitidos; varredura de vazamento sobre o banco inteiro; API privada (só o servidor do site chama); rota interna com chave forte, limites e registro sem dados de clientes (§4.4). |
| VIII: Acessibilidade | ✅ | Toda imagem sai com `alt` (CA6.5). O resto é do frontend. |
| IX: Fidelidade ao design | n/a | Sem interface nesta spec. |

## 2. Abordagem técnica

### 2.1 Arquitetura
- **API privada**, chamada **só pelo servidor do site** (Next.js na Vercel, nas páginas com ISR e no sitemap), com **token de serviço** (variável de ambiente sem `NEXT_PUBLIC_`). O navegador nunca chama a API diretamente, então não há CORS. O limite de requisições por visitante fica no Next. A busca digitada pelo cliente passa por uma rota do próprio site.
- **Camadas:** domínio e consultas (funções puras + repositórios Prisma) **independentes do framework**, com **Fastify** como camada HTTP fina. Assim, se a hospedagem escolhida for a Vercel, a mesma lógica roda como função, sem reescrita.
- **Fastify + Zod:** validação por schema e tipos gerados dos mesmos schemas. Os **schemas de resposta são exportados como contrato** (pacote `@falcao/contrato-catalogo`), usado pelo frontend. OpenAPI gerado (`@fastify/swagger`) para os dois consumidores (site e equipe).
- **Prisma 7 com `@prisma/adapter-pg`**, sem motor binário (evita o erro `EPERM` do OneDrive). Cliente gerado em pasta ignorada pelo Git. `directUrl` sem pooler para migrações e importação.
- **Rotas de apoio:** `/saude`, log estruturado (pino) **sem dados sensíveis** (cabeçalho `authorization` ocultado, corpos de resposta nunca registrados) e tratador de erros que **nunca** repassa mensagens do Zod ou do Prisma (o erro P2002, por exemplo, cita o nome da coluna).

### 2.2 Busca (PostgreSQL)
- Extensões `unaccent` e `pg_trgm`, mais uma configuração de busca **`portuguese_unaccent`**.
- A coluna `buscaTexto` (tsvector) é **preenchida pela aplicação** com uma função testada, `recalcularBusca(produtoId)`, chamada na mesma transação de qualquer alteração. Como `unaccent` não é IMMUTABLE e a busca junta dados de outras tabelas, uma coluna gerada pelo banco não serve.
  - **Peso A:** nome por extenso, em `portuguese_unaccent`.
  - **Peso B:** marcas, montadoras e categoria.
  - **Peso C:** nome do catálogo (abreviado) e referências, em configuração `simple`, sem radicalização, que estragaria códigos e abreviações.
- Uma coluna `buscaCodigos` (referências normalizadas) com índice **GIN trigram**, para busca parcial de referência (CA3.2, CA3.6) e sugestões (CA3.5).
- **Códigos internos e imposto nunca entram** nessas colunas (CA3.4).
- A consulta usa `websearch_to_tsquery`, sempre com `Prisma.sql` (template), e **nunca** `$queryRawUnsafe` ou `Prisma.raw`, bloqueados por regra de ESLint. `ORDER BY` só a partir de lista fechada, e `LIKE` com `%` e `_` escapados.
- **Limites:** `q` até 100 caracteres; `pagina` até 200; `porPagina` até 48; até 10 itens em cada filtro múltiplo; `statement_timeout` de 2 s.

### 2.3 Importação (CLI, carga inicial)
`npm run importar -w backend -- --origem <pasta>` lê o conjunto extraído (`produtos.json`, `fotos/`, `logos/`). Como a importação é **só a carga inicial** (E2), ela **apaga e recria** as tabelas do catálogo (preservando `SlugAntigo` e `ChaveApi`) com `createMany`, numa transação com tempo limite maior. Antes de tudo, há uma **trava**: a importação se recusa a rodar se existir produto de origem `CADASTRO` ou produto importado que tenha sido editado (CA1.7).

Etapas, cada uma uma função pura com teste:
1. **Unir repetidos (E1):** cards que compartilham código interno viram um produto (componentes conectados). Cada card de origem fica registrado em `CardOrigem` (página, ordem, categoria, texto original). A **chave estável** do produto é o menor código interno do grupo ou, sem código, `página + ordem`.
2. **Ordem determinística:** os produtos são processados pela ordem do PDF (CA1.8), o que torna slugs e sufixos reproduzíveis (CA1.5).
3. **Nome por extenso (R3):** dicionário de abreviações versionado. O nome do catálogo é guardado **já sem "IMP (x)"**, e o texto bruto vai só para `CardOrigem`.
4. **Importados (R6):** `IMP (6,5)` → `importado = true` e `VariacaoInterna.imposto = 6.50`.
5. **Referências (R7):** código, **marca** (pelo rótulo, como "REF SILC" ou "Orig. Mercedes") e **tipo**, mais a forma normalizada. Se uma referência for **igual a um código interno**, ela gera **alerta** no relatório e não é publicada até revisão, porque a busca acharia o código interno por tabela.
6. **Aplicação e especificações:** os trechos reconhecidos viram **texto formatado** no produto (listas e negrito), e as montadoras citadas viram `ProdutoMarca` (MONTADORA). O que sobrar vira **pendência** (CA1.4).
7. **Lançamentos (R5):** `novo = true` e a categoria da peça (a mesma peça em outra página ou palavras-chave do nome). Sem categoria segura, o produto fica marcado para revisão.
8. **SEO** (§5): slug, título, descrição, `alt` e indexável.
9. **Imagens:** enviadas **fora da transação**, com nome legível mais um hash curto, sem reenviar o que já existe. Órfãos são tolerados.
10. **Verificação de sigilo sobre o banco inteiro:** nenhum texto público (nome, nome do catálogo, observações, referência, slug, `alt`, nome de arquivo, título, descrição) pode conter um código interno ou um valor de imposto. Se aparecer, a importação **falha** (CA4.2).
11. **Relatório (CA1.6)** em JSON e Markdown: cards, produtos, cards unidos, variações, referências, sem foto, a revisar, pendências e alertas. Como ele lista códigos internos, fica em pasta **fora do Git** (`.gitignore`).

### 2.4 Hospedagem (recomendação revisada; decisão do responsável)
- **Recomendado:** **Neon** (PostgreSQL, região São Paulo) + **função na Vercel** (região `gru1`), no mesmo projeto do site. É mais barato, tem um deploy só e fica perto do banco.
- **Alternativa:** Railway ou Render, se o painel de cadastro futuro precisar de processo sempre ligado. O plano gratuito do Render "dorme" e atrapalha o ISR.
- **Imagens:** **Vercel Blob** (recomendado, junto do resto na Vercel) ou Cloudflare R2. Listagem pública do armazenamento desligada; chave de escrita só na CLI de importação.

## 3. Arquivos afetados

| Arquivo | Ação | Motivo |
|---|---|---|
| `package.json` (raiz) | alterar | Workspaces `backend` e `packages/contrato-catalogo`; incluí-los em `lint`, `typecheck`, `test`, `build` e `check` |
| `.github/workflows/ci.yml` | alterar | Serviço PostgreSQL para os testes do backend; `npm audit --omit=dev` |
| `.gitignore`, `.prettierignore` | alterar | Ignorar o cliente Prisma gerado, os relatórios de importação e `docs/design/**` |
| `packages/contrato-catalogo/` | criar | Schemas Zod e tipos das respostas públicas, compartilhados com o frontend |
| `backend/package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs` | criar | Pacote do backend (ESLint proíbe `$queryRawUnsafe` e `Prisma.raw`) |
| `backend/.env.example` | criar | `DATABASE_URL`, `DIRECT_URL`, `DATABASE_URL_INTERNO`, `TOKEN_SERVICO_SITE`, `URL_REVALIDACAO_SITE`, `SEGREDO_REVALIDACAO`, `ARMAZENAMENTO_*`, `CIDADE_UF_SEO` |
| `backend/docker-compose.yml` | criar | PostgreSQL de desenvolvimento e teste em **volume nomeado** (fora do OneDrive), na mesma versão maior do Neon |
| `backend/prisma/schema.prisma` + `migrations/` | criar | Modelo (§4), extensões, índices GIN, índice único parcial e papéis de banco (SQL na migração) |
| `backend/src/config/ambiente.ts` | criar | Variáveis de ambiente validadas com Zod |
| `backend/src/app.ts`, `src/servidor.ts`, `api/index.ts` | criar | Fastify (camada fina) e entrada como função na Vercel |
| `backend/src/catalogo/` | criar | Consultas públicas, filtros com contagem, serializador público e rotas |
| `backend/src/busca/` | criar | Normalização, `recalcularBusca`, consulta de busca e sugestões |
| `backend/src/seo/` | criar | Slug, títulos, descrições, `alt`, indexável, trilha, JSON-LD, sitemap e `lastmod` |
| `backend/src/interno/` | criar | Rota interna, autenticação por chave, limites e registro |
| `backend/src/revalidacao/` | criar | Aviso ao site para revalidar páginas alteradas |
| `backend/src/importacao/` + `dicionarios/` | criar | CLI, etapas puras e dados versionados (abreviações, montadoras, rótulos de referência, grupos e categorias) |
| `backend/tests/` | criar | Fixture (~30 cards reais), setup com schema por worker, testes médios e grandes |
| `backend/tools/extracao-pdf/` | criar | Scripts Python da extração, com versões das dependências fixadas, só para registro (§9) |
| `backend/README.md` | criar | Como rodar, importar, testar e criar chaves internas |

O frontend não muda nesta spec. Ele vai consumir o contrato na spec do frontend do catálogo.

## 4. Modelo de dados e contratos

### 4.1 Tabelas públicas (lidas pela API pública)

| Tabela | Campos principais |
|---|---|
| **Grupo** | id, nome, slug ‹único›, ordem, descricao, seoTitulo, seoDescricao, indexavel, atualizadoEm |
| **Categoria** | id, grupoId, nome, slug ‹único›, ordem, descricao, modeloEspecificacoes (texto formatado), seoTitulo, seoDescricao, indexavel, atualizadoEm · índice (grupoId, ordem) |
| **Produto** | id, chaveImportacao ‹única›, slug ‹único›, nome, nomeCatalogo (limpo), **aplicacao**, **especificacoes**, **observacoes** (texto formatado, fonte única: spec 002 R8 e CA7.3), embalagem, status (RASCUNHO, PUBLICADO, INATIVO), origem (PDF, CADASTRO), novo, indexavel, revisarNome, seoTitulo, seoDescricao, hashPublico, buscaTexto, buscaCodigos, criadoEm, atualizadoEm, editadoManualmente · índices (status, indexavel), GIN em buscaTexto e trigram em buscaCodigos |
| **ProdutoCategoria** | PK (produtoId, categoriaId), ordem, principal · índice único parcial: um `principal` por produto · índice (categoriaId, ordem) |
| **Variacao** | id, produtoId, descricao, nomeCatalogo (limpo), importado, ordem |
| **Marca** | id, nome ‹único›, slug ‹único›, tipo (FABRICANTE, MONTADORA, IMPLEMENTO), logoUrl |
| **ProdutoMarca** | PK (produtoId, marcaId, papel), papel (FABRICANTE, LOGO, MONTADORA) |
| **Referencia** | id, produtoId, variacaoId?, marcaId?, tipo (ORIGINAL, SIMILAR, EQUIVALENTE, FABRICANTE), codigo, codigoNormalizado ‹índice›, publicada |
| **Imagem** | id, produtoId, url, alt, largura, altura, ordem |
| **SlugAntigo** | slug + tipo (PRODUTO, CATEGORIA, GRUPO) ‹único›, entidadeId, criadoEm. Um slug novo nunca pode coincidir com um antigo, e o 301 sempre aponta para o endereço final, sem cadeias |

### 4.2 Tabelas internas (**sem permissão de leitura** para o usuário de banco da API pública)

| Tabela | Campos |
|---|---|
| **VariacaoInterna** | variacaoId (1:1), **codigoInterno ‹único›**, **imposto** Decimal(5,2) |
| **CardOrigem** | id, produtoId, pagina, ordem, categoriaId, textoOriginal |
| **Pendencia** | id, produtoId, trecho, tipo, criadoEm |
| **ChaveApi** | id, nome, hashSha256, criadaEm, expiraEm, revogadaEm, ultimoUso |
| **RegistroConsulta** | id, chaveApiId, produtosRetornados (ids), criadoEm. **Não guarda o termo digitado**, que pode conter nome ou telefone de cliente colado do WhatsApp. Retenção de 90 dias com expurgo |

**Dois usuários de banco:** `catalogo_publico`, que só tem `SELECT` nas tabelas públicas, e `catalogo_interno`, para a rota interna e a importação. Um `include` esquecido no código público vira **erro de permissão**, e não vazamento.

### 4.3 API pública (privada à rede; só o servidor do site, com `Authorization: Bearer <TOKEN_SERVICO_SITE>`)

| Rota | Retorna |
|---|---|
| `GET /v1/grupos` | Grupos e categorias com slug, textos, SEO, `indexavel` e contagem |
| `GET /v1/categorias/:slug` | Categoria com grupo, textos, SEO, trilha e `indexavel` |
| `GET /v1/produtos` | Lista paginada (`q`, `grupo`, `categoria`, `marca[]`, `montadora[]`, `importado`, `novo`, `comReferencia`, `pagina`, `porPagina`, `ordem` ∈ {relevancia, nome}): `total`, `pagina`, `itens[]`, `filtros` (opções com contagem, CA2.3), `seo` da combinação (`indexavel`, `canonical`; §5) e `sugestoes[]` quando vazia (CA3.5) |
| `GET /v1/produtos/:slug` | Detalhe completo (CA4.1), `seo` (título, descrição, `indexavel`, canonical, trilha com nomes e URLs, JSON-LD, imagem de Open Graph com largura e altura) e `whatsapp`. Slug antigo: **200 `{ movidoPara }`**, para o `fetch` não seguir o redirecionamento sozinho; o site responde 301. Inativo: **410** (`{ removido, categoria }`). Inexistente: 404 |
| `GET /v1/produtos/:slug/relacionados` | Até 8 produtos **indexáveis** da mesma categoria, priorizando a mesma montadora (CA6.11) |
| `GET /v1/marcas` | Marcas com tipo, logo e contagem |
| `GET /v1/sitemap` | Índice com seções `produtos` e `categorias-grupos`. Cada URL indexável traz `lastmod` e as URLs das imagens (CA6.6) |
| `GET /saude` | Situação do serviço e do banco (sem dados) |

Toda resposta pública passa pelo **serializador de campos permitidos**. A API envia `Cache-Control` explícito, aceita só `GET` e tem `bodyLimit` baixo.

### 4.4 API interna

| Rota | Regras |
|---|---|
| `GET /v1/interno/produtos?q=` | Busca por nome ou referência e devolve produtos **com** os códigos internos (CA5.1). Chave aleatória de 32 bytes, guardada como **SHA-256**, com expiração, revogação e `ultimoUso` (fonte única: a tabela `ChaveApi`). Mesma resposta **401** para chave ausente ou inválida, sem dados (CA5.2). Limite de 30 req/min por chave e de 5 falhas/min por IP. `q` com pelo menos 3 caracteres e no máximo 20 resultados, para impedir a extração em massa dos códigos. Registra a consulta (§4.2). Usa o usuário de banco `catalogo_interno` |

Chaves são criadas pela CLI (`npm run chave:criar -w backend -- --nome "Comercial 1"`), que mostra a chave uma única vez.

### 4.5 Revalidação do site
Quando a importação (e, no futuro, o cadastro) altera um produto, categoria ou grupo, o backend chama a rota de revalidação do site (`URL_REVALIDACAO_SITE`, com `SEGREDO_REVALIDACAO`), informando os endereços afetados. Assim, as páginas ISR se atualizam sem esperar o prazo.

## 5. SEO no backend (detalhe da H6)

- **Endereços planos**, sem a categoria no caminho, porque um produto pode estar em várias categorias:
  - produto: `/catalogo/produto/<slug>`;
  - categoria: `/catalogo/<slug-da-categoria>`;
  - grupo: `/catalogo/grupo/<slug-do-grupo>`.
  O canonical do produto é sempre a própria URL, e `principal` só define a trilha de navegação.
- **Slug:** ASCII minúsculo com hífens, até cerca de 70 caracteres, cortado em fim de palavra, a partir do nome por extenso. Em colisão, o sufixo segue a ordem marca → medida → referência normalizada. **Nunca** um número sequencial nem o código interno. Um slug existente nunca é regenerado.
- **Título:** até **37 caracteres** (o layout do site acrescenta " | Falcão Distribuidora", cerca de 23), com nome e marca ou montadora principal. "Feira de Santana – BA" vai na **descrição** (≤ 155), junto de referências, aplicações e "linha pesada". Os **~78% sem referência** recebem descrições variadas a partir de aplicação, especificação e categoria, e não um texto de modelo repetido. A unicidade é verificada no conjunto inteiro.
- **Dados estruturados:** **sem `Product`**. O Google exige preço ou avaliação nesse tipo, e não há preço; o site já teve esse erro em "Snippets do produto". Por isso entram **`BreadcrumbList`** e **`ItemPage`** (nome, descrição, imagem). Referências, marca e aplicações ficam como **texto visível** (CA6.3). Os campos estruturados (marca, referências como `identifier`/`PropertyValue`) continuam disponíveis na API para quando houver preço. O JSON-LD é entregue pronto; o frontend escapa `<` ao inserir. ⚠️ **Isso pede ajuste no texto do CA6.4 da spec** (§8).
- **Indexável (CA6.10):** um produto é indexável quando o nome está confirmado, tem **pelo menos dois sinais** entre foto, referência, aplicação e especificação, e título e descrição são únicos no catálogo. Produtos quase iguais sem diferença no título ficam fora do índice, com o mais forte mantido. Categoria ou grupo vazio ou com menos de 3 produtos indexáveis fica fora do índice.
- **Listas (paginação e filtros):** as páginas 2 em diante são indexáveis, com canonical para elas mesmas. Qualquer combinação com `q`, filtros, `ordem` ou `porPagina` sai como `noindex, follow`, com canonical para a categoria. A API devolve isso pronto em `seo`.
- **`lastmod` real:** `hashPublico` do conteúdo público. `atualizadoEm` só muda quando o hash muda. O `lastmod` da categoria é o maior entre ela e seus produtos.
- **Imagens:** `alt` gerado de nome e marca, nome de arquivo legível, imagem de Open Graph com largura e altura.

## 6. Estratégia de testes

**Vitest**, como no frontend. PostgreSQL real em Docker (volume nomeado, fora do OneDrive). No CI, serviço do GitHub Actions. Cada worker do Vitest usa **um schema próprio** (`VITEST_POOL_ID`, com `migrate deploy` no `globalSetup`). Os testes **só rodam** se o nome do banco terminar em `_teste`, para nunca apagar dados reais. A fixture tem **~30 cards reais** cobrindo: lista com medidas, repetido em duas categorias, importado com imposto, SILC, lançamento, sem foto, com pendência e referência igual a código interno.

| Critério | Teste | Tamanho | Arquivo |
|---|---|---|---|
| CA1.1 | "todo código interno importado e cada card mapeado a um produto (CardOrigem)" | grande | `tests/importacao.test.ts` |
| CA1.2 | "card com várias medidas vira um produto com uma variação por código" | pequeno | `importacao/agrupar.test.ts` |
| CA1.3 | "separa referência, aplicação, especificação, marca e imagem" | pequeno | `importacao/classificar.test.ts` |
| CA1.4 | "trecho não reconhecido vira pendência ligada ao produto" | pequeno | `importacao/classificar.test.ts` |
| CA1.5 | "importar duas vezes gera o mesmo banco, com slugs iguais" | grande | `tests/importacao.test.ts` |
| CA1.6 | "relatório com contagens, sem foto, a revisar, pendências e alertas" | médio | `tests/importacao.test.ts` |
| CA1.7 | "importação recusa banco com produto do cadastro ou importado editado" | médio | `tests/importacao.test.ts` |
| CA1.8 | "categorias e produtos mantêm a ordem do PDF" | médio | `tests/importacao.test.ts` |
| CA2.1 | "lista paginada traz total, página e campos do card" | médio | `tests/api-produtos.test.ts` |
| CA2.2 | "filtros combinados retornam só o que atende a todos" | médio | `tests/api-produtos.test.ts` |
| CA2.3 | "cada opção de filtro informa quantos sobrariam" | médio | `tests/api-produtos.test.ts` |
| CA2.4 | "rascunho e inativo nunca aparecem na lista" | médio | `tests/api-produtos.test.ts` |
| CA3.1 | "busca sem acento e sem caixa acha 'catraca scania'" | médio | `tests/api-busca.test.ts` |
| CA3.2 | "referência com ou sem pontuação acha o produto" | pequeno + médio | `busca/normalizar.test.ts`, `tests/api-busca.test.ts` |
| CA3.3 | "termo abreviado do PDF acha o produto" | médio | `tests/api-busca.test.ts` |
| CA3.4 | "código interno não encontra nada na busca pública" | médio | `tests/api-busca.test.ts` |
| CA3.5 | "busca vazia devolve sugestões" | médio | `tests/api-busca.test.ts` |
| CA3.6 | "SILC por marca, filtro e código SC-03.158/SC03158" | médio | `tests/api-busca.test.ts` |
| CA4.1 | "detalhe traz variações, referências, aplicações, especificações e fotos" | médio | `tests/api-detalhe.test.ts` |
| CA4.2 | "nenhuma resposta pública contém código interno, imposto ou dado de controle" | pequeno + médio + grande | `catalogo/serializar.test.ts`, `tests/api-vazamento.test.ts`, `importacao/sigilo.test.ts` (varredura do banco) |
| CA4.2 | "usuário de banco público não lê tabelas internas" | médio | `tests/permissoes-banco.test.ts` |
| CA4.3 | "WhatsApp com nome, variação e referência, sem código interno" | pequeno | `catalogo/whatsapp.test.ts` |
| CA4.4 | "404 inexistente, 410 inativo, movidoPara para slug antigo" | médio | `tests/api-detalhe.test.ts` |
| CA4.5 | "IMP (6,5) vira importado, sai do nome e do nome do catálogo, e 6,5 não aparece" | pequeno + médio | `importacao/importados.test.ts`, `tests/api-vazamento.test.ts` |
| CA5.1 | "consulta interna por nome ou referência traz códigos internos" | médio | `tests/api-interno.test.ts` |
| CA5.2 | "sem chave, chave inválida, expirada ou revogada: mesmo 401 e nada revelado" | médio | `tests/api-interno.test.ts` |
| CA5.x | "q curto recusado, máximo 20 resultados, limite por chave, registro sem o termo" | médio | `tests/api-interno.test.ts` |
| CA6.1 | "slug legível, ≤ 70, único, sem código interno, sufixo determinístico" | pequeno | `seo/slug.test.ts` |
| CA6.2 | "título ≤ 37 e descrição ≤ 155, únicos no conjunto, com Feira de Santana na descrição" | pequeno + grande | `seo/textos.test.ts`, `tests/importacao.test.ts` |
| CA6.3 | "referências saem como texto no detalhe" | médio | `tests/api-detalhe.test.ts` |
| CA6.4 | "JSON-LD só com BreadcrumbList e ItemPage válidos, sem Product e sem código interno" | pequeno | `seo/dados-estruturados.test.ts` |
| CA6.5 | "toda imagem tem alt e nome de arquivo legível" | pequeno | `importacao/imagens.test.ts` |
| CA6.6 | "sitemap: índice, só indexáveis, lastmod real e URLs de imagem" | médio | `tests/api-sitemap.test.ts` |
| CA6.7 | "cards com o mesmo código viram um produto em várias categorias, com uma principal" | pequeno | `importacao/agrupar.test.ts` |
| CA6.8 | "renomear grava o slug antigo; o novo nunca coincide com um antigo; sem cadeias" | médio | `tests/api-detalhe.test.ts` |
| CA6.9 | "categoria e grupo têm texto de apresentação" | pequeno | `seo/textos.test.ts` |
| CA6.10 | "regra de indexável (nome, 2 sinais, unicidade) e combinações de filtro em noindex" | pequeno + médio | `seo/indexavel.test.ts`, `tests/api-produtos.test.ts` |
| CA6.11 | "relacionados só indexáveis, da mesma categoria, priorizando a montadora" | médio | `tests/api-detalhe.test.ts` |
| CA7.1 | "produto tem situação, datas e origem" | médio | `tests/modelo.test.ts` |
| CA7.2 | "categoria nova ganha busca, filtro e SEO" | médio | `tests/modelo.test.ts` |
| CA7.3 | "aplicação e especificações em texto formatado; modelo de especificações por categoria" | médio | `tests/modelo.test.ts` |
| Segurança | "erro não expõe mensagem do Prisma/Zod; log oculta authorization; SQL só por template" | pequeno + médio | `tests/erros-e-logs.test.ts` |
| Revalidação | "alteração de produto avisa o site com os endereços afetados" | pequeno | `revalidacao/avisar.test.ts` |
| RNF desempenho | "lista e busca p95 < 300 ms; detalhe p95 < 150 ms com o catálogo completo" | grande | `tests/desempenho.test.ts` (sob demanda) |

Distribuição prevista: cerca de 65 testes pequenos, 22 médios e 7 grandes, próxima de 70/20/10.

## 7. Riscos e mitigação

- **Vazamento de dado interno:** tabelas internas sem permissão para o usuário público, serializador por lista de permitidos, varredura sobre o banco inteiro na importação e testes de vazamento nas respostas reais.
- **Qualidade da extração (~1.950 nomes a revisar):** importar com `revisarNome` e fora do índice (CA6.10), mais o relatório para revisão.
- **Reconhecimento de aplicações e especificações:** o que não for reconhecido vira pendência (CA1.4). A precisão é medida na fixture.
- **Categoria dos lançamentos:** sem categoria segura, o produto fica marcado para revisão, sem chute silencioso.
- **Windows/OneDrive:** Prisma sem binário, cliente gerado fora do OneDrive e banco em volume Docker. Sem Docker, um banco na nuvem com nome terminado em `_teste`.
- **Fotos de baixa resolução:** fora do escopo; o modelo aceita várias imagens por produto.

## 8. Mudança proposta na spec (precisa de aprovação)

**CA6.4 (dados estruturados):** trocar "dados para descrevê-lo como **produto**" por "dados estruturados **válidos sem preço** (trilha de navegação e página do item), com marca, referências e aplicações como **texto visível**; os dados de produto completos ficam prontos para quando houver preço". Motivo: o Google exige preço ou avaliação no tipo "Produto", e o site já teve esse erro.

Ajustes que não mudam a spec, só detalham critérios:
- **CA4.4:** produto **inativo** responde "removido" (410), em vez de "não encontrado".
- **LGPD:** o registro de consultas guarda **quem** consultou e **quais produtos** voltaram, nunca o texto digitado.

## 9. Complexidade justificada

- **Serviço separado do Next (Fastify), em vez de só Route Handlers:** é escolha de stack do responsável, que pediu backend em Node. O custo é contido assim: domínio independente do framework, Fastify como camada fina e implantação recomendada como função na mesma Vercel.
- **Ferramenta de extração em Python sem TDD (exceção ao Art. II):** é uma ferramenta de migração de **uso único**, já executada, versionada só para registro e reprodução em `backend/tools/extracao-pdf/`, fora do runtime e do CI. Toda a lógica que roda no sistema segue TDD. Reescrevê-la em TypeScript com testes refaria o trabalho de OCR sem benefício. **Requer aprovação do responsável.**
- **SQL bruto na busca:** o Prisma não modela `tsvector` nem `pg_trgm`. A consulta fica isolada no módulo `busca`, só por template (`Prisma.sql`) e coberta por testes médios.
- **Dois usuários de banco e tabelas internas separadas:** são mais complexos que um único usuário, mas são a garantia estrutural do requisito mais crítico (R2). A alternativa, depender só do código, foi rejeitada pela revisão de segurança.
