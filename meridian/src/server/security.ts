const MAX_UPLOAD_CHARS = 25_000_000;

/** Cookie-authenticated writes must come from this host. API-key calls with no cookie are not browser form posts. */
export function assertSameOrigin(request: Request): void {
  const cookie = request.headers.get("cookie");
  if (!cookie) return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Cross-site request blocked");
  }
  if (host && originHost !== host) throw new Error("Cross-site request blocked");
}

export function scanUpload(text: string): void {
  if (text.length > MAX_UPLOAD_CHARS) throw new Error("Upload is too large.");
  const sample = text.slice(0, 4000).toLowerCase();
  if (sample.includes("<script") || sample.includes("=cmd|") || sample.includes("<?php")) {
    throw new Error("Upload was rejected.");
  }
}

export function scanXlsx(bytes: Uint8Array): void {
  if (bytes.byteLength > 20_000_000) throw new Error("Upload is too large.");
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Spreadsheet upload was rejected.");
}
