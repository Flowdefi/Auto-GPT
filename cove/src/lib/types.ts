export type AgentStatus = "offline" | "available" | "on_call" | "wrap" | "break";

export type Channel =
  | "call"
  | "sms"
  | "email"
  | "payment"
  | "skip"
  | "system"
  | "bot"
  | "note"
  | "portal"
  | "document"
  | "qa";

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

export type Employment = "w2" | "1099" | "vendor";

export interface Agent {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: AgentStatus;
  clockedInAt?: string;
  callsToday: number;
  collectedToday: number;
  employment: Employment;
  remote: boolean;
  location: string;
  /** Hard ceiling on how many accounts can be leased to this collector at once. */
  maxAccounts: number;
  hourlyCost: number;
  commissionPct: number;
  /** Rolling compliance score (0-100) from the TTS review bot. */
  qaScore: number;
  startedAt: string;
}

/**
 * A time-boxed lease of specific accounts to a remote collector.
 * Access is denied outside the window — this is how we staff 1099 collectors
 * without handing them the whole portfolio.
 */
export interface AccessGrant {
  id: string;
  agentId: string;
  accountIds: string[];
  portfolioId?: string;
  startsAt: string;
  expiresAt: string;
  reason: string;
  grantedBy: string;
  revokedAt?: string;
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

export type PaymentChannel = "agent" | "portal" | "sms" | "ivr" | "recurring";

export interface Payment {
  id: string;
  accountId: string;
  amount: number;
  method: "card" | "ach";
  at: string;
  last4: string;
  status: "approved" | "pending" | "failed";
  channel: PaymentChannel;
  /** Descriptor the consumer sees on their statement. */
  descriptor: string;
  processorRef: string;
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

/**
 * Terminal or semi-terminal outcome used by the liquidation tracker.
 * Distinct from AccountStatus, which tracks where the account sits in the work queue.
 */
export type Disposition =
  | "active"
  | "paid"
  | "settled"
  | "bankrupt"
  | "deceased"
  | "refusal"
  | "unable_to_locate"
  | "disputed"
  | "recalled";

export type DocumentKind =
  | "placement_file"
  | "bill_of_sale"
  | "statement"
  | "validation_letter"
  | "payment_receipt"
  | "dispute"
  | "call_recording"
  | "bankruptcy_notice"
  | "death_certificate"
  | "correspondence";

export interface DebtDocument {
  id: string;
  accountId: string;
  kind: DocumentKind;
  name: string;
  addedAt: string;
  source: string;
  /** Media is "verified" when it came from the seller's warranty file, not a rep's note. */
  verified: boolean;
  sizeKb: number;
}

export interface PhoneRecord {
  id: string;
  number: string;
  label: "primary" | "mobile" | "work" | "relative" | "skip";
  status: "good" | "unverified" | "bad" | "wrong_party" | "dnc";
  lastAttempt?: string;
  attempts: number;
}

export interface Portfolio {
  id: string;
  name: string;
  seller: string;
  assetClass: string;
  purchasedAt: string;
  /** Total face value at purchase. */
  faceValue: number;
  /** What we paid. */
  purchasePrice: number;
  accountCount: number;
  /** Warranty / putback window close date. */
  putbackUntil: string;
  mediaComplete: boolean;
  notes: string;
}

export interface MessageTemplate {
  id: string;
  channel: "sms" | "email" | "letter";
  name: string;
  subject?: string;
  body: string;
  /** Blocked until validation/itemization has gone out. */
  requiresValidation: boolean;
  approvedBy: string;
  approvedAt: string;
}

export type FindingSeverity = "critical" | "major" | "minor";

export interface ComplianceFinding {
  rule: string;
  severity: FindingSeverity;
  detail: string;
  quote?: string;
}

export interface CallReview {
  id: string;
  accountId: string;
  agentId: string;
  at: string;
  durationSec: number;
  transcript: string;
  score: number;
  verdict: "pass" | "coach" | "fail";
  findings: ComplianceFinding[];
  /** Spoken coaching the bot reads back to the collector via TTS. */
  coaching: string;
  acknowledged: boolean;
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
  portfolioId: string;
  disposition: Disposition;
  /** Dollars recovered on this account to date, including pre-import history. */
  collected: number;
  /** Code the consumer types into the TF Recovery portal. */
  portalCode: string;
  phones: PhoneRecord[];
  documents: DebtDocument[];
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
  portfolios: Portfolio[];
  plans: PaymentPlan[];
  payments: Payment[];
  timeline: TimelineEvent[];
  scripts: ScriptVersion[];
  queue: DialJob[];
  messages: OutboundMessage[];
  templates: MessageTemplate[];
  grants: AccessGrant[];
  reviews: CallReview[];
  liveCall: LiveCall | null;
  currentAgentId: string | null;
  autoBot: boolean;
}
