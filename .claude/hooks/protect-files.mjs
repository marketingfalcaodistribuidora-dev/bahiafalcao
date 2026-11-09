#!/usr/bin/env node
/**
 * PreToolUse (Write|Edit): impede que o Claude altere arquivos sensíveis ou de referência.
 * Saída com código 2 bloqueia a ação e devolve o motivo ao Claude.
 */
import { readFileSync } from "node:fs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "").trim() || "{}");
} catch {
  process.exit(0);
}

const filePath = String(input?.tool_input?.file_path ?? "").replace(/\\/g, "/");
if (!filePath) process.exit(0);

const name = filePath.split("/").pop() ?? "";

const rules = [
  {
    test: () => /^\.env(\..+)?$/.test(name) && name !== ".env.example",
    reason: `"${name}" guarda segredos. Edite manualmente; o Claude só pode alterar .env.example.`,
  },
  {
    test: () => name === "package-lock.json",
    reason: "package-lock.json é gerado pelo npm. Use npm install/uninstall em vez de editar à mão.",
  },
  {
    test: () => filePath.includes("/docs/design/"),
    reason: "docs/design é a referência original do Claude Design e é somente leitura.",
  },
];

for (const rule of rules) {
  if (rule.test()) {
    process.stderr.write(`Bloqueado pelo hook protect-files: ${rule.reason}\n`);
    process.exit(2);
  }
}

process.exit(0);
