import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { GlobeIcon, InstagramIcon, PhoneIcon, PinIcon, TikTokIcon, WhatsAppIcon } from "@/components/ui/icons";
import { images } from "@/lib/images";
import { phoneHref, site, whatsappLink, whatsappMessages } from "@/lib/site";

/** Página de links para a bio do Instagram (spec 001). Não indexada; os links são seguidos. */
export const metadata: Metadata = {
  title: "Links",
  description: `Canais oficiais da ${site.name}: WhatsApp, site, localização e redes sociais.`,
  alternates: { canonical: "/links" },
  robots: { index: false, follow: true },
};

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const externo = { target: "_blank", rel: "noopener" } as const;
const botao =
  "group flex min-h-14 w-full items-center gap-3.5 rounded-[14px] px-5 py-2.5 font-titulo text-[17px] font-semibold tracking-[.06em] uppercase transition-colors";

export default function LinksPage() {
  const { contact } = site;
  const waInstagram = whatsappLink(whatsappMessages.instagram);

  const principais: {
    label: string;
    detalhe?: string;
    href: string;
    Icon: Icon;
    destaque?: boolean;
    externo: boolean;
  }[] = [
    { label: "Fale conosco pelo WhatsApp", href: waInstagram, Icon: WhatsAppIcon, destaque: true, externo: true },
    { label: "Visite nosso site", href: "/", Icon: GlobeIcon, externo: false },
    {
      label: "Nossa localização",
      detalhe: `${site.address.street}, ${site.address.city}`,
      href: contact.googleBusinessUrl,
      Icon: PinIcon,
      externo: true,
    },
  ];

  const redes: { label: string; href: string; Icon: Icon; externo: boolean }[] = [
    { label: "Instagram", href: `https://instagram.com/${contact.instagram}`, Icon: InstagramIcon, externo: true },
    { label: "TikTok", href: `https://www.tiktok.com/@${contact.tiktok}`, Icon: TikTokIcon, externo: true },
    { label: "WhatsApp", href: waInstagram, Icon: WhatsAppIcon, externo: true },
    { label: `Ligar para ${contact.phone}`, href: phoneHref, Icon: PhoneIcon, externo: false },
  ];

  return (
    <main
      id="conteudo"
      className="dk flex min-h-dvh items-start justify-center bg-preto px-4 py-12 text-off sm:items-center sm:py-16"
    >
      <div className="flex w-full max-w-[440px] flex-col items-center text-center">
        <Image
          src={images.logoLinks.src}
          width={126}
          height={144}
          alt="Falcão Distribuidora"
          priority
          className="h-36 w-auto"
        />
        <h1 className="mt-5 text-[30px] leading-none normal-case">{site.name}</h1>
        <p className="mt-2 text-[15px] text-suave">Autopeças e ferramentas · Linha pesada</p>
        <p className="mt-1 text-sm text-apagado">Sede em Feira de Santana · distribuição para toda a Bahia</p>

        <nav aria-label="Links principais" className="mt-8 flex w-full flex-col gap-3">
          {principais.map(({ label, detalhe, href, Icon, destaque, externo: ext }) => {
            const classes = `${botao} ${
              destaque
                ? "bg-wpp text-preto hover:bg-wpp-h"
                : "border border-chumbo bg-grafite text-off hover:border-ouro hover:text-ouro"
            }`;
            const conteudo = (
              <>
                <Icon className="size-[22px] shrink-0" />
                <span className="flex-1 text-left">
                  <span className="block">{label}</span>
                  {detalhe && (
                    <span className="mt-0.5 flex items-center gap-1 font-texto text-[13px] leading-5 font-normal tracking-normal text-suave normal-case">
                      <PinIcon className="size-3.5 shrink-0 text-ouro" />
                      {detalhe}
                    </span>
                  )}
                </span>
              </>
            );
            return ext ? (
              <a key={label} href={href} {...externo} className={classes}>
                {conteudo}
              </a>
            ) : (
              <Link key={label} href={href} className={classes}>
                {conteudo}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Redes sociais e contato" className="mt-8 flex gap-3">
          {redes.map(({ label, href, Icon, externo: ext }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              {...(ext ? externo : {})}
              className="flex size-12 items-center justify-center rounded-full border border-chumbo text-ouro transition-colors hover:border-ouro hover:bg-ouro hover:text-preto"
            >
              <Icon className="size-[22px]" />
            </a>
          ))}
        </nav>

        <p className="mt-10 text-xs text-apagado">
          © {new Date().getFullYear()} {site.name}
        </p>
      </div>
    </main>
  );
}
