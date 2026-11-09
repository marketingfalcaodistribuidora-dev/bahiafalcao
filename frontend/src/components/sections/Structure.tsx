import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { images } from "@/lib/images";

const photos = [
  {
    image: images.fachada,
    alt: "Fachada da Falcão Distribuidora, loja de autopeças para linha pesada em Feira de Santana",
    caption: "Fachada",
    box: "h-60 sm:h-[380px] lg:col-span-7 lg:h-[460px]",
    sizes: "(min-width: 1200px) 640px, (min-width: 1024px) 58vw, 100vw",
  },
  {
    image: images.atendimento,
    alt: "Ambiente de atendimento e estoque da Falcão Distribuidora",
    caption: "Atendimento",
    box: "h-[200px] sm:h-[300px] lg:col-span-5 lg:h-[460px]",
    sizes: "(min-width: 1200px) 450px, (min-width: 1024px) 42vw, 100vw",
  },
  {
    image: images.galpao,
    alt: "Galpão da Falcão Distribuidora com portões de carga em Feira de Santana",
    caption: "Galpão",
    box: "h-60 sm:h-[340px] lg:col-span-6 lg:h-[400px]",
    sizes: "(min-width: 1200px) 545px, (min-width: 1024px) 50vw, 100vw",
  },
  {
    image: images.bahiaFalcao,
    alt: "Fachada da Bahia Falcão Distribuidora de Ferramentas, do mesmo grupo",
    caption: "Bahia Falcão · Ferramentas",
    box: "h-60 sm:h-[340px] lg:col-span-6 lg:h-[400px]",
    sizes: "(min-width: 1200px) 545px, (min-width: 1024px) 50vw, 100vw",
  },
];

export function Structure() {
  return (
    <section id="estrutura" aria-labelledby="titulo-estrutura" className="sec">
      <div className="wrap">
        <SectionTag number="04">Nossa estrutura</SectionTag>
        <h2 id="titulo-estrutura">Uma estrutura preparada para atender você.</h2>
        <p className="mt-5 max-w-[560px] text-lg leading-7 text-chumbo">
          Fachada, galpão e ambiente de atendimento em Feira de Santana, para você conhecer de perto onde a Bahia Falcão
          trabalha. Do mesmo grupo, a Bahia Falcão Distribuidora de Ferramentas é dedicada à distribuição de
          ferramentas.
        </p>

        <div className="mt-9 grid gap-3.5 sm:mt-14 sm:gap-5 lg:grid-cols-12">
          {photos.map((p) => (
            <figure key={p.caption} className={`group relative overflow-hidden rounded-[18px] bg-grafite ${p.box}`}>
              <Image
                src={p.image.src}
                fill
                alt={p.alt}
                sizes={p.sizes}
                className="object-cover transition-transform duration-[800ms] group-hover:scale-[1.03]"
              />
              <figcaption className="cap">{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
