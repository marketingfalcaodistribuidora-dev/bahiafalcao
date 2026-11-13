// Consentimento de cookies da tag do Google (LGPD; Modo de Consentimento v2 do Google).
// Sem escolha, tudo fica NEGADO. A escolha vale por 12 meses e depois o aviso volta.
import { describe, expect, it } from "vitest";
import {
  CHAVE_DO_CONSENTIMENTO,
  deveCarregarTag,
  gravarConsentimento,
  lerConsentimento,
  scriptInicialDaTag,
  sinaisDeConsentimento,
  VALIDADE_DO_CONSENTIMENTO_MS,
} from "./consentimento";

function armazenamento(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void dados.set(chave, valor),
    dados,
  };
}

const AGORA = Date.parse("2026-11-13T12:00:00Z");

describe("lerConsentimento e gravarConsentimento", () => {
  it("sem escolha guardada: null (o aviso aparece)", () => {
    expect(lerConsentimento(armazenamento(), AGORA)).toBeNull();
  });

  it("guarda a escolha com a validade e lê de volta", () => {
    const local = armazenamento();

    gravarConsentimento(local, "aceito", AGORA);

    expect(JSON.parse(local.dados.get(CHAVE_DO_CONSENTIMENTO)!)).toEqual({
      escolha: "aceito",
      expiraEm: AGORA + VALIDADE_DO_CONSENTIMENTO_MS,
    });
    expect(lerConsentimento(local, AGORA)).toBe("aceito");
    expect(VALIDADE_DO_CONSENTIMENTO_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it("recusar também é uma escolha guardada (o aviso não volta toda hora)", () => {
    const local = armazenamento();

    gravarConsentimento(local, "recusado", AGORA);

    expect(lerConsentimento(local, AGORA)).toBe("recusado");
  });

  it("escolha vencida volta a ser nenhuma", () => {
    const local = armazenamento();
    gravarConsentimento(local, "aceito", AGORA);

    expect(lerConsentimento(local, AGORA + VALIDADE_DO_CONSENTIMENTO_MS + 1)).toBeNull();
  });

  it("valor estragado ou desconhecido conta como nenhuma escolha", () => {
    for (const valor of ["{", "null", '{"escolha":"talvez","expiraEm":9999999999999}', '"aceito"']) {
      expect(lerConsentimento(armazenamento({ [CHAVE_DO_CONSENTIMENTO]: valor }), AGORA)).toBeNull();
    }
  });

  it("armazenamento bloqueado pelo navegador não quebra a página", () => {
    const bloqueado = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };

    expect(lerConsentimento(bloqueado, AGORA)).toBeNull();
    expect(() => gravarConsentimento(bloqueado, "aceito", AGORA)).not.toThrow();
  });
});

describe("sinaisDeConsentimento", () => {
  it("aceito: libera medição e anúncios", () => {
    expect(sinaisDeConsentimento("aceito")).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });

  it("recusado ou sem escolha: tudo negado", () => {
    const negado = {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    };
    expect(sinaisDeConsentimento("recusado")).toEqual(negado);
    expect(sinaisDeConsentimento(null)).toEqual(negado);
  });
});

describe("scriptInicialDaTag (roda antes do Google carregar)", () => {
  /** Executa o texto do script com um window falso e devolve o que ele pôs no dataLayer. */
  function executar(guardado: string | null, agora = AGORA) {
    const janela: { dataLayer?: unknown[][] } = {};
    const localStorage = { getItem: () => guardado };
    const DateFalso = class extends Date {
      static override now = () => agora;
    };
    new Function("window", "localStorage", "Date", scriptInicialDaTag())(janela, localStorage, DateFalso);
    return (janela.dataLayer ?? []).map((args) => Array.from(args));
  }

  it("sem escolha: consentimento negado ANTES de tudo, e o início da tag", () => {
    const camada = executar(null);

    expect(camada[0]).toEqual(["consent", "default", { ...sinaisDeConsentimento(null), wait_for_update: 500 }]);
    expect(camada.map((c) => c[0])).toEqual(["consent", "js"]);
  });

  it("quem já aceitou: o aceite é reaplicado logo em seguida", () => {
    const camada = executar(JSON.stringify({ escolha: "aceito", expiraEm: AGORA + 1000 }));

    expect(camada[1]).toEqual(["consent", "update", sinaisDeConsentimento("aceito")]);
  });

  it("aceite vencido ou recusa: continua negado", () => {
    expect(executar(JSON.stringify({ escolha: "aceito", expiraEm: AGORA - 1 })).map((c) => c[1])).toEqual([
      "default",
      expect.any(Date),
    ]);
    expect(executar(JSON.stringify({ escolha: "recusado", expiraEm: AGORA + 1000 })).length).toBe(2);
  });

  it("armazenamento estragado não quebra o script", () => {
    expect(() => executar("{")).not.toThrow();
  });
});

describe("deveCarregarTag", () => {
  it("só no site oficial (indexável), em produção e com o identificador da tag", () => {
    expect(deveCarregarTag({ indexable: true, googleTagId: "GTM-MTSNF479" }, true)).toBe(true);
    expect(deveCarregarTag({ indexable: false, googleTagId: "GTM-MTSNF479" }, true)).toBe(false);
    expect(deveCarregarTag({ indexable: true, googleTagId: "" }, true)).toBe(false);
  });

  it("no desenvolvimento (npm run dev) nunca carrega: as visitas da equipe não entram na medição", () => {
    expect(deveCarregarTag({ indexable: true, googleTagId: "GTM-MTSNF479" }, false)).toBe(false);
  });

  it("recusa identificador fora do formato (ele vai dentro de uma URL de script)", () => {
    expect(deveCarregarTag({ indexable: true, googleTagId: "GTM-X&callback=alert" }, true)).toBe(false);
  });
});
