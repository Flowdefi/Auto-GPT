---
id: "LTR-050"
title: "Cease-Communication Acknowledgment"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "The ONE permitted response after a written cease/refusal-to-pay request: confirms further efforts are terminated. Optional sentences only if true."
merge_fields: ["account_last4", "account_ref", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "cease_optional_remedy_statement", "cease_received_date", "consumer_mailing_address", "consumer_name", "current_creditor", "letter_date", "original_creditor"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Stop ALL outbound channels immediately on receipt (letter, phone, SMS, email, voice AI)", "Send at most this one letter; it must contain only 1006.6(c)(2) content", "Options in 1006.6(c)(2)(ii)-(iii) may be included only if the remedy is one the owner/creditor ordinarily invokes and actually intends; counsel sign-off"]
legal_citations: ["15 U.S.C. 1692c(c) (ceasing communication)", "12 CFR 1006.6(c) (cease communication; permitted exceptions)", "15 U.S.C. 1692e (false or misleading representations)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Cease-Communication Acknowledgment

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

We received your request on {{cease_received_date}} that we stop communicating with you about the account referenced above. We have done so. This letter confirms that our collection efforts on this account have ended.

{{#cease_optional_remedy_statement}}
{{cease_optional_remedy_statement}}
{{/cease_optional_remedy_statement}}

Sincerely,
{{agency_name}}

This communication is from a debt collector.
