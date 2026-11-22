import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { pageBySlug } from "../agency/site";

test("the public accessibility page matches the keyboard paths", () => {
  const page = pageBySlug("accessibility");
  assert.ok(page);
  const text = page.paragraphs.join(" ");
  assert.match(text, /skip link/);
  assert.match(text, /test-payment button/);
  assert.match(text, /not a formal WCAG audit/);
});

test("the sandbox payment page flags the mini-Miranda as a draft", () => {
  const source = readFileSync(fileURLToPath(new URL("../../app/pay/sandbox/[token]/page.tsx", import.meta.url)), "utf8");
  assert.match(source, /Skip to payment notice/);
  assert.match(source, /href="#pay-main"/);
  assert.match(source, /Counsel must approve it before it is used outside sandbox/);
  assert.match(source, /lang="es"/);
  assert.match(source, /does not take a payment/);
  assert.equal(source.includes("card number"), true);
  assert.equal(source.includes("<input"), false);
});

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
  assert.match(source, /aria-describedby=\{error \? "account-error" : undefined\} onClick=\{\(\) => void pay\(\)\}/);
});
