import assert from "node:assert/strict";
import test from "node:test";
import { blankContact } from "@/lib/debt";
import { planCsvImport } from "./csv-import";

test("contact import accepts tags and contact_* aliases", () => {
  const csv = [
    "First Name,Last Name,contact_email,contact_title,contact_phone,contact_linkedin,tags",
    "Ada,Lovelace,ada@example.test,Desk,555-0100,https://linkedin.com/in/ada,buyer;nda",
  ].join("\n");
  const plan = planCsvImport(
    { companies: [], contacts: [], suppressions: [] },
    { workspaceId: "triton", contactsCsv: csv, tags: ["wave-1"] },
  );
  const contact = plan.contacts.find((row) => row.email === "ada@example.test");
  assert.ok(contact);
  assert.equal(contact.title, "Desk");
  assert.equal(contact.phone, "555-0100");
  assert.equal(contact.linkedin, "https://linkedin.com/in/ada");
  assert.ok(contact.tags.includes("buyer"));
  assert.ok(contact.tags.includes("nda"));
  assert.ok(contact.tags.includes("wave-1"));
});

test("prospect rows accept contact_email aliases", () => {
  const csv = [
    "company,contact_name,contact_email,contact_title,contact_linkedin,contact_phone,tags",
    "Acme,Grace Hopper,grace@acme.test,Buyer,https://linkedin.com/in/grace,555,card;buyer",
  ].join("\n");
  const plan = planCsvImport(
    { companies: [], contacts: [], suppressions: [] },
    { workspaceId: "triton", contactsCsv: csv, tags: ["wave-1"] },
  );
  const contact = plan.contacts.find((row) => row.email === "grace@acme.test");
  assert.ok(contact);
  assert.equal(contact.title, "Buyer");
  assert.equal(contact.phone, "555");
  assert.equal(contact.linkedin, "https://linkedin.com/in/grace");
  assert.ok(contact.tags.includes("card"));
  assert.ok(contact.tags.includes("wave-1"));
  assert.ok(contact.tags.includes("outbound-prospect"));
});

test("a suppressed address stays do-not-email across a normal import", () => {
  const existing = blankContact({
    id: "ct_ada",
    email: "ada@example.test",
    firstName: "Ada",
    lastName: "Lovelace",
    doNotEmail: false,
    emailStatus: "valid",
  });
  const csv = "First Name,Last Name,Email\nAda,Lovelace,ada@example.test\n";
  const plan = planCsvImport(
    {
      companies: [],
      contacts: [existing],
      suppressions: [
        { email: "ada@example.test", reason: "unsubscribe" },
        { email: "ada@example.test", reason: "invalid_email" },
      ],
    },
    { workspaceId: "triton", contactsCsv: csv },
  );
  const contact = plan.contacts.find((row) => row.email === "ada@example.test");
  assert.equal(contact?.doNotEmail, true);
  assert.equal(plan.report.suppressionsRemoved, 0);
});

test("an already flagged contact does not drop invalid_email on reimport", () => {
  const existing = blankContact({
    id: "ct_ada",
    email: "ada@example.test",
    firstName: "Ada",
    lastName: "Lovelace",
    doNotEmail: true,
    emailStatus: "valid",
  });
  const csv = "First Name,Last Name,Email\nAda,Lovelace,ada@example.test\n";
  const plan = planCsvImport(
    {
      companies: [],
      contacts: [existing],
      suppressions: [
        { email: "ada@example.test", reason: "do_not_email" },
        { email: "ada@example.test", reason: "invalid_email" },
      ],
    },
    { workspaceId: "triton", contactsCsv: csv },
  );
  assert.equal(plan.report.suppressionsRemoved, 0);
  assert.equal(plan.report.suppressionsAdded, 0);
});
