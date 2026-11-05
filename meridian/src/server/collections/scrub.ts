export type RndResult = "ok" | "reassigned" | "unknown";
export type ScraResult = "active" | "inactive" | "unknown";

type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

function live(): boolean {
  return process.env.MERIDIAN_CHANNEL_DELIVER === "live";
}

/**
 * FCC Reassigned Numbers Database adapter.
 * Sandbox, or a missing URL, returns unknown and does not call the network.
 * Unknown is not a clearance. The gate already blocks a cell call on unknown.
 */
export async function checkReassignedNumber(
  input: { phoneLast4: string; consentDate?: string | null },
  fetchImpl: FetchLike = fetch,
): Promise<{ result: RndResult; sandbox: boolean }> {
  const provider = process.env.MERIDIAN_RND_PROVIDER ?? "sandbox";
  const url = process.env.MERIDIAN_RND_API_URL;
  if (!live() || provider !== "fcc" || !url) return { result: "unknown", sandbox: true };
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MERIDIAN_RND_API_KEY ? { Authorization: `Bearer ${process.env.MERIDIAN_RND_API_KEY}` } : {}),
    },
    body: JSON.stringify({ phoneLast4: input.phoneLast4, consentDate: input.consentDate ?? null }),
  });
  if (!response.ok) return { result: "unknown", sandbox: false };
  const payload = (await response.json()) as { result?: string };
  if (payload.result === "ok" || payload.result === "reassigned") return { result: payload.result, sandbox: false };
  return { result: "unknown", sandbox: false };
}

/**
 * DMDC SCRA status adapter. The request never includes a Social Security number.
 * Sandbox returns unknown and does not call the network. Unknown is not "not on active duty."
 */
export async function checkScraStatus(
  input: { lastName: string; activeDutyDate: string; ssn?: string },
  fetchImpl: FetchLike = fetch,
): Promise<{ result: ScraResult; sandbox: boolean }> {
  if (input.ssn) throw new Error("The SCRA check does not accept a Social Security number.");
  const provider = process.env.MERIDIAN_SCRA_PROVIDER ?? "sandbox";
  const url = process.env.MERIDIAN_SCRA_API_URL;
  if (!live() || provider !== "dmdc" || !url) return { result: "unknown", sandbox: true };
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MERIDIAN_SCRA_API_KEY ? { Authorization: `Bearer ${process.env.MERIDIAN_SCRA_API_KEY}` } : {}),
    },
    body: JSON.stringify({ lastName: input.lastName.slice(0, 40), activeDutyDate: input.activeDutyDate }),
  });
  if (!response.ok) return { result: "unknown", sandbox: false };
  const payload = (await response.json()) as { result?: string };
  if (payload.result === "active" || payload.result === "inactive") return { result: payload.result, sandbox: false };
  return { result: "unknown", sandbox: false };
}
