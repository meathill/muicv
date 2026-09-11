import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`posts_slug_idx\`;`);
  await db.run(sql`ALTER TABLE \`posts\` ADD \`locale\` text DEFAULT 'zh-CN';`);
  await db.run(sql`CREATE UNIQUE INDEX \`locale_slug_idx\` ON \`posts\` (\`locale\`,\`slug\`);`);
  await db.run(sql`CREATE INDEX \`posts_slug_idx\` ON \`posts\` (\`slug\`);`);
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`version_locale\` text DEFAULT 'zh-CN';`);
  await db.run(
    sql`CREATE INDEX \`version_locale_version_slug_idx\` ON \`_posts_v\` (\`version_locale\`,\`version_slug\`);`,
  );
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`locale_slug_idx\`;`);
  await db.run(sql`DROP INDEX \`posts_slug_idx\`;`);
  await db.run(sql`CREATE UNIQUE INDEX \`posts_slug_idx\` ON \`posts\` (\`slug\`);`);
  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`locale\`;`);
  await db.run(sql`DROP INDEX \`version_locale_version_slug_idx\`;`);
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_locale\`;`);
}
