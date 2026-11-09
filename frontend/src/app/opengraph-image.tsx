import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/**
 * Imagem de prévia ao compartilhar o link (WhatsApp, Facebook, LinkedIn, X).
 * PNG 1200×630: formato e tamanho aceitos por todos, abaixo de 300 KB (limite do WhatsApp).
 */
export const alt = `${site.name}: autopeças para linha pesada em Feira de Santana, Bahia`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRETO = "#0b0b0c";
const OURO = "#f8c000";
const OFF = "#f5f4f0";
const SUAVE = "#b5b5bb";

export default async function OpengraphImage() {
  // Caminhos literais para o bundler rastrear só estes arquivos.
  const [logo, semibold, bold] = await Promise.all([
    readFile(join(process.cwd(), "public/images/falcao-distribuidora-logo.png")),
    readFile(join(process.cwd(), "src/assets/fonts/barlow-condensed-latin-600.woff")),
    readFile(join(process.cwd(), "src/assets/fonts/barlow-condensed-latin-700.woff")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: PRETO,
        fontFamily: "Barlow Condensed",
        borderBottom: `14px solid ${OURO}`,
        padding: "0 80px",
        gap: 72,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
      <img src={logoSrc} width={263} height={300} alt="" />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            color: PRETO,
            background: OURO,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 4,
            padding: "6px 18px",
            borderRadius: 8,
          }}
        >
          FEIRA DE SANTANA · BAHIA
        </div>
        <div style={{ display: "flex", color: OFF, fontSize: 96, fontWeight: 700, lineHeight: 0.95, marginTop: 28 }}>
          PEÇAS PARA LINHA PESADA.
        </div>
        <div style={{ display: "flex", color: OURO, fontSize: 44, fontWeight: 600, marginTop: 20 }}>
          Caminhões, carretas e ferramentas
        </div>
        <div style={{ display: "flex", color: SUAVE, fontSize: 32, fontWeight: 600, marginTop: 32, letterSpacing: 1 }}>
          {`WhatsApp ${site.contact.whatsappDisplay}  ·  ${site.contact.phone}`}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Barlow Condensed", data: semibold, weight: 600, style: "normal" },
        { name: "Barlow Condensed", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
