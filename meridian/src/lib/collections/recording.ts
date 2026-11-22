import { STATE_ELIGIBILITY_SEED } from "./eligibility";

export type RecordingParty = "all" | "one" | "uncertain";

export interface RecordingRule {
  code: string;
  party: RecordingParty;
  citation: string;
  needsCounselReview: boolean;
}

const ALL_PARTY: Record<string, string> = {
  CA: "Cal. Penal Code § 632. Commonly treated as all-party. Counsel must confirm the current text and exceptions.",
  CT: "Conn. Gen. Stat. § 52-570d. Commonly treated as all-party. Counsel must confirm.",
  FL: "Fla. Stat. § 934.03. Commonly treated as all-party. Counsel must confirm.",
  IL: "720 ILCS 5/14-2. Commonly treated as all-party. Counsel must confirm.",
  MD: "Md. Code, Cts. & Jud. Proc. § 10-402. Commonly treated as all-party. Counsel must confirm.",
  MA: "Mass. Gen. Laws ch. 272, § 99. Commonly treated as all-party. Counsel must confirm.",
  MI: "Mich. Comp. Laws § 750.539c. Commonly treated as all-party. Counsel must confirm.",
  MT: "Mont. Code Ann. § 45-8-213. Commonly treated as all-party. Counsel must confirm.",
  NH: "N.H. Rev. Stat. Ann. § 570-A:2. Commonly treated as all-party. Counsel must confirm.",
  OR: "Or. Rev. Stat. § 165.540. Commonly treated as all-party. Counsel must confirm.",
  PA: "18 Pa. Cons. Stat. § 5704. Commonly treated as all-party. Counsel must confirm.",
  WA: "Wash. Rev. Code § 9.73.030. Commonly treated as all-party. Counsel must confirm.",
};

const ONE_PARTY: Record<string, string> = {
  TX: "Tex. Penal Code § 16.02. A party to the conversation is commonly treated as enough. Counsel must confirm before recording.",
  GA: "O.C.G.A. § 16-11-66. One consenting party is commonly treated as enough. Counsel must confirm.",
};

const GENERIC_ONE =
  "Not in the all-party set this desk was given. 18 U.S.C. § 2511(2)(d) allows a person who is a party to the call to record it under federal law. State law may be stricter. Counsel must confirm before relying on one-party consent.";

export function defaultRecordingTable(): RecordingRule[] {
  return STATE_ELIGIBILITY_SEED.map((state) => {
    const all = ALL_PARTY[state.code];
    if (all) return { code: state.code, party: "all" as const, citation: all, needsCounselReview: true };
    const one = ONE_PARTY[state.code];
    if (one) return { code: state.code, party: "one" as const, citation: one, needsCounselReview: true };
    return { code: state.code, party: "one" as const, citation: GENERIC_ONE, needsCounselReview: true };
  });
}

/** All-party and uncertain states stay in the consent step. One-party states announce recording and continue. */
export function requiresAllPartyRecording(state: string, rules: RecordingRule[] = defaultRecordingTable()): boolean {
  const row = rules.find((rule) => rule.code === state.trim().toUpperCase());
  if (!row || row.party === "uncertain" || row.party === "all") return true;
  return false;
}
