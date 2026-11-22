---
id: "LTR-001-ES"
title: "Aviso de validación Reg F (borrador en español)"
channel: "letter"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Spanish draft of the validation notice. Not the CFPB Spanish model form. Counsel must compare it to Model Form B-1 before mailing."
subject: ""
merge_fields: ["agency_name", "agency_mailing_address", "agency_phone", "notice_date", "consumer_name", "consumer_mailing_address", "account_ref", "current_creditor", "account_type", "creditor_on_itemization_date", "account_last4", "itemization_date", "amount_on_itemization_date", "interest_since_itemization", "fees_since_itemization", "payments_credits_since_itemization", "current_balance", "validation_end_date"]
required_disclosures: ["1006.18(e)(1)", "validation information 1006.34"]
send_rules: ["Do not mail until counsel approves the Spanish wording", "validation_end_date must be computed, never hand-typed"]
legal_citations: ["12 CFR 1006.34", "12 CFR Part 1006 Appendix B Model Form B-1"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. Not the CFPB Spanish model form. -->

# Aviso de validación (borrador)

**Requiere revisión de un abogado antes de usarse.**

{{agency_name}}
{{agency_mailing_address}}
{{agency_phone}}

{{notice_date}}

{{consumer_name}}
{{consumer_mailing_address}}

Referencia: {{account_ref}}

{{agency_name}} es un cobrador de deudas. Estamos tratando de cobrar una deuda que usted debe a {{current_creditor}}. Usaremos cualquier información que nos dé para ayudar a cobrar la deuda.

Nuestra información muestra:

Usted tenía una cuenta de {{account_type}} de {{creditor_on_itemization_date}} con un número que termina en {{account_last4}}.

Al {{itemization_date}}, usted debía: ${{amount_on_itemization_date}}
Interés desde entonces: ${{interest_since_itemization}}
Cargos desde entonces: ${{fees_since_itemization}}
Pagos o créditos desde entonces: ${{payments_credits_since_itemization}}
Monto total de la deuda ahora: ${{current_balance}}

¿Cómo puede disputar la deuda? Llámenos o escríbanos antes del {{validation_end_date}}.
