import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`articles_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`articles_tags_order_idx\` ON \`articles_tags\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`articles_tags_parent_id_idx\` ON \`articles_tags\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`articles_keywords\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`articles_keywords_order_idx\` ON \`articles_keywords\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`articles_keywords_parent_id_idx\` ON \`articles_keywords\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`articles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site\` text DEFAULT 'muicv',
  	\`locale\` text DEFAULT 'en',
  	\`title\` text,
  	\`slug\` text,
  	\`status\` text DEFAULT 'draft',
  	\`summary\` text,
  	\`body_markdown\` text,
  	\`author\` text,
  	\`published_at\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft'
  );
  `);
  await db.run(sql`CREATE INDEX \`articles_slug_idx\` ON \`articles\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`articles_updated_at_idx\` ON \`articles\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`articles_created_at_idx\` ON \`articles\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`articles__status_idx\` ON \`articles\` (\`_status\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`site_locale_slug_idx\` ON \`articles\` (\`site\`,\`locale\`,\`slug\`);`);
  await db.run(sql`CREATE TABLE \`_articles_v_version_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`_articles_v_version_tags_order_idx\` ON \`_articles_v_version_tags\` (\`_order\`);`);
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_tags_parent_id_idx\` ON \`_articles_v_version_tags\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_articles_v_version_keywords\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_keywords_order_idx\` ON \`_articles_v_version_keywords\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_keywords_parent_id_idx\` ON \`_articles_v_version_keywords\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_articles_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_site\` text DEFAULT 'muicv',
  	\`version_locale\` text DEFAULT 'en',
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_status\` text DEFAULT 'draft',
  	\`version_summary\` text,
  	\`version_body_markdown\` text,
  	\`version_author\` text,
  	\`version_published_at\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_articles_v_parent_idx\` ON \`_articles_v\` (\`parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_slug_idx\` ON \`_articles_v\` (\`version_slug\`);`);
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_updated_at_idx\` ON \`_articles_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_created_at_idx\` ON \`_articles_v\` (\`version_created_at\`);`,
  );
  await db.run(sql`CREATE INDEX \`_articles_v_version_version__status_idx\` ON \`_articles_v\` (\`version__status\`);`);
  await db.run(sql`CREATE INDEX \`_articles_v_created_at_idx\` ON \`_articles_v\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`_articles_v_updated_at_idx\` ON \`_articles_v\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`_articles_v_latest_idx\` ON \`_articles_v\` (\`latest\`);`);
  await db.run(
    sql`CREATE INDEX \`version_site_version_locale_version_slug_idx\` ON \`_articles_v\` (\`version_site\`,\`version_locale\`,\`version_slug\`);`,
  );
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`articles_id\` integer REFERENCES articles(id);`);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`,
  );
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`articles_tags\`;`);
  await db.run(sql`DROP TABLE \`articles_keywords\`;`);
  await db.run(sql`DROP TABLE \`articles\`;`);
  await db.run(sql`DROP TABLE \`_articles_v_version_tags\`;`);
  await db.run(sql`DROP TABLE \`_articles_v_version_keywords\`;`);
  await db.run(sql`DROP TABLE \`_articles_v\`;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`posts_id\` integer,
  	\`skill_extensions_id\` integer,
  	\`changelog_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`skill_extensions_id\`) REFERENCES \`skill_extensions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`changelog_id\`) REFERENCES \`changelog\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "posts_id", "skill_extensions_id", "changelog_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "posts_id", "skill_extensions_id", "changelog_id" FROM \`payload_locked_documents_rels\`;`,
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
    sql`CREATE INDEX \`payload_locked_documents_rels_skill_extensions_id_idx\` ON \`payload_locked_documents_rels\` (\`skill_extensions_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_changelog_id_idx\` ON \`payload_locked_documents_rels\` (\`changelog_id\`);`,
  );
}
