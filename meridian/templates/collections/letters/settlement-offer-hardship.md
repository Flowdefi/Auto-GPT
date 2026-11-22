---
id: "LTR-013"
title: "Hardship Settlement / Hardship Plan Offer"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Offer after consumer reports hardship (job loss, medical, disability, fixed income, disaster). Uses the matrix hardship tier."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "furnishes_credit", "hardship_lump_sum", "hardship_plan", "hardship_review_date", "letter_date", "offer_expiration_date", "original_creditor", "plan_first_payment_date", "plan_frequency", "plan_number_of_payments", "plan_payment_amount", "portal_url", "settlement_amount", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone", "non-renewal language"]
send_rules: ["Only after hardship_reported = true; do not request medical records", "Hardship info is used only to evaluate the offer; never disclosed to third parties"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "15 U.S.C. 1692c (communication in connection with debt collection)", "Evory v. RJM Acquisitions Funding LLC, 505 F.3d 769 (7th Cir. 2007) (settlement-offer safe-harbor language)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Hardship Settlement / Hardship Plan Offer

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

Thank you for telling us about your circumstances. Based on our conversation on {{hardship_review_date}}, we can offer the following hardship option for the account referenced above:

{{#hardship_lump_sum}}
- **Reduced payoff:** ${{settlement_amount}} paid by {{offer_expiration_date}}.
{{/hardship_lump_sum}}
{{#hardship_plan}}
- **Hardship plan:** ${{plan_payment_amount}} {{plan_frequency}} for {{plan_number_of_payments}} payments, starting {{plan_first_payment_date}}, for a reduced total of ${{settlement_amount}}.
{{/hardship_plan}}

If your situation changes, contact us at {{agency_phone}} and we will review your options again. You are not required to give us medical records or other private documents to receive this offer.

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
