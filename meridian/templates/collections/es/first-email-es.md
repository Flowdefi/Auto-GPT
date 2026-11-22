---
id: "EML-001-ES"
title: "Primer correo (borrador en español)"
channel: "email"
needs_counsel_review: true
template_syntax: "mustache"
subject: "Mensaje de {{agency_name}} para {{consumer_first_name}}"
purpose: "Spanish draft of the first email. Counsel must review it before an owner can approve sending."
merge_fields: ["agency_name", "consumer_first_name", "current_creditor", "portal_url", "email_optout_link", "agency_phone"]
required_disclosures: ["1006.18(e)(1)", "opt-out method"]
send_rules: ["Subject must not reveal the debt to a third party", "Include an opt-out"]
legal_citations: ["12 CFR 1006.6(e)", "12 CFR 1006.18(e)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

Hola {{consumer_first_name}},

{{agency_name}} es un cobrador de deudas. Estamos tratando de cobrar una deuda que usted debe a {{current_creditor}}. Usaremos cualquier información que nos dé para ayudar a cobrar la deuda.

Detalles (se requiere iniciar sesión): {{portal_url}}
Teléfono: {{agency_phone}}

Para dejar de recibir correos: {{email_optout_link}}
