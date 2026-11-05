---
id: "EML-004"
title: "Email Plan Payment Reminder"
channel: "email"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
subject: "Upcoming payment on your plan"
purpose: "Upcoming plan payment reminder."
merge_fields: ["agency_mailing_address", "agency_name", "agency_phone", "consumer_first_name", "email_optout_link", "next_payment_amount", "next_payment_date", "payment_method_description", "plan_payments_remaining", "portal_url", "recurring_authorized"]
required_disclosures: ["1006.18(e)(2)", "opt-out method"]
send_rules: ["Email address must satisfy 1006.6(d)(4) procedures; never a known employer-provided address (1006.22(f)(3))", "Every email includes a clear opt-out method; opt-out requires no info other than preference + address (1006.6(e))", "Required disclosures (e.g., validation notice) delivered electronically only per 1006.42 / E-SIGN", "Subject line and preview text must not reveal debt to a third party"]
legal_citations: ["12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.22(f) (no postcards; envelope language; employer email)", "12 CFR 1006.42 (sending required disclosures; electronic delivery)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "15 U.S.C. 7001(c) (E-SIGN consumer consent)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Email Plan Payment Reminder

**Requires counsel review before use.**

**Subject:** Upcoming payment on your plan

Hello {{consumer_first_name}},

Your next plan payment of **${{next_payment_amount}}** is scheduled for **{{next_payment_date}}** ({{plan_payments_remaining}} payments remaining).

{{#recurring_authorized}}It will be debited automatically from your {{payment_method_description}}. To change or cancel, visit {{portal_url}} or call {{agency_phone}} at least 3 business days before the payment date.{{/recurring_authorized}}
{{^recurring_authorized}}Pay at {{portal_url}} or call {{agency_phone}}.{{/recurring_authorized}}

{{agency_name}}

---
This communication is from a debt collector. Learn about your rights at www.cfpb.gov/debt-collection.
{{agency_name}} | {{agency_mailing_address}} | {{agency_phone}}
**To stop receiving emails from us at this address, click here: {{email_optout_link}}** or reply with the word STOP. You will not be asked for any other information.
