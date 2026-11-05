---
id: "LTR-070"
title: "Bankruptcy Notice Acknowledgment / Collection Stopped"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Sent to the consumer (or their bankruptcy attorney if represented) confirming collection stopped after notice of a bankruptcy filing. Contains NO demand for payment."
merge_fields: ["account_ref", "agency_mailing_address", "agency_name", "agency_phone", "bankruptcy_case_number", "bankruptcy_chapter", "bankruptcy_court", "bankruptcy_filing_date", "bankruptcy_notice_date", "consumer_name", "letter_date", "recipient_mailing_address", "recipient_name"]
required_disclosures: ["1006.18(e)(2)"]
send_rules: ["On any bankruptcy notice: freeze all channels immediately, remove from dialer/SMS/email/voice AI queues, notify client/owner", "If consumer has a bankruptcy attorney, send to attorney only (1006.6(b)(2))", "Counsel decides whether ANY letter is sent; default = send to attorney if known, otherwise consumer", "No payment request, no portal link"]
legal_citations: ["11 U.S.C. 362 (automatic stay)", "11 U.S.C. 524 (discharge injunction)", "12 CFR 1006.6(b)(2) (consumer represented by attorney)", "12 CFR 1006.30(b) (prohibited sale/transfer: paid, settled, bankruptcy-discharged, ID theft)", "15 U.S.C. 1692e (false or misleading representations)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Bankruptcy Notice Acknowledgment / Collection Stopped

**Requires counsel review before use.**

{{agency_name}}
{{agency_mailing_address}}
{{agency_phone}}

{{letter_date}}

{{recipient_name}}
{{recipient_mailing_address}}

Re: {{consumer_name}}, Reference {{account_ref}}
Bankruptcy case: {{bankruptcy_case_number}}, Chapter {{bankruptcy_chapter}}, {{bankruptcy_court}}, filed {{bankruptcy_filing_date}}

We received notice on {{bankruptcy_notice_date}} of the bankruptcy case listed above. We have stopped all collection activity on this account. This letter is for information only and is not a request for payment.

If this account is not included in the bankruptcy, or the information above is incorrect, please contact us at {{agency_phone}}.

{{agency_name}}

This communication is from a debt collector.
