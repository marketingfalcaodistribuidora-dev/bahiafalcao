import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { ArrowRight, WhatsAppIcon } from "@/components/ui/icons";
import { images } from "@/lib/images";
import { site, whatsappLink, whatsappMessages } from "@/lib/site";

const facts = [
  { value: site.foundingYear, label: "Atuação no mercado de autopeças", big: true },
  { value: `${site.catalogItems}+`, label: "Itens no catálogo", big: true },
  { value: "Linha pesada", label: "Caminhões e carretas", big: false },
  { value: "Feira de Santana", label: "Sede e estoque na Bahia", big: false },
];

// Bordas e recuos de cada item: 2 colunas no celular e tablet, 4 no desktop.
const factLayout = [
  "border-r pr-3 sm:pr-6",
  "pl-3 sm:pl-6 lg:border-r lg:pr-6",
  "border-t border-r pr-3 sm:pr-6 lg:border-t-0 lg:pl-6",
  "border-t pl-3 sm:pl-6 lg:border-t-0",
];

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="titulo-principal" className="dk relative overflow-hidden bg-preto text-off">
      <div className="wrap grid items-center gap-8 pt-12 pb-10 sm:pt-[72px] sm:pb-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:pt-[88px] lg:pb-20">
        <div>
          <SectionTag gold className="animate-up">
            Feira de Santana · Bahia
          </SectionTag>
          <h1 id="titulo-principal">
            <span className="block animate-rise text-[clamp(46px,7vw,100px)] leading-[.92] [animation-delay:.08s]">
              Peças para linha pesada.
            </span>
            <span className="mt-5 block animate-rise text-[clamp(24px,2.9vw,42px)] leading-none text-balance text-ouro normal-case [animation-delay:.18s]">
              Confiança para seguir em frente.
            </span>
          </h1>
          <p className="mt-[22px] mb-7 max-w-[560px] animate-rise text-[17px] leading-[27px] text-suave [animation-delay:.28s] sm:mt-7 sm:mb-9 sm:text-[19px] sm:leading-[30px]">
            Na {site.name}, você encontra autopeças e ferramentas para o segmento de linha pesada, com atendimento
            especializado e compromisso com quem mantém o transporte em movimento.
          </p>
          <div className="flex animate-up flex-wrap gap-3.5 [animation-delay:.38s]">
            <a
              className="btn btn-ouro w-full sm:w-auto"
              href={whatsappLink(whatsappMessages.hero)}
              target="_blank"
              rel="noopener"
            >
              <WhatsAppIcon />
              Fale com nossa equipe
              <ArrowRight className="seta" />
            </a>
            <a className="btn btn-ghost w-full sm:w-auto" href="#segmentos">
              Conheça nossos segmentos
            </a>
          </div>
        </div>
        <div className="hidden animate-up justify-end [animation-delay:.18s] lg:flex">
          <Image
            src={images.simbolo.src}
            width={540}
            height={366}
            alt=""
            sizes="540px"
            className="h-auto w-full max-w-[540px]"
          />
        </div>
      </div>

      <div className="border-t border-chumbo">
        <dl className="wrap grid grid-cols-2 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`flex flex-col-reverse border-chumbo pt-5 pb-[22px] sm:pt-[26px] sm:pb-7 ${factLayout[i]}`}
            >
              <dt className="mt-1.5 text-sm leading-5 text-suave">{f.label}</dt>
              <dd
                className={`flex min-h-[38px] items-end font-titulo font-bold text-off uppercase sm:min-h-[46px] ${
                  f.big
                    ? "text-[34px] leading-[38px] sm:text-[44px] sm:leading-[46px]"
                    : "text-[22px] leading-[26px] sm:text-[28px] sm:leading-8"
                }`}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
