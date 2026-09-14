export function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function accountName(first: string, last: string): string {
  return `${first} ${last}`;
}

/**
 * Early in a portfolio's life the liquidation rate is a fraction of a percent,
 * and rounding it to "0.0%" reads as "we have collected nothing". Borrow
 * precision until the figure is visible, so real dollars never display as zero.
 */
export function pct(value: number, digits = 1): string {
  const scaled = value * 100;
  if (scaled === 0) return `${scaled.toFixed(digits)}%`;

  let places = digits;
  while (places < 3 && Number.parseFloat(scaled.toFixed(places)) === 0) places += 1;
  if (Number.parseFloat(scaled.toFixed(places)) === 0) {
    // Too small to render honestly at this precision, but it is not nothing.
    return scaled < 0 ? ">-0.001%" : "<0.001%";
  }
  return `${scaled.toFixed(places)}%`;
}

export function cents(value: number): string {
  return `${(value * 100).toFixed(2)}¢`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{3}(\d{4})/, "$1-***-$2");
}
