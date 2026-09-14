import { id, nowIso } from "./format";
import type { Account, CallReview, ComplianceFinding } from "./types";

interface Probe {
  rule: string;
  severity: ComplianceFinding["severity"];
  detail: string;
  /** Phrases that trip the rule. */
  patterns: RegExp[];
}

/**
 * Language that draws CFPB and state AG attention. Phrased as regexes so a
 * transcript line can be quoted back verbatim in the finding.
 */
const PROHIBITED: Probe[] = [
  {
    rule: "FDCPA 807(4) — threat of arrest or jail",
    severity: "critical",
    detail: "Never imply criminal consequence for a consumer debt.",
    patterns: [/\bjail\b/i, /\barrest(ed)?\b/i, /\bwarrant\b/i, /\bcriminal charges?\b/i],
  },
  {
    rule: "FDCPA 807(5) — threatening action not intended or not legally available",
    severity: "critical",
    detail: "Do not reference suit, garnishment, or liens unless legal has cleared the account.",
    patterns: [/\bwe (will|'ll) sue\b/i, /\bgarnish/i, /\blevy your\b/i, /\blien on your\b/i, /\btake you to court\b/i],
  },
  {
    rule: "FDCPA 805(b) — third-party disclosure",
    severity: "critical",
    detail: "Do not discuss the debt with anyone other than the consumer or their spouse/attorney.",
    patterns: [/\btell (him|her|them) (he|she|they) owes?\b/i, /\bthe debt (he|she|they) owes?\b/i],
  },
  {
    rule: "FDCPA 806(2) — obscene or abusive language",
    severity: "critical",
    detail: "Abusive language is a per-se violation and a termination event.",
    patterns: [/\bshut up\b/i, /\bstupid\b/i, /\bdeadbeat\b/i, /\bliar\b/i],
  },
  {
    rule: "Time-barred revival risk",
    severity: "major",
    detail:
      "On out-of-statute paper, a demand for payment can restart the clock in some states. Disclose, do not demand.",
    patterns: [/\byou (have|'ve) to pay (today|now)\b/i, /\bfinal (notice|demand)\b/i],
  },
  {
    rule: "Reg F 1006.14(b) — call frequency pressure",
    severity: "minor",
    detail: "Avoid implying you will keep calling until they pay.",
    patterns: [/\bkeep calling\b/i, /\bcall you every\b/i],
  },
  {
    rule: "Unauthorized fee or interest",
    severity: "major",
    detail: "Only charge what the agreement or state law permits.",
    patterns: [/\bcollection fee\b/i, /\binterest keeps? (adding|growing)\b/i],
  },
];

interface Required {
  rule: string;
  severity: ComplianceFinding["severity"];
  detail: string;
  test: (transcript: string, account: Account) => boolean;
}

const REQUIRED: Required[] = [
  {
    rule: "FDCPA 807(11) — mini-Miranda",
    severity: "critical",
    detail: "First contact must state this is an attempt to collect a debt from a debt collector.",
    test: (transcript) =>
      /attempt to collect a debt/i.test(transcript) && /debt collector/i.test(transcript),
  },
  {
    rule: "Recording disclosure",
    severity: "major",
    detail: "Two-party consent states require an explicit recording notice before substance.",
    test: (transcript) => /recorded (line|call)|this call is being recorded/i.test(transcript),
  },
  {
    rule: "Right-party verification",
    severity: "major",
    detail: "Confirm you are speaking to the consumer before disclosing any balance.",
    test: (transcript) => /(am i speaking|may i speak|is this|looking for)/i.test(transcript),
  },
  {
    rule: "Reg F 1006.34 — validation before demand",
    severity: "major",
    detail: "Validation notice must be delivered before a payment demand on a new account.",
    test: (transcript, account) =>
      account.validationSent || !/(pay|payment|balance)/i.test(transcript),
  },
  {
    rule: "Cease honored",
    severity: "critical",
    detail: "Cease-and-desist on file means the call should never have been placed.",
    test: (_transcript, account) => !account.cease,
  },
];

const WEIGHT: Record<ComplianceFinding["severity"], number> = {
  critical: 40,
  major: 15,
  minor: 5,
};

function quoteFor(transcript: string, pattern: RegExp): string | undefined {
  const line = transcript
    .split(/\n|(?<=[.!?])\s+/)
    .find((candidate) => pattern.test(candidate));
  return line?.trim().slice(0, 180);
}

export function analyzeTranscript(transcript: string, account: Account): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  for (const probe of PROHIBITED) {
    const hit = probe.patterns.find((pattern) => pattern.test(transcript));
    if (!hit) continue;
    findings.push({
      rule: probe.rule,
      severity: probe.severity,
      detail: probe.detail,
      quote: quoteFor(transcript, hit),
    });
  }

  for (const required of REQUIRED) {
    if (required.test(transcript, account)) continue;
    findings.push({
      rule: required.rule,
      severity: required.severity,
      detail: required.detail,
    });
  }

  return findings;
}

export function scoreFor(findings: ComplianceFinding[]): number {
  const penalty = findings.reduce((sum, finding) => sum + WEIGHT[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}

export function verdictFor(score: number, findings: ComplianceFinding[]): CallReview["verdict"] {
  if (findings.some((finding) => finding.severity === "critical")) return "fail";
  if (score < 85) return "coach";
  return "pass";
}

/**
 * The script the bot speaks back to the collector. Written for TTS, so it is
 * short sentences with no bullet characters or abbreviations.
 */
export function coachingScript(
  agentName: string,
  findings: ComplianceFinding[],
  score: number,
): string {
  if (findings.length === 0) {
    return `${agentName}, clean call. Score ${score}. Disclosures landed in the first fifteen seconds and you gave the consumer room to answer. Keep that pacing.`;
  }
  const critical = findings.filter((finding) => finding.severity === "critical");
  const rest = findings.filter((finding) => finding.severity !== "critical");
  const lines = [`${agentName}, this call scored ${score} out of one hundred.`];
  if (critical.length) {
    lines.push(
      `Stop and read this part. ${critical.length === 1 ? "One issue is" : `${critical.length} issues are`} a hard violation.`,
    );
    for (const finding of critical) lines.push(`${finding.rule}. ${finding.detail}`);
  }
  for (const finding of rest) lines.push(`${finding.rule}. ${finding.detail}`);
  lines.push("Acknowledge this review before your next dial.");
  return lines.join(" ");
}

export function reviewCall(
  accountId: string,
  agentId: string,
  agentName: string,
  transcript: string,
  account: Account,
  durationSec: number,
): CallReview {
  const findings = analyzeTranscript(transcript, account);
  const score = scoreFor(findings);
  return {
    id: id("qa"),
    accountId,
    agentId,
    at: nowIso(),
    durationSec,
    transcript,
    score,
    verdict: verdictFor(score, findings),
    findings,
    coaching: coachingScript(agentName, findings, score),
    acknowledged: false,
  };
}
