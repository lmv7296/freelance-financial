// Compares every language file with the Dutch one (the source language) and lists
// missing keys, extra keys and placeholders that don't match.
// Run: pnpm i18n:check
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "src", "lib", "i18n", "locales");
const SOURCE = "nl";

const load = (code) =>
  JSON.parse(readFileSync(join(dir, `${code}.json`), "utf8"));

/** Flattens { a: { b: "x" } } to { "a.b": "x" }; arrays count as one value */
function flatten(node, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix + key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, `${path}.`, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

const placeholders = (value) =>
  [...JSON.stringify(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const source = flatten(load(SOURCE));
let problems = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const code = file.replace(".json", "");
  if (code === SOURCE) continue;
  const target = flatten(load(code));
  const report = [];

  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      report.push(`missing      ${key}`);
    } else if (
      placeholders(source[key]).join() !== placeholders(target[key]).join()
    ) {
      report.push(`placeholders ${key}`);
    } else if (
      Array.isArray(source[key]) &&
      source[key].length !== target[key]?.length
    ) {
      report.push(`list length  ${key}`);
    }
  }
  for (const key of Object.keys(target)) {
    if (!(key in source)) report.push(`extra        ${key}`);
  }

  problems += report.length;
  console.log(
    report.length
      ? `${code}.json: ${report.length} problem(s)\n  ${report.join("\n  ")}`
      : `${code}.json: OK`,
  );
}

process.exit(problems ? 1 : 0);
