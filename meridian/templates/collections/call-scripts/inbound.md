---
id: "CALL-002"
title: "Inbound Call"
channel: "voice"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Consumer calls in. Verify first; give mini-Miranda if this is the first communication."
merge_fields: ["agency_name", "consumer_first_name", "is_ai_agent"]
required_disclosures: ["recording notice", "AI disclosure (if AI)", "1006.18(e)"]
send_rules: []
legal_citations: ["15 U.S.C. 1692c (communication in connection with debt collection)", "15 U.S.C. 1692e(11) (mini-Miranda / debt collector disclosure)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)", "FCC 24-17, CG Docket No. 23-362 (Feb. 8, 2024) Declaratory Ruling: AI-generated voices are 'artificial' under the TCPA"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Inbound Call

**Requires counsel review before use.**

**1. Greeting**
> "Thank you for calling {{agency_name}}. {{#is_ai_agent}}I'm an AI assistant and can connect you to a person at any time. {{/is_ai_agent}}This call is recorded. Who am I speaking with?"

**2. Locate account**
> "Do you have the reference number from your letter, text, or email?"
- If not: ask for full name and the ZIP code of the address on the letter. Never confirm whether a person has an account until verified.

**3. Verify**
> "For your privacy, please tell me your date of birth and your current ZIP code."
- 2 failures -> "I'm sorry, I can't verify your identity, so I can't share account details. If you have a letter from us, the reference number will help." Offer callback or written contact.
- Caller is a third party (spouse, relative, attorney, estate representative):
  - Spouse, parent of a minor consumer, guardian, executor, administrator, or confirmed successor in interest = "consumer" under 1006.6(a); verify relationship and authority before discussing.
  - Attorney -> take name, bar number, firm, phone; flag `ATTORNEY_REP`; send LTR-074.
  - Anyone else -> "I'm sorry, I can only discuss this matter with {{consumer_first_name}} directly." Do not confirm a debt exists.

**4. Disclosure**
- No prior communication: "{{agency_name}} is a debt collector. This is an attempt to collect a debt, and any information obtained will be used for that purpose."
- Otherwise: "Just so you know, this call is from a debt collector."

**5. Reason for call**
> "How can I help you today?"
Route: pay -> payment-handoff.md; plan/settlement -> negotiation-settlement-objections.md; dispute -> outbound-right-party-contact.md step 7a; letter questions -> explain the notice plainly; complaint -> escalation-to-human.md.

**6. Close**
Recap any agreement, confirm written confirmation, record contact preferences.
