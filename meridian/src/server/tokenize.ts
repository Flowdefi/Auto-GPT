const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "be",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9@.+¢$%\-]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !STOP.has(term));
}

export function scoreOverlap(queryTerms: string[], docTerms: string[]): number {
  if (queryTerms.length === 0 || docTerms.length === 0) return 0;
  const bag = new Map<string, number>();
  for (const term of docTerms) {
    bag.set(term, (bag.get(term) ?? 0) + 1);
  }
  let score = 0;
  for (const term of queryTerms) {
    const tf = bag.get(term) ?? 0;
    if (tf > 0) score += 1 + Math.log(1 + tf);
  }
  return score;
}
