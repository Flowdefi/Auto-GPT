import type { WorkspaceId } from "@/lib/types";
import { mapInventoryRow } from "@/lib/inventory-map";
import { xlsxToCsv } from "@/lib/collections/xlsx";
import { parseCsv } from "./csv";
import { loadDb, mutate, nextId } from "./db";
import type { DeskInventoryItem, InventoryFileLink } from "./models";

export function listInventory(workspaceId: WorkspaceId): DeskInventoryItem[] {
  return (loadDb().inventoryItems ?? []).filter((item) => item.workspaceId === workspaceId);
}

export function getInventory(workspaceId: WorkspaceId, id: string): DeskInventoryItem | null {
  return listInventory(workspaceId).find((item) => item.id === id) ?? null;
}

export function importInventory(input: {
  workspaceId: WorkspaceId;
  csv?: string;
  xlsxBase64?: string;
}): { created: number; skipped: number; items: DeskInventoryItem[] } {
  let csv = input.csv ?? "";
  if (input.xlsxBase64) {
    csv = xlsxToCsv(Buffer.from(input.xlsxBase64, "base64"));
  }
  if (!csv.trim()) throw new Error("A CSV or xlsx file is required");
  const table = parseCsv(csv);
  const created: DeskInventoryItem[] = [];
  let skipped = 0;
  mutate((db) => {
    db.inventoryItems = db.inventoryItems ?? [];
    for (const row of table.rows) {
      const mapped = mapInventoryRow(row.values, table.headers);
      if (!mapped.sellerName && mapped.name === "Untitled portfolio" && mapped.faceValue === 0) {
        skipped += 1;
        continue;
      }
      const duplicate = db.inventoryItems.find(
        (item) =>
          item.workspaceId === input.workspaceId &&
          item.name.toLowerCase() === mapped.name.toLowerCase() &&
          item.sellerName.toLowerCase() === mapped.sellerName.toLowerCase() &&
          item.faceValue === mapped.faceValue,
      );
      if (duplicate) {
        skipped += 1;
        continue;
      }
      const item: DeskInventoryItem = {
        id: nextId("inv"),
        workspaceId: input.workspaceId,
        name: mapped.name,
        sellerName: mapped.sellerName,
        sellerCompanyId: "",
        kind: mapped.kind,
        faceValue: mapped.faceValue,
        askingPrice: mapped.askingPrice,
        accountCount: mapped.accountCount,
        avgBalance: mapped.avgBalance,
        vintage: mapped.chargeOff,
        chargeOff: mapped.chargeOff,
        states: mapped.states,
        notes: mapped.notes,
        status: "intake",
        fileLinks: [],
        dealIds: [],
        buyerContactIds: [],
        createdAt: new Date().toISOString(),
      };
      db.inventoryItems.unshift(item);
      created.push(item);
    }
  });
  return { created: created.length, skipped, items: created };
}

export function linkInventory(
  workspaceId: WorkspaceId,
  id: string,
  link: { dealId?: string; buyerContactId?: string },
): DeskInventoryItem {
  let updated: DeskInventoryItem | undefined;
  mutate((db) => {
    const item = (db.inventoryItems ?? []).find((row) => row.workspaceId === workspaceId && row.id === id);
    if (!item) return;
    if (link.dealId && !item.dealIds.includes(link.dealId)) item.dealIds.push(link.dealId);
    if (link.buyerContactId && !item.buyerContactIds.includes(link.buyerContactId)) {
      item.buyerContactIds.push(link.buyerContactId);
    }
    updated = item;
  });
  if (!updated) throw new Error("Inventory item not found");
  return updated;
}

export function attachInventoryFile(
  workspaceId: WorkspaceId,
  id: string,
  file: { name: string; webUrl?: string; driveItemId?: string },
): InventoryFileLink {
  const link: InventoryFileLink = {
    id: nextId("file"),
    name: file.name.trim() || "File",
    webUrl: file.webUrl?.trim() || undefined,
    driveItemId: file.driveItemId?.trim() || undefined,
  };
  let found = false;
  mutate((db) => {
    const item = (db.inventoryItems ?? []).find((row) => row.workspaceId === workspaceId && row.id === id);
    if (!item) return;
    const duplicate = item.fileLinks.some(
      (row) => (link.driveItemId && row.driveItemId === link.driveItemId) || (link.webUrl && row.webUrl === link.webUrl),
    );
    if (!duplicate) item.fileLinks.push(link);
    found = true;
  });
  if (!found) throw new Error("Inventory item not found");
  return link;
}
