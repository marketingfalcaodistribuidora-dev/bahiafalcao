# Backend (pasta não usada)

Esta pasta foi reservada no início do site, mas a arquitetura aprovada no
[plano 003](../specs/003-painel-administrador/plan.md) (§2.1) organiza o backend assim:

- `packages/catalogo-dominio/`: todas as regras (Prisma, PostgreSQL, sigilo, permissões, busca, SEO, importação), num lugar só;
- `admin/`: painel do administrador (Next.js), que usa o domínio direto, no servidor;
- `api/`: API pública do catálogo (Fastify), que também usa o domínio.

Motivo: o painel e a API precisam das mesmas regras; com um pacote compartilhado, o sigilo do código
interno não pode divergir entre os dois e não é preciso expor rotas do painel na internet.

Não crie código aqui. Decisão confirmada pelo responsável em 2026-11-11.
