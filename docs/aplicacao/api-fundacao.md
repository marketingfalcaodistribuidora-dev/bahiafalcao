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
| `api/scripts/conferir-esteira.sh` | No CI: npm ≥ 11.20, `.npmrc` ativo, nenhum `^`/`~`, nenhuma flag que desligue a proteção de scripts e nenhum SQL montado com texto nem `eslint-disable` em `api/src`. |
| `api/scripts/check-lock.ts` | No CI, quando o lockfile muda: cada pacote novo ou alterado (inclusive os indiretos) passa pelo protocolo. Recusa versão com menos de 7 dias, falha alta, crítica ou de gravidade desconhecida, origem fora do registro do npm e script de instalação fora do `allowScripts`. Falha moderada ou baixa vira aviso. |
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
| `npx tsx api/scripts/check-lock.ts <lock-anterior> <lock-novo>` | Confere os pacotes novos ou alterados entre dois lockfiles |

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
| `TRUST_PROXY` | IPs ou faixas CIDR; `true` e número de saltos recusados | nenhum (usa o IP da conexão) |
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

- **`api/src/shared/erros-do-banco.ts`** (`traduzirErroDoBanco`): o resto da API nunca vê erro do Prisma nem do PostgreSQL.

| Erro do banco | Vira |
|---|---|
| Valor repetido (P2002, ou P2010 com `UniqueConstraintViolation` numa consulta direta) | `ErroDeConflito` (409), com os campos quando o Prisma os informa; nunca o nome do índice |
| Pool sem conexão livre em 2 s | `ErroIndisponivel` (503) |
| Qualquer outro | segue como está e vira 500 neutro (T008) |

### Por quê

- **Dois pools:** é o único jeito de ter limites de tempo diferentes para o público e para a administração sem pagar um comando a mais por requisição. O limite vai na própria conexão.
- **Espera curta por conexão:** com o pool cheio, a pessoa recebe "indisponível, tente de novo" em 2 s, em vez de ficar presa até o tempo máximo da requisição.
- **Tamanho dos pools:** conexões ≈ requisições simultâneas × tempo da consulta ÷ tempo da requisição. Para 20 simultâneas, dá cerca de 7; 10 dá folga. Revisto na Fase 4 com o teste de carga.
- **Formatos de erro conferidos no banco real**, não supostos: a unicidade numa consulta direta chega como P2010 (e não P2002), e o pool esgotado chega como um erro do `pg`. Os dois viraram testes antes do código.
- **Contagem de consultas (`tests/apoio/contar-consultas.ts`):** base dos testes de N+1 das próximas fases. Ela só funciona com `registrarConsultas: true`, que fica desligado na API porque custa caro.
