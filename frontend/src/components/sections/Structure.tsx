import Image from "next/image";
import { SectionTag } from "@/components/ui/SectionTag";
import { images } from "@/lib/images";

const photos = [
  {
    image: images.fachada,
    alt: "Fachada da Falcão Distribuidora, loja de autopeças para linha pesada em Feira de Santana",
    caption: "Fachada",
  },
  {
    image: images.bahiaFalcao,
    alt: "Fachada da Bahia Falcão Distribuidora de Ferramentas, do mesmo grupo",
    caption: "Bahia Falcão · Ferramentas",
  },
];

export function Structure() {
  return (
    <section id="estrutura" aria-labelledby="titulo-estrutura" className="sec">
      <div className="wrap">
        <SectionTag number="04">Nossa estrutura</SectionTag>
        <h2 id="titulo-estrutura">Uma estrutura preparada para atender você.</h2>
        <p className="mt-5 max-w-[560px] text-lg leading-7 text-chumbo">
          Conheça de perto a fachada da Bahia Falcão em Feira de Santana. Do mesmo grupo, a Bahia Falcão Distribuidora
          de Ferramentas é dedicada à distribuição de ferramentas.
        </p>

        <div className="mt-9 grid gap-3.5 sm:mt-14 sm:gap-5 lg:grid-cols-2">
          {photos.map((p) => (
            <figure
              key={p.caption}
              className="group relative h-60 overflow-hidden rounded-[18px] bg-grafite sm:h-[340px] lg:h-[440px]"
            >
              <Image
                src={p.image.src}
                fill
                alt={p.alt}
                sizes="(min-width: 1200px) 545px, (min-width: 1024px) 50vw, 100vw"
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
