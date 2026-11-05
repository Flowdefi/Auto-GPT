export const REPORT_DRAFT_LABEL =
  "Draft operations report. Not a client invoice and not legal advice. Counsel should confirm the fee percent. Account numbers are omitted.";

export interface ReportCsvRow {
  portfolioId: string;
  accounts: number;
  quarantined: number;
  faceCents: number;
  collectedCents: number;
  recoveryRate: number;
}

export interface RemittanceCsvRow {
  portfolioId: string;
  clientName: string;
  collectedCents: number;
  feeCents: number;
  remittanceCents: number;
  paymentCount: number;
}

function cell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Operations export. The first line is the counsel draft label. No account numbers. */
export function collectionReportCsv(report: { portfolios: ReportCsvRow[]; remittance?: RemittanceCsvRow[] }): string {
  const lines = [
    `# ${REPORT_DRAFT_LABEL}`,
    "section,portfolio,client,accounts,quarantined,face_cents,collected_cents,recovery,fee_cents,remittance_cents,payments",
  ];
  for (const row of report.portfolios) {
    lines.push(
      ["recovery", row.portfolioId, "", row.accounts, row.quarantined, row.faceCents, row.collectedCents, row.recoveryRate.toFixed(4), "", "", ""].map(cell).join(","),
    );
  }
  for (const row of report.remittance ?? []) {
    lines.push(
      ["remittance", row.portfolioId, row.clientName, "", "", "", row.collectedCents, "", row.feeCents, row.remittanceCents, row.paymentCount].map(cell).join(","),
    );
  }
  return lines.join("\n");
}
