---
id: "LTR-071"
title: "Deceased Consumer: Letter to Estate Representative"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Communicates only with a person authorized to act for the estate (executor/administrator/personal representative or other person with authority to pay from estate assets). Makes clear that family members are not personally liable."
merge_fields: ["account_ref", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "current_balance", "current_creditor", "decedent_name", "estate_representative_address", "estate_representative_name", "estate_representative_title", "letter_date"]
required_disclosures: ["1006.18(e)", "not personally liable statement"]
send_rules: ["Before sending: confirm recipient authority (letters testamentary, small-estate affidavit, or equivalent) and log it", "Never contact relatives without authority except to locate the representative using 1692b-style location script (no debt disclosure)", "If validation notice not previously sent to the consumer, send LTR-001 addressed to the estate representative (1006.34(a)(1) comment on deceased consumers)", "Suppress all marketing/plan pressure; no sympathy-based urgency"]
legal_citations: ["FTC Statement of Policy re Collection of Decedents' Debts, 76 FR 44915 (July 27, 2011)", "12 CFR 1006.6(a) (definition of consumer incl. spouse, executor, administrator)", "15 U.S.C. 1692c (communication in connection with debt collection)", "15 U.S.C. 1692e (false or misleading representations)", "12 CFR 1006.34 (validation notice)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Deceased Consumer: Letter to Estate Representative

**Requires counsel review before use.**

{{agency_name}}
{{agency_mailing_address}}
{{agency_phone}} | {{agency_hours}}

{{letter_date}}

{{estate_representative_name}}
{{estate_representative_title}}, Estate of {{decedent_name}}
{{estate_representative_address}}

Reference: {{account_ref}}

Dear {{estate_representative_name}},

We are sorry for your loss. We are contacting you because our records indicate that you are authorized to handle the affairs of the estate of {{decedent_name}}.

{{agency_name}} is a debt collector. We are trying to collect a debt owed by the estate of {{decedent_name}} to {{current_creditor}}. We will use any information you give us to help collect the debt.

**Please note:** You are not personally responsible for this debt, and you are not required to pay it from your own money or from assets you jointly owned with {{decedent_name}}, unless you are otherwise legally responsible for it (for example, as a co-signer or joint account holder). Any payment on this debt would come only from the assets of the estate.

The balance shown on our records is ${{current_balance}}. Information about the debt and your rights is enclosed (or was previously provided).

If the estate has no assets, or the probate case has closed, please let us know. If you are not the person authorized to act for the estate, please tell us, and we will not contact you again about this matter.

Sincerely,
{{agency_name}}

You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
