---
id: "LTR-030"
title: "Payment Plan Agreement and Payment Authorization"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Written plan terms plus optional recurring-payment authorization (Reg E written authorization; copy to consumer). Can be e-signed in the portal."
merge_fields: ["account_last4", "account_ref", "agency_email", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "agreement_id", "authorization_date", "authorization_method", "consumer_mailing_address", "consumer_name", "current_balance", "current_creditor", "grace_days", "is_settlement_plan", "letter_date", "original_creditor", "payment_method_description", "plan_end_date", "plan_first_payment_date", "plan_frequency", "plan_number_of_payments", "plan_payment_amount", "plan_total", "portal_url", "recurring_authorized", "settlement_amount", "state_disclosures"]
required_disclosures: ["1006.18(e)(2)", "creditor name", "address/phone", "right to cancel authorization", "no fees"]
send_rules: ["Recurring debits require signed/similarly authenticated authorization and a copy to the consumer (Reg E 1005.10(b))", "Never print full bank or card numbers; use last 4 only", "Post-dated payments >5 days out: send 3-10 business-day pre-deposit notice (15 U.S.C. 1692f(2))"]
legal_citations: ["12 CFR 1005.10(b) (preauthorized electronic fund transfers: written authorization, copy to consumer)", "15 U.S.C. 1692f (unfair practices)", "15 U.S.C. 1692f(1) (no amounts not authorized by agreement or law)", "15 U.S.C. 7001(c) (E-SIGN consumer consent)", "Tex. Fin. Code 392.303 (unfair or unconscionable means; unauthorized fees)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Payment Plan Agreement and Payment Authorization

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

**PAYMENT PLAN AGREEMENT**

Agreement ID: {{agreement_id}}
Consumer: {{consumer_name}}
Current creditor: {{current_creditor}}

**1. Plan terms**

| | |
|---|---|
| Balance covered by this plan | ${{plan_total}} |
| Payment amount | ${{plan_payment_amount}} |
| Frequency | {{plan_frequency}} |
| Number of payments | {{plan_number_of_payments}} |
| First payment date | {{plan_first_payment_date}} |
| Final payment date | {{plan_end_date}} |
| Settlement plan? | {{#is_settlement_plan}}Yes. Reduced total of ${{settlement_amount}} from balance of ${{current_balance}}.{{/is_settlement_plan}}{{^is_settlement_plan}}No. Plan pays the full balance.{{/is_settlement_plan}} |

**2. No fees.** {{agency_name}} does not charge any fee for this plan or for paying online, by phone, or by mail.

**3. Missed payments.** If a payment is not received within {{grace_days}} days after its due date, we will contact you. {{#is_settlement_plan}}If the plan is not brought current, the reduced settlement terms may end and the remaining balance (the original balance minus all payments made) may be due.{{/is_settlement_plan}} We will send written notice before ending the plan.

**4. Changes.** You may ask to change your payment date or amount at any time by calling {{agency_phone}}.

**5. Your rights.** This agreement does not waive any right you have under federal or state law, including the right to dispute the debt.

**OPTIONAL: RECURRING PAYMENT AUTHORIZATION**

{{#recurring_authorized}}
I authorize {{agency_name}} to initiate {{plan_frequency}} electronic payments of ${{plan_payment_amount}} from my {{payment_method_description}} beginning {{plan_first_payment_date}} for {{plan_number_of_payments}} payments. I may cancel this authorization by calling {{agency_phone}}, writing to the address above, or using {{portal_url}} at least 3 business days before a scheduled payment. I will receive a copy of this authorization.

Authorized by: {{consumer_name}}   Date: {{authorization_date}}   Method: {{authorization_method}}
{{/recurring_authorized}}
{{^recurring_authorized}}
Not selected. You will make each payment yourself.
{{/recurring_authorized}}

Signature: ______________________   Date: __________

---
This communication is from a debt collector. You can learn more about your rights under federal law at www.cfpb.gov/debt-collection.
{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
Questions: {{agency_phone}} ({{agency_hours}}) | {{agency_email}} | {{portal_url}}
