import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

const [mode, input, output] = process.argv.slice(2);
const pass = process.env.MERIDIAN_BACKUP_KEY ?? "";
if ((mode !== "enc" && mode !== "dec") || !input || !output || !pass) {
  console.error("Usage: MERIDIAN_BACKUP_KEY=... node scripts/backup-crypt.mjs enc|dec <in> <out>");
  process.exit(1);
}

const MAGIC = Buffer.from("MDBC1\n");
const ITER = 200_000;

if (mode === "enc") {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(pass, salt, ITER, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(readFileSync(input)), cipher.final()]);
  writeFileSync(output, Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]));
} else {
  const buf = readFileSync(input);
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) {
    console.error("Not a Meridian AES-256-GCM backup");
    process.exit(1);
  }
  let offset = MAGIC.length;
  const salt = buf.subarray(offset, (offset += 16));
  const iv = buf.subarray(offset, (offset += 12));
  const tag = buf.subarray(offset, (offset += 16));
  const key = pbkdf2Sync(pass, salt, ITER, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  writeFileSync(output, Buffer.concat([decipher.update(buf.subarray(offset)), decipher.final()]));
}

chmodSync(output, 0o600);
