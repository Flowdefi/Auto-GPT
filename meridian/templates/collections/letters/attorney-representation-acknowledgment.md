---
id: "LTR-074"
title: "Attorney Representation Acknowledgment (to consumer's attorney)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Confirms future communications will go only to the consumer's attorney."
merge_fields: ["account_ref", "agency_mailing_address", "agency_name", "agency_phone", "attorney_address", "attorney_firm", "attorney_name", "consumer_name", "current_creditor", "letter_date"]
required_disclosures: ["1006.18(e)"]
send_rules: ["On knowledge of attorney representation: stop direct consumer contact on all channels (1006.6(b)(2)) unless attorney fails to respond in a reasonable period or consents", "Address to attorney only"]
legal_citations: ["12 CFR 1006.6(b)(2) (consumer represented by attorney)", "15 U.S.C. 1692c (communication in connection with debt collection)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Attorney Representation Acknowledgment (to consumer's attorney)

**Requires counsel review before use.**

{{agency_name}}
{{agency_mailing_address}}
{{agency_phone}}

{{letter_date}}

{{attorney_name}}
{{attorney_firm}}
{{attorney_address}}

Re: Your client {{consumer_name}}, Reference {{account_ref}}, Current creditor {{current_creditor}}

Dear {{attorney_name}},

We have been informed that you represent {{consumer_name}} regarding the account referenced above. We will direct all future communications about this account to you.

{{agency_name}} is a debt collector attempting to collect a debt. Any information obtained will be used for that purpose. Please contact us at {{agency_phone}} if you would like account documents.

Sincerely,
{{agency_name}}
