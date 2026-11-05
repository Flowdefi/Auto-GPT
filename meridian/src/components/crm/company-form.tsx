"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Field } from "@/components/meridian/legacy";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_KINDS, LIFECYCLES, US_STATES, normalizeCompany, splitTags } from "@/lib/debt";
import type { Company, User } from "@/lib/types";

const control = "min-h-11 w-full rounded-xl border bg-transparent px-3 text-sm";

function Labeled({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "grid gap-1 text-sm sm:col-span-2" : "grid gap-1 text-sm"}>
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function CompanyForm({
  value,
  users,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  value: Company;
  users: User[];
  submitLabel: string;
  onSubmit: (company: Company) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [roles, setRoles] = useState(value.companyType || (value.debtRoles ?? []).join("; "));
  const [error, setError] = useState<string | null>(null);

  function patch(partial: Partial<Company>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = normalizeCompany({
          ...draft,
          id: draft.id || "new",
          companyType: roles,
          debtRoles: splitTags(roles),
          type: draft.type,
        });
        if (!next.name && !next.domain) {
          setError("Enter a company name or domain.");
          return;
        }
        setError(null);
        onSubmit({ ...next, id: draft.id });
      }}
    >
      <Labeled label="Company name">
        <Field value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
      </Labeled>
      <Labeled label="Domain">
        <Field value={draft.domain} onChange={(event) => patch({ domain: event.target.value })} />
      </Labeled>
      <Labeled label="Website">
        <Field value={draft.website ?? ""} onChange={(event) => patch({ website: event.target.value })} />
      </Labeled>
      <Labeled label="Phone">
        <Field value={draft.phone ?? ""} onChange={(event) => patch({ phone: event.target.value })} />
      </Labeled>
      <Labeled label="LinkedIn">
        <Field value={draft.linkedin ?? ""} onChange={(event) => patch({ linkedin: event.target.value })} />
      </Labeled>
      <Labeled label="Kind">
        <select className={control} value={draft.type} onChange={(event) => patch({ type: event.target.value as Company["type"] })}>
          {COMPANY_KINDS.map((kind) => (
            <option key={kind} value={kind}>{kind}</option>
          ))}
        </select>
      </Labeled>
      <Labeled label="Company type / debt roles" wide>
        <Field value={roles} placeholder="Buyer; debt buyer" onChange={(event) => setRoles(event.target.value)} />
      </Labeled>
      <Labeled label="Industry">
        <Field value={draft.industry} onChange={(event) => patch({ industry: event.target.value })} />
      </Labeled>
      <Labeled label="Lifecycle">
        <select className={control} value={draft.lifecycle} onChange={(event) => patch({ lifecycle: event.target.value as Company["lifecycle"] })}>
          {LIFECYCLES.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </Labeled>
      <Labeled label="Lead status">
        <Field value={draft.leadStatus ?? ""} onChange={(event) => patch({ leadStatus: event.target.value })} />
      </Labeled>
      <Labeled label="Employees">
        <Field value={draft.employees} onChange={(event) => patch({ employees: event.target.value })} />
      </Labeled>
      <Labeled label="Year founded">
        <Field value={draft.yearFounded ?? ""} onChange={(event) => patch({ yearFounded: event.target.value })} />
      </Labeled>
      <Labeled label="State">
        <select className={control} value={draft.state} onChange={(event) => patch({ state: event.target.value })}>
          <option value="">—</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>{state.code}</option>
          ))}
        </select>
      </Labeled>
      <Labeled label="City">
        <Field value={draft.city} onChange={(event) => patch({ city: event.target.value })} />
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
      <Labeled label="HubSpot record ID">
        <Field value={draft.hubspotRecordId ?? ""} onChange={(event) => patch({ hubspotRecordId: event.target.value })} />
      </Labeled>
      <Labeled label="Close date">
        <Field type="date" value={draft.closeDate ?? ""} onChange={(event) => patch({ closeDate: event.target.value || null })} />
      </Labeled>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={draft.targetAccount === true} onChange={(event) => patch({ targetAccount: event.target.checked })} />
        Target account
      </label>
      <Labeled label="Description" wide>
        <Textarea value={draft.description ?? ""} onChange={(event) => patch({ description: event.target.value })} />
      </Labeled>
      <Labeled label="Additional preferences" wide>
        <Textarea value={draft.additionalPreferences ?? ""} onChange={(event) => patch({ additionalPreferences: event.target.value })} />
      </Labeled>
      <Labeled label="Notes" wide>
        <Textarea value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} />
      </Labeled>
      {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
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
