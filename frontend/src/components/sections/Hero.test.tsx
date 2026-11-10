import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/sections/Hero";

describe("Hero", () => {
  it("diz logo no topo que a sede é em Feira de Santana e que distribui para toda a Bahia", () => {
    render(<Hero />);

    expect(screen.getByText(/Com sede em Feira de Santana, distribuímos para toda a Bahia\./)).toBeInTheDocument();
  });

  it("mostra na faixa de números a cobertura de toda a Bahia", () => {
    render(<Hero />);

    expect(screen.getByText("Sede · distribuição para toda a Bahia")).toBeInTheDocument();
  });
});
