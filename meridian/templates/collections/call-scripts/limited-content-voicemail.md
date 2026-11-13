---
id: "CALL-004"
title: "Reg F Limited-Content Voicemail (1006.2(j))"
channel: "voicemail"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "The only voicemail allowed without making it a 'communication'. Contains ONLY the required and optional elements of 1006.2(j). Adding anything else, including 'debt collector', the creditor name, or 'regarding an account', removes the safe harbor and creates third-party disclosure risk."
merge_fields: ["agency_phone", "callback_window", "collector_name", "message_date", "message_time", "voicemail_business_name"]
required_disclosures: ["none (limited-content message is not a communication; 1006.18(e) comment 18(e)-1)"]
send_rules: []
legal_citations: ["12 CFR 1006.2(j) (limited-content message)", "12 CFR 1006.14(b) (call frequency; 7-in-7 presumptions)", "12 CFR 1006.14(g) (meaningful disclosure of identity)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "47 CFR 64.1200 (TCPA rules; (a)(10) consent revocation; (b) artificial-voice identification)", "FCC 24-17, CG Docket No. 23-362 (Feb. 8, 2024) Declaratory Ruling: AI-generated voices are 'artificial' under the TCPA"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Reg F Limited-Content Voicemail (1006.2(j))

**Requires counsel review before use.**

**Required elements (1006.2(j)(1))**: (i) business name that does not indicate debt collection, (ii) request to reply, (iii) name of one or more natural persons to contact, (iv) phone number.
**Optional elements (1006.2(j)(2))**: salutation; date and time of message; suggested dates/times to reply; statement that the consumer may speak to any representative.

**Standard version**
> "Hi, this is {{collector_name}} calling from {{voicemail_business_name}}. Please contact me at {{agency_phone}}."

**Full version (all optional elements)**
> "Hello, this is {{collector_name}} calling from {{voicemail_business_name}}. It is {{message_time}} on {{message_date}}. Please contact me or any of our representatives at {{agency_phone}}, {{callback_window}}."

**DO NOT add**: the consumer's name in a way that confirms identity to listeners at a shared number; "debt", "collection", "account", "balance", "payment", the creditor's name, urgency ("important", "time-sensitive", "final"), legal words, or a reference number.

**Voice-AI / prerecorded voicemail note:** a message delivered with an AI or prerecorded voice is an artificial-voice call under the TCPA (FCC 24-17) and needs prior express consent for cell phones. Ringless voicemail counts as a "call" for Reg F frequency (1006.14(b) comment). Counsel to confirm whether 47 CFR 64.1200(b) caller-identification elements must be added for artificial-voice messages, and how that interacts with the limited-content definition (open question).

`{{voicemail_business_name}}` must be a counsel-approved name that does not indicate collection (e.g., a neutral trade name registered as a DBA).
