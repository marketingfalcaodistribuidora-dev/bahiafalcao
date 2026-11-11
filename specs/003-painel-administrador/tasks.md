# Tarefas 003: Painel do administrador (etapa 1) e orçamentos (spec 004)

- **Plano:** [plan.md](./plan.md) · **Specs:** [003](./spec.md) e [004](../004-orcamentos/spec.md) · **Base:** [plano 002](../002-catalogo-backend/plan.md)
- **Status:** Em implementação: etapa 1 concluída (T001–T050, 2026-11-12); próxima: etapa 2 (T051)

> Regras:
> - Cada tarefa é pequena (até ~30 min) e termina com os testes verdes.
> - **O teste vem antes do código**: toda tarefa de implementação é precedida pela tarefa do teste que falha.
> - `[P]` marca tarefas independentes que podem ser feitas em paralelo.
> - Marque `[x]` ao concluir e anote desvios.
>
> Convenções desta lista:
> - **Pequeno** = função pura, sem banco. **Médio** = PostgreSQL real em Docker (porta **5433**, banco terminado em `_teste`, um schema por worker). **Grande** = Playwright ou importação completa.
> - Caminhos abreviados: `dom/` = `packages/catalogo-dominio/`, `adm/` = `admin/`.
> - **O repositório é público:** testes e fixtures usam só dados fictícios (códigos `EX-0001…`, imposto `5,00`). Dados reais ficam fora do Git.
> - Cada etapa termina com `npm run check` verde e as telas conferidas com `docs/design/03-painel-administrador/Painel.html`.

---

## Etapa 1: Fundação

### Preparação
- [x] T001 Workspaces na raiz (`admin`, `packages/*`) e scripts `lint`, `typecheck`, `test`, `build` e `check` cobrindo todos; atualizar a seção "Estrutura" do `CLAUDE.md` (`admin/`, `packages/`)
- [x] T002 `infra/dev/docker-compose.yml`: PostgreSQL 17 na porta 5433, **volume nomeado** (fora do OneDrive), bancos `falcao_dev` e `falcao_teste`; scripts `db:subir` e `db:descer`
- [x] T003 `dom/`: `package.json`, `tsconfig.json`, `vitest.config.ts` (projetos pequeno e médio), ESLint proibindo `$queryRawUnsafe` e `Prisma.raw`
- [x] T004 Prisma 7 com `@prisma/adapter-pg`, cliente gerado em pasta ignorada; `dom/.env.example` (`DATABASE_URL_MIGRACOES`, `DATABASE_URL_PAINEL`, `DATABASE_URL_PUBLICO`, `DATABASE_URL_TESTE`); `.gitignore` (cliente gerado, relatórios de importação)
- [x] T005 Setup dos testes médios: `globalSetup` com `migrate deploy` por schema de worker e **recusa** de banco sem sufixo `_teste`
- [x] T006 [P] `packages/texto-formatado/`: pacote base (tsconfig, vitest)
- [x] T007 [P] gitleaks no hook `pre-push` e no CI; lembrete ao responsável para ligar *secret scanning* e *push protection* no GitHub

### Texto formatado (R9 da 003, R8 da 002)
- [x] T008 Teste pequeno: `**negrito**`, listas `- ` e subtítulos `## ` viram HTML; `<script>`, `<img onerror>`, `[x](javascript:)` e todo o resto saem **escapados**; quebras de linha preservadas
- [x] T009 Implementar `formatar()` até T008 passar

### Modelo e banco
- [x] T010 Teste médio `modelo`: produto com situação, datas e origem; categoria com `modeloEspecificacoes`; `ProdutoMarca` com papel `MONTADORA`; variação com `excluidaEm`; um único `principal` por produto; item de orçamento único por (orçamento, variação) (002 CA7.1–7.3)
- [x] T011 `schema.prisma` + migração inicial: tabelas públicas (002 §4.1 ajustado), internas (002 §4.2) e novas (003 §5); `unaccent`, `pg_trgm`, configuração `portuguese_unaccent`, `SEQUENCE` do orçamento, índices GIN e trigram
- [x] T012 Teste médio `permissoes-banco`: o papel público **não lê nenhuma** das tabelas internas (lista completa do plano 003 §3) e não grava em nada; tabela criada depois **não** fica visível ao público
- [x] T013 SQL dos papéis `catalogo_migracoes`, `catalogo_painel` e `catalogo_publico` com `ALTER DEFAULT PRIVILEGES`, aplicado pelo setup de testes e pelo compose

### Permissões e sigilo
- [x] T014 Teste pequeno: Administrador tem todas as permissões por definição; `pode(perfil, permissao)` para perfis comuns
- [x] T015 Implementar `permissoes.ts`
- [x] T016 Teste pequeno: `exigirPermissao()` lança `SemSessao` ou `SemPermissao` (erros tipados)
- [x] T017 Implementar `exigirPermissao()`
- [x] T018 Teste pequeno serializador do painel: sem `ver_codigo_interno`, `ver_imposto` ou `ver_localizacao`, os campos **não existem** na saída (nem mascarados); campo novo no modelo não sai por padrão (CA12.9)
- [x] T019 Implementar `serializarProdutoPainel()` por lista de permitidos
- [x] T020 Teste pequeno serializador público: nunca código interno, imposto, localização, pendências ou origem do card (002 CA4.2)
- [x] T021 Implementar `serializarProdutoPublico()`

### Histórico
- [x] T022 Teste médio: alterar um produto grava `Alteracao` (quem, entidade, versão, antes e depois) **na mesma transação**; se a alteração falha, nada é gravado
- [x] T023 Implementar `registrarAlteracao()`

### Busca e SEO mínimos (usados pela importação e pelo CA4.10)
- [x] T024 [P] Teste pequeno: `SC-03.158`, `SC03158` e `sc 03 158` normalizam igual (002 CA3.2)
- [x] T025 Implementar `normalizarCodigo()`
- [x] T026 Teste médio `recalcularBusca()`: pesos A/B/C; código interno e imposto **nunca** entram em `buscaTexto` ou `buscaCodigos` (002 CA3.4)
- [x] T027 Implementar `recalcularBusca()`
- [x] T028 [P] Teste pequeno slug: ASCII, ≤ 70, corte em fim de palavra, sufixo determinístico, sem código interno (002 CA6.1)
- [x] T029 Implementar `gerarSlug()`
- [x] T030 [P] Teste pequeno título ≤ 37 e descrição ≤ 155 com Feira de Santana (002 CA6.2)
- [x] T031 Implementar `gerarTextosSeo()`
- [x] T032 [P] Teste pequeno `indexavel()`: nome confirmado + 2 sinais (foto, referência, aplicação, especificações) e os **motivos em texto claro** ("nome a confirmar", "falta foto ou referência") (002 CA6.10, 003 CA4.10)
- [x] T033 Implementar `indexavel()`

### Importação do catálogo (002 §2.3)
- [x] T034 Fixture **anonimizada** com ~30 cards (lista de medidas, repetido em 2 categorias, importado, SILC, lançamento, sem foto, com pendência, referência igual a código interno) + teste que falha se a fixture tiver número de 6 a 9 dígitos
- [x] T035 Teste pequeno `agrupar`: card com várias medidas = 1 produto com 1 variação por código; cards com o mesmo código = 1 produto em várias categorias, com uma principal (002 CA1.2, CA6.7)
- [x] T036 Implementar `agrupar()`
- [x] T037 Teste pequeno importados: `IMP (6,5)` → categoria Importados + imposto interno 6,50, e some do nome (002 CA4.5)
- [x] T038 Implementar `importados()`
- [x] T039 Teste pequeno referências: marca e tipo pelo rótulo ("REF SILC", "Orig. Mercedes"); referência igual a código interno vira **alerta** e não é publicada
- [x] T040 Implementar `referencias()`
- [x] T041 Teste pequeno `classificar`: aplicação e especificações em texto formatado, montadoras em `ProdutoMarca`, sobra vira pendência (002 CA1.3, CA1.4)
- [x] T042 Implementar `classificar()`
- [x] T043 Teste pequeno nome por extenso pelo dicionário; nome abreviado guardado só para busca
- [x] T044 Implementar `nomePorExtenso()` + dicionário versionado
- [x] T045 Teste pequeno `verificarSigilo()`: acusa código interno ou imposto em qualquer texto público (002 CA4.2)
- [x] T046 Implementar `verificarSigilo()`
- [x] T047 Teste grande importação da fixture: todo código importado, `CardOrigem` por card, ordem do PDF (003 CA14.3, 002 CA1.8), duas importações = mesmo banco (CA1.5), relatório (CA1.6), trava com produto editado ou de cadastro (CA1.7)
- [x] T048 Implementar a CLI `importar -- --origem <pasta>` (sem fotos; elas entram na T090)
- [x] T049 Importar o catálogo extraído real no `falcao_dev` e revisar o relatório (fora do Git)
- [x] T050 `npm run check` verde + revisão do `code-reviewer` da etapa 1

## Etapa 2: Login, sessão, usuários, perfis e registro de acessos

### Domínio
- [ ] T051 Teste pequeno senha: 10 a 128 caracteres, comuns recusadas; hash Argon2id (m = 19 MiB, t = 2, p = 1) e verificação (CA1.7)
- [ ] T052 Implementar `senha.ts` (no máximo 2 cálculos simultâneos)
- [ ] T053 Teste médio `entrar()`: válido cria sessão com token novo (banco guarda só o SHA-256), e-mail sem diferença de caixa; senha errada e e-mail inexistente dão o **mesmo** erro genérico, com hash fictício (CA1.2)
- [ ] T054 Implementar `entrar()`
- [ ] T055 Teste médio bloqueio: 5 erros em 15 min por e-mail + IP bloqueiam 15 min; outro IP entra; e-mail inexistente também bloqueia; administrador desbloqueia (CA1.3)
- [ ] T056 Implementar o bloqueio de tentativas
- [ ] T057 Teste médio `validarSessao()` com relógio simulado: 30 min sem uso ou 12 h expiram; `ultimoUso` gravado no máximo 1×/min; usuário bloqueado perde a sessão na hora (CA1.4, CA12.2)
- [ ] T058 Implementar `validarSessao()` e `sair()`
- [ ] T059 Teste médio senha temporária: mostrada uma vez, expira em 24 h, troca obrigatória imposta no servidor, trocar exige a senha atual, troca derruba todas as sessões (CA1.8)
- [ ] T060 Implementar `redefinirSenha()` e `trocarSenha()`
- [ ] T061 Teste médio perfis: criar, renomear, excluir, marcar permissões (CA12.4); não exclui perfil atribuído (CA12.7); Administrador fixo e não excluível (CA12.6); perfis iniciais Administrador, Cadastro e Comercial (CA12.8)
- [ ] T062 Implementar `perfis.ts` + seed inicial
- [ ] T063 Teste médio usuários: criar, mudar perfil, bloquear, reativar (CA12.1); ninguém muda o próprio perfil; só administrador mexe em administrador; nunca zero administradores ativos (CA12.6); permissão alterada vale na próxima requisição (CA12.5)
- [ ] T064 Implementar `usuarios.ts`
- [ ] T065 Teste médio chaves de API: mostrada uma vez, guardada como SHA-256, último uso, revogação (CA12.3)
- [ ] T066 Implementar `chaves-api.ts`
- [ ] T067 Teste médio registro de acessos: login com e sem sucesso, permissões, senhas, desbloqueios e chaves; sem dado sensível no detalhe; expurgo de 180 dias e IP por 30 dias
- [ ] T068 Implementar `registro-acesso.ts`

### App do painel
- [ ] T069 Preparar `adm/`: Next 16, React 19, Tailwind v4 com os tokens do protótipo (claro e escuro), Vitest + Testing Library, ESLint
- [ ] T070 Teste pequeno: respostas com CSP com nonce, `frame-ancestors 'none'`, HSTS, `no-referrer`, `no-store` e `X-Robots-Tag: noindex, nofollow`; `robots.txt` fechado (CA1.6)
- [ ] T071 Implementar `proxy.ts` (cabeçalhos e redirecionar quem não tem cookie, CA1.1) e `robots.ts`
- [ ] T072 Teste pequeno: cookie `__Host-falcao_sessao` com `HttpOnly; Secure; SameSite=Strict; Path=/`; `conferirOrigem()` recusa outro `Origin`
- [ ] T073 Implementar `sessao-cookie.ts` e `conferirOrigem()`
- [ ] T074 Teste de tela Entrar e Trocar senha: mensagem genérica, foco no erro, envio por Enter
- [ ] T075 Implementar telas Entrar e Trocar senha + Server Actions
- [ ] T076 Teste de tela: menus e botões sem permissão não aparecem (CA1.5, lado visual)
- [ ] T077 Implementar o layout do painel (menu lateral, tema, busca Ctrl+K, celular)
- [ ] T078 Teste médio: Server Action chamada sem permissão é recusada no servidor (CA1.5)
- [ ] T079 Teste de tela Usuários e perfis: senha temporária mostrada uma vez, marcar permissões, mensagens de recusa
- [ ] T080 Implementar telas Usuários e perfis (com chaves de API)
- [ ] T081 `npm run check` verde + revisão do `security-auditor` (login e sessão)

## Etapa 3: Imagens
- [ ] T082 Teste pequeno: aceita JPEG, PNG e WebP **pelos bytes**; recusa SVG, HEIC, extensão falsa e mais de 8 MB com "envie em JPG ou PNG"
- [ ] T083 Implementar `validarImagem()`
- [ ] T084 Teste médio `processarImagem()`: `rotate()`, **EXIF removido** (foto com GPS), 3 tamanhos WebP, nome por hash, `limitInputPixels`
- [ ] T085 Implementar com `sharp`
- [ ] T086 Teste pequeno `ArmazenamentoDeImagens` local: grava em temporário e renomeia; excluir confere o produto dono
- [ ] T087 Implementar o armazenamento local (pasta configurável fora do OneDrive)
- [ ] T088 Teste médio: enviar, reordenar e excluir imagem grava histórico e **não** muda a `versao` do produto (CA4.9)
- [ ] T089 Implementar o Route Handler de upload (`exigirPermissao`, `conferirOrigem`, limite de tamanho)
- [ ] T090 Teste pequeno `alt` gerado de nome e marca (002 CA6.5) + importar fotos e logos do catálogo extraído pelo mesmo processamento

## Etapa 4: Produtos, consulta rápida, localização e histórico

### Domínio
- [ ] T091 Teste médio busca do painel: nome, abreviado e referência; código interno e localização **só com permissão** (sem ela, não acha) (CA3.1, CA15.3, CA12.9)
- [ ] T092 Implementar `buscarProdutosPainel()` (`Prisma.sql`, limites, `statement_timeout`)
- [ ] T093 Teste médio filtros: grupo, categoria, marca, montadora, situação, a revisar, com pendência, sem foto, sem referência, novo e sem localização (com permissão) (CA3.2, CA15.3)
- [ ] T094 Implementar os filtros
- [ ] T095 Teste médio linha da lista: foto, nome, códigos (com permissão), categoria principal, situação e alertas (CA3.3)
- [ ] T096 Implementar `linhaDaLista()`
- [ ] T097 Teste médio `salvarProduto()`: nome, categorias com uma principal, variações (incluir, editar, reordenar, remover com exclusão lógica), referências com marca e tipo, aplicação, especificações e observações (CA4.1–4.4)
- [ ] T098 Implementar `salvarProduto()` (transação + versão + histórico + `recalcularBusca`)
- [ ] T099 Teste médio validação: erro por campo, código interno repetido, referência igual a código interno, nada gravado (CA4.2, CA4.3, CA4.5)
- [ ] T100 Implementar os schemas Zod do produto
- [ ] T101 Teste médio sem `ver_codigo_interno`: editar a variação **preserva** o código; o erro "código já existe" não revela o código (CA12.9)
- [ ] T102 Implementar a preservação e o filtro dos erros
- [ ] T103 Teste médio conflito: versão antiga recusada com o que mudou (filtrado por permissão); localização e imagem não geram conflito (CA4.9)
- [ ] T104 Implementar o conflito de edição
- [ ] T105 Teste médio: produto novo nasce rascunho, com o modelo de especificações da categoria (CA4.7, CA7.3)
- [ ] T106 Implementar `criarProduto()`
- [ ] T107 Teste médio: resolver pendência cria o campo escolhido e apaga a pendência na mesma transação (CA4.11)
- [ ] T108 Implementar `resolverPendencia()`
- [ ] T109 Teste médio publicar e desativar: exige nome, categoria principal e variação com código, e lista o que falta; aviso de revalidação (simulado); desativado responde "removido" na leitura pública (CA5.1–5.3)
- [ ] T110 Implementar `publicar()` e `desativar()`
- [ ] T111 Teste médio localização: texto livre, exige `editar_localizacao`, vale na hora, histórico de/para, papel público não lê (CA15.1, CA15.4, CA15.5)
- [ ] T112 Implementar `salvarLocalizacao()`
- [ ] T113 Teste médio histórico do produto: antes e depois; campo sensível **omitido** sem permissão (CA13.1, CA15.4)
- [ ] T114 Implementar `historicoDoProduto()`
- [ ] T115 Teste médio início: contagens (as sensíveis só com permissão) e últimas alterações (CA2.1, CA2.2)
- [ ] T116 Implementar `resumoDoInicio()`
- [ ] T117 Teste médio consulta rápida: códigos e localização com permissão; link do site `/catalogo/produto/<slug>` (ou slug antigo) abre o produto; limite de requisições por sessão (CA10.1, CA10.2, CA15.2)
- [ ] T118 Implementar `consultaRapida()`

### Telas
- [ ] T119 Teste de tela Produtos: busca, filtros e página na URL; voltar da edição mantém tudo (CA3.4)
- [ ] T120 Implementar a tela Produtos
- [ ] T121 Teste de tela Produto: 4 abas, erro junto do campo (CA4.5), aviso ao sair sem salvar (CA4.6), aviso do Google em texto claro (CA4.10), pré-visualização do texto formatado, Ctrl+S
- [ ] T122 Implementar a tela Produto
- [ ] T123 Teste de tela: conflito oferece "recarregar e reaplicar minhas alterações" (CA4.9)
- [ ] T124 Implementar o aviso de conflito
- [ ] T125 Teste de tela Consulta rápida em 390 px (CA10.3)
- [ ] T126 Implementar a tela Consulta rápida
- [ ] T127 Implementar a tela Início (só exibição, dados da T116)

## Etapa 5: Categorias e marcas
- [ ] T128 Teste médio categorias e grupos: criar, renomear, reordenar com setas, mover entre grupos, texto de apresentação e modelo de especificações (CA7.1, CA7.3)
- [ ] T129 Implementar `categorias.ts`
- [ ] T130 Teste médio: categoria com produtos não pode ser excluída (CA7.2)
- [ ] T131 Implementar a trava de exclusão
- [ ] T132 Teste médio: renomear grava o slug antigo; slug novo nunca coincide com um antigo; sem cadeias (CA7.4, 002 CA6.8)
- [ ] T133 Implementar `SlugAntigo` na renomeação
- [ ] T134 Teste médio marcas: criar, editar, tipo e logo (CA8.1)
- [ ] T135 Implementar `marcas.ts`
- [ ] T136 Teste de tela Categorias (lista com setas) e Marcas (cards pequenos)
- [ ] T137 Implementar as telas Categorias e Marcas

## Etapa 6: Orçamentos (spec 004)
- [ ] T138 Teste pequeno dinheiro: "1.234,56" vira decimal exato; valor inválido recusado; total do item e total geral sem ponto flutuante (CA1.7, R6)
- [ ] T139 Implementar `dinheiro.ts`
- [ ] T140 Teste médio: orçamento criado só na primeira alteração, número sequencial, identificação livre, nasce rascunho (CA1.1, CA1.6)
- [ ] T141 Implementar `criarOrcamento()`
- [ ] T142 Teste médio itens: adicionar pela mesma busca da consulta rápida; repetido **soma** a quantidade; cópia de nome, variação e referência; aviso para produto desativado (CA1.2, CA1.4, R5)
- [ ] T143 Implementar `adicionarItem()`
- [ ] T144 Teste médio: item mostra código interno e localização só com permissão (CA1.3)
- [ ] T145 Implementar a serialização do item
- [ ] T146 Teste médio autosave no servidor: gravação com `versao` antiga recusada; orçamento concluído recusa gravação (CA1.5)
- [ ] T147 Implementar `salvarOrcamento()`
- [ ] T148 Teste pequeno fila de autosave no navegador (relógio simulado): uma gravação por vez, alterações juntadas, "Concluir" espera a fila esvaziar (CA1.5)
- [ ] T149 Implementar `fila-autosave.ts`
- [ ] T150 Teste médio: concluir exige itens e todos com valor, e diz o que falta; Editar volta a rascunho; histórico só de eventos (CA2.1–2.3)
- [ ] T151 Implementar `concluir()` e `editar()`
- [ ] T152 Teste médio: excluir; orçamento de outra pessoa dá **"não encontrado"** em toda ação, sem `orcamentos_de_todos` (CA4.4)
- [ ] T153 Implementar `excluirOrcamento()` e o filtro por dono
- [ ] T154 Teste pequeno texto copiado: número, identificação, uma linha por item com valores e o total; código e localização só se pedido **e** permitido; registro de acesso quando inclui dado interno (CA3.1, CA3.2)
- [ ] T155 Implementar `textoDoOrcamento()`
- [ ] T156 Teste médio lista: número, identificação, data, itens, total, quem criou e situação; filtros por situação, período (fuso `America/Bahia`) e quem criou; meus rascunhos no início (CA4.1–4.3)
- [ ] T157 Implementar `listarOrcamentos()`
- [ ] T158 Teste de tela Orçamento: valores e totais, modal Excluir, Editar, Copiar
- [ ] T159 Implementar as telas Orçamentos e Orçamento

## Fechamento das etapas 1 a 6
- [ ] T160 Playwright configurado, com PostgreSQL no CI (serviço do GitHub Actions), mais `npm audit --omit=dev`
- [ ] T161 [P] Ponta a ponta: "entrar → editar → publicar"
- [ ] T162 [P] Ponta a ponta: "orçamento → concluir → copiar"
- [ ] T163 [P] Ponta a ponta: "perfil sem permissões não vê dado interno em lugar nenhum" (CA12.9)
- [ ] T164 Auditoria do `security-auditor` e revisão do `code-reviewer`
- [ ] T165 Conferir um a um os critérios da etapa 1 da spec 003 e todos da spec 004
- [ ] T166 `/verificar` verde

## Etapa 7: Portão antes do uso pela equipe (bloqueada)
> Só começa com o acesso à VPS e as decisões do plano 003 §9.
- [ ] T167 Decisões do responsável: imagens, backup, DNS e VPS
- [ ] T168 `infra/`: compose de produção, Caddy, UFW, SSH por chave, papéis do banco, `TZ`
- [ ] T169 Backup com restic fora da VPS + restauração testada
- [ ] T170 Deploy com aprovação (GHCR, ações fixadas por SHA)
- [ ] T171 Spec do reforço do login (2FA) com `/sdd especificar`

---

## Análise de consistência (2026-11-11)

**Cobertura:** todo critério da etapa 1 da spec 003 (CA1.1–1.8, 2.1–2.2, 3.1–3.4, 4.1–4.7, 4.9–4.11, 5.1–5.3, 7.1–7.4, 8.1, 10.1–10.3, 12.1–12.9, 13.1, 14.3, 15.1–15.5) e todo critério da spec 004 (CA1.1–1.7, 2.1–2.3, 3.1–3.2, 4.1–4.4) tem teste e tarefa. Itens da etapa 2 (CA5.4, CA9.x, CA11.x, CA13.2, CA14.1/14.2/14.4) ficam fora, como no plano.

**Lacunas e desvios registrados:**
1. **Fixture anonimizada:** o plano 002 fala em "~30 cards reais"; como o repositório é público, a fixture usa códigos fictícios (T034).
2. **"No site" (CA5.1, CA5.2, CA7.4, CA10.2):** a API pública (plano 002, pausado) e as páginas do catálogo ainda não existem. Aqui os testes cobrem o domínio (situação, leitura pública "removido", slug antigo, aviso de revalidação simulado e o formato `/catalogo/produto/<slug>`). O comportamento no site fecha na spec do frontend do catálogo.
3. **CA12.3:** o painel cria, lista e revoga chaves; o "último uso" passa a ser gravado quando a rota `/v1/interno` existir (plano 002).
4. **Exceção ao TDD dos scripts Python (pendente no plano 002):** não bloqueia esta lista. A importação lê o JSON já extraído; os scripts continuam fora do repositório.
5. **Estrutura de pastas:** o `CLAUDE.md` cita `backend/`; o plano 003 cria `admin/` e `packages/`. A T001 atualiza o `CLAUDE.md`.
6. **Pré-requisito local:** a T002 precisa do Docker Desktop aberto.

## Desvios registrados na implementação

- **T005, testes médios:** um único banco `falcao_teste`, arquivos rodando um por vez e tabelas esvaziadas antes de cada teste, em vez de um schema por worker. É mais simples (Art. IV) e rápido o bastante.
- **T011/T013:** as permissões dos papéis entraram na própria migração inicial, antes do teste da T012. Para compensar, o teste foi verificado forçando um vazamento (`GRANT SELECT` em `VariacaoInterna` ao público): ele fica vermelho e volta ao verde sem o GRANT.
- **T011:** as extensões `unaccent` e `pg_trgm` ("trusted") e as permissões do schema ficam na migração, não no script do contêiner, para valer também depois de um reset. `Perfil.fixo` virou `Perfil.administrador`. Prisma **7.10.1** (a 8 ainda é candidata), com o recurso em prévia `partialIndexes` para "uma categoria principal por produto".
- **T018/T019:** o teste achou um vazamento: no painel, uma referência **não publicada** (em alerta por ser igual a um código interno) aparecia para quem não pode ver código interno. Agora ela só aparece com `ver_codigo_interno`.
- **T028/T029:** no último caso de colisão, o slug ganha um sufixo curto **derivado do texto** (6 caracteres, determinístico), nunca número sequencial.
- **T030/T031:** foi criada a função `textoSimples()` em `packages/texto-formatado`, para títulos, descrições e busca.
- **T007:** gitleaks no `pre-push` (via Docker) e no CI (imagem fixada por digest). Falta o responsável ligar *secret scanning* e *push protection* nas configurações do GitHub.
- **Portão de formatação:** o `npm run format:check` acusa a pasta `02 — Catálogo Digital…-html/`, que está fora do Git e não foi criada neste trabalho.
- **T034:** a fixture tem 16 cards (não ~30), cobrindo todos os casos listados e mais o "número sem IMP" e o card repetido em Lançamentos.
- **T037:** só o padrão `IMP (x,xx)` vale como imposto. No PDF há 174 números entre parênteses **sem** IMP (ex.: "ANEL RETENCAO 1,2"), que são medidas.
- **T039/T045, sigilo:** a referência igual a um código interno **não** entra na tabela `Referencia` (que o papel público lê): vira pendência interna e alerta no relatório. Pelo mesmo motivo, `chaveImportacao` saiu de `Produto` e foi para `ProdutoInterno` (2ª migração). Código interno citado dentro do nome (ex.: "(ARCA - <código interno>)", 76 casos reais) sai do texto público e o original vira pendência interna.
- **Lançamentos (R5):** 238 produtos, só 5 com outra categoria. A categoria é deduzida pelas primeiras palavras do nome quando há uma dominante (≥ 60% e ≥ 2 produtos), com pendência "Categoria deduzida pelo nome" para conferir; sem categoria segura, o produto fica como **rascunho** com pendência.
- **Trava (CA1.7):** além de produto do cadastro e produto editado, recusa também banco com **localização** preenchida ou com **orçamento**, que a recarga apagaria.
- **Entrada:** caracteres de controle do OCR (ex.: `\u0000`, que o PostgreSQL recusa) são removidos na leitura.
- **Fotos:** a T048 não grava `Imagem`; as fotos entram na T090. O "aparece no Google" da carga considera a foto do card.
- **T049:** a primeira carga real foi feita com uma verificação de sigilo que tinha pontos cegos; a nota "zero códigos internos" daquela carga estava **errada** (ver a revisão abaixo). O banco local foi recarregado depois das correções.
- **Busca (para a T091):** "catraca scania" também acha cuícas, porque a categoria se chama "Cuícas, catracas e acessórios" (peso B). A ordenação por relevância da busca do painel resolve.

## Revisão da etapa 1 (T050, `code-reviewer`, 2026-11-12)

Veredito: "precisa de ajustes". Tudo corrigido com teste antes (Vermelho → Verde), exceto o que está em "Pendente":

- **C1, imposto sem parênteses:** "IMP 9,99" passava pela extração e pelo sigilo, e chegou a `nome`, `slug` e SEO de 10 produtos na carga local. A extração e a verificação agora aceitam IMP com ou sem parênteses e com ponto; "IMP 14T" (14 toneladas) não conta como imposto.
- **C2, código numérico colado em letras:** "IABV4983…" e "…ANEL" passavam (11 linhas públicas). Código só de dígitos agora é comparado com fronteira de dígito; o nome que perde um código fica "a revisar".
- **C3, dados reais em arquivos não commitados:** 2 códigos internos reais em comentários e 2 produtos reais com o imposto verdadeiro na fixture. Trocados por fictícios (códigos `1110001…`, impostos 9,99, 7,7 e 8,8, conferidos contra o catálogo real). A fixture ganhou um teste que só aceita esses impostos, e foi criado o hook **pre-commit** (`FALCAO_CATALOGO_REAL`), que barra commit com código interno real. O histórico do Git estava limpo.
- **C4, produto sem nome:** 190 publicados com nome vazio e 218 endereços começando com hífen. O nome agora vem da variação ou do começo do texto do card (com pendência "Nome deduzido" e "a revisar"); sem nome aproveitável, o produto fica como rascunho com pendência "Nome ausente".
- **I1:** `CardOrigem.categoriaId` ficava sempre nulo; agora liga 5.097 de 5.336 cards (os outros são de Lançamentos).
- **I2/I3:** o endereço nunca passa de 70 nem começa ou termina com hífen; a descrição sempre termina com a cidade.
- **I4:** depois de gravar, a própria transação varre todas as tabelas públicas (inclusive `buscaTexto`) e desfaz tudo se achar código interno ou imposto.
- **I5:** a trava também recusa histórico do painel, grupos e categorias com grupo, texto ou SEO; e duas importações não rodam juntas (`pg_advisory_xact_lock`).
- **I6:** `marcarAlertas` (código morto) removido; comentários do schema e do serializador corrigidos. O cadastro (T099) recusa referência igual a código interno.
- **I7:** só o parêntese que contém o código é removido.
- **I8:** testes de orçamento, histórico, categoria organizada, concorrência, `categoriaId` e sigilo pós-gravação.
- **S1:** nova migração: o painel só acrescenta em `Alteracao` e `RegistroAcesso` e não toca em `_prisma_migrations` (expurgos rodarão com o papel dono). Um teste destrutivo apagou o controle de migrações do banco de **testes**; foi recuperado com `migrate resolve` e o teste passou a consultar `has_table_privilege`.
- **S3:** referência de variação removida não sai no painel, no site nem na busca.
- **S4/S5/S6/S7:** `normalizarCodigo` no `gravar`; CI com `permissions: contents: read` e ações fixadas por SHA; hook com o digest do gitleaks; byte NUL do `tasks.md` removido; "REF. SILC código" vira similar Silc e "1234 2 PECAS" não emenda o "2".
- **S9:** a foto só conta para o Google quando as fotos estiverem importadas (opção `comFotos`, ligada na T090).

**Resultado da carga local depois das correções:** 4.499 produtos, 240 rascunhos, 1.639 nomes a revisar, 265 indexáveis (sem contar fotos). Duas varreduras (a do domínio e uma independente em Python, com fronteira de dígito) sobre 14.676 linhas públicas: **zero** códigos internos e **zero** marcas de imposto.

**Pendente (decidir depois):**
- **S2:** o papel público lê colunas de controle (`revisarNome`, `origem`, `editadoManualmente`) e rascunhos; hoje só o serializador filtra. Avaliar `GRANT SELECT (colunas)` ou uma view quando a API pública (plano 002) for construída.
- **S8:** o histórico do painel precisa omitir código interno, imposto e localização para quem não pode vê-los (já previsto na T113).
- **Números sem IMP:** 174 cards têm número entre parênteses sem a palavra IMP. Alguns são medidas ("ANEL RETENCAO 1,2"), mas outros podem ser imposto sem o rótulo (ex.: um card de cuíca com "3,25" no fim). Confirmar com o responsável.

