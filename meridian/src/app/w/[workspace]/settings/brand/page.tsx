"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { AgencyBrand } from "@/lib/brand";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function BrandSettingsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [brand, setBrand] = useState<AgencyBrand>({ name: "", logoUrl: "", color: "#1c2430", domain: "" });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "brand_get", workspaceId }),
    })
      .then((response) => response.json())
      .then((body: { brand?: AgencyBrand }) => {
        if (body.brand) setBrand(body.brand);
      })
      .catch(() => undefined);
  }, [workspaceId]);

  async function save() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "brand_save", workspaceId, brandName: brand.name, logoUrl: brand.logoUrl, color: brand.color, domain: brand.domain }),
    });
    const body = (await response.json()) as { error?: string; brand?: AgencyBrand };
    setNotice(body.error ?? "Saved for this workspace. Env values still win when they are set. Saving is not counsel approval.");
    if (body.brand) setBrand(body.brand);
  }

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Agency brand" subtitle="Letters, emails, and notices for this workspace use this name. The public site stays on the Triton brand. An environment variable overrides a saved value. Saving is not counsel approval." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="grid gap-3 p-4 text-sm">
        <label className="grid gap-1">Name
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} aria-label="Agency name" />
        </label>
        <label className="grid gap-1">Logo URL
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={brand.logoUrl} onChange={(event) => setBrand({ ...brand, logoUrl: event.target.value })} aria-label="Logo URL" />
        </label>
        <label className="grid gap-1">Color
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={brand.color} onChange={(event) => setBrand({ ...brand, color: event.target.value })} aria-label="Brand color" />
        </label>
        <label className="grid gap-1">Domain
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={brand.domain} onChange={(event) => setBrand({ ...brand, domain: event.target.value })} aria-label="Domain" />
        </label>
        <Button onClick={() => void save()}>Save brand</Button>
      </Card>
    </div>
  );
}
