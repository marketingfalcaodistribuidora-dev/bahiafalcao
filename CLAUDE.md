# Falcão Distribuidora: site institucional

Distribuidora de autopeças e ferramentas para **linha pesada** (caminhões, carretas e veículos pesados) em **Feira de Santana, BA**, desde 2006. O objetivo do site é **ranquear bem no Google** (SEO técnico e local) e **gerar contatos pelo WhatsApp**. Nesta fase não há catálogo: todo CTA de "catálogo" do design vira link de WhatsApp.

## Estrutura

```
frontend/   Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 (workspace npm)
packages/   código compartilhado (workspaces npm):
  catalogo-dominio/  regras do catálogo e do painel: Prisma + PostgreSQL, sigilo, permissões, busca, SEO, importação
  texto-formatado/   formatação segura dos textos livres (negrito, listas, subtítulos)
admin/      painel do administrador (Next.js), a criar (plano 003); usa packages/catalogo-dominio
api/        API pública do catálogo (Fastify), a criar (plano 002); usa packages/catalogo-dominio
infra/      banco local em Docker (infra/dev, porta 5433) e, no futuro, a VPS
backend/    vazio; a arquitetura aprovada usa packages/, admin/ e api/ (ver backend/CLAUDE.md)
specs/      SDD: constituição, modelos e uma pasta por funcionalidade (spec, plano, tarefas)
docs/       design de referência (docs/design, SOMENTE LEITURA) e documentação
.claude/    agentes, skills, hooks e permissões do Claude Code
```

## Formas de trabalho (leia `specs/constitution.md`)

| Situação | Fluxo |
|---|---|
| Funcionalidade nova, várias telas ou arquivos, regra de negócio, backend | **SDD** → `/sdd especificar ...`, depois `planejar`, `tarefas` e `implementar` |
| Qualquer lógica, bug ou mudança de comportamento | **TDD** → `/tdd ...` (teste falhando antes do código, sempre) |
| Seção visual do design sem lógica | `/implementar-secao` (testes só para a parte interativa) |
| Ajuste pequeno de texto ou estilo | direto, e depois `/verificar` |

- **TDD é inegociável para lógica:** nenhum código de produção sem um teste que falhou antes (Vermelho → Verde → Refatorar).
- **Testes no estilo Google:** comportamento pela API pública, dado/quando/então, sem lógica no teste, DAMP > DRY, e pirâmide de ~70% pequenos, 20% médios e 10% grandes.
- **SDD:** a spec diz o quê e por quê; o plano diz como; as tarefas põem o teste antes do código. Fases com portão só avançam com aprovação do usuário.

## Comandos (sempre na raiz)

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento em http://localhost:3000 |
| `npm run build` | build de produção |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` / `npm run test:watch` | testes (Vitest + Testing Library) / modo observação |
| `npm run test:coverage` | cobertura de testes |
| `npm run format` | Prettier em tudo |
| `npm run check` | portão completo: formatação, lint, tipos, testes e build |
| `npm run db:subir` / `npm run db:descer` | banco local em Docker (necessário para os testes do catálogo) |
| `npm run importar -w packages/catalogo-dominio -- --origem "<pasta>"` | carga inicial do catálogo extraído (relatório em `importacao-relatorios/`, fora do Git) |

## Regras do projeto

- **Fonte única de dados:** nome, endereço, contatos, título e descrição ficam em `frontend/src/lib/site.ts`. Nunca duplique esses dados. Links de WhatsApp sempre via `whatsappLink()`.
- **Design:** a referência visual está em `docs/design/<pagina>/*.dc.html`. Replique os valores finais do CSS; nunca edite essa pasta.
- **Estilo:** use os tokens do Tailwind definidos em `frontend/src/app/globals.css` (`preto`, `grafite`, `ouro`, `off`, `wpp`, `font-titulo`, `font-texto`...), não cores hex soltas.
- **SEO é requisito, não extra:** cada página tem title e description únicos, canonical, um único `h1`, imagens via `next/image` com `alt`, e entra no sitemap. Mudou conteúdo ou rota? Consulte o agente `seo-specialist`.
- **Server Components por padrão;** `"use client"` só onde houver interação.
- **Segurança:** segredos só em `.env.local` (nunca no Git, nunca em `NEXT_PUBLIC_*`). Links externos com `rel="noopener"`.
- **Idioma:** textos do site, comentários e respostas em português do Brasil.
- **Escopo:** faça só o que foi pedido. Se o usuário pedir configuração, não desenvolva funcionalidades.
- **Antes de dizer "pronto":** rode `/verificar` (ou `npm run check`).

## Agentes (`.claude/agents/`)

- `seo-specialist`: SEO técnico, local e Core Web Vitals.
- `frontend-engineer`: implementação fiel do design em Next.js e Tailwind.
- `backend-architect`: planejamento e construção do backend.
- `test-engineer`: testes primeiro (TDD), reprodução de bugs e estratégia de testes.
- `code-reviewer`: revisão de mudanças (somente leitura).
- `security-auditor`: auditoria de segurança e LGPD (somente leitura).

## Skills (`/nome`)

`/sdd`, `/tdd`, `/implementar-secao`, `/nova-pagina`, `/auditoria-seo`, `/verificar`, `/pre-deploy`

## Ambiente

Windows + PowerShell, Node 26. O projeto está dentro do OneDrive: erros `EPERM` em `node_modules` ou `.next` costumam ser bloqueio de sincronização.
