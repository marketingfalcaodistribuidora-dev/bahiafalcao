// Consentimento de cookies da tag do Google (LGPD; Modo de Consentimento v2 do Google).
// Sem escolha, tudo fica NEGADO: a tag carrega, mas não grava cookies de medição nem de anúncios.
// A escolha (aceito ou recusado) fica no navegador por 12 meses; depois, o aviso volta.
// Roda no navegador e no script inicial da página: sem dependências.

export const CHAVE_DO_CONSENTIMENTO = "falcao-consentimento";
export const VALIDADE_DO_CONSENTIMENTO_MS = 365 * 24 * 60 * 60 * 1000;

export type Escolha = "aceito" | "recusado";
type Sinal = "granted" | "denied";
export type SinaisDeConsentimento = {
  analytics_storage: Sinal;
  ad_storage: Sinal;
  ad_user_data: Sinal;
  ad_personalization: Sinal;
};

type Armazenamento = { getItem(chave: string): string | null; setItem(chave: string, valor: string): void };

export function lerConsentimento(armazenamento: Armazenamento, agora = Date.now()): Escolha | null {
  try {
    const guardado: unknown = JSON.parse(armazenamento.getItem(CHAVE_DO_CONSENTIMENTO) ?? "null");
    if (typeof guardado !== "object" || guardado === null) return null;
    const { escolha, expiraEm } = guardado as { escolha?: unknown; expiraEm?: unknown };
    if (escolha !== "aceito" && escolha !== "recusado") return null;
    return typeof expiraEm === "number" && expiraEm > agora ? escolha : null;
  } catch {
    return null;
  }
}

export function gravarConsentimento(armazenamento: Armazenamento, escolha: Escolha, agora = Date.now()): void {
  try {
    armazenamento.setItem(
      CHAVE_DO_CONSENTIMENTO,
      JSON.stringify({ escolha, expiraEm: agora + VALIDADE_DO_CONSENTIMENTO_MS }),
    );
  } catch {
    // Navegador que bloqueia o armazenamento: a escolha vale só nesta visita.
  }
}

export function sinaisDeConsentimento(escolha: Escolha | null): SinaisDeConsentimento {
  const sinal: Sinal = escolha === "aceito" ? "granted" : "denied";
  return { analytics_storage: sinal, ad_storage: sinal, ad_user_data: sinal, ad_personalization: sinal };
}

/**
 * Script que roda ANTES da tag do Google (no início do <body>): cria o dataLayer e o gtag, define
 * tudo como negado e, se a pessoa já aceitou (e o aceite não venceu), reaplica o aceite. Só usa
 * constantes deste arquivo: nada vindo de fora entra no texto do script.
 */
export function scriptInicialDaTag(): string {
  const negado = JSON.stringify({ ...sinaisDeConsentimento(null), wait_for_update: 500 });
  const aceito = JSON.stringify(sinaisDeConsentimento("aceito"));
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){window.dataLayer.push(arguments);}",
    "window.gtag=gtag;",
    `gtag('consent','default',${negado});`,
    "try{",
    `var c=JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE_DO_CONSENTIMENTO)})||'null');`,
    `if(c&&c.escolha==='aceito'&&typeof c.expiraEm==='number'&&c.expiraEm>Date.now()){gtag('consent','update',${aceito});}`,
    "}catch(e){}",
    "gtag('js',new Date());",
  ].join("");
}

/** A tag só carrega no site oficial e em produção (prévias e `npm run dev` não medem nada). */
export function deveCarregarTag(
  config: { indexable: boolean; googleTagId: string },
  producao = process.env.NODE_ENV === "production",
): boolean {
  return producao && config.indexable && /^(GTM|G|GT|AW)-[A-Z0-9]{4,12}$/.test(config.googleTagId);
}
