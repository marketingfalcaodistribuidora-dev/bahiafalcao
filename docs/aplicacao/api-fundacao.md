# API do catálogo: fundação (`api/`)

Base da API do catálogo, construída pela [spec 000](../../specs/000-fundacao/spec.md). Este documento cresce a cada tarefa concluída.

## Projeto e ferramentas (T001 e T002)

### O que existe

- **Workspace `api/`** no mesmo repositório do site (`workspaces: ["frontend", "api"]`), com o próprio `package.json` (`@falcao/api`, módulos ES).
- **Node 26 LTS** em todo o projeto. O `.nvmrc` fixa a 26.13.1 na máquina de quem desenvolve, e `engines` declara `26.x` (o formato que a Vercel entende).
- **TypeScript estrito** (`api/tsconfig.json`): além do `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` e `noPropertyAccessFromIndexSignature`.
- **Lint** (`api/eslint.config.js`): `typescript-eslint` estrito com tipos e `eslint-plugin-security`. São erro:
  - `any`;
  - `@ts-ignore` sem justificativa escrita;
  - `$queryRawUnsafe`, `$executeRawUnsafe` e `Prisma.raw`;
  - `eval` e `new Function`;
  - os nomes `$queryRawUnsafe` e `$executeRawUnsafe` em **qualquer** forma de escrita (ponto, colchetes, constante, texto de template, desestruturação), `Prisma.raw` com colchetes, o `Prisma` importado com apelido e o `raw` importado do runtime do Prisma;
  - e **nenhum comentário desliga o lint** (`noInlineConfig`): um `eslint-disable` não libera nada.
- **Testes** com Vitest:
  - `vitest.config.ts` para unitários, integração e contrato, com cobertura mínima de 90% em `src/modules/**`, `src/plugins/**` e `src/shared/**`;
  - `vitest.perf.config.ts` só para a medição de performance, fora da cobertura e do `npm test`.
- **Portão da raiz:** `npm run check` roda formatação, lint, tipos e testes do site **e** da API, e o build do site. O gancho `pre-push` usa o mesmo portão.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run lint -w api` | lint da API |
| `npm run typecheck -w api` | tipos da API |
| `npm test -w api` | testes da API |
| `npm run test:coverage -w api` | testes com cobertura |
| `npm run test:perf -w api` | medição de performance (as medições entram na T027) |

### Cadeia de suprimentos (`.npmrc` e `package.json` da raiz)

| Proteção | Efeito |
|---|---|
| `save-exact=true` | Versão exata no `package.json`, sem `^` nem `~` |
| `min-release-age=7` | Só instala versões publicadas há 7 dias ou mais. Pega o pacote recém-publicado por uma conta invadida |
| `strict-allow-scripts=true` + `allowScripts` | Só o `prisma` e o `@prisma/engines` rodam scripts de instalação; qualquer outro pacote com script faz a instalação falhar |
| `engine-strict=true` | Recusa instalar com outra versão do Node |
| `overrides` do `effect` | Corrige um alerta alto no CLI do Prisma sem trocar a versão do Prisma (veja [dependencias.md](../dependencias.md)) |

As duas primeiras proteções foram provadas na prática: uma versão de 1 dia e um pacote com script fora da lista foram recusados (registro na T001).

### Por quê

- **Mesmo repositório:** o front do catálogo vai consumir a API no mesmo domínio do site. Um repositório só deixa contrato, tipos e CI juntos (decisão R1 em [decisoes-em-aberto.md](../decisoes-em-aberto.md)).
- **TypeScript e lint estritos:** erros de tipo e padrões perigosos (SQL montado com texto, `eval`) são barrados antes de chegar a um teste ou à produção.
- **O lint é testado:** `api/tests/unit/lint/regras-proibidas.test.ts` passa trechos proibidos (e as formas de escrita que tentariam escapar) pelo ESLint de verdade. Se alguém afrouxar uma regra, o teste falha. Os exemplos declaram o banco sem o nome proibido, para o teste provar que é o **uso** que dispara a regra.
- **Só uma exceção:** o próprio `eslint.config.js` precisa escrever os nomes proibidos para barrá-los, então a regra dos nomes não vale nele.
- **Cadeia de suprimentos:** ataques recentes ao npm vieram de versões maliciosas recém-publicadas e de scripts de instalação. As proteções do npm barram os dois sem depender de ninguém lembrar.

## Ambiente local (T003)

### O que existe

`api/docker-compose.yml` sobe dois serviços, só acessíveis do próprio computador (`127.0.0.1`):

| Serviço | Endereço | Para quê |
|---|---|---|
| PostgreSQL 17 | `127.0.0.1:5433`, banco `falcao_dev` | Desenvolvimento e medição de performance |
| Mailpit | SMTP `127.0.0.1:1025`, página http://127.0.0.1:8025 | Recebe os e-mails que a API mandar (convites, senhas). Nada sai para a internet |

### Como usar

1. Copie `api/.env.example` para `api/.env`. Escolha uma senha só sua, com letras e números, e escreva-a em `POSTGRES_SENHA` e no lugar de `COLOQUE_A_SENHA` na `DATABASE_URL`. A senha vem em branco de propósito: sem ela o banco não sobe.
2. Com o Docker Desktop aberto: `npm run db:subir -w api`.
3. Para parar: `npm run db:descer -w api`. Os dados ficam no volume `falcao-api-pg`.
4. **Para recomeçar do zero** (por exemplo, depois de mudar o locale ou o script de `api/docker/postgres/`, que só valem num volume novo): `docker compose down -v` dentro de `api/` apaga o volume, e todos os dados locais junto.

Os containers só sobem com o `db:subir`. Eles não voltam sozinhos quando o Docker Desktop abre.

### Como funciona e por quê

- **Imagens fixadas por digest:** a mesma imagem, byte a byte, em qualquer máquina. Uma tag pode passar a apontar para outra imagem sem ninguém perceber.
- **Senha obrigatória no `api/.env`:** sem ela o compose não sobe. Nenhuma senha, nem a de desenvolvimento, vai para o repositório público.
- **Locale fixo (`C.UTF-8`, provedor `builtin` do PostgreSQL 17):** `lower()`, acentos e ordenação dão o mesmo resultado em qualquer máquina. A busca depende disso (CA6.5).
- **`pg_stat_statements` e `track_io_timing`:** guardam o tempo de cada consulta para a medição de performance (T027).
  - Contam só as consultas do nível de cima (`track=top`, como em produção).
  - A extensão fica num schema próprio, `medicao`, criado por `api/docker/postgres/01-extensoes.sql` quando o volume nasce. Assim um reset das migrations do Prisma não a apaga.
- **Parâmetros de desempenho** (espelham o que a VPS deve usar; revisar quando o tamanho dela for escolhido):
  - `shared_buffers=256MB` e `effective_cache_size=1GB`: o catálogo inteiro cabe na memória;
  - `random_page_cost=1.1` e `effective_io_concurrency=200`: disco SSD. Sem isso, o PostgreSQL acha que ler um índice é caro e varre a tabela inteira;
  - `jit=off`: a compilação JIT custaria dezenas de milissegundos por busca;
  - `shm_size: 256mb`: memória para consultas em paralelo.
- **Fuso UTC no banco:** o mesmo dos testes. A API converte para o horário da Bahia ao mostrar datas.
- **Banco de testes separado:** os testes automáticos não usam este banco. Cada execução cria um banco efêmero pelo Testcontainers (T005).

## Esteira (T004)

### O que existe

| Onde | O que faz |
|---|---|
| `.githooks/pre-commit` | Antes de cada commit: **gitleaks** nos arquivos preparados (segredo barra o commit) e **lint-staged** (Prettier em tudo; ESLint do site ou da API, conforme a pasta). Sem o gitleaks instalado, o commit também é barrado, com a instrução de instalação. |
| `.githooks/pre-push` | Antes de cada envio: o portão completo (`npm run check`). |
| `api/scripts/conferir-esteira.sh` | No CI: npm ≥ 11.20, `.npmrc` ativo, nenhum `^`/`~`, nenhuma flag que desligue a proteção de scripts, nenhum SQL montado com texto nem `eslint-disable` em `api/src`, e os workflows (CA7.6) pelas regras de `api/scripts/workflows.ts`. |
| `api/scripts/workflows.ts` e `conferir-workflows.ts` | Regras dos workflows (CA7.6), testadas (`tests/unit/scripts/workflows.test.ts`). Sem parser de YAML, elas falham fechado: recusam a palavra `write` em qualquer lugar fora de comentário; âncoras, tags, chaves complexas, `uses` sem valor na linha e escapes `\u`/`\x`; action sem SHA (com ou sem aspas na chave) e action local que sai do repositório; `pull_request_target` e `workflow_run`. Exigem `permissions: contents: read` no topo e `persist-credentials: false` em cada checkout. É uma heurística rígida, não uma garantia: o controle de verdade é a proteção da `main` (D19). |
| `api/scripts/check-lock.ts` | No CI, **antes do `npm ci`** e com o node puro (que executa TypeScript; por isso o import termina em `.ts` e o `tsconfig.json` liga `allowImportingTsExtensions`). Primeiro confere o lockfile inteiro, sem rede: toda dependência tem versão, vem do registro do npm e traz integridade sha512. Depois, cada pacote novo ou alterado (inclusive os indiretos; o mesmo `nome@versão` com outro endereço ou integridade conta como alterado) passa pelo protocolo. Recusa versão com menos de 7 dias, falha alta, crítica ou de gravidade desconhecida, origem fora do registro do npm e script de instalação fora do `allowScripts`. Falha moderada ou baixa vira aviso. Um pacote com `name` diferente da pasta (apelido `npm:`) só é aceito se o par já estava no lockfile da base ou está no `allowAliases` do `package.json` da raiz. |
| `.github/workflows/ci.yml` | Três jobs: **segurança** (conferência, check-lock, `npm audit --audit-level=high`, `npm audit signatures` e gitleaks no histórico inteiro); depois **qualidade** (`npm run check` e o build da Vercel) e **API** (testes com cobertura). |
| `.github/dependabot.yml` | Atualizações semanais com espera de 7 dias, agrupadas. |

### Como funciona e por quê

- **Por que o `check-lock`:** o `npm ci` instala exatamente o lockfile e não confere a idade de nada. Sem esta etapa, um lockfile editado à mão, ou um PR do Dependabot com uma dependência indireta recém-publicada, passaria. Rodado sobre a instalação da API (415 pacotes), ele levou 17 segundos e não recusou nenhum. As duas falhas moderadas já conhecidas saíram como aviso.
- **Por que segurança primeiro no CI:** os jobs de qualidade e da API rodam código dos pacotes (testes e build). Eles só começam depois que o job de segurança aprovou o lockfile.
- **Por que actions por SHA e permissão mínima:** uma tag pode passar a apontar para outro código. O SHA é imutável. O workflow só lê o repositório e não guarda credenciais no checkout.
- **Provas feitas:**
  - um token falso no formato do GitHub foi barrado pelo `pre-commit`;
  - sem o gitleaks, o commit foi barrado;
  - o `conferir-esteira.sh` barrou um `^`, uma flag proibida e um `eslint-disable` em `api/src`, e trata como falha uma busca que não rodou.
- **Histórico:** uma varredura única do histórico inteiro (23 commits) com o gitleaks não achou nenhum segredo.

### Comandos

| Comando | O que faz |
|---|---|
| `bash api/scripts/conferir-esteira.sh` | Confere as proteções da esteira (o mesmo que o CI roda) |
| `node api/scripts/check-lock.ts <lock-anterior> <lock-novo>` | Confere os pacotes novos ou alterados entre dois lockfiles |

## Testes com banco real (T005)

### O que existe

| Comando | O que roda | Precisa de Docker? |
|---|---|---|
| `npm test -w api` | Testes unitários (`tests/unit/`) | Não. É o que o `pre-push` roda |
| `npm run test:integration -w api` | Testes de integração (`tests/integration/`) com PostgreSQL real | Sim |
| `npm run test:coverage -w api` | Os dois, com cobertura mínima de 90% | Sim. É o que o CI roda |

### Como funciona

1. **Uma vez por execução** (`tests/apoio/global-setup.ts`):
   - sobe um PostgreSQL pelo Testcontainers, com a **mesma imagem (digest), o mesmo initdb (locale) e as mesmas configurações** do `api/docker-compose.yml`. Esses valores são lidos do próprio arquivo, que é a única fonte;
   - desliga a gravação garantida em disco (`fsync` e afins), porque este banco nunca mede performance;
   - prepara o banco-modelo `falcao_modelo` e o fecha para conexões.
2. **Cada arquivo de teste** cria o seu banco com `criarBancoDoArquivo()` (`tests/apoio/banco.ts`), copiado do modelo em cerca de 10 ms, e o apaga no fim (`DROP … WITH (FORCE)`).
3. No fim, o container é desligado. Se o processo cair, o Ryuk (do próprio Testcontainers) apaga o que sobrar.

### Por quê

- **PostgreSQL real, nunca SQLite nem banco simulado:** as consultas são testadas no banco em que vão rodar (exigência do prompt, seção 3).
- **Um banco por arquivo:** cada arquivo pode usar transações de verdade e criar o que quiser sem atrapalhar os outros, que rodam em paralelo.
- **Cópia de um modelo:** as migrations rodam uma vez só. Cada cópia leva cerca de 10 ms. As duas formas de cópia do PostgreSQL 17 empataram nesse tamanho (mediana de 8 a 13 ms), e ficou a padrão.
- **Modelo fechado para conexões:** uma conexão esquecida no modelo faria todas as cópias falharem.
- **Integração fora do `npm test`:** o `pre-push` não exige o Docker ligado. O CI roda as duas.
- **Provado pelos testes do próprio apoio:**
  - o banco do arquivo tem locale `C.UTF-8` (provedor `builtin`), fuso UTC e `jit=off`;
  - um arquivo não enxerga a tabela de outro;
  - o modelo recusa conexões.

## Configuração (T006)

### O que existe

`api/src/config/env.ts` lê as variáveis de ambiente uma vez, no início (`lerConfiguracao`), e devolve a configuração já tratada. Com qualquer variável faltando ou inválida, lança `ErroDeConfiguracao` e a API não sobe.

| Variável | Regra | Padrão |
|---|---|---|
| `NODE_ENV` | `development`, `test` ou `production` | obrigatória |
| `DATABASE_URL` | URL `postgresql://` | obrigatória |
| `CORS_ORIGENS` | origens exatas `https://` (sem barra no fim nem maiúsculas); `http://localhost` só em `development` | nenhuma |
| `TRUST_PROXY` | IPs ou faixas CIDR (de `/8` no IPv4, `/32` no IPv6 e `/104` no IPv4 mapeado para cima: `0.0.0.0/0` ou `::ffff:0:0/96` confiariam na internet inteira); `true` e número de saltos recusados | nenhum (usa o IP da conexão) |
| `LIMITE_GERAL_POR_MIN` | inteiro de 10 a 10000 | 300 |
| `LIMITE_IGNORAR_IPS` | IPs; **recusada em produção** | nenhum |
| `DOCS_HABILITADO` | `true`/`false`; `true` **recusado em produção** até a Fase 1 | `false` |
| `LOG_NIVEL` | `fatal`, `error`, `warn`, `info` ou `debug` | `info` |

### Como funciona e por quê

- **A mensagem de erro cita o nome e o motivo, nunca o valor.** Ex.: `DATABASE_URL (precisa ser uma URL postgresql://…)`. O valor pode ser uma senha, e a mensagem vai para o log.
- **Duas camadas:** o Zod valida cada variável sozinha. As regras que dependem do ambiente ("`localhost` só em desenvolvimento", "proibido em produção") rodam depois. Todos os erros saem juntos, para corrigir tudo de uma vez.
- **Padrão mais fechado:** sem configurar, não há CORS, não se confia em proxy nenhum, o `/docs` fica fechado e o limite de requisições fica ligado.
- **Variáveis desconhecidas são ignoradas:** o `api/.env` também guarda as do `docker-compose` (`POSTGRES_USUARIO`, `POSTGRES_SENHA`), que a API não usa.
- **O `api/.env.example` não fica para trás:** um teste confere que ele documenta todas as variáveis que a API lê.
- **Cobertura:** `src/config/` entrou na exigência de 90%. Ficou com 100% das linhas e 91% dos ramos. Também foi provado que a cobertura reprova abaixo do mínimo.

## Banco (T007)

### O que existe

- **Prisma 7** com o adaptador do PostgreSQL (`@prisma/adapter-pg`). O cliente é gerado em `api/src/generated/` (fora do Git) pelo `npm ci` e pelo `npm run db:gerar -w api`.
- **`api/prisma.config.ts`**: o Prisma 7 não lê o `.env` sozinho. Quando a `DATABASE_URL` não vem do ambiente, ela é lida do `api/.env`, sem sobrescrever o que já está definido (assim os testes usam a própria URL).
- **Primeira migration (`20261123180000_extensoes`):** extensões `unaccent` e `pg_trgm` e a função `public.f_unaccent`, `IMMUTABLE`, para a busca sem acentos com índice (Fase 4). O porquê e o rollback estão no próprio arquivo.
- **`api/src/shared/banco.ts`** (`criarBanco`): dois pools, cada um com o seu cliente do Prisma:

| Pool | Usado por | Limite da consulta | Conexões | Espera por conexão |
|---|---|---|---|---|
| `publico` | rotas do catálogo | 2 s | até 10 | 2 s |
| `administracao` | rotas da administração | 5 s | até 5 | 2 s |

- Nos dois, uma sessão parada no meio de uma transação por 10 s é encerrada pelo PostgreSQL (`idle_in_transaction_session_timeout`), para não segurar bloqueios.
- Um erro numa conexão ociosa (o banco caiu, a rede cortou) é sempre ouvido e vai para o log só com o pool e o tipo. Sem ouvinte, o `pg` derrubaria o processo.

- **`api/src/shared/erros-do-banco.ts`** (`traduzirErroDoBanco`): o resto da API nunca vê erro do Prisma nem do PostgreSQL.

| Erro do banco | Vira |
|---|---|
| Valor repetido (P2002, ou P2010 com `UniqueConstraintViolation` numa consulta direta) | `ErroDeConflito` (409), com os campos quando o Prisma os informa; nunca o nome do índice |
| Pool sem conexão livre em 2 s | `ErroIndisponivel` (503) |
| Banco fora do ar (P1001, P1002, falha ao iniciar, ou P2010 com `DatabaseNotReachable`) | `ErroIndisponivel` (503) |
| Consulta cortada pelo limite de tempo (código `57014` do PostgreSQL) | `ErroIndisponivel` (503) |
| Qualquer outro | segue como está e vira 500 neutro (T008) |

### Por quê

- **Dois pools:** é o único jeito de ter limites de tempo diferentes para o público e para a administração sem pagar um comando a mais por requisição. O limite vai na própria conexão.
- **Espera curta por conexão:** com o pool cheio, a pessoa recebe "indisponível, tente de novo" em 2 s, em vez de ficar presa até o tempo máximo da requisição.
- **Tamanho dos pools:** conexões ≈ requisições simultâneas × tempo da consulta ÷ tempo da requisição. Para 20 simultâneas, dá cerca de 7; 10 dá folga. Revisto na Fase 4 com o teste de carga.
- **Formatos de erro conferidos no banco real**, não supostos: a unicidade numa consulta direta chega como P2010 (e não P2002), e o pool esgotado chega como um erro do `pg`. Os dois viraram testes antes do código.
- **Contagem de consultas (`tests/apoio/contar-consultas.ts`):** base dos testes de N+1 das próximas fases. Ela só funciona com `registrarConsultas: true`, que fica desligado na API porque custa caro.

## Servidor, erros e logs (T008)

### O que existe

- **`api/src/app.ts` (`montarApp`):** monta o Fastify com os plugins, sem abrir a porta (isso fica para o `server.ts`, na T011). Os testes usam `app.inject`, sem rede.
- **Formato único de erro** (`src/plugins/erros.ts` e `src/shared/erros.ts`):

| Situação | Status | `erro` |
|---|---|---|
| Campo inválido, campo que o schema não conhece, JSON quebrado, `__proto__` no corpo | 400 | `validacao` (com `campos`, em português) |
| Rota ou recurso inexistente | 404 | `nao_encontrado` |
| Valor repetido | 409 | `conflito` (com o campo, quando se sabe) |
| Corpo acima de 100 KB | 413 | `muito_grande` |
| Corpo que não é JSON | 415 | `tipo_nao_suportado` |
| Banco indisponível | 503 | `indisponivel` |
| Qualquer outro | 500 | `erro_interno`, com mensagem neutra |

- **Identificador da requisição** (`src/plugins/request-id.ts`): toda resposta traz `x-request-id`. Um id recebido só é aceito se a conexão vier de um proxy de `TRUST_PROXY` e o valor for seguro; senão, é gerado um UUID.
- **Logs** (`src/plugins/logs.ts`): método, o **molde** da rota (`/convites/:token`, e não o caminho com os valores, que podem ser tokens; no 404, o caminho sem query string), id, IP, status e tempo. Num erro inesperado, da pilha vão só as linhas `at …`: a mensagem, que pode ter várias linhas com dados, fica de fora. Nunca cabeçalhos, corpo, cookie ou `set-cookie`. Nos objetos que a própria API registra, as chaves de senha, token, cookie e authorization viram `[ESCONDIDO]`, em qualquer profundidade.

### Por quê

- **Sem detalhe interno na resposta:** stack trace, SQL ou nome de tabela ajudam quem ataca, não quem usa.
- **Erro inesperado no log com tipo, id e pilha, mas sem a mensagem:** a mensagem de um erro do banco pode trazer e-mails e outros dados pessoais (LGPD). O id liga o log à reclamação de quem viu o erro.
- **Só JSON:** o Fastify aceita texto puro por padrão. Esse leitor foi removido, e outro formato recebe 415. Os envios de arquivo das próximas fases registram o próprio leitor.
- **Mensagens de validação em português** (`z.config(z.locales.ptBR())`): a tela mostra o erro de cada campo como veio da API.
- **Um defeito encontrado pelos testes:** o pino roda o mascarador *antes* dos serializadores. Copiar a requisição do Fastify perdia o `url` (um getter da classe), o serializador quebrava e a requisição ficava sem resposta. Agora o mascarador percorre só objetos simples e listas, e há um teste para o caso.

## Segurança das respostas (T009)

### O que existe (`api/src/plugins/seguranca.ts`)

| Proteção | Como |
|---|---|
| Cabeçalhos | HSTS (2 anos, com subdomínios), `X-Content-Type-Options: nosniff` e CSP fechada para JSON (`default-src 'none'; frame-ancestors 'none'`), pelo `@fastify/helmet`, em toda resposta, inclusive de erro |
| Cache | `Cache-Control: no-store` por padrão. Uma rota que declara o próprio cache (as públicas da Fase 4) mantém o dela |
| CORS | Só as origens exatas de `CORS_ORIGENS`, com credenciais e `Vary: Origin`. Origem fora da lista, `null` ou domínio parecido não recebem nenhum cabeçalho de CORS. Nunca `*` |
| Limite de requisições | `LIMITE_GERAL_POR_MIN` por IP, também nas rotas que não existem (contra varredura). Passou do limite: 429 `muitas_requisicoes` com `Retry-After` |
| IP do cliente | `trustProxy` só com a lista de `TRUST_PROXY`. Sem lista, o `X-Forwarded-For` é ignorado e vale o endereço da conexão |

### Por quê

- **CSP fechada até no JSON:** se alguém abrir uma resposta da API no navegador, nada nela roda nem pode ser posto num iframe.
- **`no-store`:** respostas da administração (Fase 1) não podem ficar guardadas no navegador ou num proxy.
- **CORS exato:** um site parecido (`bahiafalcao.com.br.exemplo.com`) ou um documento local (`null`) não conseguem chamar a API com as credenciais de quem está logado. O plugin mandava `Allow-Credentials` mesmo para origem recusada; agora nenhum cabeçalho de CORS sai sem origem permitida.
- **IP só do proxy confiável:** o limite de requisições (e, na Fase 1, o bloqueio de login e a auditoria) dependem do IP. Um `X-Forwarded-For` forjado não pode escolher o IP.
- **`montarApp` passou a ser assíncrona:** os plugins do Fastify só alcançam as rotas registradas depois que eles carregam. Esperar o carregamento garante que nenhuma rota fique sem limite, CORS ou cabeçalhos.

## Acesso obrigatório (T010)

### O que existe (`api/src/plugins/acesso.ts`)

- **Toda rota declara quem pode acessá-la** (`config: { acesso: "publico" | "logado" | "editor" | "admin" }`) **e o schema de resposta, com pelo menos uma resposta de sucesso (2xx).** Faltando algo, o servidor **não sobe**, e o erro cita a rota. Ex.: `Rota GET /teste/sem-acesso sem config.acesso`.
- **Exceções só numa lista fechada** (`EXCECOES_DO_SCHEMA_DE_RESPOSTA`), por método e URL exatos. Hoje só a consulta prévia do CORS (`OPTIONS *`). Um teste falha se a lista crescer, para a mudança passar por revisão.
- **Até a Fase 1 (login), rota que não é pública responde 401** `nao_autenticado`. A Fase 1 troca isso pela conferência da sessão e do papel. A recusa roda no `preParsing`: depois dos cabeçalhos de segurança, do CORS e do limite de requisições (que assim valem também para o 401) e antes de ler o corpo.
- **Só sai o que o schema de resposta declara:** um campo a mais devolvido pelo código (ex.: um hash de senha) não chega à resposta.
- **Matriz de autorização** (`api/tests/unit/app/matriz-de-autorizacao.test.ts`): todas as rotas da API × os papéis (anônimo, editor, administrador, desativado, sessão expirada), com o status esperado. **Rota nova sem entrada na matriz faz o teste falhar.**

### Por quê

- **Segurança por padrão:** esquecer o controle de acesso numa rota nova é um erro comum e grave. Aqui o esquecimento impede o servidor de subir, em vez de abrir a rota.
- **Prova na prática:** ao ligar a regra, as 5 rotas dos testes anteriores, que não declaravam acesso, foram recusadas citando cada uma. Elas passaram a declarar.
- **O registro vem antes do CORS:** o plugin de CORS cria uma rota (`OPTIONS *`). Registrada antes dele, a conferência também a vê.

## Saúde e servidor (T011)

### O que existe

| Rota | Para quê | Acesso | Limite de requisições |
|---|---|---|---|
| `GET /health/live` | O processo está de pé (não toca no banco) | público | fora (o monitor chama sempre) |
| `GET /health/ready` | O banco responde: 200 `{ status: "ok", banco: "ok" }`, ou 503 `indisponivel` | público | dentro |

- **Prontidão** (`src/modules/saude/prontidao.ts`): o banco precisa responder em até 1 s. O resultado vale por 2 s, e chamadas ao mesmo tempo esperam a mesma verificação.
- **`src/servidor.ts` (`iniciarServidor`):** lê a configuração, cria o banco, monta a API e abre a porta (`ENDERECO`, padrão `127.0.0.1`; `PORTA`, padrão 3333).
- **`src/server.ts`:** a porta de entrada do processo. Com configuração inválida, mostra as variáveis e sai com código 1. Com SIGTERM ou SIGINT, desliga com calma.
- **`src/desligamento.ts` (`criarDesligamento`):** espera o servidor terminar e sai com 0; se falhar, sai com 1; se passar de 8 s (uma requisição presa), força a saída com 1, para o gerenciador de processos reiniciar a API em vez de ela ficar pendurada. Os 8 s ficam abaixo dos 10 s que o Docker espera antes de matar o processo, então a saída forçada e o log dela acontecem antes. Um segundo sinal não encerra de novo.
- **Porta ocupada:** se a porta não abrir, o servidor fecha o que já tinha aberto, inclusive as conexões com o banco.
- **Comandos:** `npm run dev -w api` (desenvolvimento, lê o `api/.env`), `npm run build -w api` e `npm run start -w api` (versão compilada, em `api/dist/`).

### Por quê

- **Duas rotas de saúde:** o proxy e o monitor precisam saber se o processo está vivo (live) e se ele consegue atender (ready). Separar evita reiniciar a API só porque o banco caiu por um instante.
- **Prontidão guardada por 2 s, com uma verificação só por vez:** uma rajada no `/health/ready` não ocupa o pool de conexões, que é das pessoas.
- **Endereço padrão `127.0.0.1`:** na VPS, só o Caddy fala com a internet. A API não fica exposta por engano, e isso também protege o `X-Forwarded-For` (o IP real só vem do proxy).
- **Desligamento gracioso:** ao desligar, as requisições em andamento terminam e as conexões com o banco são fechadas. As respostas desse momento saem com `Connection: close`; sem isso, a conexão mantida aberta pelo cliente (keep-alive) segurava o desligamento até expirar.
- **Provado:** o teste de integração sobe o servidor de verdade, chama as rotas pela rede e desliga no meio de uma requisição presa (ela termina com 200, conexão nova é recusada e o banco é fechado). A requisição avisa quando chegou e só termina quando o teste libera, sem esperas por tempo. A versão compilada também foi conferida à mão: sem configuração, sai com código 1 citando as variáveis; com configuração, responde com todos os cabeçalhos de segurança.

## Review-gate da fundação (T012)

A primeira rodada dos quatro revisores reprovou (backend e segurança), com dois achados Altos e vários Médios. Tudo foi corrigido com teste antes, menos um teste de caracterização (conexão nova recusada no desligamento), que passou de primeira porque o comportamento já existia (contagem na T012 do `tasks.md`):

| Achado | Correção |
|---|---|
| O 401 saía no `onRequest`, antes dos cabeçalhos de segurança, do CORS e do limite de requisições | A recusa passou para o `preParsing` |
| O check-lock só olhava os pacotes novos: um pacote antigo trocado por outro endereço passava | O lockfile inteiro é conferido sem rede (registro do npm, integridade sha512, versão), e o mesmo `nome@versão` com outro endereço ou integridade conta como alterado. O passo roda **antes** do `npm ci`, com o node puro |
| Banco fora do ar ou consulta cortada por tempo viravam 500 | Viram 503 `indisponivel` (formatos conferidos no banco real) |
| Mensagem de erro de várias linhas ia para o log junto com a pilha | Só as linhas `at …` da pilha vão para o log |
| O desligamento não tinha limite de tempo e o teste usava esperas por tempo | `src/desligamento.ts`, com saída forçada em 8 s; teste com promessas controladas |
| O README recomendava `Domain=` no cookie e "confiar nos IPs da Vercel" | `__Host-sessao` nas duas opções; a Vercel não tem IPs fixos, então o IP real depende de um cabeçalho secreto |

A segunda rodada aprovou em desempenho, qualidade e backend, e reprovou em segurança: o revisor contornou o check-lock. Correções, um commit por achado:

| Achado | Correção |
|---|---|
| Alto: uma entrada podia apontar para o tarball de **outro** pacote do registro (ou de outra versão do mesmo, escapando da idade mínima), com a integridade verdadeira dele | O `resolved` precisa ser exatamente `https://registry.npmjs.org/<nome>/-/<nome-sem-escopo>-<versão>.tgz` |
| Médio: a marca `inBundle` do lockfile dispensava a conferência | A marca só vale para entrada sem `resolved` nem `integrity` cujo ancestral fora do bundle declare `bundleDependencies` |
| Lockfile de outro formato, sem `packages` ou com chave estranha fora de `node_modules/` | Recusados com mensagem clara |
| Banco reiniciando, cheio ou com a conexão caída ainda dava 500 | Viram 503: `P1008`, `P1017`, `P2037`, os tipos `ConnectionClosed`, `SocketTimeout` e `TooManyConnections`, os códigos `57P01`, `57P02`, `57P03`, `53300` e a classe `08`, e as quedas de conexão do `pg`. Provado no banco real com `pg_sleep`, banco inalcançável e `pg_terminate_backend` |
| `TRUST_PROXY=::ffff:0:0/96` confiava em todo IPv4 | Faixa IPv6 que cubra o IPv4 mapeado precisa de `/104` |
| O log do erro inesperado perdia o código; uma linha da mensagem podia imitar a pilha | O log leva `codigo` e `codigoDoBanco` (não sensíveis); o cabeçalho `Nome: mensagem` sai inteiro antes do filtro |
| Testes de desligamento com corrida e sem limpeza garantida | Aceitam recusada, cortada ou 503; limpeza no `finally`; o teste prova que o banco segue aberto enquanto a requisição está presa |
| Desligamento forçado em 10 s, igual ao prazo do `docker stop` | 8 s |
| Conferência CA7.6 enganada por comentário; permissões de escrita fora do topo e gatilhos perigosos não conferidos | Regras num módulo testado (`api/scripts/workflows.ts`): comentários descartados só fora de aspas; escrita recusada em qualquer formato; `uses` conferido em qualquer lugar da linha; escapes `\u`/`\x` recusados; `pull_request_target` e `workflow_run` recusados |

- **Prova por mutação:** cada ramo do `request-id` e do cache da prontidão foi quebrado de propósito, e algum teste ficou vermelho em todos. Uma mutação sobreviveu por ser equivalente (a guarda `versao !== 0` era redundante e saiu). Outra mostrou que nenhum teste conferia o limite de 1 s da prontidão, e o teste ganhou relógio controlado.
- **Cobertura:** passou a incluir `src/app.ts`, `src/servidor.ts` e `src/desligamento.ts`. Linhas, comandos e funções estão em 100%, e ramos em 96%. Os ramos restantes são valores de reserva que o TypeScript estrito exige e que não acontecem na prática (ex.: erro sem `stack`).

A terceira rodada aprovou em desempenho, qualidade e backend, e reprovou em segurança: o revisor forjou o campo `name` de uma entrada do lockfile. Correções, um commit por achado:

| Achado | Correção |
|---|---|
| Alto: o `name` da entrada vem do próprio lockfile; com ele forjado, o tarball de outro pacote voltava a passar | Um `name` diferente da pasta só vale quando algum pacote declara `"pasta": "npm:name@faixa"`. Também: `name` pelas regras do npm e versão em semver estrito |
| A conferência CA7.6 não tinha teste e deixava passar `write` entre aspas e em chaves | Regras num módulo testado (`api/scripts/workflows.ts`), com 17 casos |
| Regra do bundle mais frouxa que a do npm | Exige versão, nome declarado por quem empacota (ou por outra entrada do bundle) e empacotador instalado, nunca raiz nem workspace |
| Data de publicação inválida passava pela idade mínima | Recusada; a data só vem da chave própria do registro e em texto |
| Pilha que não começa por `Nome: mensagem` voltava ao filtro antigo | Fica fora do log, marcada `pilhaDescartada` (falha fechada) |
| Testes de integração que podiam passar pelo caminho errado ou ficar pendurados | 57P01 conferido no erro cru; espera com prazo; limpeza em `finally`; qualquer saída menos 2xx |

O commit grande da primeira rodada (`e5c4ca9`) foi dividido em 14 commits, um por assunto, com o conteúdo final idêntico.

A quarta rodada aprovou em desempenho, qualidade e backend, e reprovou em segurança: a declaração `npm:` exigida na rodada 3 também vinha do lockfile, que o atacante controla. Correções, um commit por achado:

| Achado | Correção |
|---|---|
| Alto: bastava declarar o apelido em qualquer entrada do lockfile (ou na de um workspace, que o npm nem lê) | Um par (pasta, `name`) diferente só vale se já existia no lockfile da base (a `main`) ou se está no `allowAliases` do `package.json` da raiz, revisado num diff pequeno. A lista começa com os três `*-cjs` de hoje |
| A CA7.6 ainda deixava passar chave entre aspas, valor na linha de baixo, âncora, tag e chave complexa | A regra falha fechado: recusa a palavra `write` em qualquer lugar fora de comentário e os recursos do YAML que escreveriam o mesmo de outro jeito. É uma heurística rígida; o controle de verdade é a proteção da `main` (D19) |
| Uma mensagem encurtada depois de lida a pilha ainda deixava passar uma linha que imita a pilha | Só entram quadros reais, terminados em `arquivo:linha:coluna` |
| `bundleDependencies: true` aceito, mas o npm só entende lista | `true` conta como "não empacota"; entrada em bundle com `name` trocado é recusada |
| Teste de desligamento que aceitava qualquer saída menos 2xx | Lista exata: `ECONNREFUSED`, `ECONNRESET`, `UND_ERR_SOCKET` ou 503 |

A quinta rodada aprovou em desempenho, qualidade e backend, e reprovou em segurança por um caminho novo para a mesma troca de pacote: o link. Correções, um commit por achado:

| Achado | Correção |
|---|---|
| Alto: o check-lock pulava toda entrada `link`; com duas linhas no lockfile, o `npm ci` punha o código de outro pacote na pasta | Um link só vale do jeito que o npm cria para os workspaces: em `node_modules/<nome>`, na raiz, apontando para a pasta de um workspace declarado cujo `name` é `<nome>`, sem outros campos |
| Dentro de aspas duplas, uma barra invertida no fim da linha juntava duas linhas e escondia `write` ou um gatilho proibido | Barra invertida dentro de aspas duplas e texto entre aspas em várias linhas são recusados |
| `persist-credentials: false` conferido por contagem (valia em outro passo ou num bloco `run`) | Precisa estar no passo do próprio checkout, reconhecido com qualquer caixa |
| `allowAliases` aceitava valor que não é texto; `Write` com maiúscula passava | Só pares de nomes do npm em texto; a escrita é procurada sem diferenciar maiúsculas. O check-lock destaca cada apelido novo vindo da lista |

A sexta rodada foi **aprovada pelos quatro revisores**, sem Crítico nem Alto. Foram corrigidos o Médio e os Baixos baratos:

| Achado | Correção |
|---|---|
| Médio: a lista de workspaces que autoriza um link vinha do próprio lockfile; bastava acrescentar uma pasta (até fora do repositório) e apontar um link para ela | Vale a lista do `package.json` da raiz, que o npm usa; o lockfile precisa declarar a mesma, e pasta absoluta, com `..`, `\` ou `:` é recusada |
| O aviso de apelido novo ficava sem teste e só no log | Virou a função pura `apelidosNovosDaLista`, testada, e sai também como `::warning::` na aba do PR |
| Checkout fora de um passo da lista; `-` sozinho na linha | Recusados |

