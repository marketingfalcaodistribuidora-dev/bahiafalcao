import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { ArrowRight } from "@/components/ui/icons";
import { images } from "@/lib/images";
import { whatsappLink, whatsappMessages } from "@/lib/site";

const segments = [
  {
    title: "Autopeças para linha pesada",
    text: "Produtos destinados à manutenção e operação de caminhões e veículos pesados.",
    image: images.linhaPesada,
    alt: "Autopeças para caminhões e veículos de linha pesada",
    message: whatsappMessages.linhaPesada,
  },
  {
    title: "Peças para carretas",
    text: "Soluções para o segmento de transporte rodoviário e implementos.",
    image: images.carretas,
    alt: "Frota de caminhões e carretas do transporte rodoviário",
    message: whatsappMessages.carretas,
  },
  {
    title: "Ferramentas",
    text: "Ferramentas e produtos de apoio para profissionais e operações do setor.",
    image: images.ferramentas,
    alt: "Jogo de chaves e ferramentas de aço para manutenção de veículos pesados",
    message: whatsappMessages.ferramentas,
  },
];

export function Segments() {
  return (
    <section id="segmentos" aria-labelledby="titulo-segmentos" className="sec dk bg-preto text-off">
      <div className="wrap">
        <SectionTag number="02" gold>
          Especialização
        </SectionTag>
        <h2 id="titulo-segmentos" className="max-w-[820px]">
          Soluções para quem mantém o transporte em movimento.
        </h2>

        <div className="mt-11 border-t border-chumbo sm:mt-[72px]">
          {segments.map((s, i) => {
            const rev = i % 2 === 1;
            return (
              <article
                key={s.title}
                className={`group grid items-center gap-[18px] border-b border-chumbo py-9 sm:gap-6 lg:gap-10 lg:py-11 ${
                  rev
                    ? "grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)] lg:grid-cols-[104px_minmax(0,6fr)_minmax(0,5fr)]"
                    : "grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)] lg:grid-cols-[104px_minmax(0,5fr)_minmax(0,6fr)]"
                }`}
              >
                <span aria-hidden className="num col-[1] row-[1] text-[44px] sm:text-[64px] lg:text-[92px]">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className={`col-[2] row-[1] ${rev ? "lg:col-[3]" : ""}`}>
                  <h3 className="mb-4 text-[clamp(30px,3.4vw,46px)] leading-none">{s.title}</h3>
                  <p className="mb-5 max-w-[440px] text-[17px] leading-[27px] text-suave">{s.text}</p>
                  <a
                    href={whatsappLink(s.message)}
                    target="_blank"
                    rel="noopener"
                    className="group/link inline-flex min-h-11 items-center gap-2.5 font-titulo text-base font-semibold tracking-[.1em] text-ouro uppercase underline decoration-2 underline-offset-[6px]"
                  >
                    Consultar este segmento<span className="sr-only">: {s.title}</span>
                    <ArrowRight className="size-[18px] transition-transform group-hover/link:translate-x-[5px]" />
                  </a>
                </div>

                <div
                  className={`relative col-[1/-1] row-[2] aspect-[16/10] overflow-hidden rounded-[18px] border border-chumbo bg-grafite transition-colors duration-300 group-hover:border-ouro sm:aspect-[21/9] lg:row-[1] lg:aspect-[16/10] ${
                    rev ? "lg:col-[2]" : "lg:col-[3]"
                  }`}
                >
                  <Image
                    src={s.image.src}
                    fill
                    alt={s.alt}
                    sizes="(min-width: 1200px) 560px, (min-width: 1024px) 48vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
