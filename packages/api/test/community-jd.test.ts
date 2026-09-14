import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import {
  type CapturedJd,
  displayToMicro,
  JD_CONTRIBUTE_DAILY_CAP,
  JD_CONTRIBUTE_REWARD,
  SIGNUP_BONUS,
} from '@muicv/shared';

import { contributeJd } from '../src/lib/community-jd.ts';
import { readBalance } from '../src/lib/wallet.ts';

function setupDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE user (id TEXT PRIMARY KEY);
    INSERT INTO user (id) VALUES ('u1');
    CREATE TABLE tokenBalance (
      userId TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      lifetimeEarned INTEGER NOT NULL DEFAULT 0,
      lifetimeSpent INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE tokenLedger (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      delta INTEGER NOT NULL,
      type TEXT NOT NULL,
      meta TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE communityJd (
      id TEXT PRIMARY KEY,
      canonicalUrl TEXT NOT NULL,
      urlHash TEXT NOT NULL UNIQUE,
      contentHash TEXT NOT NULL,
      sourceSite TEXT NOT NULL,
      title TEXT,
      company TEXT,
      location TEXT,
      employmentType TEXT,
      markdown TEXT NOT NULL,
      contributorUserId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  function makeStmt(sql: string) {
    const compiled = sqlite.prepare(sql);
    let bound: unknown[] = [];
    const stmt = {
      bind(...args: unknown[]) {
        bound = args;
        return stmt;
      },
      async first<T = unknown>(): Promise<T | null> {
        const row = compiled.get(...(bound as never[]));
        return (row ?? null) as T | null;
      },
      async run() {
        const info = compiled.run(...(bound as never[]));
        return { success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
      },
      async all<T = unknown>() {
        const rows = compiled.all(...(bound as never[]));
        return { success: true, results: rows as T[], meta: {} };
      },
    };
    return stmt;
  }

  const db = {
    prepare(sql: string) {
      return makeStmt(sql);
    },
    async batch(stmts: ReturnType<typeof makeStmt>[]) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  } as unknown as D1Database;

  return { MUICV_API_DB: db };
}

const longMd = '负责 TypeScript 与 React 的中后台，和设计系统共建。'.repeat(8);

function jd(over: Partial<CapturedJd> = {}): CapturedJd {
  return {
    url: 'https://www.zhipin.com/job_detail/abc123.html?ka=x',
    canonicalUrl: 'https://zhipin.com/job_detail/abc123.html',
    sourceSite: 'boss',
    title: '高级前端',
    company: 'Acme',
    location: '北京',
    employmentType: '全职',
    markdown: longMd,
    extractedAt: '2026-09-13T00:00:00.000Z',
    ...over,
  };
}

describe('contributeJd', () => {
  it('首次入库发奖', async () => {
    const env = setupDb();
    const r = await contributeJd(env, 'u1', jd());
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.duplicate, false);
    assert.equal(r.awarded, JD_CONTRIBUTE_REWARD);
    const bal = await readBalance(env, 'u1');
    assert.equal(bal?.balance, displayToMicro(SIGNUP_BONUS + JD_CONTRIBUTE_REWARD));
  });

  it('同一 URL 或同一正文不重复发奖', async () => {
    const env = setupDb();
    const first = await contributeJd(env, 'u1', jd());
    assert.equal(first.ok && first.duplicate, false);
    const again = await contributeJd(env, 'u1', jd({ url: 'https://zhipin.com/job_detail/abc123.html?utm_source=x' }));
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.duplicate, true);
    assert.equal(again.awarded, 0);
    const otherUrl = await contributeJd(
      env,
      'u1',
      jd({ url: 'https://zhipin.com/job_detail/zzz.html', canonicalUrl: 'https://zhipin.com/job_detail/zzz.html' }),
    );
    assert.equal(otherUrl.ok, true);
    if (!otherUrl.ok) return;
    assert.equal(otherUrl.duplicate, true);
    const bal = await readBalance(env, 'u1');
    assert.equal(bal?.balance, displayToMicro(SIGNUP_BONUS + JD_CONTRIBUTE_REWARD));
  });

  it('正文过短或没有 title/company → 400', async () => {
    const env = setupDb();
    const short = await contributeJd(env, 'u1', jd({ markdown: '太短了' }));
    assert.equal(short.ok, false);
    const nameless = await contributeJd(env, 'u1', jd({ title: null, company: null }));
    assert.equal(nameless.ok, false);
  });

  it('日封顶后 429', async () => {
    const env = setupDb();
    const now = Date.UTC(2026, 8, 13, 12);
    for (let i = 0; i < JD_CONTRIBUTE_DAILY_CAP; i++) {
      const r = await contributeJd(
        env,
        'u1',
        jd({
          url: `https://zhipin.com/job_detail/${i}.html`,
          canonicalUrl: `https://zhipin.com/job_detail/${i}.html`,
          markdown: `${longMd} 变体 ${i}`,
        }),
        now,
      );
      assert.equal(r.ok, true);
    }
    const extra = await contributeJd(
      env,
      'u1',
      jd({
        url: 'https://zhipin.com/job_detail/overflow.html',
        canonicalUrl: 'https://zhipin.com/job_detail/overflow.html',
        markdown: `${longMd} overflow`,
      }),
      now,
    );
    assert.equal(extra.ok, false);
    if (extra.ok) return;
    assert.equal(extra.status, 429);
  });
});
