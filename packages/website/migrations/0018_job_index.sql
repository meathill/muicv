-- 统一岗位检索索引：采集岗位（CMS opportunities 镜像）+ 社区 JD 写到同一张表，
-- 结构化列做 SQL 硬过滤，FTS5 trigram 做中英文模糊 / 拼写容错检索，Vectorize 做语义检索。
-- 只新增表 / 索引 / 触发器，不改动既有表。
--
-- 列表型字段用逗号包裹存储（',US,CA,'），用 LIKE '%,US,%' 精确匹配单个值。
-- isOpenLocation=1 表示未声明国家 / 大区限制（视为不限）。

CREATE TABLE IF NOT EXISTS jobIndex (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  refId TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  workplace TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  allowedCountries TEXT NOT NULL DEFAULT '',
  allowedRegions TEXT NOT NULL DEFAULT '',
  coveredRegions TEXT NOT NULL DEFAULT '',
  isOpenLocation INTEGER NOT NULL DEFAULT 1,
  utcOffsetMin REAL,
  utcOffsetMax REAL,
  officeLocations TEXT NOT NULL DEFAULT '[]',
  fingerprint TEXT NOT NULL,
  urlKey TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  postedAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobIndex_kind_ref ON jobIndex (kind, refId);
CREATE INDEX IF NOT EXISTS idx_jobIndex_status_posted ON jobIndex (status, postedAt DESC);
CREATE INDEX IF NOT EXISTS idx_jobIndex_status_workplace_posted ON jobIndex (status, workplace, postedAt DESC);
CREATE INDEX IF NOT EXISTS idx_jobIndex_status_category_posted ON jobIndex (status, category, postedAt DESC);
CREATE INDEX IF NOT EXISTS idx_jobIndex_status_kind_posted ON jobIndex (status, kind, postedAt DESC);
CREATE INDEX IF NOT EXISTS idx_jobIndex_fingerprint ON jobIndex (fingerprint);
CREATE INDEX IF NOT EXISTS idx_jobIndex_urlKey ON jobIndex (urlKey);

CREATE VIRTUAL TABLE IF NOT EXISTS jobIndexFts USING fts5(
  title,
  company,
  location,
  body,
  content='jobIndex',
  content_rowid='rowid',
  tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS jobIndex_ai AFTER INSERT ON jobIndex BEGIN
  INSERT INTO jobIndexFts(rowid, title, company, location, body)
  VALUES (new.rowid, new.title, new.company, new.location, new.body);
END;

CREATE TRIGGER IF NOT EXISTS jobIndex_ad AFTER DELETE ON jobIndex BEGIN
  INSERT INTO jobIndexFts(jobIndexFts, rowid, title, company, location, body)
  VALUES ('delete', old.rowid, old.title, old.company, old.location, old.body);
END;

CREATE TRIGGER IF NOT EXISTS jobIndex_au AFTER UPDATE ON jobIndex BEGIN
  INSERT INTO jobIndexFts(jobIndexFts, rowid, title, company, location, body)
  VALUES ('delete', old.rowid, old.title, old.company, old.location, old.body);
  INSERT INTO jobIndexFts(rowid, title, company, location, body)
  VALUES (new.rowid, new.title, new.company, new.location, new.body);
END;
