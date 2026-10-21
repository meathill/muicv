import assert from 'node:assert/strict';
import test from 'node:test';

import { displayToMicro } from '@muicv/shared';

import { type SubmissionRow, submissionPhase, toSubmissionView } from '../lib/job-submission-view.ts';

const base: SubmissionRow = {
  id: 's1',
  url: 'https://example.com/careers/1',
  visibility: 'public',
  status: 'queued',
  method: null,
  jobsFound: 0,
  jobsNew: 0,
  holdMicro: displayToMicro(120),
  costMicro: 0,
  chargedMicro: 0,
  rewardMicro: 0,
  result: null,
  error: null,
  createdAt: 1,
  settledAt: null,
};

test('状态映射', () => {
  assert.equal(submissionPhase('queued'), 'queued');
  assert.equal(submissionPhase('held'), 'processing');
  assert.equal(submissionPhase('settled'), 'done');
  assert.equal(submissionPhase('failed'), 'failed');
  assert.equal(submissionPhase('rejected'), 'failed');
});

test('排队中：净变化 = −预扣，标题回退到域名', () => {
  const v = toSubmissionView(base);
  assert.equal(v.phase, 'queued');
  assert.equal(v.net, -120);
  assert.equal(v.refund, 0);
  assert.equal(v.title, 'example.com');
});

test('公共池新岗位：全退 + 奖励', () => {
  const v = toSubmissionView({
    ...base,
    status: 'settled',
    jobsFound: 2,
    jobsNew: 1,
    rewardMicro: displayToMicro(2000),
    settledAt: 2,
    result: JSON.stringify({
      jobs: [
        { title: 'Vue Dev', company: 'A', status: 'new', link: 'https://muicv.com/jobs/x', url: 'u1' },
        { title: 'PHP Dev', company: 'B', status: 'duplicate', link: null, url: 'u2' },
      ],
    }),
  });
  assert.equal(v.refund, 120);
  assert.equal(v.reward, 2000);
  assert.equal(v.net, 2000);
  assert.equal(v.duplicates, 1);
  assert.equal(v.title, 'Vue Dev 等 2 个岗位');
});

test('私藏：按成本扣费，余下退还', () => {
  const v = toSubmissionView({
    ...base,
    visibility: 'private',
    status: 'settled',
    chargedMicro: displayToMicro(30),
    settledAt: 2,
  });
  assert.equal(v.charged, 30);
  assert.equal(v.refund, 90);
  assert.equal(v.net, -30);
});

test('rejected（余额不足没预扣成）不计金额', () => {
  const v = toSubmissionView({ ...base, status: 'rejected' });
  assert.equal(v.hold, 0);
  assert.equal(v.net, 0);
});
