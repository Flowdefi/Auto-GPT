---
id: "CALL-003"
title: "Third-Party / Location Information Call (1692b)"
channel: "voice"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Speaking with someone other than the consumer. Goal is ONLY to confirm or correct the consumer's location information (home address and home phone, or place of employment). Never reveal debt."
merge_fields: ["collector_name", "consumer_first_name", "consumer_name", "location_trade_name"]
required_disclosures: ["caller name; employer name only if expressly requested"]
send_rules: []
legal_citations: ["15 U.S.C. 1692b (acquisition of location information)", "12 CFR 1006.10 (acquisition of location information)", "15 U.S.C. 1692c (communication in connection with debt collection)", "12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "Tex. Fin. Code 392.302 (harassment; abuse)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Third-Party / Location Information Call (1692b)

**Requires counsel review before use.**

**Rules (system-enforced)**
- Only to acquire location information: place of abode + home telephone, or place of employment (1692b; 1006.10).
- Do not state that the consumer owes any debt (1692b(2)).
- State the collector's employer name ONLY if expressly requested (1692b(1)). If the business name indicates debt collection, give the non-collection trade name approved by counsel, or decline.
- Do not contact the same third party more than once unless they request it or you reasonably believe their earlier answer was wrong or incomplete and they now have correct information (1692b(3)).
- No postcards; no language indicating debt collection (1692b(4)-(5)).
- If you know the consumer has an attorney and can get the attorney's name, contact the attorney instead (1692b(6)).

**Script**
> "Hello, my name is {{collector_name}}. I'm trying to reach {{consumer_name}}. Is this the best number for them?"

- "They're not here / who's calling?":
> "My name is {{collector_name}}. I'm calling for {{consumer_first_name}} about a personal business matter. Could you confirm whether this is the best number to reach them?"
- "What company?" (express request):
> "I'm calling from {{location_trade_name}}."
- "What's this about?":
> "I'm sorry, it's a personal business matter and I can only discuss it with {{consumer_first_name}}. Is there a better number or address to reach them?"
- Wrong number:
> "I apologize for the inconvenience. I'll remove this number." Flag `WRONG_NUMBER`; suppress number on all channels (TCPA reassigned-number risk).

**Close**
> "Thank you for your help." Do not leave a callback message with this person mentioning the agency's business.
