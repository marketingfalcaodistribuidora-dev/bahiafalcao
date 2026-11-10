# Tarefas 001: Página de links para o Instagram

- **Plano:** [plan.md](./plan.md)

## Fase 1: Preparação
- [x] T001 Separar layouts: mover a home para `app/(site)/` com layout próprio; `npm run check` verde

## Fase 2: Testes (vermelho)
- [x] T002 [P] `app/links/page.test.tsx`: CA1.1 a CA1.7 e metadados (falharam: página inexistente)
- [x] T003 [P] `app/sitemap.test.ts`: sitemap só com a página inicial, sem `/links`
  - Desvio: passou de primeira, porque o sitemap já estava correto. Mantido como teste de regressão.

## Fase 3: Implementação (verde)
- [x] T004 Dados em `site.ts` (TikTok, Perfil do Google, mensagem do Instagram) e ícone TikTok
- [x] T005 `app/links/page.tsx` até T002 passar (61 testes verdes)

## Fase 4: Refatoração e acabamento
- [x] T006 Visual conferido no celular (captura de tela), acessibilidade e SEO
  - Observação: o servidor de desenvolvimento ficou com cache antigo (OneDrive) e precisou ser reiniciado.

## Fase 5: Verificação
- [x] T007 `npm run check` verde
- [x] T008 Critérios de aceite conferidos: CA1.1 a CA1.7 cobertos por testes; `noindex, follow` e canonical `/links` no HTML gerado
