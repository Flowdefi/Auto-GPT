# Collections changelog

Capabilities added to the Meridian collections desk on this pull request. The desk stays in sandbox. A live channel runs only when `MERIDIAN_CHANNEL_DELIVER=live` and that feature's own flag are both set. This list is not legal advice.

## Eligibility, import, and the gate

- Portfolio import from CSV, xlsx, and fixed-width, with column mapping, dedupe, chain of title, charge-off, and Reg F itemization. A 100,000-row synthetic file imported in 1.7 seconds.
- State table for all 50 states and D.C. Collection is limited to the no-license states plus Texas. Uncertain rows stay ineligible. Texas is the Tex. Fin. Code § 392.101 bond.
- The compliance gate blocks outreach and the payment portal for ineligible, ceased, disputed, bankrupt, deceased, military, and attorney-represented accounts.
- Calling window 8:00 a.m.–9:00 p.m. local, 7-in-7, and the seven-day conversation wait. Unknown ZIP codes are blocked.
- Limitation years are filled, with citations and `needs_counsel_review`, for TX, GA, MO, MT, NH, OH, SC, SD, VT, and VA. Every other state stays blank. Counsel can edit the table.
- Reg F validation end date and a one-page Model Form B-1 layout. It is not the CFPB's designed file.

## Consumer, client, and public surfaces

- Consumer portal for lookup, itemization, dispute, plans, and sandbox payment. No account number in the URL.
- Public agency site with counsel banners and `{{agency_name}}` until the brand is set.
- Client portal bound to one seller. A client cannot see or recall another seller's accounts.
- Complaint intake with a 15-day operational date marked for counsel.
- ACH sandbox authorization under 12 CFR § 1005.10(b), NSF reversal, and receipts that still pass the gate.
- English and Spanish portal copy and templates, marked for counsel. Skip link, labels, and visible focus on the portal.

## Voice, campaigns, and the collector floor

- Sandbox voice console with mini-Miranda, recording consent from a per-state table, encrypted transcripts, and guardrails.
- Live Twilio or Telnyx dialing only behind `MERIDIAN_VOICE_LIVE=enabled` and live delivery, with signature checks, encrypted recordings, and a hangup on the kill switch.
- Account 360 timeline, click-to-call pre-check, after-call wrap, promise-to-pay, and broken-promise tasks.
- Presence board, paced campaign dialer, and a daily scorecard.
- Training accounts, scripted scenarios, and a quiz. Collectors and managers need four of five answers before a live dial.
- Keyboard shortcuts, bulk task completion, a sticky account header, and dark mode that follows the system unless Light or Dark is chosen.

## Letters, payments, and providers

- SMS, email, letter, and payment adapters. Sandbox is the default. Stop, bounce, and unsubscribe webhooks are accepted with a sandbox header or a provider signature.
- Every letter template can render to a one-page PDF and wait in the mail-house queue. Lob runs only behind its flag and live delivery. Returned mail pauses later letter steps.
- Sequences and a visual workflow builder. Every step goes through the gate. Unapproved templates do not send.
- Settlement matrix, account preview, counter-offers, dual approval above a threshold, and a hold before a settling letter. Default matrix values still block an offer. The preview is marked for counsel.
- Portfolio cost, an illustrative recovery curve, cash-on-cash, model IRR, seller scorecards, and a final remittance statement. All of the curve and IRR figures are labeled model estimates.

## Compliance operations

- MFA for admin and compliance before privileged actions, including reveal.
- SCRA and FCC reassigned-number adapters. Sandbox returns unknown and does not clear anyone.
- Bankruptcy and deceased scrubs. Sandbox returns unknown. A hit holds the account. The history log has no consumer name.
- Metro 2 export stays off until the flag is on and owner and compliance have both approved. Accounts with no validation notice are excluded.
- GLBA Safeguards draft, access review, incident playbook, tabletop checklist, and a per-workspace outbound freeze.
- Retention purge, job worker, redacted logs, seated metrics, OpenTelemetry only when an endpoint is set, and a weekly compliance digest that emails only behind the digest flag and live delivery.
- Workspace isolation between Triton and Example Harbor on Aether.
- Next.js 15.5.29. `npm audit` reports 0 critical and 0 high. CI fails on a new critical.

## Hosts

- `crm.debtmarket.net` stays the Access-protected desk. `collect.debtmarket.net` serves the public agency site and consumer portal and does not serve `/w`.
- Consumer links use `MERIDIAN_PUBLIC_URL`. First go-live keeps `MERIDIAN_CHANNEL_DELIVER=sandbox`.
- The owner seat for `portfolios@debtmarket.net` is created from `MERIDIAN_OWNER_PASSWORD`. The password must be 12 to 128 characters. A shorter password does not create the seat and does not stop the desk. The password is not written into git. MFA is still required before privileged actions.
- A freeze drill checks voice, SMS, email, and letters, then lifts the freeze unless that workspace was already frozen. It does not place a live call while delivery is sandbox.
- The counsel packet lists draft surfaces. Those flags stay on until counsel signs them.

## Still for the owner and counsel

Counsel review, the Texas bond on file, a private repository, MFA enrollment, owner-set settlement values, and vendor keys only after those are done. See `docs/OWNER-ONBOARDING.md`.
