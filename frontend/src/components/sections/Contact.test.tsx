import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Contact } from "@/components/sections/Contact";

describe("Contact", () => {
  it("exibe endereço, telefone, WhatsApp, Instagram e horário", () => {
    render(<Contact />);

    const info = screen.getByText("Endereço").closest("dl");
    if (!info) throw new Error("Lista de contatos não encontrada");

    expect(
      within(info)
        .getAllByRole("term")
        .map((t) => t.textContent),
    ).toEqual(["Endereço", "Telefone", "WhatsApp", "Instagram", "Horário"]);
  });

  it("mostra o horário de sábado em linha separada", () => {
    render(<Contact />);

    expect(screen.getByText("Seg. a sex., 8h às 12h e 14h às 18h")).toBeInTheDocument();
    expect(screen.getByText("Sáb., 8h às 12h")).toBeInTheDocument();
  });

  it("permite ligar para o 0800 com um toque", () => {
    render(<Contact />);

    expect(screen.getByRole("link", { name: "0800 703 8260" })).toHaveAttribute("href", "tel:08007038260");
  });

  it("mostra o mapa do Google Maps com carregamento adiado", () => {
    render(<Contact />);

    const map = screen.getByTitle("Mapa da Bahia Falcão Distribuidora no Google Maps");

    expect(map.tagName).toBe("IFRAME");
    expect(map).toHaveAttribute("src", expect.stringContaining("https://www.google.com/maps?"));
    expect(map).toHaveAttribute("loading", "lazy");
  });

  it("abre a rota no Google Maps em nova aba", () => {
    render(<Contact />);

    const maps = screen.getByRole("link", { name: /abrir rota no google maps/i });

    expect(maps).toHaveAttribute("href", expect.stringContaining("https://www.google.com/maps/search/"));
    expect(maps).toHaveAttribute("target", "_blank");
  });
});
