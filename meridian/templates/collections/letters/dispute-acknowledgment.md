---
id: "LTR-040"
title: "Dispute Acknowledgment"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Acknowledges a dispute (written or oral) and confirms collection on the disputed portion is paused pending verification."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "dispute_partial", "dispute_portal_url", "dispute_received_date", "dispute_requests_original_creditor", "disputed_amount", "furnishes_credit", "letter_date", "original_creditor", "portal_url", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Pause collection on disputed portion immediately when written dispute is received within validation period (1692g(b))", "Texas: written dispute of file accuracy triggers 392.202 duties: written response within 30 days", "Mark account 'disputed' in any credit furnishing (FCRA 1681s-2(a)(3))"]
legal_citations: ["15 U.S.C. 1692g(b) (disputed debts; no overshadowing)", "12 CFR 1006.38 (disputes, overshadowing, original-creditor requests)", "Tex. Fin. Code 392.202 (dispute of file accuracy; 30-day written response)", "15 U.S.C. 1681s-2 (furnisher accuracy and dispute duties)", "15 U.S.C. 1692e (false or misleading representations)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Dispute Acknowledgment

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

We received your dispute about the account referenced above on {{dispute_received_date}}.

**What happens now**
- We have paused collection of {{#dispute_partial}}the disputed portion (${{disputed_amount}}) of {{/dispute_partial}}the debt while we review it.
- We will send you {{#dispute_requests_original_creditor}}the name and address of the original creditor and {{/dispute_requests_original_creditor}}information about the debt, or explain the results of our review, in writing.
- {{#furnishes_credit}}If we report this account to credit reporting agencies, we will report it as disputed.{{/furnishes_credit}}

You do not need to do anything else right now. If you have documents that support your dispute, such as receipts, statements, or a police or FTC identity theft report, you can send them to the address above or upload them at {{dispute_portal_url}}.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
