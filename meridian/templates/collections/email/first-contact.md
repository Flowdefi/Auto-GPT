---
id: "EML-001"
title: "Email First Contact (with electronic validation notice)"
channel: "email"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
subject: "Message from {{agency_name}} for {{consumer_first_name}}"
purpose: "First email. If E-SIGN consent or 1006.6(d)(4) procedures support it, the validation notice is delivered in the body (or as a secure hyperlink per 1006.42(b))."
merge_fields: ["agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "consumer_first_name", "current_creditor", "email_optout_link", "portal_url", "validation_notice_block"]
required_disclosures: ["1006.18(e)(1)", "validation information (if included)", "opt-out method"]
send_rules: ["Email address must satisfy 1006.6(d)(4) procedures; never a known employer-provided address (1006.22(f)(3))", "Every email includes a clear opt-out method; opt-out requires no info other than preference + address (1006.6(e))", "Required disclosures (e.g., validation notice) delivered electronically only per 1006.42 / E-SIGN", "Subject line and preview text must not reveal debt to a third party", "If validation notice included: render LTR-001 into {{validation_notice_block}} and include electronic-dispute lines (1006.34(c)(3)(v))"]
legal_citations: ["12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.22(f) (no postcards; envelope language; employer email)", "12 CFR 1006.42 (sending required disclosures; electronic delivery)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "15 U.S.C. 7001(c) (E-SIGN consumer consent)", "12 CFR 1006.34 (validation notice)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Email First Contact (with electronic validation notice)

**Requires counsel review before use.**

**Subject:** Message from {{agency_name}} for {{consumer_first_name}}

Hello {{consumer_first_name}},

{{agency_name}} is a debt collector. We are trying to collect a debt that you owe to {{current_creditor}}. We will use any information you give us to help collect the debt.

{{#validation_notice_block}}
{{validation_notice_block}}
{{/validation_notice_block}}
{{^validation_notice_block}}
Please log in securely to view details about the account and your rights: {{portal_url}}
{{/validation_notice_block}}

You can pay, set up a plan, dispute the debt, or ask questions at {{portal_url}} or by calling {{agency_phone}} ({{agency_hours}}). There is no fee to pay online.

{{agency_name}}

---
This communication is from a debt collector. Learn about your rights at www.cfpb.gov/debt-collection.
{{agency_name}} | {{agency_mailing_address}} | {{agency_phone}}
**To stop receiving emails from us at this address, click here: {{email_optout_link}}** or reply with the word STOP. You will not be asked for any other information.
