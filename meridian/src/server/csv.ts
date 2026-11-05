export interface CsvRow {
  line: number;
  values: Record<string, string>;
}

export interface CsvTable {
  headers: string[];
  rows: CsvRow[];
}

export function parseCsv(text: string): CsvTable {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[][] = [];
  const startLines: number[] = [];
  let field = "";
  let row: string[] = [];
  let line = 1;
  let rowLine = 1;
  let quoted = false;
  let i = 0;

  const pushRow = () => {
    if (row.some((cell) => cell.trim() !== "") || field.trim() !== "") {
      row.push(field);
      records.push(row);
      startLines.push(rowLine);
    }
    field = "";
    row = [];
  };

  while (i < input.length) {
    const char = input[i] ?? "";
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      if (char === "\n") line += 1;
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      line += 1;
      rowLine = line;
      continue;
    }
    field += char;
    i += 1;
  }
  if (quoted || field.length > 0 || row.length > 0) pushRow();

  const header = records[0] ?? [];
  const headers = header.map((cell) => cell.trim());
  const rows: CsvRow[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const cells = records[index] ?? [];
    const values: Record<string, string> = {};
    headers.forEach((name, cellIndex) => {
      const key = name.toLowerCase();
      if (!key || Object.prototype.hasOwnProperty.call(values, key)) return;
      values[key] = (cells[cellIndex] ?? "").trim();
    });
    rows.push({ line: startLines[index] ?? index + 1, values });
  }
  return { headers, rows };
}

export function headerSet(table: CsvTable): Set<string> {
  return new Set(table.headers.map((header) => header.trim().toLowerCase()).filter(Boolean));
}

export function hasHeader(headers: Set<string>, ...names: string[]): boolean {
  return names.some((name) => headers.has(name.toLowerCase()));
}

export function cell(row: CsvRow, ...names: string[]): string {
  for (const name of names) {
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(row.values, key)) return row.values[key] ?? "";
  }
  return "";
}
