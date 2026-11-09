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
| 1. Especificar | `/sdd especificar <descrição>` | `spec.md` | Nenhum `[PRECISA ESCLARECER]` aberto; usuário aprova |
| 2. Planejar | `/sdd planejar NNN` | `plan.md` | Passa nos portões da constituição; usuário aprova |
| 3. Tarefas | `/sdd tarefas NNN` | `tasks.md` | Cada critério de aceite coberto por um teste |
| 4. Implementar | `/sdd implementar NNN` | código e testes | Cada tarefa feita com `/tdd`; `npm run check` verde |

Numeração: `001`, `002`, ... na ordem de criação. Nome da pasta em português, minúsculo, com hífens.
