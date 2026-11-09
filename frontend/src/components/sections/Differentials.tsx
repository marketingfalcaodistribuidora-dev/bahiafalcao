import { SectionTag } from "@/components/ui/SectionTag";
import { CheckCircleIcon, ClockIcon, GridIcon, LinkIcon, StarIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

const items = [
  {
    title: "Variedade",
    text: `Amplo portfólio, com mais de ${site.catalogItems} itens no catálogo para linha pesada.`,
    Icon: GridIcon,
  },
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
    <section id="diferenciais" aria-labelledby="titulo-diferenciais" className="sec bg-off">
      <div className="wrap grid items-start gap-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28">
          <SectionTag number="03">Diferenciais</SectionTag>
          <h2 id="titulo-diferenciais">Mais do que fornecer peças, construímos confiança.</h2>
        </div>

        <ul className="border-t border-linha">
          {items.map(({ title, text, Icon }) => (
            <li
              key={title}
              className="group grid grid-cols-[48px_minmax(0,1fr)] items-start gap-4 border-b border-linha py-7 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-6"
            >
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-preto text-ouro transition-colors duration-250 group-hover:bg-ouro group-hover:text-preto sm:size-14">
                <Icon className="size-7" />
              </span>
              <div>
                <h3 className="mt-1 mb-2.5 text-[28px] leading-none sm:text-[32px]">{title}</h3>
                <p className="max-w-[560px] text-[17px] leading-[26px] text-chumbo">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
