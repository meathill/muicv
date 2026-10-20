import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/** node:sqlite → D1 形状的适配，真实执行 website migrations（余额 / 流水 / 社区 JD / jobIndex / 提交）。 */

const MIGRATIONS = [
  '0005_token_balance.sql',
  '0006_token_ledger.sql',
  '0017_community_jd.sql',
  '0018_job_index.sql',
  '0019_job_submit.sql',
];

type Stmt = {
  bind(...values: unknown[]): Stmt;
  run(): Promise<{ success: true; meta: { changes: number } }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
};

export type TestD1 = { raw: DatabaseSync; prepare(sql: string): Stmt; batch(stmts: Stmt[]): Promise<unknown[]> };

export function createTestD1(users: string[] = ['u1']): TestD1 {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE user (id TEXT PRIMARY KEY);');
  for (const name of MIGRATIONS) {
    raw.exec(readFileSync(new URL(`../../../website/migrations/${name}`, import.meta.url), 'utf8'));
  }
  for (const id of users) raw.prepare('INSERT INTO user (id) VALUES (?)').run(id);

  function prepare(sql: string): Stmt {
    let params: unknown[] = [];
    const stmt: Stmt = {
      bind(...values) {
        params = values.map((v) => (v === undefined ? null : v));
        return stmt;
      },
      async run() {
        const r = raw.prepare(sql).run(...(params as never[]));
        return { success: true, meta: { changes: Number(r.changes) } };
      },
      async all<T>() {
        return { results: raw.prepare(sql).all(...(params as never[])) as T[] };
      },
      async first<T>() {
        return (raw.prepare(sql).get(...(params as never[])) as T | undefined) ?? null;
      },
    };
    return stmt;
  }
  async function batch(stmts: Stmt[]): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const s of stmts) out.push(await s.run());
    return out;
  }
  return { raw, prepare, batch };
}
