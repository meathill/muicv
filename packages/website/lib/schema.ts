/**
 * Better Auth 标准 4 表的 Drizzle schema。
 *
 * 列名与 Better Auth 默认完全对齐（camelCase）；类型映射：
 *   - createdAt / updatedAt / *expiresAt：integer mode 'timestamp_ms'，
 *     Drizzle 自动 Date <-> ms 互转
 *   - emailVerified：integer mode 'boolean'，0/1 自动 ↔ false/true
 *
 * SQL 表本身已由 migrations/0002_better_auth.sql 创建（运行时不会再 CREATE）。
 * 这份 schema 只作为 Better Auth Drizzle adapter 的查询元数据使用。
 */
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    idToken: text('idToken'),
    password: text('password'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('idx_account_provider').on(t.providerId, t.accountId)],
);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * API keys —— 给 skill / electron app 用。不存原文，只存 sha256(key)；
 * 撤销走软删（revokedAt 非空 = 已撤销）。
 */
export const apiKey = sqliteTable('apiKey', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('keyHash').notNull().unique(),
  keyPreview: text('keyPreview').notNull(),
  lastUsedAt: integer('lastUsedAt', { mode: 'timestamp_ms' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revokedAt', { mode: 'timestamp_ms' }),
});

/**
 * muirouter 关联（每用户最多一条）。
 *
 * OAuth 流程：dashboard / Electron app 跳 muirouter 授权 → 拿 code → 服务端换 token →
 * **access/refresh token 走 hsm.meathill.com 信封加密存储**，path = muicv/muirouter/<userId>。
 * D1 这张表只留非敏感元数据 + 余额快照——muicv 仓库不再持有任何密钥派生代码。
 *
 * defaultModel 是 fallback 走 muirouter 时注入到请求体的 model 字段，dashboard / app 都可改。
 * balance 等字段是上次成功调 muirouter 的快照，dashboard 默认看缓存，用户点刷新才重打。
 */
export const muirouterLink = sqliteTable('muirouterLink', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  tokenExpiresAt: integer('tokenExpiresAt', { mode: 'timestamp_ms' }).notNull(),
  scope: text('scope'),
  muirouterUserId: text('muirouterUserId').notNull(),
  muirouterEmail: text('muirouterEmail'),
  defaultModel: text('defaultModel').notNull().default('mimo'),
  currency: text('currency'),
  balanceCents: integer('balanceCents'),
  lifetimeToppedUpCents: integer('lifetimeToppedUpCents'),
  lifetimeSpentCents: integer('lifetimeSpentCents'),
  balanceUpdatedAt: integer('balanceUpdatedAt', { mode: 'timestamp_ms' }),
  lastError: text('lastError'),
  linkedAt: integer('linkedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Token 钱包：每用户一行余额，永不过期。
 * 注册赠送（10K 显示 token）走 lazy init，第一次访问时 INSERT OR IGNORE。
 * D1 原子扣账靠 `UPDATE ... WHERE balance >= :cost RETURNING balance`，
 * `meta.changes === 0` 即余额不足。
 *
 * **单位**：balance / lifetimeEarned / lifetimeSpent 都是 **μtoken**（1 显示 token = 10_000 μ）。
 * 见 packages/shared/src/pricing.ts 的 TOKEN_PRECISION，迁移见 migrations/0011_scale_tokens_to_micro.sql。
 */
export const tokenBalance = sqliteTable('tokenBalance', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetimeEarned').notNull().default(0),
  lifetimeSpent: integer('lifetimeSpent').notNull().default(0),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Token 流水：所有 balance 变化的审计日志。
 * delta 正负即入账 / 出账（单位与 tokenBalance.balance 一致：μtoken）。
 * invoice.paid 用 meta.invoiceId 做第二层幂等。
 */
export const tokenLedger = sqliteTable('tokenLedger', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  type: text('type').notNull(),
  meta: text('meta'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 消息级反馈（赞 / 踩 / 意见建议），见 migrations/0012_message_feedback.sql 注释。
 *
 * 与 tokenLedger 的关系：每条带奖励的反馈通过 wallet.credit() 写一条 type='feedback_reward'
 * 的 ledger，ledgerId = messageFeedback.id 实现幂等（重放不会重复发奖）。
 */
export const messageFeedback = sqliteTable('messageFeedback', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  messageId: text('messageId').notNull(),
  conversationId: text('conversationId').notNull(),
  kind: text('kind').notNull(), // 'rating' | 'comment'
  rating: text('rating'), // kind='rating' 时 'praise'|'dislike'
  text: text('text'),
  awarded: integer('awarded').notNull().default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Stripe 订阅状态承接表：每用户至多一条。stripeCustomerId UNIQUE 防同一 user 的脏数据。
 * stripeSubscriptionId 允许 null：customer 可以早于 subscription 存在（点了升级但
 * checkout 还没付款的中间态）。
 */
export const subscription = sqliteTable('subscription', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripeCustomerId').notNull().unique(),
  stripeSubscriptionId: text('stripeSubscriptionId').unique(),
  stripePriceId: text('stripePriceId'),
  monthlyTokens: integer('monthlyTokens'),
  status: text('status').notNull(),
  currentPeriodStart: integer('currentPeriodStart', { mode: 'timestamp_ms' }),
  currentPeriodEnd: integer('currentPeriodEnd', { mode: 'timestamp_ms' }),
  cancelAtPeriodEnd: integer('cancelAtPeriodEnd', { mode: 'boolean' }).notNull().default(false),
  canceledAt: integer('canceledAt', { mode: 'timestamp_ms' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Stripe webhook 幂等表：Stripe at-least-once 重发，靠 evt_id 去重。
 * handler 入口先 INSERT OR IGNORE，影响行数 = 0 说明已处理过，直接返回 200。
 */
export const stripeEvent = sqliteTable('stripeEvent', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  receivedAt: integer('receivedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 简历素材云同步——活动版（每用户 1 行）。
 * 用户在 muicv-sync skill 里主动 push 整个本地工作目录的 .md 文件，
 * files 列存 JSON 字符串 `{ "<相对路径>": "<文本内容>" }`。
 * 推送前由业务逻辑把当前活动版搬到 resumeSnapshotHistory（FIFO 5 份）。
 */
export const resumeSnapshot = sqliteTable('resumeSnapshot', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  files: text('files').notNull(),
  hash: text('hash').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  fileCount: integer('fileCount').notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 简历素材云同步——历史快照（最近 N 份）。
 * 每次 push 前把活动版搬过来；后台用 archivedAt DESC 取前 5 份，多余的删掉。
 * dashboard 上能看到列表 + 单个恢复。
 */
export const resumeSnapshotHistory = sqliteTable('resumeSnapshotHistory', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  files: text('files').notNull(),
  hash: text('hash').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  fileCount: integer('fileCount').notNull(),
  archivedAt: integer('archivedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 简历素材云同步加密路径——活动版（每用户 1 行）。
 * blob 本体存 R2（key: `users/{userId}/blobs/{blobId}.zip`），D1 这里只留元数据 + summary。
 * blobId 是 R2 object 的 key 后缀（uuid），dashboard 拿来拼下载链接。
 * 用户在 muicv-sync skill 里 `zip -e` 加密整库后 multipart 上传。服务端不解析 blob 内容。
 */
export const resumeSnapshotBlob = sqliteTable('resumeSnapshotBlob', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  blobId: text('blobId').notNull(),
  summary: text('summary').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 简历素材云同步加密路径——历史快照（最近 N 份）。
 * 每次 push 前把活动版搬过来；后台用 archivedAt DESC 取前 5 份，多余的删 D1 row + R2 object。
 * 同样 blob 本体在 R2，这里只是元数据。
 */
export const resumeSnapshotBlobHistory = sqliteTable('resumeSnapshotBlobHistory', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  blobId: text('blobId').notNull(),
  summary: text('summary').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  archivedAt: integer('archivedAt', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 在线预览：由 packages/api 的 POST /preview 写入（mui_ key 鉴权）。
 * dashboard 用 better-auth session 读 / 改（revoke / extend / share-mode）。
 *
 * 字段语义详见 migrations/0014_preview.sql。
 * createdAt / expiresAt / revokedAt 都是 epoch 毫秒（integer，不走 timestamp_ms mode，
 * 因为 packages/api 也直接 bind 数字而不是 Date）。
 */
export const preview = sqliteTable('preview', {
  token: text('token').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  resumeJson: text('resumeJson').notNull(),
  template: text('template').notNull(),
  lang: text('lang').notNull(),
  accent: text('accent'),
  shareMode: text('shareMode').notNull(),
  pdfCredit: integer('pdfCredit').notNull(),
  createdAt: integer('createdAt').notNull(),
  expiresAt: integer('expiresAt').notNull(),
  revokedAt: integer('revokedAt'),
});

/**
 * 证件照上传审计（packages/api/POST /upload/photo 写入）。
 * dashboard 上可以列出来给用户挑老照片复用，不做主键存储照片本身（在 R2）。
 */
export const photoUpload = sqliteTable('photoUpload', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  r2Key: text('r2Key').notNull().unique(),
  url: text('url').notNull(),
  contentType: text('contentType').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  originalName: text('originalName'),
  createdAt: integer('createdAt').notNull(),
});

/**
 * 聊天附件通用媒体上传审计（packages/api/POST /upload/media 写入）。
 * 对话正文不上传；这里只记录已经落到 R2 的图片 / PDF / 音频 / 文档 URL。
 */
export const mediaUpload = sqliteTable('mediaUpload', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  r2Key: text('r2Key').notNull().unique(),
  url: text('url').notNull(),
  kind: text('kind').notNull(),
  contentType: text('contentType').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  originalName: text('originalName'),
  createdAt: integer('createdAt').notNull(),
});
