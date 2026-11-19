---
name: review-gate
description: Portão de revisão da API do catálogo. Roda em paralelo backend-reviewer, security-reviewer, performance-reviewer e quality-reviewer sobre a mudança, consolida os relatórios e só libera se todos aprovarem; senão lista o que corrigir e roda de novo. Use ao fim de cada tarefa ou funcionalidade, antes do commit (passo 5 do fluxo).
argument-hint: "[spec NNN ou descrição da mudança]"
---

# Portão de revisão

## Passos

1. **Antes de chamar os revisores**, rode e anexe a saída:
   - `npm run lint -w api`
   - `npm run typecheck -w api`
   - `npm run test:coverage -w api`
   - `npm audit --audit-level=high`
2. **Chame os quatro revisores em paralelo**, numa única mensagem com quatro chamadas ao Agent: `backend-reviewer`, `security-reviewer`, `performance-reviewer` e `quality-reviewer`. Cada um recebe:
   - a spec e o plano (`specs/NNN-*/`);
   - o que mudou (`git diff` desde o último commit aprovado, ou a lista de arquivos);
   - o pedido de devolver achados por severidade e o veredito.
3. **Consolide** numa tabela única: revisor, severidade, arquivo e linha, achado, correção sugerida.
4. **Decisão:**
   - todos **APROVADO** e nenhum Crítico ou Alto: o portão está **liberado**. Médios e Baixos viram itens no `tasks.md` (corrigir agora ou registrar o motivo de adiar);
   - qualquer **REPROVADO**: corrija tudo que for Crítico ou Alto, sempre com teste antes (skill `tdd-cycle`), e **rode o portão de novo** com os quatro revisores.
5. **Mostre ao responsável** o resumo consolidado e o veredito final.

O `frontend-reviewer` não entra aqui: ele é usado só na fase do front do catálogo.
