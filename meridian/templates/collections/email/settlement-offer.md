---
id: "EML-005"
title: "Email Settlement Offer"
channel: "email"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
subject: "An option to resolve your account"
purpose: "Electronic version of lump-sum/plan settlement offer."
merge_fields: ["account_ref", "agency_mailing_address", "agency_name", "agency_phone", "consumer_first_name", "current_balance", "current_creditor", "email_optout_link", "offer_expiration_date", "payment_schedule_summary", "portal_url", "settlement_amount"]
required_disclosures: ["1006.18(e)(2)", "non-renewal language", "opt-out method"]
send_rules: ["Email address must satisfy 1006.6(d)(4) procedures; never a known employer-provided address (1006.22(f)(3))", "Every email includes a clear opt-out method; opt-out requires no info other than preference + address (1006.6(e))", "Required disclosures (e.g., validation notice) delivered electronically only per 1006.42 / E-SIGN", "Subject line and preview text must not reveal debt to a third party", "Offer terms pulled from CRM offer record; same as letter version"]
legal_citations: ["12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.22(f) (no postcards; envelope language; employer email)", "12 CFR 1006.42 (sending required disclosures; electronic delivery)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "15 U.S.C. 7001(c) (E-SIGN consumer consent)", "Evory v. RJM Acquisitions Funding LLC, 505 F.3d 769 (7th Cir. 2007) (settlement-offer safe-harbor language)", "15 U.S.C. 1692e (false or misleading representations)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Email Settlement Offer

**Requires counsel review before use.**

**Subject:** An option to resolve your account

Hello {{consumer_first_name}},

You can resolve reference {{account_ref}} (current creditor: {{current_creditor}}) for less than the full balance.

| | |
|---|---|
| Current balance | ${{current_balance}} |
| Settlement amount | ${{settlement_amount}} |
| Payment schedule | {{payment_schedule_summary}} |
| Offer valid until | {{offer_expiration_date}} |

Accept at {{portal_url}} or call {{agency_phone}}.

This offer is valid only if the agreed payment(s) are received by the date(s) shown. We are not obligated to renew this offer. When the settlement is paid as agreed, the account will be considered settled in full and we will send written confirmation. Forgiven amounts may have tax consequences; we cannot give tax advice. Accepting or declining this offer does not affect your right to dispute the debt.

{{agency_name}}

---
This communication is from a debt collector. Learn about your rights at www.cfpb.gov/debt-collection.
{{agency_name}} | {{agency_mailing_address}} | {{agency_phone}}
**To stop receiving emails from us at this address, click here: {{email_optout_link}}** or reply with the word STOP. You will not be asked for any other information.
