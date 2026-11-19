# Especificações (SDD)

Esta pasta guarda o **Spec-Driven Development** do projeto, baseado no [GitHub spec-kit](https://github.com/github/spec-kit). A especificação é o artefato principal e o código é a expressão dela.

## Estrutura

```
specs/
  constitution.md          princípios inegociáveis (leia antes de tudo)
  _templates/              modelos de spec, plano e tarefas
  001-nome-da-feature/
    spec.md                O QUÊ e POR QUÊ: histórias de usuário e critérios de aceite
    plan.md                COMO: decisões técnicas, arquivos afetados, estratégia de testes
    tasks.md               tarefas pequenas e ordenadas (testes antes do código)
    research.md            (opcional) pesquisas e comparações
```

## Fluxo

| Fase | Comando | Saída | Portão para avançar |
|---|---|---|---|
| 1. Especificar, planejar e listar tarefas | `/sdd-feature <descrição>` | `spec.md`, `plan.md`, `tasks.md` | Revisores de segurança e performance sem Crítico nem Alto; usuário aprova |
| 2. Implementar | `/tdd-cycle T0NN` | código e testes | Teste falhando antes de cada código |
| 3. Revisar | `/review-gate` (API) | relatório consolidado | Os quatro revisores aprovam |
| 4. Verificar | `/verificar` | `npm run check` verde | Definition of Done cumprida |

Numeração: `000`, `001`, `002`, ... na ordem de criação. Nome da pasta em português, minúsculo, com hífens.

As specs da API do catálogo (`api/`) usam os modelos da skill `sdd-feature` e seguem também o `api/CLAUDE.md`; a fonte das regras de negócio é `docs/especificacao.md`.
