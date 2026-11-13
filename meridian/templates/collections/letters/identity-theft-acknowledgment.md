---
id: "LTR-073"
title: "Identity Theft Claim Acknowledgment"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Acknowledges an identity-theft dispute; stops collection; requests (but does not require) an identity theft report."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "dispute_received_date", "letter_date", "original_creditor", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Texas: on receipt of court order or notice per 392.308, cease within 7 business days, notify prior report recipients, no sale/transfer", "All states: no sale/transfer of debt the collector knows is the subject of an ID-theft report (1006.30(b))", "Honor FCRA 605B blocks"]
legal_citations: ["Tex. Fin. Code 392.308 (identity theft victims; cease within 7 business days)", "12 CFR 1006.30(b) (prohibited sale/transfer: paid, settled, bankruptcy-discharged, ID theft)", "15 U.S.C. 1681c-2 (FCRA 605B identity-theft block)", "15 U.S.C. 1692g(b) (disputed debts; no overshadowing)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Identity Theft Claim Acknowledgment

**Requires counsel review before use.**

{{agency_name}}
{{agency_mailing_address}}
{{agency_phone}} | {{agency_hours}}
{{agency_website}}

{{letter_date}}

{{consumer_name}}
{{consumer_mailing_address}}

Reference number: {{account_ref}}
Original creditor: {{original_creditor}}
Current creditor: {{current_creditor}}
Account ending in: {{account_last4}}

Dear {{consumer_name}},

We received your notice on {{dispute_received_date}} that the account referenced above may be the result of identity theft. We have stopped collection on this account while we investigate.

If you have not already done so, you can help us by sending a copy of any of the following (none is required to start our review):
- An FTC Identity Theft Report (IdentityTheft.gov)
- A police report
- A court order declaring you a victim of identity theft

Please do not send your full Social Security number. We will write to you with the results of our review.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
