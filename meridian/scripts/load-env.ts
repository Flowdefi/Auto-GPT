import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// CLI scripts do not boot Next, so MERIDIAN_SEED_DEMO and the other keys in
// meridian/.env.local would otherwise be invisible and demo rows would reseed.
loadEnvConfig(root);

export function flag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

export function flags(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) continue;
    values.push(value);
  }
  return values;
}

export function positional(): string[] {
  const skip = new Set<number>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index] ?? "";
    if (!arg.startsWith("--")) continue;
    const next = process.argv[index + 1];
    if (next && !next.startsWith("--")) skip.add(index + 1);
  }
  const values: string[] = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (skip.has(index)) continue;
    const arg = process.argv[index] ?? "";
    if (arg && !arg.startsWith("--")) values.push(arg);
  }
  return values;
}
