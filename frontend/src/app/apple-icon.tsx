import { renderBrandIcon } from "@/lib/brand-icon";

/** Ícone da tela inicial do iPhone/iPad (o iOS aplica os cantos arredondados). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderBrandIcon(size.width, 0);
}
