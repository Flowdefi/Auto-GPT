---
id: "LTR-005"
title: "Follow-up Letter 3 (last scheduled letter in default sequence)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Last scheduled letter in the default sequence. States ONLY true next steps configured by the owner (e.g., account may be returned to the creditor). No litigation, credit-reporting, or 'final notice' threats unless that action is actually intended and lawful (counsel sign-off)."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "letter_date", "next_step_statement", "original_creditor", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone"]
send_rules: ["{{next_step_statement}} must be selected from an owner-approved list of actions the agency actually intends and is legally permitted to take", "Never use for time-barred accounts with any litigation reference (1006.26(b))"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "15 U.S.C. 1692e(11) (mini-Miranda / debt collector disclosure)", "12 CFR 1006.26 (time-barred debt; no suits or threats of suit)", "Tex. Fin. Code 392.301 (threats or coercion)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Follow-up Letter 3 (last scheduled letter in default sequence)

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

This is our last scheduled letter about the account referenced above. The balance is **${{current_balance}}**.

{{next_step_statement}}

We would still like to help you resolve this account. Payment plans and, for some accounts, reduced payoffs are available. Visit {{portal_url}} or call {{agency_phone}} ({{agency_hours}}).

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
