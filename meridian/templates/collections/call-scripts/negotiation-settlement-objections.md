---
id: "CALL-005"
title: "Negotiation, Settlement, and Objection Handling"
channel: "voice"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Branching script for payment negotiation within settlement-matrix.json authority, plus compliant responses to the most common objections."
merge_fields: ["agency_name", "agency_phone", "current_balance", "current_creditor", "dispute_portal_url", "legal_status_statement", "offer_expiration_date"]
required_disclosures: ["1006.18(e)(2) (already given in opener)"]
send_rules: []
legal_citations: ["15 U.S.C. 1692c (communication in connection with debt collection)", "15 U.S.C. 1692c(c) (ceasing communication)", "15 U.S.C. 1692d (harassment or abuse)", "15 U.S.C. 1692e (false or misleading representations)", "15 U.S.C. 1692f (unfair practices)", "15 U.S.C. 1692g(b) (disputed debts; no overshadowing)", "12 CFR 1006.6(b)(2) (consumer represented by attorney)", "12 CFR 1006.6(c) (cease communication; permitted exceptions)", "12 CFR 1006.26 (time-barred debt; no suits or threats of suit)", "11 U.S.C. 362 (automatic stay)", "FTC Statement of Policy re Collection of Decedents' Debts, 76 FR 44915 (July 27, 2011)", "50 U.S.C. 3937 (SCRA 6% interest cap)", "Tex. Fin. Code 392.301 (threats or coercion)", "Tex. Fin. Code 392.302 (harassment; abuse)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)", "Evory v. RJM Acquisitions Funding LLC, 505 F.3d 769 (7th Cir. 2007) (settlement-offer safe-harbor language)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Negotiation, Settlement, and Objection Handling

**Requires counsel review before use.**

**Negotiation ladder (authority comes from settlement-matrix.json for this account's tier; never exceed it)**
1. Ask: "Would you be able to take care of the full balance of ${{current_balance}}, or would a monthly plan work better?"
2. Plan: "What monthly amount fits your budget?" Accept any plan meeting `min_monthly_payment` and `max_plan_months`; otherwise escalate.
3. Settlement (only if tier allows): offer `opening_offer_pct` first; may move down in `step_down_pct` steps to `floor_pct`. Never below floor without human approval.
4. Confirm: amount, dates, method, settlement vs. full-pay; state that written confirmation will follow.
5. Deadlines: only state an expiration that the CRM has actually recorded. Say: "This offer is available until {{offer_expiration_date}}. We aren't obligated to renew it, but we may be able to discuss other options later." Never invent urgency.

**Objections**

| Consumer says | Respond | System action |
|---|---|---|
| "I can't pay." | "I understand. Can I ask what's changed? Even a small monthly amount can help, and if there's a hardship we have hardship options." Offer hardship tier. If still no: "That's okay. I'll note it. You can reach us whenever you're ready at {{agency_phone}}." | `HARDSHIP_DISCUSSED` / `NO_PAY_NOW`; no pressure, no repeated asks in the same call beyond 2 |
| "This isn't my debt." | "Thank you for telling me. I'll record that you dispute this debt. You can send details in writing or at {{dispute_portal_url}}. Once we get a written dispute we'll pause collection until we send you verification." If identity theft mentioned -> offer LTR-073 info. | `DISPUTE_ORAL`; LTR-040; if within validation period pause collection on written receipt |
| "I already paid." | "Thanks. Can you tell me roughly when and how you paid, and to whom? If you have a receipt or bank statement you can upload it at {{dispute_portal_url}}. I'll put this under review." | `DISPUTE_PAID`; open investigation; pause collection; ask original creditor for payment history |
| "I'm going through a hardship." | Listen. "I'm sorry to hear that. You don't need to share anything you're not comfortable with. Based on what you've told me, here's an option..." (hardship tier). Never ask for medical details. | `HARDSHIP`; LTR-013 |
| "Talk to my attorney." | "Understood. Can I have your attorney's name and phone number? We'll communicate with them from now on." End collection discussion. | `ATTORNEY_REP`; stop direct contact all channels; LTR-074 |
| "I filed bankruptcy." | "Thank you. Can you give me the case number, court, or your bankruptcy attorney's name? We'll stop collection right away." No further collection talk. | `BANKRUPTCY`; freeze all channels; LTR-070 |
| "Stop calling me." | "I'll stop calling you. Would you like to stop all contact, or only phone calls?" Honor what they say. If they want no contact, say: "If you send that in writing, we'll stop all communication." | Oral request: stop calls to that number / medium (1006.14(h)); written: full cease (1006.6(c)) + LTR-050 |
| "Don't call me at work." | "Understood, we won't call you at work." | Flag workplace number; 1006.6(b)(3) |
| "This is a bad time." | "No problem. When would be a better time?" | Record inconvenient time (1006.6(b)(1)) |
| "Are you going to sue me / ruin my credit?" | Read only the owner/counsel-approved factual statement in `{{legal_status_statement}}`. If time-barred: "Because of the age of this debt, {{current_creditor}} will not sue you for it." Never speculate. | `LEGAL_QUESTION`; escalate if pressed |
| "Are you a real person / a robot?" | "I'm an AI assistant for {{agency_name}}. I can transfer you to a person now if you'd like." | AI disclosure always truthful |
| Angry / abusive caller | Stay calm, lower pace. "I understand you're frustrated. I want to help. Would you like to continue now, or would you rather I have someone call at another time?" If abuse continues: "I'm going to end the call now. You can reach us at {{agency_phone}}." | `ESCALATE_ANGRY`; never argue, never match tone, never profanity |
| Consumer is deceased (caller says so) | "I'm very sorry for your loss. Could you tell me who is handling the estate? I won't discuss any details with you unless you're authorized for the estate." Do not say or imply relatives must pay. | `DECEASED_REPORTED`; suppress; FTC 2011 policy flow |
| "I'm in the military." | "Thank you for your service. I'll note that, and you may have protections under the Servicemembers Civil Relief Act. I'll pause collection while we review." | `SCRA_CLAIM`; LTR-072 |
| Requests Spanish / another language | Offer translated materials or interpreter if available; never continue in a language the consumer doesn't understand. | `LANG_PREF` |

**Never say** (see voice-ai-guardrails.json `banned_phrases`): threats of arrest, jail, wage garnishment, property seizure, lawsuits, or credit damage not actually intended and lawful; "final notice" when it isn't; that we are attorneys or that a lawyer has reviewed the file; that relatives must pay; that a payment will "fix your credit" or remove the account.
