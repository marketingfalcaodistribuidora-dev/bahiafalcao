import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { ArrowRight, CheckCircleIcon, ClockIcon, GridIcon, LinkIcon, StarIcon } from "@/components/ui/icons";
import { images } from "@/lib/images";
import { site, whatsappLink, whatsappMessages } from "@/lib/site";

const items = [
  {
    title: "Qualidade",
    text: "Compromisso com a procedência dos produtos e com a relação com os fornecedores.",
    Icon: CheckCircleIcon,
  },
  {
    title: "Agilidade",
    text: "Atendimento direto com a equipe comercial para tirar dúvidas e indicar a peça adequada.",
    Icon: ClockIcon,
  },
  { title: "Experiência", text: "Conhecimento do segmento de linha pesada, de caminhões a carretas.", Icon: StarIcon },
  { title: "Relacionamento", text: "Proximidade e compromisso com clientes e parceiros.", Icon: LinkIcon },
];

export function Differentials() {
  return (
    <section
      id="diferenciais"
      aria-labelledby="titulo-diferenciais"
      className="sec bg-off bg-[radial-gradient(rgb(11_11_12/0.07)_1px,transparent_1px)] bg-size-[22px_22px]"
    >
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
          {/* Destaque: Variedade */}
          <li className="dk relative flex flex-col overflow-hidden rounded-[18px] bg-preto p-7 text-off sm:col-span-2 sm:p-9 lg:col-span-1 lg:row-span-2">
            <Image
              src={images.simbolo.src}
              width={360}
              height={236}
              alt=""
              sizes="360px"
              className="pointer-events-none absolute -right-20 -bottom-6 w-[360px] max-w-none opacity-[0.07]"
            />
            <span className="flex size-14 items-center justify-center rounded-[14px] bg-ouro text-preto">
              <GridIcon className="size-7" />
            </span>
            <p className="mt-8 font-titulo text-[76px] leading-[.85] font-bold text-ouro uppercase sm:text-[92px]">
              {site.catalogItems}+
            </p>
            <p className="mt-2 font-titulo text-sm font-semibold tracking-[.14em] text-suave uppercase">
              itens no catálogo
            </p>
            <h3 className="mt-8 text-[32px] leading-none">Variedade</h3>
            <p className="mt-3 max-w-[360px] text-[17px] leading-[27px] text-suave">
              Amplo portfólio para linha pesada: peças para caminhões, carretas e ferramentas em um só lugar.
            </p>
            <div className="relative mt-auto pt-8">
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

          {items.map(({ title, text, Icon }, i) => (
            <li
              key={title}
              className="group flex flex-col rounded-[18px] border border-claro bg-white p-6 transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-ouro hover:shadow-[0_22px_40px_-22px_rgb(11_11_12/0.45)] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-14 items-center justify-center rounded-[14px] bg-preto text-ouro transition-colors duration-300 group-hover:bg-ouro group-hover:text-preto">
                  <Icon className="size-7" />
                </span>
                <span
                  aria-hidden
                  className="font-titulo text-[48px] leading-[.85] font-bold text-transparent transition-colors duration-300 [-webkit-text-stroke:1.5px_var(--color-claro)] group-hover:[-webkit-text-stroke-color:var(--color-ouro)]"
                >
                  {String(i + 2).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 text-[28px] leading-none sm:text-[30px]">{title}</h3>
              <p className="mt-3 text-base leading-[26px] text-chumbo">{text}</p>
              <span aria-hidden className="mt-auto block pt-6">
                <span className="block h-[3px] w-10 rounded-full bg-ouro transition-[width] duration-300 group-hover:w-20" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
