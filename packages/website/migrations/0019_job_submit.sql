-- 扩展「任意页面提交岗位」：提交记录（含预扣 / 结算，幂等依据）、私藏岗位、外链抓取缓存。
-- 纯新增表 / 索引，不改动已有表。

CREATE TABLE IF NOT EXISTS jobSubmission (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  urlHash TEXT NOT NULL,
  visibility TEXT NOT NULL,            -- public | private
  status TEXT NOT NULL,                -- held | settled | failed
  method TEXT,                         -- jsonld | ats | ai | none
  jobsFound INTEGER NOT NULL DEFAULT 0,
  jobsNew INTEGER NOT NULL DEFAULT 0,
  holdMicro INTEGER NOT NULL DEFAULT 0,
  costMicro INTEGER NOT NULL DEFAULT 0,      -- 实际 AI 成本
  chargedMicro INTEGER NOT NULL DEFAULT 0,   -- 最终扣费
  rewardMicro INTEGER NOT NULL DEFAULT 0,
  result TEXT,                         -- JSON：返回给客户端的岗位列表
  error TEXT,
  createdAt INTEGER NOT NULL,
  settledAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_jobSubmission_user_created ON jobSubmission (userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_jobSubmission_status ON jobSubmission (status, createdAt);

CREATE TABLE IF NOT EXISTS savedJob (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  submissionId TEXT,
  url TEXT NOT NULL,
  urlHash TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  workplace TEXT NOT NULL DEFAULT 'onsite',
  restrictions TEXT NOT NULL DEFAULT '{}', -- JSON：allowedCountries / allowedRegions / utcOffsetMin / Max / officeLocations
  markdown TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_savedJob_user_url ON savedJob (userId, urlHash);
CREATE INDEX IF NOT EXISTS idx_savedJob_user_created ON savedJob (userId, createdAt DESC);

CREATE TABLE IF NOT EXISTS jobLinkCache (
  urlHash TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  status INTEGER NOT NULL,             -- HTTP 状态；0 = 网络错误 / 被拒
  contentType TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',       -- 截断后的正文（HTML 或 JSON）
  fetchedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobLinkCache_fetched ON jobLinkCache (fetchedAt);
