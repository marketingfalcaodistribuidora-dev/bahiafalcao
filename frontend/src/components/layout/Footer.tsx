import Image from "next/image";
import { images } from "@/lib/images";
import { phoneHref, site, whatsappLink, whatsappMessages } from "@/lib/site";

const heading = "mb-3 font-titulo text-sm font-semibold tracking-[.12em] text-ouro uppercase";
const link = "text-off hover:text-ouro hover:underline";

export function Footer() {
  const { contact, address } = site;
  const phoneDigits = contact.phone.replace(/\D/g, "");
  const ig = contact.instagram.replace(/^@/, "").trim();

  return (
    <footer className="dk border-t-[3px] border-ouro bg-preto pt-14 pb-[88px] text-suave sm:pb-7">
      <div className="wrap grid gap-9 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Image
            src={images.logoHorizontal.src}
            width={199}
            height={56}
            alt={site.name}
            className="mb-5 h-12 w-auto sm:h-14"
          />
          <p className="max-w-[320px] text-[15px] leading-6">
            Autopeças e ferramentas para caminhões, carretas e veículos pesados. Sede em Feira de Santana, com
            distribuição para toda a Bahia.
          </p>
        </div>

        <div>
          <h2 className={heading}>Endereço</h2>
          <address className="text-[15px] leading-7 not-italic">
            {address.street}
            <br />
            {address.city} — {address.state}
            <br />
            CEP {address.postalCode}
          </address>
        </div>

        <div>
          <h2 className={heading}>Contato</h2>
          <ul className="text-[15px] leading-7">
            {contact.hoursText && <li>Horário: {contact.hoursText}</li>}
            <li>
              WhatsApp:{" "}
              <a className={link} href={whatsappLink(whatsappMessages.contato)} target="_blank" rel="noopener">
                conversar agora
              </a>
            </li>
            {phoneDigits && (
              <li>
                Telefone:{" "}
                <a className={link} href={phoneHref}>
                  {contact.phone}
                </a>
              </li>
            )}
            {ig && (
              <li>
                Instagram:{" "}
                <a className={link} href={`https://instagram.com/${ig}`} target="_blank" rel="noopener">
                  @{ig}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="wrap">
        <p className="mt-10 border-t border-chumbo pt-5 text-sm text-apagado">
          © {new Date().getFullYear()} {site.name}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
