import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`opportunities_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`opportunities\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`opportunities_tags_order_idx\` ON \`opportunities_tags\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`opportunities_tags_parent_id_idx\` ON \`opportunities_tags\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`opportunities\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`company\` text NOT NULL,
  	\`location\` text,
  	\`remote\` text DEFAULT 'onsite' NOT NULL,
  	\`region\` text DEFAULT 'other' NOT NULL,
  	\`category\` text DEFAULT 'engineering' NOT NULL,
  	\`employment_type\` text,
  	\`summary\` text,
  	\`description_markdown\` text,
  	\`apply_url\` text NOT NULL,
  	\`source\` text NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`dedupe_key\` text NOT NULL,
  	\`fingerprint\` text NOT NULL,
  	\`posted_at\` text NOT NULL,
  	\`status\` text DEFAULT 'published' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(sql`CREATE INDEX \`opportunities_company_idx\` ON \`opportunities\` (\`company\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`opportunities_dedupe_key_idx\` ON \`opportunities\` (\`dedupe_key\`);`);
  await db.run(sql`CREATE INDEX \`opportunities_fingerprint_idx\` ON \`opportunities\` (\`fingerprint\`);`);
  await db.run(sql`CREATE INDEX \`opportunities_posted_at_idx\` ON \`opportunities\` (\`posted_at\`);`);
  await db.run(sql`CREATE INDEX \`opportunities_status_idx\` ON \`opportunities\` (\`status\`);`);
  await db.run(sql`CREATE INDEX \`opportunities_updated_at_idx\` ON \`opportunities\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`opportunities_created_at_idx\` ON \`opportunities\` (\`created_at\`);`);
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`opportunities_id\` integer REFERENCES opportunities(id);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_opportunities_id_idx\` ON \`payload_locked_documents_rels\` (\`opportunities_id\`);`,
  );
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`opportunities_tags\`;`);
  await db.run(sql`DROP TABLE \`opportunities\`;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`posts_id\` integer,
  	\`articles_id\` integer,
  	\`skill_extensions_id\` integer,
  	\`changelog_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`skill_extensions_id\`) REFERENCES \`skill_extensions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`changelog_id\`) REFERENCES \`changelog\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "posts_id", "articles_id", "skill_extensions_id", "changelog_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "posts_id", "articles_id", "skill_extensions_id", "changelog_id" FROM \`payload_locked_documents_rels\`;`,
  );
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`posts_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_skill_extensions_id_idx\` ON \`payload_locked_documents_rels\` (\`skill_extensions_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_changelog_id_idx\` ON \`payload_locked_documents_rels\` (\`changelog_id\`);`,
  );
}
