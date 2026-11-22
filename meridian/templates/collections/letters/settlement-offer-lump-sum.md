---
id: "LTR-010"
title: "Settlement Offer: Lump Sum"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Single-payment reduced payoff within the account's settlement authority tier."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "furnishes_credit", "letter_date", "offer_expiration_date", "original_creditor", "portal_url", "settlement_amount", "settlement_percent", "settlement_savings", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone", "non-renewal safe-harbor language (Evory)"]
send_rules: ["settlement_amount must be >= settlement-matrix floor for the account tier", "offer_expiration_date must be real and honored; CRM logs offer and expiry", "Not sent during validation period unless counsel approves non-overshadowing layout"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "12 CFR 1006.18 (false, deceptive, or misleading representations)", "Evory v. RJM Acquisitions Funding LLC, 505 F.3d 769 (7th Cir. 2007) (settlement-offer safe-harbor language)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)", "12 CFR 1006.38 (disputes, overshadowing, original-creditor requests)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Settlement Offer: Lump Sum

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

We are able to offer you a way to resolve the account referenced above for less than the full balance.

| | |
|---|---|
| Current balance | ${{current_balance}} |
| **Settlement amount** | **${{settlement_amount}}** ({{settlement_percent}}% of balance) |
| You save | ${{settlement_savings}} |
| Payment due by | {{offer_expiration_date}} |

**How to accept:** pay ${{settlement_amount}} by {{offer_expiration_date}} at {{portal_url}}, by phone at {{agency_phone}}, or by check payable to {{agency_name}} (include reference {{account_ref}}).

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
