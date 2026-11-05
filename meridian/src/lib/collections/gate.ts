import { consumerTimeZone, withinCallingWindow } from "./time";
import type {
  AccountStatus,
  CollectionChannel,
  ConsumerConsent,
  DncEntry,
  GateDecision,
  PhoneType,
  PortfolioAccount,
  StateEligibility,
  VoiceSettings,
} from "./types";
import { eligibilityByCode } from "./eligibility";

export interface GateContext {
  now: Date;
  settings: VoiceSettings;
  eligibility: StateEligibility[];
  account: PortfolioAccount | null;
  consents: ConsumerConsent[];
  dnc: DncEntry[];
  /** Connected or placed outbound calls about this account in the last 7 days. */
  outboundCallsIn7Days: number;
  lastConversationAt: string | null;
  /** Result of the reassigned-numbers hook. Unknown blocks cell AI calls. */
  reassigned: "ok" | "reassigned" | "unknown";
  channel: CollectionChannel;
  /** Voicemail body, when channel is voicemail_drop. */
  voicemailBody?: string;
  campaignSentToday: number;
  /** When set, an acknowledgment for this exact status may pass the hold. */
  statusResponse?: AccountStatus | null;
}

const OUTBOUND = new Set<CollectionChannel>([
  "voice_outbound",
  "sms",
  "email",
  "letter",
  "voicemail_drop",
  "portal_chat",
]);

const CLOSED_STATUSES = new Set<PortfolioAccount["status"]>([
  "quarantined",
  "returned",
  "ceased",
  "disputed",
  "bankruptcy",
  "attorney",
  "deceased",
  "military",
]);

function block(reason: string, citation: string, needsCounselReview = false): GateDecision {
  return { allowed: false, reason, citation, needsCounselReview };
}

function allow(reason: string, citation: string, needsCounselReview = false): GateDecision {
  return { allowed: true, reason, citation, needsCounselReview };
}

function hasConsent(ctx: GateContext, channel: ConsumerConsent["channel"]): boolean {
  if (!ctx.account) return false;
  return ctx.consents.some((row) => row.accountId === ctx.account?.id && row.channel === channel);
}

const DEBT_WORDS = /\b(debt|owe|owing|balance|past due|collection|collector|delinquent|charged off)\b/i;

export function evaluateGate(ctx: GateContext): GateDecision {
  const { channel, settings, account } = ctx;

  if (settings.killSwitch && OUTBOUND.has(channel)) {
    return block("Outbound kill switch is on.", "Owner control. Inbound answering and a consumer-started payment stay available.");
  }
  if (settings.blockInbound && channel === "voice_inbound") {
    return block("Inbound voice is switched off.", "Owner control.");
  }
  if (OUTBOUND.has(channel) && ctx.campaignSentToday >= settings.dailyOutboundCap) {
    return block(`Daily outbound cap of ${settings.dailyOutboundCap} is reached.`, "Owner control.");
  }
  if (!account) {
    if (channel === "voice_inbound") {
      return allow("Inbound call can start identification. No debt may be disclosed until the person is verified.", "15 U.S.C. § 1692c(b).");
    }
    return block("No account is attached to this action.", "Internal control.");
  }

  const state = eligibilityByCode(ctx.eligibility, account.state);
  if (!state) {
    return block(
      `Consumer state ${account.state || "(blank)"} is not in the eligibility table.`,
      "Owner geographic policy. Eligibility is based on where the consumer lives.",
      true,
    );
  }
  if (!state.eligible || account.status === "quarantined") {
    return block(
      `Consumer lives in ${state.name}, which is not eligible for collection. The account is quarantined and cannot be worked, contacted, or sent to the payment portal.`,
      state.citation,
      state.needsCounselReview,
    );
  }
  if (account.status === "returned") {
    return block("Account was returned to the seller or placer.", "Owner geographic policy.");
  }
  if (CLOSED_STATUSES.has(account.status) && ctx.statusResponse !== account.status) {
    return block(
      `Account is marked ${account.status}. Outreach and the payment portal stay closed.`,
      "15 U.S.C. § 1692c(c) (cease); bankruptcy, counsel, SCRA, and dispute holds are owner policy pending counsel review.",
      true,
    );
  }

  if (channel === "payment_portal") {
    return allow(`Payment portal allowed for ${state.name}. Card data stays on the hosted processor.`, "PCI scope. No PAN is stored here.");
  }
  if (channel === "voice_inbound" || channel === "portal_chat") {
    return allow(`${channel === "voice_inbound" ? "Inbound voice" : "Portal chat"} may continue for an eligible workable account.`, state.citation, state.needsCounselReview);
  }

  if (ctx.dnc.some((row) => row.accountId === account.id)) {
    return block("Phone is on the internal do-not-call list.", "Internal DNC. TCPA do-not-call rules still need counsel review for the campaign type.", true);
  }

  if (channel === "voice_outbound" || channel === "voicemail_drop") {
    if (account.inconvenientWork) {
      return block(
        "Consumer said calls at work are inconvenient.",
        "12 CFR § 1006.6; 15 U.S.C. § 1692c(a)(3).",
      );
    }
    const zone = consumerTimeZone(account.state, account.zip);
    if ("error" in zone) return block(zone.error, "12 CFR § 1006.6. Local time is not guessed.", true);
    if (!withinCallingWindow(ctx.now, zone.zone)) {
      return block(
        `Outside 8:00 a.m.–9:00 p.m. in ${zone.zone}.`,
        "12 CFR § 1006.6. The 9:00 p.m. boundary is enforced as blocked at 9:00 p.m. local; counsel should confirm that reading.",
        true,
      );
    }
    if (ctx.outboundCallsIn7Days >= 7) {
      return block(
        "Seven telephone attempts already placed in the last seven days.",
        "12 CFR § 1006.14(b). Confirm the current subsection and any limited-content exclusion with counsel.",
        true,
      );
    }
    if (ctx.lastConversationAt) {
      const elapsed = ctx.now.getTime() - new Date(ctx.lastConversationAt).getTime();
      if (elapsed >= 0 && elapsed < 7 * 24 * 60 * 60 * 1000) {
        return block(
          "A telephone conversation about this debt happened within the last seven days.",
          "12 CFR § 1006.14(b). Confirm the current subsection with counsel.",
          true,
        );
      }
    }
  }

  if (channel === "voice_outbound" || channel === "voicemail_drop") {
    const phone: PhoneType = account.phoneType;
    if (phone !== "landline") {
      if (!hasConsent(ctx, "voice_cell")) {
        return block(
          "Outbound AI voice to a cell or unknown number needs prior express consent. FCC 24-17 treats an AI-generated voice as an artificial or prerecorded voice.",
          "47 U.S.C. § 227(b)(1)(A); FCC Declaratory Ruling FCC 24-17 (Feb. 2024).",
        );
      }
      if (ctx.reassigned === "reassigned") {
        return block("Reassigned-numbers scrub returned reassigned.", "TCPA reassigned-number risk. Use the FCC Reassigned Numbers Database in production.", true);
      }
      if (ctx.reassigned === "unknown") {
        return block(
          "Reassigned-numbers scrub is not configured, so the cell call is blocked.",
          "FCC Reassigned Numbers Database. A sandbox override exists and must not be treated as a live scrub.",
          true,
        );
      }
    }
  }

  if (channel === "voicemail_drop") {
    const body = ctx.voicemailBody ?? "";
    if (DEBT_WORDS.test(body) || body.trim().length === 0) {
      return block(
        "Voicemail drops are limited to a Reg F limited-content message and cannot mention the debt.",
        "12 CFR § 1006.2(j). Counsel must approve the script before a drop is enabled.",
        true,
      );
    }
  }

  if (channel === "sms" && !hasConsent(ctx, "sms")) {
    return block("SMS needs stored prior express consent.", "47 U.S.C. § 227. Confirm the campaign's consent standard with counsel.", true);
  }
  if (channel === "email" && !hasConsent(ctx, "email")) {
    return block(
      "Email needs stored consent and a Reg F electronic opt-out path.",
      "12 CFR § 1006.6(d); 12 CFR § 1006.42. Safe-harbor details need counsel review.",
      true,
    );
  }

  return allow(`Allowed on the current rules for ${state.name}.`, state.citation, state.needsCounselReview);
}
