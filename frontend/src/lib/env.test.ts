import { describe, expect, it } from "vitest";
import { isIndexable, resolveSiteUrl } from "@/lib/env";

describe("resolveSiteUrl", () => {
  it("usa o domínio definido manualmente, sem barra no final", () => {
    const url = resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://www.falcao.com.br/" });

    expect(url).toBe("https://www.falcao.com.br");
  });

  it("usa o domínio de produção da Vercel quando não há domínio manual", () => {
    const url = resolveSiteUrl({ NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "bahiafalcao.vercel.app" });

    expect(url).toBe("https://bahiafalcao.vercel.app");
  });

  it("prefere o domínio manual ao da Vercel", () => {
    const url = resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://www.falcao.com.br",
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "bahiafalcao.vercel.app",
    });

    expect(url).toBe("https://www.falcao.com.br");
  });

  it("em produção na Vercel, usa o domínio oficial e não o endereço .vercel.app", () => {
    const url = resolveSiteUrl({
      NEXT_PUBLIC_VERCEL_ENV: "production",
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "frontend-one-steel-76.vercel.app",
    });

    expect(url).toBe("https://www.bahiafalcao.com.br");
  });

  it("usa localhost no desenvolvimento, sem nenhuma variável", () => {
    const url = resolveSiteUrl({});

    expect(url).toBe("http://localhost:3000");
  });
});

describe("isIndexable", () => {
  it("permite indexação na produção da Vercel", () => {
    expect(isIndexable({ NEXT_PUBLIC_VERCEL_ENV: "production" })).toBe(true);
  });

  it("bloqueia indexação nas URLs de preview da Vercel", () => {
    expect(isIndexable({ NEXT_PUBLIC_VERCEL_ENV: "preview" })).toBe(false);
  });

  it("permite indexação fora da Vercel (outra hospedagem)", () => {
    expect(isIndexable({})).toBe(true);
  });
});
