// Lint da API do catálogo (spec 000, CA4.4; api/CLAUDE.md, "Proibições").
// typescript-eslint no modo strict com tipos + regras de segurança. O que é proibido no
// projeto vira erro aqui, e o teste tests/unit/lint/regras-proibidas.test.ts garante isso.
import { defineConfig } from "eslint/config";
import security from "eslint-plugin-security";
import tseslint from "typescript-eslint";

// SQL montado com texto: barra o nome em qualquer forma de escrita (ponto, colchetes, constante,
// texto de template e desestruturação), não só a chamada literal.
/**
 * @param {string} nome
 * @param {string} alternativa
 */
const sqlComTexto = (nome, alternativa) => {
  const message = `Proibido: use ${alternativa} com template (parametrizado).`;
  return [
    { selector: `Identifier[name='${nome}']`, message },
    { selector: `Literal[value='${nome}']`, message },
    // `\\` vira uma barra no texto final, e o seletor fica /\$queryRawUnsafe/ (o $ escapado na regex).
    { selector: `TemplateElement[value.raw=/\\${nome}/]`, message },
  ];
};

const proibidos = [
  ...sqlComTexto("$queryRawUnsafe", "$queryRaw"),
  ...sqlComTexto("$executeRawUnsafe", "$executeRaw"),
  {
    selector: "MemberExpression[object.name='Prisma'][property.name='raw']",
    message: "Proibido: Prisma.raw cola texto direto no SQL. Use Prisma.sql com parâmetros.",
  },
  {
    selector: "MemberExpression[object.name='Prisma'][property.value='raw']",
    message: "Proibido: Prisma.raw cola texto direto no SQL. Use Prisma.sql com parâmetros.",
  },
  {
    // Um apelido (`import { Prisma as P }`) esconderia o `P.raw` das regras acima.
    selector: "ImportSpecifier[imported.name='Prisma'][local.name!='Prisma']",
    message: "Importe o Prisma com o próprio nome, sem apelido (as regras contra Prisma.raw dependem dele).",
  },
];

export default defineConfig(
  { ignores: ["node_modules/", "coverage/", "dist/", "contracts/", "src/generated/"] },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  security.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // Fora do tsconfig: este arquivo (.js) e o arquivo virtual do teste das regras proibidas,
        // que não existe no disco.
        projectService: { allowDefaultProject: ["eslint.config.js", "tests/unit/lint/exemplo-virtual.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Comentários como `eslint-disable` não desligam nada: o que é proibido continua proibido
    // (api/CLAUDE.md: nunca desativar regras de lint para "passar").
    linterOptions: { noInlineConfig: true },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "no-eval": "error",
      "no-implied-eval": "off",
      "@typescript-eslint/no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-syntax": ["error", ...proibidos],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              importNames: ["raw"],
              message: "Proibido: raw cola texto no SQL. Use Prisma.sql.",
            },
          ],
          patterns: [
            {
              group: ["@prisma/client/runtime", "@prisma/client/runtime/*"],
              importNames: ["raw"],
              message: "Proibido: raw cola texto no SQL. Use Prisma.sql.",
            },
          ],
        },
      ],
    },
  },
  {
    // Única exceção: esta configuração precisa escrever os nomes proibidos para barrá-los.
    files: ["eslint.config.js"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Testes e scripts de ferramenta (rodados à mão ou no CI, nunca na API): passam caminhos
    // vindos da linha de comando e índices internos de propósito; as regras de segurança que
    // procuram esses padrões geram ruído ali, sem proteger nada.
    files: ["tests/**/*.ts", "scripts/**/*.ts"],
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
);
