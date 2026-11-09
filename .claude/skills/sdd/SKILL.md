---
name: sdd
description: Spec-Driven Development (SDD) no estilo do GitHub spec-kit, em quatro fases com portões de aprovação (especificar → planejar → tarefas → implementar). Use para funcionalidades novas, mudanças que afetam vários arquivos, novas páginas com regra de negócio, catálogo e qualquer trabalho de backend. Não use para ajustes pequenos de texto ou estilo.
argument-hint: "especificar <descrição> | planejar <NNN> | tarefas <NNN> | implementar <NNN> | status"
---

# SDD: desenvolvimento guiado por especificação

Comando: **$ARGUMENTS**

Baseado no [GitHub spec-kit](https://github.com/github/spec-kit): a especificação é o artefato principal e o código é a expressão dela. **Leia `specs/constitution.md` antes de qualquer fase.** Modelos em `specs/_templates/`.

Identifique a fase pelo primeiro argumento. Se nenhum for informado, rode `status` e sugira o próximo passo.

---

## Fase 1: `especificar <descrição>`
1. Descubra o próximo número livre em `specs/` (001, 002...) e crie `specs/NNN-nome-curto/spec.md` a partir de `specs/_templates/spec.md`.
2. Escreva **O QUÊ e POR QUÊ**: contexto, usuários, histórias de usuário com critérios de aceite **Dado / Quando / Então**, requisitos não funcionais (SEO, desempenho, acessibilidade, LGPD) e o que fica fora do escopo.
3. **Nada de como:** sem tecnologia, nomes de arquivos, componentes ou código.
4. **Não adivinhe.** Toda ambiguidade vira `[PRECISA ESCLARECER: pergunta específica com opções]`.
5. **Esclarecer:** faça ao usuário as perguntas pendentes (até 5 por rodada, as de maior impacto primeiro, com opções e uma recomendação). Atualize a spec com as respostas.
6. **Portão:** preencha o checklist da spec. Só avance com zero `[PRECISA ESCLARECER]` e com **aprovação explícita do usuário**; aí marque `Status: Aprovada`.

## Fase 2: `planejar <NNN>`
1. Exige a spec aprovada. Crie `plan.md` a partir do modelo.
2. Preencha os **portões da constituição**. Se algum não for atendido, justifique em "Complexidade justificada" ou simplifique.
3. Defina a abordagem técnica (com alternativas descartadas), os arquivos afetados, os contratos e dados e a **estratégia de testes, mapeando cada critério de aceite para pelo menos um teste**.
4. Para pesquisa extensa (bibliotecas, APIs), crie `research.md` e cite as fontes.
5. Consulte os agentes conforme o caso: `seo-specialist` (páginas e conteúdo), `backend-architect` (backend), `security-auditor` (dados pessoais e rotas públicas).
6. **Portão:** apresente o plano resumido e peça aprovação. Decisões de stack são do usuário.

## Fase 3: `tarefas <NNN>`
1. Exige o plano aprovado. Crie `tasks.md` a partir do modelo.
2. Tarefas pequenas (até ~30 min), numeradas `T001...`, na ordem: preparação → **testes (vermelho)** → implementação (verde) → refatoração e acabamento → verificação.
3. Toda tarefa de implementação vem **depois** da tarefa do teste correspondente. Marque com `[P]` as que podem rodar em paralelo.
4. **Análise de consistência:** confira que todo critério de aceite tem teste e tarefa, que toda tarefa remete a um requisito e que não há contradição entre spec, plano e tarefas. Reporte qualquer lacuna antes de seguir.

## Fase 4: `implementar <NNN>`
1. Exige `tasks.md`. Execute as tarefas **na ordem**, cada uma com a skill **`/tdd`** (Vermelho → Verde → Refatorar).
2. Marque `[x]` em cada tarefa concluída e registre desvios no próprio `tasks.md`.
3. Se descobrir que a spec ou o plano estão errados, **pare**, atualize o documento e peça confirmação. Nunca deixe o código divergir da spec em silêncio.
4. Ao final: `/verificar` verde, revisão com o agente `code-reviewer` e conferência, um a um, dos critérios de aceite da spec.

## `status`
Liste as pastas em `specs/` com a fase atual de cada uma (spec, plano, tarefas, % de tarefas concluídas) e o próximo passo recomendado.

---

**Regra de ouro:** fases com portão não avançam sem aprovação do usuário. Responda em português do Brasil.
