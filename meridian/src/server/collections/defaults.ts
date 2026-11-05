import { mergeEligibilitySeed } from "@/lib/collections/eligibility";
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
