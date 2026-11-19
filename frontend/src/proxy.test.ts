// @vitest-environment node
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

/**
 * O domínio já hospedou um site em Joomla cheio de perfis de spam (componente K2).
 * O Google ainda rastreia essas URLs; elas devem responder 410 (removida de vez),
 * sem afetar nenhuma página do site atual.
 */
describe("proxy: URLs do site antigo em Joomla", () => {
  it("roda para um perfil de spam do K2 na raiz", () => {
    const roda = unstable_doesMiddlewareMatch({
      config,
      url: "/?option=com_k2&view=itemlist&task=user&id=1715158",
    });

    expect(roda).toBe(true);
  });

  it("roda para URLs amigáveis de componentes do Joomla", () => {
    const roda = unstable_doesMiddlewareMatch({ config, url: "/component/k2/itemlist/user/1715158-fulano" });

    expect(roda).toBe(true);
  });

  it("não roda para a página inicial", () => {
    const roda = unstable_doesMiddlewareMatch({ config, url: "/" });

    expect(roda).toBe(false);
  });

  it("não roda para a página inicial com parâmetros de campanha", () => {
    const roda = unstable_doesMiddlewareMatch({ config, url: "/?utm_source=instagram&utm_medium=bio" });

    expect(roda).toBe(false);
  });

  it("não roda para as outras páginas do site", () => {
    const roda = unstable_doesMiddlewareMatch({ config, url: "/links" });

    expect(roda).toBe(false);
  });

  it("responde 410 (removida de vez) para a URL antiga", () => {
    const pedido = new NextRequest("https://www.bahiafalcao.com.br/?option=com_k2&view=itemlist&task=user&id=1715158");

    const resposta = proxy(pedido);

    expect(resposta.status).toBe(410);
  });

  it("pede ao Google para não indexar a resposta", () => {
    const pedido = new NextRequest("https://www.bahiafalcao.com.br/?option=com_k2&view=itemlist&task=user&id=1715158");

    const resposta = proxy(pedido);

    expect(resposta.headers.get("X-Robots-Tag")).toBe("noindex");
  });
});
