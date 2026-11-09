import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Differentials } from "@/components/sections/Differentials";

describe("Differentials", () => {
  it("apresenta os cinco diferenciais da empresa", () => {
    render(<Differentials />);

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    expect(titles).toEqual(["Variedade", "Qualidade", "Agilidade", "Experiência", "Relacionamento"]);
  });

  it("destaca a quantidade de itens do catálogo", () => {
    render(<Differentials />);

    expect(screen.getByText("7 mil+")).toBeInTheDocument();
  });

  it("leva o cliente ao WhatsApp para consultar uma peça", () => {
    render(<Differentials />);

    const cta = screen.getByRole("link", { name: /consultar uma peça/i });

    expect(cta).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/557536228260\?text=.*pe%C3%A7a/));
    expect(cta).toHaveAttribute("target", "_blank");
  });
});
