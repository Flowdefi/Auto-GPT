const MEASUREMENT_ID = /^G-[A-Z0-9]+$/i;

export interface GaStatus {
  measurementId: string | null;
  publicSnippet: boolean;
  measurementProtocol: boolean;
  propertyId: string | null;
  hint: string;
}

function cleanId(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return MEASUREMENT_ID.test(trimmed) ? trimmed : null;
}

export function gaStatus(): GaStatus {
  const measurementId = cleanId(process.env.GA_MEASUREMENT_ID) ?? cleanId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const publicId = cleanId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const secret = Boolean(process.env.GA_API_SECRET?.trim());
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() || null;
  const protocol = Boolean(measurementId && secret && cleanId(process.env.GA_MEASUREMENT_ID));
  let hint = "Google Analytics is not configured. First-party page views are still stored in Meridian.";
  if (protocol) {
    hint = `Measurement Protocol is on for ${measurementId}. Meridian forwards page_view events. This screen does not invent Google traffic numbers.`;
  } else if (measurementId && !secret) {
    hint = `Measurement ID ${measurementId} is set, but GA_API_SECRET is missing, so server forwarding is off.`;
  } else if (publicId) {
    hint = `The website snippet uses ${publicId}. Add GA_MEASUREMENT_ID and GA_API_SECRET to forward page views from the server.`;
  }
  return {
    measurementId,
    publicSnippet: Boolean(publicId),
    measurementProtocol: protocol,
    propertyId,
    hint,
  };
}

export function publicMeasurementId(): string | null {
  return cleanId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
}

/** Sends one GA4 page_view through the Measurement Protocol when both secrets exist. */
export async function sendGaPageView(path: string): Promise<{ sent: boolean; error?: string }> {
  const measurementId = cleanId(process.env.GA_MEASUREMENT_ID);
  const secret = process.env.GA_API_SECRET?.trim();
  if (!measurementId || !secret) {
    return { sent: false, error: "GA_MEASUREMENT_ID and GA_API_SECRET are not both set" };
  }
  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", measurementId);
  endpoint.searchParams.set("api_secret", secret);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "meridian.firstparty",
        events: [
          {
            name: "page_view",
            params: {
              page_location: path,
              engagement_time_msec: 1,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { sent: false, error: `Measurement Protocol ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Measurement Protocol failed" };
  }
}
