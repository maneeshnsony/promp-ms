/** Unique `{token}` names from a prompt description, in first-seen order. */
export function extractSlots(description: string): string[] {
  const matches = description.matchAll(/\{(\w+)\}/g);
  const seen: string[] = [];
  for (const match of matches) {
    const token = match[1];
    if (!seen.includes(token)) {
      seen.push(token);
    }
  }
  return seen;
}

export function fillSlots(description: string, values: Record<string, string>): string {
  return description.replace(/\{(\w+)\}/g, (match, token: string) => values[token] ?? match);
}
