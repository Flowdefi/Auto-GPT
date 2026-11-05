---
id: "SMS-001-ES"
title: "Primer mensaje de texto (borrador en español)"
channel: "sms"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Spanish draft of the first text. Counsel must review it. No balance in the text."
merge_fields: ["agency_name", "consumer_first_name", "portal_url", "agency_phone"]
required_disclosures: ["1006.18(e)(1)", "opt-out method"]
send_rules: ["Honor STOP", "No balance in the text"]
legal_citations: ["12 CFR 1006.6(e)", "47 CFR 64.1200"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

{{agency_name}}: Mensaje para {{consumer_first_name}}. Somos un cobrador de deudas. Este es un intento de cobrar una deuda y cualquier información obtenida se utilizará con ese fin. Detalles: {{portal_url}} Tel. {{agency_phone}}. Responda STOP para no recibir más textos.
