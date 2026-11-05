# Owner onboarding

This is an operating checklist for a sandbox desk. It is not legal advice. Counsel reviews every citation before a live flag is turned on. Keep this repository private before a real portfolio, SSN, or account number is loaded.

The demo command is `docker compose up --build` in `meridian/`. It seeds Example accounts in two workspaces and does not dial or mail. A 15-minute walkthrough script is at the bottom of this file. The capability list for this pull request is [CHANGELOG.md](CHANGELOG.md).

## 1. Agency name

Set the public name, logo, color, and domain before any letter or email is approved.

- Environment: `MERIDIAN_AGENCY_NAME`, `MERIDIAN_AGENCY_LOGO_URL`, `MERIDIAN_AGENCY_COLOR`, `MERIDIAN_AGENCY_DOMAIN`. A non-empty environment value wins over the screen.
- Screen: `/w/triton/settings/brand`.
- Until a name is set, the public site, portal, letters, and emails show `{{agency_name}}`.

## 2. MFA

Admin and compliance accounts enroll before they change eligibility, templates, the settlement matrix, limitations, recording rules, roles, or Metro 2.

1. Sign in.
2. `POST /api/auth/mfa` with no code. The response is an otpauth URI. Add it to an authenticator app.
3. `POST /api/auth/mfa` with the six-digit code. Enrollment is on when the response says `enabled: true`.
4. Confirm the seat on `/w/triton/collections/access-review`.

## 3. Settlement matrix

Open `/w/triton/collections/settlement`. The shipped numbers are defaults and block offers. Enter the owner's percentages and month caps, then save. Saving requires the admin or compliance role and MFA. Offers stay blocked while `is_default` is still true.

## 4. Template approvals

Open `/w/triton/collections/templates`. Every template ships with `needs_counsel_review` and is disabled until an owner approves it. Approve only after counsel has compared the text, including Spanish copies, with the current regulation. An unapproved template cannot leave the desk, including through a sequence or the mail queue.

## 5. Texas bond

Texas is an eligible state on this desk because it uses a bond, not a license. Tex. Fin. Code § 392.101 requires a third-party debt collector to have a $10,000 surety bond on file with the Texas Secretary of State before collecting from a Texas consumer. Tex. Fin. Code § 392.307 limits suit and arbitration on time-barred debt. This software does not file the bond and does not confirm that one is on file. Do not work a Texas account until the bond is in place and counsel has signed the limitations row (four years under Tex. Civ. Prac. & Rem. Code § 16.004(a)(3), still marked for counsel).

## 6. First portfolio import

Use a file of fake rows first. Names should be Example. Do not use a real SSN; test values stay in the 900 range.

1. Open `/w/triton/collections`.
2. Import CSV, xlsx, or fixed-width. The mapper shows the columns it recognized.
3. Accounts outside the no-license states plus Texas are quarantined. Outreach and the payment portal stay closed for them.
4. Collectors open an account 360, run **Check before dial**, and connect only when the gate allows it. The default is a sandbox walkthrough.
5. A collector or manager passes Training (`/w/triton/collections/training`) before a live dial is allowed. Admins can test the adapter without the quiz.
6. Turn on `MERIDIAN_VOICE_LIVE=enabled` only together with `MERIDIAN_CHANNEL_DELIVER=live`, and only after the repository is private.

## 7. Leave these off until counsel and the keys are ready

- `MERIDIAN_CHANNEL_DELIVER` stays `sandbox`.
- `MERIDIAN_LETTER_PROVIDER=lob` plus live delivery is the only Lob path.
- `MERIDIAN_COMPLIANCE_DIGEST=enabled` plus live delivery and `RESEND_API_KEY` is the only digest email. Otherwise the weekly text is stored on `/w/triton/collections/ops`.
- Metro 2 stays disabled until the env flag is on and owner and compliance have both approved.
- Bankruptcy and deceased vendors stay `sandbox`. A sandbox result is unknown, which is not a clearance. A hit is the only automatic hold.

## First hour (15-minute walkthrough script)

Read this aloud while clicking. It is a demo script, not a recording and not legal advice. Use the Example accounts only.

**0:00–1:00 — Open the desk.** From `meridian/`, run `docker compose up --build`. Open `http://localhost:3000`, sign in, and land on `/w/triton/collections`. Say: "This repository is public. These people are named Example. Nothing dials or mails unless two flags are on."

**1:00–3:00 — Two agencies.** Open Triton and show `DEMO-OH-1`. Switch to Aether and show `HBR-OH-1`, Example Harbor Seller. Say: "An account id from Triton is not readable in Aether. Freeze on one workspace does not freeze the other."

**3:00–5:00 — Brand and MFA.** Open `/w/triton/settings/brand`. The name is `{{agency_name}}` until the owner sets it. Enroll MFA from `POST /api/auth/mfa`, then confirm it on Access review.

**5:00–7:00 — Import and the gate.** Paste the sample CSV on the collections desk. Point at a quarantined California row. Say: "Ineligible states are quarantined. Outreach and the payment portal stay closed."

**7:00–9:00 — Pre-check and shortcuts.** Open account 360. Press `c` or click Check before dial. If the local time is outside 8:00 a.m. to 9:00 p.m., Connect stays disabled. Press `?` for the shortcut list. The header stays put while the timeline scrolls. Mention that dark mode follows the system unless someone picks Light or Dark.

**9:00–11:00 — Promise, queue, campaign.** Set a promise, then show the collector queue and complete two tasks with the checkboxes. Build a campaign. The attempt log shows reason codes such as `calling_window`, not phone numbers.

**11:00–13:00 — Settlement, scrubs, mail.** Open the settlement desk and say the matrix defaults block offers until an owner saves them. Amounts at or above $500 need two different approvers, then a hold before the settling letter. Run a bankruptcy scrub and say the sandbox result is unknown. A hit would mark the account and stop outreach. Queue a letter and say returned mail pauses later letter steps.

**13:00–14:00 — Economics and incident.** On Portfolio economics, enter a cost and show cash-on-cash and the model IRR. Say: "These are model estimates, not a forecast and not advice." Open Incident response, read one tabletop line, and point at Freeze all outbound without clicking it on a shared demo unless you mean to stop the workspace.

**14:00–15:00 — What stays off.** Read the leave-off list: live delivery, Lob, voice, skip-trace, digest email, Metro 2, and the scrub vendors. Close with the Texas bond: Tex. Fin. Code § 392.101, $10,000, Secretary of State, before any Texas account is worked. Counsel still reviews the limitations table.
