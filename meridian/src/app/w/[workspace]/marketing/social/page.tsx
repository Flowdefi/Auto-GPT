"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, PageHeader } from "@/components/meridian/legacy";
import { Textarea } from "@/components/ui/textarea";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface SocialDraft {
  id: string;
  channel: "x" | "facebook" | "google_business" | "linkedin";
  body: string;
  status: "draft" | "scheduled" | "posted";
  packId: string;
  updatedAt: string;
}

const LABELS: Record<SocialDraft["channel"], string> = {
  x: "X",
  facebook: "Facebook",
  google_business: "Google Business",
  linkedin: "LinkedIn",
};

export default function SocialPage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [posts, setPosts] = useState<SocialDraft[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/social?workspace=${workspaceId}`);
    const payload = await response.json();
    setPosts(payload.posts ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function generate() {
    setBusy(true);
    setNotice(null);
    const response = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, action: "generate" }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setNotice(payload.error ?? "Could not draft the pack");
      return;
    }
    setNotice("Four drafts saved. Nothing was sent to a social network.");
    await refresh();
  }

  async function save(post: SocialDraft, patch: { body?: string; status?: SocialDraft["status"] }) {
    const response = await fetch("/api/social", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, id: post.id, ...patch }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Could not update the draft");
      return;
    }
    setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, ...payload.post } : item)));
  }

  async function copy(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setNotice("Copied.");
    } catch {
      setNotice("Clipboard is blocked in this browser. Select the text and copy it manually.");
    }
  }

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Marketing"
        title="Social drafts"
        subtitle={
          workspaceId === "triton"
            ? `${config.legalName} drafts stay institutional: marketplace, buyer, and broker. Not a collection agency. No consumer contact. Publishing stays manual — Meridian does not call X, Meta, Google, or LinkedIn.`
            : "One action drafts X, Facebook, Google Business, and LinkedIn from the newest listings. Nothing is published."
        }
        actions={
          <Button disabled={busy} onClick={() => void generate()}>
            {busy ? "Drafting…" : "Generate pack"}
          </Button>
        }
      />
      {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
      {posts.length === 0 ? (
        <Empty title="No drafts yet" body="Generate a pack to write all four channels from the current portfolios and store them here." />
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">{LABELS[post.channel]}</div>
                <Badge tone={post.status === "posted" ? "good" : post.status === "scheduled" ? "warn" : "neutral"}>{post.status}</Badge>
              </div>
              <Textarea
                className="min-h-32 rounded-xl"
                defaultValue={post.body}
                key={`${post.id}-${post.updatedAt}`}
                onBlur={(event) => {
                  if (event.target.value !== post.body) void save(post, { body: event.target.value });
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button tone="soft" onClick={() => void copy(post.body)}>
                  Copy
                </Button>
                <Button tone="soft" onClick={() => void save(post, { status: "scheduled" })}>
                  Mark scheduled
                </Button>
                <Button tone="soft" onClick={() => void save(post, { status: "posted" })}>
                  Mark posted
                </Button>
                <Button tone="ghost" onClick={() => void save(post, { status: "draft" })}>
                  Back to draft
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
