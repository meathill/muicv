import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`articles_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`articles_sources_order_idx\` ON \`articles_sources\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`articles_sources_parent_id_idx\` ON \`articles_sources\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`_articles_v_version_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_sources_order_idx\` ON \`_articles_v_version_sources\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_sources_parent_id_idx\` ON \`_articles_v_version_sources\` (\`_parent_id\`);`,
  );
  await db.run(sql`ALTER TABLE \`articles\` ADD \`source_published_at\` text;`);
  await db.run(sql`ALTER TABLE \`articles\` ADD \`reading_minutes\` numeric;`);
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_source_published_at\` text;`);
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_reading_minutes\` numeric;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`articles_sources\`;`);
  await db.run(sql`DROP TABLE \`_articles_v_version_sources\`;`);
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`source_published_at\`;`);
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`reading_minutes\`;`);
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_source_published_at\`;`);
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_reading_minutes\`;`);
}
