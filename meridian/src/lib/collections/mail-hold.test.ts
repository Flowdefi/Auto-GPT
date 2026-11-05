import assert from "node:assert/strict";
import test from "node:test";
import { queueLetter, runMailQueue } from "../../server/collections/letters";
import { releaseSettlementLetter } from "../../server/collections/settlement-desk";
import { importPortfolio, setTemplateApproval, syncCollectionTemplates, templateForWorkspace } from "../../server/collections/service";
import { loadDb, mutate, nextId } from "../../server/db";

test("the mail worker does not file a queued settlement letter after the limitations date", async () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "aether",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance,charge_off_date\nMAIL-${stamp},Example Buyer,TX,78701,4242,40.00,2020-01-01\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `MAIL-${stamp}`);
  assert.ok(account);
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === account.id ? { ...item, solExpiresOn: "2020-01-01" } : item));
  });
  const templates = syncCollectionTemplates();
  const offer = templates.find((item) => item.id === "LTR-010");
  assert.ok(offer);
  const before = templateForWorkspace("aether", offer);
  const prior = loadDb().templateApprovals?.aether?.["LTR-010"];
  setTemplateApproval("LTR-010", { ownerApproved: true }, "admin", "aether");
  const jobId = nextId("mail");
  const caseId = nextId("setl");
  try {
    mutate((db) => {
      db.mailJobs = [
        {
          id: jobId,
          workspaceId: "aether",
          accountId: account.id,
          templateId: "LTR-010",
          status: "queued",
          provider: "sandbox",
          providerId: null,
          reason: null,
          pdfBase64: Buffer.from("OFFER").toString("base64"),
          createdAt: new Date().toISOString(),
        },
        ...(db.mailJobs ?? []),
      ];
    });
    const filed = await runMailQueue("aether", jobId);
    const job = (loadDb().mailJobs ?? []).find((item) => item.id === jobId);
    assert.equal(filed, 0);
    assert.equal(job?.status, "paused");
    assert.match(job?.reason ?? "", /counsel-reviewed time-barred notice/);
    const stored = Buffer.from(job?.pdfBase64 ?? "", "base64").toString("latin1");
    assert.equal(stored.includes("OFFER"), false);
    assert.match(stored, /counsel-reviewed time-barred notice/);

    const fresh = queueLetter("aether", account.id, "LTR-010");
    assert.equal(fresh.status, "paused");
    assert.match(Buffer.from(fresh.pdfBase64, "base64").toString("latin1"), /counsel-reviewed time-barred notice/);

    mutate((db) => {
      db.settlementCases = [
        {
          id: caseId,
          workspaceId: "aether",
          accountId: account.id,
          offerCents: 1000,
          counterCents: null,
          status: "held",
          ownerApprovedBy: "ada@example.test",
          complianceApprovedBy: "bea@example.test",
          holdUntil: "2020-01-01",
          createdAt: new Date().toISOString(),
        },
        ...(db.settlementCases ?? []),
      ];
    });
    const released = releaseSettlementLetter("aether", caseId, "2026-11-05");
    assert.equal(released.mailStatus, "paused");
    assert.match(released.reason ?? "", /time-barred notice/);
    assert.equal((loadDb().settlementCases ?? []).find((item) => item.id === caseId)?.status, "held");
  } finally {
    setTemplateApproval("LTR-010", { ownerApproved: before.ownerApproved, counselReviewed: before.counselReviewed }, "admin", "aether");
    mutate((db) => {
      db.mailJobs = (db.mailJobs ?? []).filter((item) => item.accountId !== account.id);
      db.settlementCases = (db.settlementCases ?? []).filter((item) => item.id !== caseId);
      const bucket = db.templateApprovals?.aether;
      if (!prior && bucket) delete bucket["LTR-010"];
    });
  }
});
