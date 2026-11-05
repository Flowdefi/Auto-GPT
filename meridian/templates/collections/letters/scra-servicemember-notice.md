---
id: "LTR-072"
title: "SCRA Servicemember Protections Acknowledgment"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Confirms receipt of military-service notice, applies 6% interest cap where eligible, and pauses collection pending review."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "consumer_mailing_address", "consumer_name", "current_creditor", "letter_date", "original_creditor", "portal_url", "scra_effective_date", "scra_notice_date", "scra_rate_cap_applied", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["Run DMDC SCRA status check at import and before any legal action; log certificate", "On notice of active duty: pause collection pending owner/counsel review", "Apply 6% cap on pre-service obligations upon written notice + orders (50 U.S.C. 3937); forgiven interest, not deferred", "No default judgments without SCRA affidavit (50 U.S.C. 3931)"]
legal_citations: ["50 U.S.C. 3937 (SCRA 6% interest cap)", "50 U.S.C. 3931 (SCRA default-judgment protections)", "15 U.S.C. 1692e (false or misleading representations)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# SCRA Servicemember Protections Acknowledgment

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

Thank you for your service. We received notice on {{scra_notice_date}} that you are (or were) on active military duty.

- We have paused collection on the account referenced above while we review the Servicemembers Civil Relief Act (SCRA) protections that may apply.
- {{#scra_rate_cap_applied}}Effective {{scra_effective_date}}, interest on this account is limited to 6% per year for the period of your military service, as required by the SCRA. Interest above 6% for that period has been removed, not deferred.{{/scra_rate_cap_applied}}{{^scra_rate_cap_applied}}If this debt was incurred before your active-duty service began, you may be eligible to have interest limited to 6% per year. To request it, send us a copy of your military orders or a letter from your commanding officer.{{/scra_rate_cap_applied}}

Free legal help is available through your installation's legal assistance office (JAG). Military OneSource: 800-342-9647.

Sincerely,
{{agency_name}}

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
