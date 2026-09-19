import type {
  Activity,
  Campaign,
  CmsPage,
  Company,
  Contact,
  Conversation,
  Deal,
  FormRecord,
  InventoryItem,
  MarketingEmail,
  Meeting,
  Quote,
  Report,
  Segment,
  SeoAuditItem,
  SeoKeyword,
  Sequence,
  Task,
  Ticket,
  User,
  Workflow,
  WorkspaceData,
} from "../types";

export function emptyData(): WorkspaceData {
  return {
    users: [],
    companies: [],
    contacts: [],
    inventory: [],
    deals: [],
    activities: [],
    tasks: [],
    tickets: [],
    conversations: [],
    campaigns: [],
    emails: [],
    segments: [],
    forms: [],
    sequences: [],
    pages: [],
    keywords: [],
    audits: [],
    workflows: [],
    reports: [],
    quotes: [],
    meetings: [],
    aiMessages: [],
  };
}

export function user(
  id: string,
  name: string,
  role: string,
  email: string,
  initials: string,
): User {
  return { id, name, role, email, initials };
}

export function company(partial: Company): Company {
  return partial;
}

export function contact(partial: Contact): Contact {
  return partial;
}

export function inventory(partial: InventoryItem): InventoryItem {
  return partial;
}

export function deal(partial: Deal): Deal {
  return partial;
}

export function activity(partial: Activity): Activity {
  return partial;
}

export function task(partial: Task): Task {
  return partial;
}

export function ticket(partial: Ticket): Ticket {
  return partial;
}

export function conversation(partial: Conversation): Conversation {
  return partial;
}

export function campaign(partial: Campaign): Campaign {
  return partial;
}

export function email(partial: MarketingEmail): MarketingEmail {
  return partial;
}

export function segment(partial: Segment): Segment {
  return partial;
}

export function form(partial: FormRecord): FormRecord {
  return partial;
}

export function sequence(partial: Sequence): Sequence {
  return partial;
}

export function page(partial: CmsPage): CmsPage {
  return partial;
}

export function keyword(partial: SeoKeyword): SeoKeyword {
  return partial;
}

export function audit(partial: SeoAuditItem): SeoAuditItem {
  return partial;
}

export function workflow(partial: Workflow): Workflow {
  return partial;
}

export function report(partial: Report): Report {
  return partial;
}

export function quote(partial: Quote): Quote {
  return partial;
}

export function meeting(partial: Meeting): Meeting {
  return partial;
}
