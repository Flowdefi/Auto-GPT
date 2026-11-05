# GLBA Safeguards Rule program pack (draft)

This is a draft written information security program for the Meridian collections desk. It is not a completed Safeguards program, not an attestation, and not legal advice. Counsel and the Qualified Individual must finish it before any real consumer file is loaded. The public GitHub repository must be made private first.

The mapping is to 16 CFR § 314.4 as amended by the 2021 Safeguards Rule.

## 314.4(a) Qualified Individual

| Item | Draft status |
| --- | --- |
| Name a Qualified Individual responsible for the program | Owner must appoint one. The name is blank on purpose. |
| That person reports in writing to the board or equivalent at least annually | Not started. |

## 314.4(b) Risk assessment

Assess, in writing, reasonably foreseeable internal and external risks to customer information. Customer information here includes portfolio files, encrypted identifiers, call transcripts, and portal lookup data.

| Risk | What exists now | Still open |
| --- | --- | --- |
| Public repository | The app refuses live sends by default | Make the repository private before any real file |
| Lost laptop or disk | SQLite and JSON live on the server disk | Encrypt the disk and restrict who can copy `data/` |
| Stolen password | MFA is required before admin, compliance, and reveal actions | Enroll an authenticator for every one of those accounts |
| Over-broad access | Roles and an in-app access review | Review the access report on a schedule the Qualified Individual sets |
| Vendor with a live key | Adapters stay in sandbox until env flags and keys are set | Written vendor review before any key is turned on |
| Credit furnishing too early | Metro 2 export is off and skips accounts with no validation notice | Counsel confirms 12 CFR § 1006.30(a) before any file is sent |

Do not treat this table as the risk assessment. The Qualified Individual writes the real one, including likelihood and impact.

## 314.4(c) Safeguards

| Rule | Control in this app |
| --- | --- |
| (c)(1) Access controls | Seat login, roles, and reveal limited to admin and compliance. The access-review screen lists who can reveal identifiers. |
| (c)(2) Access to data, systems, and facilities | The owner restricts the host. This app does not manage the building or the cloud account. |
| (c)(3) Encryption | SSNs, dates of birth, account numbers, and call transcripts use AES-256-GCM. Transit encryption is the host's HTTPS certificate. |
| (c)(4) Secure development | Changes go through pull requests and `npm run test:collections`. |
| (c)(5) Multi-factor authentication | Admin and compliance must enroll MFA before privileged actions, including reveal. |
| (c)(6) Secure disposal | `npm run jobs:run` purges stored identifiers after the retention window and logs the count only. |
| (c)(7) Change management | Provider, Metro 2, and model flags default to off or sandbox. |
| (c)(8) Monitor unauthorized access | Login rate limits and the access review. A full monitoring stack is not in this app. |

## 314.4(d) Testing and monitoring

The Qualified Individual picks a test schedule. This pack does not claim a penetration test has been done.

## 314.4(e) Training

People who handle portfolio files need training on the gate, the retention clock, and the rule against putting a Social Security number in a URL or a log. The owner records who attended. This file does not record attendance.

## 314.4(f) Vendor oversight

Before a vendor key is used, write down the vendor, the data it would see, the contract, and the date of the review.

| Vendor flag | Data it would see | Default |
| --- | --- | --- |
| Twilio / Telnyx | Phone number and message text | Sandbox, no network |
| SendGrid / Postmark | Email address and message text | Sandbox, no network |
| Lob | Mailing address and letter text | Sandbox, no network |
| Stripe | Amount and account reference. No card number on this server | Sandbox checkout |
| FCC RND | Last four and consent date | Unknown, which blocks a cell call |
| DMDC SCRA | Last name and a duty date. No SSN is sent | Unknown, which is not a clearance |
| Model endpoint | The consumer's message | Rules engine if no endpoint is set |

## 314.4(g) Evaluate and adjust

Re-read this pack when a provider is turned on, when a state rule changes, or after an incident.

## 314.4(h) Incident response

The in-app playbook and tabletop checklist are at `/w/triton/collections/incident`. **Freeze all outbound** engages the kill switch for that workspace only: voice, SMS, email, and letters stop, and active calls on that workspace are ended. The other workspace is left alone. Inbound calls and a consumer-started payment stay available. A live hangup is sent only when the live voice flags are on.

1. The Qualified Individual is told the same day.
2. Stop the affected access. Use the freeze button, or turn the outbound kill switch on. Set `MERIDIAN_METRO2_EXPORT` back to disabled.
3. Preserve logs. Do not copy Social Security numbers into the ticket.
4. Decide notice to consumers and regulators with counsel. This draft does not decide that.
5. Write what changed in the risk assessment.
6. Record the tabletop on the incident page. The saved list is the checklist items, not a consumer file.

## 314.4(i) Report to the board

Once a year, the Qualified Individual reports the status of this program, the access review, the incidents, and the vendors that were turned on. The report is not generated by this file.

## Access review in the app

Open `/w/triton/collections/access-review`. It lists each account, role, MFA, and whether that role can reveal stored identifiers. It does not show password hashes or secrets.
