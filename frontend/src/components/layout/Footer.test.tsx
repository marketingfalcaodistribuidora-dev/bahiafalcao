import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/layout/Footer";

describe("Footer", () => {
  it("mostra o horário de sábado em linha separada", () => {
    render(<Footer />);

    expect(screen.getByText("Seg. a sex., 8h às 12h e 14h às 18h")).toBeInTheDocument();
    expect(screen.getByText("Sáb., 8h às 12h")).toBeInTheDocument();
  });
});
