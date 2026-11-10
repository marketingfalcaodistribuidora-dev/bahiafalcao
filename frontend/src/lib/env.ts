/** Variáveis de ambiente relevantes para URL e indexação (as da Vercel são preenchidas automaticamente). */
export type SiteEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
};

/** Domínio oficial do site (versão canônica, com www). */
export const OFFICIAL_SITE_URL = "https://www.bahiafalcao.com.br";
/** Mesmo domínio sem www: redireciona para o oficial. */
export const APEX_HOST = new URL(OFFICIAL_SITE_URL).hostname.replace(/^www\./, "");

/**
 * URL pública do site: domínio definido manualmente > domínio oficial (produção na Vercel)
 * > domínio de produção da Vercel (previews) > localhost.
 */
export function resolveSiteUrl(env: SiteEnv): string {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  if (env.NEXT_PUBLIC_VERCEL_ENV === "production") return OFFICIAL_SITE_URL;
  if (env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Só a produção é indexada; URLs de preview da Vercel ficam fora do Google (evita conteúdo duplicado). */
export function isIndexable(env: SiteEnv): boolean {
  return env.NEXT_PUBLIC_VERCEL_ENV === undefined || env.NEXT_PUBLIC_VERCEL_ENV === "production";
}

/** Leitura literal de process.env: o Next.js só embute NEXT_PUBLIC_* quando acessadas assim. */
export const runtimeEnv: SiteEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
};
