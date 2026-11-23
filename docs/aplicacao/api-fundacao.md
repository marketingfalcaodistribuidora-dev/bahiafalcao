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
