import { getCloudflareContext } from '@opennextjs/cloudflare';

import { type SubmissionRow, type SubmissionView, toSubmissionView } from './job-submission-view';

export type SubmissionPage = { items: SubmissionView[]; nextCursor: number | null };

export const SUBMISSIONS_PAGE_SIZE = 20;

/** 当前用户的扩展提交记录，按创建时间倒序；cursor = 上一页最后一条的 createdAt。 */
export async function listUserSubmissions(
  userId: string,
  opts: { cursor?: number | null | undefined; limit?: number | undefined } = {},
): Promise<SubmissionPage> {
  const limit = Math.min(Math.max(opts.limit ?? SUBMISSIONS_PAGE_SIZE, 1), 50);
  const { env } = await getCloudflareContext({ async: true });
  const cursor = opts.cursor ?? Number.MAX_SAFE_INTEGER;
  const { results } = await env.MUICV_DB.prepare(
    `SELECT id, url, visibility, status, method, jobsFound, jobsNew, holdMicro, costMicro, chargedMicro, rewardMicro,
            result, error, createdAt, settledAt
       FROM jobSubmission WHERE userId = ? AND createdAt < ? ORDER BY createdAt DESC LIMIT ?`,
  )
    .bind(userId, cursor, limit + 1)
    .all<SubmissionRow>();
  const rows = results ?? [];
  const page = rows.slice(0, limit);
  return {
    items: page.map(toSubmissionView),
    nextCursor: rows.length > limit ? (page[page.length - 1]?.createdAt ?? null) : null,
  };
}
