import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("public dispute and contact fields point at the error alert", () => {
  const form = readFileSync(fileURLToPath(new URL("../../components/agency/form.tsx", import.meta.url)), "utf8");
  const layout = readFileSync(fileURLToPath(new URL("../../app/agency/layout.tsx", import.meta.url)), "utf8");
  assert.match(form, /id=\{failed \? "agency-form-error" : undefined\}/);
  assert.match(form, /aria-describedby=\{failed \? "agency-form-error" : undefined\}/);
  assert.match(form, /Counsel reviews that date/);
  assert.match(layout, /Draft for counsel review/);
});

test("account portal fields point at the error alert", () => {
  const source = readFileSync(fileURLToPath(new URL("../../app/collect/account/page.tsx", import.meta.url)), "utf8");
  assert.match(source, /id="account-error"/);
  assert.match(source, /id=\{error \? "account-error" : undefined\}/);
  for (const id of ["plan-months", "plan-amount", "ach-auth", "dispute-text"]) {
    assert.match(source, new RegExp(`id="${id}"[\\s\\S]*aria-describedby=\\{error \\? "account-error" : undefined\\}`));
  }
});
