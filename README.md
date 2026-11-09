# Falcão Distribuidora: site

Site institucional da Falcão Distribuidora (autopeças para linha pesada em Feira de Santana, BA).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `frontend/` | Site em Next.js 16, TypeScript e Tailwind CSS v4 |
| `backend/` | Reservado para o futuro backend |
| `docs/design/` | Design de referência exportado do Claude Design (somente leitura) |
| `.claude/` | Agentes, skills, hooks e permissões do Claude Code |

## Como rodar

Requer Node.js 22 ou superior (recomendado: 26, veja `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:3000
```

Outros comandos: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format` e `npm run check` (todos juntos).

## Configuração

1. Copie `frontend/.env.example` para `frontend/.env.local` e ajuste o domínio.
2. Preencha WhatsApp, telefone, Instagram e horário em `frontend/src/lib/site.ts`.
