export type MergeValue = string | boolean | number | null | undefined;

export function isTruthy(value: MergeValue): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

/** Mustache subset: {{field}}, {{#field}}...{{/field}}, {{^field}}...{{/field}}. */
export function renderMustache(template: string, data: Record<string, MergeValue>): string {
  return walk(template, data, true).text;
}

export function missingInterpolations(template: string, data: Record<string, MergeValue>): string[] {
  return walk(template, data, true).missing;
}

function walk(template: string, data: Record<string, MergeValue>, active: boolean): { text: string; missing: string[] } {
  let text = "";
  const missing: string[] = [];
  let index = 0;
  while (index < template.length) {
    const open = template.indexOf("{{", index);
    if (open < 0) {
      if (active) text += template.slice(index);
      break;
    }
    if (active) text += template.slice(index, open);
    const close = template.indexOf("}}", open + 2);
    if (close < 0) break;
    const tag = template.slice(open + 2, close).trim();
    index = close + 2;
    if (tag.startsWith("#") || tag.startsWith("^")) {
      const name = tag.slice(1).trim();
      const endTag = `{{/${name}}}`;
      const end = template.indexOf(endTag, index);
      if (end < 0) continue;
      const inner = template.slice(index, end);
      index = end + endTag.length;
      const show = tag.startsWith("#") ? isTruthy(data[name]) : !isTruthy(data[name]);
      const nested = walk(inner, data, active && show);
      text += nested.text;
      missing.push(...nested.missing);
      continue;
    }
    if (tag.startsWith("/") || tag.startsWith("!")) continue;
    if (active) {
      const value = data[tag];
      if (!isTruthy(value)) missing.push(tag);
      else text += String(value);
    }
  }
  return { text, missing: [...new Set(missing)] };
}
