import type { ComponentType, ReactNode, SVGProps } from "react";
import { SectionTag } from "@/components/ui/SectionTag";
import { ArrowRight, ClockIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/ui/icons";
import { mapsEmbedUrl, phoneHref, site, whatsappLink, whatsappMessages } from "@/lib/site";

type Row = { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; content: ReactNode };

const linkClass = "font-semibold text-ouro-t hover:text-preto";

export function Contact() {
  const { address, contact } = site;
  const phoneDigits = contact.phone.replace(/\D/g, "");
  const ig = contact.instagram.replace(/^@/, "").trim();
  const waDigits = contact.whatsapp.replace(/\D/g, "");

  const rows: Row[] = [
    {
      label: "Endereço",
      Icon: PinIcon,
      content: (
        <address className="not-italic">
          {address.street}
          <br />
          {address.city} — {address.state} · CEP {address.postalCode}
        </address>
      ),
    },
    ...(phoneDigits
      ? [
          {
            label: "Telefone",
            Icon: PhoneIcon,
            content: (
              <a className={linkClass} href={phoneHref}>
                {contact.phone}
              </a>
            ),
          },
        ]
      : []),
    {
      label: "WhatsApp",
      Icon: WhatsAppIcon,
      content: (
        <>
          <a className={linkClass} href={whatsappLink(whatsappMessages.contato)} target="_blank" rel="noopener">
            Conversar pelo WhatsApp
          </a>
          {waDigits && <span className="block">Atendimento direto: {contact.whatsappDisplay}</span>}
        </>
      ),
    },
    ...(ig
      ? [
          {
            label: "Instagram",
            Icon: InstagramIcon,
            content: (
              <a className={linkClass} href={`https://instagram.com/${ig}`} target="_blank" rel="noopener">
                @{ig}
              </a>
            ),
          },
        ]
      : []),
    ...(contact.hoursLines.length
      ? [
          {
            label: "Horário",
            Icon: ClockIcon,
            content: contact.hoursLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            )),
          },
        ]
      : []),
  ];

  return (
    <section id="contato" aria-labelledby="titulo-contato" className="sec">
      <div className="wrap grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionTag number="05">Contato</SectionTag>
          <h2 id="titulo-contato">Estamos prontos para atender você.</h2>

          <dl className="mt-9 border-t border-linha">
            {rows.map(({ label, Icon, content }) => (
              <div
                key={label}
                className="grid gap-1 border-b border-linha py-[18px] sm:grid-cols-[178px_minmax(0,1fr)]"
              >
                <dt className="flex items-center gap-3.5 font-titulo text-sm leading-6 font-semibold tracking-[.1em] text-texto-2 uppercase sm:gap-4">
                  <Icon className="size-6 shrink-0 text-preto" />
                  {label}
                </dt>
                <dd className="pl-[38px] text-[17px] leading-6 sm:pl-0">{content}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="dk self-start rounded-[18px] bg-preto p-6 text-off sm:p-9">
          <SectionTag gold>Como chegar</SectionTag>
          <h3 className="mb-2.5 text-[34px] leading-none">{site.name}</h3>
          <p className="text-[17px] leading-[26px] text-suave">
            {address.street}
            <br />
            {address.city} — {address.state} · CEP {address.postalCode}
          </p>
          <div className="relative mt-7 aspect-[4/3] overflow-hidden rounded-[14px] border border-chumbo bg-grafite sm:aspect-[16/11]">
            <iframe
              src={mapsEmbedUrl}
              title={`Mapa da ${site.name} no Google Maps`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
            />
          </div>
          <a
            className="btn btn-ouro mt-7 w-full whitespace-normal sm:w-auto"
            href={site.mapsUrl}
            target="_blank"
            rel="noopener"
          >
            Abrir rota no Google Maps
            <ArrowRight className="seta" />
          </a>
        </div>
      </div>
    </section>
  );
}
