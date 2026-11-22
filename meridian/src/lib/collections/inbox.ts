export type InboundClass = "dispute" | "cease" | "hardship" | "promise" | "bankruptcy" | "attorney" | "other";

export function classifyInbound(text: string): InboundClass {
  const raw = text.toLowerCase();
  if (/\b(bankrupt|bankruptcy)\b/.test(raw)) return "bankruptcy";
  if (/\b(attorney|lawyer)\b/.test(raw)) return "attorney";
  if (/\b(cease|stop calling|do not contact|don't contact)\b/.test(raw)) return "cease";
  if (/\b(dispute|not mine|don't owe|do not owe)\b/.test(raw)) return "dispute";
  if (/\b(hardship|lost my job|cannot pay|can't pay)\b/.test(raw)) return "hardship";
  if (/\b(i will pay|promise|next friday|payment plan)\b/.test(raw)) return "promise";
  return "other";
}

export function draftConsumerReply(input: { classification: InboundClass; firstName: string; agency: string }): string {
  const name = input.firstName || "there";
  const tail = "This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.";
  switch (input.classification) {
    case "cease":
      return `${name}, we received your request to stop communications and will not contact you again about this account except as the law allows. ${tail}`;
    case "dispute":
      return `${name}, we received your dispute and will stop collection until we mail verification if your dispute is timely. ${tail}`;
    case "bankruptcy":
      return `${name}, we noted a bankruptcy and stopped collection activity pending review of the notice. ${tail}`;
    case "attorney":
      return `${name}, we noted attorney representation and stopped collection contact. ${tail}`;
    case "hardship":
      return `${name}, we noted a hardship. A collector must approve any plan before it is confirmed. ${tail}`;
    case "promise":
      return `${name}, we noted a promise to pay. A collector must confirm the amount and date before it is treated as an arrangement. ${tail}`;
    case "other":
      return `${name}, a collector will review your message before anyone replies. ${tail}`;
    default: {
      const neverClass: never = input.classification;
      return neverClass;
    }
  }
}
