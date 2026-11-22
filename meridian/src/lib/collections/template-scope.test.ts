import assert from "node:assert/strict";
import test from "node:test";
import { counselPacket } from "../../server/collections/counsel";
import { sendChannel, setTemplateApproval, syncCollectionTemplates, templateForWorkspace } from "../../server/collections/service";
import { loadDb, mutate } from "../../server/db";

test("template approval and counsel review do not cross workspaces", async () => {
  const templates = syncCollectionTemplates();
  const raw = templates.find((item) => item.id !== "CALL-009" && !templateForWorkspace("triton", item).ownerApproved);
  assert.ok(raw);
  const before = templateForWorkspace("triton", raw);
  const prior = loadDb().templateApprovals?.aether?.[raw.id];
  try {
    const saved = setTemplateApproval(raw.id, { ownerApproved: true, counselReviewed: true }, "admin", "aether");
    assert.equal(saved.ownerApproved, true);
    assert.equal(saved.counselReviewed, true);
    assert.equal(saved.needsCounselReview, false);
    const triton = templateForWorkspace("triton", syncCollectionTemplates().find((item) => item.id === raw.id) ?? raw);
    assert.equal(triton.ownerApproved, before.ownerApproved);
    assert.equal(triton.counselReviewed, before.counselReviewed);
    assert.equal(triton.needsCounselReview, before.needsCounselReview);
    const blocked = await sendChannel({
      workspaceId: "triton",
      accountId: "missing",
      channel: "email",
      body: "Example",
      templateId: raw.id,
    });
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.reason ?? "", /approves/);
    const packet = counselPacket("aether");
    const note = packet.items.find((item) => item.area.startsWith("Templates"))?.note ?? "";
    assert.match(note, /own templates/);
  } finally {
    mutate((db) => {
      const bucket = db.templateApprovals?.aether;
      if (!bucket) return;
      if (prior) bucket[raw.id] = prior;
      else delete bucket[raw.id];
    });
  }
});
