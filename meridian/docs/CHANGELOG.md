# Collections changelog

Capabilities added to the Meridian collections desk on this pull request. The desk stays in sandbox. A live channel runs only when `MERIDIAN_CHANNEL_DELIVER=live` and that feature's own flag are both set. This list is not legal advice.

## Eligibility, import, and the gate

- Portfolio import from CSV, xlsx, and fixed-width, with column mapping, dedupe, chain of title, charge-off, and Reg F itemization. A 100,000-row synthetic file imported in 1.7 seconds.
- State table for all 50 states and D.C. Collection is limited to the no-license states plus Texas. Uncertain rows stay ineligible. Texas is the Tex. Fin. Code § 392.101 bond.
- The compliance gate blocks outreach and the payment portal for ineligible, ceased, disputed, bankrupt, deceased, military, and attorney-represented accounts.
- Calling window 8:00 a.m.–9:00 p.m. local, 7-in-7, and the seven-day conversation wait. Unknown ZIP codes are blocked.
- Limitation years are filled, with citations and `needs_counsel_review`, for TX, GA, MO, MT, NH, OH, SC, SD, VT, and VA. Every other state stays blank. Counsel can edit the table.
- Reg F validation end date and a one-page Model Form B-1 layout. It is not the CFPB's designed file. When the limitations date on file is past, the PDF says this draft does not include the state time-barred notice. Counsel must add that notice before mailing.
- An NSF or reversal restores the balance and sends a draft email through the compliance gate. The notice does not ask for another debit, and no bank account number is stored.
- Approving a reply that asks for payment stays pending when the limitations date on file is past. The email is held, and the draft is not marked sent.

## Consumer, client, and public surfaces

- Consumer portal for lookup, itemization, dispute, plans, and sandbox payment. No account number in the URL.
- Public agency site with counsel banners and `{{agency_name}}` until the brand is set.
- Client portal bound to one seller. A client cannot see or recall another seller's accounts.
- Complaint intake with a 15-day operational date marked for counsel.
- ACH sandbox authorization under 12 CFR § 1005.10(b), NSF reversal, and receipts that still pass the gate.
- English and Spanish portal copy and templates, marked for counsel. Skip link, labels, and visible focus on the portal. Lookup and account errors are announced and moved into keyboard focus. Spanish drafts cover privacy, the bank debit, and the limitations hold. This is not a formal accessibility audit.

## Voice, campaigns, and the collector floor

- Sandbox voice console with mini-Miranda, recording consent from a per-state table, encrypted transcripts, and guardrails. If the limitations date on file is in the past, the assistant does not offer a plan or a payment page, and SMS, email, and letter payment or settlement asks stay held. The mail queue pauses those letters before filing, including one that was already queued, and replaces the stored PDF with the hold note. A paused settling letter is not marked sent. The consumer portal does not offer a plan, a test payment, or a bank debit after that date, and the server refuses those actions. The portal route returns that refusal, a dispute still records, and the refusal is counted only on that workspace's operations page and weekly digest. The operations page says the time_barred count is still a draft notice. A scheduled settlement text is held even when the message body is empty. The counsel-reviewed time-barred notices can still be sent. A blank limitations date does not trigger the hold.
- Live Twilio or Telnyx dialing only behind `MERIDIAN_VOICE_LIVE=enabled` and live delivery, with signature checks, encrypted recordings, and a hangup on the kill switch.
- Account 360 timeline, click-to-call pre-check, after-call wrap, promise-to-pay, and broken-promise tasks.
- Presence board, paced campaign dialer, and a daily scorecard.
- Training accounts, scripted scenarios, and a quiz. Collectors and managers need four of five answers before a live dial.
- Keyboard shortcuts, bulk task completion, a sticky account header, and dark mode that follows the system unless Light or Dark is chosen.

## Letters, payments, and providers

- SMS, email, letter, and payment adapters. Sandbox is the default. Stop, bounce, and unsubscribe webhooks are accepted with a sandbox header or a provider signature.
- Every letter template can render to a one-page PDF and wait in the mail-house queue. Lob runs only behind its flag and live delivery. Returned mail pauses later letter steps.
- Sequences and a visual workflow builder. Every step goes through the gate. Unapproved templates do not send. Send approval and the counsel flag are stored per workspace.
- Settlement matrix, account preview, counter-offers, dual approval above a threshold, and a hold before a settling letter. Default matrix values still block an offer. A time-barred account uses the matrix time-barred tier. The preview is marked for counsel.
- Portfolio cost, an illustrative recovery curve, cash-on-cash, model IRR, seller scorecards, and a final remittance statement. All of the curve and IRR figures are labeled model estimates. The collections report download is a draft operations file, not a client invoice, and it does not include account numbers. Counsel should confirm the fee percent.

## Compliance operations

- MFA for admin and compliance before privileged actions, including reveal.
- SCRA and FCC reassigned-number adapters. Sandbox returns unknown and does not clear anyone.
- Bankruptcy and deceased scrubs. Sandbox returns unknown. A hit holds the account. The history log has no consumer name.
- Metro 2 export stays off until the flag is on and owner and compliance have both approved that workspace. A sandbox reassigned-number clear on one agency does not clear the other. The daily cap, inbound block, discount percent, and plan length are stored per workspace and the gate uses that workspace's numbers. The ops page and the weekly digest show those limits. Aether uses the packaged defaults until that desk saves its own. State eligibility stays install-wide.
- GLBA Safeguards draft, access review, incident playbook, tabletop checklist, and a per-workspace outbound freeze.
- Retention purge, job worker, redacted logs, seated metrics, OpenTelemetry only when an endpoint is set, and a weekly compliance digest that emails only behind the digest flag and live delivery. The subject names the workspace. A compliance seat limited to one workspace is left off the other digest.
- Workspace isolation between Triton and Example Harbor on Aether. Each workspace keeps its own limitations table, recording table, and brand for letters and notices. The public site stays on the Triton brand. Env brand values still win. State eligibility stays one table for the install.
- Next.js 15.5.29. `npm audit` reports 0 critical and 0 high. CI fails on a new critical. SQLite waits up to five seconds when the desk file is busy instead of failing the account write immediately.

## Hosts

- `crm.debtmarket.net` stays the Access-protected desk. `collect.debtmarket.net` serves the public agency site and consumer portal and does not serve `/w`.
- Consumer links use `MERIDIAN_PUBLIC_URL`. First go-live keeps `MERIDIAN_CHANNEL_DELIVER=sandbox`.
- The owner seat for `portfolios@debtmarket.net` is created from `MERIDIAN_OWNER_PASSWORD`. The password must be 12 to 128 characters. A shorter password does not create the seat and does not stop the desk. The password is not written into git. MFA is still required before privileged actions.
- A freeze drill checks voice, SMS, email, and letters, then lifts the freeze unless that workspace was already frozen. It does not place a live call while delivery is sandbox.
- The counsel packet lists draft surfaces. Those flags stay on until counsel signs them.

## Still partial

These match the status table. They are not finished by this changelog.

- Limitations for states outside the cited no-license set and Texas stay blank for counsel.
- The validation PDF follows Model Form B-1 section order. It is not the CFPB designed file.
- SCRA and reassigned-number checks stay sandbox. Unknown is not a clearance.
- Card checkout and ACH stay sandbox. No bank account number is stored.
- Portal accessibility and privacy copy are drafts. This is not a formal WCAG audit.
- Metro 2 and the Safeguards pack stay drafts until counsel and both approvers sign.
- Settlement authority, the limitations table, the recording table, and the saved brand are stored per workspace. The public site stays on the Triton brand. Env brand values still win. State eligibility stays install-wide. The desk kill switch freezes only that workspace.
- The weekly compliance digest names its workspace and does not include consumer names, emails, or account references. A digest for one workspace is not listed in the other.

## Still for the owner and counsel

Counsel review, the Texas bond on file, a private repository, MFA enrollment, owner-set settlement values, and vendor keys only after those are done. See `docs/OWNER-ONBOARDING.md`.
