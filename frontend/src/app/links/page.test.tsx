import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LinksPage, { metadata } from "./page";

describe("Página de links (/links)", () => {
  it("CA1.1: mostra a logo, o nome da empresa e a frase de apresentação", () => {
    render(<LinksPage />);

    expect(screen.getByRole("img", { name: "Falcão Distribuidora" })).toHaveAttribute(
      "src",
      expect.stringContaining("falcao-distribuidora-logo-links.png"),
    );
    expect(screen.getByRole("heading", { level: 1, name: "Bahia Falcão Distribuidora" })).toBeInTheDocument();
    expect(screen.getByText("Autopeças e ferramentas · Linha pesada")).toBeInTheDocument();
  });

  it("CA1.2: mostra os três botões principais nesta ordem", () => {
    render(<LinksPage />);

    const principais = within(screen.getByRole("navigation", { name: "Links principais" }));

    const links = principais.getAllByRole("link");

    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent(/^Fale conosco pelo WhatsApp$/);
    expect(links[1]).toHaveTextContent(/^Visite nosso site$/);
    expect(links[2]).toHaveTextContent(/^Nossa localização/);
  });

  it("CA1.5: 'Nossa localização' mostra o endereço logo abaixo do título, como no Linktree", () => {
    render(<LinksPage />);

    expect(screen.getByRole("link", { name: /Nossa localização/ })).toHaveTextContent(
      "Nossa localizaçãoRua Venceslau Guimarães, 31 - Sim, Feira de Santana",
    );
  });

  it("CA1.3: o WhatsApp abre conversa com o (75) 3622-8260 avisando que veio do Instagram", () => {
    render(<LinksPage />);

    const href = screen.getByRole("link", { name: "Fale conosco pelo WhatsApp" }).getAttribute("href") ?? "";

    expect(href).toMatch(/^https:\/\/wa\.me\/557536228260\?text=/);
    expect(decodeURIComponent(href)).toContain("Vim pelo Instagram");
  });

  it("CA1.4: 'Visite nosso site' leva à página inicial", () => {
    render(<LinksPage />);

    expect(screen.getByRole("link", { name: "Visite nosso site" })).toHaveAttribute("href", "/");
  });

  it("CA1.5: 'Nossa localização' abre o Perfil da Empresa no Google Maps", () => {
    render(<LinksPage />);

    expect(screen.getByRole("link", { name: /Nossa localização/ })).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/Kc1BUprfi7kq2YGp7",
    );
  });

  it("CA1.6: mostra Instagram, TikTok, WhatsApp e telefone com nomes acessíveis", () => {
    render(<LinksPage />);

    const redes = within(screen.getByRole("navigation", { name: "Redes sociais e contato" }));

    expect(redes.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/falcaodistribuidora.br",
    );
    expect(redes.getByRole("link", { name: "TikTok" })).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@falcaodistribuidora.br",
    );
    expect(redes.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^https:\/\/wa\.me\/557536228260/),
    );
    expect(redes.getByRole("link", { name: "Ligar para 0800 703 8260" })).toHaveAttribute("href", "tel:08007038260");
  });

  it("CA1.7: links externos abrem em nova aba com segurança", () => {
    render(<LinksPage />);

    const externos = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("https://"));

    expect(externos).toHaveLength(5);
    for (const link of externos) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener");
    }
  });
});

describe("Página de links: SEO", () => {
  it("não é indexada pelo Google, mas os links são seguidos", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("tem endereço canônico próprio", () => {
    expect(metadata.alternates).toEqual({ canonical: "/links" });
  });
});
