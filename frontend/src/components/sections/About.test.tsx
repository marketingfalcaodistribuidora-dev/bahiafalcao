import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { About } from "@/components/sections/About";

describe("About", () => {
  it("apresenta a empresa pelo nome completo e pelas formas como é conhecida", () => {
    render(<About />);

    const intro = screen.getByText(/atua no mercado de autopeças/);

    expect(intro).toHaveTextContent("Bahia Falcão Distribuidora");
    expect(intro).toHaveTextContent("também conhecida como Falcão Distribuidora");
  });
});
