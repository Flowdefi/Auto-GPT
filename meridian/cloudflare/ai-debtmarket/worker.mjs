/**
 * Public institutional assistant for ai.debtmarket.net.
 * The desk's xAI key, voice number, and R2 vault are not on this account.
 * This host uses Workers AI and local desk math instead, and it stores nothing.
 */

export const MODEL = "@cf/meta/llama-3.2-3b-instruct";

export const BANDS = [
  ["Credit card", "3–8%"],
  ["Auto deficiency", "5–12%"],
  ["Personal / installment", "3–7%"],
  ["Medical", "2–5%"],
  ["Commercial", "8–15%"],
  ["Telecom", "1–3%"],
  ["Private student", "2–6%"],
];

export const OFFICE = {
  name: "Triton Financial Solutions",
  desk: "DebtMarket",
  email: "portfolios@debtmarket.net",
  phone: "561-254-6608",
  address: "5379 Lyons Road, Suite 142, Coconut Creek, FL 33073",
  nda: "https://app.hellosign.com/s/FO8lhayF",
};

const CONSUMER = /\b(my bill|my account|credit report|dispute my|collection agency|social security|ssn|pay my|settlement on my)\b/i;
const SSN = /\b\d{3}-?\d{2}-?\d{4}\b/;
const CARD = /\b(?:\d[ -]*?){13,19}\b/;

export function connectors() {
  return {
    host: "ai.debtmarket.net",
    stores: "nothing",
    model: {
      status: "live",
      name: "Workers AI",
      id: MODEL,
      source: "alternative",
      insteadOf: "xAI Grok. That key is not saved on the desk.",
    },
    voice: {
      status: "text_only",
      source: "alternative",
      insteadOf: "The Avery phone bridge. No voice number is saved.",
      officePhone: OFFICE.phone,
    },
    mail: {
      status: "not_sending",
      source: "desk_templates",
      insteadOf: "This host does not send mail. The desk still queues template drafts.",
      from: OFFICE.email,
    },
    vault: {
      status: "not_on_this_host",
      source: "alternative",
      insteadOf: "R2 is not enabled. Files stay in the private desk vault.",
    },
    search: {
      status: "local",
      source: "alternative",
      insteadOf: "No SERP key. Education bands and desk math run on this host.",
    },
    leftAlone: [
      "debtmarket.net and the origin worker",
      "Office 365 MX",
      "crm.debtmarket.net and collect.debtmarket.net",
      "The private desk at desk.debtmarket.net",
    ],
  };
}

export function pluginList() {
  return [
    { name: "education_bands", source: "local", description: "Published education ranges. Not offers and not a fee." },
    { name: "price_pool", source: "local", description: "Face times a percent, or a cash price as a percent of face." },
    { name: "warranty_window", source: "local", description: "Ninety days after a funding date." },
    { name: "seller_intake", source: "local", description: "What a seller snapshot should include before any file." },
    { name: "office", source: "local", description: "Published desk address, phone, and mailbox." },
  ];
}

export function educationBands() {
  return {
    note: "These are conversation ranges from the public education pages. They are not offers, and they are not Triton's fee.",
    bands: BANDS.map(([asset, band]) => ({ asset, bandOfFace: band })),
  };
}

export function pricePool(input = {}) {
  const face = number(input.face);
  const percent = number(input.percent);
  const cash = number(input.cash);
  if (face == null || face <= 0) return { error: "Face must be a number above zero." };
  if (percent == null && cash == null) return { error: "Give a percent of face or a cash price." };
  const price = cash != null ? cash : (face * percent) / 100;
  const ofFace = cash != null ? (cash / face) * 100 : percent;
  return {
    face,
    cash: round2(price),
    percentOfFace: round3(ofFace),
    note: "Arithmetic only. Not an offer, not a commission, and not a wire instruction.",
  };
}

export function warrantyWindow(input = {}) {
  const funded = String(input.funded || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(funded)) return { error: "Funding date must be YYYY-MM-DD." };
  const start = new Date(`${funded}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return { error: "Funding date is not a real date." };
  const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
  return {
    funded,
    day90: end.toISOString().slice(0, 10),
    note: "The window starts after closing and funding. The cut-off date still freezes balances, payments, paid-prior, and deceased status.",
  };
}

export function sellerIntake() {
  return {
    beforeFile: ["Creditor", "Asset class", "Face", "Account count", "Charge-off", "States"],
    then: "An NDA comes before the account-level file.",
    nda: OFFICE.nda,
    note: "A person at the desk replies within one business day. This page does not take the file.",
  };
}

export function runPlugin(name, input) {
  if (name === "education_bands") return educationBands();
  if (name === "price_pool") return pricePool(input);
  if (name === "warranty_window") return warrantyWindow(input);
  if (name === "seller_intake") return sellerIntake();
  if (name === "office") return { ...OFFICE, note: "Published desk facts. This page does not place a call." };
  return { error: "Unknown plugin." };
}

export function screen(text) {
  const value = String(text || "");
  if (CONSUMER.test(value) || SSN.test(value) || CARD.test(value)) return "consumer";
  return "ok";
}

export function redact(text) {
  return String(text || "").replace(SSN, "[redacted]").replace(CARD, "[redacted]").slice(0, 2000);
}

export function localReply(text) {
  const value = redact(text);
  if (screen(value) === "consumer") {
    return "This desk does not service consumer accounts. Please contact the company named on your letter. Do not send a Social Security number, a full account number, or a card number.";
  }
  const price = value.match(/([\d,.]+)\s*(?:face)?[^\d%]{0,24}([\d.]+)\s*%/i);
  if (price) {
    const face = Number(price[1].replace(/,/g, ""));
    const percent = Number(price[2]);
    const math = pricePool({ face, percent });
    if (!math.error) return `${math.cash.toLocaleString("en-US", { style: "currency", currency: "USD" })} is ${math.percentOfFace}% of ${math.face.toLocaleString("en-US")} face. ${math.note}`;
  }
  if (value.toLowerCase().includes("masked")) {
    return "A masked file is a review file with account-level detail removed. It is not a consumer working tape. An NDA comes before it. A price in that conversation is not an offer.";
  }
  if (/\bnda|snapshot|seller\b/i.test(value)) {
    const intake = sellerIntake();
    return `A snapshot should include ${intake.beforeFile.join(", ")}. ${intake.then} ${intake.note}`;
  }
  if (/\bband|education|percent of face\b/i.test(value)) {
    const rows = educationBands();
    return `${rows.note} ${rows.bands.map((row) => `${row.asset} ${row.bandOfFace}`).join(". ")}.`;
  }
  if (/\bphone|address|email|mailbox\b/i.test(value)) {
    return `${OFFICE.name}, ${OFFICE.address}. ${OFFICE.phone}. ${OFFICE.email}.`;
  }
  return "I can walk through an education band, a face-and-percent calculation, a 90-day funding window, or what a seller snapshot should include. I do not quote a commission, a wire, or a price.";
}

export function pluginContext(text) {
  const value = String(text || "");
  const bits = [];
  if (/\bband|education|percent of face|asset class\b/i.test(value)) bits.push(educationBands());
  const face = value.match(/\b([\d,]{3,})\b/);
  const percent = value.match(/([\d.]+)\s*%/);
  if (face && percent) bits.push(pricePool({ face: face[1].replace(/,/g, ""), percent: percent[1] }));
  if (/\b90[- ]day|funding date|warranty\b/i.test(value)) bits.push({ warranty: "Ninety days after the funding date. Ask for YYYY-MM-DD if it was not given." });
  if (/\bseller|snapshot|nda\b/i.test(value)) bits.push(sellerIntake());
  return bits;
}

function number(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

const SYSTEM = `You are the text desk for Triton Financial Solutions, the DebtMarket brokerage. You speak to institutional sellers and qualified buyers about charged-off portfolio sales. You are not a consumer collection agent.

If the person is asking about their own bill, payment, credit report, or dispute, say this desk does not service consumer accounts and they should contact the company named on their letter. Never ask for a Social Security number, a full account number, a card number, or a payment.

Do not give legal advice. Do not quote a Triton commission. Do not give wire instructions. Do not promise a price. Education bands and any calculated percent are conversation ranges, not offers. An NDA comes before any account-level file. A person replies within one business day at portfolios@debtmarket.net. The office is 5379 Lyons Road, Suite 142, Coconut Creek, FL 33073. Phone 561-254-6608.

Use the plugin JSON when it is present. Do not invent a figure that is not in that JSON. Keep the reply under 120 words.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return html(page());
    }
    if (request.method === "GET" && url.pathname === "/api/connectors") return json(connectors());
    if (request.method === "GET" && url.pathname === "/api/plugins") return json({ plugins: pluginList() });
    if (request.method === "POST" && url.pathname === "/api/plugins") {
      const body = await readJson(request);
      if (body.error) return json(body, 400);
      return json(runPlugin(String(body.name || ""), body.input || {}));
    }
    if (request.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJson(request);
      if (body.error) return json(body, 400);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
      const last = messages.filter((item) => item && item.role === "user").at(-1);
      const asked = redact(last?.content || "");
      if (!asked) return json({ error: "Say what you need." }, 400);
      const local = localReply(asked);
      if (!local.startsWith("I can walk through")) return json({ reply: local, source: "local", stored: false });
      const context = pluginContext(asked);
      const reply = await modelReply(env, asked, context);
      return json({ reply: reply.text, source: reply.source, stored: false });
    }
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n", { headers: { "Content-Type": "text/plain" } });
    return json({ error: "Not found." }, 404);
  },
};

async function modelReply(env, asked, context) {
  if (!env?.AI) return { text: localReply(asked), source: "local" };
  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: context.length ? `${asked}\n\nPlugin JSON:\n${JSON.stringify(context)}` : asked },
      ],
      max_tokens: 280,
      temperature: 0.2,
    });
    const text = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
    if (!text) return { text: localReply(asked), source: "local" };
    return { text: text.slice(0, 2000), source: "workers_ai" };
  } catch {
    return { text: localReply(asked), source: "local" };
  }
}

async function readJson(request) {
  const raw = await request.text();
  if (raw.length > 8000) return { error: "That note is too long." };
  try {
    const body = JSON.parse(raw || "{}");
    return body && typeof body === "object" ? body : { error: "Bad payload." };
  } catch {
    return { error: "Bad payload." };
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

function html(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function page() {
  const bands = BANDS.map(([name, band]) => `<li><strong>${name}</strong> ${band} of face</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DebtMarket AI</title>
  <style>
    :root { --ink:#1c1712; --muted:#6d6256; --line:#e3d8c8; --paper:#f4efe6; --card:#fffdf8; --copper:#8f4328; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; color:var(--ink); background:radial-gradient(circle at top left, rgba(143,67,40,.16), transparent 32%), linear-gradient(180deg,#f7f1e7,#efe4d4); font:16px/1.45 Figtree, ui-sans-serif, sans-serif; }
    main { width:min(880px, calc(100% - 32px)); margin:32px auto 48px; display:grid; gap:16px; }
    h1 { font-family:Fraunces, ui-serif, serif; font-weight:560; letter-spacing:-.03em; font-size:52px; line-height:.92; margin:0; }
    .kicker { color:var(--copper); font-size:12px; letter-spacing:.16em; text-transform:uppercase; font-weight:700; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:22px; padding:22px; }
    .note, p { color:var(--muted); }
    form { display:grid; gap:10px; }
    textarea { width:100%; min-height:88px; border:1px solid var(--line); border-radius:12px; padding:12px; font:inherit; }
    button { border:0; background:var(--ink); color:#f7f1e7; border-radius:999px; padding:12px 16px; font-weight:650; cursor:pointer; }
    #log { display:grid; gap:10px; }
    .who { font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--copper); }
    ul { margin:8px 0 0; padding-left:18px; }
    a { color:var(--copper-deep, #6d301c); }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="kicker">Triton Financial Solutions</div>
      <h1>DebtMarket AI</h1>
      <p>Institutional sellers and qualified buyers. This page does not service a consumer account, and it does not keep what you type.</p>
    </header>
    <section class="card">
      <div id="log" aria-live="polite"></div>
      <form id="ask">
        <label for="q">Ask about a portfolio conversation</label>
        <textarea id="q" name="q" required maxlength="2000" placeholder="Asset class, face, or what a seller snapshot needs"></textarea>
        <button type="submit">Send</button>
      </form>
    </section>
    <section class="card">
      <div class="kicker">Local plugins</div>
      <p>These run on this host. They do not call a search vendor.</p>
      <ul>${bands}</ul>
      <p>Office ${OFFICE.address}. ${OFFICE.phone}. ${OFFICE.email}.</p>
    </section>
  </main>
  <script>
    const log = document.getElementById("log");
    const form = document.getElementById("ask");
    const box = document.getElementById("q");
    const thread = [];
    function add(who, text) {
      const item = document.createElement("article");
      item.innerHTML = '<div class="who"></div><p></p>';
      item.querySelector(".who").textContent = who;
      item.querySelector("p").textContent = text;
      log.append(item);
    }
    add("Desk", "Ask one question. Education ranges are not offers. Do not send an account number or a Social Security number.");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const content = box.value.trim();
      if (!content) return;
      box.value = "";
      add("You", content);
      thread.push({ role: "user", content });
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: thread }) });
      const payload = await response.json();
      const reply = payload.reply || payload.error || "The desk could not answer.";
      thread.push({ role: "assistant", content: reply });
      add(payload.source === "workers_ai" ? "Workers AI" : "Desk", reply);
    };
  </script>
</body>
</html>`;
}
