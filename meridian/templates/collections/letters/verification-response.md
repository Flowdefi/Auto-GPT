---
id: "LTR-041"
title: "Debt Verification Response"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Sends verification of the debt (or copy of judgment) after a dispute; collection may resume only after this is mailed."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "amount_on_itemization_date", "balance_itemization", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "dispute_received_date", "itemization_date", "itemization_date_basis", "letter_date", "original_creditor", "original_creditor_address", "portal_url", "state_disclosures", "verification_documents_list"]
required_disclosures: ["1006.18(e)(2)", "creditor name"]
send_rules: ["Attach verification documents listed in {{verification_documents_list}} with SSN/DOB/full account numbers redacted", "Collection may resume only after mailing (1692g(b))", "If dispute was 'not my debt' and documents do not tie to consumer, route to LTR-042 closure instead"]
legal_citations: ["15 U.S.C. 1692g(b) (disputed debts; no overshadowing)", "12 CFR 1006.38 (disputes, overshadowing, original-creditor requests)", "Tex. Fin. Code 392.202 (dispute of file accuracy; 30-day written response)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Debt Verification Response

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

You disputed the account referenced above on {{dispute_received_date}}. We have completed our review and are enclosing the following information:

{{verification_documents_list}}

**Summary**
- Original creditor: {{original_creditor}}{{#original_creditor_address}}, {{original_creditor_address}}{{/original_creditor_address}}
- Current creditor: {{current_creditor}}
- Itemization date: {{itemization_date}} ({{itemization_date_basis}})
- Balance on itemization date: ${{amount_on_itemization_date}}
- Current balance: ${{current_balance}}

{{balance_itemization}}

If you still believe this information is wrong, please write to us and include any documents that support your position. We will review any new information you send.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
