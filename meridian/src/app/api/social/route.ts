import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import type { SocialPost } from "@/server/models";
import { generateSocialPack, socialPostsOf, updateSocialPost } from "@/server/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = new Set<SocialPost["status"]>(["draft", "scheduled", "posted"]);

export function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json({ posts: socialPostsOf(workspace) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { workspaceId?: string; action?: string };
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  if (body.action !== "generate") {
    return NextResponse.json({ error: "action must be generate" }, { status: 400 });
  }
  const posts = generateSocialPack(body.workspaceId);
  return NextResponse.json({ posts });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    id?: string;
    body?: string;
    status?: string;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.id) {
    return NextResponse.json({ error: "workspaceId and id are required" }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.has(body.status as SocialPost["status"])) {
    return NextResponse.json({ error: "status must be draft, scheduled, or posted" }, { status: 400 });
  }
  if (body.body !== undefined && typeof body.body !== "string") {
    return NextResponse.json({ error: "body must be a string" }, { status: 400 });
  }
  try {
    const post = updateSocialPost(body.workspaceId, body.id, {
      body: body.body,
      status: body.status as SocialPost["status"] | undefined,
    });
    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update draft";
    return NextResponse.json({ error: message }, { status: message.includes("not found") ? 404 : 400 });
  }
}
