import { SectionTag } from "@/components/ui/SectionTag";
import { WhatsAppIcon } from "@/components/ui/icons";
import { site, whatsappLink, whatsappMessages } from "@/lib/site";

export function CallToAction() {
  return (
    <section
      id="chamada"
      aria-labelledby="titulo-chamada"
      className="dk bg-grafite py-16 text-off sm:py-[84px] lg:py-[104px]"
    >
      <div className="wrap grid items-end gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <SectionTag gold>Fale com a equipe</SectionTag>
          <h2 id="titulo-chamada" className="text-[clamp(40px,6.2vw,92px)] leading-[.94]">
            Precisa de peças para linha pesada?
          </h2>
        </div>
        <div>
          <p className="mb-7 max-w-[440px] text-[19px] leading-[30px] text-suave">
            Conte com a {site.name}. Nossa equipe está pronta para entender sua necessidade e ajudar você a encontrar a
            solução adequada.
          </p>
          <a
            className="btn btn-wpp w-full whitespace-normal sm:w-auto"
            href={whatsappLink(whatsappMessages.cta)}
            target="_blank"
            rel="noopener"
          >
            <WhatsAppIcon />
            Entre em contato pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
