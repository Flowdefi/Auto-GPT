---
id: "LTR-042"
title: "Dispute Resolved in Consumer's Favor / Account Closed"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Tells the consumer the dispute was resolved in their favor (or the debt could not be verified) and collection has ended."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "dispute_outcome_statement", "dispute_received_date", "furnishes_credit", "letter_date", "original_creditor", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Close account; delete or correct any furnished tradeline; flag no-sale (1006.30(b) for ID theft)"]
legal_citations: ["15 U.S.C. 1692g(b) (disputed debts; no overshadowing)", "Tex. Fin. Code 392.202 (dispute of file accuracy; 30-day written response)", "Tex. Fin. Code 392.308 (identity theft victims; cease within 7 business days)", "15 U.S.C. 1681s-2 (furnisher accuracy and dispute duties)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Dispute Resolved in Consumer's Favor / Account Closed

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

We have finished reviewing your dispute received on {{dispute_received_date}}. {{dispute_outcome_statement}}

We have stopped all collection on this account. {{#furnishes_credit}}We have asked the credit reporting agencies we report to to delete this account from your credit file.{{/furnishes_credit}} We have notified {{current_creditor}}.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
