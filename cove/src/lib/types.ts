export type AgentStatus = "offline" | "available" | "on_call" | "wrap" | "break";

export type Channel = "call" | "sms" | "email" | "payment" | "skip" | "system" | "bot" | "note";

export type AccountStatus =
  | "new"
  | "validation_sent"
  | "working"
  | "ptp"
  | "plan"
  | "paid"
  | "dispute"
  | "cease"
  | "hold";

export type Consent = {
  voice: boolean;
  sms: boolean;
  email: boolean;
  recorded: boolean;
};

export interface Agent {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: AgentStatus;
  clockedInAt?: string;
  callsToday: number;
  collectedToday: number;
}

export interface PaymentPlan {
  id: string;
  accountId: string;
  installment: number;
  remaining: number;
  cadence: "weekly" | "biweekly" | "monthly";
  nextDue: string;
  method: "card" | "ach";
  status: "active" | "broken" | "completed";
}

export interface Payment {
  id: string;
  accountId: string;
  amount: number;
  method: "card" | "ach";
  at: string;
  last4: string;
  status: "approved" | "pending" | "failed";
}

export interface SocialProfile {
  network: "facebook" | "linkedin" | "nextdoor";
  handle: string;
  confidence: number;
  note: string;
}

export interface SkipHit {
  id: string;
  kind: "phone" | "email" | "address" | "relative" | "employer";
  value: string;
  confidence: number;
  source: string;
}

export interface TimelineEvent {
  id: string;
  accountId: string;
  channel: Channel;
  title: string;
  body: string;
  at: string;
  actor: string;
  outcome?: string;
}

export interface Account {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
  last4: string;
  originalCreditor: string;
  portfolio: string;
  product: string;
  chargeOff: string;
  placedAt: string;
  balance: number;
  original: number;
  status: AccountStatus;
  language: "en";
  consent: Consent;
  dnc: boolean;
  cease: boolean;
  timeBarred: boolean;
  validationSent: boolean;
  miniMiranda: boolean;
  nextCallAfter?: string;
  score: number;
  social: SocialProfile[];
  skipHits: SkipHit[];
  notes: string;
}

export interface ScriptVersion {
  id: string;
  version: number;
  body: string;
  createdAt: string;
  reason: string;
  rpcRate: number;
  ptpRate: number;
  complaintRate: number;
  naturalness: number;
}

export interface DialJob {
  id: string;
  accountId: string;
  status: "queued" | "dialing" | "connected" | "voicemail" | "blocked" | "no_answer" | "transferred";
  startedAt?: string;
  blockedReason?: string;
}

export interface LiveCall {
  accountId: string;
  agentId: string;
  mode: "ai" | "human";
  startedAt: string;
  attested: "A" | "B" | "C";
  transcript: Array<{ who: "agent" | "consumer"; text: string }>;
}

export interface OutboundMessage {
  id: string;
  accountId: string;
  channel: "sms" | "email";
  status: "queued" | "sent" | "failed" | "blocked";
  body: string;
  authenticated: boolean;
  at: string;
}

export interface BotAction {
  id: string;
  accountId: string;
  kind: "validate" | "call" | "sms" | "email" | "skip" | "plan" | "hold" | "callback";
  title: string;
  reason: string;
  allowed: boolean;
  blockedReason?: string;
}

export interface AppData {
  agents: Agent[];
  accounts: Account[];
  plans: PaymentPlan[];
  payments: Payment[];
  timeline: TimelineEvent[];
  scripts: ScriptVersion[];
  queue: DialJob[];
  messages: OutboundMessage[];
  liveCall: LiveCall | null;
  currentAgentId: string | null;
  autoBot: boolean;
}
