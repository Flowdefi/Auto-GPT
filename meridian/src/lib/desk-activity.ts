import { DESK_ACTIVITY_TYPES, type DeskActivityType } from "@/server/models";

export function isDeskActivityType(value: string): value is DeskActivityType {
  return (DESK_ACTIVITY_TYPES as readonly string[]).includes(value);
}

export function activityLabel(type: DeskActivityType): string {
  switch (type) {
    case "inbound_inquiry":
      return "Inbound inquiry";
    case "draft_created":
      return "Draft";
    case "reply_sent":
      return "Reply sent";
    case "nda_sent":
      return "NDA sent";
    case "nda_signed":
      return "NDA signed";
    case "file_shared":
      return "File shared";
    case "call":
      return "Call";
    case "note":
      return "Note";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
