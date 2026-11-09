import { renderBrandIcon } from "@/lib/brand-icon";

/** Favicon (aba do navegador e resultados do Google no celular). */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return renderBrandIcon(size.width, 96);
}
