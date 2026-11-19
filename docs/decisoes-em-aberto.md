# Decisões em aberto do catálogo (backend)

Tudo o que a [especificação](./especificacao.md) ou o [prompt do backend](../PROMPT_BACKEND_FALCAO.md) não definem, ou em que os dois divergem. Regra: **não inventar regra de negócio**. Cada item fica aberto até a resposta do responsável, com a data.

Legenda: 🔴 bloqueia a fase indicada · 🟡 pode seguir com o padrão proposto, configurável · ✅ resolvida.

## Resolvidas

| # | Decisão | Resposta | Data |
|---|---|---|---|
| R1 | Tecnologia do site atual e onde o catálogo roda (especificação, decisão 1) | O site é **Next.js 16** neste repositório (`frontend/`), publicado na Vercel. A API mora em **`api/`**, no mesmo repositório. | 19/11/2026 |
| R2 | Código interno da Falcão no site | **É público.** Aparece no selo "cód.0103", na busca e na mensagem do WhatsApp, como na especificação. A regra antiga ("código interno nunca vai a público") deixou de valer. | 19/11/2026 |
| R3 | Agentes e skills do prompt × os do site | **Somar.** Os do site ficam (`seo-specialist`, `frontend-engineer`, `/implementar-secao`, `/nova-pagina`, `/auditoria-seo`, `/verificar`, `/pre-deploy`); os antigos de backend, testes e revisão (`backend-architect`, `code-reviewer`, `security-auditor`, `test-engineer`, `/sdd`, `/tdd`) dão lugar aos do prompt. | 19/11/2026 |
| R5 | Propostas das decisões **D10 a D20** (Fase 0) | **Aprovadas como propostas**, junto com a spec 000. Ficam na tabela abaixo para consulta até serem aplicadas nas tarefas. | 19/11/2026 |
| R4 | Versão do Node | **Node 26 "Lithium"**, LTS ativa desde 28/10/2026 (conferido em nodejs.org/dist/index.json e no calendário oficial em 19/11/2026). Versão atual: 26.13.1 (correção de segurança de 10/11/2026). | 19/11/2026 |

## Abertas

| # | Fase | Decisão | Proposta (se o responsável concordar) |
|---|---|---|---|
| D1 | 🔴 7 (🟡 até lá) | **Hospedagem e domínio da API.** O site está na Vercel, que não é lugar para um Fastify com PostgreSQL rodando o tempo todo. | API numa VPS (a Hostinger já foi cogitada) com PostgreSQL, atrás do próprio domínio: `bahiafalcao.com.br/api` com *rewrite* do Next para a API, ou `api.bahiafalcao.com.br`. As duas opções ficam documentadas na Fase 0 (seção 12 do prompt). |
| D2 | 🔴 1 (convites) | **Serviço de e-mail e remetente** (especificação, decisão 2). | Interface `EmailSender` + Mailpit no local até decidir. Remetente sugerido na especificação: `nao-responda@bahiafalcao.com.br`. |
| D3 | 🟡 1 | **Regras de segurança:** bloqueio após 5 erros em 15 min, sessão de 8 h (30 dias com "Manter conectado"), convite de 7 dias, link de senha de 1 h. | Usar esses valores, todos por variável de ambiente. |
| D4 | 🟡 4 | **Limite de peças por cotação** (sugestão: 50). Afeta o tamanho máximo de `GET /api/produtos/lote?codigos=`. | O lote aceita no máximo o limite da cotação (50). |
| D5 | 🟡 3 | **O Editor pode excluir produtos** ou só ocultar? | Pode excluir (sugestão da especificação e tabela de papéis). |
| D6 | 🔴 1 (comando `criar-admin`) | **Quem é o primeiro Administrador** (nome e e-mail). | — |
| D7 | 🔴 3 | **Fotos:** mais de uma por peça? O modelo da especificação tem um só `foto_url`, mas o detalhe prevê "Várias fotos". | Uma foto por peça nesta versão (o próprio detalhe diz "fora do escopo se só 1 foto por produto"). |
| D8 | — (front) | Arquivos finais da logo. | Não afeta o backend. |
| D9 | 🔴 4 | **Relevância da busca.** A especificação diz "todas as palavras precisam aparecer (E)" e a ordem "código exato → original/similar exato → começo do nome → resto". O prompt acrescenta "similaridade (`similarity()`)" antes do "resto". Similaridade pode trazer peças que **não** têm todas as palavras. | Similaridade só para **ordenar** dentro do que já tem todas as palavras; nunca para incluir resultado que não as tenha. |
| D10 | 🟡 0 | **Husky.** O prompt pede Husky + lint-staged, mas o `husky` está sem versão nova há 24 meses (9.1.7, de 18/11/2024) e o repositório já ativa ganchos com `core.hooksPath` (`.githooks/`), sem dependência. | Manter `.githooks/` (zero dependências, seção 5 item 1) e usar `lint-staged` dentro do gancho `pre-commit`. |
| D11 | 🟡 0 | **TypeScript 5.9.3, e não 6 ou 7.** O `typescript-eslint` aceita TypeScript `< 6.1` e o `openapi-typescript` (tipos do contrato) só aceita `^5`. | TypeScript 5.9.3 até os dois aceitarem versões novas. |
| D12 | 🟡 0 | **`ignore-scripts=true`.** O prompt pede `ignore-scripts` + liberação explícita. O npm 11.20 tem isso nativo: `strict-allow-scripts=true` + `allowScripts` no `package.json` (só os pacotes da lista rodam scripts de instalação; qualquer outro faz a instalação falhar). Também tem `min-release-age=7`. | Usar o mecanismo nativo do npm (mesma proteção, sem precisar rodar scripts à mão). |
| D13 | 🟡 1 | **"Cidade aproximada" das sessões** (Minha conta → Aparelhos) exige uma base de geolocalização por IP: dependência nova ou serviço externo, e é dado pessoal (LGPD). | Na Fase 1, guardar só navegador, sistema e IP; a cidade fica para quando a fonte for aprovada. |
| D14 | 🟡 4 | **Busca com 1 caractere.** A especificação define a dica na tela; não diz o que a API responde. | A API recusa `q` com menos de 2 caracteres com erro de validação (`busca_curta`). |
| D15 | 🟡 0 | **CI do site usa Node 24** (`.github/workflows/ci.yml`), mas `.nvmrc` diz 26. | Igualar o CI ao `.nvmrc` (26) junto com o job da API. |
| D16 | 🟡 0 | **`/docs` "protegido em produção"** (prompt, seção 6): o prompt não diz como. | Fechado por padrão: só abre com `NODE_ENV=development` ou `DOCS_HABILITADO=true` fora de produção. Em produção, `DOCS_HABILITADO=true` é recusado até a Fase 1; a partir dela, `/docs` exige login de Administrador. |
| D18 | 🟡 0 | **Versões exatas também no site.** A seção 5 pede versões exatas, mas o `package.json` da raiz e o do `frontend/` usam `^` (`next`, `react`, `prettier`...). Como os três dividem o mesmo lockfile, um `^` no site afeta a instalação inteira. | Trocar o `^` pela versão que já está no lockfile (nenhuma versão muda) e aplicar a checagem do CI aos três. |
| D19 | 🟡 0 | **Proteção da branch `main` no GitHub** (seção 5.7: "bloqueio de merge com vulnerabilidade alta"). É uma configuração do repositório no GitHub, feita por quem administra a conta. | Ativar "Require status checks" com os jobs `site` e `api` obrigatórios. Faço o passo a passo, e o responsável clica (ou autoriza o `gh`). |
| D20 | 🟡 0 | **Medidor próprio no lugar do autocannon/k6** (prompt, seção 7.2). | Na Fase 0, um medidor sem dependência (API compilada num processo, carga com `http.Agent` noutro, `perf_hooks`). O autocannon ou o k6 voltam a ser avaliados na Fase 4, pelo protocolo, se o medidor não bastar. |
| D17 | 🟡 0 | **gitleaks no `pre-commit`** precisa do programa `gitleaks` instalado em cada máquina (não é pacote npm). | Instalar com `winget install gitleaks` (versão fixada e conferida). Sem o programa, o gancho **barra** o commit com a instrução de instalação, em vez de pular a checagem. |
