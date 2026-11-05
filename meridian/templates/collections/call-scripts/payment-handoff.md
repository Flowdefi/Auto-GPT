---
id: "CALL-006"
title: "Payment-Taking Handoff (PCI-safe)"
channel: "voice"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Moves the consumer to a secure payment capture so no card or bank numbers are spoken into a recorded or AI-transcribed channel."
merge_fields: ["agency_name", "agency_phone", "confirmation_number", "is_settlement", "link_expiry_minutes", "masked_destination", "payment_amount", "payment_date", "payment_method_description", "payment_status", "plan_first_payment_date", "plan_frequency", "plan_number_of_payments", "plan_payment_amount", "portal_url", "settlement_amount"]
required_disclosures: ["no-fee statement", "amount/date confirmation", "Reg E authorization for recurring debits"]
send_rules: []
legal_citations: ["PCI DSS v4.0 / PCI SSC guidance on protecting telephone-based payment card data", "12 CFR 1005.10(b) (preauthorized electronic fund transfers: written authorization, copy to consumer)", "15 U.S.C. 1692f (unfair practices)", "15 U.S.C. 1692f(1) (no amounts not authorized by agreement or law)", "Tex. Fin. Code 392.303 (unfair or unconscionable means; unauthorized fees)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Payment-Taking Handoff (PCI-safe)

**Requires counsel review before use.**

**Rules**
- The AI agent and call recording/transcription must NEVER receive PAN, CVV, full bank account or routing numbers. Use one of: (a) DTMF masking / secure IVR, (b) SMS/email secure payment link (only to a number/email with consent and 1006.6(d) procedures), or (c) the portal at {{portal_url}}.
- Pause recording and transcription before any secure capture that is not DTMF-masked; resume after.
- No convenience or processing fees by default (`fees.convenience_fee_enabled = false`).
- Post-dated payment more than 5 days out: send written pre-deposit notice 3-10 business days before (1692f(2)).
- Recurring debits: authorization must be in writing or similarly authenticated with a copy to the consumer (Reg E 1005.10(b)). Read the authorization text, then send LTR-030.

**Script**
1. Confirm terms: "So that's ${{payment_amount}} on {{payment_date}}{{#is_settlement}}, as part of a settlement of ${{settlement_amount}}{{/is_settlement}}. There's no fee for paying by phone or online."
2. Choose method: "For your security, I won't ask you to read your card or bank numbers to me. I can either (a) transfer you to our secure keypad system, where you'll type the numbers on your phone and I won't hear them, or (b) text or email you a secure payment link. Which do you prefer?"
3a. Keypad: "I'm transferring you now. After the tone, enter your card number using your keypad." -> `secure_ivr.transfer(session_id)`; on return the agent receives only `{status, last4, confirmation_number}`.
3b. Link: "I've sent a secure link to {{masked_destination}}. It expires in {{link_expiry_minutes}} minutes." -> `send_payment_link(session_id)`.
4. Recurring: "You're authorizing {{agency_name}} to debit ${{plan_payment_amount}} {{plan_frequency}} from your {{payment_method_description}} starting {{plan_first_payment_date}} for {{plan_number_of_payments}} payments. You can cancel by calling us at {{agency_phone}} at least 3 business days before a payment. Do you authorize this?" Capture explicit "yes" and send written copy.
5. Confirm: "Your payment was {{payment_status}}. Your confirmation number is {{confirmation_number}}. You'll get a written confirmation."
6. Failure: "That payment didn't go through. Would you like to try a different method or a different date?" Never imply penalties.
