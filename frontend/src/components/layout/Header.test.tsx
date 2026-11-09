import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Header } from "@/components/layout/Header";

describe("Header: menu do celular", () => {
  it("começa fechado e abre ao tocar no botão de menu", async () => {
    const user = userEvent.setup();
    render(<Header />);

    expect(screen.queryByRole("navigation", { name: "Menu" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(screen.getByRole("navigation", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("fecha ao pressionar Esc", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("navigation", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("fecha ao escolher uma seção", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const menu = screen.getByRole("navigation", { name: "Menu" });

    await user.click(within(menu).getByRole("link", { name: "Contato" }));

    expect(screen.queryByRole("navigation", { name: "Menu" })).not.toBeInTheDocument();
  });
});

describe("Header: chamada para ação", () => {
  it("leva ao WhatsApp em nova aba, e não a um catálogo", () => {
    render(<Header />);

    const cta = screen.getByRole("link", { name: "Fale no WhatsApp" });

    expect(cta).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/557536228260\?text=/));
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", "noopener");
  });
});
