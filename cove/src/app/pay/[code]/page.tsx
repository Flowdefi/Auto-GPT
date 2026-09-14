"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { money, when } from "@/lib/format";
import { useCove } from "@/lib/store";

type Tab = "once" | "plan";

const CADENCES: Array<{ id: "weekly" | "biweekly" | "monthly"; label: string; per: number }> = [
  { id: "weekly", label: "Every week", per: 52 },
  { id: "biweekly", label: "Every other week", per: 26 },
  { id: "monthly", label: "Once a month", per: 12 },
];

function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function PortalAccountPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? "");
  const accounts = useCove((state) => state.accounts);
  const plans = useCove((state) => state.plans);
  const payments = useCove((state) => state.payments);
  const portalPay = useCove((state) => state.portalPay);
  const portalPlan = useCove((state) => state.portalPlan);

  const account = accounts.find((item) => item.portalCode.toUpperCase() === code.toUpperCase());

  const [tab, setTab] = useState<Tab>("once");
  const [amount, setAmount] = useState("");
  const [installment, setInstallment] = useState("75");
  const [cadence, setCadence] = useState<"weekly" | "biweekly" | "monthly">("biweekly");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [planned, setPlanned] = useState(false);

  if (!account) {
    return (
      <div className="rounded-2xl border border-tfr-line bg-white p-6">
        <h1 className="text-xl font-semibold">We could not find that account</h1>
        <p className="mt-2 text-sm text-tfr-ink/70">
          Double-check the reference code on your letter or text message.
        </p>
        <Link href="/pay" className="mt-4 inline-block text-sm font-semibold text-tfr-blue">
          Try another code
        </Link>
      </div>
    );
  }

  const activePlan = plans.find((plan) => plan.accountId === account.id && plan.status === "active");
  const myPayments = payments.filter((payment) => payment.accountId === account.id);
  const settlement = Math.round(account.balance * 0.6);
  const cardValid = digitsOnly(card, 16).length >= 15 && expiry.length >= 4 && cvc.length >= 3 && zip.length >= 5;

  if (account.balance === 0) {
    return (
      <div className="rounded-2xl border border-tfr-line bg-white p-6">
        <div className="inline-block rounded-full bg-tfr-greenSoft px-3 py-1 text-xs font-semibold text-tfr-green">
          Paid in full
        </div>
        <h1 className="mt-3 text-2xl font-semibold">
          {account.firstName}, this account is closed.
        </h1>
        <p className="mt-2 text-sm text-tfr-ink/70">
          Nothing further is owed on the {account.originalCreditor} account ending {account.last4}. A zero-balance
          letter has been sent to you.
        </p>
        <div className="mt-4 space-y-1 text-sm">
          {myPayments.map((payment) => (
            <div key={payment.id} className="flex justify-between border-t border-tfr-line pt-2">
              <span>{when(payment.at)}</span>
              <span className="font-medium">
                {money(payment.amount)} · {payment.method} •{payment.last4}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-tfr-line bg-white p-6">
        <div className="text-xs uppercase tracking-wide text-tfr-ink/50">Account ending {account.last4}</div>
        <h1 className="mt-1 text-2xl font-semibold">Hi {account.firstName}</h1>
        <p className="mt-1 text-sm text-tfr-ink/70">
          Original creditor: {account.originalCreditor} · {account.product}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div>
            <div className="text-xs text-tfr-ink/50">Current balance</div>
            <div className="text-4xl font-semibold tracking-tight">{money(account.balance)}</div>
          </div>
          <div>
            <div className="text-xs text-tfr-ink/50">Settlement available</div>
            <div className="text-2xl font-semibold text-tfr-green">{money(settlement)}</div>
          </div>
        </div>
        {activePlan ? (
          <div className="mt-4 rounded-xl bg-tfr-blueSoft p-3 text-sm text-tfr-blue">
            You have an active plan: {money(activePlan.installment)} {activePlan.cadence}, {activePlan.remaining}{" "}
            payments left. Next on {activePlan.nextDue}.
          </div>
        ) : null}
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-2xl border p-5 ${
            result.ok ? "border-tfr-green/30 bg-tfr-greenSoft" : "border-red-200 bg-red-50"
          }`}
        >
          <div className={`text-sm font-semibold ${result.ok ? "text-tfr-green" : "text-red-700"}`}>
            {result.ok ? "Payment authorized" : "We could not process that"}
          </div>
          <p className="mt-1 text-sm text-tfr-ink/80">{result.message}</p>
        </div>
      ) : null}

      {planned ? (
        <div className="mt-4 rounded-2xl border border-tfr-green/30 bg-tfr-greenSoft p-5">
          <div className="text-sm font-semibold text-tfr-green">Plan created</div>
          <p className="mt-1 text-sm text-tfr-ink/80">
            We will draft {money(Number(installment) || 0)} {CADENCES.find((item) => item.id === cadence)?.label
              .toLowerCase()}
            . You can change or cancel it here any time.
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-tfr-line bg-white p-6">
        <div className="flex gap-1 rounded-xl bg-tfr-mist p-1">
          {(
            [
              { id: "once" as const, label: "Make a payment" },
              { id: "plan" as const, label: "Set up a plan" },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-11 flex-1 rounded-lg text-sm font-semibold transition ${
                tab === item.id ? "bg-white text-tfr-navy shadow-sm" : "text-tfr-ink/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "once" ? (
          <div className="mt-5">
            <div className="text-sm font-medium">How much today?</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: "Pay in full", value: account.balance },
                { label: `Settle at ${money(settlement)}`, value: settlement },
                { label: "Half", value: Math.round(account.balance / 2) },
                { label: "$50", value: 50 },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setAmount(String(option.value))}
                  className={`min-h-10 rounded-xl border px-3 text-sm ${
                    amount === String(option.value)
                      ? "border-tfr-blue bg-tfr-blueSoft text-tfr-blue"
                      : "border-tfr-line bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-tfr-line bg-tfr-mist px-4 focus-within:border-tfr-blue">
                <span className="text-lg text-tfr-ink/50">$</span>
                <input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  className="min-h-12 w-full bg-transparent px-2 text-lg outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="text-sm font-medium">How often can you pay?</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CADENCES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCadence(option.id)}
                  className={`min-h-11 rounded-xl border px-3 text-sm ${
                    cadence === option.id
                      ? "border-tfr-blue bg-tfr-blueSoft text-tfr-blue"
                      : "border-tfr-line bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label htmlFor="installment" className="text-sm font-medium">
                Amount each time
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-tfr-line bg-tfr-mist px-4 focus-within:border-tfr-blue">
                <span className="text-lg text-tfr-ink/50">$</span>
                <input
                  id="installment"
                  inputMode="decimal"
                  value={installment}
                  onChange={(event) => setInstallment(event.target.value.replace(/[^\d.]/g, ""))}
                  className="min-h-12 w-full bg-transparent px-2 text-lg outline-none"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-tfr-ink/60">
              That clears the balance in about{" "}
              {Math.max(1, Math.ceil(account.balance / (Number(installment) || 1)))} payments. Nothing is drafted
              without your authorization, and you can cancel from this page.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-tfr-line pt-5">
          <div className="text-sm font-medium">Card or bank details</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={card}
              onChange={(event) => setCard(digitsOnly(event.target.value, 16))}
              placeholder="Card number"
              inputMode="numeric"
              autoComplete="cc-number"
              className="min-h-12 rounded-xl border border-tfr-line bg-tfr-mist px-4 text-base outline-none focus:border-tfr-blue sm:col-span-2"
            />
            <input
              value={expiry}
              onChange={(event) => {
                const raw = digitsOnly(event.target.value, 4);
                setExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw);
              }}
              placeholder="MM/YY"
              inputMode="numeric"
              autoComplete="cc-exp"
              className="min-h-12 rounded-xl border border-tfr-line bg-tfr-mist px-4 text-base outline-none focus:border-tfr-blue"
            />
            <input
              value={cvc}
              onChange={(event) => setCvc(digitsOnly(event.target.value, 4))}
              placeholder="CVC"
              inputMode="numeric"
              autoComplete="cc-csc"
              className="min-h-12 rounded-xl border border-tfr-line bg-tfr-mist px-4 text-base outline-none focus:border-tfr-blue"
            />
            <input
              value={zip}
              onChange={(event) => setZip(digitsOnly(event.target.value, 5))}
              placeholder="Billing ZIP"
              inputMode="numeric"
              autoComplete="postal-code"
              className="min-h-12 rounded-xl border border-tfr-line bg-tfr-mist px-4 text-base outline-none focus:border-tfr-blue sm:col-span-2"
            />
          </div>

          <button
            type="button"
            disabled={!cardValid || (tab === "once" ? !(Number(amount) > 0) : !(Number(installment) > 0))}
            onClick={() => {
              const last4 = digitsOnly(card, 16).slice(-4) || "0000";
              if (tab === "once") {
                setPlanned(false);
                setResult(portalPay(account.portalCode, Number(amount), "card", last4));
                setAmount("");
              } else {
                setResult(null);
                setPlanned(portalPlan(account.portalCode, Number(installment), cadence));
              }
              setCard("");
              setCvc("");
            }}
            className="mt-4 min-h-[52px] w-full rounded-xl bg-tfr-navy py-3.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-40"
          >
            {tab === "once"
              ? `Pay ${amount ? money(Number(amount)) : ""} now`
              : `Authorize ${money(Number(installment) || 0)} ${cadence}`}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-tfr-ink/60">
            By continuing you authorize TF Recovery to charge the payment method above. This charge appears on your
            statement as <strong>TF RECOVERY</strong>. This is an attempt to collect a debt and any information
            obtained will be used for that purpose.
          </p>
        </div>
      </div>

      {myPayments.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-tfr-line bg-white p-6">
          <div className="text-sm font-semibold">Your payment history</div>
          <div className="mt-2 space-y-2 text-sm">
            {myPayments.map((payment) => (
              <div key={payment.id} className="flex justify-between border-t border-tfr-line pt-2">
                <span className="text-tfr-ink/70">{when(payment.at)}</span>
                <span className="font-medium">
                  {money(payment.amount)} · {payment.method} •{payment.last4}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-tfr-line bg-white p-6 text-sm">
        <div className="font-semibold">Need something else?</div>
        <ul className="mt-2 space-y-1.5 text-tfr-ink/70">
          <li>Dispute this debt or request verification in writing — we stop collection until we respond.</li>
          <li>Ask us to stop contacting you, or to contact you only in writing.</li>
          <li>Tell us a time or channel that works better for you.</li>
        </ul>
        <a href="tel:+18005550142" className="mt-3 inline-block font-semibold text-tfr-blue">
          Call (800) 555-0142
        </a>
      </div>
    </div>
  );
}
