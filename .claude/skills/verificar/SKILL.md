---
name: verificar
description: Roda o portão de qualidade completo do projeto (formatação, lint, tipos, testes e build de produção) e resume o resultado. Use antes de declarar uma tarefa concluída, antes de commits e quando o usuário pedir para verificar, testar ou validar o projeto.
---

# Portão de qualidade

Rode na **raiz** do projeto, nesta ordem, parando no primeiro erro para corrigir:

1. `npm run format:check`: se falhar, rode `npm run format` e repita.
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

## Regras

- Teste falhando: corrija o **código**, não o teste, a menos que o requisito tenha mudado (aí atualize a spec em `specs/` também).
- Corrija a **causa** de cada erro. Não silencie com `eslint-disable`, `@ts-ignore`, `any` ou removendo regras, a menos que o usuário autorize e haja justificativa escrita no código.
- Se um erro estiver fora do escopo da tarefa atual, reporte-o em vez de fazer uma mudança grande sem pedir.
- No Windows dentro do OneDrive, erros `EPERM` em `node_modules` ou `.next` costumam ser bloqueio de sincronização: pause o OneDrive e rode de novo.

## Resultado

Responda com uma tabela curta **Etapa | Status | Observação** e, se o build passou, as rotas geradas. Diga claramente se algo falhou.
