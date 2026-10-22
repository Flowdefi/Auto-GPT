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

export interface Suppression {
  id: string;
  workspaceId: WorkspaceId;
  email: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "manual";
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
  linkedinUrl?: string;
  notes?: string;
  lastActivityAt: string;
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
      | "sla.breached"
      | "portfolio.listed"
      | "portfolio.stale";
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
  subjectType: "lead" | "contact" | "deal" | "message" | "portfolio";
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
  portfolioId?: string;
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

export interface PortfolioHistoryEntry {
  id: string;
  at: string;
  field: string;
  from: string;
  to: string;
  actor: string;
}

export type PortfolioGeography = "national" | "state";

export interface Portfolio {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  sellerCompanyId?: string;
  sellerName: string;
  sellerPrice: number;
  faceValue: number;
  creditor: string;
  accountCount: number;
  chargeoffYear: string;
  notes: string;
  segments: string[];
  dateListed: string;
  dateLastWorked: string;
  debtType: string;
  geography: PortfolioGeography;
  states: string[];
  possibleBuyers: string;
  status: "intake" | "listed" | "in_market" | "awarded" | "closed";
  history: PortfolioHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type SocialChannel = "x" | "facebook" | "google_business" | "linkedin";

export interface SocialPost {
  id: string;
  workspaceId: WorkspaceId;
  packId: string;
  channel: SocialChannel;
  body: string;
  status: "draft" | "scheduled" | "posted";
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  workspaceId?: WorkspaceId;
  name: string;
  path: string;
  at: string;
  source: "first-party";
  forwarded: boolean;
  forwardError?: string;
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
  portfolios: Portfolio[];
  socialPosts: SocialPost[];
  analyticsEvents: AnalyticsEvent[];
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
    portfolios: [],
    socialPosts: [],
    analyticsEvents: [],
  };
}
