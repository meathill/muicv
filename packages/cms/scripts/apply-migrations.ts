import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type WranglerConfig = {
  d1_databases?: Array<{
    binding?: string;
    database_name?: string;
  }>;
};

type D1ExecuteResponse = Array<{
  results?: Array<Record<string, unknown>>;
  success?: boolean;
}>;

type Migration = {
  name: string;
  path: string;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cmsDir = resolve(scriptDir, '..');
const migrationsDir = join(cmsDir, 'migrations');
const isStatusOnly = process.argv.includes('--status');

function getDatabaseName(): string {
  const wranglerConfig = JSON.parse(readFileSync(join(cmsDir, 'wrangler.jsonc'), 'utf8')) as WranglerConfig;
  const cmsDatabase = wranglerConfig.d1_databases?.find((database) => database.binding === 'MUICV_CMS_DB');

  if (!cmsDatabase?.database_name) {
    throw new Error('Cannot find D1 database_name for binding MUICV_CMS_DB in packages/cms/wrangler.jsonc.');
  }

  return cmsDatabase.database_name;
}

function runWrangler(args: string[], options: { allowFailure?: boolean } = {}): string {
  const result = spawnSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: cmsDir,
    encoding: 'utf8',
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`wrangler ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
  }

  return result.stdout;
}

function parseWranglerJson(output: string): D1ExecuteResponse {
  const start = output.indexOf('[\n');
  const end = output.lastIndexOf(']');

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Cannot parse wrangler JSON output:\n${output}`);
  }

  return JSON.parse(output.slice(start, end + 1)) as D1ExecuteResponse;
}

function queryRows(
  databaseName: string,
  command: string,
  options: { allowFailure?: boolean } = {},
): Array<Record<string, unknown>> {
  const output = runWrangler(['d1', 'execute', databaseName, '--remote', '--command', command], options);

  if (!output.trim() && options.allowFailure) {
    return [];
  }

  return parseWranglerJson(output).flatMap((item) => item.results ?? []);
}

function getAppliedMigrationNames(databaseName: string): Set<string> {
  const rows = queryRows(databaseName, 'SELECT name FROM payload_migrations ORDER BY name;', { allowFailure: true });

  return new Set(rows.map((row) => row.name).filter((name): name is string => typeof name === 'string'));
}

function getLatestBatch(databaseName: string): number {
  const rows = queryRows(databaseName, 'SELECT COALESCE(MAX(batch), 0) AS batch FROM payload_migrations;', {
    allowFailure: true,
  });
  const batch = rows[0]?.batch;

  if (typeof batch === 'number') {
    return batch;
  }

  if (typeof batch === 'string') {
    return Number.parseInt(batch, 10) || 0;
  }

  return 0;
}

function getMigrationFiles(): Migration[] {
  return readdirSync(migrationsDir)
    .filter((file) => /^\d{8}_.*\.ts$/.test(file))
    .sort()
    .map((file) => ({
      name: basename(file, '.ts'),
      path: join(migrationsDir, file),
    }));
}

function escapeSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function normalizeSqlStatement(statement: string): string {
  const normalized = statement.replaceAll('\\`', '`').trim();
  return normalized.endsWith(';') ? normalized : `${normalized};`;
}

function extractUpStatements(migration: Migration): string[] {
  const source = readFileSync(migration.path, 'utf8');
  const upSection = source.split(/export\s+async\s+function\s+down/)[0] ?? '';
  const runCallCount = upSection.match(/await\s+db\.run/g)?.length ?? 0;
  // 模板串内的反引号都写作 \`（如 FOREIGN KEY (`_parent_id`)），因此串结束的反引号
  // 前面必然不是反斜杠；不加负向后顾会把 `\`) 截断成残缺 SQL。
  const statementPattern = /await\s+db\.run\(\s*sql`((?:\\.|[^`])*)(?<!\\)`\s*,?\s*\)/g;
  const statements = Array.from(upSection.matchAll(statementPattern), (match) => normalizeSqlStatement(match[1] ?? ''));

  if (statements.length !== runCallCount) {
    throw new Error(
      `${migration.name} contains ${runCallCount} db.run calls, but only ${statements.length} SQL statements could be extracted.`,
    );
  }

  if (statements.length === 0) {
    throw new Error(`${migration.name} does not contain SQL-only db.run migration statements.`);
  }

  return statements;
}

function buildMigrationSql(pendingMigrations: Migration[], batch: number): string {
  const statements = ['PRAGMA defer_foreign_keys=ON;'];

  for (const migration of pendingMigrations) {
    statements.push(`-- Payload migration: ${migration.name}`);
    statements.push(...extractUpStatements(migration));
    statements.push(
      `INSERT INTO \`payload_migrations\` (\`name\`, \`batch\`) VALUES (${escapeSqlString(migration.name)}, ${batch});`,
    );
  }

  return `${statements.join('\n\n')}\n`;
}

function printStatus(migrations: Migration[], appliedNames: Set<string>): void {
  for (const migration of migrations) {
    const status = appliedNames.has(migration.name) ? 'ran' : 'pending';
    console.log(`${status.padEnd(8)} ${migration.name}`);
  }
}

const databaseName = getDatabaseName();
const migrations = getMigrationFiles();
const appliedNames = getAppliedMigrationNames(databaseName);
const pendingMigrations = migrations.filter((migration) => !appliedNames.has(migration.name));

printStatus(migrations, appliedNames);

if (isStatusOnly) {
  process.exit(0);
}

if (pendingMigrations.length === 0) {
  console.log('No pending CMS migrations.');
  process.exit(0);
}

const batch = getLatestBatch(databaseName) + 1;
const tempDir = mkdtempSync(join(tmpdir(), 'muicv-cms-migrations-'));
const sqlFile = join(tempDir, `payload-migrations-batch-${batch}.sql`);

try {
  writeFileSync(sqlFile, buildMigrationSql(pendingMigrations, batch));
  runWrangler(['d1', 'execute', databaseName, '--remote', '--file', sqlFile]);
  console.log(`Applied ${pendingMigrations.length} CMS migration(s) to D1 ${databaseName}.`);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
