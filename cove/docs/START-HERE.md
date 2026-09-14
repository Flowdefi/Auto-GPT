# Starting the agency

Operating notes for standing up a US consumer collections operation that begins
in states without a collection-agency license. This is how the product is built
and why; it is not legal advice. Have a consumer-finance attorney review your
entity, your licensing posture, and your letters before you contact a single
consumer.

## The short version

Incorporate in Delaware or your home state, register the DBA **TF Recovery**,
and work only Georgia, Ohio, Missouri, and Kentucky at first. Buy one small
tape of fresh charge-off paper — call it $1,500 to $5,000 at 3 to 8 cents — so
your first mistakes are cheap. Get a merchant account under the DBA before the
paper arrives, because underwriting is the long pole. Staff 1099 collectors on
leased slices of accounts so you pay for recovery, not for seats.

## 1. Where to work first

Fourteen states have no state-level third-party collection agency license. Cove
enforces this list in `src/lib/states.ts`, and the dialer, SMS agent, and email
agent all refuse accounts outside it.

| Tier | States | Why |
| --- | --- | --- |
| Start here | **GA, OH, MO, KY** | No license, large populations, ordinary consumer-protection regimes |
| Add next | **SC, OK, KS, MS, UT, VA** | No license, smaller but clean |
| Small volume | **MT, NH, SD, VT** | No license, low account counts — not worth a dedicated campaign |

Georgia and Ohio alone give you roughly 24 million people. That is more than
enough tape for the first year.

A no-license state is not a no-rules state. These all still apply:

- **FDCPA** — mini-Miranda, validation, no third-party disclosure, no threats.
- **Regulation F** — 7-in-7 call frequency presumption, the validation notice
  content and timing rules, email and text requirements.
- **TCPA** — consent for autodialed or prerecorded calls to cell phones.
- **FCRA** — if you ever furnish to the bureaus.
- **State UDAP statutes** — every one of these states has one, and state AGs
  use them on collectors.
- **City licenses** — Chicago, New York City, Buffalo, and Yonkers layer local
  requirements on top of state ones. None are in the starting list, but do not
  assume state-clear means city-clear when you expand.

Three states get miscategorized as license-free and are not in Cove's allowlist
on purpose: **Texas** requires a surety bond filed with the Secretary of State,
**Florida** requires OFR registration, and **Colorado** requires AG
notification. Each is cheap and worth doing early — they are just not free.

## 2. Entity and identity

- **Entity.** An LLC taxed as an S-corp is the common structure. Delaware if
  you plan to raise or sell; your operating state otherwise. Keep the entity
  name boring and separate from the consumer-facing brand.
- **DBA.** Register **TF Recovery** as a fictitious name in every state you
  collect in. The consumer portal, your statement descriptor, your letters, and
  your caller ID all need to say the same thing, or you create a dispute every
  time someone looks at their statement.
- **Registered agent** in each state you collect in.
- **Insurance.** E&O with FDCPA coverage, plus cyber. Expect $2,000 to $6,000 a
  year at startup volume. Some sellers require it before they will sell to you.
- **Bond.** Not required in the starting states, but a $10,000 to $25,000 surety
  bond makes seller diligence easier and is a prerequisite in Texas anyway.

## 3. Buying the first portfolio

Rules that keep the first purchase from being the last one:

1. **Buy fresh.** Primary or secondary placement, charged off within 12 months.
   Tertiary paper is cheap because it does not liquidate.
2. **Buy small.** Your first tape should cost less than a used car. At 3 to 8
   cents, $2,000 buys $25,000 to $65,000 of face.
3. **Demand media.** The seller must warrant account-level documentation —
   statements, terms, charge-off, payment history — and let you put accounts
   back. Cove tracks `mediaComplete` and `putbackUntil` per portfolio because
   media gaps are the most common way a cheap tape becomes worthless.
4. **Get a clean chain of title.** Bill of sale plus every prior assignment. No
   chain, no purchase.
5. **Scrub before you dial.** Deceased, bankruptcy, litigious-consumer, active
   military, DNC, and cell-phone identification. All of it before the first
   call, not after the first complaint.
6. **Check the statute of limitations** per state per account. Time-barred paper
   is collectible in most states but cannot be demanded, and in some states a
   partial payment revives the whole debt. Cove flags `timeBarred` and the QA
   bot penalizes demand language on those accounts.

Where tape comes from: Debexpert, Debt Trader, and DebtMarket for the exchanges,
plus direct forward-flow agreements with regional lenders once you have a
performance history. Forward flow is where the margin is — a fixed monthly slice
at a fixed price beats bidding on auctions.

## 4. Payments — do this first

Merchant underwriting takes longer than everything else combined, so start it
before the paper lands.

- **Fast path.** Corepay, Daystar, or IntegralPay. They underwrite collections
  specifically, quote blended rates around 2.95%, and approve in 24 to 72 hours.
- **Scale path.** REPAY or Finvi. Built for accounts receivable management,
  interchange-plus, relationships with multiple sponsor banks so a bank exiting
  the vertical does not take your MID with it. Longer underwriting, real reserve.
- **Do both.** Open with the fast path, run the scale path's file in parallel,
  migrate when volume justifies it.

What underwriting will ask for: entity documents, the DBA registration, your
state licensing posture in writing, your compliance policies, your validation
and dispute procedures, principals' personal credit, and projected volume with
an average ticket. Have all of it in a folder before you apply.

Two things that will get your MID pulled: a chargeback ratio over about 1%, and
a statement descriptor consumers do not recognize. The second causes the first.
Cove hard-codes `TF RECOVERY` as the descriptor everywhere — portal, SMS
receipts, agent-taken payments — for exactly that reason.

Also: never touch card data yourself. Use the processor's hosted fields or
tokenization iframe. The portal in this repo is a demo; in production the card
inputs get replaced with the processor's iframe and your PCI scope collapses to
a self-assessment questionnaire.

## 5. Skip tracing

- **MicroBilt Locate People** — roughly $0.15 to $0.23 per lookup. Cheapest
  credentialed option. Use it for bulk first-pass appends.
- **IDI idiCORE** — $0.50 to $2.00 per record, no monthly minimum. The no-minimum
  part matters pre-revenue. Its deceased, bankruptcy, and lien indicators feed
  your disposition buckets directly.
- **TransUnion TruLookup / TLOxp** — the deepest data and the name sellers
  trust, at around $0.25 to $1.00 per lookup with an annual commitment and a
  real credentialing process including a site inspection.

All of them require permissible purpose under the FCRA/GLBA and will credential
you before granting access. Budget several weeks. Start with MicroBilt, add IDI
when hit rates justify it.

## 6. Voice, SMS, and mail

**Voice.** VICIdial on a dedicated CPU-optimized host, or Asterisk with ARI if
the AI agent is doing the dialing (see `deploy/README.md`). The decision that
actually matters is the carrier: you need one that signs **STIR/SHAKEN
A-attestation** on your numbers and supports branded calling. Without it your
calls arrive labeled "Spam Likely" and your right-party contact rate collapses
regardless of how good the script is. Do not churn DIDs to dodge spam labels —
that is how you get de-attested.

**SMS.** Register a 10DLC brand and campaign before sending anything.
Unregistered collections traffic is filtered outright by every US carrier. Debt
collection is a scrutinized use case, so your opt-in language, sample messages,
and STOP handling all get reviewed. Weeks, not days.

**Mail.** A print-and-mail API (Lob, PostGrid, LetterStream) at roughly $0.80 to
$1.40 per letter. Reg F validation has to reach the consumer, and the mailing
date starts the 30-day dispute window that gates every later demand. Cove's
recovery bot mails validation automatically on placement for this reason.

## 7. Staffing

Start with 1099 remote collectors on commission, not W-2 seats. At 15 to 25% of
what they recover, a seat cannot lose money on labor — only on chargebacks and
compliance failures. The Staffing screen models this: each collector has an
employment type, an hourly cost (zero for 1099), a commission percentage, and a
margin column that goes red when a seat is underwater.

Lease accounts rather than assigning them. A grant hands a collector a specific
set of accounts from one portfolio for a fixed window — typically one shift —
and expires on its own. Nobody has the whole book on their screen, a departing
collector walks away with nothing, and you can measure a collector against the
exact accounts they held. Opening an account outside your lease returns an
access wall, not the debtor record.

Classification is a real risk. A 1099 collector who works your hours, on your
dialer, to your script, is arguably an employee. Talk to an employment attorney
before you scale past a handful.

## 8. Compliance, operationally

The regulatory theory is not the hard part. The hard part is that a collector
under pressure says something they should not, and you find out when the CFPB
complaint arrives. So:

- **Record every call.** `MixMonitor` on both legs, in the dialplan, not
  optional per agent.
- **Review every call, not a sample.** The TTS review bot in `/qa` scores every
  transcript the moment a call ends against the mini-Miranda, recording
  disclosure, right-party verification, validation-before-demand, no-threats,
  no-third-party-disclosure, no-abuse, and call-frequency rules. Critical
  findings are an automatic fail.
- **Make coaching audible.** The bot reads the correction back in the
  collector's ear. Written QA gets skimmed; spoken QA does not.
- **Gate the outbound channels in code.** Cove's `outreachBlock` checks state
  licensing, cease, DNC, time-barred status, per-channel consent, and the
  8am–9pm local window on every single attempt. A collector cannot click past it.
- **Honor disputes instantly.** Verbal dispute pauses collection until
  verification goes out. Cove flips the disposition and the bot stops working
  the account.

## 9. Money

Rough startup range, before any paper:

| Item | Low | High |
| --- | --- | --- |
| Entity, DBA registrations, registered agent | $500 | $1,500 |
| Attorney review of policies and letters | $2,500 | $7,500 |
| E&O and cyber insurance | $2,000 | $6,000 |
| Merchant account setup and reserve | $0 | $5,000 |
| Skip tracing minimums | $0 | $2,000 |
| Telephony: host, DIDs, carrier deposit | $300 | $1,500 |
| 10DLC brand and campaign registration | $100 | $1,000 |
| First portfolio | $1,500 | $5,000 |
| **Total** | **~$7,000** | **~$29,500** |

The wide attorney range is real and it is the line item not to cut.

## 10. Sequence

1. Entity, DBA, registered agent, EIN, business bank account.
2. Attorney engagement. Policies, validation letter, dispute procedure, call
   scripts. Everything the QA bot checks should trace to something they wrote.
3. Merchant application under the TF Recovery DBA. This is the long pole.
4. Insurance bound.
5. Skip vendor credentialing. Start with MicroBilt.
6. Telephony: host provisioned, carrier with A-attestation, DIDs, 10DLC
   registration filed.
7. Buy one small tape in Georgia and Ohio only.
8. Import it, mail validation on every account the day it lands, and work it
   yourself for two weeks before you hire anyone. You cannot manage a floor on
   a process you have not run.
9. Add one 1099 collector on a leased slice. Watch the QA scores and the margin
   column.
10. Expand states one at a time, each with an attorney sign-off, in the tier
    order above.

## Where this lives in the product

| Topic | Screen |
| --- | --- |
| Which states are open, and why an account is blocked | `/compliance` |
| Buying and tracking paper | `/portfolios`, `/import` |
| Consumer payments under TF Recovery | `/pay` |
| Leasing accounts to remote collectors | `/staffing` |
| Call scoring and spoken coaching | `/qa` |
| Vendor shortlist with pricing and caveats | `/vendors` |
