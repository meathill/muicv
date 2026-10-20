import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  displayToMicro,
  estimateSubmitHoldMicro,
  JD_CONTRIBUTE_DAILY_CAP,
  JOB_SUBMIT_REWARD,
  type JobSubmitResponse,
  SIGNUP_BONUS,
  submitAiCostMicro,
} from '@muicv/shared';
import { Hono } from 'hono';

import { refundStaleHolds, settleSubmissionBilling } from '../src/lib/job-submit/billing.ts';
import type { PipelineDeps } from '../src/lib/job-submit/pipeline.ts';
import type { TextAi } from '../src/lib/job-submit/types.ts';
import type { AppEnv } from '../src/middleware/api-key.ts';
import { createJobsSubmitHandler } from '../src/routes/job-submit.ts';
import { createTestD1, type TestD1 } from './helpers/sqlite-d1.ts';

const BONUS = displayToMicro(SIGNUP_BONUS);

function aiReturning(response: object, usage = { prompt_tokens: 2000, completion_tokens: 300 }): TextAi {
  return { run: async () => ({ response: JSON.stringify(response), usage }) };
}

const NO_FETCH: PipelineDeps['fetchLink'] = async () => assert.fail('不应抓取外链');

function setup(pipeline: PipelineDeps, opts: { limitOk?: boolean; db?: TestD1 } = {}) {
  const db = opts.db ?? createTestD1();
  let n = 0;
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', 'u1');
    await next();
  });
  app.post('/jobs/submit', createJobsSubmitHandler({ pipeline, now: () => 1_800_000_000_000, id: () => `sub-${++n}` }));
  const env = { MUICV_API_DB: db, JOBS_SUBMIT_LIMITER: { limit: async () => ({ success: opts.limitOk ?? true }) } };
  async function submit(body: Record<string, unknown>) {
    const res = await app.request(
      '/jobs/submit',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      env as never,
    );
    return { status: res.status, body: (await res.json()) as JobSubmitResponse & { error?: unknown } };
  }
  function balance(): number {
    return (db.raw.prepare('SELECT balance FROM tokenBalance WHERE userId = ?').get('u1') as { balance: number })
      .balance;
  }
  function ledger(): Array<{ id: string; type: string; delta: number }> {
    return db.raw.prepare('SELECT id, type, delta FROM tokenLedger ORDER BY createdAt, id').all() as never;
  }
  return { db, submit, balance, ledger };
}

const JSONLD_PAGE = {
  url: 'https://acme.dev/careers/go',
  title: 'Go Engineer',
  markdown: 'We are hiring a Go engineer. Remote within EMEA.',
  jsonLd: [
    {
      '@type': 'JobPosting',
      title: 'Go Engineer',
      hiringOrganization: 'Acme',
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { name: 'EMEA' },
      description: 'Remote within EMEA only.',
    },
  ],
  links: [],
  visibility: 'public',
};

describe('POST /jobs/submit', () => {
  it('公共 + JSON-LD 新岗位：0 扣费、发奖、进社区池和 jobIndex', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    const res = await t.submit(JSONLD_PAGE);
    assert.equal(res.status, 200);
    assert.equal(res.body.method, 'jsonld');
    assert.equal(res.body.created, 1);
    assert.equal(res.body.charged, 0);
    assert.equal(res.body.rewarded, JOB_SUBMIT_REWARD);
    assert.match(res.body.jobs[0]?.link ?? '', /^https:\/\/muicv\.com\/jobs\//);
    assert.equal(t.balance(), BONUS + displayToMicro(JOB_SUBMIT_REWARD));
    const indexed = t.db.raw
      .prepare(`SELECT workplace, allowedRegions FROM jobIndex WHERE kind = 'community'`)
      .get() as { workplace: string; allowedRegions: string };
    assert.equal(indexed.workplace, 'remote');
    assert.match(indexed.allowedRegions, /emea/);
    const types = t.ledger().map((l) => l.type);
    assert.deepEqual(types, ['signup_bonus', 'job_submit', 'job_submit_refund', 'job_submit_reward']);
  });

  it('公共 + 重复岗位：不扣费、不发奖', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    await t.submit(JSONLD_PAGE);
    const before = t.balance();
    const res = await t.submit(JSONLD_PAGE);
    assert.equal(res.body.duplicates, 1);
    assert.equal(res.body.charged, 0);
    assert.equal(res.body.rewarded, 0);
    assert.equal(t.balance(), before);
  });

  it('公共 + 与采集岗位（jobIndex 指纹）重复也算重复', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    t.db.raw.exec(`INSERT INTO jobIndex (id, kind, refId, title, company, location, workplace, category, source, url, summary, body,
      allowedCountries, allowedRegions, coveredRegions, isOpenLocation, officeLocations, fingerprint, urlKey, status, postedAt, updatedAt)
      VALUES ('collected:9', 'collected', '9', 'Go Engineer', 'Acme', '', 'remote', 'backend', 'greenhouse', 'https://gh/9', '', '',
      '[]', '[]', '[]', 1, '[]', 'acme|goengineer', 'gh/9', 'published', 1, 1)`);
    const res = await t.submit(JSONLD_PAGE);
    assert.equal(res.body.duplicates, 1);
    assert.equal(res.body.jobs[0]?.link, 'https://muicv.com/jobs/o/9');
    assert.equal(t.balance(), BONUS);
  });

  it('公共 + 入库失败（缺公司）：仍不扣费、不发奖', async () => {
    const ai = aiReturning({
      hasJobs: true,
      jobs: [{ title: 'Mystery Role', company: '', location: '', workplace: 'unknown', url: '', summary: 's' }],
    });
    const t = setup({ ai, fetchLink: NO_FETCH });
    const res = await t.submit({ ...JSONLD_PAGE, jsonLd: [] });
    assert.equal(res.body.found, 1);
    assert.equal(res.body.jobs[0]?.status, 'failed');
    assert.equal(res.body.charged, 0);
    assert.equal(res.body.rewarded, 0);
    assert.equal(t.balance(), BONUS);
  });

  it('公共 + 没识别到岗位：按实际 AI 成本扣费', async () => {
    const t = setup({ ai: aiReturning({ hasJobs: false, jobs: [] }), fetchLink: NO_FETCH });
    const res = await t.submit({ ...JSONLD_PAGE, jsonLd: [] });
    const cost = submitAiCostMicro(2000, 300);
    assert.equal(res.body.found, 0);
    assert.equal(res.body.charged, cost / 10_000);
    assert.ok(res.body.note);
    assert.equal(t.balance(), BONUS - cost);
  });

  it('私藏 + AI 识别：按实际成本扣费、不发奖、不进公共池', async () => {
    const ai = aiReturning({
      hasJobs: true,
      jobs: [
        {
          title: 'Rust Dev',
          company: 'Oxide',
          location: 'Remote (US only)',
          workplace: 'remote',
          url: '',
          summary: 's',
        },
      ],
    });
    const t = setup({ ai, fetchLink: NO_FETCH });
    const res = await t.submit({ ...JSONLD_PAGE, jsonLd: [], visibility: 'private' });
    const cost = submitAiCostMicro(2000, 300);
    assert.equal(res.body.created, 1);
    assert.equal(res.body.rewarded, 0);
    assert.equal(res.body.charged, cost / 10_000);
    assert.equal(res.body.jobs[0]?.link, null);
    assert.equal(t.balance(), BONUS - cost);
    const saved = t.db.raw.prepare('SELECT userId, restrictions FROM savedJob').get() as {
      userId: string;
      restrictions: string;
    };
    assert.equal(saved.userId, 'u1');
    assert.match(saved.restrictions, /"US"/);
    assert.equal((t.db.raw.prepare('SELECT COUNT(*) AS n FROM communityJd').get() as { n: number }).n, 0);
    assert.equal((t.db.raw.prepare('SELECT COUNT(*) AS n FROM jobIndex').get() as { n: number }).n, 0);
    const again = await t.submit({ ...JSONLD_PAGE, jsonLd: [], visibility: 'private' });
    assert.equal(again.body.duplicates, 1);
  });

  it('私藏 + JSON-LD（无 AI 成本）：0 扣费', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    const res = await t.submit({ ...JSONLD_PAGE, visibility: 'private' });
    assert.equal(res.body.charged, 0);
    assert.equal(t.balance(), BONUS);
  });

  it('余额不足预扣额：402，不跑流水线', async () => {
    const t = setup({ ai: { run: async () => assert.fail('不应调用 AI') }, fetchLink: NO_FETCH });
    t.db.raw
      .prepare(
        'INSERT INTO tokenBalance (userId, balance, lifetimeEarned, lifetimeSpent, updatedAt) VALUES (?, ?, 0, 0, 0)',
      )
      .run('u1', 10);
    const res = await t.submit({ ...JSONLD_PAGE, jsonLd: [] });
    assert.equal(res.status, 402);
    assert.equal(t.balance(), 10);
  });

  it('超出每用户限流：429', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH }, { limitOk: false });
    assert.equal((await t.submit(JSONLD_PAGE)).status, 429);
  });

  it('今日奖励次数用完：仍免费入库但不发奖', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    for (let i = 0; i < JD_CONTRIBUTE_DAILY_CAP; i++) {
      t.db.raw
        .prepare(
          `INSERT INTO tokenLedger (id, userId, delta, type, meta, createdAt) VALUES (?, 'u1', 1, 'job_submit_reward', NULL, 1800000000000)`,
        )
        .run(`r${i}`);
    }
    const res = await t.submit(JSONLD_PAGE);
    assert.equal(res.body.created, 1);
    assert.equal(res.body.rewarded, 0);
    assert.equal(res.body.charged, 0);
  });

  it('流水线抛错：按规则结算（未识别 → 扣实际成本 0），返回 502', async () => {
    const t = setup({
      ai: {
        run: async () => {
          throw new Error('ai down');
        },
      },
      fetchLink: NO_FETCH,
    });
    const res = await t.submit({ ...JSONLD_PAGE, jsonLd: [] });
    assert.equal(res.status, 502);
    assert.equal(t.balance(), BONUS);
    const row = t.db.raw.prepare('SELECT status FROM jobSubmission').get() as { status: string };
    assert.equal(row.status, 'failed');
  });
});

describe('结算幂等', () => {
  it('同一提交重复结算只生效一次；残留预扣会被全额退回', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    await t.submit(JSONLD_PAGE);
    const env = { MUICV_API_DB: t.db as unknown as D1Database };
    const again = await settleSubmissionBilling(env, {
      submissionId: 'sub-1',
      userId: 'u1',
      visibility: 'public',
      method: 'jsonld',
      found: 1,
      created: 1,
      costMicro: 0,
      holdMicro: estimateSubmitHoldMicro(10),
      result: [],
      now: 1_800_000_000_000,
    });
    assert.equal(again, null);
    const before = t.balance();

    // 模拟崩溃：只有预扣、没有结算
    const hold = 777;
    t.db.raw
      .prepare(
        `INSERT INTO jobSubmission (id, userId, url, urlHash, visibility, status, holdMicro, createdAt) VALUES ('stale', 'u1', 'https://a', 'h', 'private', 'held', ?, 0)`,
      )
      .run(hold);
    t.db.raw.prepare(`UPDATE tokenBalance SET balance = balance - ? WHERE userId = 'u1'`).run(hold);
    assert.equal(await refundStaleHolds(env, 1_800_000_000_000), 1);
    assert.equal(await refundStaleHolds(env, 1_800_000_000_000), 0);
    assert.equal(t.balance(), before);
  });
});
