---
id: "LTR-020"
title: "Settlement Accepted Confirmation"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Written confirmation of agreed settlement terms, sent within 2 business days of acceptance."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "agreement_date", "agreement_id", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "furnishes_credit", "letter_date", "original_creditor", "payment_schedule_summary", "portal_url", "settlement_amount", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone"]
send_rules: ["Must match recorded terms exactly; generated from the CRM agreement record"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Settlement Accepted Confirmation

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

This letter confirms the settlement you accepted on {{agreement_date}} for the account referenced above.

| | |
|---|---|
| Balance before settlement | ${{current_balance}} |
| Settlement total | ${{settlement_amount}} |
| Payment schedule | {{payment_schedule_summary}} |
| Agreement ID | {{agreement_id}} |

When all payments are received as scheduled, we will consider the account settled in full and send you a final confirmation letter. {{#furnishes_credit}}We will update credit reporting to reflect that the account was settled for less than the full balance.{{/furnishes_credit}}

Please keep this letter for your records. If anything here does not match your understanding, call us at {{agency_phone}}.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
