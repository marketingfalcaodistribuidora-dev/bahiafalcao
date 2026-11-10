import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("redirecionamentos de domínio", () => {
  it("leva o domínio sem www para o www, de forma permanente e mantendo o caminho", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(redirects).toContainEqual({
      source: "/:path*",
      has: [{ type: "host", value: "bahiafalcao.com.br" }],
      destination: "https://www.bahiafalcao.com.br/:path*",
      permanent: true,
    });
  });
});
