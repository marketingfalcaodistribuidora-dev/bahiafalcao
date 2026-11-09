"use client";

import { useEffect, useState } from "react";
import { ArrowUp, WhatsAppIcon } from "@/components/ui/icons";
import { whatsappLink, whatsappMessages } from "@/lib/site";

const round =
  "dk fixed right-3.5 z-30 flex size-[52px] items-center justify-center rounded-full shadow-[0_8px_20px_rgba(0,0,0,.3)] sm:right-5";

/** Botão "voltar ao topo" (aparece após rolar) e WhatsApp flutuante. */
export function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Voltar ao topo"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`${round} bottom-[76px] cursor-pointer border border-chumbo bg-preto text-ouro transition-[opacity,translate,visibility,border-color] duration-250 hover:border-ouro sm:bottom-[84px] ${
          showTop ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"
        }`}
      >
        <ArrowUp className="size-6" />
      </button>
      <a
        href={whatsappLink(whatsappMessages.geral)}
        target="_blank"
        rel="noopener"
        aria-label="Falar com a equipe pelo WhatsApp"
        className={`${round} bottom-3.5 bg-wpp text-white transition-colors hover:bg-wpp-h sm:bottom-5`}
      >
        <WhatsAppIcon className="size-[30px]" />
      </a>
    </>
  );
}
