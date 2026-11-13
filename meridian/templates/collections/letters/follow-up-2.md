---
id: "LTR-004"
title: "Follow-up Letter 2 (options outline)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Second follow-up summarizing plan and settlement availability; no urgency claims."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "letter_date", "min_plan_payment", "original_creditor", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone"]
send_rules: ["Minimum 30 days after LTR-003", "Settlement range shown only if within settlement-matrix authority for this account"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Follow-up Letter 2 (options outline)

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

Your account referenced above remains open with a balance of **${{current_balance}}**. We understand that money can be tight, so here are the ways we can work with you:

| Option | What it looks like |
|---|---|
| Monthly plan | Payments as low as ${{min_plan_payment}} per month, subject to review |
| Reduced lump-sum payoff | Contact us to see whether you qualify |
| Hardship review | Tell us about job loss, medical issues, or other hardship |

You can review your options privately at {{portal_url}} or call {{agency_phone}}.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
