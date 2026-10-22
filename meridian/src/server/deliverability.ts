import { promises as dns } from "dns";

export interface DomainAuth {
  domain: string;
  spf: { present: boolean; record?: string; issues: string[] };
  dkim: { present: boolean; selectorsFound: string[]; note: string };
  dmarc: { present: boolean; record?: string; policy?: string; issues: string[] };
  mx: string[];
  score: number;
  verdict: "ready" | "partial" | "blocked";
  summary: string;
}

const COMMON_DKIM_SELECTORS = ["resend", "selector1", "selector2", "google", "k1", "s1", "s2", "mail", "default", "dkim"];

/**
 * Checks the three records every mailbox provider evaluates before deciding
 * whether bulk mail from a domain reaches an inbox.
 */
export async function checkDomainAuth(domain: string): Promise<DomainAuth> {
  const clean = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const result: DomainAuth = {
    domain: clean,
    spf: { present: false, issues: [] },
    dkim: { present: false, selectorsFound: [], note: "" },
    dmarc: { present: false, issues: [] },
    mx: [],
    score: 0,
    verdict: "blocked",
    summary: "",
  };

  try {
    const records = await dns.resolveMx(clean);
    result.mx = records.sort((a, b) => a.priority - b.priority).map((row) => row.exchange);
  } catch {
    /* absence is reported below */
  }

  try {
    const txt = await dns.resolveTxt(clean);
    const flat = txt.map((chunks) => chunks.join(""));
    const spf = flat.find((record) => record.toLowerCase().startsWith("v=spf1"));
    if (spf) {
      result.spf.present = true;
      result.spf.record = spf;
      const spfCount = flat.filter((record) => record.toLowerCase().startsWith("v=spf1")).length;
      if (spfCount > 1) {
        result.spf.issues.push("More than one SPF record. Providers treat this as a permanent error — merge them into one.");
      }
      const lookups = (spf.match(/include:|a:|mx:|ptr|exists:|redirect=/g) ?? []).length;
      if (lookups > 10) {
        result.spf.issues.push(`${lookups} DNS lookups. SPF fails above 10 — flatten some includes.`);
      }
      if (/\?all/.test(spf)) {
        result.spf.issues.push("Neutral qualifier (?all) gives no protection. Use ~all or -all.");
      }
      if (/\+all/.test(spf)) {
        result.spf.issues.push("+all authorizes the entire internet to send as you. Remove it.");
      }
    }
  } catch {
    /* handled below */
  }

  try {
    const txt = await dns.resolveTxt(`_dmarc.${clean}`);
    const record = txt.map((chunks) => chunks.join("")).find((value) => value.toLowerCase().includes("v=dmarc1"));
    if (record) {
      result.dmarc.present = true;
      result.dmarc.record = record;
      const policy = record.match(/p=(none|quarantine|reject)/i)?.[1]?.toLowerCase();
      result.dmarc.policy = policy;
      if (policy === "none") {
        result.dmarc.issues.push("Policy is p=none, which only monitors. Move to quarantine once your sources pass.");
      }
      if (!/rua=/i.test(record)) {
        result.dmarc.issues.push("No rua= aggregate reporting address, so you are flying blind on failures.");
      }
    }
  } catch {
    /* handled below */
  }

  for (const selector of COMMON_DKIM_SELECTORS) {
    try {
      const txt = await dns.resolveTxt(`${selector}._domainkey.${clean}`);
      if (txt.length > 0) {
        result.dkim.present = true;
        result.dkim.selectorsFound.push(selector);
      }
    } catch {
      /* selector not in use */
    }
  }
  result.dkim.note = result.dkim.present
    ? `Found selector(s): ${result.dkim.selectorsFound.join(", ")}.`
    : "No DKIM found at the common selectors. Your provider publishes the exact selector to add.";

  let score = 0;
  if (result.spf.present) score += 30;
  if (result.spf.issues.length === 0 && result.spf.present) score += 5;
  if (result.dkim.present) score += 35;
  if (result.dmarc.present) score += 20;
  if (result.dmarc.policy && result.dmarc.policy !== "none") score += 10;
  result.score = Math.min(100, score);

  result.verdict = result.score >= 80 ? "ready" : result.score >= 40 ? "partial" : "blocked";

  const missing: string[] = [];
  if (!result.spf.present) missing.push("SPF");
  if (!result.dkim.present) missing.push("DKIM");
  if (!result.dmarc.present) missing.push("DMARC");

  result.summary = missing.length
    ? `${clean} is missing ${missing.join(", ")}. Bulk mail from this domain will be filtered until those exist.`
    : `${clean} publishes SPF, DKIM, and DMARC${result.dmarc.policy ? ` (p=${result.dmarc.policy})` : ""}.`;

  return result;
}

export interface SpamReport {
  score: number;
  verdict: "clean" | "risky" | "likely-spam";
  hits: Array<{ rule: string; points: number; detail: string }>;
}

interface SpamRule {
  rule: string;
  points: number;
  detail: string;
  test: (input: { subject: string; html: string; text: string }) => boolean;
}

/** Heuristics modeled on the SpamAssassin rule corpus. Lower is better. */
const SPAM_RULES: SpamRule[] = [
  {
    rule: "ALL_CAPS_SUBJECT",
    points: 2.5,
    detail: "Subject is mostly capitals.",
    test: ({ subject }) => subject.length > 8 && subject.replace(/[^A-Z]/g, "").length / subject.replace(/\s/g, "").length > 0.6,
  },
  {
    rule: "EXCESS_EXCLAMATION",
    points: 1.5,
    detail: "More than one exclamation mark in the subject.",
    test: ({ subject }) => (subject.match(/!/g) ?? []).length > 1,
  },
  {
    rule: "SUBJECT_TOO_LONG",
    points: 0.8,
    detail: "Subject over 70 characters will be truncated on mobile.",
    test: ({ subject }) => subject.length > 70,
  },
  {
    rule: "SUBJECT_MISSING",
    points: 3,
    detail: "No subject line.",
    test: ({ subject }) => subject.trim().length === 0,
  },
  {
    rule: "MONEY_WORDS",
    points: 1.8,
    detail: "Classic filter triggers: free, guarantee, risk-free, act now, limited time, cash bonus.",
    test: ({ subject, text }) =>
      /\b(free|guarantee[d]?|risk[- ]free|act now|limited time|cash bonus|no obligation|winner|congratulations)\b/i.test(
        `${subject} ${text}`,
      ),
  },
  {
    rule: "URGENCY",
    points: 1.2,
    detail: "Artificial urgency (urgent, immediately, expires today).",
    test: ({ subject, text }) => /\b(urgent|immediately|expires today|final notice|last chance)\b/i.test(`${subject} ${text}`),
  },
  {
    rule: "NO_TEXT_PART",
    points: 2.2,
    detail: "No plain-text alternative. Multipart mail scores better.",
    test: ({ text }) => text.trim().length < 40,
  },
  {
    rule: "IMAGE_HEAVY",
    points: 1.6,
    detail: "Very little text relative to markup.",
    test: ({ html, text }) => html.length > 2000 && text.length / html.length < 0.05,
  },
  {
    rule: "NO_UNSUBSCRIBE",
    points: 3.5,
    detail: "No unsubscribe link. This is also a CAN-SPAM violation.",
    test: ({ html, text }) => !/unsubscribe|\{\{unsubscribeUrl\}\}/i.test(`${html} ${text}`),
  },
  {
    rule: "NO_PHYSICAL_ADDRESS",
    points: 2,
    detail: "No postal address in the footer. CAN-SPAM requires one.",
    test: ({ html, text }) =>
      !/\b(FL|Florida|NY|New York|CA|California|Suite|Ste\.|United States)\b/i.test(`${html} ${text}`),
  },
  {
    rule: "SHOUTING_BODY",
    points: 1.4,
    detail: "Long runs of capitals in the body.",
    test: ({ text }) => /[A-Z]{12,}/.test(text),
  },
  {
    rule: "URL_SHORTENER",
    points: 2.4,
    detail: "Link shorteners hide destinations and are heavily penalized.",
    test: ({ html }) => /(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly|is\.gd)/i.test(html),
  },
  {
    rule: "EXCESS_LINKS",
    points: 1.3,
    detail: "More than 15 links in one message.",
    test: ({ html }) => (html.match(/<a\b/gi) ?? []).length > 15,
  },
  {
    rule: "SPAMMY_PUNCTUATION",
    points: 1,
    detail: "Repeated punctuation such as !!! or ???.",
    test: ({ subject, text }) => /([!?$])\1{2,}/.test(`${subject} ${text}`),
  },
  {
    rule: "CONSUMER_COLLECTION_LANGUAGE",
    points: 4,
    detail: "Consumer-debt collection phrasing. Triton is a marketplace and must never send this.",
    test: ({ subject, text }) =>
      /\b(your debt|you owe|pay your balance|debt collector|settle your account|past due balance)\b/i.test(
        `${subject} ${text}`,
      ),
  },
];

export function scoreSpam(subject: string, html: string, text: string): SpamReport {
  const input = { subject, html, text };
  const hits = SPAM_RULES.filter((rule) => rule.test(input)).map((rule) => ({
    rule: rule.rule,
    points: rule.points,
    detail: rule.detail,
  }));
  const score = Number(hits.reduce((sum, hit) => sum + hit.points, 0).toFixed(1));
  const verdict = score >= 6 ? "likely-spam" : score >= 3 ? "risky" : "clean";
  return { score, verdict, hits };
}
