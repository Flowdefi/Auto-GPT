export type VendorCategory = "payments" | "skip" | "telephony" | "messaging" | "mail";

export interface Vendor {
  id: string;
  category: VendorCategory;
  name: string;
  what: string;
  pricing: string;
  /** Why this one over the others in its category. */
  why: string;
  /** What makes it a bad fit. Every vendor gets an honest one. */
  watchOut: string;
  url: string;
  recommended: boolean;
  /** Whether the underwriting/credentialing gate is passable pre-revenue. */
  gate: "open" | "credentialed" | "underwritten";
}

/**
 * Vendor shortlist for an ARM startup. Pricing is from public pages and is
 * indicative only — every one of these quotes by volume.
 */
export const VENDORS: Vendor[] = [
  {
    id: "repay",
    category: "payments",
    name: "REPAY",
    what: "Embedded ARM payments: card, ACH, consumer portal, IVR, recurring plans, reconciliation.",
    pricing: "Interchange-plus, quoted. Multiple sponsor banks behind one integration.",
    why:
      "Purpose-built for accounts receivable management, so the underwriting conversation starts from 'yes' instead of 'we don't board collections'. Relationships with several sponsor banks means a bank exiting the vertical does not kill your MID.",
    watchOut: "Enterprise sales cycle. Expect a real underwriting file and a reserve.",
    url: "https://repay.com/who-we-serve/accounts-receivable-management/",
    recommended: true,
    gate: "underwritten",
  },
  {
    id: "finvi",
    category: "payments",
    name: "Finvi Payments",
    what: "Payments embedded in a collections platform, with a consumer-pays-fee program.",
    pricing: "Quoted. Optional Consumer Payment Fee shifts cost to the payer.",
    why: "Direct card-brand and ACH connections with in-house underwriting and settlement, so funding timelines are predictable.",
    watchOut:
      "Deepest value if you also run their collections platform. Consumer fee programs are regulated at the state level — check each state before switching it on.",
    url: "https://finvi.com/accounts-receivable/payments-solution/",
    recommended: false,
    gate: "underwritten",
  },
  {
    id: "corepay",
    category: "payments",
    name: "Corepay",
    what: "Standalone high-risk merchant account for collection agencies.",
    pricing: "Blended from ~2.95%. Application, setup, and annual fees waived. 24–72h approvals.",
    why:
      "Fastest path to a live MID for a brand-new agency with no processing history. Good bridge while a REPAY or Finvi file is in underwriting.",
    watchOut:
      "Blended pricing costs more than interchange-plus at volume, and their page describes underwriting licensed agencies — have your entity, policies, and state posture documented.",
    url: "https://corepay.net/industries/best-debt-collection-merchant-account/",
    recommended: true,
    gate: "underwritten",
  },
  {
    id: "tlo",
    category: "skip",
    name: "TransUnion TruLookup / TLOxp",
    what: "Skip tracing across 10,000+ public and proprietary sources. Online, batch, and API.",
    pricing: "Roughly $0.25–$1.00 per lookup; comprehensive reports quoted around $4.50. Annual contract.",
    why: "The deepest data in the category and the name your sellers and attorneys already trust.",
    watchOut:
      "Credentialing is real: site inspection, permissible-purpose attestation, and an annual commitment. Not a week-one vendor.",
    url: "https://www.tlo.com/skip-tracing",
    recommended: false,
    gate: "credentialed",
  },
  {
    id: "idi",
    category: "skip",
    name: "IDI idiCORE",
    what: "Skip tracing with API and batch, including deceased, bankruptcy, and lien indicators.",
    pricing: "$0.50–$2.00 per record, no monthly minimums.",
    why:
      "No monthly minimum is the difference-maker pre-revenue, and the deceased and bankruptcy flags directly drive your disposition buckets.",
    watchOut: "Still requires credentialing and permissible purpose. Enterprise quote process.",
    url: "https://www.ididata.com/skip-tracing/",
    recommended: true,
    gate: "credentialed",
  },
  {
    id: "microbilt",
    category: "skip",
    name: "MicroBilt Locate People",
    what: "Phone, address, and email append via API, batch, or web.",
    pricing: "Roughly $0.15–$0.23 per call.",
    why: "Cheapest per-record option that still credentials collectors. Good for bulk first-pass appends before you spend on IDI.",
    watchOut: "Thinner data than TLO or IDI. Treat hits as leads to verify, not as right-party contact.",
    url: "https://www.microbilt.com/",
    recommended: true,
    gate: "credentialed",
  },
  {
    id: "vicidial",
    category: "telephony",
    name: "VICIdial",
    what: "Open-source contact center on Asterisk: predictive and progressive dialing, ACD, agent screens, recording, DNC.",
    pricing: "AGPLv2. Free software; you pay for servers and carrier minutes.",
    why:
      "The only mature open-source platform purpose-built for outbound. Campaigns, lead lists, pacing, and recordings exist on day one instead of being a build.",
    watchOut:
      "Dated interface and it wants a dedicated CPU-optimized host — Asterisk is sensitive to CPU scheduling jitter, so avoid burstable cloud instances. Run it on host networking, not Docker bridge.",
    url: "https://www.vicidial.org/",
    recommended: true,
    gate: "open",
  },
  {
    id: "asterisk",
    category: "telephony",
    name: "Asterisk + ARI",
    what: "Raw telephony engine with a REST interface you drive from your own code.",
    pricing: "GPLv2. Free.",
    why: "Full control and any language you like. This is the right base if the AI voice agent, not a human floor, is doing most of the dialing.",
    watchOut: "No campaigns, pacing, agent states, or DNC out of the box. You are building a contact center from lumber.",
    url: "https://www.asterisk.org/",
    recommended: false,
    gate: "open",
  },
  {
    id: "carrier",
    category: "telephony",
    name: "SIP carrier with STIR/SHAKEN A-attestation",
    what: "Origination and termination with signed caller ID and branded calling.",
    pricing: "Per-minute, typically under a cent domestic.",
    why:
      "Attestation is the difference between your calls ringing and your calls landing as 'Spam Likely'. The carrier signs, not your dialer — so this is a procurement decision, not a code one.",
    watchOut:
      "You must own or legally control the numbers you present. Churning DIDs to dodge spam labels will get you de-attested.",
    url: "https://www.fcc.gov/call-authentication",
    recommended: true,
    gate: "underwritten",
  },
  {
    id: "10dlc",
    category: "messaging",
    name: "10DLC brand + campaign registration",
    what: "Registered A2P messaging for collections traffic.",
    pricing: "One-time brand vetting plus per-campaign monthly fees, then per-segment.",
    why: "Unregistered collections SMS is filtered outright by every US carrier. Registration is not optional.",
    watchOut:
      "Debt collection is a scrutinized use case. Your opt-in language, sample messages, and STOP handling get reviewed. Budget weeks, not days.",
    url: "https://www.campaignregistry.com/",
    recommended: true,
    gate: "underwritten",
  },
  {
    id: "letterstream",
    category: "mail",
    name: "Print-and-mail API (LetterStream, Lob, PostGrid)",
    what: "API-driven first-class mail for validation notices and settlement offers.",
    pricing: "Roughly $0.80–$1.40 per letter including postage.",
    why: "Reg F validation has to reach the consumer. An API means the bot mails it the moment an account is placed instead of waiting on a person.",
    watchOut: "Track proof of mailing. Your validation date drives the 30-day dispute window and every downstream demand.",
    url: "https://www.lob.com/",
    recommended: true,
    gate: "open",
  },
];

export function byCategory(category: VendorCategory): Vendor[] {
  return VENDORS.filter((vendor) => vendor.category === category);
}

export const CATEGORY_LABEL: Record<VendorCategory, string> = {
  payments: "Payment processing",
  skip: "Skip tracing",
  telephony: "Dialer & voice",
  messaging: "SMS",
  mail: "Physical mail",
};
