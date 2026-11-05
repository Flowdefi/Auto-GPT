<!-- DRAFT LIBRARY. Requires counsel review before use. Not legal advice. -->
# Meridian Collections Template Library (v1.0.0, 2026-11-04)

**Status: every template, script, and data file is a DRAFT that requires counsel review before use. Nothing here is legal advice.**

Scope: U.S. consumer debt collected by a third-party collector / debt buyer, for consumers in owner-approved states with no collection-license requirement, plus Texas (which requires the Tex. Fin. Code 392.101 $10,000 surety bond on file with the Secretary of State). The state list itself must come from counsel. This library does not decide which states qualify.

## Layout
```
letters/        Written notices (Reg F validation notice, demands, settlements, confirmations, disputes, special-status notices)
call-scripts/   Live-agent and voice-AI scripts, voice-AI system prompt, voice-ai-guardrails.json
sms/            Text templates (each includes a debt-collector disclosure and a STOP opt-out)
email/          Email templates (subject in front matter; each includes a one-click opt-out)
manifest.json   Machine index: id, path, channel, purpose, merge_fields, required_disclosures, send_rules, legal_citations, needs_counsel_review
merge-fields.json  Field dictionary (type, group, description, used_in) and forbidden fields
settlement-matrix.json  Owner-set negotiation tiers and contact limits (all values are DEFAULTS the owner must set)
```

## File format
Every `.md` template starts with YAML front matter (JSON-encoded values, so any JSON or YAML parser can read it), then the banner `<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->`, then the body.
Bodies use **Mustache** syntax: `{{field}}` inserts a value, `{{#flag}}...{{/flag}}` renders only if the flag is truthy or the value is non-empty, and `{{^flag}}...{{/flag}}` renders only if it's falsy. For letters, render to HTML/PDF. For SMS, render to plain text and enforce segment length. Use `send_rules` in the front matter as pre-send gates in the CRM.

## Loading into Meridian CRM
1. Parse `manifest.json` and register each template by `id`.
2. Before rendering, check that every `merge_fields` entry resolves. Itemization money fields must never be blank (use 0.00).
3. Enforce `send_rules` as hard gates (calling window, validation period, cease/attorney/bankruptcy flags, channel consent).
4. Load `call-scripts/voice-ai-guardrails.json` into the voice runtime as an output filter that runs independently of the LLM.
5. Load `settlement-matrix.json`. Refuse to activate any value whose `is_default` is still `true` until the owner sets it.
6. Store the `id` of every rendered communication plus its merge snapshot for 1006.100 record retention (3 years minimum).

## Hard rules built into every template
- Placeholder agency name `{{agency_name}}` everywhere. No real company names.
- No SSNs, dates of birth, or full account, card, or bank numbers in any template. Only `{{account_ref}}` (agency reference) and `{{account_last4}}`. The build script fails if a forbidden field appears.
- No threats, no litigation language, no attorney implication, and no false urgency. Deadlines only come from real CRM offer records.
- No convenience or pay-to-pay fees by default.
- Initial communication: the 1006.18(e)(1) / 1692e(11) / Tex. 392.304(a)(5)(A) disclosure. Every later communication: "from a debt collector".
- Every electronic message includes a clear, free opt-out method (1006.6(e)).

## Template index
| ID | Channel | Path | Title |
|---|---|---|---|
| CALL-001 | voice | `call-scripts/outbound-right-party-contact.md` | Outbound Call: Right-Party Contact |
| CALL-002 | voice | `call-scripts/inbound.md` | Inbound Call |
| CALL-003 | voice | `call-scripts/third-party-location.md` | Third-Party / Location Information Call (1692b) |
| CALL-004 | voicemail | `call-scripts/limited-content-voicemail.md` | Reg F Limited-Content Voicemail (1006.2(j)) |
| CALL-005 | voice | `call-scripts/negotiation-settlement-objections.md` | Negotiation, Settlement, and Objection Handling |
| CALL-006 | voice | `call-scripts/payment-handoff.md` | Payment-Taking Handoff (PCI-safe) |
| CALL-007 | voice | `call-scripts/escalation-to-human.md` | Escalation to Human |
| CALL-008 | voice_ai | `call-scripts/voice-ai-system-prompt.md` | Voice AI Agent System Prompt |
| CALL-009 | voice_ai | `call-scripts/voice-ai-guardrails.json` | Voice AI runtime guardrails |
| EML-001 | email | `email/first-contact.md` | Email First Contact (with electronic validation notice) |
| EML-002 | email | `email/reminder.md` | Email Reminder |
| EML-003 | email | `email/payment-confirmation.md` | Email Payment Confirmation |
| EML-004 | email | `email/plan-reminder.md` | Email Plan Payment Reminder |
| EML-005 | email | `email/settlement-offer.md` | Email Settlement Offer |
| EML-006 | email | `email/opt-out-confirmation.md` | Email Opt-Out Confirmation |
| LTR-001 | letter | `letters/validation-notice-regf.md` | Reg F Validation Notice (Model Form B-1 structure) |
| LTR-002 | letter | `letters/initial-demand-post-validation.md` | Initial Payment Request (after validation period) |
| LTR-003 | letter | `letters/follow-up-1.md` | Follow-up Letter 1 (friendly reminder) |
| LTR-004 | letter | `letters/follow-up-2.md` | Follow-up Letter 2 (options outline) |
| LTR-005 | letter | `letters/follow-up-3-final-courtesy.md` | Follow-up Letter 3 (last scheduled letter in default sequence) |
| LTR-010 | letter | `letters/settlement-offer-lump-sum.md` | Settlement Offer: Lump Sum |
| LTR-011 | letter | `letters/settlement-offer-short-term-plan.md` | Settlement Offer: Short-Term Plan (2-6 payments) |
| LTR-012 | letter | `letters/settlement-offer-long-term-plan.md` | Settlement Offer: Long-Term Plan |
| LTR-013 | letter | `letters/settlement-offer-hardship.md` | Hardship Settlement / Hardship Plan Offer |
| LTR-020 | letter | `letters/settlement-accepted-confirmation.md` | Settlement Accepted Confirmation |
| LTR-021 | letter | `letters/paid-in-full-confirmation.md` | Paid-in-Full Confirmation |
| LTR-022 | letter | `letters/settled-in-full-confirmation.md` | Settled-in-Full Confirmation |
| LTR-030 | letter | `letters/payment-plan-agreement.md` | Payment Plan Agreement and Payment Authorization |
| LTR-040 | letter | `letters/dispute-acknowledgment.md` | Dispute Acknowledgment |
| LTR-041 | letter | `letters/verification-response.md` | Debt Verification Response |
| LTR-042 | letter | `letters/dispute-resolved-account-closed.md` | Dispute Resolved in Consumer's Favor / Account Closed |
| LTR-043 | letter | `letters/original-creditor-information.md` | Original Creditor Information Response |
| LTR-050 | letter | `letters/cease-communication-acknowledgment.md` | Cease-Communication Acknowledgment |
| LTR-060 | letter_block | `letters/time-barred-disclosure-variants.md` | Time-Barred Debt Disclosure Variants (non-Texas) |
| LTR-061 | letter_block | `letters/time-barred-disclosure-texas.md` | Texas Time-Barred Debt Notice (Tex. Fin. Code 392.307(e)) |
| LTR-070 | letter | `letters/bankruptcy-acknowledgment.md` | Bankruptcy Notice Acknowledgment / Collection Stopped |
| LTR-071 | letter | `letters/deceased-estate-notice.md` | Deceased Consumer: Letter to Estate Representative |
| LTR-072 | letter | `letters/scra-servicemember-notice.md` | SCRA Servicemember Protections Acknowledgment |
| LTR-073 | letter | `letters/identity-theft-acknowledgment.md` | Identity Theft Claim Acknowledgment |
| LTR-074 | letter | `letters/attorney-representation-acknowledgment.md` | Attorney Representation Acknowledgment (to consumer's attorney) |
| LTR-080 | letter | `letters/privacy-notice-glba.md` | Privacy Notice (GLBA / Regulation P, model-form style) |
| LTR-090 | letter | `letters/returned-to-client-notice.md` | Account Returned to Creditor / No Longer Handled by Us |
| SMS-001 | sms | `sms/first-contact.md` | SMS First Contact |
| SMS-002 | sms | `sms/reminder.md` | SMS Reminder |
| SMS-003 | sms | `sms/payment-confirmation.md` | SMS Payment Confirmation |
| SMS-004 | sms | `sms/plan-reminder.md` | SMS Plan Payment Reminder |
| SMS-005 | sms | `sms/plan-missed-payment.md` | SMS Missed Plan Payment |
| SMS-006 | sms | `sms/settlement-offer.md` | SMS Settlement Offer |
| SMS-007 | sms | `sms/opt-out-confirmation.md` | SMS Opt-Out Confirmation |
| SMS-008 | sms | `sms/help-response.md` | SMS HELP Response |

## Merge-field dictionary
Forbidden fields (never add): `ssn`, `social_security`, `ssn_last4`, `dob`, `date_of_birth`, `full_account_number`, `account_number`, `card_number`, `pan`, `cvv`, `routing_number`, `bank_account_number`, `pin`, `password`

| Field | Type | Group | Description |
|---|---|---|---|
| `{{accepts_electronic_disputes}}` | boolean | flags | Agency accepts disputes electronically (1006.34(c)(3)(v)) |
| `{{account_last4}}` | string | account | Last 4 digits of original account number only |
| `{{account_ref}}` | string | account | Agency-generated reference number (NOT the creditor account number) |
| `{{account_type}}` | string | account | Product type, e.g. 'credit card' |
| `{{affiliates_statement}}` | string | agency | Privacy-notice description of affiliates |
| `{{agency_email}}` | string | agency | Monitored consumer email address |
| `{{agency_hours}}` | string | agency | Business hours with time zone label |
| `{{agency_legal_name}}` | string | agency | Legal entity name (privacy notice, agreements) |
| `{{agency_mailing_address}}` | string | agency | Street address or PO box for correspondence and disputes (Tex. Fin. Code 392.304(a)(6)-(7)) |
| `{{agency_name}}` | string | agency | Placeholder doing-business name of the collector, printed as-is (never hard-code a real name) |
| `{{agency_name_caps}}` | string | agency | agency_name in ALL CAPS (for capitalized statutory notices) |
| `{{agency_phone}}` | string | agency | Toll-free number for consumers |
| `{{agency_website}}` | string | agency | Public website |
| `{{agreement_date}}` | mixed | offers_plans | Agreement date |
| `{{agreement_id}}` | mixed | offers_plans | Agreement ID |
| `{{ai_agent_name}}` | string | agency | Name the AI assistant uses; must not pose as a human |
| `{{amount_on_itemization_date}}` | money_or_date | itemization | Amount owed on itemization date |
| `{{attorney_address}}` | string | consumer | Attorney address |
| `{{attorney_firm}}` | string | consumer | Attorney firm |
| `{{attorney_name}}` | string | consumer | Consumer's attorney |
| `{{authorization_date}}` | mixed | payments | Date recurring authorization captured |
| `{{authorization_method}}` | mixed | payments | written / e-sign / recorded oral with written copy |
| `{{balance_itemization}}` | money_or_date | itemization | Rendered itemization table block |
| `{{bankruptcy_case_number}}` | mixed | disputes_status | Bankruptcy case number |
| `{{bankruptcy_chapter}}` | mixed | disputes_status | 7, 11, 13 |
| `{{bankruptcy_court}}` | mixed | disputes_status | Court name |
| `{{bankruptcy_filing_date}}` | date | dates | Bankruptcy petition date |
| `{{bankruptcy_notice_date}}` | date | dates | Date bankruptcy notice received |
| `{{callback_window}}` | date | dates | Suggested reply window, e.g. 'weekdays 9 a.m. to 5 p.m. Eastern' |
| `{{cease_optional_remedy_statement}}` | mixed | disputes_status | Optional 1006.6(c)(2)(ii)/(iii) statement (counsel-approved only) |
| `{{cease_received_date}}` | date | dates | Date written cease received |
| `{{client_contact}}` | string | agency | Client contact line for returned-account notice |
| `{{client_name}}` | string | agency | Original placing client (contingency) name |
| `{{collector_name}}` | string | agency | Natural-person (or AI-agent) name making the call |
| `{{confirmation_channel}}` | mixed | offers_plans | mail / email / text |
| `{{confirmation_number}}` | mixed | payments | Processor confirmation number |
| `{{consumer_first_name}}` | string | consumer | Consumer first or preferred name |
| `{{consumer_mailing_address}}` | string | consumer | Consumer mailing address block |
| `{{consumer_name}}` | string | consumer | Consumer full name |
| `{{consumer_state}}` | string | consumer | Two-letter state of residence (drives state_disclosures and scope gate) |
| `{{creditor_on_itemization_date}}` | string | account | Creditor as of itemization date (1006.34(c)(2)(iv)) |
| `{{current_balance}}` | money_or_date | itemization | Current amount owed |
| `{{current_creditor}}` | string | account | Creditor to whom the debt is currently owed (debt owner) |
| `{{debt_buyer_name_caps}}` | string | account | Debt buyer name in caps for Tex. Fin. Code 392.307(e)(1) |
| `{{decedent_name}}` | string | consumer | Name of deceased consumer |
| `{{dispute_outcome_statement}}` | mixed | disputes_status | Counsel-approved outcome text |
| `{{dispute_partial}}` | boolean | flags | Dispute covers part of balance |
| `{{dispute_portal_url}}` | string | agency | URL for electronic disputes/original-creditor requests |
| `{{dispute_received_date}}` | date | dates | Date dispute received |
| `{{dispute_requests_original_creditor}}` | boolean | flags | Consumer requested original creditor info |
| `{{disputed_amount}}` | mixed | disputes_status | Amount disputed |
| `{{email_optout_link}}` | string | agency | One-click email opt-out URL (token only; no PII in URL) |
| `{{escalation_role}}` | string | agency | Role transferred to (e.g., 'a supervisor') |
| `{{estate_representative_address}}` | string | consumer | Estate representative address |
| `{{estate_representative_name}}` | string | consumer | Executor/administrator name |
| `{{estate_representative_title}}` | string | consumer | Executor, administrator, personal representative, etc. |
| `{{fees_since_itemization}}` | money_or_date | itemization | Fees since itemization date (0.00 if none; never blank) |
| `{{furnishes_credit}}` | boolean | flags | Agency/debt buyer furnishes to CRAs |
| `{{grace_days}}` | mixed | offers_plans | Days late before a plan is considered missed |
| `{{hardship_lump_sum}}` | mixed | offers_plans | Hardship lump-sum option |
| `{{hardship_plan}}` | mixed | offers_plans | Hardship plan option |
| `{{hardship_review_date}}` | date | dates | Date hardship reviewed |
| `{{has_reverse_disclosures}}` | boolean | flags | State disclosures printed on reverse |
| `{{interest_since_itemization}}` | money_or_date | itemization | Interest since itemization date (0.00 if none; never blank) |
| `{{is_ai_agent}}` | boolean | flags | Call handled by AI voice agent |
| `{{is_settlement}}` | boolean | flags | Payment is part of settlement |
| `{{is_settlement_plan}}` | boolean | flags | Plan is a settlement plan |
| `{{itemization_date}}` | money_or_date | itemization | Reg F itemization date (1006.34(b)(3)); one of last statement, charge-off, last payment, transaction, judgment |
| `{{itemization_date_basis}}` | money_or_date | itemization | Which of the five itemization-date options was used |
| `{{legal_status_statement}}` | mixed | disputes_status | Counsel-approved factual statement on legal status; only source of any legal-consequence wording |
| `{{letter_date}}` | date | dates | Date letter generated |
| `{{link_expiry_minutes}}` | mixed | payments | Secure payment link lifetime |
| `{{location_trade_name}}` | string | agency | Counsel-approved business name not indicating debt collection, given to third parties only on express request (1692b(1)) |
| `{{masked_destination}}` | string | consumer | Masked phone/email for payment link, e.g. ***-***-1234 |
| `{{masked_email}}` | string | consumer | Masked email, e.g. j***@example.com |
| `{{message_date}}` | date | dates | Date of voicemail |
| `{{message_time}}` | date | dates | Time of voicemail with zone |
| `{{min_plan_payment}}` | mixed | offers_plans | Minimum monthly plan payment from matrix |
| `{{missed_payment_date}}` | mixed | offers_plans | Date of missed installment |
| `{{next_payment_amount}}` | mixed | offers_plans | Next installment amount |
| `{{next_payment_date}}` | mixed | offers_plans | Next installment date |
| `{{next_step_statement}}` | mixed | disputes_status | Owner/counsel-approved, truthful next-step statement chosen from an approved list |
| `{{notice_date}}` | date | dates | Date validation notice sent |
| `{{offer_expiration_date}}` | mixed | offers_plans | Real offer deadline recorded in CRM (settlement-matrix offer_validity_days) |
| `{{original_creditor}}` | string | account | Original creditor name |
| `{{original_creditor_address}}` | string | account | Original creditor address (1692g(a)(5) request) |
| `{{payment_amount}}` | mixed | payments | Payment amount |
| `{{payment_date}}` | mixed | payments | Payment date |
| `{{payment_method_description}}` | mixed | payments | e.g. 'Visa ending 1234' or 'checking account ending 5678' (last 4 only) |
| `{{payment_schedule_summary}}` | mixed | offers_plans | Human-readable schedule |
| `{{payment_status}}` | mixed | payments | approved / declined / pending |
| `{{payments_credits_since_itemization}}` | money_or_date | itemization | Payments/credits since itemization date (0.00 if none; never blank) |
| `{{plan_end_date}}` | mixed | offers_plans | Final installment date |
| `{{plan_first_payment_date}}` | mixed | offers_plans | First installment date |
| `{{plan_frequency}}` | mixed | offers_plans | weekly / biweekly / monthly |
| `{{plan_number_of_payments}}` | mixed | offers_plans | Number of plan payments |
| `{{plan_payment_amount}}` | mixed | offers_plans | Installment amount |
| `{{plan_payments_remaining}}` | mixed | offers_plans | Installments left |
| `{{plan_total}}` | mixed | offers_plans | Total of all plan payments |
| `{{portal_url}}` | string | agency | Authenticated consumer payment portal URL (no account data in URL) |
| `{{post_return_payment_handling}}` | mixed | payments | Where to send payments after return to client |
| `{{prior_letter_date}}` | date | dates | Date of a prior letter referenced |
| `{{privacy_notice_revision_date}}` | string | agency | Privacy notice revision date |
| `{{recap_statement}}` | mixed | offers_plans | Call recap generated from CRM agreement record |
| `{{recipient_mailing_address}}` | string | consumer | Addressee mailing address |
| `{{recipient_name}}` | string | consumer | Addressee when not the consumer (estate rep, attorney) |
| `{{recurring_authorized}}` | boolean | flags | Recurring debit authorized |
| `{{remaining_balance}}` | money_or_date | itemization | Balance after payment |
| `{{return_date}}` | date | dates | Date account returned to client |
| `{{returned_reason_statement}}` | mixed | disputes_status | Why account returned |
| `{{scra_effective_date}}` | date | dates | SCRA protection effective date |
| `{{scra_notice_date}}` | date | dates | Date SCRA notice received |
| `{{scra_rate_cap_applied}}` | boolean | flags | 6% cap applied |
| `{{settlement_amount}}` | mixed | offers_plans | Agreed/offered settlement amount |
| `{{settlement_percent}}` | mixed | offers_plans | Settlement as % of balance |
| `{{settlement_savings}}` | mixed | offers_plans | current_balance minus settlement_amount |
| `{{state_disclosures}}` | block | blocks | Rendered state-required disclosures (reverse of validation notice) |
| `{{time_barred}}` | boolean | flags | Debt is past statute of limitations |
| `{{time_barred_front_disclosure}}` | block | blocks | Time-barred disclosure printed on front below total (1006.34(d)(3)(iv)(B)) |
| `{{validation_end_date}}` | money_or_date | itemization | CRM-computed end of validation period (1006.34(b)(5)); never hand-entered |
| `{{validation_notice_block}}` | block | blocks | Rendered LTR-001 content for electronic delivery |
| `{{verification_documents_list}}` | mixed | disputes_status | List of enclosed verification documents |
| `{{voicemail_business_name}}` | string | agency | Counsel-approved business name not indicating debt collection for limited-content messages (1006.2(j)) |
| `{{within_validation_period}}` | boolean | flags | Today <= validation_end_date |

## Sources (checked 2026-11-04)
Federal rules and statutes
- 12 CFR Part 1006 (Regulation F), CFPB eRegulations: https://www.consumerfinance.gov/rules-policy/regulations/1006/ (sections 1006.2, .6, .10, .14, .18, .22, .26, .30, .34, .38, .42, .100; Appendix B Model Form B-1)
- CFPB Debt Collection Rule FAQs: https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/debt-collection/debt-collection-rule-faqs/
- CFPB Model Validation Notice (Form B-1): https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/debt-collection/
- FDCPA, 15 U.S.C. 1692-1692p: https://www.law.cornell.edu/uscode/text/15/chapter-41/subchapter-V
- 90 FR 20084 (May 12, 2025), withdrawal of CFPB guidance incl. pay-to-pay (87 FR 39733) and time-barred debt (88 FR 26475) advisory opinions: https://www.federalregister.gov/documents/2025/05/12/2025-08286
- TCPA 47 U.S.C. 227; 47 CFR 64.1200: https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200
- FCC 24-17 Declaratory Ruling (AI-generated voices are "artificial"), CG Docket 23-362: https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf
- FCC consent-revocation order, Fed. Reg. doc. 2026-21821 (Oct. 26, 2026; revised 64.1200(a)(10) effective Nov. 25, 2026): https://www.federalregister.gov/ (search 2026-21821)
- FCC 2008 ACA International Declaratory Ruling, 23 FCC Rcd 559
- FTC Statement of Policy on Decedents' Debts, 76 FR 44915 (2011): https://www.ftc.gov/legal-library/browse/federal-register-notices/statement-policy-regarding-communications-connection-collection-decedents-debts
- SCRA 50 U.S.C. 3931, 3937; Bankruptcy 11 U.S.C. 362, 524; GLBA 15 U.S.C. 6801-6809; Reg P 12 CFR 1016 (App. A model form); Reg E 12 CFR 1005.10(b); E-SIGN 15 U.S.C. 7001(c); FCRA 15 U.S.C. 1681s-2, 1681c-2
- Evory v. RJM Acquisitions Funding LLC, 505 F.3d 769 (7th Cir. 2007)

Texas
- Tex. Fin. Code ch. 392 (392.101, .202, .301-.304, .307, .308): https://statutes.capitol.texas.gov/Docs/FI/htm/FI.392.htm
- Tex. Civ. Prac. & Rem. Code 16.004: https://statutes.capitol.texas.gov/Docs/CP/htm/CP.16.htm

Industry and security references (style inspiration only, not legal authority)
- Tratta, effective debt collection scripts: https://www.tratta.io/blog/effective-debt-collection-scripts
- Squaretalk, collection call scripts guide
- Ainora, AI right-party-contact verification article
- PCI Security Standards Council, telephone-based payment card data guidance; CTIA Messaging Principles & Best Practices

## Counsel review checklist (open legal questions)
1. **State scope:** confirm the list of states with no license or registration requirement for this business model. Many states license debt buyers separately from agencies, and some states only exempt out-of-state collectors.
2. **Texas:** confirm the $10,000 bond is filed with the Secretary of State before any Texas contact (392.101). Confirm 392.202 dispute handling (cease collection until investigation; written response within 30 days) is wired into LTR-040/041. Confirm which 392.307(e) variant applies per account.
3. **TCPA consent:** does the original creditor's prior express consent carry over to the debt buyer or agency for autodialed or AI-voice calls and texts? Under FCC 24-17, AI voice is "artificial voice", so consent is needed for wireless numbers and some residential lines.
4. **AI and recording laws:** state AI or bot disclosure laws, and two-party-consent recording states. The scripts disclose AI and recording on every call, but counsel should confirm the wording and timing.
5. **64.1200(b) identification vs. limited-content message:** can an AI or prerecorded voicemail meet both 64.1200(b) identification and the 1006.2(j) limited-content definition?
6. **FCC revocation order (effective Nov. 25, 2026):** decide whether to designate an exclusive opt-out method, and whether to treat informational opt-outs as category-specific.
7. **Time-barred debt:** confirm statute-of-limitations tables by state, revival rules (payment or acknowledgment), and whether the optional revival warning is required, prohibited, or advisable in each state.
8. **Pay-to-pay fees:** keep at $0 unless counsel confirms express authorization after the 2025 guidance withdrawal (1692f(1); Tex. 392.303(a)(2)).
9. **Credit furnishing:** whether to furnish at all, Metro 2 accuracy, the 1006.30(a) passive-collection bar, and dispute flags.
10. **GLBA/Reg P:** whether the privacy notice is required for this entity and relationship, and the delivery timing.
11. **1099-C / tax note:** confirm the settlement tax language and whether the owner (debt buyer) must issue 1099-C forms.
12. **Electronic delivery:** confirm the 1006.42 safe-harbor procedures for emailing validation notices and the E-SIGN consent flow.
13. **Spanish and other languages:** whether to send Spanish validation notices (1006.34(d)(3)(vi)) and translated scripts.
14. **SMS address requirement:** whether Tex. 392.304(a)(6) (street address or PO box plus phone in written communications) applies to texts and emails. SMS-001 includes the address; the other texts link to the portal.
15. **Settled-in-full promise:** LTR-022 says the account won't be sold or placed again. Confirm the creditor and owner contractually agree before using it on contingency placements.
16. **Third-party trade names:** approve `location_trade_name` and `voicemail_business_name` (must not indicate debt collection, and must be a lawful DBA).
17. **Deceased-consumer and SCRA flows:** confirm estate-representative authority rules and the DMDC check cadence.
18. **Contact frequency:** the defaults are below the Reg F 7-in-7 presumption. Confirm owner limits, including any stricter state limits for in-scope states.
