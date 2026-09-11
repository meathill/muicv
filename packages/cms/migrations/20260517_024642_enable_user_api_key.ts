import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`enable_a_p_i_key\` integer;`);
  await db.run(sql`ALTER TABLE \`users\` ADD \`api_key\` text;`);
  await db.run(sql`ALTER TABLE \`users\` ADD \`api_key_index\` text;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`enable_a_p_i_key\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`api_key\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`api_key_index\`;`);
}
