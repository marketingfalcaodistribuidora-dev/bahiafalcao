/** Imagens do site com as dimensões reais dos arquivos (evita saltos de layout). */
export const images = {
  /** Logo quadrada oficial (Bahia Falcão Distribuidora): dados estruturados do Google. */
  logoQuadrada: { src: "/images/bahia-falcao-distribuidora-logo.png", width: 512, height: 512 },
  /** Logo "Falcão Distribuidora" sem fundo nem moldura: página de links (/links). */
  logoLinks: { src: "/images/falcao-distribuidora-logo-links.png", width: 564, height: 642 },
  /** Logo vertical (símbolo acima do nome). */
  logo: { src: "/images/falcao-distribuidora-logo.png", width: 690, height: 786 },
  /** Logo horizontal "Falcão Distribuidora" com fundo transparente: cabeçalho e rodapé. */
  logoHorizontal: { src: "/images/falcao-distribuidora-logo-horizontal.png", width: 1188, height: 334 },
  /** Símbolo do falcão em vetor (SVG oficial, fundo transparente): hero. */
  simboloSvg: { src: "/images/falcao-distribuidora-simbolo.svg", width: 412, height: 271 },
  /** Símbolo do falcão em PNG, fundo transparente: geração dos ícones (favicon e Apple). */
  simbolo: { src: "/images/falcao-distribuidora-simbolo.png", width: 1013, height: 663 },
  fachada: { src: "/images/fachada-falcao-distribuidora-feira-de-santana.webp", width: 680, height: 382 },
  bahiaFalcao: { src: "/images/bahia-falcao-distribuidora-de-ferramentas.webp", width: 680, height: 510 },
  linhaPesada: { src: "/images/autopecas-linha-pesada-caminhoes.jpg", width: 1390, height: 882 },
  carretas: { src: "/images/pecas-para-carretas.jpg", width: 1356, height: 904 },
  ferramentas: { src: "/images/ferramentas-linha-pesada.jpg", width: 1290, height: 864 },
} as const;
