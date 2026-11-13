import assert from "node:assert/strict";
import test from "node:test";
import {
  connectors,
  localReply,
  pricePool,
  runPlugin,
  screen,
  warrantyWindow,
} from "./worker.mjs";

test("connectors name the Workers AI alternative and do not claim a voice bot", () => {
  const status = connectors();
  assert.equal(status.model.source, "alternative");
  assert.equal(status.model.status, "live");
  assert.equal(status.voice.status, "text_only");
  assert.equal(status.mail.status, "not_sending");
  assert.equal(status.stores, "nothing");
});

test("price and warranty plugins stay arithmetic", () => {
  const priced = pricePool({ face: "1000000", percent: "4.4" });
  assert.equal(priced.cash, 44000);
  assert.equal(priced.percentOfFace, 4.4);
  assert.match(priced.note, /Not an offer/);
  const window = warrantyWindow({ funded: "2026-01-01" });
  assert.equal(window.day90, "2026-04-01");
  assert.equal(pricePool({ face: 0 }).error.includes("Face"), true);
});

test("a consumer question and an identifier stay off the model path", () => {
  assert.equal(screen("I want to dispute my bill"), "consumer");
  assert.equal(screen("ssn 123-45-6789"), "consumer");
  const reply = localReply("Please settle my account 4111111111111111");
  assert.match(reply, /does not service consumer accounts/);
  assert.equal(reply.includes("4111"), false);
});

test("seller intake and bands answer without a model", () => {
  assert.match(localReply("what does a seller snapshot need"), /Creditor/);
  assert.match(localReply("show the education bands"), /Credit card/);
  assert.equal(runPlugin("missing", {}).error, "Unknown plugin.");
});

test("the page and chat route answer from the local plugin when AI is absent", async () => {
  const worker = (await import("./worker.mjs")).default;
  const page = await worker.fetch(new Request("https://ai.debtmarket.net/"), {});
  assert.equal(page.status, 200);
  assert.match(await page.text(), /DebtMarket AI/);
  const chat = await worker.fetch(
    new Request("https://ai.debtmarket.net/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "What is the office phone?" }] }),
    }),
    {},
  );
  const body = await chat.json();
  assert.equal(body.source, "local");
  assert.equal(body.stored, false);
  assert.match(body.reply, /561-254-6608/);
});
