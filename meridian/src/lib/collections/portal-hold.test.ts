import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../app/api/portal/route";
import { reasonCode } from "./reason-code";
import { TIME_BARRED_HOLD } from "./sol";
import { importPortfolio, openPortal, sendChannel, setTemplateApproval, syncCollectionTemplates, templateForWorkspace } from "../../server/collections/service";
import { loadDb, mutate } from "../../server/db";

function portalRequest(token: string, body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/portal", {
    method: "POST",
    headers: { cookie: `meridian_portal=${encodeURIComponent(token)}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("the portal route refuses payment and still accepts a dispute", async () => {
  const stamp = Date.now().toString(36);
  const ref = `PORT-${stamp}`;
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\n${ref},Example Planner,OH,44101,4242,40.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === ref);
  assert.ok(account);
  const prior = account.solExpiresOn ?? null;
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === account.id ? { ...item, solExpiresOn: "2020-01-01" } : item));
  });
  const opened = openPortal("triton", ref, "4242", "44101");
  try {
    const pay = await POST(portalRequest(opened.token, { op: "pay", amountCents: 1000 }));
    const plan = await POST(portalRequest(opened.token, { op: "plan", months: 2, amountCents: 1000 }));
    const ach = await POST(portalRequest(opened.token, { op: "ach", amountCents: 1000, accepted: true }));
    assert.equal(pay.status, 400);
    assert.equal(plan.status, 400);
    assert.equal(ach.status, 400);
    assert.match(((await pay.json()) as { error?: string }).error ?? "", /counsel-reviewed time-barred notice/);
    assert.match(((await plan.json()) as { error?: string }).error ?? "", /counsel-reviewed time-barred notice/);
    assert.match(((await ach.json()) as { error?: string }).error ?? "", /counsel-reviewed time-barred notice/);
    const dispute = await POST(portalRequest(opened.token, { op: "dispute", text: "I dispute this debt" }));
    assert.equal(dispute.status, 200);
    const notice = await POST(portalRequest(opened.token, { op: "notice" }));
    const noticeBody = (await notice.json()) as { error?: string; pdfBase64?: string };
    assert.equal((noticeBody.error ?? "").includes("time-barred notice"), false);
    const logged = (loadDb().complianceEvents ?? []).some((event) => event.accountId === account.id && event.allowed === false && event.reason === TIME_BARRED_HOLD);
    assert.equal(logged, true);
    assert.equal(reasonCode(TIME_BARRED_HOLD), "time_barred");
  } finally {
    mutate((db) => {
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === account.id ? { ...item, solExpiresOn: prior } : item));
    });
  }
});

test("a scheduled settlement text is held when the body is empty", async () => {
  const stamp = Date.now().toString(36);
  const ref = `SEQ-${stamp}`;
  const imported = importPortfolio({
    workspaceId: "aether",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance,charge_off_date\n${ref},Example Buyer,TX,78701,4242,40.00,2020-01-01\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === ref);
  assert.ok(account);
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === account.id ? { ...item, solExpiresOn: "2020-01-01" } : item));
  });
  const templates = syncCollectionTemplates();
  const sms = templates.find((item) => item.id === "SMS-006");
  assert.ok(sms);
  const before = templateForWorkspace("aether", sms);
  const prior = loadDb().templateApprovals?.aether?.["SMS-006"];
  setTemplateApproval("SMS-006", { ownerApproved: true }, "admin", "aether");
  try {
    const message = await sendChannel({ workspaceId: "aether", accountId: account.id, channel: "sms", body: "", templateId: "SMS-006" });
    assert.equal(message.status, "blocked");
    assert.equal(message.reason, TIME_BARRED_HOLD);
  } finally {
    setTemplateApproval("SMS-006", { ownerApproved: before.ownerApproved, counselReviewed: before.counselReviewed }, "admin", "aether");
    mutate((db) => {
      const bucket = db.templateApprovals?.aether;
      if (!prior && bucket) delete bucket["SMS-006"];
    });
  }
});
