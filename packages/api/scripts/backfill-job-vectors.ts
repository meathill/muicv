/**
 * 回填岗位向量：循环调用 POST /jobs/search/reindex，直到两类岗位都跑完。
 *
 *   node --env-file=.env.reindex packages/api/scripts/backfill-job-vectors.ts
 *
 * .env.reindex 需要：JOBS_REINDEX_TOKEN（与 wrangler secret 一致），可选 MUICV_API_BASE。
 * 幂等：Vectorize upsert 同 id 覆盖，重复跑无副作用。
 */
const base = (process.env.MUICV_API_BASE ?? 'https://api.muicv.com').replace(/\/+$/, '');
const token = process.env.JOBS_REINDEX_TOKEN;
if (!token) {
  console.error('缺少 JOBS_REINDEX_TOKEN');
  process.exit(1);
}

type ReindexResult = { kind: string; page: number; indexed: number; nextPage: number | null };

for (const kind of ['community', 'collected'] as const) {
  let page: number | null = 1;
  let total = 0;
  while (page) {
    const res = await fetch(`${base}/jobs/search/reindex`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-reindex-token': token },
      body: JSON.stringify({ kind, page }),
    });
    if (!res.ok) {
      console.error(`${kind} page ${page} 失败：${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const body = (await res.json()) as ReindexResult;
    total += body.indexed;
    console.log(`${kind} page ${page}: +${body.indexed}（累计 ${total}）`);
    page = body.nextPage;
  }
}
