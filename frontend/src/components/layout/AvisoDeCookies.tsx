"use client";
// Aviso de cookies (LGPD; Modo de Consentimento do Google). Aparece enquanto a pessoa não escolheu.
// Aceitar e Recusar têm o mesmo destaque (recusar precisa ser tão fácil quanto aceitar). A escolha
// atualiza o consentimento do Google na hora e fica guardada por 12 meses (lib/consentimento.ts).
// O botão "Preferências de cookies" do rodapé reabre o aviso.
import { useEffect, useState, useSyncExternalStore } from "react";
import { gravarConsentimento, lerConsentimento, sinaisDeConsentimento, type Escolha } from "@/lib/consentimento";

const EVENTO_REABRIR = "falcao:preferencias-de-cookies";

type JanelaComGtag = Window & { gtag?: (...argumentos: unknown[]) => void };

function armazenamentoLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** A escolha guardada no navegador; outra aba que escolher também atualiza esta. */
const assinar = (avisar: () => void) => {
  window.addEventListener("storage", avisar);
  return () => window.removeEventListener("storage", avisar);
};
const escolhaGuardada = () => {
  const local = armazenamentoLocal();
  return (local && lerConsentimento(local)) ?? "nenhuma";
};
// No servidor não há escolha para ler: o aviso só aparece depois de montar no navegador.
const noServidor = () => "servidor" as const;

export function AvisoDeCookies() {
  const guardada = useSyncExternalStore(assinar, escolhaGuardada, noServidor);
  const [reaberto, setReaberto] = useState(false);
  // Navegador que bloqueia o armazenamento: a escolha vale nesta visita.
  const [escolheuAgora, setEscolheuAgora] = useState(false);

  useEffect(() => {
    const reabrir = () => setReaberto(true);
    window.addEventListener(EVENTO_REABRIR, reabrir);
    return () => window.removeEventListener(EVENTO_REABRIR, reabrir);
  }, []);

  const escolher = (escolha: Escolha) => {
    const local = armazenamentoLocal();
    if (local) gravarConsentimento(local, escolha);
    (window as JanelaComGtag).gtag?.("consent", "update", sinaisDeConsentimento(escolha));
    setEscolheuAgora(true);
    setReaberto(false);
  };

  const aberto = reaberto || (!escolheuAgora && guardada === "nenhuma");
  if (!aberto) return null;
  const botao =
    "h-10 flex-1 cursor-pointer rounded-md px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro";
  return (
    <section
      aria-label="Aviso de cookies"
      className="dk fixed right-[76px] bottom-3.5 left-3.5 z-40 rounded-lg border border-chumbo bg-preto p-4 text-off shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:right-auto sm:bottom-5 sm:left-5 sm:max-w-[420px]"
    >
      <p className="text-[15px] leading-6">
        Usamos cookies do Google para entender como o site é usado e melhorar nossos anúncios. Você aceita?
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={`${botao} bg-ouro text-preto hover:bg-ouro-h`}
          onClick={() => escolher("aceito")}
        >
          Aceitar
        </button>
        <button
          type="button"
          className={`${botao} border border-suave bg-transparent text-off hover:border-off`}
          onClick={() => escolher("recusado")}
        >
          Recusar
        </button>
      </div>
    </section>
  );
}

/** Botão do rodapé que reabre o aviso para mudar a escolha. */
export function BotaoPreferenciasDeCookies({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`cursor-pointer underline-offset-2 hover:underline ${className}`}
      onClick={() => window.dispatchEvent(new Event(EVENTO_REABRIR))}
    >
      Preferências de cookies
    </button>
  );
}
