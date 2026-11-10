import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Previews da Vercel não podem ser indexados (conteúdo duplicado do site principal).
  if (!site.indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    // llms.txt (resumo para buscadores com IA) fica em /llms.txt
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
