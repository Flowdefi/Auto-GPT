export interface AgencyBrand {
  name: string;
  logoUrl: string;
  color: string;
  domain: string;
}

const COLOR = /^#[0-9a-fA-F]{6}$/;

export function safeLogoUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed.slice(0, 200);
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.toString().slice(0, 200);
  } catch {
    return "";
  }
  return "";
}

export function brandFromEnv(): AgencyBrand {
  let domain = process.env.MERIDIAN_AGENCY_DOMAIN?.trim() ?? "";
  if (!domain && process.env.MERIDIAN_PUBLIC_URL) {
    try {
      domain = new URL(process.env.MERIDIAN_PUBLIC_URL).host;
    } catch {
      domain = "";
    }
  }
  const color = process.env.MERIDIAN_AGENCY_COLOR?.trim() ?? "";
  return {
    name: process.env.MERIDIAN_AGENCY_NAME?.trim() || "{{agency_name}}",
    logoUrl: safeLogoUrl(process.env.MERIDIAN_AGENCY_LOGO_URL ?? ""),
    color: COLOR.test(color) ? color : "#1c2430",
    domain,
  };
}

/** Saved settings fill gaps. A non-empty env value wins so deploys stay explicit. */
export function mergeBrand(saved: Partial<AgencyBrand> | null | undefined): AgencyBrand {
  const env = brandFromEnv();
  const name = process.env.MERIDIAN_AGENCY_NAME?.trim() || saved?.name?.trim() || env.name;
  const color = process.env.MERIDIAN_AGENCY_COLOR?.trim() || saved?.color || env.color;
  const logo = process.env.MERIDIAN_AGENCY_LOGO_URL?.trim() || saved?.logoUrl || "";
  const domain = process.env.MERIDIAN_AGENCY_DOMAIN?.trim() || saved?.domain?.trim() || env.domain;
  return {
    name: name.slice(0, 80),
    logoUrl: safeLogoUrl(logo),
    color: COLOR.test(color) ? color : "#1c2430",
    domain: domain.slice(0, 120),
  };
}
