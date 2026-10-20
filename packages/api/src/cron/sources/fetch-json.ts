export type FetchLike = typeof fetch;

export async function fetchJson(fetchImpl: FetchLike, url: string): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'muicv-jobs-bot/1.0' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}
