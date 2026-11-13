---
id: "CALL-007"
title: "Escalation to Human"
channel: "voice"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "When and how the AI or a junior collector must hand off to a supervisor or human collector."
merge_fields: ["escalation_role"]
required_disclosures: []
send_rules: []
legal_citations: ["15 U.S.C. 1692d (harassment or abuse)", "15 U.S.C. 1692e (false or misleading representations)", "FCC 24-17, CG Docket No. 23-362 (Feb. 8, 2024) Declaratory Ruling: AI-generated voices are 'artificial' under the TCPA"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Escalation to Human

**Requires counsel review before use.**

**Mandatory escalation triggers (AI must transfer or schedule a human callback)**
- Consumer asks for a person, supervisor, or manager (any wording).
- Consumer says they are being harassed, threatens to file a complaint, or mentions CFPB, FTC, state AG, BBB, or a lawsuit against us.
- Settlement request below `floor_pct`, plan longer than `max_plan_months`, or any fee waiver/balance adjustment.
- Identity theft, fraud, deceased consumer, bankruptcy questions beyond intake, SCRA, or legal questions.
- Signs of vulnerability: confusion, apparent cognitive impairment, severe distress, mentions of self-harm, minors.
- Consumer is abusive after one de-escalation attempt, or the AI is unsure what to say.
- AI confidence below `escalation.confidence_threshold` or any guardrail tripwire fired.

**Self-harm/crisis**: "I'm really sorry you're feeling this way. If you are in immediate danger, please call 911. You can also call or text 988 to reach the Suicide & Crisis Lifeline any time." Pause collection; escalate to supervisor; disposition `WELFARE_CONCERN`.

**Transfer script**
> "I'm going to connect you with {{escalation_role}} who can help with that. Please hold for a moment." (warm transfer with summary passed to the human)
If no human is available:
> "I'm sorry, no one is available right now. Can I schedule a call back from a person? What day and time works for you?" Log callback; never keep collecting after a human was requested.

**Handoff summary passed to the human (not read aloud)**: verified status, disclosures given, consumer's stated issue, offers already made, flags raised.
