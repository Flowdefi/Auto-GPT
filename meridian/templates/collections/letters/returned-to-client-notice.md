---
id: "LTR-090"
title: "Account Returned to Creditor / No Longer Handled by Us"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Tells the consumer this office no longer handles the account (e.g., placement ended, account outside authorized states, recalled by client). States only facts; no implication of escalation."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "client_contact", "client_name", "consumer_mailing_address", "consumer_name", "current_creditor", "letter_date", "original_creditor", "portal_url", "post_return_payment_handling", "return_date", "returned_reason_statement", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Use returned_reason_statement from an owner-approved list; never imply legal action or a 'more aggressive' collector", "Out-of-scope state accounts: counsel to decide whether ANY letter is sent (default: no consumer letter; return quietly with report)", "Suppress all channels after send; set do-not-contact"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "12 CFR 1006.18 (false, deceptive, or misleading representations)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Account Returned to Creditor / No Longer Handled by Us

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

This letter is to let you know that, as of {{return_date}}, {{agency_name}} is no longer handling the account referenced above. {{returned_reason_statement}}

Please do not send further payments to us for this account. Any payment we receive after {{return_date}} will be {{post_return_payment_handling}}. For questions about the account going forward, contact {{client_name}} at {{client_contact}}.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
