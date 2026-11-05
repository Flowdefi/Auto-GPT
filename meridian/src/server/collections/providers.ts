export type SmsProvider = "sandbox" | "twilio" | "telnyx";
export type EmailProvider = "sandbox" | "sendgrid" | "postmark";
export type LetterProvider = "sandbox" | "lob";
export type PaymentsProvider = "sandbox" | "stripe";

export function liveDeliveryEnabled(): boolean {
  return process.env.MERIDIAN_CHANNEL_DELIVER === "live";
}

export function smsProvider(): SmsProvider {
  const value = process.env.MERIDIAN_SMS_PROVIDER ?? "sandbox";
  if (value === "twilio" || value === "telnyx") return value;
  return "sandbox";
}

export function emailProvider(): EmailProvider {
  const value = process.env.MERIDIAN_EMAIL_PROVIDER ?? "sandbox";
  if (value === "sendgrid" || value === "postmark") return value;
  return "sandbox";
}

export function letterProvider(): LetterProvider {
  return process.env.MERIDIAN_LETTER_PROVIDER === "lob" ? "lob" : "sandbox";
}

export function paymentsProvider(): PaymentsProvider {
  return process.env.MERIDIAN_PAYMENTS_PROVIDER === "stripe" ? "stripe" : "sandbox";
}

export interface DeliveryResult {
  provider: string;
  providerId: string;
  sandbox: boolean;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

function sandboxId(prefix: string): DeliveryResult {
  return { provider: "sandbox", providerId: `sandbox_${prefix}_${Math.random().toString(36).slice(2, 10)}`, sandbox: true };
}

export async function deliverSms(input: { to: string; body: string }, fetchImpl: FetchLike = fetch): Promise<DeliveryResult> {
  const provider = smsProvider();
  if (!liveDeliveryEnabled() || provider === "sandbox") return sandboxId("sms");
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error("Twilio keys are missing");
    const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: input.to, From: from, Body: input.body }),
    });
    if (!response.ok) throw new Error(`Twilio send failed (${response.status})`);
    const payload = (await response.json()) as { sid?: string };
    return { provider: "twilio", providerId: payload.sid ?? "twilio", sandbox: false };
  }
  const key = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_FROM;
  if (!key || !from) throw new Error("Telnyx keys are missing");
  const response = await fetchImpl("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, text: input.body }),
  });
  if (!response.ok) throw new Error(`Telnyx send failed (${response.status})`);
  const payload = (await response.json()) as { data?: { id?: string } };
  return { provider: "telnyx", providerId: payload.data?.id ?? "telnyx", sandbox: false };
}

export function liveFromAddress(value: string | undefined, label: string): string {
  const email = value?.trim() ?? "";
  const host = email.split("@")[1]?.toLowerCase() ?? "";
  if (!email.includes("@") || !host) throw new Error(`${label} is missing.`);
  if (host === "example.test" || host.endsWith(".example.test")) throw new Error(`${label} will not use example.test.`);
  return email;
}

export async function deliverEmail(input: { to: string; subject: string; body: string }, fetchImpl: FetchLike = fetch): Promise<DeliveryResult> {
  const provider = emailProvider();
  if (!liveDeliveryEnabled() || provider === "sandbox") return sandboxId("email");
  if (provider === "sendgrid") {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) throw new Error("SendGrid keys are missing");
    const from = liveFromAddress(process.env.SENDGRID_FROM, "SendGrid from address");
    const response = await fetchImpl("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ personalizations: [{ to: [{ email: input.to }] }], from: { email: from }, subject: input.subject, content: [{ type: "text/plain", value: input.body }] }),
    });
    if (!response.ok) throw new Error(`SendGrid send failed (${response.status})`);
    return { provider: "sendgrid", providerId: response.status === 202 ? "sendgrid_accepted" : "sendgrid", sandbox: false };
  }
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error("Postmark keys are missing");
  const from = liveFromAddress(process.env.POSTMARK_FROM, "Postmark from address");
  const response = await fetchImpl("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ From: from, To: input.to, Subject: input.subject, TextBody: input.body }),
  });
  if (!response.ok) throw new Error(`Postmark send failed (${response.status})`);
  const payload = (await response.json()) as { MessageID?: string };
  return { provider: "postmark", providerId: payload.MessageID ?? "postmark", sandbox: false };
}

export async function deliverLetter(input: { toName: string; body: string }, fetchImpl: FetchLike = fetch): Promise<DeliveryResult> {
  if (!liveDeliveryEnabled() || letterProvider() === "sandbox") return sandboxId("letter");
  const key = process.env.LOB_API_KEY;
  if (!key) throw new Error("Lob key is missing");
  const response = await fetchImpl("https://api.lob.com/v1/letters", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ description: input.toName, file: input.body, color: false }),
  });
  if (!response.ok) throw new Error(`Lob send failed (${response.status})`);
  const payload = (await response.json()) as { id?: string };
  return { provider: "lob", providerId: payload.id ?? "lob", sandbox: false };
}

export async function deliverAllowedChannel(
  input: { channel: string; to: string; subject: string; body: string; toName: string },
  fetchImpl?: FetchLike,
): Promise<DeliveryResult | null> {
  if (!liveDeliveryEnabled()) return null;
  if (input.channel === "sms" || input.channel === "email" || input.channel === "letter") {
    const provider = input.channel === "sms" ? smsProvider() : input.channel === "email" ? emailProvider() : letterProvider();
    if (provider === "sandbox") {
      throw new Error(`Live ${input.channel} needs a provider env flag. Sandbox is still the default.`);
    }
    if (!input.to.trim()) {
      throw new Error("A live send needs a destination. The account file stores only the last four digits.");
    }
  }
  if (input.channel === "sms") return deliverSms({ to: input.to, body: input.body }, fetchImpl);
  if (input.channel === "email") return deliverEmail({ to: input.to, subject: input.subject || "Account notice", body: input.body }, fetchImpl);
  if (input.channel === "letter") return deliverLetter({ toName: input.toName || input.to, body: input.body }, fetchImpl);
  return null;
}

function stripeReturnOrigin(): string {
  const raw = process.env.MERIDIAN_PUBLIC_URL?.trim() ?? "";
  if (!raw) throw new Error("Live Stripe checkout needs MERIDIAN_PUBLIC_URL. example.test is not used.");
  let origin = "";
  try {
    const url = new URL(raw);
    origin = url.origin;
    if (url.protocol !== "https:") throw new Error("Live Stripe checkout needs an https MERIDIAN_PUBLIC_URL.");
    if (!url.host || url.host === "example.test" || url.host.endsWith(".example.test")) {
      throw new Error("Live Stripe checkout will not use example.test.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("example.test")) throw error;
    throw new Error("Live Stripe checkout needs an https MERIDIAN_PUBLIC_URL.");
  }
  return origin;
}

export async function createStripeCheckout(input: { amountCents: number; reference: string }, fetchImpl: FetchLike = fetch): Promise<DeliveryResult & { url: string }> {
  if (!liveDeliveryEnabled() || paymentsProvider() === "sandbox") {
    const sandbox = sandboxId("pay");
    return { ...sandbox, url: `/pay/sandbox/${sandbox.providerId}` };
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe key is missing");
  const origin = stripeReturnOrigin();
  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/collect/account`,
    cancel_url: `${origin}/collect/account`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": "Payment",
  });
  const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) throw new Error(`Stripe checkout failed (${response.status})`);
  const payload = (await response.json()) as { id?: string; url?: string };
  return { provider: "stripe", providerId: payload.id ?? "stripe", sandbox: false, url: payload.url ?? "" };
}
