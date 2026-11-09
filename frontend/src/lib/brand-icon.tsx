import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { images } from "@/lib/images";

/** Gera o ícone da marca (símbolo do falcão em fundo preto) no tamanho pedido. */
export async function renderBrandIcon(px: number, radius: number) {
  const mark = await readFile(join(process.cwd(), "public/images/falcao-distribuidora-simbolo.png"));
  const src = `data:image/png;base64,${mark.toString("base64")}`;
  const w = Math.round(px * 0.78);
  const h = Math.round((w * images.simbolo.height) / images.simbolo.width);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0b0c",
        borderRadius: radius,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
      <img src={src} width={w} height={h} alt="" />
    </div>,
    { width: px, height: px },
  );
}
