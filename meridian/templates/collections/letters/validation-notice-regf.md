---
id: "LTR-001"
title: "Reg F Validation Notice (Model Form B-1 structure)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Initial written validation notice sent with or within 5 days of initial communication. Mirrors CFPB Model Form B-1 for the safe harbor; do not add, remove, or reorder required sections."
merge_fields: ["accepts_electronic_disputes", "account_last4", "account_ref", "account_type", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "agency_website", "amount_on_itemization_date", "consumer_mailing_address", "consumer_name", "creditor_on_itemization_date", "current_balance", "current_creditor", "dispute_portal_url", "fees_since_itemization", "has_reverse_disclosures", "interest_since_itemization", "itemization_date", "notice_date", "payments_credits_since_itemization", "state_disclosures", "time_barred_front_disclosure", "validation_end_date"]
required_disclosures: ["1006.18(e)(1) initial-communication disclosure", "validation information 1006.34(c)(1)-(4)", "CFPB website reference", "consumer-response section", "Tex. Fin. Code 392.304(a)(4)-(6) creditor name/address/phone"]
send_rules: ["Send in the initial communication or within 5 days after it (1006.34(a)(1))", "validation_end_date = 30 days after assumed receipt; assumed receipt = at least 5 days after sending excluding Sat, Sun, federal holidays (1006.34(b)(5)); CRM must compute, never hand-type", "Itemization fields may never be blank; use 0.00 or 'none' (1006.34(c)(2)(viii) comment 1)", "Envelope: return address only, optional business name only if it does not indicate debt collection (1006.22(f)(2))", "If time-barred and state law specifies a disclosure (e.g., Texas 392.307), the time-barred block prints on the FRONT below the total amount (1006.34(d)(3)(iv)(B))", "Other state disclosures print on the REVERSE, not behind the tear-off (1006.34(d)(3)(iv)(A))", "Electronic delivery requires 1006.42 compliance (E-SIGN consent or 1006.6(d)(4) procedures); include electronic dispute lines when sent electronically (1006.34(c)(3)(v))"]
legal_citations: ["12 CFR 1006.34 (validation notice)", "12 CFR 1006.34(b)(5) (validation period; 5-business-day assumed receipt)", "12 CFR 1006.34(d)(3)(iv) (state disclosures on reverse; time-barred disclosures on front)", "12 CFR Part 1006, Appendix B, Model Form B-1", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "15 U.S.C. 1692g (validation of debts)", "12 CFR 1006.42 (sending required disclosures; electronic delivery)", "12 CFR 1006.22(f) (no postcards; envelope language; employer email)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)", "Tex. Fin. Code 392.307 (debt buyers; time-barred debt notice, no revival)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Reg F Validation Notice (Model Form B-1 structure)

**Requires counsel review before use.**

{{agency_name}}
{{agency_mailing_address}}
{{agency_phone}}, {{agency_hours}}
{{agency_website}}

{{notice_date}}

To: {{consumer_name}}
{{consumer_mailing_address}}

Reference: {{account_ref}}

{{agency_name}} is a debt collector. We are trying to collect a debt that you owe to {{current_creditor}}. We will use any information you give us to help collect the debt.

Our information shows:

You had a {{account_type}} from {{creditor_on_itemization_date}} with account number ending in {{account_last4}}.

| | |
|---|---|
| As of {{itemization_date}}, you owed: | ${{amount_on_itemization_date}} |
| Between {{itemization_date}} and today: | |
| You were charged this amount in interest: | + ${{interest_since_itemization}} |
| You were charged this amount in fees: | + ${{fees_since_itemization}} |
| You paid or were credited this amount toward the debt: | – ${{payments_credits_since_itemization}} |
| **Total amount of the debt now:** | **${{current_balance}}** |

{{#time_barred_front_disclosure}}
**{{time_barred_front_disclosure}}**
{{/time_barred_front_disclosure}}

**How can you dispute the debt?**

- **Call or write to us by {{validation_end_date}}, to dispute all or part of the debt.** If you do not, we will assume that our information is correct.
- **If you write to us by {{validation_end_date}}**, we must stop collection on any amount you dispute until we send you information that shows you owe the debt. You may use the form below or write to us without the form. You may also include supporting documents.{{#accepts_electronic_disputes}} We accept disputes electronically at {{dispute_portal_url}}.{{/accepts_electronic_disputes}}

**What else can you do?**

- **Write to ask for the name and address of the original creditor, if different from the current creditor.** If you write by {{validation_end_date}}, we must stop collection until we send you that information. You may use the form below or write to us without the form.{{#accepts_electronic_disputes}} We accept original creditor information requests electronically at {{dispute_portal_url}}.{{/accepts_electronic_disputes}}
- **Go to www.cfpb.gov/debt-collection** to learn more about your rights under federal law. For instance, you have the right to stop or limit how we contact you.
- **Contact us about your payment options.**
- Póngase en contacto con nosotros para solicitar una copia de este formulario en español.

{{#has_reverse_disclosures}}
Notice: See the reverse side of this page for important information about your rights.
{{/has_reverse_disclosures}}

- - - - - - - - - - - - - - - - - - - - (detach here) - - - - - - - - - - - - - - - - - - - -

Mail this form to:
{{agency_name}}
{{agency_mailing_address}}

{{consumer_name}}
{{consumer_mailing_address}}
Reference: {{account_ref}}

**How do you want to respond?**

Check all that apply:

I want to dispute the debt because I think:
- [ ] This is not my debt.
- [ ] The amount is wrong.
- [ ] Other (please describe on reverse or attach additional information).

- [ ] I want you to send me the name and address of the original creditor.

- [ ] I enclosed this amount: $__________
  Make your check payable to {{agency_name}}. Include the reference number {{account_ref}}.

- [ ] Quiero este formulario en español.

=== REVERSE SIDE (state disclosures only; must not sit directly behind the response form) ===

{{#state_disclosures}}
{{state_disclosures}}
{{/state_disclosures}}
