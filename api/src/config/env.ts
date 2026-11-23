// Configuração da API (spec 000, T006; plano §3; CA1.1, CA4.5–CA4.7).
// Lê as variáveis de ambiente uma vez, no início. Com qualquer uma faltando ou inválida, lança
// ErroDeConfiguracao e a API não sobe. A mensagem cita só os NOMES das variáveis e o motivo,
// nunca o valor (que pode ser uma senha). Na dúvida, o padrão é o mais fechado.
// Variáveis que a API não conhece (ex.: as do docker-compose) são ignoradas.
import { isIP } from "node:net";
import { z } from "zod";

export type Ambiente = "development" | "test" | "production";
export type NivelDoLog = "fatal" | "error" | "warn" | "info" | "debug";

export interface Configuracao {
  ambiente: Ambiente;
  urlDoBanco: string;
  /** Origens exatas que podem chamar a API pelo navegador (CORS). */
  origensDoCors: string[];
  /** IPs ou faixas (CIDR) dos proxies em que se confia para saber o IP do cliente. */
  proxiesConfiaveis: string[];
  limiteGeralPorMinuto: number;
  /** Só para a medição de performance; sempre vazia em produção. */
  ipsForaDoLimite: string[];
  docsHabilitado: boolean;
  nivelDoLog: NivelDoLog;
  /** IP em que a API escuta. Padrão 127.0.0.1: só a própria máquina (o Caddy, na VPS). */
  endereco: string;
  /** Porta em que a API escuta (0: o sistema escolhe uma livre, usado nos testes). */
  porta: number;
}

/** As variáveis que a API lê, na ordem em que os erros são listados. */
export const VARIAVEIS_DA_API = [
  "NODE_ENV",
  "DATABASE_URL",
  "CORS_ORIGENS",
  "TRUST_PROXY",
  "LIMITE_GERAL_POR_MIN",
  "LIMITE_IGNORAR_IPS",
  "DOCS_HABILITADO",
  "LOG_NIVEL",
  "ENDERECO",
  "PORTA",
] as const;
type Variavel = (typeof VARIAVEIS_DA_API)[number];

export class ErroDeConfiguracao extends Error {
  override readonly name = "ErroDeConfiguracao";
  constructor(
    /** As variáveis com problema, na ordem de VARIAVEIS_DA_API. */
    readonly variaveis: Variavel[],
    motivos: string[],
  ) {
    super(`Configuração inválida da API. Corrija no api/.env: ${motivos.join("; ")}.`);
  }
}

const lista = (texto: string | undefined): string[] =>
  (texto ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Prefixo mínimo de uma faixa de proxies: uma faixa mais larga (como 0.0.0.0/0) confiaria em
 * quase toda a internet, e qualquer um forjaria o IP do cliente.
 */
const PREFIXO_MINIMO_IPV4 = 8;
const PREFIXO_MINIMO_IPV6 = 32;

/** "10.0.0.1" ou "172.16.0.0/12" (IPv4 ou IPv6), sem faixa larga demais. */
function ehIpOuFaixa(texto: string): boolean {
  const [ip = "", prefixo, ...resto] = texto.split("/");
  const versao = isIP(ip);
  if (!versao || resto.length) return false;
  if (prefixo === undefined) return true;
  const bits = Number(prefixo);
  const [minimo, maximo] = versao === 4 ? [PREFIXO_MINIMO_IPV4, 32] : [PREFIXO_MINIMO_IPV6, 128];
  return /^\d{1,3}$/.test(prefixo) && bits >= minimo && bits <= maximo;
}

/** Origem exata (sem caminho nem barra no fim, em minúsculas): https, ou http://localhost em desenvolvimento. */
function ehOrigemPermitida(origem: string, ambiente: Ambiente): boolean {
  if (!URL.canParse(origem)) return false;
  const url = new URL(origem);
  if (url.origin !== origem) return false;
  if (url.protocol === "https:") return true;
  return ambiente === "development" && url.protocol === "http:" && url.hostname === "localhost";
}

const urlPostgres = (texto: string) =>
  /^postgres(ql)?:\/\//.test(texto) && URL.canParse(texto) && new URL(texto).hostname !== "";

// Primeira camada: cada variável sozinha. As mensagens são nossas, para nunca repetirem o valor.
const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"], { error: "use development, test ou production" }),
  DATABASE_URL: z
    .string({ error: "obrigatória" })
    .refine(urlPostgres, { error: "precisa ser uma URL postgresql://usuario:senha@servidor:porta/banco" }),
  CORS_ORIGENS: z.string().optional(),
  TRUST_PROXY: z
    .string()
    .optional()
    .refine((valor) => lista(valor).every(ehIpOuFaixa), {
      error:
        "só IPs ou faixas (CIDR, de /8 no IPv4 e /32 no IPv6 para cima), separados por vírgula; true e número de saltos são recusados",
    }),
  LIMITE_GERAL_POR_MIN: z
    .string()
    .optional()
    .refine((valor) => valor === undefined || (/^\d+$/.test(valor) && Number(valor) >= 10 && Number(valor) <= 10_000), {
      error: "um número inteiro de 10 a 10000",
    }),
  LIMITE_IGNORAR_IPS: z
    .string()
    .optional()
    .refine((valor) => lista(valor).every((ip) => isIP(ip) !== 0), { error: "só IPs, separados por vírgula" }),
  DOCS_HABILITADO: z.enum(["true", "false"], { error: "use true ou false" }).optional(),
  LOG_NIVEL: z
    .enum(["fatal", "error", "warn", "info", "debug"], { error: "use fatal, error, warn, info ou debug" })
    .optional(),
  ENDERECO: z
    .string()
    .optional()
    .refine((valor) => valor === undefined || isIP(valor) !== 0, { error: "um IP (ex.: 127.0.0.1)" }),
  PORTA: z
    .string()
    .optional()
    .refine((valor) => valor === undefined || (/^\d{1,5}$/.test(valor) && Number(valor) <= 65_535), {
      error: "um número de 0 a 65535",
    }),
});

export function lerConfiguracao(env: Record<string, string | undefined>): Configuracao {
  const problemas = new Map<Variavel, string>();
  const anotar = (variavel: Variavel, motivo: string) => {
    if (!problemas.has(variavel)) problemas.set(variavel, motivo);
  };

  const lido = esquema.safeParse(env);
  if (!lido.success) {
    for (const problema of lido.error.issues) {
      anotar(problema.path[0] as Variavel, problema.message);
    }
  }

  // Segunda camada: regras que dependem do ambiente (só quando ele é válido).
  const ambiente = lido.success
    ? lido.data.NODE_ENV
    : z.enum(["development", "test", "production"]).safeParse(env["NODE_ENV"]).data;
  if (ambiente) {
    if (!lista(env["CORS_ORIGENS"]).every((origem) => ehOrigemPermitida(origem, ambiente))) {
      anotar(
        "CORS_ORIGENS",
        "só origens exatas com https:// (sem barra no fim nem maiúsculas); http://localhost só em development",
      );
    }
    if (ambiente === "production" && lista(env["LIMITE_IGNORAR_IPS"]).length) {
      anotar("LIMITE_IGNORAR_IPS", "proibida em produção (serve só para medir performance)");
    }
    if (ambiente === "production" && env["DOCS_HABILITADO"] === "true") {
      anotar("DOCS_HABILITADO", "proibida em produção até o /docs exigir login de Administrador");
    }
  }

  if (problemas.size || !lido.success) {
    const variaveis = VARIAVEIS_DA_API.filter((variavel) => problemas.has(variavel));
    throw new ErroDeConfiguracao(
      variaveis,
      variaveis.map((variavel) => `${variavel} (${problemas.get(variavel) ?? "inválida"})`),
    );
  }

  const dados = lido.data;
  return {
    ambiente: dados.NODE_ENV,
    urlDoBanco: dados.DATABASE_URL,
    origensDoCors: lista(dados.CORS_ORIGENS),
    proxiesConfiaveis: lista(dados.TRUST_PROXY),
    limiteGeralPorMinuto: dados.LIMITE_GERAL_POR_MIN === undefined ? 300 : Number(dados.LIMITE_GERAL_POR_MIN),
    ipsForaDoLimite: lista(dados.LIMITE_IGNORAR_IPS),
    docsHabilitado: dados.DOCS_HABILITADO === "true",
    nivelDoLog: dados.LOG_NIVEL ?? "info",
    endereco: dados.ENDERECO ?? "127.0.0.1",
    porta: dados.PORTA === undefined ? 3333 : Number(dados.PORTA),
  };
}
