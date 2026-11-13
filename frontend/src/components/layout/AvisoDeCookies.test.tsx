// Aviso de cookies (LGPD): aparece enquanto a pessoa não escolheu; Aceitar e Recusar têm o mesmo
// destaque; a escolha atualiza o consentimento do Google na hora; o rodapé reabre o aviso.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAVE_DO_CONSENTIMENTO, gravarConsentimento, sinaisDeConsentimento } from "@/lib/consentimento";
import { AvisoDeCookies, BotaoPreferenciasDeCookies } from "./AvisoDeCookies";

const gtag = vi.fn();

beforeEach(() => {
  localStorage.clear();
  (window as unknown as { gtag: typeof gtag }).gtag = gtag;
});
afterEach(() => {
  gtag.mockReset();
});

describe("AvisoDeCookies", () => {
  it("aparece para quem ainda não escolheu, com Aceitar e Recusar", async () => {
    render(<AvisoDeCookies />);

    const aviso = await screen.findByRole("region", { name: "Aviso de cookies" });
    expect(aviso).toHaveTextContent("cookies do Google");
    expect(screen.getByRole("button", { name: "Aceitar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeInTheDocument();
  });

  it("aceitar guarda a escolha, libera o Google e some", async () => {
    render(<AvisoDeCookies />);

    await userEvent.click(await screen.findByRole("button", { name: "Aceitar" }));

    expect(gtag).toHaveBeenCalledWith("consent", "update", sinaisDeConsentimento("aceito"));
    expect(JSON.parse(localStorage.getItem(CHAVE_DO_CONSENTIMENTO)!)).toMatchObject({ escolha: "aceito" });
    expect(screen.queryByRole("region", { name: "Aviso de cookies" })).not.toBeInTheDocument();
  });

  it("recusar guarda a escolha, mantém o Google negado e some", async () => {
    render(<AvisoDeCookies />);

    await userEvent.click(await screen.findByRole("button", { name: "Recusar" }));

    expect(gtag).toHaveBeenCalledWith("consent", "update", sinaisDeConsentimento("recusado"));
    expect(JSON.parse(localStorage.getItem(CHAVE_DO_CONSENTIMENTO)!)).toMatchObject({ escolha: "recusado" });
    expect(screen.queryByRole("region", { name: "Aviso de cookies" })).not.toBeInTheDocument();
  });

  it("quem já escolheu não vê o aviso", () => {
    gravarConsentimento(localStorage, "recusado");

    render(<AvisoDeCookies />);

    expect(screen.queryByRole("region", { name: "Aviso de cookies" })).not.toBeInTheDocument();
  });

  it("o botão do rodapé reabre o aviso para mudar a escolha", async () => {
    gravarConsentimento(localStorage, "aceito");
    render(
      <>
        <AvisoDeCookies />
        <BotaoPreferenciasDeCookies />
      </>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Preferências de cookies" }));

    expect(await screen.findByRole("region", { name: "Aviso de cookies" })).toBeInTheDocument();
  });

  it("sem a tag carregada (gtag ausente), escolher não quebra", async () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    render(<AvisoDeCookies />);

    await act(async () => {
      await userEvent.click(await screen.findByRole("button", { name: "Aceitar" }));
    });

    expect(localStorage.getItem(CHAVE_DO_CONSENTIMENTO)).not.toBeNull();
  });
});
