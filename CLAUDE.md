# Falcão Distribuidora: site institucional e catálogo

Distribuidora de autopeças e ferramentas para **linha pesada** (caminhões, carretas e veículos pesados) em **Feira de Santana, BA**, desde 2006.

- **Site:** o objetivo é **ranquear bem no Google** (SEO técnico e local) e **gerar contatos pelo WhatsApp**. Enquanto o catálogo não estiver no ar, todo CTA de "catálogo" do design vira link de WhatsApp.
- **Catálogo (em construção):** a API fica em `api/` e segue o `api/CLAUDE.md`. O front do catálogo vem depois, em `frontend/`.

## Estrutura

```
frontend/   site: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 (workspace npm)
api/        API do catálogo: Fastify + Zod + Prisma + PostgreSQL. Regras próprias em api/CLAUDE.md
specs/      SDD: constituição, modelos e uma pasta por funcionalidade (000 = fundação da API, 001 = página de links)
docs/       especificacao.md (fonte das regras do catálogo), decisoes-em-aberto.md, dependencias.md,
            design/ (referência do site, SOMENTE LEITURA) e aplicacao/ (documentação do que existe)
.claude/    agentes, skills, hooks e permissões do Claude Code
```

## Formas de trabalho (leia `specs/constitution.md`; para a API, também `api/CLAUDE.md`)

| Situação | Fluxo |
|---|---|
| Funcionalidade nova, várias telas ou arquivos, regra de negócio, qualquer coisa da API | **SDD** → `/sdd-feature <descrição>` (spec, plan e tasks) e aprovação do responsável |
| Qualquer lógica, bug ou mudança de comportamento | **TDD** → `/tdd-cycle ...` (teste falhando antes do código, sempre) |
| Fim de tarefa ou funcionalidade da API | `/review-gate` (quatro revisores) |
| Instalar ou atualizar qualquer pacote (site ou API) | `/dependency-check` antes, e aprovação |
| Seção visual do design do site, sem lógica | `/implementar-secao` (testes só para a parte interativa) |
| Ajuste pequeno de texto ou estilo | direto, e depois `/verificar` |

- **TDD é inegociável para lógica:** nenhum código de produção sem um teste que falhou antes (Vermelho → Verde → Refatorar).
- **Testes no estilo Google:** comportamento pela API pública, dado/quando/então, sem lógica no teste, DAMP > DRY.
- **SDD:** a spec diz o quê e por quê; o plano diz como; as tarefas põem o teste antes do código. Fases com portão só avançam com aprovação do usuário.

## Comandos (sempre na raiz)

| Comando | O que faz |
|---|---|
| `npm run dev` | site em http://localhost:3000 |
| `npm run build` | build de produção |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` / `npm run test:watch` | testes (Vitest + Testing Library) / modo observação |
| `npm run test:coverage` | cobertura de testes |
| `npm run format` | Prettier em tudo |
| `npm run check` | portão completo: formatação, lint, tipos, testes e build |

Os comandos da API (`-w api`) estão no `api/CLAUDE.md`.

## Regras do projeto

- **Fonte única de dados:** nome, endereço, contatos, título e descrição ficam em `frontend/src/lib/site.ts`. Nunca duplique esses dados. Links de WhatsApp sempre via `whatsappLink()`.
- **Design:** a referência visual do site está em `docs/design/<pagina>/*.dc.html`. Replique os valores finais do CSS; nunca edite essa pasta. O catálogo segue os tokens de `docs/especificacao.md`.
- **Estilo:** use os tokens do Tailwind definidos em `frontend/src/app/globals.css` (`preto`, `grafite`, `ouro`, `off`, `wpp`, `font-titulo`, `font-texto`...), não cores hex soltas.
- **SEO é requisito, não extra:** cada página tem title e description únicos, canonical, um único `h1`, imagens via `next/image` com `alt`, e entra no sitemap. Mudou conteúdo ou rota? Consulte o agente `seo-specialist`.
- **Server Components por padrão;** `"use client"` só onde houver interação.
- **Segurança:** segredos só em `.env.local` / `api/.env` (nunca no Git, nunca em `NEXT_PUBLIC_*`). Links externos com `rel="noopener"`.
- **Repositório público:** nenhum dado real do catálogo, segredo ou dado pessoal no Git.
- **Dependências:** versões exatas e o protocolo `/dependency-check` antes de cada pacote novo.
- **Idioma:** textos do site, comentários e respostas em português do Brasil.
- **Escopo:** faça só o que foi pedido. Se o usuário pedir configuração, não desenvolva funcionalidades.
- **Documentação contínua:** ao terminar cada parte, atualize `docs/aplicacao/` (o quê, como e por quê) junto com o código, antes do commit.
- **Antes de dizer "pronto":** rode `/verificar` (ou `npm run check`).

## Agentes (`.claude/agents/`)

- **Site:**
  - `seo-specialist`: SEO técnico, local e Core Web Vitals.
  - `frontend-engineer`: implementação fiel do design em Next.js e Tailwind.
- **API do catálogo, revisores (somente leitura, veredito APROVADO/REPROVADO):**
  - `backend-reviewer`;
  - `security-reviewer`;
  - `performance-reviewer`;
  - `quality-reviewer`;
  - `frontend-reviewer` (só na fase do front do catálogo).
- **API do catálogo, execução:**
  - `spec-writer`: escreve spec, plan e tasks;
  - `test-writer`: escreve só os testes que falham.

## Skills (`/nome`)

- **Gerais:** `/sdd-feature`, `/tdd-cycle`, `/dependency-check`, `/verificar`.
- **API:** `/secure-endpoint`, `/prisma-migration`, `/search-tuning`, `/review-gate`.
- **Site:** `/implementar-secao`, `/nova-pagina`, `/auditoria-seo`, `/pre-deploy`.

## Ambiente

Windows + PowerShell, Node 26 (LTS "Lithium"). O projeto está dentro do OneDrive: erros `EPERM` em `node_modules` ou `.next` costumam ser bloqueio de sincronização. O Docker Desktop é necessário para os testes da API (Testcontainers).
