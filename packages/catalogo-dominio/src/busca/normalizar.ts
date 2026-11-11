// Forma normalizada de um código (referência ou código interno) para comparar e buscar:
// sem acentos, sem pontuação, sem espaços, em maiúsculas. "SC-03.158" → "SC03158".
export function normalizarCodigo(codigo: string): string {
  return codigo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
