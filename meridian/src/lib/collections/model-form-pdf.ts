/**
 * One-page text layout following the section order of 12 CFR Part 1006 Appendix B,
 * Model Form B-1. It is not the CFPB's designed PDF. Counsel must compare it
 * before any notice is mailed.
 */

export const VALIDATION_LIMITATIONS_NOTE =
  "Draft: the limitations date on file is in the past. This layout does not include a state time-barred notice. Counsel must add that notice before mailing.";

export interface ModelFormFields {
  agencyName: string;
  agencyAddress: string;
  agencyPhone: string;
  noticeDate: string;
  consumerName: string;
  consumerAddress: string;
  accountRef: string;
  accountType: string;
  creditorOnItemizationDate: string;
  accountLast4: string;
  itemizationDate: string;
  amountOnItemizationDate: string;
  interestSince: string;
  feesSince: string;
  paymentsCreditsSince: string;
  currentBalance: string;
  currentCreditor: string;
  validationEndDate: string;
  /** Shown only when a calculated limitations date is already past. */
  limitationsNote?: string;
}

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, width = 90): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function modelFormPdf(fields: ModelFormFields): Uint8Array {
  const commands: string[] = ["0.5 w"];
  let y = 750;
  const left = 54;
  const write = (line: string, size = 10, x = left) => {
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdf(line)}) Tj ET`);
    y -= size + 3;
  };
  const block = (text: string, size = 10) => {
    for (const line of wrap(text, size > 11 ? 70 : 92)) write(line, size);
  };
  write(fields.agencyName, 14);
  write(fields.agencyAddress);
  write(fields.agencyPhone);
  y -= 8;
  write(fields.noticeDate);
  y -= 6;
  write(fields.consumerName);
  for (const line of fields.consumerAddress.split("\n")) write(line);
  y -= 6;
  write(`Reference: ${fields.accountRef}`);
  y -= 8;
  block(`${fields.agencyName} is a debt collector. We are trying to collect a debt that you owe to ${fields.currentCreditor}. We will use any information you give us to help collect the debt.`);
  y -= 6;
  write("Our information shows:", 12);
  block(
    fields.accountType === "not supplied"
      ? `You had an account from ${fields.creditorOnItemizationDate} with account number ending in ${fields.accountLast4}. Account type was not supplied.`
      : `You had a ${fields.accountType} account from ${fields.creditorOnItemizationDate} with account number ending in ${fields.accountLast4}.`,
  );
  y -= 4;
  const row = (label: string, amount: string) => {
    commands.push(`BT /F1 10 Tf ${left} ${y} Td (${escapePdf(label)}) Tj ET`);
    commands.push(`BT /F1 10 Tf 430 ${y} Td (${escapePdf(amount)}) Tj ET`);
    commands.push(`${left} ${y - 3} m 558 ${y - 3} l S`);
    y -= 16;
  };
  const figure = (prefix: string, value: string) => (value === "not supplied" ? "not supplied" : `${prefix}$${value}`);
  row(`As of ${fields.itemizationDate}, you owed:`, figure("", fields.amountOnItemizationDate));
  write(`Between ${fields.itemizationDate} and today:`);
  row("You were charged this amount in interest:", figure("+ ", fields.interestSince));
  row("You were charged this amount in fees:", figure("+ ", fields.feesSince));
  row("You paid or were credited this amount toward the debt:", figure("- ", fields.paymentsCreditsSince));
  row("Total amount of the debt now:", `$${fields.currentBalance}`);
  y -= 6;
  write("How can you dispute the debt?", 12);
  block(`Call or write to us by ${fields.validationEndDate}, to dispute all or part of the debt. If you do not, we will assume that our information is correct.`);
  block(`If you write to us by ${fields.validationEndDate}, we must stop collection on any amount you dispute until we send you information that shows you owe the debt.`);
  y -= 4;
  write("What else can you do?", 12);
  block("Write to ask for the name and address of the original creditor, if different from the current creditor. If you write by the date above, we must stop collection until we send you that information.");
  block("Go to www.cfpb.gov/debt-collection to learn more about your rights under federal law. For instance, you have the right to stop or limit how we contact you.");
  block("Contact us about your payment options.");
  block("Pongase en contacto con nosotros para solicitar una copia de este formulario en espanol.");
  block("The Spanish line above is an ASCII draft, not the CFPB Spanish model form.");
  if (fields.limitationsNote) block(fields.limitationsNote);
  y -= 8;
  commands.push(`${left} ${y} m 558 ${y} l S`);
  y -= 14;
  write("Mail this form to:");
  write(fields.agencyName);
  write(fields.agencyAddress);
  write(`${fields.consumerName}    Reference: ${fields.accountRef}`);
  write("[ ] I want to dispute the debt because I think:");
  write("[ ] This is not my debt.");
  write("[ ] The amount is wrong.");
  write("[ ] I want you to send me the name and address of the original creditor.");
  y -= 8;
  write("Draft layout of 12 CFR Part 1006 Appendix B Model Form B-1. Counsel must compare it to the current CFPB form before mailing.", 8);
  const omittedFigure = [fields.interestSince, fields.feesSince, fields.paymentsCreditsSince, fields.amountOnItemizationDate, fields.accountType, fields.agencyAddress, fields.agencyPhone].includes("not supplied");
  if (omittedFigure) {
    y -= 12;
    write("A missing itemization figure, account type, address, or phone shows not supplied. Do not treat it as zero or as a real contact number.", 8);
  }
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
