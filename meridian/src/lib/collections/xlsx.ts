import { strFromU8, unzipSync } from "fflate";

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function columnIndex(letters: string): number {
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** First worksheet of an xlsx file, as CSV text. */
export function xlsxToCsv(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const sharedKey = Object.keys(files).find((name) => name.endsWith("xl/sharedStrings.xml"));
  const sheetKey = Object.keys(files).find((name) => /xl\/worksheets\/sheet1\.xml$/.test(name));
  if (!sheetKey) throw new Error("Workbook has no sheet1");
  const strings: string[] = [];
  if (sharedKey) {
    const xml = strFromU8(files[sharedKey]!);
    for (const block of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
      const texts = [...block[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decode(match[1] ?? ""));
      strings.push(texts.join(""));
    }
  }
  const xml = strFromU8(files[sheetKey]!);
  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    let cursor = 0;
    for (const cell of (row[1] ?? "").matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cell[1] ?? "";
      const body = cell[2] ?? "";
      const ref = /r="([A-Z]+)/.exec(attrs)?.[1];
      const index = ref ? columnIndex(ref) : cursor;
      while (cells.length < index) cells.push("");
      const kind = /t="([^"]+)"/.exec(attrs)?.[1];
      const inline = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      if (kind === "s") cells[index] = strings[Number(value)] ?? "";
      else if (kind === "inlineStr" && inline) cells[index] = decode(inline);
      else cells[index] = decode(value);
      cursor = index + 1;
    }
    if (cells.some((cell) => cell.trim())) rows.push(cells);
  }
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");
}
