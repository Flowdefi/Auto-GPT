import { readFileSync } from "fs";
import path from "path";

export interface VoiceGuardrails {
  id: string;
  banned_phrases: string[];
  identity_verification?: { never_request?: string[] };
  fallback: string;
}

const FALLBACK = "I need to bring a person in so I don't say that the wrong way. I can transfer you now.";

export function guardrailsFromJson(raw: string): VoiceGuardrails {
  const parsed = JSON.parse(raw) as { id?: string; banned_phrases?: string[]; identity_verification?: { never_request?: string[] } };
  return {
    id: parsed.id ?? "CALL-009",
    banned_phrases: parsed.banned_phrases ?? [],
    identity_verification: parsed.identity_verification,
    fallback: FALLBACK,
  };
}

export function loadVoiceGuardrails(root = path.join(process.cwd(), "templates", "collections")): VoiceGuardrails {
  const file = path.join(root, "call-scripts", "voice-ai-guardrails.json");
  return guardrailsFromJson(readFileSync(file, "utf8"));
}

/** Runs apart from the script that produced the line. A hit replaces the utterance. */
export function filterVoiceUtterance(text: string, rules: VoiceGuardrails): { text: string; blocked: boolean; reason: string | null } {
  const lower = text.toLowerCase();
  for (const phrase of rules.banned_phrases) {
    if (phrase && lower.includes(phrase.toLowerCase())) {
      return { text: rules.fallback, blocked: true, reason: `Voice guardrail blocked "${phrase}".` };
    }
  }
  const asked = (rules.identity_verification?.never_request ?? []).some((field) => {
    if (field === "ssn" || field === "ssn_last4") return /\bsocial security\b|\bssn\b/i.test(text);
    if (field === "full_account_number" || field === "card_number") return /\b(full account number|card number|debit card)\b/i.test(text);
    if (field === "routing_number" || field === "bank_account_number") return /\b(routing number|bank account)\b/i.test(text);
    if (field === "cvv" || field === "pin" || field === "password") return new RegExp(`\\b${field}\\b`, "i").test(text);
    return false;
  });
  if (asked) {
    return { text: "I can't ask for a Social Security number, a full account number, or a card number.", blocked: true, reason: "Voice guardrail blocked a forbidden identifier." };
  }
  return { text, blocked: false, reason: null };
}
