---
id: "LTR-021"
title: "Paid-in-Full Confirmation"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Confirms the full balance has been paid; collection activity has ended."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "furnishes_credit", "letter_date", "original_creditor", "payment_amount", "payment_date", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name"]
send_rules: ["Send within 5 business days after final payment clears", "Trigger credit-reporting update (if furnishing) and 1006.30(b) no-sale flag"]
legal_citations: ["12 CFR 1006.30(b) (prohibited sale/transfer: paid, settled, bankruptcy-discharged, ID theft)", "15 U.S.C. 1681s-2 (furnisher accuracy and dispute duties)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Paid-in-Full Confirmation

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

Good news: the account referenced above has been **paid in full**. We received your final payment of ${{payment_amount}} on {{payment_date}}. The balance is now $0.00.

We have closed the account and will make no further collection efforts on it. {{#furnishes_credit}}We have asked the credit reporting agencies we report to to update the account as paid in full.{{/furnishes_credit}} {{current_creditor}} has been notified.

Please keep this letter for your records.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
