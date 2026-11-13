import { classifyInbound, draftConsumerReply, type InboundClass } from "./inbox";

const HARD_RULES = new Set<InboundClass>(["bankruptcy", "attorney", "cease", "dispute"]);
const THREATS = /\b(arrest|jail|sue you tomorrow|garnish|prison|warrant|police)\b/i;
const DISCLOSURE = "This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.";

export interface ComposedDraft {
  classification: InboundClass;
  draft: string;
  source: "model" | "rules";
  model: string | null;
  guardNote: string;
}

function parseModel(text: string): { classification?: string; draft?: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as { classification?: string; draft?: string };
  } catch {
    return null;
  }
}

function asClass(value: string | undefined): InboundClass | null {
  if (value === "dispute" || value === "cease" || value === "hardship" || value === "promise" || value === "bankruptcy" || value === "attorney" || value === "other") {
    return value;
  }
  return null;
}

/**
 * The rules engine classifies every inbound message. A model draft is kept
 * only when it does not weaken a hard rule, does not threaten, and carries
 * the debt-collector disclosure. Otherwise the rules draft is the fallback.
 * Nothing here sends the reply.
 */
export function composeConsumerDraft(input: {
  inbound: string;
  firstName: string;
  agency: string;
  modelText?: string | null;
  model?: string | null;
}): ComposedDraft {
  const rulesClass = classifyInbound(input.inbound);
  const rulesDraft = draftConsumerReply({ classification: rulesClass, firstName: input.firstName, agency: input.agency });
  const parsed = input.modelText ? parseModel(input.modelText) : null;
  const modelClass = asClass(parsed?.classification);
  const modelDraft = parsed?.draft?.trim() ?? "";
  if (!modelClass || !modelDraft) {
    return { classification: rulesClass, draft: rulesDraft, source: "rules", model: null, guardNote: "Rules engine. No usable model draft." };
  }
  if (HARD_RULES.has(rulesClass) && modelClass !== rulesClass) {
    return {
      classification: rulesClass,
      draft: rulesDraft,
      source: "rules",
      model: input.model ?? null,
      guardNote: `Rules guard kept ${rulesClass}. The model said ${modelClass}.`,
    };
  }
  if (THREATS.test(modelDraft)) {
    return {
      classification: rulesClass,
      draft: rulesDraft,
      source: "rules",
      model: input.model ?? null,
      guardNote: "Rules guard replaced a draft that threatened the consumer.",
    };
  }
  const classification = HARD_RULES.has(rulesClass) ? rulesClass : modelClass;
  const withDisclosure = /debt collector/i.test(modelDraft) ? modelDraft : `${modelDraft} ${DISCLOSURE}`;
  return {
    classification,
    draft: withDisclosure,
    source: "model",
    model: input.model ?? null,
    guardNote: "Model draft kept. A person must approve it, and the compliance gate still applies.",
  };
}
