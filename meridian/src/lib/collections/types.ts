import type { WorkspaceId } from "@/lib/types";

/** True, false, or not established from a primary source in this review. */
export type TriState = true | false | "uncertain";

export interface StateEligibility {
  code: string;
  name: string;
  collectorLicenseRequired: TriState;
  debtBuyerLicenseRequired: TriState;
  bondOrRegistration: string;
  citation: string;
  citationUrl: string;
  lastReviewed: string;
  needsCounselReview: boolean;
  /** Operational switch. Outreach and the payment portal follow this flag. */
  eligible: boolean;
  notes: string;
}

export type AccountStatus =
  | "workable"
  | "quarantined"
  | "returned"
  | "ceased"
  | "disputed"
  | "bankruptcy"
  | "attorney"
  | "deceased"
  | "military";

export type PhoneType = "cell" | "landline" | "unknown";

export interface PortfolioAccount {
  id: string;
  workspaceId: WorkspaceId;
  portfolioId: string;
  accountRef: string;
  consumerName: string;
  state: string;
  zip: string;
  last4: string;
  portalCode: string;
  phoneType: PhoneType;
  phoneLast4: string;
  sellerName: string;
  balanceCents: number;
  status: AccountStatus;
  quarantineReason: string | null;
  inconvenientWork: boolean;
  importedAt: string;
  returnedAt: string | null;
  originalCreditor?: string;
  chainOfTitle?: string;
  placementDate?: string | null;
  chargeOffDate?: string | null;
  chargeOffBalanceCents?: number;
  itemizationDate?: string | null;
  itemizationAmountCents?: number;
  paymentsSinceItemizationCents?: number;
  creditsSinceItemizationCents?: number;
  feesSinceItemizationCents?: number;
  lastPaymentDate?: string | null;
  solExpiresOn?: string | null;
  solCitation?: string;
  solNeedsCounselReview?: boolean;
  ssnCiphertext?: string | null;
  dobCiphertext?: string | null;
  accountNumberCiphertext?: string | null;
  ssnMasked?: string;
  validationMailedAt?: string | null;
  disputeDeadline?: string | null;
  validationNotice?: string | null;
  /** Removed before the account is stored or returned. */
  sensitive?: { ssn?: string; dob?: string; accountNumber?: string };
}

export type CollectionsRole = "admin" | "manager" | "collector" | "compliance" | "read_only";

export interface OperatorRole {
  email: string;
  role: CollectionsRole;
}

export interface CollectorTask {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  title: string;
  queue: "collector" | "compliance";
  status: "open" | "done";
  createdAt: string;
}

export interface DraftReply {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  inbound: string;
  classification: "dispute" | "cease" | "hardship" | "promise" | "bankruptcy" | "attorney" | "other";
  draft: string;
  status: "pending_approval" | "approved" | "rejected";
  gateAllowed: boolean;
  gateReason: string;
  createdAt: string;
}

export interface ConsumerPayment {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  amountCents: number;
  status: "succeeded";
  provider: "sandbox";
  providerId: string;
  at: string;
}

export interface ImportAudit {
  id: string;
  workspaceId: WorkspaceId;
  portfolioId: string;
  at: string;
  created: number;
  quarantined: number;
  skipped: number;
}

export interface PortalSession {
  tokenHash: string;
  workspaceId: WorkspaceId;
  accountId: string;
  expiresAt: string;
}

export interface ConsumerConsent {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  channel: "voice_cell" | "sms" | "email";
  source: string;
  at: string;
}

export interface DncEntry {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  phoneLast4: string;
  reason: string;
  at: string;
}

export interface VoiceSettings {
  killSwitch: boolean;
  /** When true, inbound answering is also stopped. Default leaves inbound open. */
  blockInbound: boolean;
  dailyOutboundCap: number;
  maxDiscountPercent: number;
  maxPlanMonths: number;
  /** Demo-only. Not a live FCC Reassigned Numbers Database query. */
  rndSandboxClear: boolean;
}

export type CollectionChannel =
  | "voice_outbound"
  | "voice_inbound"
  | "sms"
  | "email"
  | "letter"
  | "voicemail_drop"
  | "portal_chat"
  | "payment_portal";

export interface ComplianceEvent {
  id: string;
  workspaceId: WorkspaceId;
  at: string;
  channel: CollectionChannel;
  accountId: string | null;
  allowed: boolean;
  reason: string;
}

export interface CollectionTemplate {
  id: string;
  channel: "letter" | "email" | "sms" | "voice" | "voicemail" | "validation" | "chat";
  name: string;
  body: string;
  sourceFile: string | null;
  counselReviewed: boolean;
  limitedContent: boolean;
  loadedAt: string;
}

export type CallPhase = "greeting" | "identify" | "miranda" | "assist" | "payment" | "transfer" | "ended";

export interface CallTurn {
  role: "agent" | "consumer" | "system";
  text: string;
  at: string;
}

export interface QaFlag {
  code: "threat" | "false_statement" | "third_party_disclosure" | "card_in_transcript" | "missing_ai_disclosure" | "missing_miranda";
  detail: string;
}

export interface CallTranscript {
  phase: CallPhase;
  aiDisclosed: boolean;
  recordingAnnounced: boolean;
  recordingConsent: boolean | null;
  debtDisclosed: boolean;
  verified: boolean;
  turns: CallTurn[];
}

export interface VoiceCall {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string | null;
  direction: "inbound" | "outbound";
  phase: CallPhase;
  disposition: string | null;
  summary: string;
  summarySource: "rules";
  qaFlags: QaFlag[];
  transcriptCiphertext: string;
  campaignId: string;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
  provider: string;
  providerId: string | null;
  transferred: boolean;
}

export interface ChannelMessage {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  channel: CollectionChannel;
  status: "sandbox_queued" | "blocked";
  reason: string | null;
  templateId: string | null;
  provider: string;
  providerId: string | null;
  at: string;
}

export interface GateDecision {
  allowed: boolean;
  reason: string;
  citation: string;
  needsCounselReview: boolean;
}
