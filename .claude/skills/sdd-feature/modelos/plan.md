# Plano NNN: [Nome da funcionalidade]

- **Spec:** [spec.md](./spec.md) (precisa estar aprovada)
- **Status:** Rascunho | Aguardando aprovação | Aprovado

## 1. Abordagem

Como a funcionalidade será feita e as alternativas descartadas, com o motivo.

## 2. Rotas e contratos

| Método e rota | Papel | Limite de taxa | `bodyLimit` | Entrada (Zod `.strict()`) | Saída | Erros |
|---|---|---|---|---|---|---|

## 3. Banco de dados

| Mudança | SQL ou modelo | Justificativa | Rollback |
|---|---|---|---|

Índices: para cada um, a consulta que o usa e o `EXPLAIN` esperado.

## 4. Módulos afetados

`api/src/modules/<modulo>/` (routes, service, repository), plugins, shared.

## 5. Riscos e ameaças (STRIDE resumido)

| Ameaça | Ativo | Mitigação | Teste que comprova |
|---|---|---|---|
| Falsificação de identidade | | | |
| Adulteração | | | |
| Repúdio | | | |
| Vazamento de informação | | | |
| Negação de serviço | | | |
| Elevação de privilégio | | | |

## 6. Estratégia de testes

| Critério | Teste | Tipo (unitário, integração, contrato, segurança, perf) |
|---|---|---|

## 7. Dependências novas

Cada uma com a skill `dependency-check` e a linha em `docs/dependencias.md`.

## 8. Complexidade justificada

O que foge da solução mais simples e por quê.
