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
  };
}
