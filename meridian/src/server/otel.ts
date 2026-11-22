type MetricFetch = (url: string, init?: RequestInit) => Promise<{ ok: boolean }>;

/** Posts one counter when an OTLP endpoint is configured. Labels must already be free of consumer data. */
export async function emitCounter(name: string, value: number, labels: Record<string, string>, fetchImpl: MetricFetch = fetch): Promise<boolean> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return false;
  const attributes = Object.entries(labels).slice(0, 8).map(([key, raw]) => ({
    key: key.slice(0, 40),
    value: { stringValue: raw.slice(0, 40) },
  }));
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name,
                sum: {
                  dataPoints: [{ asInt: String(Math.round(value)), attributes, timeUnixNano: String(Date.now() * 1_000_000) }],
                  aggregationTemporality: 2,
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };
  try {
    await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
    return true;
  } catch {
    return false;
  }
}
