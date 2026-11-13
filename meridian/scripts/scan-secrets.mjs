import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const skip = new Set(["node_modules", ".next", "data", ".e2e-data", "test-results", "playwright-report", ".git"]);
const patterns = [
  /AKIA[0-9A-Z]{16}/,
  /sk_live_[0-9A-Za-z]{10,}/,
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
  /mk_live_[A-Za-z0-9]{16,}/,
];
const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|md|yml|json|example|sh)$/.test(entry)) continue;
    const text = readFileSync(full, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(text)) hits.push(`${path.relative(root, full)} matches ${pattern}`);
    }
  }
}

walk(root);
if (hits.length > 0) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log("secret scan: no live key patterns");
