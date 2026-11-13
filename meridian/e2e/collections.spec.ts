import { expect, test } from "@playwright/test";

test("import, gate, portal, and sequence", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@example.test");
  await page.getByLabel("Password").fill("sandbox-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/w\/triton\//);

  await page.goto("/w/triton/collections");
  const csv = [
    "account_ref,consumer_name,consumer_state,zip,last4,portal_code,phone_type,seller,balance",
    "E2E-OH-1,Example Ohioan,OH,44101,3333,OH33,landline,Sample Seller,80.00",
    "E2E-CA-1,Example Californian,CA,90001,2222,CA22,cell,Sample Seller,40.00",
  ].join("\n");
  await page.getByLabel("Portfolio CSV").fill(csv);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/Imported 1 workable, 1 quarantined/)).toBeVisible();

  const blocked = await page.evaluate(async () => {
    const snapshot = await fetch("/api/collections?workspace=triton").then((response) => response.json());
    const account = snapshot.accounts.find((item: { accountRef: string }) => item.accountRef === "E2E-OH-1");
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "channel", workspaceId: "triton", accountId: account.id, channel: "sms", body: "Hello" }),
    });
    return response.json();
  });
  expect(blocked.message.status).toBe("blocked");
  expect(blocked.message.reason.length).toBeGreaterThan(10);

  await page.goto("/w/triton/collections/workflows");
  await page.getByLabel("Sequence name").fill("E2E sequence");
  const saved = page.waitForResponse((response) => response.url().includes("/api/collections") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save sequence" }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/collect");
  await expect(page.getByRole("link", { name: "Skip to account lookup" })).toBeAttached();
  await page.getByLabel("Reference number").fill("E2E-OH-1");
  await page.getByLabel("Last four").fill("3333");
  await page.getByLabel("ZIP code").fill("44101");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("$80.00");

  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.getByText("Saldo actual")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.lang)).toBe("es");
});
