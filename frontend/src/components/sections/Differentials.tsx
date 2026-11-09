import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { ArrowRight } from "@/components/ui/icons";
import { images } from "@/lib/images";
import { site, whatsappLink, whatsappMessages } from "@/lib/site";

const items = [
  {
    title: "Qualidade",
    text: "Compromisso com a procedência dos produtos e com a relação com os fornecedores.",
  },
  {
    title: "Agilidade",
    text: "Atendimento direto com a equipe comercial para tirar dúvidas e indicar a peça adequada.",
  },
  { title: "Experiência", text: "Conhecimento do segmento de linha pesada, de caminhões a carretas." },
  { title: "Relacionamento", text: "Proximidade e compromisso com clientes e parceiros." },
];

export function Differentials() {
  return (
    <section id="diferenciais" aria-labelledby="titulo-diferenciais" className="sec bg-off">
      <div className="wrap">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <SectionTag number="03">Diferenciais</SectionTag>
            <h2 id="titulo-diferenciais" className="max-w-[680px]">
              Mais do que fornecer peças, construímos confiança.
            </h2>
          </div>
          <p className="max-w-[460px] text-[17px] leading-[27px] text-chumbo lg:pb-1.5">
            Desde {site.foundingYear} ao lado de quem mantém o transporte em movimento, com variedade, procedência e
            atendimento que entende de linha pesada.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {/* Destaque: Variedade, sobre foto real de autopeças */}
          <li className="dk relative isolate flex min-h-[440px] flex-col justify-end overflow-hidden rounded-[18px] bg-preto p-7 text-off sm:col-span-2 sm:p-9 lg:col-span-1 lg:row-span-2">
            <Image
              src={images.linhaPesada.src}
              fill
              alt=""
              sizes="(min-width: 1024px) 360px, 100vw"
              className="-z-20 object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--color-preto)_38%,rgb(11_11_12/0.82)_62%,rgb(11_11_12/0.35))]"
            />
            <p className="font-titulo text-[76px] leading-[.85] font-bold text-ouro uppercase sm:text-[92px]">
              {site.catalogItems}+
            </p>
            <p className="mt-2 font-titulo text-sm font-semibold tracking-[.14em] text-off/80 uppercase">
              itens no catálogo
            </p>
            <h3 className="mt-7 text-[32px] leading-none">Variedade</h3>
            <p className="mt-3 max-w-[380px] text-[17px] leading-[27px] text-suave">
              Amplo portfólio para linha pesada: peças para caminhões, carretas e ferramentas em um só lugar.
            </p>
            <div className="pt-8">
              <a
                href={whatsappLink(whatsappMessages.peca)}
                target="_blank"
                rel="noopener"
                className="btn btn-ouro btn-sm w-full whitespace-normal sm:w-auto"
              >
                Consultar uma peça
                <ArrowRight className="seta" />
              </a>
            </div>
          </li>

          {items.map(({ title, text }, i) => (
            <li
              key={title}
              className="group relative flex flex-col overflow-hidden rounded-[18px] border border-claro bg-white p-7 transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-ouro hover:shadow-[0_22px_40px_-24px_rgb(11_11_12/0.4)] sm:p-8"
            >
              <span
                aria-hidden
                className="absolute top-0 left-7 h-[3px] w-12 rounded-b-full bg-ouro transition-[width] duration-300 group-hover:w-24 sm:left-8"
              />
              <span
                aria-hidden
                className="font-titulo text-[64px] leading-[.8] font-bold text-transparent transition-colors duration-300 [-webkit-text-stroke:1.5px_var(--color-ouro)] group-hover:text-ouro"
              >
                {String(i + 2).padStart(2, "0")}
              </span>
              <h3 className="mt-7 text-[28px] leading-none sm:text-[30px]">{title}</h3>
              <p className="mt-3 text-base leading-[26px] text-chumbo">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
