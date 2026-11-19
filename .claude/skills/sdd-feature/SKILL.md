---
name: sdd-feature
description: Spec-Driven Development de uma funcionalidade: gera specs/NNN-nome/ com spec.md (o quê e por quê), plan.md (como) e tasks.md (tarefas com o teste antes do código), e para para aprovação. Use para toda funcionalidade nova da API do catálogo (api/) e para funcionalidades do site com regra de negócio, mais de um arquivo ou backend. Não use para ajuste pequeno de texto ou estilo.
argument-hint: "<descrição da funcionalidade> | status"
---

# SDD: especificação antes do código

Leia antes: `specs/constitution.md` e, para a API, `api/CLAUDE.md` e `docs/especificacao.md` (fonte principal das regras de negócio).

## Passos

1. **Número e pasta:** o próximo número livre em `specs/` (`000`, `001`, `002`...) e `specs/NNN-nome-curto/` (português, minúsculo, com hífens).
2. **`spec.md`** a partir de [modelos/spec.md](modelos/spec.md):
   - objetivo e regras de negócio, cada uma com a seção de `docs/especificacao.md` de onde vem;
   - fora de escopo;
   - critérios de aceite em **Dado / Quando / Então**, numerados `CAx.y`, cobrindo obrigatoriamente:
     - **caminho feliz;**
     - **validação** (cada campo e limite);
     - **permissão de cada papel:** anônimo, editor, administrador, usuário desativado, sessão expirada;
     - **concorrência** (duas pessoas ao mesmo tempo, repetição do mesmo pedido);
     - **limites** (tamanho, quantidade, paginação, taxa);
     - **falhas externas** (banco fora, e-mail fora, disco cheio);
   - requisitos de segurança e de performance com número (ex.: "busca p95 < 300 ms com 10.000 produtos").
3. **Não invente regra de negócio.** O que faltar ou divergir entre a especificação e o prompt vira uma linha em `docs/decisoes-em-aberto.md` e uma pergunta ao responsável (no máximo 4 por rodada, com uma recomendação).
4. **`plan.md`** a partir de [modelos/plan.md](modelos/plan.md):
   - rotas e contratos (schemas Zod de entrada e saída);
   - migrations e índices, **cada um com justificativa**;
   - módulos afetados;
   - riscos e ameaças (**STRIDE resumido**);
   - estratégia de testes, ligando cada critério de aceite a pelo menos um teste;
   - dependências novas, cada uma passando pela skill `dependency-check`.
5. **`tasks.md`** a partir de [modelos/tasks.md](modelos/tasks.md):
   - tarefas de **até 2 h**, numeradas `T001...`;
   - cada uma ligada aos `CAx.y` e aos testes;
   - o teste sempre numa tarefa **antes** da tarefa do código.
6. **Revisão da spec:**
   - o `security-reviewer` faz o threat model;
   - o `performance-reviewer` revisa o plano de dados;
   - corrija o que for Crítico ou Alto.
7. **Checklist de spec pronta** (abaixo). Depois, **mostre um resumo curto e espere a aprovação explícita do responsável.** Só então marque `Status: Aprovada`.

## Checklist de spec pronta

- [ ] Toda regra cita a seção de `docs/especificacao.md`.
- [ ] Nenhuma regra inventada; dúvidas em `docs/decisoes-em-aberto.md`.
- [ ] Critérios Dado/Quando/Então cobrem: caminho feliz, validação, cada papel, concorrência, limites e falhas externas.
- [ ] Metas de segurança e de performance com número.
- [ ] Cada rota tem schema de entrada `.strict()` e de saída, papel exigido, limite de taxa e entrada na matriz de autorização.
- [ ] Cada índice e cada migration têm justificativa.
- [ ] STRIDE sem ameaça sem mitigação.
- [ ] Todo critério de aceite tem teste e tarefa; toda tarefa remete a um critério.
- [ ] Revisores de segurança e performance sem Crítico nem Alto.

## `status`

Liste as pastas de `specs/` com a fase de cada uma (spec, plano, tarefas, % de tarefas concluídas) e o próximo passo.
