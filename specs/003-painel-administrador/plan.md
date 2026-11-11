# Plano 003: Painel do administrador (etapa 1) e orçamentos (spec 004)

- **Specs:** [003](./spec.md) (painel) e [004](../004-orcamentos/spec.md) (orçamentos)
- **Design:** [`docs/design/03-painel-administrador/Painel.html`](../../docs/design/03-painel-administrador/Painel.html)
- **Base:** [plano 002](../002-catalogo-backend/plan.md) (modelo do catálogo, busca, importação, sigilo), pausado até a VPS
- **Status:** Aprovado (2026-11-11)

> Escopo: **etapa 1** da spec 003 e toda a spec 004. Itens "Etapa 2" (CA5.4, CA9.x, CA11.x, CA13.2, CA14.1/14.2/14.4) ficam para um plano posterior.

## 1. Portões da constituição

| Artigo | Atende? | Observação |
|---|---|---|
| II: Testes primeiro | ✅ | Toda regra (permissões, sessão, validações, totais, formatação, conflito de edição, sigilo) nasce de teste vermelho. |
| III: Testes como o Google | ✅ | Domínio testado pelas funções públicas com PostgreSQL real; telas pelo que o usuário vê; poucos testes de ponta a ponta. Pirâmide ≈ 70/20/10 (§7). |
| IV: Simplicidade | ✅ | **Um pacote de domínio** com todas as regras, usado pelo painel (direto, no servidor) e pela API pública. Sem camada intermediária de rotas para o painel. |
| V: SEO | ✅ | Painel **não indexado** (`X-Robots-Tag: noindex, nofollow`, `robots.txt` fechado, fora de sitemap). O que ele grava alimenta o SEO do site pelas regras da spec 002. |
| VI: Fonte única de dados | ✅ | NAP continua em `frontend/src/lib/site.ts`; o painel não edita dados da empresa. |
| VII: Segurança e LGPD | ✅ | §3 inteiro. Dados pessoais só da equipe (nome, e-mail, IP de acesso com retenção curta). |
| VIII: Acessibilidade | ✅ | Teclado (Ctrl+K, Ctrl+S, Enter), foco visível, contraste AA, rótulos, alvos ≥ 44 px no celular. |
| IX: Fidelidade ao design | ✅ | Telas seguem o protótipo aprovado; desvios registrados aqui. |

## 2. Abordagem técnica

### 2.1 Arquitetura (revisada)
```
navegador ──HTTPS──▶ Caddy ──▶ admin (Next.js do painel)
                                   │ Server Actions / Route Handlers
                                   ▼
                         packages/catalogo-dominio ──▶ PostgreSQL (papel catalogo_painel)

site (Vercel) ──HTTPS + token──▶ Caddy ──▶ api (Fastify: rotas públicas e /interno)
                                              │
                                   packages/catalogo-dominio ──▶ PostgreSQL (papel catalogo_publico)
```
- **`packages/catalogo-dominio`**: serviços, repositórios Prisma, schemas Zod, verificador de permissões e **serializadores por lista de permitidos**. É **o único lugar com regras de negócio**, usado pelos dois apps.
- **`admin/`** (Next.js 16, React 19, Tailwind v4, mesma stack do site): telas com Server Components. Gravações por **Server Actions**; upload de imagens por **Route Handler**, por causa do tamanho. **Toda action e todo handler chamam `exigirPermissao()`** como primeira linha: cada Server Action é um POST público. No Next 16, o `proxy.ts` só redireciona quem não tem sessão e **nunca** decide permissão.
- **`api/`** (Fastify, plano 002): só rotas públicas de leitura (site) e `/v1/interno` (chave de API). **Nenhuma rota do painel** existe na API.
- **Por que mudou:** antes, o painel chamaria a API (BFF), o que exigiria cerca de 40 rotas extras expostas em `api.`. A API também enxergaria o IP do contêiner do painel, então o bloqueio por IP travaria todos os usuários. Com o domínio compartilhado, as regras continuam num lugar só, com menos código e menos superfície exposta.

### 2.2 Login, sessão e permissões
- **Senha:** Argon2id (`@node-rs/argon2`) com m = 19 MiB, t = 2, p = 1 (mínimo da OWASP), no máximo 2 cálculos simultâneos. Entre 10 e 128 caracteres; senhas comuns recusadas (lista embutida). Para e-mail inexistente, roda um hash fictício para igualar o tempo de resposta. E-mail guardado em minúsculas.
- **Senha inicial ou redefinida pelo administrador (CA1.8):** gerada aleatoriamente, mostrada **uma vez**, válida por **24 h**, com troca obrigatória no primeiro acesso, imposta no servidor (enquanto `trocarSenha` estiver ativo, só a ação de trocar senha responde). Trocar a senha exige a senha atual. Tudo fica registrado.
- **Sessão:** token novo de 32 bytes **a cada login** (sem fixação); o banco guarda só o hash SHA-256. Cookie `__Host-falcao_sessao`: `HttpOnly; Secure; SameSite=Strict; Path=/`. Expira com **30 min de inatividade** e em no máximo **12 h**; `ultimoUso` é gravado no máximo uma vez por minuto. Sair, trocar ou redefinir a senha, ou ser bloqueado **apaga todas as sessões** da pessoa (CA12.2).
- **Bloqueio de tentativas (CA1.3):** por **par e-mail + IP** (o Caddy repassa o IP real; o Next confia só no Caddy), com atraso progressivo: 5 erros em 15 min bloqueiam 15 min. Vale também para e-mails inexistentes, para não revelar quem existe. Um administrador pode desbloquear. Isso evita que alguém tranque a conta do administrador de propósito.
- **Permissões:** `enum` fixo no código (`ver_produtos`, `editar_produtos`, `publicar`, `ver_codigo_interno`, `ver_imposto`, `ver_localizacao`, `editar_localizacao`, `categorias`, `marcas`, `consulta_rapida`, `orcamentos`, `orcamentos_de_todos`, `historico`, `usuarios_perfis`); o perfil guarda um `enum[]`. O perfil **Administrador** tem todas por definição no código, não por lista no banco. Permissões lidas **a cada requisição** (CA12.5).
- **Contra escalada de privilégio:**
  - só um **administrador** cria ou edita administradores, mexe no perfil Administrador ou redefine a senha de um administrador;
  - **ninguém altera o próprio perfil nem as próprias permissões**;
  - o sistema recusa deixar o catálogo sem nenhum administrador ativo (CA12.6).

### 2.3 Sigilo por perfil (CA12.9, R1 da spec 003)
Resposta montada por **lista do que é permitido** para aquele perfil, nunca por omissão. Os pontos de vazamento apontados pela revisão ficam cobertos:
- **Busca:** o bloco que procura por código interno e localização só entra na consulta com `ver_codigo_interno` ou `ver_localizacao`. Sem isso, a busca não "acha" por esses dados.
- **Início e filtros:** contagem e filtro "sem localização" exigem `ver_localizacao`.
- **Erros:** o aviso de conflito (409) e o "código já existe" passam pelo mesmo filtro.
- **Histórico:** campos sensíveis são **omitidos por inteiro** para quem não pode vê-los, não mascarados.
- **Orçamento copiado:** o pedido de "incluir código e localização" é ignorado sem a permissão.
- **Gravação:** quem não vê o código interno pode editar a variação, mas o servidor **preserva** o código existente e nunca o apaga ou troca.

### 2.4 Catálogo no painel
- **Conflito de edição (CA4.9):** `versao` no produto, gravação condicional (`UPDATE … WHERE id = ? AND versao = ?`; zero linhas = conflito). A tela mostra o que mudou e oferece **"recarregar e reaplicar minhas alterações"**. Localização e imagens **não** mudam a versão do produto, para não gerar conflito falso entre o balcão e o cadastro.
- **Validação:** Zod no servidor, com erros por campo (CA4.5). Código interno único (CA4.2). Referência igual a um código interno é recusada (CA4.3).
- **Texto formatado (R9):** `packages/texto-formatado` converte só `**negrito**`, listas `- ` e subtítulos `## `, **escapando todo o resto**. A mesma função gera a pré-visualização do painel e o texto do site.
- **Aplicação e especificações:** **texto formatado** no produto, que é a **fonte única** (a spec 002 foi ajustada em 11/11 e o plano 002 é revisado junto; §5). As montadoras ficam em `ProdutoMarca` com papel `MONTADORA`, para o filtro do site.
- **Localização (H15):** texto simples em `ProdutoInterno`, sem acesso pelo papel público.
- **Informação sem campo definido (CA4.11):** vem de `Pendencia`. Resolver cria o campo escolhido e apaga a pendência na mesma transação.
- **Publicar (CA5.1–5.3):** confere os dados mínimos e lista o que falta. Publicar ou desativar avisa o site para revalidar (plano 002, §4.5). Desativado responde 410 no site.
- **Lista que lembra a busca (CA3.4):** busca, filtros e página na URL.
- **Variação removida:** **exclusão lógica**, para não quebrar orçamentos antigos.
- **Histórico (CA13.1, CA15.4, CA2.2):** `Alteracao` grava quem, quando, entidade, `versao` e campos (antes/depois) na mesma transação.

### 2.5 Imagens
- **Tipos aceitos:** só **JPEG, PNG e WebP**, conferidos pelos bytes do arquivo. **SVG e HEIC são recusados**, com mensagem clara ("envie em JPG ou PNG"). Máximo de 8 MB, limitado também no Next.
- **Processamento com `sharp`:** `limitInputPixels`, `rotate()` e **remoção de EXIF** (o EXIF pode guardar a localização GPS de onde a foto foi tirada). Gera WebP em 3 tamanhos, com nome de arquivo gerado no servidor (hash), gravado em arquivo temporário e depois renomeado.
- **Onde ficam:** recomendação revisada: **Cloudflare R2**. Assim o site continua com fotos mesmo se a VPS cair, sem custo de saída e com backup simples. Alternativa: disco da VPS, servido pelo Caddy em `img.` (volume somente leitura no Caddy, sem listagem). Decisão do responsável (§9).
- **No site:** um `loader` do `next/image` escolhe entre os 3 tamanhos já prontos, para não reprocessar as imagens na Vercel. Cache `immutable`. O domínio das imagens envia `X-Content-Type-Options: nosniff` e `Content-Security-Policy: default-src 'none'`.
- **Excluir imagem:** a ação confere se a imagem é do produto informado.

### 2.6 Orçamentos (spec 004)
- **Número** por `SEQUENCE` (R4). O orçamento **só é criado na primeira alteração**, para não acumular rascunhos vazios.
- **Autosave (CA1.5):** **fila por orçamento** no navegador, com uma gravação por vez e as alterações juntadas, mais `versao` no orçamento (para quem edita no celular e no PC ao mesmo tempo). "Concluir" espera a fila esvaziar. O servidor recusa gravação em orçamento concluído. O histórico registra só os eventos (criar, concluir, editar, excluir), não cada tecla.
- **Item repetido (CA1.4):** `INSERT … ON CONFLICT (orcamento, variacao) DO UPDATE SET quantidade = quantidade + EXCLUDED.quantidade`.
- **Valores (CA1.7, R6):** o valor chega como texto ("1.234,56") e vira `Decimal(12,2)`, **nunca** número com vírgula flutuante. As contas são feitas no servidor. Quantidade é inteira, ≥ 1.
- **Acesso (IDOR):** toda leitura e ação (itens, concluir, editar, texto, excluir) filtra por `criadoPorId` **dentro da própria consulta**, a menos que a pessoa tenha `orcamentos_de_todos`. Orçamento de outra pessoa responde **"não encontrado"**, sem revelar que existe.
- **Item de produto desativado (R5):** o item guarda uma cópia do nome, variação e referência no momento em que entrou, e mostra o aviso.

### 2.7 Cabeçalhos e registros do painel
- **Cabeçalhos:**
  - CSP com *nonce*;
  - `frame-ancestors 'none'`;
  - HSTS;
  - `Referrer-Policy: no-referrer`;
  - `Cache-Control: no-store` em toda resposta autenticada;
  - `X-Robots-Tag: noindex, nofollow`.
- **CSRF:** `SameSite=Strict` não protege entre subdomínios do mesmo site. Por isso **toda escrita confere o `Origin`**: o Next faz isso nas Server Actions, e os Route Handlers fazem a checagem explicitamente.
- **Limite de requisições** na busca e na consulta rápida (por sessão), contra extração em massa de códigos.
- **Registro de acessos (`RegistroAcesso`):** logins (com sucesso ou não), mudanças de permissão e de senha, desbloqueios, chaves de API e cópias de orçamento com dado interno. Retenção de 180 dias; o IP da sessão é guardado por 30 dias.

## 3. Infraestrutura (VPS Hostinger)
- **Docker Compose:** `postgres`, `api`, `admin`, `caddy`. **Só o Caddy publica portas (80/443).** Os demais ficam numa **rede interna**, sem `ports:`, porque o Docker passa por cima do firewall UFW quando publica uma porta.
- **Firewall e SSH:** UFW com 22/80/443; SSH só com chave; login de root desligado; usuário de deploy sem privilégio de root.
- **Banco:** três papéis. `catalogo_migracoes` é o **dono** e só roda migrações. `catalogo_painel` lê e grava. `catalogo_publico` só lê as tabelas públicas. Usar `ALTER DEFAULT PRIVILEGES` para que tabelas novas **não** fiquem visíveis ao papel público por padrão. Um **teste de permissões** cobre todas as tabelas internas: Usuario, Sessao, TentativaLogin, RegistroAcesso, Alteracao, Orcamento, OrcamentoItem, ProdutoInterno, VariacaoInterna, CardOrigem, Pendencia e ChaveApi.
- **Fuso horário:** `TZ=America/Bahia`, para filtros como "hoje".
- **Saúde e operação:** healthcheck e `restart: unless-stopped` em todos os serviços, rotação de log do Docker, monitor externo de disponibilidade e alerta se o backup falhar.
- **Backup:**
  - `pg_dump` diário e cópia das imagens (se ficarem na VPS), **criptografados** com `restic` (chave guardada fora da VPS) e enviados para fora;
  - a credencial do destino **só grava, não apaga** (*object lock*), e o envio usa `rclone copy`, nunca `sync`;
  - retenção de 30 dias e restauração testada todo mês.
- **Deploy (o repositório é público):**
  - imagens no **GHCR** com tag por SHA, para poder voltar versão;
  - deploy só em push na `main`, por um *environment* que exige aprovação;
  - ações fixadas por SHA, `permissions: contents: read` e `known_hosts` fixo;
  - **nenhum segredo dentro das imagens**: os segredos ficam no `.env` da VPS;
  - antes de cada deploy, um `pg_dump`; as migrações rodam antes da API nova, com o papel dono.
- **Proteção do repositório:** ligar *secret scanning* e *push protection* no GitHub e o **gitleaks** no CI e no hook de pre-push. Nada de arquivo de credencial na raiz: o `vercel-github-email.txt` solto precisa sair ou entrar no `.gitignore`.
- **Sem a VPS ainda:** tudo roda localmente (`docker compose` para o banco e `npm run dev`), então o desenvolvimento não depende da Hostinger.

## 4. Arquivos afetados

| Arquivo | Ação | Motivo |
|---|---|---|
| `package.json` (raiz), `.github/workflows/ci.yml` | alterar | Workspaces `admin`, `api`, `packages/*`; PostgreSQL no CI; Playwright; gitleaks |
| `.github/workflows/deploy-vps.yml` | criar | Deploy com aprovação (quando houver VPS) |
| `.gitignore` | alterar | Relatórios de importação, cliente Prisma gerado, arquivos de credencial |
| `infra/` (compose, Caddyfile, backup com restic, scripts de papéis do banco) | criar | §3 |
| `packages/catalogo-dominio/` | criar | Regras, Prisma, Zod, permissões, serializadores, busca (do plano 002 e deste) |
| `packages/texto-formatado/` | criar | Formatação segura (painel e site) |
| `packages/contrato-catalogo/` | criar | Tipos das respostas públicas (plano 002) |
| `api/` | criar | Fastify com rotas públicas e `/interno` (plano 002) |
| `admin/` | criar | App do painel: telas, Server Actions, upload, `proxy.ts`, cabeçalhos, `robots.txt` |

O site (`frontend/`) não muda neste plano.

## 5. Modelo de dados

**Ajustes ao plano 002** (feitos junto com este plano):
- **Saem** as tabelas `Aplicacao`, `Especificacao` e `AtributoSugerido`.
- **Entram** os campos de texto formatado `Produto.aplicacao`, `Produto.especificacoes`, `Produto.observacoes` e `Categoria.modeloEspecificacoes`, e o papel `MONTADORA` em `ProdutoMarca`.
- A regra de "2 sinais" para indexar passa a contar foto, referência, aplicação e especificações **preenchidas**.

**Novas tabelas:**

| Tabela | Campos e índices | Acesso |
|---|---|---|
| **Perfil** | id, nome ‹único›, fixo, permissoes `enum[]`, timestamps | painel |
| **Usuario** | id, nome, email ‹único, minúsculas›, senhaHash, perfilId, ativo, trocarSenha, senhaTemporariaExpiraEm, ultimoAcesso | painel |
| **Sessao** | id, usuarioId, tokenHash ‹único›, criadaEm, ultimoUso, expiraEm, ip · índices (usuarioId), (expiraEm) | painel |
| **TentativaLogin** | id, email, ip, sucesso, criadaEm · índices (email, criadaEm), (ip, criadaEm) · expurgo 30 dias | painel |
| **RegistroAcesso** | id, usuarioId?, evento, detalhe (sem dado sensível), ip, criadoEm · índice (criadoEm desc) · 180 dias | painel |
| **Alteracao** | id, usuarioId, entidade, entidadeId, versao, acao, campos JSON (antes/depois), criadaEm · índices (entidade, entidadeId, criadaEm desc), (criadaEm desc) | painel |
| **ProdutoInterno** | produtoId 1:1, localizacao · índice trigram em localizacao | painel |
| **Produto** (+) | versao, aplicacao, especificacoes, observacoes | público lê (exceto internos) |
| **Variacao** (+) | excluidaEm (exclusão lógica) | público lê as não excluídas |
| **Orcamento** | numero ‹seq›, identificacao, situacao (RASCUNHO, CONCLUIDO), versao, criadoPorId, timestamps, concluidoEm · índice (criadoPorId, situacao, criadoEm) | painel |
| **OrcamentoItem** | id, orcamentoId, variacaoId, quantidade int ≥ 1, valorUnitario Decimal(12,2)?, observacao, ordem, nomeNoMomento, variacaoNoMomento, referenciaNoMomento · único (orcamentoId, variacaoId) | painel |

Também: índice trigram no código interno normalizado (`VariacaoInterna`), para a busca do painel.

## 6. Ordem de construção (revisada)

1. **Fundação:** monorepo, `catalogo-dominio` com Prisma e os papéis do banco, **teste de permissões do banco**, `texto-formatado`, **serializador por permissão com teste de vazamento** e registro em `Alteracao`. A importação do catálogo para o banco local entra aqui, já com a fonte única de aplicação e especificações.
2. **Login, sessão, usuários, perfis e registro de acessos** (domínio, telas Entrar e Usuários e perfis).
3. **Imagens** (processamento e armazenamento).
4. **Produtos** (lista, ficha, publicar, localização, histórico) e **consulta rápida**.
5. **Categorias e marcas.**
6. **Orçamentos.**
7. **Portão antes de usar com dados reais pela equipe:** infra da VPS com backup testado **e** o **reforço do login** (verificação em duas etapas). Até lá, o painel roda localmente ou na VPS **só com o responsável** testando.

Cada etapa termina com `npm run check` verde e as telas conferidas com o design.

## 7. Estratégia de testes

**Ferramentas:** Vitest (domínio e telas com Testing Library), **Playwright** (ponta a ponta), PostgreSQL real em Docker (um schema por worker, só em bancos com nome terminado em `_teste`).

| Critério | Teste | Tamanho |
|---|---|---|
| 003 CA1.1 | "sem sessão, qualquer página leva a Entrar" | pequeno + grande |
| 003 CA1.2 | "login válido abre o início; inválido dá mensagem genérica com o mesmo tempo de resposta" | médio |
| 003 CA1.3 | "5 erros por e-mail+IP bloqueiam; outro IP não trava o administrador; administrador desbloqueia" | médio |
| 003 CA1.4 | "30 min sem uso ou 12 h expiram a sessão" (relógio simulado) | pequeno + médio |
| 003 CA1.5 | "action sem permissão é recusada no servidor; botão e menu não aparecem" | médio + pequeno |
| 003 CA1.6 | "respostas com noindex; robots.txt fechado" | pequeno |
| 003 CA1.7 | "senha fora de 10–128 ou comum recusada; só o hash Argon2id é gravado" | pequeno + médio |
| 003 CA1.8 | "senha temporária mostrada uma vez, expira em 24 h, troca obrigatória imposta no servidor; derruba sessões" | médio |
| 003 CA2.1–2.2 | "início com contagens (sensíveis só com permissão) e últimas alterações" | médio |
| 003 CA3.1–3.4 | "busca por nome, abreviado, referência e código (só com permissão); filtros; linha completa; URL guarda o estado" | médio + pequeno |
| 003 CA4.1–4.7, 4.10, 4.11 | "edição completa, validação por campo, aviso ao sair, rascunho por padrão, aviso do Google, pendência resolvida em transação" | médio + pequeno |
| 003 CA4.9 | "gravação com versão antiga é recusada; localização e imagem não geram conflito" | médio |
| 003 CA5.1–5.3 | "publicar exige o mínimo; desativar tira do site (410)" | médio |
| 003 CA7.1–7.4, CA8.1 | "categorias, grupos e marcas; não exclui categoria com produtos; endereço antigo redireciona" | médio |
| 003 CA10.1–10.3 | "consulta com códigos e localização (com permissão); link do site abre o produto; cabe em 390 px" | médio + grande |
| 003 CA12.1–12.9 | "usuários e perfis; bloqueio derruba sessões; permissões valem na hora; ninguém muda o próprio perfil; só administrador mexe em administrador; nunca zero administradores" | médio |
| 003 CA12.3 | "chave de API mostrada uma vez, último uso, revogação" | médio |
| 003 CA12.9 | "perfil sem permissão não recebe código, imposto nem localização: busca, início, erros, histórico, orçamento" | médio + grande |
| 003 CA13.1, CA15.4 | "histórico com antes e depois; campo sensível omitido para quem não pode ver" | médio |
| 003 CA14.3 | "ordem inicial igual à da importação" | médio |
| 003 CA15.1–15.5 | "localização em texto, na consulta, filtros e busca (com permissão), nunca na API pública" | médio |
| 004 CA1.1–1.7 | "número sequencial, criação na primeira alteração, busca, item repetido soma, autosave em fila, contas em Decimal" | pequeno + médio |
| 004 CA2.1–2.3, CA4.4 | "concluir exige itens com valor; editar volta a rascunho; excluir com confirmação" | médio |
| 004 CA3.1–3.2 | "texto copiado com valores; código e localização só se pedido e permitido" | pequeno + médio |
| 004 CA4.1–4.3 | "lista com total e filtros; meus rascunhos no início; orçamento de outra pessoa dá 'não encontrado'" | médio |
| Banco | "papel público não lê nenhuma tabela interna (lista completa)" | médio |
| Segurança | "cookie com flags certas; escrita de outra origem recusada; upload SVG, HEIC ou com extensão falsa recusado; EXIF removido" | médio |
| Ponta a ponta | "entrar → editar → publicar"; "orçamento → concluir → copiar"; "perfil sem permissões não vê dado interno em lugar nenhum" | grande (Playwright) |

## 8. Riscos e mitigação
- **Plano 002 ainda não construído:** a etapa 1 constrói o domínio comum, seguindo o plano 002 já revisado (com os ajustes do §5).
- **Login sem verificação em duas etapas:** o painel só recebe a equipe com dados reais **depois** do reforço do login (portão da etapa 7).
- **VPS única:** backup criptografado fora da VPS, restauração testada, imagens no R2 (se aprovado), e o site continua na Vercel.
- **OneDrive no desenvolvimento:** volumes do Docker e cliente Prisma fora do OneDrive (plano 002).

## 9. Decisões pendentes do responsável

> **Adiadas (2026-11-11):** os itens 2 a 5 só são necessários para **publicar** (etapa 7). O desenvolvimento segue **local**: banco em contêiner, fotos em pasta local por trás de uma interface de armazenamento (ArmazenamentoDeImagens), trocável depois por R2 ou disco da VPS sem mudar o resto.
1. **Arquitetura revisada (§2.1):** o painel usa o pacote de domínio direto, sem rotas próprias na API. Recomendado pelas duas revisões.
2. **Imagens:** **Cloudflare R2** (recomendado: fotos seguem no ar se a VPS cair) ou disco da VPS.
3. **Backup fora da VPS:** Backblaze B2 ou Cloudflare R2 (recomendado), Google Drive, ou o backup pago da Hostinger.
4. **DNS:** quem administra `bahiafalcao.com.br`? Serão necessários `admin.`, `api.` e, se as imagens ficarem na VPS, `img.`.
5. **VPS:** 2 vCPU e 8 GB, com Ubuntu 24.04 LTS (recomendado).

## 10. Complexidade justificada
- **App de painel separado do site:** outro domínio, outra política de segurança e de cache, sem indexação. Misturá-lo ao site aumentaria o risco de expor rotas internas. O custo é contido: mesma stack, mesmos tokens e mesmo monorepo.
- **Pacote de domínio compartilhado:** é a forma de ter as regras e o sigilo **num lugar só** para dois apps (painel e API pública). A alternativa, um BFF com rotas de painel na API, foi rejeitada pelas revisões.
- **Playwright:** só para os poucos fluxos críticos e o sigilo por perfil.
- **Formatação própria em vez de uma biblioteca de Markdown:** o formato permitido é mínimo e precisa ser seguro (R8 da spec 002).
- **Três papéis de banco e registro de acessos:** garantia estrutural do sigilo e da rastreabilidade exigidos pelas specs (R1, R2, CA12.9).
