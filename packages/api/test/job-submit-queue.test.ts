import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { displayToMicro, type JobSubmitStatus, SIGNUP_BONUS, submitAiCostMicro } from '@muicv/shared';
import { Hono } from 'hono';

import type { PipelineDeps } from '../src/lib/job-submit/pipeline.ts';
import type { SubmissionJob } from '../src/lib/job-submit/process.ts';
import { consumeSubmitBatch, consumeSubmitDlq, type QueueMessage } from '../src/lib/job-submit/queue.ts';
import type { TextAi } from '../src/lib/job-submit/types.ts';
import type { AppEnv } from '../src/middleware/api-key.ts';
import { createJobsSubmitHandler, handleJobsSubmitStatus } from '../src/routes/job-submit.ts';
import { createTestD1 } from './helpers/sqlite-d1.ts';

const BONUS = displayToMicro(SIGNUP_BONUS);
const NOW = 1_800_000_000_000;
const NO_FETCH: PipelineDeps['fetchLink'] = async () => assert.fail('不应抓取外链');

function ai(response: object): TextAi & { calls: number } {
  const x = {
    calls: 0,
    async run() {
      x.calls++;
      return { response: JSON.stringify(response), usage: { prompt_tokens: 1000, completion_tokens: 100 } };
    },
  };
  return x;
}

function setup(pipeline: PipelineDeps) {
  const db = createTestD1(['u1', 'u2']);
  const sent: SubmissionJob[] = [];
  let user = 'u1';
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', user);
    await next();
  });
  app.post('/jobs/submit', createJobsSubmitHandler({ pipeline, now: () => NOW, id: () => 'sub-q' }));
  app.get('/jobs/submit/:id', handleJobsSubmitStatus);
  const env = { MUICV_API_DB: db, JOB_SUBMIT_QUEUE: { send: async (b: SubmissionJob) => void sent.push(b) } };
  return {
    db,
    sent,
    env,
    as(id: string) {
      user = id;
    },
    async post(body: Record<string, unknown>) {
      const res = await app.request(
        '/jobs/submit',
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
        env as never,
      );
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    },
    async status(id: string) {
      const res = await app.request(`/jobs/submit/${id}`, {}, env as never);
      return { status: res.status, body: (await res.json()) as JobSubmitStatus };
    },
    balance(): number {
      return (db.raw.prepare(`SELECT balance FROM tokenBalance WHERE userId = 'u1'`).get() as { balance: number })
        .balance;
    },
  };
}

function message(body: SubmissionJob, attempts = 1) {
  const m = {
    body,
    attempts,
    acked: false,
    retried: false,
    ack() {
      m.acked = true;
    },
    retry() {
      m.retried = true;
    },
  };
  return m satisfies QueueMessage<SubmissionJob>;
}

const PAGE = {
  url: 'https://x.com/remotejobs',
  title: 'Remote Jobs',
  markdown: 'Hiring: Rust Dev at Oxide, remote US only',
  links: [],
};
const JOB = {
  title: 'Rust Dev',
  company: 'Oxide',
  location: 'Remote (US only)',
  workplace: 'remote',
  url: '',
  summary: 's',
};

describe('提交队列', () => {
  it('需要 AI 的提交入队返回 202，消费后可查询结果', async () => {
    const model = ai({ hasJobs: true, jobs: [JOB] });
    const t = setup({ ai: model, fetchLink: NO_FETCH });
    const res = await t.post({ ...PAGE, visibility: 'private' });
    assert.equal(res.status, 202);
    assert.deepEqual(res.body, { id: 'sub-q', status: 'queued' });
    assert.equal(model.calls, 0);
    assert.equal((await t.status('sub-q')).body.status, 'queued');
    assert.ok(t.balance() < BONUS);

    const m = message(t.sent[0] as SubmissionJob);
    await consumeSubmitBatch(t.env as never, { queue: 'muicv-job-submit', messages: [m] }, () => ({
      pipeline: { ai: model, fetchLink: NO_FETCH },
      index: async () => {},
      now: NOW,
    }));
    assert.ok(m.acked);
    const done = await t.status('sub-q');
    assert.equal(done.body.status, 'settled');
    assert.equal(done.body.result?.created, 1);
    assert.equal(done.body.result?.charged, submitAiCostMicro(1000, 100) / 10_000);
    assert.equal(t.balance(), BONUS - submitAiCostMicro(1000, 100));

    // 重复投递：直接 ack，不再调用 AI、不重复结算
    const again = message(t.sent[0] as SubmissionJob, 2);
    await consumeSubmitBatch(t.env as never, { queue: 'muicv-job-submit', messages: [again] }, () => ({
      pipeline: { ai: model, fetchLink: NO_FETCH },
      index: async () => {},
      now: NOW,
    }));
    assert.ok(again.acked);
    assert.equal(model.calls, 1);
    assert.equal(t.balance(), BONUS - submitAiCostMicro(1000, 100));
  });

  it('JSON-LD 走同步路径，不入队', async () => {
    const t = setup({ ai: null, fetchLink: NO_FETCH });
    const res = await t.post({
      ...PAGE,
      jsonLd: [{ '@type': 'JobPosting', title: 'Go Dev', hiringOrganization: 'Acme' }],
      visibility: 'public',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 1);
    assert.equal(t.sent.length, 0);
    assert.equal((await t.status('sub-q')).body.status, 'settled');
  });

  it('流水线异常：消息重试而不结算；进 DLQ 后全额退回', async () => {
    const broken: TextAi = {
      run: async () => {
        throw new Error('ai down');
      },
    };
    const t = setup({ ai: broken, fetchLink: NO_FETCH });
    await t.post({ ...PAGE, visibility: 'public' });
    const job = t.sent[0] as SubmissionJob;
    const m = message(job);
    await consumeSubmitBatch(t.env as never, { queue: 'muicv-job-submit', messages: [m] }, () => ({
      pipeline: { ai: broken, fetchLink: NO_FETCH },
      index: async () => {},
      now: NOW,
    }));
    assert.ok(m.retried);
    assert.equal((await t.status('sub-q')).body.status, 'queued');

    const dead = message(job, 4);
    await consumeSubmitDlq(t.env as never, { queue: 'muicv-job-submit-dlq', messages: [dead] }, NOW);
    assert.ok(dead.acked);
    const s = await t.status('sub-q');
    assert.equal(s.body.status, 'failed');
    assert.match(s.body.result?.note ?? '', /全额退回/);
    assert.equal(t.balance(), BONUS);
    // DLQ 重放也不会重复退款
    await consumeSubmitDlq(t.env as never, { queue: 'muicv-job-submit-dlq', messages: [message(job, 5)] }, NOW);
    assert.equal(t.balance(), BONUS);
  });

  it('只能查自己的提交', async () => {
    const t = setup({ ai: ai({ hasJobs: false, jobs: [] }), fetchLink: NO_FETCH });
    await t.post({ ...PAGE, visibility: 'private' });
    t.as('u2');
    assert.equal((await t.status('sub-q')).status, 404);
  });
});
