/** Imagens do site com as dimensões reais dos arquivos (evita saltos de layout). */
export const images = {
  /** Logo vertical (símbolo acima do nome): imagem de prévia e dados estruturados. */
  logo: { src: "/images/falcao-distribuidora-logo.png", width: 690, height: 786 },
  /** Logo horizontal com fundo transparente: cabeçalho e rodapé. */
  logoHorizontal: { src: "/images/falcao-distribuidora-logo-horizontal.png", width: 1188, height: 334 },
  /** Símbolo do falcão em alta resolução, fundo transparente (extraído da logo oficial). */
  simbolo: { src: "/images/falcao-distribuidora-simbolo.png", width: 1013, height: 663 },
  fachada: { src: "/images/fachada-falcao-distribuidora-feira-de-santana.webp", width: 680, height: 382 },
  galpao: { src: "/images/galpao-falcao-distribuidora-feira-de-santana.webp", width: 677, height: 510 },
  bahiaFalcao: { src: "/images/bahia-falcao-distribuidora-de-ferramentas.webp", width: 680, height: 510 },
  atendimento: { src: "/images/loja-atendimento-falcao-distribuidora.png", width: 510, height: 402 },
  linhaPesada: { src: "/images/autopecas-linha-pesada-caminhoes.jpg", width: 1390, height: 882 },
  carretas: { src: "/images/pecas-para-carretas.jpg", width: 1356, height: 904 },
  ferramentas: { src: "/images/ferramentas-linha-pesada.jpg", width: 1290, height: 864 },
} as const;
