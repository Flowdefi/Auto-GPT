export interface MappedInventory {
  name: string;
  sellerName: string;
  kind: string;
  faceValue: number;
  askingPrice: number;
  accountCount: number;
  avgBalance: number;
  chargeOff: string;
  states: string[];
  notes: string;
}

const FIELDS = ["name", "seller", "kind", "face", "accounts", "avg", "ask", "chargeOff", "states", "notes"] as const;
type Field = (typeof FIELDS)[number];

const ALIASES: Record<Field, string[]> = {
  name: ["name", "portfolio", "portfolio name", "tape", "tape name", "description", "loan tape"],
  seller: ["issuer", "seller", "seller name", "originator", "client", "creditor"],
  kind: ["asset class", "asset type", "type", "product", "paper", "asset class/type"],
  face: ["face value", "face", "upb", "unpaid balance", "current balance", "total balance"],
  accounts: ["accounts", "# accts", "# accounts", "acct count", "number of accounts", "accts", "account count"],
  avg: ["avg balance", "average balance", "avg bal", "average bal"],
  ask: ["asking price", "ask", "price", "purchase price", "offer"],
  chargeOff: ["charge-off dates", "charge off date", "charge off dates", "chargeoff", "charge-off", "co date", "charge-off date"],
  states: ["states", "state", "geography", "locations", "state mix"],
  notes: ["notes", "comments", "remarks", "comment"],
};

function headerKey(value: string): string {
  return value.toLowerCase().replace(/[_/]+/g, " ").replace(/[^a-z0-9# ]+/g, " ").replace(/\s+/g, " ").trim();
}

function money(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function count(value: string): number {
  const parsed = Number(value.replace(/[, ]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function statesOf(value: string): string[] {
  return value
    .split(/[,;/|]+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => /^[A-Z]{2}$/.test(part));
}

export function mapInventoryHeaders(headers: string[]): Partial<Record<Field, string>> {
  const mapping: Partial<Record<Field, string>> = {};
  for (const header of headers) {
    const key = headerKey(header);
    for (const field of FIELDS) {
      if (mapping[field]) continue;
      if (ALIASES[field].some((alias) => alias === key)) mapping[field] = header;
    }
  }
  return mapping;
}

export function mapInventoryRow(values: Record<string, string>, headers: string[]): MappedInventory {
  const mapping = mapInventoryHeaders(headers);
  const pick = (field: Field): string => {
    const header = mapping[field];
    return header ? (values[header] ?? "").trim() : "";
  };
  const sellerName = pick("seller");
  const name = pick("name") || (sellerName ? `${sellerName} tape` : "Untitled portfolio");
  return {
    name,
    sellerName,
    kind: pick("kind") || "unspecified",
    faceValue: money(pick("face")),
    askingPrice: money(pick("ask")),
    accountCount: count(pick("accounts")),
    avgBalance: money(pick("avg")),
    chargeOff: pick("chargeOff"),
    states: statesOf(pick("states")),
    notes: pick("notes"),
  };
}
