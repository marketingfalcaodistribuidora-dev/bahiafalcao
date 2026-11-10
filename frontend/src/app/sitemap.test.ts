import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lista só a página inicial, sem a página de links (que não é indexada)", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(["http://localhost:3000"]);
  });
});
