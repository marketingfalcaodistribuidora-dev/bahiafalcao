// Formatação e lint só nos arquivos preparados para o commit (spec 000, T004, CA7.5).
// Roda pelo gancho .githooks/pre-commit. Cada workspace usa o próprio ESLint (o site e a API
// têm versões e regras diferentes); --no-warn-ignored evita aviso em arquivo que o lint ignora.
const caminhos = (arquivos) => arquivos.map((arquivo) => JSON.stringify(arquivo)).join(" ");

export default {
  "*": "prettier --write --ignore-unknown",
  "api/**/*.{ts,js}": (arquivos) =>
    `npm exec -w api -- eslint --max-warnings=0 --no-warn-ignored ${caminhos(arquivos)}`,
  "frontend/**/*.{ts,tsx,js,mjs}": (arquivos) =>
    `npm exec -w frontend -- eslint --max-warnings=0 --no-warn-ignored ${caminhos(arquivos)}`,
};
