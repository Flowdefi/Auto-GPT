type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function tooMany(message = "Too many requests"): Response {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": "60" } });
}
