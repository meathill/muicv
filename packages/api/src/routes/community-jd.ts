import type { CapturedJd } from '@muicv/shared';
import type { Context } from 'hono';

import { contributeJd, getPublishedJd, searchPublishedJds } from '../lib/community-jd.ts';
import { readJsonBody } from '../lib/json-body.ts';
import type { AppEnv } from '../middleware/api-key.ts';

function isCapturedJd(value: unknown): value is CapturedJd {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.url === 'string' && typeof o.markdown === 'string';
}

function publicJd(row: Awaited<ReturnType<typeof getPublishedJd>>) {
  if (!row) return null;
  return {
    id: row.id,
    canonicalUrl: row.canonicalUrl,
    sourceSite: row.sourceSite,
    title: row.title,
    company: row.company,
    location: row.location,
    employmentType: row.employmentType,
    markdown: row.markdown,
    createdAt: row.createdAt,
  };
}

export async function handleJobsContribute(c: Context<AppEnv>): Promise<Response> {
  const parsed = await readJsonBody<{ capturedJd?: unknown }>(c);
  if (!parsed.ok) return parsed.response;
  if (!isCapturedJd(parsed.body.capturedJd)) {
    return c.json({ error: 'capturedJd 不合法' }, 400);
  }
  const userId = c.get('userId') as string;
  const result = await contributeJd(c.env, userId, parsed.body.capturedJd);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  return c.json({
    id: result.id,
    awarded: result.awarded,
    duplicate: result.duplicate,
    balance: result.balance,
  });
}

export async function handleJobsCommunityList(c: Context<AppEnv>): Promise<Response> {
  const q = c.req.query('q');
  const site = c.req.query('site');
  const offset = Number(c.req.query('offset') ?? '0') || 0;
  const rows = await searchPublishedJds(c.env, { q, site, offset });
  return c.json({ items: rows.map(publicJd) });
}

export async function handleJobsCommunityGet(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'missing-id' }, 400);
  const row = await getPublishedJd(c.env, id);
  if (!row) return c.json({ error: 'not-found' }, 404);
  return c.json(publicJd(row));
}
