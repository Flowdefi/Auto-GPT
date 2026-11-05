import type {
  ChannelMessage,
  CollectionTemplate,
  TemplateApproval,
  ComplianceEvent,
  ConsumerConsent,
  DncEntry,
  PortfolioAccount,
  StateEligibility,
  VoiceCall,
  VoiceSettings,
  VoiceLimits,
  CollectorTask,
  DraftReply,
  ConsumerPayment,
  ImportAudit,
  OperatorRole,
  PortalSession,
  ClientGrant,
} from "@/lib/collections/types";
import type { Complaint } from "@/lib/collections/complaints";
import type { CollectionJob, CollectionSequence } from "@/lib/collections/jobs";
import type { RecordingRule } from "@/lib/collections/recording";
import type { SolRule } from "@/lib/collections/sol";
import type { AgencyBrand } from "@/lib/brand";
import type { AgentPresence, ComplianceDigest, DialAttempt, DialCampaign, MailJob, TrainingPass } from "@/lib/collections/desk";
import type { PortfolioBook, ScrubEvent, SettlementCase, TabletopRun } from "@/lib/collections/launch";
import type { Metro2Signoff } from "@/lib/collections/metro2";
import type { SettlementMatrix } from "@/lib/collections/template-library";

export type WorkspaceId = "triton" | "aether";

export interface EmailList {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  description: string;
  kind: "buyers" | "sellers" | "test" | "custom";
}

export interface EmailListMember {
  id: string;
  listId: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  contactId?: string;
  seedLocked: boolean;
  subscribed: boolean;
}

export interface EmailTemplate {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export interface BulkCampaign {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  listId: string;
  templateId?: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  status: "draft" | "queued" | "sending" | "sent" | "failed" | "cancelled";
  createdAt: string;
  sentAt?: string;
  intended: number;
  delivered: number;
  skipped: number;
  failed: number;
  unsubscribed: number;
}

export interface OutboundMessage {
  id: string;
  campaignId: string;
  workspaceId: WorkspaceId;
  to: string;
  subject: string;
  status: "queued" | "sent" | "delivered" | "failed" | "suppressed" | "skipped_seed";
  provider?: string;
  providerId?: string;
  error?: string;
  unsubscribeToken: string;
  sentAt?: string;
  opened?: number;
  clicked?: number;
}

export interface MailEvent {
  id: string;
  messageId: string;
  type: "open" | "click" | "bounce" | "complaint";
  at: string;
  url?: string;
}

export type SuppressionReason =
  | "unsubscribe"
  | "bounce"
  | "complaint"
  | "manual"
  | "do_not_email"
  | "invalid_email";

export interface Suppression {
  id: string;
  workspaceId: WorkspaceId;
  email: string;
  reason: SuppressionReason;
  at: string;
}

export interface GraphNode {
  id: string;
  workspaceId: WorkspaceId;
  kind: string;
  refId: string;
  label: string;
  text: string;
}

export interface GraphEdge {
  id: string;
  workspaceId: WorkspaceId;
  src: string;
  dst: string;
  rel: string;
  weight: number;
}

export interface RagChunk {
  id: string;
  workspaceId: WorkspaceId;
  nodeId: string;
  title: string;
  text: string;
  terms: string[];
}

export type LeadStatus =
  | "new"
  | "working"
  | "mql"
  | "routed"
  | "accepted"
  | "sql"
  | "nurture"
  | "rejected"
  | "converted";

export type LeadSide = "buyer" | "seller" | "partner" | "unknown";

export interface CrmCompany {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  domain: string;
  type: string;
  industry: string;
  city: string;
  state: string;
  employees: string;
  ownerId: string;
  lifecycle: string;
  score: number;
  notes: string;
  companyType?: string;
  debtRoles?: string[];
  targetAccount?: boolean;
  website?: string;
  linkedin?: string;
  phone?: string;
  description?: string;
  additionalPreferences?: string;
  street?: string;
  zip?: string;
  country?: string;
  yearFounded?: string;
  leadStatus?: string;
  ownerName?: string;
  closeDate?: string | null;
  hubspotRecordId?: string;
  contactCount?: number;
  enrichedAt?: string;
  enrichment?: Record<string, unknown>;
  createdAt: string;
}

export interface CrmContact {
  id: string;
  workspaceId: WorkspaceId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
  ownerId: string;
  lifecycle: string;
  score: number;
  city: string;
  state: string;
  tags: string[];
  lastActivityAt: string;
  mobile?: string;
  website?: string;
  street?: string;
  zip?: string;
  country?: string;
  linkedin?: string;
  leadType?: string;
  stage?: string;
  leadSource?: string;
  ownerName?: string;
  assetClassPreference?: string[];
  budget?: string;
  paperAgePreference?: string;
  coverage?: string;
  buyingStates?: string[];
  collectOrLitigate?: string;
  ndaSigned?: string | null;
  closedDeal?: boolean | string | null;
  deskReplied?: boolean;
  emailStatus?: string;
  doNotEmail?: boolean;
  hubspotRecordId?: string;
  messageSummary?: string;
  notes?: string;
  source?: string;
  removalReason?: string;
  prospectSegment?: string;
  sizeSignal?: string;
  enrichedAt?: string;
  enrichment?: Record<string, unknown>;
  createdAt: string;
}

export interface Lead {
  id: string;
  workspaceId: WorkspaceId;
  contactId: string;
  companyId: string;
  side: LeadSide;
  status: LeadStatus;
  source: string;
  campaign?: string;
  fitScore: number;
  intentScore: number;
  score: number;
  band: "hot" | "warm" | "nurture";
  ownerId?: string;
  routedAt?: string;
  assignmentRule?: string;
  acceptedAt?: string;
  rejectedReason?: string;
  firstTouchAt?: string;
  slaDueAt?: string;
  slaBreached: boolean;
  convertedDealId?: string;
  notes: string;
  payload: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  workspaceId: WorkspaceId;
  formId: string;
  pageUrl: string;
  fields: Record<string, string>;
  ip?: string;
  userAgent?: string;
  leadId?: string;
  status: "accepted" | "spam" | "duplicate" | "error";
  reason?: string;
  at: string;
}

export interface InboxMessage {
  id: string;
  workspaceId: WorkspaceId;
  providerId: string;
  mailbox: string;
  direction: "inbound" | "outbound";
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  subject: string;
  preview: string;
  body: string;
  conversationId: string;
  receivedAt: string;
  contactId?: string;
  companyId?: string;
  matchedBy?: "email" | "domain" | "none";
  hasAttachments: boolean;
}

export interface MailboxSyncState {
  mailbox: string;
  deltaLink?: string;
  lastSyncAt?: string;
  lastError?: string;
  messageCount: number;
}

export interface AutomationWorkflow {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    event:
      | "lead.created"
      | "lead.status_changed"
      | "lead.score_changed"
      | "email.received"
      | "form.submitted"
      | "deal.stage_changed"
      | "sla.breached";
    filters?: Array<{ field: string; op: "eq" | "neq" | "gte" | "lte" | "contains"; value: string | number }>;
  };
  actions: Array<{
    type:
      | "set_status"
      | "set_owner"
      | "score"
      | "create_task"
      | "enroll_sequence"
      | "send_internal_alert"
      | "add_to_list"
      | "enrich"
      | "create_deal"
      | "log_activity";
    params: Record<string, string | number>;
  }>;
  runCount: number;
  lastRunAt?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workspaceId: WorkspaceId;
  subjectType: "lead" | "contact" | "deal" | "message";
  subjectId: string;
  event: string;
  results: Array<{ action: string; ok: boolean; detail: string }>;
  at: string;
}

export interface CrmTask {
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  body: string;
  ownerId: string;
  dueAt: string;
  status: "open" | "done";
  leadId?: string;
  contactId?: string;
  dealId?: string;
  source: string;
  createdAt: string;
}

export interface SeoCrawl {
  id: string;
  workspaceId: WorkspaceId;
  startUrl: string;
  host: string;
  status: "running" | "complete" | "failed";
  pagesCrawled: number;
  maxPages: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  health: number;
  robotsFound: boolean;
  sitemapFound: boolean;
  sitemapUrls: number;
}

export interface SeoPage {
  id: string;
  crawlId: string;
  workspaceId: WorkspaceId;
  url: string;
  status: number;
  depth: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaLength: number;
  h1: string[];
  h2Count: number;
  wordCount: number;
  readability: number;
  canonical: string;
  robots: string;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesMissingAlt: number;
  hasSchema: boolean;
  schemaTypes: string[];
  hasOpenGraph: boolean;
  responseMs: number;
  bytes: number;
  contentHash: string;
  pageRank: number;
  topTerms: Array<{ term: string; count: number }>;
}

export interface SeoIssue {
  id: string;
  crawlId: string;
  workspaceId: WorkspaceId;
  url: string;
  code: string;
  category: "crawlability" | "content" | "meta" | "performance" | "structure" | "links" | "schema";
  severity: "error" | "warning" | "notice";
  weight: number;
  title: string;
  detail: string;
  recommendation: string;
}

export interface SeoKeywordRow {
  id: string;
  workspaceId: WorkspaceId;
  term: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  volume: number;
  difficulty: number;
  cpc: number;
  source: "corpus" | "crawl" | "manual" | "provider";
  parentTopic?: string;
  serpFeatures: string[];
  tracked: boolean;
  targetUrl?: string;
  createdAt: string;
}

export interface SeoRankPoint {
  id: string;
  workspaceId: WorkspaceId;
  keywordId: string;
  device: "desktop" | "mobile";
  position: number | null;
  url?: string;
  provider: string;
  at: string;
}

export interface SeoBrief {
  id: string;
  workspaceId: WorkspaceId;
  keyword: string;
  targetUrl?: string;
  title: string;
  metaDescription: string;
  outline: Array<{ heading: string; points: string[] }>;
  mustCover: string[];
  questions: string[];
  internalLinks: string[];
  wordTarget: number;
  createdAt: string;
}

export interface Segment {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  description: string;
  rules: Array<{ field: string; op: "eq" | "neq" | "contains" | "gte" | "lte" | "exists"; value: string }>;
  match: "all" | "any";
  createdAt: string;
}

export interface AiAuditEntry {
  id: string;
  workspaceId: WorkspaceId;
  actor: "cto";
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  summary: string;
  at: string;
}

export interface DatabaseFile {
  version: 1;
  lists: EmailList[];
  members: EmailListMember[];
  templates: EmailTemplate[];
  campaigns: BulkCampaign[];
  messages: OutboundMessage[];
  suppressions: Suppression[];
  events: MailEvent[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  chunks: RagChunk[];
  companies: CrmCompany[];
  contacts: CrmContact[];
  leads: Lead[];
  submissions: FormSubmission[];
  inbox: InboxMessage[];
  mailboxes: MailboxSyncState[];
  workflows: AutomationWorkflow[];
  runs: WorkflowRun[];
  tasks: CrmTask[];
  crawls: SeoCrawl[];
  seoPages: SeoPage[];
  seoIssues: SeoIssue[];
  keywords: SeoKeywordRow[];
  ranks: SeoRankPoint[];
  briefs: SeoBrief[];
  segments: Segment[];
  aiAudit: AiAuditEntry[];
  /** Workspaces whose demo CRM rows were purged and must not be reseeded. */
  demoPurgedWorkspaces?: WorkspaceId[];
  stateEligibility?: StateEligibility[];
  portfolioAccounts?: PortfolioAccount[];
  consents?: ConsumerConsent[];
  dncEntries?: DncEntry[];
  voiceCalls?: VoiceCall[];
  channelMessages?: ChannelMessage[];
  complianceEvents?: ComplianceEvent[];
  collectionTemplates?: CollectionTemplate[];
  /** Per-agency send approval and counsel sign-off. The legacy flags on each template remain the Triton copy. */
  templateApprovals?: Partial<Record<WorkspaceId, Record<string, TemplateApproval>>>;
  settlementMatrix?: SettlementMatrix;
  /** Per-agency settlement authority. The legacy field remains the Triton copy. */
  settlementMatrices?: Partial<Record<WorkspaceId, SettlementMatrix>>;
  voiceSettings?: VoiceSettings;
  /** Per-agency cap, inbound block, discount, and plan length. The legacy voice settings remain the Triton copy. */
  voiceLimitsByWorkspace?: Partial<Record<WorkspaceId, VoiceLimits>>;
  collectorTasks?: CollectorTask[];
  draftReplies?: DraftReply[];
  consumerPayments?: ConsumerPayment[];
  importAudits?: ImportAudit[];
  operatorRoles?: OperatorRole[];
  portalSessions?: PortalSession[];
  jobs?: CollectionJob[];
  sequences?: CollectionSequence[];
  solRules?: SolRule[];
  /** Per-agency limitations. The legacy field remains the Triton copy. */
  solTables?: Partial<Record<WorkspaceId, SolRule[]>>;
  agencyBrand?: AgencyBrand;
  /** Per-agency brand. The legacy field remains the Triton copy used by the public site. */
  agencyBrands?: Partial<Record<WorkspaceId, AgencyBrand>>;
  agentPresence?: AgentPresence[];
  dialCampaigns?: DialCampaign[];
  dialAttempts?: DialAttempt[];
  mailJobs?: MailJob[];
  trainingPasses?: TrainingPass[];
  complianceDigests?: ComplianceDigest[];
  portfolioBooks?: PortfolioBook[];
  scrubEvents?: ScrubEvent[];
  settlementCases?: SettlementCase[];
  frozenWorkspaces?: WorkspaceId[];
  /** Per-agency sandbox clear for the reassigned-number check. Absent means Triton uses the legacy voice setting and Aether stays unknown. */
  rndSandboxClearByWorkspace?: Partial<Record<WorkspaceId, boolean>>;
  tabletopRuns?: TabletopRun[];
  clientGrants?: ClientGrant[];
  complaints?: Complaint[];
  recordingRules?: RecordingRule[];
  /** Per-agency recording consent. The legacy field remains the Triton copy. */
  recordingTables?: Partial<Record<WorkspaceId, RecordingRule[]>>;
  metro2Approval?: Metro2Signoff;
  /** Per-agency Metro 2 sign-off. The legacy field remains the Triton copy. */
  metro2Approvals?: Partial<Record<WorkspaceId, Metro2Signoff>>;
}

export function emptyDb(): DatabaseFile {
  return {
    version: 1,
    lists: [],
    members: [],
    templates: [],
    campaigns: [],
    messages: [],
    suppressions: [],
    events: [],
    nodes: [],
    edges: [],
    chunks: [],
    companies: [],
    contacts: [],
    leads: [],
    submissions: [],
    inbox: [],
    mailboxes: [],
    workflows: [],
    runs: [],
    tasks: [],
    crawls: [],
    seoPages: [],
    seoIssues: [],
    keywords: [],
    ranks: [],
    briefs: [],
    segments: [],
    aiAudit: [],
    demoPurgedWorkspaces: [],
    stateEligibility: [],
    portfolioAccounts: [],
    consents: [],
    dncEntries: [],
    voiceCalls: [],
    channelMessages: [],
    complianceEvents: [],
    collectionTemplates: [],
    collectorTasks: [],
    draftReplies: [],
    consumerPayments: [],
    importAudits: [],
    operatorRoles: [],
    portalSessions: [],
  };
}
