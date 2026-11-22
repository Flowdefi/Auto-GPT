import assert from "node:assert/strict";
import test from "node:test";
import { mapInventoryRow } from "../lib/inventory-map";
import { selfHostedFlag } from "./self-host";
import { recordActivity } from "./activities";
import { mutate } from "./db";

test("self-hosted flag accepts only explicit on values", () => {
  assert.equal(selfHostedFlag("true"), true);
  assert.equal(selfHostedFlag(" YES "), true);
  assert.equal(selfHostedFlag("1"), true);
  assert.equal(selfHostedFlag("false"), false);
  assert.equal(selfHostedFlag(""), false);
  assert.equal(selfHostedFlag(undefined), false);
});

test("inventory headers map seller, face, accounts, and states", () => {
  const headers = ["Issuer", "Asset Class", "Face Value", "# Accts", "Avg Balance", "Asking Price", "Charge-off dates", "States", "Notes"];
  const row = mapInventoryRow(
    {
      Issuer: "Example Seller",
      "Asset Class": "credit card",
      "Face Value": "$1,250.00",
      "# Accts": "40",
      "Avg Balance": "31.25",
      "Asking Price": "80",
      "Charge-off dates": "2022-2024",
      States: "tx, oh",
      Notes: "Synthetic tape",
    },
    headers,
  );
  assert.equal(row.sellerName, "Example Seller");
  assert.equal(row.kind, "credit card");
  assert.equal(row.faceValue, 1250);
  assert.equal(row.accountCount, 40);
  assert.equal(row.askingPrice, 80);
  assert.deepEqual(row.states, ["TX", "OH"]);
  assert.equal(row.chargeOff, "2022-2024");
});

test("activity upsert is idempotent and leaves doNotEmail alone", () => {
  const input = {
    workspaceId: "triton" as const,
    contactEmail: "desk-bot@example.test",
    contactName: "Desk Bot",
    company: "Example Seller",
    type: "note" as const,
    subject: "Synthetic note",
    body: "No consumer data",
    outlookMessageId: "msg-test-6156",
    source: "api" as const,
  };
  const first = recordActivity(input);
  const second = recordActivity(input);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.activity.id, first.activity.id);
  assert.equal(second.doNotEmail, false);

  mutate((db) => {
    const contact = db.contacts.find((row) => row.id === first.contactId);
    if (contact) contact.doNotEmail = true;
  });
  const third = recordActivity({ ...input, outlookMessageId: "msg-test-6156-b", type: "call", subject: "Synthetic call" });
  assert.equal(third.duplicate, false);
  assert.equal(third.doNotEmail, true);
  const lookup = recordActivity({ ...input, outlookMessageId: "msg-test-6156-b", type: "call", subject: "Synthetic call" });
  assert.equal(lookup.duplicate, true);
  assert.equal(lookup.doNotEmail, true);
});
