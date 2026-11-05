---
id: "EML-003"
title: "Email Payment Confirmation"
channel: "email"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
subject: "Payment received: confirmation {{confirmation_number}}"
purpose: "Receipt after payment."
merge_fields: ["agency_mailing_address", "agency_name", "agency_phone", "confirmation_number", "consumer_first_name", "email_optout_link", "next_payment_amount", "next_payment_date", "payment_amount", "payment_date", "payment_method_description", "remaining_balance"]
required_disclosures: ["1006.18(e)(2)", "opt-out method"]
send_rules: ["Email address must satisfy 1006.6(d)(4) procedures; never a known employer-provided address (1006.22(f)(3))", "Every email includes a clear opt-out method; opt-out requires no info other than preference + address (1006.6(e))", "Required disclosures (e.g., validation notice) delivered electronically only per 1006.42 / E-SIGN", "Subject line and preview text must not reveal debt to a third party"]
legal_citations: ["12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.22(f) (no postcards; envelope language; employer email)", "12 CFR 1006.42 (sending required disclosures; electronic delivery)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "15 U.S.C. 7001(c) (E-SIGN consumer consent)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Email Payment Confirmation

**Requires counsel review before use.**

**Subject:** Payment received: confirmation {{confirmation_number}}

Hello {{consumer_first_name}},

Thank you. We received your payment.

| | |
|---|---|
| Amount | ${{payment_amount}} |
| Date | {{payment_date}} |
| Method | {{payment_method_description}} |
| Confirmation | {{confirmation_number}} |
| Remaining balance | ${{remaining_balance}} |
{{#next_payment_date}}| Next scheduled payment | ${{next_payment_amount}} on {{next_payment_date}} |{{/next_payment_date}}

{{agency_name}}

---
This communication is from a debt collector. Learn about your rights at www.cfpb.gov/debt-collection.
{{agency_name}} | {{agency_mailing_address}} | {{agency_phone}}
**To stop receiving emails from us at this address, click here: {{email_optout_link}}** or reply with the word STOP. You will not be asked for any other information.
