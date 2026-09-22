import { money } from "@/lib/format";
import type { WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "./db";
import type { Portfolio, SocialChannel, SocialPost } from "./models";

const CHANNELS: SocialChannel[] = ["x", "facebook", "google_business", "linkedin"];

function latestPortfolios(workspaceId: WorkspaceId): Portfolio[] {
  return loadDb()
    .portfolios.filter((row) => row.workspaceId === workspaceId)
    .slice()
    .sort((a, b) => b.dateListed.localeCompare(a.dateListed))
    .slice(0, 2);
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function tritonCopy(channel: SocialChannel, books: Portfolio[]): string {
  const lead = books[0];
  const subject = lead
    ? `${lead.name} (${lead.debtType || "charged-off paper"}, face ${money(lead.faceValue)}, seller ask ${money(lead.sellerPrice)})`
    : "charged-off portfolios now in market";
  const guard =
    "Triton Financial Solutions runs DebtMarket as an institutional marketplace, buyer, and broker. We are not a collection agency and we do not contact consumers.";
  switch (channel) {
    case "x": {
      const guard = " Institutional marketplace, not a collection agency. No consumer contact. debtmarket.net";
      const head = lead
        ? `Now listed on DebtMarket: ${lead.name}. ${lead.debtType}. Face ${money(lead.faceValue)}.`
        : "DebtMarket lists charged-off portfolios for qualified buyers and sellers.";
      return `${clip(head, Math.max(40, 280 - guard.length))}${guard}`;
    }
    case "facebook":
      return `${subject} is on DebtMarket.\n\n${guard}\n\nQualified institutions can request a data room after NDA. Tapes are never posted here.`;
    case "google_business":
      return `DebtMarket — institutional marketplace for charged-off receivables.\n\n${lead ? `Open listing: ${lead.name}, ${lead.geography === "national" ? "national" : lead.states.join(", ") || "selected states"}.` : "Ask about current listings."}\n\n${guard} Boca Raton, FL. portfolios@debtmarket.net`;
    case "linkedin":
      return `Institutional note from DebtMarket.\n\n${subject}.\n\nProcess stays documented: NDA, data room, sealed bids, award, funding. ${books[1] ? `Also in market: ${books[1].name}.` : ""}\n\n${guard}\n\nIf your desk buys or sells paper, write portfolios@debtmarket.net. This post is not an offer to any consumer.`;
    default: {
      const _never: never = channel;
      return _never;
    }
  }
}

function aetherCopy(channel: SocialChannel, books: Portfolio[]): string {
  const lead = books[0];
  const subject = lead ? `${lead.name} (${lead.debtType || "block"})` : "institutional blocks on the desk";
  const guard = "Aether Digital Markets is an institutional desk. Counterparties are institutions. Travel Rule applies where required.";
  switch (channel) {
    case "x":
      return clip(`${subject} — Aether desk. Institutional only. aethermarkets.io`, 280);
    case "facebook":
      return `${subject}.\n\n${guard}`;
    case "google_business":
      return `Aether Digital Markets — institutional digital-asset desk.\n\n${subject}.\n\n${guard}`;
    case "linkedin":
      return `${subject}.\n\nRFQ, firm quote, settlement, and qualified custody. ${guard}`;
    default: {
      const _never: never = channel;
      return _never;
    }
  }
}

export function generateSocialPack(workspaceId: WorkspaceId): SocialPost[] {
  const books = latestPortfolios(workspaceId);
  const packId = nextId("spk");
  const now = new Date().toISOString();
  const posts = CHANNELS.map((channel) => {
    const body = workspaceId === "triton" ? tritonCopy(channel, books) : aetherCopy(channel, books);
    const post: SocialPost = {
      id: nextId("sp"),
      workspaceId,
      packId,
      channel,
      body,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    return post;
  });
  mutate((db) => {
    db.socialPosts.unshift(...posts);
    if (db.socialPosts.length > 400) db.socialPosts.length = 400;
  });
  return posts;
}

export function socialPostsOf(workspaceId: WorkspaceId): SocialPost[] {
  return loadDb().socialPosts.filter((row) => row.workspaceId === workspaceId);
}

export function updateSocialPost(
  workspaceId: WorkspaceId,
  id: string,
  patch: { body?: string; status?: SocialPost["status"] },
): SocialPost {
  return mutate((db) => {
    const post = db.socialPosts.find((row) => row.id === id && row.workspaceId === workspaceId);
    if (!post) throw new Error("Social draft not found");
    if (patch.body !== undefined) post.body = patch.body.trim();
    if (patch.status !== undefined) post.status = patch.status;
    post.updatedAt = new Date().toISOString();
    return post;
  });
}
