import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  globalIgnores(["src/generated/**", "coverage/**"]),
  {
    rules: {
      // SQL só por template (Prisma.sql / $queryRaw`...`): nada de concatenar texto em consulta.
      "no-restricted-properties": [
        "error",
        { object: "Prisma", property: "raw", message: "Use Prisma.sql (template) em vez de Prisma.raw." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name=/^\$(queryRawUnsafe|executeRawUnsafe)$/]",
          message: "Use $queryRaw/$executeRaw com template em vez das versões Unsafe.",
        },
      ],
    },
  },
]);
