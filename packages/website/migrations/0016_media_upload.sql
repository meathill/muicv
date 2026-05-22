-- 通用媒体上传审计：聊天附件（图片、PDF、录音、文档、文本）上传到 R2 后记录在这里。
-- R2 key 固定放在 <userId>/media/<uuid>.<ext>，和旧证件照 photoUpload 的 <userId>/<uuid>.<ext> 区分。
--
-- 注意：这里记录的是云端附件 URL，不存对话正文。桌面端对话仍然只在本地持久化。

CREATE TABLE IF NOT EXISTS mediaUpload (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  r2Key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  kind TEXT NOT NULL,
  contentType TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL,
  originalName TEXT,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mediaUpload_user ON mediaUpload (userId, createdAt DESC);
