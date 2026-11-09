import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

export function About() {
  return (
    <section id="empresa" aria-labelledby="titulo-empresa" className="sec">
      <div className="wrap grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionTag number="01">A empresa</SectionTag>
          <h2 id="titulo-empresa">Uma parceria que movimenta o transporte.</h2>
          <p className="mt-6 max-w-[540px] text-[17px] leading-[27px] text-chumbo sm:text-lg sm:leading-[29px]">
            Desde {site.foundingYear}, a <strong className="font-semibold text-preto">{site.name}</strong>, também
            conhecida como Falcão Distribuidora, atua no mercado de autopeças. Começamos em Feira de Santana e ampliamos
            o foco para o setor pesado, o de caminhões, carretas e de quem depende deles para trabalhar.
          </p>
          <p className="mt-6 max-w-[540px] text-[17px] leading-[27px] text-chumbo sm:text-lg sm:leading-[29px]">
            Hoje reunimos um catálogo com mais de {site.catalogItems} itens e uma equipe com experiência no segmento,
            pronta para orientar a escolha da peça ou da ferramenta certa.
          </p>
        </div>

        <figure className="mr-3.5 mb-3.5 sm:mr-5 sm:mb-5">
          <div className="group relative overflow-hidden rounded-[18px] bg-grafite shadow-[14px_14px_0_var(--color-ouro)]">
            <Image
              src={images.fachada.src}
              width={images.fachada.width}
              height={images.fachada.height}
              alt="Fachada da Falcão Distribuidora, com o letreiro da empresa, em Feira de Santana, Bahia"
              sizes="(min-width: 1200px) 532px, (min-width: 1024px) 45vw, 100vw"
              className="aspect-[5/4] w-full object-cover object-[20%_50%] transition-transform duration-[800ms] group-hover:scale-[1.03]"
            />
            <span className="cap">Nossa sede</span>
          </div>
          <figcaption className="mt-7 text-sm leading-5 text-texto-2 sm:mt-9">
            {site.address.street} · {site.address.city}, {site.address.state}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
