---
name: tdd
description: Desenvolvimento guiado por testes (TDD) com o ciclo Vermelho → Verde → Refatorar. Use SEMPRE que for implementar lógica nova, corrigir um bug, alterar comportamento ou refatorar código com lógica no frontend ou backend (helpers, componentes interativos, validações, rotas de API). Não use para mudanças puramente visuais ou de texto sem lógica.
argument-hint: "<comportamento a implementar ou bug a corrigir>"
---

# TDD: Vermelho → Verde → Refatorar

Tarefa: **$ARGUMENTS**

Baseado na skill de TDD do [obra/superpowers](https://github.com/obra/superpowers) e nas práticas de teste do livro *Software Engineering at Google*. Esta é a lei do Artigo II de `specs/constitution.md`.

## A Lei de Ferro

> **NENHUM CÓDIGO DE PRODUÇÃO SEM UM TESTE QUE FALHOU ANTES.**

Se escreveu código antes do teste, **apague esse código** e recomece pelo teste. Não guarde "como referência" nem "adapte": isso é testar depois. Se você não viu o teste falhar, não sabe se ele testa a coisa certa.

## O ciclo (repita para cada comportamento)

### 1. VERMELHO: escreva um teste que falha
- **Um** comportamento por teste. Se o nome tem "e", divida em dois.
- Nome em português descrevendo o comportamento: `"abre o menu ao tocar no botão"`, não `"testa toggleMenu"`.
- Estrutura **dado / quando / então**, com linhas em branco separando as partes.
- Antes de escrever, diga qual mudança no código de produção faria esse teste falhar.
- Rode **só esse teste**: `npm run test -w frontend -- <arquivo> -t "<nome do teste>"`.
- **Confirme que falhou pelo motivo certo** (a funcionalidade não existe), e não por erro de digitação, import ou sintaxe. Se passou de primeira, o teste não prova nada: reescreva.

### 2. VERDE: o mínimo para passar
- Escreva o código **mais simples** que faz o teste passar. Nada de funcionalidades extras, opções especulativas ou refatorar outras partes (YAGNI).
- Rode o teste: deve passar. Se falhar, **corrija o código, não o teste**.

### 3. REFATORAR: com tudo verde
- Remova duplicação, melhore nomes, extraia funções. **Sem mudar comportamento.**
- Rode a suíte inteira (`npm test`) após cada refatoração.

## Como escrever bons testes (práticas do Google)

- **Teste pela API pública:** componentes pelo que o usuário vê e faz (Testing Library: `getByRole`, `getByText`, `userEvent`). Nunca teste estado interno, classes CSS de implementação ou nomes de funções privadas.
- **Teste estado e resultado, não interações:** verifique o que aparece ou o que é retornado. Mocks só para fronteiras externas (rede, `Date`, `window.open`), e entenda o efeito colateral antes de mockar.
- **Sem lógica no teste:** nada de `if`, laços ou cálculos. Valores esperados escritos literalmente.
- **DAMP > DRY:** cada teste deve ser legível sozinho. Repetição é aceitável; helpers não podem esconder valores importantes.
- **Mensagens claras:** prefira asserções específicas (`toHaveAttribute("href", "...")`) a `toBeTruthy()`.
- **Testes imutáveis:** um bom teste só muda quando o requisito muda, não quando o código é refatorado.
- **Tamanhos:**
  - pequeno (unitário, padrão): `src/**/*.test.ts(x)` com Vitest e jsdom;
  - médio (integração de vários componentes ou rota de API com dependências reais locais);
  - grande (ponta a ponta no navegador): ainda não configurado; proponha Playwright se a tarefa exigir.

## Bugs

Primeiro um teste que **reproduz o bug** e falha. Depois a correção. Nunca corrija um bug sem um teste que o prove.

## Desculpas que você NÃO aceita

| Desculpa | Realidade |
|---|---|
| "É simples demais para testar" | Código simples também quebra. O teste leva 30 segundos. |
| "Testo depois" | Teste escrito depois passa de primeira e não prova nada. |
| "Já testei manualmente" | Teste manual não se repete e não protege contra regressão. |
| "Apagar o que fiz é desperdício" | Custo afundado. Código sem teste confiável é o desperdício real. |
| "Preciso explorar antes" | Explore, **jogue fora** e comece pelo teste. |
| "É difícil de testar" | O design está ruim. Difícil de testar é difícil de usar: simplifique. |

## Sinais de alerta: pare e recomece pelo teste
Código antes do teste · teste que passa de primeira · "só desta vez" · "vou adicionar os testes depois" · não sabe explicar por que o teste falhou.

## Checklist antes de dizer "pronto"
- [ ] Cada comportamento novo tem um teste que **foi visto falhando** pelo motivo certo
- [ ] Código mínimo para passar, depois refatorado
- [ ] Casos de borda e de erro cobertos
- [ ] `npm test` inteiro verde; reporte pelo nome qualquer falha, mesmo que não seja sua
- [ ] `/verificar` verde (formatação, lint, tipos, testes, build)

No relatório final, mostre para cada ciclo: o teste escrito, a falha observada (trecho da saída) e o resultado verde.
