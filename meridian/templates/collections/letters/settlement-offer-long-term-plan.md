---
id: "LTR-012"
title: "Settlement Offer: Long-Term Plan"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Smaller reduction spread over a longer schedule (e.g., 7-24 months)."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "furnishes_credit", "grace_days", "letter_date", "offer_expiration_date", "original_creditor", "plan_end_date", "plan_first_payment_date", "plan_frequency", "plan_number_of_payments", "plan_payment_amount", "portal_url", "settlement_amount", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone", "non-renewal language"]
send_rules: ["plan length within matrix max_long_term_months", "Show total paid over life of plan"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "Evory v. RJM Acquisitions Funding LLC, 505 F.3d 769 (7th Cir. 2007) (settlement-offer safe-harbor language)", "12 CFR 1005.10(b) (preauthorized electronic fund transfers: written authorization, copy to consumer)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Settlement Offer: Long-Term Plan

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

If a single payment is not possible, you can resolve the account referenced above over time at a reduced total.

| | |
|---|---|
| Current balance | ${{current_balance}} |
| Reduced total | ${{settlement_amount}} |
| Payment | ${{plan_payment_amount}} {{plan_frequency}} |
| Number of payments | {{plan_number_of_payments}} |
| First payment by | {{plan_first_payment_date}} |
| Last payment | {{plan_end_date}} |

To accept, schedule your first payment by {{offer_expiration_date}} at {{portal_url}} or call {{agency_phone}}. If you need to change a payment date during the plan, call us before the due date.

If a scheduled payment is not received within {{grace_days}} days of its due date, the reduced terms may end and the remaining balance (the original balance minus payments made) may be due. We will notify you in writing first.

**Important information about this offer**
- This offer is valid only if the agreed payment(s) are received by the date(s) shown. We are not obligated to renew this offer. We may be willing to discuss other options in the future.
- When the settlement is paid as agreed, we will consider the account settled in full and will send you written confirmation. {{#furnishes_credit}}We will update the account status with the credit reporting agencies we report to as settled for less than the full balance.{{/furnishes_credit}}
- Any amount forgiven may have tax consequences for you. We cannot give tax advice; you may wish to consult a tax professional.
- There is no fee to pay online, by phone, or by mail.
- You may still dispute the debt. Accepting or declining this offer does not affect your rights.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
