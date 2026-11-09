---
name: nova-pagina
description: Cria uma nova página (rota) no Next.js já otimizada para SEO, com metadados únicos, canonical, entrada no sitemap e breadcrumbs em JSON-LD. Use quando o usuário pedir uma nova página ou rota (ex.: /contato, /segmentos/pecas-para-carretas, /politica-de-privacidade).
argument-hint: "<caminho da rota> [objetivo da página]"
---

# Nova página com SEO

Pedido: **$ARGUMENTS**

## Passos

1. **URL:** defina um slug em português, minúsculo, sem acento, com hífens e curto (ex.: `pecas-para-carretas`). Confirme com o usuário se houver dúvida.
2. **Rota:** crie `frontend/src/app/<slug>/page.tsx` como Server Component.
3. **Metadados:** exporte `metadata: Metadata` com:
   - `title`: único, de 50 a 60 caracteres, com a palavra-chave da página (o layout já acrescenta `| Falcão Distribuidora` pelo template);
   - `description`: única, de 140 a 160 caracteres, com cidade/região quando fizer sentido e chamada para ação;
   - `alternates: { canonical: "/<slug>" }`;
   - `openGraph`: `title`, `description` e `url`.
4. **Conteúdo:** um único `h1`, hierarquia correta, texto em pt-BR natural e pelo menos um CTA de WhatsApp via `whatsappLink()`. Links internos de volta para a home e para páginas relacionadas.
5. **Breadcrumbs:** adicione um JSON-LD `BreadcrumbList` (Início → Página) usando `jsonLdScript()` de `frontend/src/lib/seo.ts`. Se for a segunda página a precisar disso, crie um helper `buildBreadcrumbJsonLd()` em `seo.ts`.
6. **Sitemap:** inclua a nova URL em `frontend/src/app/sitemap.ts` com `changeFrequency` e `priority` coerentes.
7. **Navegação:** se a página for principal, adicione-a ao cabeçalho e ao rodapé.
8. **Verificação:** rode `npm run lint`, `npm run typecheck` e `npm run build`. Confira no HTML gerado (`frontend/.next/server/app/<slug>.html`) o title, a description, o canonical, o h1 e o JSON-LD.

Ao final, sugira rodar `/auditoria-seo` na página.
