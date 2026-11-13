---
id: "CALL-001"
title: "Outbound Call: Right-Party Contact"
channel: "voice"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Live-agent or voice-AI outbound collection call. Verifies identity BEFORE disclosing anything about the debt, then gives mini-Miranda."
merge_fields: ["account_last4", "agency_hours", "agency_mailing_address", "agency_name", "agency_phone", "collector_name", "confirmation_channel", "consumer_first_name", "consumer_name", "current_balance", "current_creditor", "dispute_partial", "dispute_portal_url", "disputed_amount", "is_ai_agent", "notice_date", "original_creditor", "recap_statement", "time_barred", "validation_end_date", "within_validation_period"]
required_disclosures: ["recording notice", "AI disclosure (if AI)", "1006.18(e)(1) or (e)(2)", "meaningful identity disclosure (1006.14(g))"]
send_rules: []
legal_citations: ["15 U.S.C. 1692b (acquisition of location information)", "15 U.S.C. 1692c (communication in connection with debt collection)", "15 U.S.C. 1692e(11) (mini-Miranda / debt collector disclosure)", "12 CFR 1006.6(b)(1) (inconvenient times/places; 8 a.m.-9 p.m. presumption)", "12 CFR 1006.14(b) (call frequency; 7-in-7 presumptions)", "12 CFR 1006.14(g) (meaningful disclosure of identity)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "47 U.S.C. 227 (TCPA)", "FCC 24-17, CG Docket No. 23-362 (Feb. 8, 2024) Declaratory Ruling: AI-generated voices are 'artificial' under the TCPA", "Tex. Fin. Code 392.302 (harassment; abuse)", "Tex. Fin. Code 392.304 (misleading representations; (a)(4) creditor name, (a)(5) debt collector disclosures, (a)(6) address/phone, (a)(16)-(17) attorney)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Outbound Call: Right-Party Contact

**Requires counsel review before use.**

**Pre-dial gates (system-enforced, not read aloud)**
- Consumer local time between 8:00 a.m. and 9:00 p.m. (use the most restrictive if time zone is uncertain) and not a time/place the consumer said is inconvenient (1006.6(b)(1)).
- Fewer than 7 call attempts on this debt in the last 7 days, and no telephone conversation on this debt in the last 7 days (1006.14(b)(2)); stricter owner limits in settlement-matrix.json `contact_policy` apply.
- No cease, attorney-representation, bankruptcy, deceased-unverified, disputed-unverified, out-of-scope-state, or do-not-call flag.
- Not calling a known workplace number where the consumer said calls are not allowed (1006.6(b)(3)).
- For AI/prerecorded voice or autodialed calls to a cell phone: documented prior express consent on file (47 U.S.C. 227(b); FCC 24-17).

**1. Opening (no debt information yet)**
> "Hello, may I please speak with {{consumer_name}}?"

- If a different person answers or asks why you're calling, go to **call-scripts/third-party-location.md**. Do not mention debt, collection, the creditor, or that we're a collection agency.
- If the consumer is not available: "Thank you, I'll try again another time." Do not leave a detailed message with anyone.

**2. Identify caller and disclose recording / AI (once the person says they are {{consumer_name}})**
> "Thanks. My name is {{collector_name}}, calling from {{agency_name}}. {{#is_ai_agent}}I'm an automated AI assistant, and I can connect you to a person at any time. {{/is_ai_agent}}This call is being recorded."

**3. Verify identity before disclosure**
> "To protect your privacy, I need to verify your identity before we go further. Could you please tell me your date of birth and the ZIP code of your current address?"

- The consumer must say the values; never read them out. System compares silently. Do NOT ask for a Social Security number.
- 2 failed attempts -> "I'm sorry, I'm not able to verify your identity, so I can't discuss this further. You're welcome to call us at {{agency_phone}}." End call; disposition `RPC_UNVERIFIED`.

**4. Mini-Miranda (immediately after verification)**
- First communication ever with this consumer:
> "Thank you. {{agency_name}} is a debt collector. This is an attempt to collect a debt, and any information obtained will be used for that purpose."
- Later communications:
> "Thank you. As a reminder, this call is from a debt collector."

**5. Purpose and account facts**
> "I'm calling about an account with {{original_creditor}}, ending in {{account_last4}}. It is now owed to {{current_creditor}}. Our records show a balance of ${{current_balance}}."

{{#within_validation_period}}
> "We sent you a notice on {{notice_date}} explaining the debt and your rights. You have until {{validation_end_date}} to dispute it or request the original creditor's name and address, and you can do that by calling or writing to us."
(Do not pressure for payment in a way that overshadows these rights.)
{{/within_validation_period}}
{{#time_barred}}
> "Because of the age of this debt, {{current_creditor}} will not sue you for it." (Never mention lawsuits, court, or legal action otherwise.)
{{/time_barred}}

**6. Discovery (open question, then listen)**
> "What's your situation with this account right now?"
Route by response: dispute -> step 7a; hardship / can't pay / settlement -> **negotiation-settlement-objections.md**; wants to pay -> step 8.

**7a. Dispute**
> "I understand. I'll note that you dispute this debt{{#dispute_partial}}, specifically ${{disputed_amount}}{{/dispute_partial}}. You can also send it in writing to {{agency_mailing_address}} or at {{dispute_portal_url}}. When we receive a written dispute we'll pause collection on the disputed amount until we send you verification."
Disposition `DISPUTE_ORAL`; trigger LTR-040.

**8. Payment options**
> "We have a few options: pay the full balance, set up a monthly plan, or, for some accounts, a reduced payoff. Which would you like to look at?"
- All payment details go through **payment-handoff.md**. Never take card or bank numbers by voice into a recorded/AI-transcribed channel.

**9. Recap and close**
> "To confirm, {{recap_statement}}. You'll receive written confirmation by {{confirmation_channel}}. Is there a best time and way to reach you in the future?"
- Record time/place/medium preferences (1006.6(b)(1), 1006.14(h)).
> "Thank you for your time, {{consumer_first_name}}. You can reach us at {{agency_phone}}, {{agency_hours}}."

**Always-on rules during the call**
- If consumer says "stop calling", "don't call me at work", "I have a lawyer", "I filed bankruptcy", or "this is a wrong number": acknowledge, honor immediately, and use the matching branch in **negotiation-settlement-objections.md**.
- If consumer asks for a human: **escalation-to-human.md** immediately.
