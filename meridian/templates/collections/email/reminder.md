---
id: "EML-002"
title: "Email Reminder"
channel: "email"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
subject: "Your account options with {{agency_name}}"
purpose: "General follow-up."
merge_fields: ["account_ref", "agency_mailing_address", "agency_name", "agency_phone", "consumer_first_name", "current_balance", "current_creditor", "dispute_portal_url", "email_optout_link", "portal_url"]
required_disclosures: ["1006.18(e)(2)", "opt-out method"]
send_rules: ["Email address must satisfy 1006.6(d)(4) procedures; never a known employer-provided address (1006.22(f)(3))", "Every email includes a clear opt-out method; opt-out requires no info other than preference + address (1006.6(e))", "Required disclosures (e.g., validation notice) delivered electronically only per 1006.42 / E-SIGN", "Subject line and preview text must not reveal debt to a third party", "Not during validation period in a way that overshadows rights"]
legal_citations: ["12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.22(f) (no postcards; envelope language; employer email)", "12 CFR 1006.42 (sending required disclosures; electronic delivery)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "15 U.S.C. 7001(c) (E-SIGN consumer consent)", "12 CFR 1006.38 (disputes, overshadowing, original-creditor requests)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Email Reminder

**Requires counsel review before use.**

**Subject:** Your account options with {{agency_name}}

Hello {{consumer_first_name}},

This is a reminder about reference {{account_ref}} (current creditor: {{current_creditor}}). The balance is ${{current_balance}}.

- Pay in full or set up a plan: {{portal_url}}
- Ask about a reduced payoff or hardship options: {{agency_phone}}
- Think there's a mistake? Tell us at {{dispute_portal_url}}

{{agency_name}}

---
This communication is from a debt collector. Learn about your rights at www.cfpb.gov/debt-collection.
{{agency_name}} | {{agency_mailing_address}} | {{agency_phone}}
**To stop receiving emails from us at this address, click here: {{email_optout_link}}** or reply with the word STOP. You will not be asked for any other information.
