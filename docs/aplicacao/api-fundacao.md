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
