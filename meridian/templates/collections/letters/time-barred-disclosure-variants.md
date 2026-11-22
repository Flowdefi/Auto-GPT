---
id: "LTR-060"
title: "Time-Barred Debt Disclosure Variants (non-Texas)"
channel: "letter_block"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Insertable block for accounts past the statute of limitations in states that have no prescribed wording. Federal law: never sue or threaten suit on time-barred debt."
merge_fields: ["consumer_state", "current_creditor"]
required_disclosures: ["no-suit statement"]
send_rules: ["CRM must compute SOL per state table (counsel-maintained); when uncertain treat as time-barred", "Never include any litigation reference on time-barred accounts (1006.26(b))", "Revival warnings are state-specific; Variant C only where counsel confirms partial payment can revive", "Where a state prescribes exact wording, use that state's block instead"]
legal_citations: ["12 CFR 1006.26 (time-barred debt; no suits or threats of suit)", "15 U.S.C. 1692e (false or misleading representations)", "15 U.S.C. 1692f (unfair practices)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Time-Barred Debt Disclosure Variants (non-Texas)

**Requires counsel review before use.**

**VARIANT A: within credit-reporting period AND we furnish**
THE LAW LIMITS HOW LONG YOU CAN BE SUED ON A DEBT. BECAUSE OF THE AGE OF YOUR DEBT, {{current_creditor}} WILL NOT SUE YOU FOR IT. IF YOU DO NOT PAY THE DEBT, {{current_creditor}} MAY CONTINUE TO REPORT IT TO THE CREDIT REPORTING AGENCIES AS UNPAID FOR AS LONG AS THE LAW PERMITS THIS REPORTING.

**VARIANT B: within credit-reporting period, NOT furnishing**
THE LAW LIMITS HOW LONG YOU CAN BE SUED ON A DEBT. BECAUSE OF THE AGE OF YOUR DEBT, {{current_creditor}} WILL NOT SUE YOU FOR IT, AND WE DO NOT REPORT IT TO CREDIT REPORTING AGENCIES.

**VARIANT C: past credit-reporting period**
THE LAW LIMITS HOW LONG YOU CAN BE SUED ON A DEBT AND HOW LONG A DEBT CAN APPEAR ON YOUR CREDIT REPORT. BECAUSE OF THE AGE OF YOUR DEBT, {{current_creditor}} WILL NOT SUE YOU FOR IT, AND IT WILL NOT BE REPORTED TO ANY CREDIT REPORTING AGENCY.

**OPTIONAL REVIVAL ADD-ON (only where counsel confirms state law allows revival by payment or acknowledgment)**
IF YOU MAKE A PAYMENT OR ACKNOWLEDGE THIS DEBT IN WRITING, THE TIME PERIOD IN WHICH YOU COULD BE SUED MAY START AGAIN UNDER {{consumer_state}} LAW. {{current_creditor}} STILL WILL NOT SUE YOU FOR THIS DEBT.

Print in at least 12-point bold type on the front of the validation notice below the total amount (1006.34(d)(3)(iv)(B) where state law specifies content) and in the first payment request.
