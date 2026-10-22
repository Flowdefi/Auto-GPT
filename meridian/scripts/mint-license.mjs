#!/usr/bin/env node
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run license:mint -- you@example.com");
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "meridian.db"));
db.exec(readFileSync(path.join(root, "src/server/schema.sql"), "utf8"));

const key = `mdl_${randomBytes(24).toString("hex")}`;
const hash = createHash("sha256").update(key).digest("hex");
const id = `lic_${randomBytes(12).toString("hex")}`;
const now = new Date().toISOString();

db.prepare(
  `INSERT INTO licenses (id, key_hash, key_prefix, kind, email, account_id, redeemed_at, created_at, notes)
   VALUES (?, ?, ?, 'minted', ?, NULL, NULL, ?, ?)`,
).run(id, hash, key.slice(0, 12), email, now, "minted via npm run license:mint");

console.log("Lifetime seat license");
console.log(`  email:  ${email}`);
console.log(`  price:  $275 USD once`);
console.log(`  key:    ${key}`);
console.log("Redeem it on /billing after creating an account. The plaintext is shown once.");
