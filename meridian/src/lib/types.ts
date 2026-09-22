export type WorkspaceId = "triton" | "aether";

export type HubId =
  | "home"
  | "crm"
  | "conversations"
  | "sales"
  | "marketing"
  | "service"
  | "content"
  | "seo"
  | "automation"
  | "reporting"
  | "ai"
  | "marketplace"
  | "compliance";

export type Lifecycle =
  | "subscriber"
  | "lead"
  | "mql"
  | "sql"
  | "opportunity"
  | "customer"
  | "evangelist";

export type ActivityType =
  | "note"
  | "email"
  | "call"
  | "meeting"
  | "task"
  | "sms"
  | "ai"
  | "system";

export type TicketStatus = "new" | "waiting" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type CampaignStatus = "draft" | "scheduled" | "running" | "completed" | "paused";
export type PageStatus = "draft" | "review" | "published";
export type WorkflowStatus = "active" | "paused" | "draft";

export interface WorkspaceTheme {
  accent: string;
  accentSoft: string;
  accentText: string;
  accentTextDark: string;
  mark: string;
  hero: string;
}

export interface WorkspaceConfig {
  id: WorkspaceId;
  name: string;
  legalName: string;
  product: string;
  domain: string;
  email: string;
  phone: string;
  city: string;
  industry: string;
  tagline: string;
  theme: WorkspaceTheme;
  dealNoun: string;
  dealNounPlural: string;
  inventoryNoun: string;
  inventoryNounPlural: string;
  pipeline: string[];
  inventoryKinds: string[];
  complianceBadges: string[];
}

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  type: "seller" | "buyer" | "partner" | "issuer" | "exchange" | "fund" | "market_maker";
  industry: string;
  city: string;
  state: string;
  employees: string;
  ownerId: string;
  lifecycle: Lifecycle;
  score: number;
  notes: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
  ownerId: string;
  lifecycle: Lifecycle;
  score: number;
  city: string;
  state: string;
  lastActivityAt: string;
  tags: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: string;
  sellerCompanyId: string;
  faceValue: number;
  askingPrice: number;
  accountCount: number;
  avgBalance: number;
  vintage: string;
  states: string[];
  mediaQuality: "poor" | "fair" | "good" | "excellent";
  scoreBand: string;
  status: "intake" | "listed" | "in_market" | "awarded" | "closed";
  notes: string;
}

export interface Deal {
  id: string;
  name: string;
  companyId: string;
  contactId: string;
  inventoryId?: string;
  ownerId: string;
  stage: string;
  amount: number;
  closeDate: string;
  probability: number;
  forecast: "omit" | "pipeline" | "best_case" | "commit" | "closed";
  nextStep: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  body: string;
  at: string;
  userId: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  ticketId?: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  status: "open" | "completed";
  priority: TicketPriority;
  ownerId: string;
  contactId?: string;
  dealId?: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  companyId: string;
  ownerId: string;
  pipeline: string;
  createdAt: string;
  preview: string;
}

export interface Conversation {
  id: string;
  channel: "email" | "chat" | "sms" | "portal";
  subject: string;
  contactId: string;
  companyId: string;
  lastAt: string;
  unread: boolean;
  messages: Array<{
    id: string;
    from: "them" | "us" | "ai";
    body: string;
    at: string;
  }>;
}

export interface Campaign {
  id: string;
  name: string;
  type: "email" | "ads" | "social" | "event" | "sequence";
  status: CampaignStatus;
  audience: string;
  sent: number;
  opened: number;
  clicked: number;
  replies: number;
  ownerId: string;
}

export interface MarketingEmail {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  campaignId?: string;
  preview: string;
}

export interface Segment {
  id: string;
  name: string;
  count: number;
  definition: string;
}

export interface FormRecord {
  id: string;
  name: string;
  submissions: number;
  conversion: number;
  page: string;
}

export interface Sequence {
  id: string;
  name: string;
  steps: number;
  enrolled: number;
  replied: number;
  meetings: number;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  type: "website" | "landing" | "blog";
  status: PageStatus;
  views: number;
  updatedAt: string;
  excerpt: string;
}

export interface SeoKeyword {
  id: string;
  term: string;
  volume: number;
  position: number;
  difficulty: number;
  url: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

export interface SeoAuditItem {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  page: string;
  recommendation: string;
}

export interface Workflow {
  id: string;
  name: string;
  status: WorkflowStatus;
  trigger: string;
  enrolled: number;
  goal: string;
}

export interface Report {
  id: string;
  name: string;
  hub: HubId;
  insight: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  body: string;
  at: string;
  model?: string;
  tools?: string[];
  grounded?: string[];
}

export interface Quote {
  id: string;
  dealId: string;
  name: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "expired";
}

export interface Meeting {
  id: string;
  title: string;
  when: string;
  contactId: string;
  dealId?: string;
  location: string;
}

export interface WorkspaceData {
  users: User[];
  companies: Company[];
  contacts: Contact[];
  inventory: InventoryItem[];
  deals: Deal[];
  activities: Activity[];
  tasks: Task[];
  tickets: Ticket[];
  conversations: Conversation[];
  campaigns: Campaign[];
  emails: MarketingEmail[];
  segments: Segment[];
  forms: FormRecord[];
  sequences: Sequence[];
  pages: CmsPage[];
  keywords: SeoKeyword[];
  audits: SeoAuditItem[];
  workflows: Workflow[];
  reports: Report[];
  quotes: Quote[];
  meetings: Meeting[];
  aiMessages: AiMessage[];
}

export interface AppState {
  workspaceId: WorkspaceId;
  currentUserId: string;
  data: Record<WorkspaceId, WorkspaceData>;
}
