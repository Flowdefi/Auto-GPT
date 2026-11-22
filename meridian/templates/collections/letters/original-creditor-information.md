---
id: "LTR-043"
title: "Original Creditor Information Response"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Responds to a request for name and address of the original creditor (1692g(a)(5), 1006.38(c))."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "letter_date", "original_creditor", "original_creditor_address", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Collection paused until this is mailed when request was made in writing within the validation period"]
legal_citations: ["15 U.S.C. 1692g (validation of debts)", "12 CFR 1006.38 (disputes, overshadowing, original-creditor requests)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Original Creditor Information Response

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

You asked us for the name and address of the original creditor for the account referenced above. That information is:

{{original_creditor}}
{{original_creditor_address}}

If you have questions, contact us at {{agency_phone}}.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
