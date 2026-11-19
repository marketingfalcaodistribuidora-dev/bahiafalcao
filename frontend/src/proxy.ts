import { NextResponse, type NextRequest } from "next/server";

/**
 * URLs do site antigo em Joomla que ocupava este domínio (perfis de spam do componente K2,
 * como "/?option=com_k2&view=itemlist&task=user&id=123"). O Google ainda as rastreia; sem isto,
 * elas abririam a página inicial com status 200 e virariam centenas de "cópias" da home.
 * O status 410 diz que a página foi removida de vez, e o Google a tira do índice mais rápido que com 404.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- a assinatura do Next passa o pedido
export function proxy(_pedido: NextRequest): NextResponse {
  return new NextResponse("Esta página não existe mais.", {
    status: 410,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

/** O proxy só roda nas URLs antigas: as páginas do site atual não passam por ele. */
export const config = {
  matcher: [
    // Joomla sem URL amigável: index na raiz com "?option=com_..."
    { source: "/", has: [{ type: "query", key: "option" }] },
    // Joomla com URL amigável: /component/k2/...
    "/component/:path*",
  ],
};
