# Tarefas NNN: [Nome da funcionalidade]

- **Plano:** [plan.md](./plan.md)

> Regras:
> - Cada tarefa é pequena (até ~30 min) e termina com os testes verdes.
> - **O teste vem antes do código**: toda tarefa de implementação é precedida pela tarefa do teste que falha.
> - `[P]` marca tarefas independentes que podem ser feitas em paralelo.
> - Marque `[x]` ao concluir e anote desvios.

## Fase 1: Preparação
- [ ] T001 ...

## Fase 2: Testes (vermelho)
- [ ] T002 [P] Teste para CA1.1 em `...test.tsx` (deve falhar)
- [ ] T003 [P] Teste para CA1.2 em `...test.tsx` (deve falhar)

## Fase 3: Implementação (verde)
- [ ] T004 Implementar ... até T002 passar
- [ ] T005 Implementar ... até T003 passar

## Fase 4: Refatoração e acabamento
- [ ] T006 Refatorar mantendo os testes verdes
- [ ] T007 SEO e acessibilidade (revisar com `seo-specialist`)

## Fase 5: Verificação
- [ ] T008 `npm run check` verde
- [ ] T009 Revisão pelo `code-reviewer`
- [ ] T010 Todos os critérios de aceite da spec conferidos
