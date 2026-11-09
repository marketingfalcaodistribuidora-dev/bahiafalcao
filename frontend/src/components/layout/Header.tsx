"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CloseIcon, MenuIcon, WhatsAppIcon } from "@/components/ui/icons";
import { images } from "@/lib/images";
import { navLinks, site, whatsappLink, whatsappMessages } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const wa = whatsappLink(whatsappMessages.geral);

  return (
    <header className="dk sticky top-0 z-20 border-b border-chumbo bg-preto">
      <div className="wrap flex h-16 items-center justify-between gap-3 sm:h-[72px] sm:gap-6">
        <Link href="/" className="shrink-0" aria-label={`${site.name}: voltar ao início`}>
          <Image
            src={images.logoHorizontal.src}
            width={171}
            height={48}
            alt={site.name}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <nav aria-label="Principal" className="hidden gap-7 nav:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="border-b-2 border-transparent py-1.5 text-[15px] font-medium text-suave transition-colors hover:border-ouro hover:text-ouro"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a href={wa} target="_blank" rel="noopener" className="btn btn-ouro btn-sm hidden gap-2 nav:inline-flex">
          <WhatsAppIcon />
          Fale no WhatsApp
        </a>

        <button
          type="button"
          className="ml-auto inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-chumbo text-off transition-colors hover:border-ouro hover:text-ouro nav:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon className="size-[22px]" /> : <MenuIcon className="size-[22px]" />}
        </button>
      </div>

      {open && (
        <nav
          id="menu-mobile"
          aria-label="Menu"
          className="absolute inset-x-0 top-full flex flex-col border-b-[3px] border-ouro bg-preto px-4 pt-2 pb-5 shadow-[0_18px_28px_rgba(0,0,0,.35)] sm:px-6 nav:hidden"
        >
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[52px] items-center border-b border-[#2a2a2e] text-[17px] font-medium text-off hover:text-ouro"
            >
              {l.label}
            </a>
          ))}
          <a
            href={wa}
            target="_blank"
            rel="noopener"
            onClick={() => setOpen(false)}
            className="btn btn-ouro mt-4 w-full"
          >
            <WhatsAppIcon />
            Fale no WhatsApp
            <ArrowRight className="seta" />
          </a>
        </nav>
      )}
    </header>
  );
}
