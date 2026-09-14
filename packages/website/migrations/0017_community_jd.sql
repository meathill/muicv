-- 社区岗位库：用户主动贡献的 JD。urlHash / contentHash 去重；status=hidden 下架后仍留行。
-- FTS5 给公开 /jobs 搜索用。rowid 走 SQLite 隐式整数主键，communityJd.id 是对外 UUID。

CREATE TABLE IF NOT EXISTS communityJd (
  id TEXT PRIMARY KEY,
  canonicalUrl TEXT NOT NULL,
  urlHash TEXT NOT NULL,
  contentHash TEXT NOT NULL,
  sourceSite TEXT NOT NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  employmentType TEXT,
  markdown TEXT NOT NULL,
  contributorUserId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'published',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_communityJd_urlHash ON communityJd (urlHash);
CREATE INDEX IF NOT EXISTS idx_communityJd_contentHash ON communityJd (contentHash);
CREATE INDEX IF NOT EXISTS idx_communityJd_site_created ON communityJd (sourceSite, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_communityJd_company_created ON communityJd (company, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_communityJd_contributor ON communityJd (contributorUserId, createdAt DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS communityJdFts USING fts5(
  title,
  company,
  location,
  markdown,
  content='communityJd',
  content_rowid='rowid'
);
