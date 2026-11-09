---
name: auditoria-seo
description: Faz uma auditoria completa de SEO técnico, de conteúdo e local no site da Falcão Distribuidora e entrega um relatório priorizado. Use quando o usuário pedir auditoria, revisão ou checagem de SEO, antes de publicar, ou depois de mudanças grandes no conteúdo.
argument-hint: "[página ou área específica, opcional]"
---

# Auditoria de SEO

Escopo: **$ARGUMENTS** (se vazio, o site inteiro).

Delegue a análise ao agente **seo-specialist** e passe este roteiro a ele.

## Roteiro

1. **Build e HTML real:** rode `npm run build` na raiz. Para cada página em `frontend/.next/server/app/*.html`, extraia: `<title>`, meta description, canonical, Open Graph, robots, `lang`, quantidade de `h1`, hierarquia de h2/h3, imagens sem `alt` e blocos JSON-LD.
2. **Rotas de metadados:** confira `/robots.txt`, `/sitemap.xml` (todas as páginas indexáveis presentes e URLs absolutas com o domínio real) e `/manifest.webmanifest`.
3. **Fonte de dados:** compare `frontend/src/lib/site.ts` com o conteúdo visível. O NAP deve ser consistente, sem campos vazios relevantes (WhatsApp, telefone, horário) e com `NEXT_PUBLIC_SITE_URL` definido para produção.
4. **Dados estruturados:** o JSON-LD é válido e coerente com a página (`AutoPartsStore`, `WebSite`, `BreadcrumbList` quando aplicável).
5. **Conteúdo:** palavras-chave-alvo (autopeças linha pesada, peças para caminhão e carreta, Feira de Santana, Bahia) presentes de forma natural em title, h1, primeiros parágrafos e `alt`; ausência de conteúdo duplicado ou raso.
6. **Performance:** uso de `next/image`, `priority` apenas no LCP, `"use client"` mínimo, tamanho dos chunks no resumo do build e fontes via `next/font`.
7. **Acessibilidade que afeta SEO:** semântica, links com texto descritivo e contraste.
8. **SEO local (fora do código):** liste o que verificar no Perfil da Empresa no Google e em diretórios.

## Entrega

Relatório em pt-BR com:
- **Nota geral** de 0 a 10 e um resumo de 3 linhas;
- uma tabela **Prioridade (Alta/Média/Baixa) | Problema | Onde (`arquivo:linha`) | Correção | Impacto**;
- **ganhos rápidos** (até 30 minutos cada) destacados.

Não altere código sem o usuário pedir. Ofereça aplicar as correções em seguida.
