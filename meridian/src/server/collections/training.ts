import type { WorkspaceId } from "@/lib/types";
import type { TrainingPass } from "@/lib/collections/desk";
import { loadDb, mutate } from "@/server/db";
import { importPortfolio } from "./service";

const QUIZ: Array<{ id: string; prompt: string; choices: string[]; correct: number; citation: string }> = [
  {
    id: "miranda",
    prompt: "When does the federal mini-Miranda have to be given?",
    choices: [
      "Only after the person agrees to pay",
      "In the first communication with the consumer",
      "Only on letters, never on a call",
      "Only if the consumer asks whether this is a collection",
    ],
    correct: 1,
    citation: "15 U.S.C. § 1692e(11); 12 CFR § 1006.18. Counsel still reviews the exact sentence.",
  },
  {
    id: "window",
    prompt: "What calling window does this desk enforce?",
    choices: [
      "Any time in the agency's time zone",
      "9:00 a.m. to 8:00 p.m. Eastern for every state",
      "8:00 a.m. to 9:00 p.m. in the consumer's local time",
      "Business hours only, with no statute behind it",
    ],
    correct: 2,
    citation: "12 CFR § 1006.6. Unknown ZIP codes are blocked rather than guessed.",
  },
  {
    id: "seven",
    prompt: "What does the 7-in-7 rule stop?",
    choices: [
      "More than seven letters in a month",
      "A seventh telephone attempt within seven days, and a call within seven days after a conversation",
      "Any second call on the same day",
      "Calls only after a payment posts",
    ],
    correct: 1,
    citation: "12 CFR § 1006.14(b). Counsel should confirm the current subsection.",
  },
  {
    id: "cease",
    prompt: "A consumer says to stop calling. What does the desk do?",
    choices: [
      "Keep dialing until the daily cap",
      "Mark the account ceased, add internal do-not-call, and close outreach",
      "Move the call to email only, with no record",
      "Ask for the debt amount one more time, then stop",
    ],
    correct: 1,
    citation: "15 U.S.C. § 1692c(c). Limited exceptions still need counsel review.",
  },
  {
    id: "dispute",
    prompt: "A written dispute arrives inside the validation window. What happens to collection?",
    choices: [
      "Collection on the disputed amount stops until verification is sent",
      "The account is deleted",
      "Calls continue and the letter is optional",
      "The consumer must pay before anyone reads the dispute",
    ],
    correct: 0,
    citation: "15 U.S.C. § 1692g(b); 12 CFR § 1006.38. Counsel confirms the current verification rule.",
  },
];

export const TRAINING_SCENARIOS = [
  {
    id: "opening",
    title: "Mini-Miranda before the debt",
    steps: [
      "Open DEMO-OH-1 and run the pre-check. Connect only if the gate says allowed.",
      "The first sandbox line identifies the agency and says this is an attempt to collect a debt.",
      "Do not name the balance before that sentence.",
    ],
  },
  {
    id: "window",
    title: "Calling window",
    steps: [
      "A call at or after 9:00 p.m. local time is blocked. The pre-check shows calling_window.",
      "An unknown ZIP is blocked. Do not guess the time zone.",
    ],
  },
  {
    id: "cease",
    title: "Cease and dispute",
    steps: [
      "If the person says stop, wrap the call as cease. Outreach and the portal close.",
      "If the person disputes in writing inside the validation window, wrap as dispute and stop collection on that amount until verification.",
    ],
  },
] as const;

const DEMO_CSV = [
  "account_ref,consumer_name,consumer_state,zip,last4,balance,phone_type,seller",
  "DEMO-OH-1,Example Caller,OH,44101,4242,42.00,cell,Example Seller",
  "DEMO-TX-1,Example Texan,TX,75201,1111,10.00,landline,Example Seller",
  "DEMO-CA-1,Example Quarantine,CA,90001,2222,10.00,cell,Example Seller",
].join("\n");

const HARBOR_CSV = [
  "account_ref,consumer_name,consumer_state,zip,last4,balance,phone_type,seller",
  "HBR-OH-1,Example Harbor,OH,44101,4242,18.00,landline,Example Harbor Seller",
  "HBR-TX-1,Example Harbor Texan,TX,75201,1111,12.00,cell,Example Harbor Seller",
  "HBR-CA-1,Example Harbor Quarantine,CA,90001,2222,9.00,cell,Example Harbor Seller",
].join("\n");

export function seedTrainingDesk(workspaceId: WorkspaceId): { created: number; quarantined: number } {
  const csv = workspaceId === "aether" ? HARBOR_CSV : DEMO_CSV;
  const imported = importPortfolio({ workspaceId, csv: `${csv}\n`, portfolioId: workspaceId === "aether" ? "pf_harbor" : "pf_training" });
  return { created: imported.created, quarantined: imported.quarantined };
}

export function quizPrompts() {
  return QUIZ.map(({ id, prompt, choices, citation }) => ({ id, prompt, choices, citation }));
}

export function scoreAndStore(workspaceId: WorkspaceId, email: string, answers: number[]): TrainingPass {
  let score = 0;
  QUIZ.forEach((question, index) => {
    if (answers[index] === question.correct) score += 1;
  });
  const passed = score >= 4;
  const key = email.toLowerCase();
  let stored: TrainingPass = { email: key, workspaceId, passedAt: passed ? new Date().toISOString() : null, score, attempts: 1 };
  mutate((db) => {
    const prior = (db.trainingPasses ?? []).find((row) => row.email === key && row.workspaceId === workspaceId);
    stored = {
      email: key,
      workspaceId,
      passedAt: passed ? new Date().toISOString() : prior?.passedAt ?? null,
      score,
      attempts: (prior?.attempts ?? 0) + 1,
    };
    db.trainingPasses = [stored, ...(db.trainingPasses ?? []).filter((row) => !(row.email === key && row.workspaceId === workspaceId))];
  });
  return stored;
}

export function trainingCleared(email: string, workspaceId?: WorkspaceId): boolean {
  return (loadDb().trainingPasses ?? []).some((row) => row.email === email.toLowerCase() && row.passedAt && (!workspaceId || row.workspaceId === workspaceId));
}

export function trainingStatus(workspaceId: WorkspaceId, email: string): TrainingPass | null {
  return (loadDb().trainingPasses ?? []).find((row) => row.email === email.toLowerCase() && row.workspaceId === workspaceId) ?? null;
}
