# Frontend (Next.js)

- Código em `src/`, alias `@/` → `src/`.
- `src/app/`: rotas, `layout.tsx` (metadados globais, fontes, JSON-LD), `sitemap.ts`, `robots.ts`, `manifest.ts`, `globals.css` (tokens `@theme`).
- `src/lib/site.ts`: dados da empresa e `whatsappLink()`. `src/lib/seo.ts`: dados estruturados.
- `src/components/{layout,sections,ui}/`: crie aqui os componentes (cabeçalho e rodapé em `layout`, seções da home em `sections`, peças reutilizáveis em `ui`).
- `public/images/`: imagens com nomes descritivos em português, com hífen.
- Breakpoints do design: `sm` (≥ 640px) ≈ celular, `lg` (≥ 1024px) ≈ desktop, `nav` (≥ 901px) = menu completo.
- Variáveis de ambiente: veja `.env.example` (`NEXT_PUBLIC_SITE_URL`, `GOOGLE_SITE_VERIFICATION`). Para desenvolvimento, crie `frontend/.env.local`.
