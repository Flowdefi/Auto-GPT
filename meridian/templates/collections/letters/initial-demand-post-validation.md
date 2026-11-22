---
id: "LTR-002"
title: "Initial Payment Request (after validation period)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "First stand-alone payment request. Send only AFTER validation_end_date has passed with no open dispute or original-creditor request."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "letter_date", "original_creditor", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2) subsequent-communication disclosure", "creditor name (Tex. Fin. Code 392.304(a)(4))", "address/phone (392.304(a)(6))"]
send_rules: ["Block if today <= validation_end_date (prevents overshadowing, 1006.38(b))", "Block if account has open dispute, cease, attorney rep, bankruptcy, deceased, SCRA-unverified, or out-of-scope state flag", "No deadline language unless an actual offer with an actual expiration is attached"]
legal_citations: ["15 U.S.C. 1692e (false or misleading representations)", "15 U.S.C. 1692e(11) (mini-Miranda / debt collector disclosure)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "12 CFR 1006.38 (disputes, overshadowing, original-creditor requests)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Initial Payment Request (after validation period)

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

Our records show a balance of **${{current_balance}}** on the account referenced above, now owed to {{current_creditor}}. We would like to help you resolve it in a way that fits your budget.

**Your options**
1. **Pay in full** at {{portal_url}}, by phone at {{agency_phone}}, or by mail to the address above.
2. **Set up a payment plan.** Tell us what you can afford each month and we will review it.
3. **Ask about a reduced payoff.** Depending on your circumstances, a reduced lump-sum or plan settlement may be available.

There is no fee to pay online, by phone, or by mail.

If you believe you do not owe this debt or the amount is wrong, please tell us. You can still dispute the debt by calling or writing to us, and we will review it.

If you are experiencing a financial hardship, have filed for bankruptcy, are on active military duty, or are writing on behalf of someone who has passed away, please let us know so we can handle the account appropriately.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
