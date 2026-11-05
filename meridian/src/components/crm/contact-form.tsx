"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Field } from "@/components/meridian/legacy";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSET_CLASSES,
  EMAIL_STATUSES,
  LEAD_TYPES,
  LIFECYCLES,
  US_STATES,
  normalizeContact,
  parseBuyingStates,
  parseClosedDeal,
} from "@/lib/debt";
import type { Company, Contact, User } from "@/lib/types";

const control = "min-h-11 w-full rounded-xl border bg-transparent px-3 text-sm";

function Labeled({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "grid gap-1 text-sm sm:col-span-2" : "grid gap-1 text-sm"}>
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="text-sm font-semibold sm:col-span-2">{title}</div>
      {children}
    </div>
  );
}

export function ContactForm({
  value,
  companies,
  users,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  value: Contact;
  companies: Company[];
  users: User[];
  submitLabel: string;
  onSubmit: (contact: Contact) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Contact>(value);
  const [statesText, setStatesText] = useState((value.buyingStates ?? []).join(", "));
  const [closedText, setClosedText] = useState(
    typeof value.closedDeal === "string" ? value.closedDeal : value.closedDeal === true ? "yes" : value.closedDeal === false ? "no" : "",
  );
  const [companyQuery, setCompanyQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function patch(partial: Partial<Contact>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  const companyChoices = companies
    .filter((company) => {
      const query = companyQuery.trim().toLowerCase();
      if (!query) return true;
      return company.name.toLowerCase().includes(query) || company.domain.toLowerCase().includes(query);
    })
    .slice(0, 40);
  const selected = companies.find((company) => company.id === draft.companyId);
  const options = selected && !companyChoices.some((company) => company.id === selected.id)
    ? [selected, ...companyChoices]
    : companyChoices;

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const next = normalizeContact({
          ...draft,
          id: draft.id || "new",
          buyingStates: parseBuyingStates(statesText),
          closedDeal: closedText.trim() ? parseClosedDeal(closedText) : null,
          ndaSigned: draft.ndaSigned ? draft.ndaSigned : null,
        });
        if (!next.firstName && !next.lastName && !next.email) {
          setError("Enter a name or email.");
          return;
        }
        setError(null);
        onSubmit({ ...next, id: draft.id });
      }}
    >
      <Group title="Person">
        <Labeled label="First name">
          <Field value={draft.firstName} onChange={(event) => patch({ firstName: event.target.value })} />
        </Labeled>
        <Labeled label="Last name">
          <Field value={draft.lastName} onChange={(event) => patch({ lastName: event.target.value })} />
        </Labeled>
        <Labeled label="Email">
          <Field type="email" value={draft.email} onChange={(event) => patch({ email: event.target.value })} />
        </Labeled>
        <Labeled label="Job title">
          <Field value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
        </Labeled>
        <Labeled label="Phone">
          <Field value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} />
        </Labeled>
        <Labeled label="Mobile">
          <Field value={draft.mobile ?? ""} onChange={(event) => patch({ mobile: event.target.value })} />
        </Labeled>
        <Labeled label="LinkedIn">
          <Field value={draft.linkedin ?? ""} onChange={(event) => patch({ linkedin: event.target.value })} />
        </Labeled>
        <Labeled label="Company">
          <input className={control} value={companyQuery} placeholder="Filter companies" onChange={(event) => setCompanyQuery(event.target.value)} />
          <select className={control} value={draft.companyId} onChange={(event) => patch({ companyId: event.target.value })}>
            <option value="">No company</option>
            {options.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </Labeled>
      </Group>
      <Group title="Debt marketplace">
        <Labeled label="Lead type">
          <select className={control} value={draft.leadType ?? ""} onChange={(event) => patch({ leadType: event.target.value ? (event.target.value as Contact["leadType"]) : undefined })}>
            <option value="">Unset</option>
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Lifecycle">
          <select className={control} value={draft.lifecycle} onChange={(event) => patch({ lifecycle: event.target.value as Contact["lifecycle"] })}>
            {LIFECYCLES.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Asset class preference" wide>
          <div className="grid gap-2 sm:grid-cols-2">
            {ASSET_CLASSES.map((asset) => {
              const checked = (draft.assetClassPreference ?? []).includes(asset);
              return (
                <label key={asset} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = draft.assetClassPreference ?? [];
                      patch({
                        assetClassPreference: checked ? current.filter((item) => item !== asset) : [...current, asset],
                      });
                    }}
                  />
                  {asset}
                </label>
              );
            })}
          </div>
        </Labeled>
        <Labeled label="Buying states" wide>
          <Field value={statesText} placeholder="TX, FL, NY or nationwide" onChange={(event) => setStatesText(event.target.value)} />
        </Labeled>
        <Labeled label="Budget">
          <Field value={draft.budget ?? ""} onChange={(event) => patch({ budget: event.target.value })} />
        </Labeled>
        <Labeled label="Paper age preference">
          <Field value={draft.paperAgePreference ?? ""} onChange={(event) => patch({ paperAgePreference: event.target.value })} />
        </Labeled>
        <Labeled label="Coverage">
          <Field value={draft.coverage ?? ""} onChange={(event) => patch({ coverage: event.target.value })} />
        </Labeled>
        <Labeled label="Collect or litigate">
          <Field value={draft.collectOrLitigate ?? ""} onChange={(event) => patch({ collectOrLitigate: event.target.value })} />
        </Labeled>
        <Labeled label="NDA signed">
          <Field type="date" value={draft.ndaSigned ?? ""} onChange={(event) => patch({ ndaSigned: event.target.value || null })} />
        </Labeled>
        <Labeled label="Closed deal">
          <Field value={closedText} placeholder="yes, no, or YYYY-MM-DD" onChange={(event) => setClosedText(event.target.value)} />
        </Labeled>
        <Labeled label="Stage">
          <Field value={draft.stage ?? ""} onChange={(event) => patch({ stage: event.target.value })} />
        </Labeled>
        <Labeled label="Lead source">
          <Field value={draft.leadSource ?? ""} onChange={(event) => patch({ leadSource: event.target.value })} />
        </Labeled>
      </Group>
      <Group title="Address">
        <Labeled label="Street" wide>
          <Field value={draft.street ?? ""} onChange={(event) => patch({ street: event.target.value })} />
        </Labeled>
        <Labeled label="City">
          <Field value={draft.city} onChange={(event) => patch({ city: event.target.value })} />
        </Labeled>
        <Labeled label="State">
          <select className={control} value={draft.state} onChange={(event) => patch({ state: event.target.value })}>
            <option value="">—</option>
            {!US_STATES.some((state) => state.code === draft.state) && draft.state ? (
              <option value={draft.state}>{draft.state}</option>
            ) : null}
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>{state.code} — {state.name}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="ZIP">
          <Field value={draft.zip ?? ""} onChange={(event) => patch({ zip: event.target.value })} />
        </Labeled>
        <Labeled label="Country">
          <Field value={draft.country ?? ""} onChange={(event) => patch({ country: event.target.value })} />
        </Labeled>
      </Group>
      <Group title="Email and compliance">
        <Labeled label="Email status">
          <select className={control} value={draft.emailStatus ?? "unknown"} onChange={(event) => patch({ emailStatus: event.target.value as Contact["emailStatus"] })}>
            {EMAIL_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Owner">
          <select
            className={control}
            value={draft.ownerId}
            onChange={(event) => {
              const owner = users.find((user) => user.id === event.target.value);
              patch({ ownerId: event.target.value, ownerName: owner?.name ?? draft.ownerName });
            }}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </Labeled>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.deskReplied === true} onChange={(event) => patch({ deskReplied: event.target.checked })} />
          Desk replied
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.doNotEmail === true} onChange={(event) => patch({ doNotEmail: event.target.checked })} />
          Do not email
        </label>
        {draft.doNotEmail ? (
          <p className="text-sm text-destructive sm:col-span-2">Bulk email will not send to this contact.</p>
        ) : null}
      </Group>
      <Group title="Prospecting">
        <Labeled label="Prospect segment">
          <Field value={draft.prospectSegment ?? ""} onChange={(event) => patch({ prospectSegment: event.target.value })} />
        </Labeled>
        <Labeled label="Size signal">
          <Field value={draft.sizeSignal ?? ""} onChange={(event) => patch({ sizeSignal: event.target.value })} />
        </Labeled>
        <Labeled label="HubSpot record ID">
          <Field value={draft.hubspotRecordId ?? ""} onChange={(event) => patch({ hubspotRecordId: event.target.value })} />
        </Labeled>
        <Labeled label="Source">
          <Field value={draft.source ?? ""} onChange={(event) => patch({ source: event.target.value })} />
        </Labeled>
        <Labeled label="Message summary" wide>
          <Textarea value={draft.messageSummary ?? ""} onChange={(event) => patch({ messageSummary: event.target.value })} />
        </Labeled>
        <Labeled label="Notes" wide>
          <Textarea value={draft.notes ?? ""} onChange={(event) => patch({ notes: event.target.value })} />
        </Labeled>
        <Labeled label="Tags" wide>
          <Field
            value={(draft.tags ?? []).join(", ")}
            onChange={(event) => patch({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })}
          />
        </Labeled>
      </Group>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel ? (
          <Button type="button" tone="soft" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
