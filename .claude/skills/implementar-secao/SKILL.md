---
name: implementar-secao
description: Implementa uma seção ou página do design (docs/design) no frontend Next.js com fidelidade visual, responsividade, acessibilidade e SEO. Use quando o usuário pedir para construir, codar ou implementar uma parte do layout (ex.: hero, cabeçalho, rodapé, segmentos, diferenciais, contato).
argument-hint: "<nome da seção ou página>"
---

# Implementar seção do design

Seção pedida: **$ARGUMENTS**

## 1. Entender o design

1. Localize a referência em `docs/design/` (arquivos `*.dc.html`, que são somente leitura).
2. Extraia da seção: estrutura HTML, textos exatos, valores finais de CSS (as regras mais abaixo no `<style>` sobrescrevem as anteriores, incluindo o bloco "revisão UX") e os três breakpoints (celular até 700px, tablet até 1024px, desktop).
3. Identifique as imagens usadas (`./assets/<hash>`) e as equivalentes já copiadas em `frontend/public/images/`. Imagem nova ganha nome descritivo em português, com hífen.
4. Placeholders `{{...}}` no design vêm de `frontend/src/lib/site.ts`. Se faltar algum dado, adicione-o lá.

## 2. Implementar

- Crie o componente em `frontend/src/components/sections/` (ou `components/layout/` para cabeçalho e rodapé). Partes repetidas vão para `components/ui/`.
- Use Server Component; extraia para `"use client"` apenas a parte interativa.
- Use os tokens do Tailwind (`bg-preto`, `text-ouro`, `font-titulo`...). Se um valor do design não existir como token e se repetir, crie o token em `globals.css`.
- Links de "Ver catálogo" viram `whatsappLink(...)`, com uma mensagem específica para a seção.
- Use `<section id="..." aria-labelledby="...">`, a hierarquia de títulos correta (o único `h1` fica no hero) e `next/image` com `alt` descritivo e `sizes`.
- Registre a seção em `frontend/src/app/page.tsx`, na ordem do design.

## 3. Verificar

1. Rode `npm run lint`, `npm run typecheck` e `npm run build` na raiz.
2. Revise a responsividade mentalmente nos três breakpoints, comparando com o CSS do design.
3. Se o projeto estiver rodando, peça ao usuário para conferir no navegador em celular e desktop.

## 4. Entregar

Um resumo curto: arquivos criados ou alterados, decisões tomadas onde o design era ambíguo e pendências (dados ou imagens faltando).
