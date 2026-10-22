const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below between both but by
  can cannot could did do does doing down during each few for from further had has have having he her here hers herself
  him himself his how i if in into is it its itself me more most my myself no nor not of off on once only or other ought
  our ours ourselves out over own same she should so some such than that the their theirs them themselves then there
  these they this those through to too under until up very was we were what when where which while who whom why with
  would you your yours yourself yourselves will just also may might must shall should new get one two use used using
  page site home contact about us learn read click here view`
    .split(/\s+/)
    .filter(Boolean),
);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
}

export function topTerms(text: string, limit = 12): Array<{ term: string; count: number }> {
  const counts = new Map<string, number>();
  const list = tokens(text);
  for (const token of list) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  // Two-word phrases usually carry the commercial intent.
  for (let i = 0; i < list.length - 1; i += 1) {
    const phrase = `${list[i]} ${list[i + 1]}`;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([term, count]) => (term.includes(" ") ? count >= 2 : count >= 3))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

export function density(text: string, term: string): number {
  const list = tokens(text);
  if (list.length === 0) return 0;
  const target = term.toLowerCase();
  const words = target.split(/\s+/).length;
  let hits = 0;
  if (words === 1) {
    hits = list.filter((token) => token === target).length;
  } else {
    for (let i = 0; i <= list.length - words; i += 1) {
      if (list.slice(i, i + words).join(" ") === target) hits += 1;
    }
  }
  return Number(((hits / list.length) * 100).toFixed(2));
}
