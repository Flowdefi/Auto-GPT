import { mergeEligibilitySeed } from "@/lib/collections/eligibility";
import { solFor } from "@/lib/collections/sol";
import type { PortfolioAccount, VoiceSettings } from "@/lib/collections/types";
import type { DatabaseFile } from "@/server/models";
import { demoSeedEnabled } from "@/server/demo-seed";

export function defaultVoiceSettings(): VoiceSettings {
  return {
    killSwitch: true,
    blockInbound: false,
    dailyOutboundCap: 25,
    maxDiscountPercent: 20,
    maxPlanMonths: 12,
    rndSandboxClear: false,
  };
}

export function ensureCollectionDefaults(db: DatabaseFile): void {
  db.stateEligibility = mergeEligibilitySeed(db.stateEligibility ?? []);
  if (!Array.isArray(db.portfolioAccounts)) db.portfolioAccounts = [];
  if (!Array.isArray(db.consents)) db.consents = [];
  if (!Array.isArray(db.dncEntries)) db.dncEntries = [];
  if (!Array.isArray(db.voiceCalls)) db.voiceCalls = [];
  if (!Array.isArray(db.channelMessages)) db.channelMessages = [];
  if (!Array.isArray(db.complianceEvents)) db.complianceEvents = [];
  if (!Array.isArray(db.collectionTemplates)) db.collectionTemplates = [];
  if (!Array.isArray(db.collectorTasks)) db.collectorTasks = [];
  if (!Array.isArray(db.draftReplies)) db.draftReplies = [];
  if (!Array.isArray(db.consumerPayments)) db.consumerPayments = [];
  if (!Array.isArray(db.importAudits)) db.importAudits = [];
  if (!Array.isArray(db.operatorRoles)) db.operatorRoles = [];
  if (!Array.isArray(db.portalSessions)) db.portalSessions = [];
  db.voiceSettings = { ...defaultVoiceSettings(), ...db.voiceSettings };
  if (demoSeedEnabled() && db.portfolioAccounts.length === 0) {
    const now = new Date().toISOString();
    const samples: PortfolioAccount[] = [
      {
        id: "acct_demo_tx",
        workspaceId: "triton",
        portfolioId: "pf_demo",
        accountRef: "DEMO-TX-4242",
        consumerName: "Example Consumer",
        state: "TX",
        zip: "75201",
        last4: "4242",
        portalCode: "DEMO42",
        phoneType: "cell",
        phoneLast4: "0100",
        sellerName: "Sample Seller LLC",
        balanceCents: 100000,
        status: "workable",
        quarantineReason: null,
        inconvenientWork: false,
        importedAt: now,
        returnedAt: null,
        originalCreditor: "Example Bank",
        chainOfTitle: "Example Bank sold the account to Sample Seller LLC, which placed it here.",
        chargeOffDate: "2024-01-15",
        chargeOffBalanceCents: 100000,
        itemizationDate: "2024-01-15",
        itemizationAmountCents: 100000,
        paymentsSinceItemizationCents: 0,
        creditsSinceItemizationCents: 0,
        feesSinceItemizationCents: 0,
        lastPaymentDate: "2023-11-01",
        ssnMasked: "***-**-0001",
        ...solFor("TX", "2023-11-01", "2024-01-15"),
      },
      {
        id: "acct_demo_ca",
        workspaceId: "triton",
        portfolioId: "pf_demo",
        accountRef: "DEMO-CA-1111",
        consumerName: "Example Californian",
        state: "CA",
        zip: "90001",
        last4: "1111",
        portalCode: "DEMO11",
        phoneType: "cell",
        phoneLast4: "0199",
        sellerName: "Sample Seller LLC",
        balanceCents: 50000,
        status: "quarantined",
        quarantineReason: "Consumer lives in CA, which is not eligible for collection.",
        inconvenientWork: false,
        importedAt: now,
        returnedAt: null,
      },
    ];
    db.portfolioAccounts.push(...samples);
  }
}
