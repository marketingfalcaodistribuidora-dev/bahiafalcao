#!/usr/bin/env node
/**
 * PostToolUse (Write|Edit): formata com Prettier o arquivo que o Claude acabou de alterar.
 * Nunca bloqueia: se o Prettier não estiver instalado ou falhar, apenas segue.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FORMATABLE = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json", ".css", ".yml", ".yaml"]);

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "").trim() || "{}");
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path ?? input?.tool_response?.filePath;
if (!filePath || !FORMATABLE.has(extname(filePath).toLowerCase()) || !existsSync(filePath)) process.exit(0);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const prettier = join(root, "node_modules", "prettier", "bin", "prettier.cjs");
if (!existsSync(prettier)) process.exit(0);

spawnSync(process.execPath, [prettier, "--write", "--ignore-unknown", "--log-level", "warn", filePath], {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
  timeout: 25_000,
});

process.exit(0);
