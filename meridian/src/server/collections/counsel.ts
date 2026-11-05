import type { WorkspaceId } from "@/lib/types";
import { syncCollectionTemplates, templateForWorkspace } from "./service";

export function counselPacket(workspaceId: WorkspaceId) {
  const templates = syncCollectionTemplates()
    .filter((item) => item.id)
    .map((item) => templateForWorkspace(workspaceId, item));
  return {
    workspaceId,
    notice: "Draft for counsel review. Not legal advice. A flag here means the desk will not treat the text as signed.",
    templatesNeedingCounsel: templates.filter((item) => item.needsCounselReview).length,
    templatesUnapproved: templates.filter((item) => !item.ownerApproved).length,
    items: [
      { area: "Limitations table", flag: "needs_counsel_review", note: "Each workspace has its own table. Cited rows for the no-license states and Texas stay flagged. Every other state is blank. Saving keeps the counsel flag." },
      { area: "Validation notice", flag: "needs_counsel_review", note: "The PDF follows Model Form B-1 section order. It is not the CFPB designed file." },
      { area: "Settlement matrix and desk", flag: "needs_counsel_review", note: "Packaged percents block offers until an owner saves them. Saving clears the default flag and keeps the counsel flag. Each workspace has its own matrix." },
      { area: "Templates, Spanish copy, and letters", flag: "needs_counsel_review", note: "Each workspace approves its own templates. Counsel review on one agency does not clear the flag on the other. Nothing sends until that workspace's owner approves the template." },
      { area: "Public agency site and privacy", flag: "needs_counsel_review", note: "The public site uses the Triton brand. Another workspace's brand does not change it. Copy is on collect.debtmarket.net only. Saving a brand is not counsel approval." },
      { area: "Recording consent, ACH authorization, complaint date", flag: "needs_counsel_review", note: "Each workspace has its own recording table. Saving keeps the counsel flag. The 15-day complaint date is operational, not a Reg F deadline." },
      { area: "Voice, SMS, and email time-barred hold", flag: "needs_counsel_review", note: "The spoken mini-Miranda is a draft of 15 U.S.C. § 1692e(11) and 12 CFR § 1006.18. If the limitations date on file is in the past, voice does not offer a plan or a payment page, and SMS, email, and letter payment or settlement asks stay held. The counsel-reviewed time-barred notices can still be sent. Those sentences are still drafts." },
      { area: "SCRA, bankruptcy, and deceased scrubs", flag: "needs_counsel_review", note: "Sandbox returns unknown. Unknown is not a clearance. A hit holds the account." },
      { area: "Safeguards pack and Metro 2", flag: "needs_counsel_review", note: "Each workspace needs its own owner and compliance approval. That approval does not clear this counsel flag, and the file is still not the CDIA guide." },
    ],
  };
}
