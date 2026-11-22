---
id: "LTR-003"
title: "Follow-up Letter 1 (friendly reminder)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Gentle reminder ~30 days after initial payment request with no response."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "letter_date", "original_creditor", "portal_url", "prior_letter_date", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone"]
send_rules: ["Minimum 21 days after prior letter (owner-configurable cadence)", "Same block conditions as LTR-002"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Follow-up Letter 1 (friendly reminder)

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

We wrote to you on {{prior_letter_date}} about the account referenced above. We have not heard from you, and we want to make sure you know your options.

The current balance is **${{current_balance}}**.

- Pay or set up a plan any time at {{portal_url}}.
- Call {{agency_phone}} ({{agency_hours}}) to talk with a representative.
- If something has changed in your situation, let us know. We may be able to offer a lower monthly payment or a reduced payoff.

If you have already sent a payment, thank you, and please disregard this letter.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
