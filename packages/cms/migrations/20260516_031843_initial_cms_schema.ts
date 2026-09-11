import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_sessions\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` text PRIMARY KEY NOT NULL,
   \`created_at\` text,
   \`expires_at\` text NOT NULL,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`users\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`name\` text,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`email\` text NOT NULL,
   \`reset_password_token\` text,
   \`reset_password_expiration\` text,
   \`salt\` text,
   \`hash\` text,
   \`login_attempts\` numeric DEFAULT 0,
   \`lock_until\` text
  );
  `);
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`);
  await db.run(sql`CREATE TABLE \`media\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`alt\` text NOT NULL,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`url\` text,
   \`thumbnail_u_r_l\` text,
   \`filename\` text,
   \`mime_type\` text,
   \`filesize\` numeric,
   \`width\` numeric,
   \`height\` numeric,
   \`focal_x\` numeric,
   \`focal_y\` numeric
  );
  `);
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`);
  await db.run(sql`CREATE TABLE \`posts_tags\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` text PRIMARY KEY NOT NULL,
   \`value\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`posts_tags_order_idx\` ON \`posts_tags\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`posts_tags_parent_id_idx\` ON \`posts_tags\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`posts_keywords\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` text PRIMARY KEY NOT NULL,
   \`value\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`posts_keywords_order_idx\` ON \`posts_keywords\` (\`_order\`);`);
  await db.run(sql`CREATE INDEX \`posts_keywords_parent_id_idx\` ON \`posts_keywords\` (\`_parent_id\`);`);
  await db.run(sql`CREATE TABLE \`posts\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`title\` text,
   \`slug\` text,
   \`section\` text DEFAULT 'jobs',
   \`status\` text DEFAULT 'draft',
   \`summary\` text,
   \`body_markdown\` text,
   \`author\` text DEFAULT 'Mui简历',
   \`published_at\` text,
   \`seo_title\` text,
   \`seo_description\` text,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`_status\` text DEFAULT 'draft'
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`posts_slug_idx\` ON \`posts\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`posts_updated_at_idx\` ON \`posts\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`posts_created_at_idx\` ON \`posts\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`posts__status_idx\` ON \`posts\` (\`_status\`);`);
  await db.run(sql`CREATE TABLE \`_posts_v_version_tags\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` integer PRIMARY KEY NOT NULL,
   \`value\` text,
   \`_uuid\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`_posts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`_posts_v_version_tags_order_idx\` ON \`_posts_v_version_tags\` (\`_order\`);`);
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_tags_parent_id_idx\` ON \`_posts_v_version_tags\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_posts_v_version_keywords\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` integer PRIMARY KEY NOT NULL,
   \`value\` text,
   \`_uuid\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`_posts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_keywords_order_idx\` ON \`_posts_v_version_keywords\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_posts_v_version_keywords_parent_id_idx\` ON \`_posts_v_version_keywords\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_posts_v\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`parent_id\` integer,
   \`version_title\` text,
   \`version_slug\` text,
   \`version_section\` text DEFAULT 'jobs',
   \`version_status\` text DEFAULT 'draft',
   \`version_summary\` text,
   \`version_body_markdown\` text,
   \`version_author\` text DEFAULT 'Mui简历',
   \`version_published_at\` text,
   \`version_seo_title\` text,
   \`version_seo_description\` text,
   \`version_updated_at\` text,
   \`version_created_at\` text,
   \`version__status\` text DEFAULT 'draft',
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`latest\` integer,
   FOREIGN KEY (\`parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_posts_v_parent_idx\` ON \`_posts_v\` (\`parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_slug_idx\` ON \`_posts_v\` (\`version_slug\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_updated_at_idx\` ON \`_posts_v\` (\`version_updated_at\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_created_at_idx\` ON \`_posts_v\` (\`version_created_at\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_version_version__status_idx\` ON \`_posts_v\` (\`version__status\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_created_at_idx\` ON \`_posts_v\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_updated_at_idx\` ON \`_posts_v\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`_posts_v_latest_idx\` ON \`_posts_v\` (\`latest\`);`);
  await db.run(sql`CREATE TABLE \`skill_extensions_use_cases\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` text PRIMARY KEY NOT NULL,
   \`value\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`skill_extensions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`skill_extensions_use_cases_order_idx\` ON \`skill_extensions_use_cases\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`skill_extensions_use_cases_parent_id_idx\` ON \`skill_extensions_use_cases\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`skill_extensions_tags\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` text PRIMARY KEY NOT NULL,
   \`value\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`skill_extensions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`skill_extensions_tags_order_idx\` ON \`skill_extensions_tags\` (\`_order\`);`);
  await db.run(
    sql`CREATE INDEX \`skill_extensions_tags_parent_id_idx\` ON \`skill_extensions_tags\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`skill_extensions_keywords\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` text PRIMARY KEY NOT NULL,
   \`value\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`skill_extensions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`skill_extensions_keywords_order_idx\` ON \`skill_extensions_keywords\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`skill_extensions_keywords_parent_id_idx\` ON \`skill_extensions_keywords\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`skill_extensions\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`title\` text,
   \`slug\` text,
   \`status\` text DEFAULT 'draft',
   \`publisher\` text,
   \`publisher_type\` text DEFAULT 'community',
   \`source_url\` text,
   \`source_label\` text,
   \`source_note\` text,
   \`distribution_mode\` text DEFAULT 'link_only',
   \`app_availability\` text DEFAULT 'link_only',
   \`summary\` text,
   \`body_markdown\` text,
   \`disclaimer\` text,
   \`published_at\` text,
   \`seo_title\` text,
   \`seo_description\` text,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`_status\` text DEFAULT 'draft'
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`skill_extensions_slug_idx\` ON \`skill_extensions\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`skill_extensions_updated_at_idx\` ON \`skill_extensions\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`skill_extensions_created_at_idx\` ON \`skill_extensions\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`skill_extensions__status_idx\` ON \`skill_extensions\` (\`_status\`);`);
  await db.run(sql`CREATE TABLE \`_skill_extensions_v_version_use_cases\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` integer PRIMARY KEY NOT NULL,
   \`value\` text,
   \`_uuid\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`_skill_extensions_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_use_cases_order_idx\` ON \`_skill_extensions_v_version_use_cases\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_use_cases_parent_id_idx\` ON \`_skill_extensions_v_version_use_cases\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_skill_extensions_v_version_tags\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` integer PRIMARY KEY NOT NULL,
   \`value\` text,
   \`_uuid\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`_skill_extensions_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_tags_order_idx\` ON \`_skill_extensions_v_version_tags\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_tags_parent_id_idx\` ON \`_skill_extensions_v_version_tags\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_skill_extensions_v_version_keywords\` (
   \`_order\` integer NOT NULL,
   \`_parent_id\` integer NOT NULL,
   \`id\` integer PRIMARY KEY NOT NULL,
   \`value\` text,
   \`_uuid\` text,
   FOREIGN KEY (\`_parent_id\`) REFERENCES \`_skill_extensions_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_keywords_order_idx\` ON \`_skill_extensions_v_version_keywords\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_keywords_parent_id_idx\` ON \`_skill_extensions_v_version_keywords\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_skill_extensions_v\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`parent_id\` integer,
   \`version_title\` text,
   \`version_slug\` text,
   \`version_status\` text DEFAULT 'draft',
   \`version_publisher\` text,
   \`version_publisher_type\` text DEFAULT 'community',
   \`version_source_url\` text,
   \`version_source_label\` text,
   \`version_source_note\` text,
   \`version_distribution_mode\` text DEFAULT 'link_only',
   \`version_app_availability\` text DEFAULT 'link_only',
   \`version_summary\` text,
   \`version_body_markdown\` text,
   \`version_disclaimer\` text,
   \`version_published_at\` text,
   \`version_seo_title\` text,
   \`version_seo_description\` text,
   \`version_updated_at\` text,
   \`version_created_at\` text,
   \`version__status\` text DEFAULT 'draft',
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`latest\` integer,
   FOREIGN KEY (\`parent_id\`) REFERENCES \`skill_extensions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_skill_extensions_v_parent_idx\` ON \`_skill_extensions_v\` (\`parent_id\`);`);
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_version_slug_idx\` ON \`_skill_extensions_v\` (\`version_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_version_updated_at_idx\` ON \`_skill_extensions_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_version_created_at_idx\` ON \`_skill_extensions_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_skill_extensions_v_version_version__status_idx\` ON \`_skill_extensions_v\` (\`version__status\`);`,
  );
  await db.run(sql`CREATE INDEX \`_skill_extensions_v_created_at_idx\` ON \`_skill_extensions_v\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`_skill_extensions_v_updated_at_idx\` ON \`_skill_extensions_v\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`_skill_extensions_v_latest_idx\` ON \`_skill_extensions_v\` (\`latest\`);`);
  await db.run(sql`CREATE TABLE \`changelog\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`title\` text,
   \`slug\` text,
   \`status\` text DEFAULT 'draft',
   \`version\` text,
   \`summary\` text,
   \`body_markdown\` text,
   \`published_at\` text,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`_status\` text DEFAULT 'draft'
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`changelog_slug_idx\` ON \`changelog\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`changelog_updated_at_idx\` ON \`changelog\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`changelog_created_at_idx\` ON \`changelog\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`changelog__status_idx\` ON \`changelog\` (\`_status\`);`);
  await db.run(sql`CREATE TABLE \`_changelog_v\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`parent_id\` integer,
   \`version_title\` text,
   \`version_slug\` text,
   \`version_status\` text DEFAULT 'draft',
   \`version_version\` text,
   \`version_summary\` text,
   \`version_body_markdown\` text,
   \`version_published_at\` text,
   \`version_updated_at\` text,
   \`version_created_at\` text,
   \`version__status\` text DEFAULT 'draft',
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`latest\` integer,
   FOREIGN KEY (\`parent_id\`) REFERENCES \`changelog\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_changelog_v_parent_idx\` ON \`_changelog_v\` (\`parent_id\`);`);
  await db.run(sql`CREATE INDEX \`_changelog_v_version_version_slug_idx\` ON \`_changelog_v\` (\`version_slug\`);`);
  await db.run(
    sql`CREATE INDEX \`_changelog_v_version_version_updated_at_idx\` ON \`_changelog_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_changelog_v_version_version_created_at_idx\` ON \`_changelog_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_changelog_v_version_version__status_idx\` ON \`_changelog_v\` (\`version__status\`);`,
  );
  await db.run(sql`CREATE INDEX \`_changelog_v_created_at_idx\` ON \`_changelog_v\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`_changelog_v_updated_at_idx\` ON \`_changelog_v\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`_changelog_v_latest_idx\` ON \`_changelog_v\` (\`latest\`);`);
  await db.run(sql`CREATE TABLE \`payload_kv\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`key\` text NOT NULL,
   \`data\` text NOT NULL
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`);
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`global_slug\` text,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
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
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`key\` text,
   \`value\` text,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`);
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`order\` integer,
   \`parent_id\` integer NOT NULL,
   \`path\` text NOT NULL,
   \`users_id\` integer,
   FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
   FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`);
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`,
  );
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`);
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
   \`id\` integer PRIMARY KEY NOT NULL,
   \`name\` text,
   \`batch\` numeric,
   \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
   \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_sessions\`;`);
  await db.run(sql`DROP TABLE \`users\`;`);
  await db.run(sql`DROP TABLE \`media\`;`);
  await db.run(sql`DROP TABLE \`posts_tags\`;`);
  await db.run(sql`DROP TABLE \`posts_keywords\`;`);
  await db.run(sql`DROP TABLE \`posts\`;`);
  await db.run(sql`DROP TABLE \`_posts_v_version_tags\`;`);
  await db.run(sql`DROP TABLE \`_posts_v_version_keywords\`;`);
  await db.run(sql`DROP TABLE \`_posts_v\`;`);
  await db.run(sql`DROP TABLE \`skill_extensions_use_cases\`;`);
  await db.run(sql`DROP TABLE \`skill_extensions_tags\`;`);
  await db.run(sql`DROP TABLE \`skill_extensions_keywords\`;`);
  await db.run(sql`DROP TABLE \`skill_extensions\`;`);
  await db.run(sql`DROP TABLE \`_skill_extensions_v_version_use_cases\`;`);
  await db.run(sql`DROP TABLE \`_skill_extensions_v_version_tags\`;`);
  await db.run(sql`DROP TABLE \`_skill_extensions_v_version_keywords\`;`);
  await db.run(sql`DROP TABLE \`_skill_extensions_v\`;`);
  await db.run(sql`DROP TABLE \`changelog\`;`);
  await db.run(sql`DROP TABLE \`_changelog_v\`;`);
  await db.run(sql`DROP TABLE \`payload_kv\`;`);
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`);
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
  await db.run(sql`DROP TABLE \`payload_preferences\`;`);
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`);
  await db.run(sql`DROP TABLE \`payload_migrations\`;`);
}
