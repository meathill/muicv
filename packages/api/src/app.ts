import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { optionalApiKey, requireApiKey } from './middleware/api-key.ts';
import {
  handleChangelog,
  handlePostDetail,
  handlePostsList,
  handleSkillDetail,
  handleSkillsCatalog,
} from './routes/content.ts';
import { handleComment, handleRate } from './routes/feedback.ts';
import { handleJobsFetch } from './routes/jobs.ts';
import { handleLlmProxy } from './routes/llm.ts';
import { handleMe } from './routes/me.ts';
import {
  handlePreviewCreate,
  handlePreviewExtend,
  handlePreviewGet,
  handlePreviewList,
  handlePreviewPdf,
  handlePreviewRevoke,
  handlePreviewShareMode,
  handlePreviewTemplate,
} from './routes/preview.ts';
import { handleRender } from './routes/render.ts';
import {
  handleResumeBlobHistoryList,
  handleResumeSnapshotBlobDelete,
  handleResumeSnapshotBlobDownload,
  handleResumeSnapshotBlobGet,
  handleResumeSyncBlob,
} from './routes/resume-sync-blob.ts';
import {
  handleResumeHistoryGet,
  handleResumeHistoryList,
  handleResumeSnapshotDelete,
  handleResumeSnapshotGet,
  handleResumeSync,
} from './routes/resume-sync.ts';
import { handleTranscribe } from './routes/transcribe.ts';
import { handleDeleteAllMedia, handleMediaHistory, handleUploadMedia } from './routes/upload-media.ts';
import { handlePhotoHistory, handleUploadPhoto } from './routes/upload-photo.ts';
import { handleWaitlist } from './routes/waitlist.ts';

type AppBindings = {
  Bindings: CloudflareBindings;
  Variables: {
    userId?: string;
    keyId?: string;
  };
};

const app = new Hono<AppBindings>();

/**
 * CORS 白名单：
 * - muicv.com / *.muicv.com（生产）
 * - localhost:任意端口（dev）
 *
 * Skill（CLI / curl）不发 Origin header，CORS 中间件对它们透传不拦截。
 */
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (origin === 'https://muicv.com') return origin;
      if (origin.endsWith('.muicv.com') && origin.startsWith('https://')) return origin;
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['content-type', 'authorization'],
    maxAge: 600,
  }),
);

app.get('/', (c) =>
  c.json({
    name: 'muicv-api',
    routes: [
      'GET /health',
      'POST /render',
      'POST /preview（创建可分享预览 URL）',
      'GET /preview（当前用户预览列表，dashboard 用）',
      'GET /preview/:token（公开查看预览数据）',
      'POST /preview/:token/pdf（下载预览对应 PDF）',
      'POST /preview/:token/revoke',
      'POST /preview/:token/extend',
      'POST /preview/:token/share-mode',
      'POST /preview/:token/template',
      'POST /upload/photo（multipart/form-data，字段 file）',
      'GET /upload/photo/history?limit=20（列当前用户最近上传）',
      'POST /upload/media（multipart/form-data，字段 file）',
      'GET /upload/media/history（列当前用户最近附件上传）',
      'DELETE /upload/media（删除当前用户所有云端媒体）',
      'POST /jobs/fetch',
      'POST /audio/transcribe（multipart/form-data，字段 file）',
      'POST /waitlist',
      'GET /me（拿当前登录用户信息）',
      'GET /skills/catalog（公开 skill 目录，app 用）',
      'GET /skills/:slug（公开 skill 详情）',
      'GET /posts?section=jobs（公开文章列表）',
      'GET /posts/:section/:slug（公开文章详情）',
      'GET /changelog（公开更新日志）',
      'ALL /llm/v1/* (OpenAI 兼容代理 → muirouter)',
      'POST /feedback/rate（赞/踩 AI 消息，奖励 1000 token）',
      'POST /feedback/comment（意见建议 AI 消息，≥50 字奖励 50000 token）',
      'POST /resume/sync（push 整个素材库快照，明文 JSON）',
      'GET /resume/snapshot（pull 活动版）',
      'GET /resume/snapshot/history（列历史快照 metadata）',
      'GET /resume/snapshot/history/:id（pull 某历史版本）',
      'DELETE /resume/snapshot（清空云端，明文路径）',
      'POST /resume/sync/blob（push 加密 zip blob，multipart/form-data: blob + summary）',
      'GET /resume/snapshot/blob（活动版元数据，不含二进制）',
      'GET /resume/snapshot/blob/:id/download（下载 blob zip）',
      'GET /resume/sync/blob/history（列加密快照历史）',
      'DELETE /resume/snapshot/blob（清空加密路径快照，含 R2 对象）',
    ],
  }),
);

app.get('/health', (c) => c.text('ok'));

/**
 * 公开内容目录：给网站外部消费者 / Electron app 读取。
 * App catalog 只返回 MuiCV 详情 / 接入页，不把用户直接导向第三方平台。
 */
app.get('/skills/catalog', handleSkillsCatalog);
app.get('/skills/:slug', handleSkillDetail);
app.get('/posts', handlePostsList);
app.get('/posts/:section/:slug', handlePostDetail);
app.get('/changelog', handleChangelog);

/**
 * GET /me —— 桌面 app / skill 用 mui_ key 拉取登录用户信息。
 */
app.get('/me', requireApiKey, handleMe);

/**
 * /llm/v1/* —— OpenAI 兼容反向代理到用户绑定的 muirouter（BYOK）。
 * 详见 src/routes/llm.ts。
 */
app.all('/llm/v1/*', requireApiKey, handleLlmProxy);

/**
 * /feedback/* —— 用户对单条 AI 消息的反馈，反过来奖励用户 token。
 *
 * - rate：赞 / 踩二选一，每条消息只奖励一次（切换 praise↔dislike 不重复发奖）。
 * - comment：自由文本，不限次数；≥50 字才发奖。
 *
 * 详见 src/routes/feedback.ts、src/lib/feedback.ts。
 */
app.post('/feedback/rate', requireApiKey, handleRate);
app.post('/feedback/comment', requireApiKey, handleComment);

/**
 * POST /waitlist
 *
 * Body: { email: string, source?: string }
 * 响应：201 / 400 / 409 / 500
 * 详见 src/routes/waitlist.ts
 */
app.post('/waitlist', handleWaitlist);

/**
 * POST /render —— 渲染简历 PDF。详见 src/routes/render.ts。
 */
app.post('/render', requireApiKey, handleRender);

/**
 * /preview/* —— 在线预览页 + PDF 下载。
 *
 * - POST /preview：登录态（Bearer key）创建一个分享 URL，body 是 TemplateResumeData。
 * - GET /preview/:token：公开端点，返回 resume JSON 给浏览器 SSR 用。
 * - POST /preview/:token/pdf：owner 第一次扣 PDF_RENDER_COST 渲染并解锁公开下载；
 *   后续公开访客复用同一份 D1 记录，不再重复扣 owner 余额。
 * - POST /preview/:token/revoke / /extend：仅 owner 可操作。
 *
 * 详见 src/routes/preview.ts。
 */
app.post('/preview', requireApiKey, handlePreviewCreate);
app.get('/preview', requireApiKey, handlePreviewList);
app.get('/preview/:token', handlePreviewGet);
app.post('/preview/:token/pdf', optionalApiKey, handlePreviewPdf);
app.post('/preview/:token/revoke', requireApiKey, handlePreviewRevoke);
app.post('/preview/:token/extend', requireApiKey, handlePreviewExtend);
app.post('/preview/:token/share-mode', requireApiKey, handlePreviewShareMode);
app.post('/preview/:token/template', requireApiKey, handlePreviewTemplate);

/**
 * /upload/photo
 *   - POST：证件照上传到 R2 + 写 photoUpload 审计行，返回公开 URL 写回 TemplateResumeData.photoUrl
 *   - GET /history?limit=：当前用户最近上传记录，给 dashboard / Electron 历史复用
 * 详见 src/routes/upload-photo.ts。
 */
app.post('/upload/photo', requireApiKey, handleUploadPhoto);
app.get('/upload/photo/history', requireApiKey, handlePhotoHistory);
app.post('/upload/media', requireApiKey, handleUploadMedia);
app.get('/upload/media/history', requireApiKey, handleMediaHistory);
app.delete('/upload/media', requireApiKey, handleDeleteAllMedia);

/**
 * POST /jobs/fetch —— 用 Browser Rendering 抓 JD 转 markdown。详见 src/routes/jobs.ts。
 */
app.post('/jobs/fetch', requireApiKey, handleJobsFetch);

/**
 * POST /audio/transcribe —— STT 转写（issue #1 M1）。
 *
 * Body: multipart/form-data，字段 `file`（音频，< 25MB / < 10min）
 * 响应：200 application/json { transcript, duration_ms, language, segments? } / 400 / 402 / 502
 *
 * 走 Cloudflare Workers AI `@cf/openai/whisper-large-v3-turbo`。
 * 计费：成功才扣，按返回 duration 实际时长向上取整到分钟 × STT_TRANSCRIBE_RATE_PER_MIN。
 * 详见 src/routes/transcribe.ts。
 */
app.post('/audio/transcribe', requireApiKey, handleTranscribe);

/**
 * /resume/* —— 简历素材云同步（skill 用 Bearer key 调用）。
 *
 * 两条路径并存（详见 src/routes/resume-sync.ts / src/routes/resume-sync-blob.ts）：
 *   - 明文路径：JSON `{ files: { path: content } }` 直入 D1，dashboard 能看到文件列表
 *     + 历史 diff。仅接受 .md，单库 50 MB / 1000 文件上限。
 *   - 加密路径：multipart 上传 zip blob 到 R2，D1 只存元数据 + summary。dashboard 上
 *     只能下载 .zip 自己解密。blob ≤ 60 MB，summary ≤ 500 字符。
 *
 * 都不扣 token；推送前自动把当前活动版搬到 history（最近 5 份）。
 */
app.post('/resume/sync', requireApiKey, handleResumeSync);
app.get('/resume/snapshot', requireApiKey, handleResumeSnapshotGet);
app.get('/resume/snapshot/history', requireApiKey, handleResumeHistoryList);
app.get('/resume/snapshot/history/:id', requireApiKey, handleResumeHistoryGet);
app.delete('/resume/snapshot', requireApiKey, handleResumeSnapshotDelete);

app.post('/resume/sync/blob', requireApiKey, handleResumeSyncBlob);
app.get('/resume/snapshot/blob', requireApiKey, handleResumeSnapshotBlobGet);
app.get('/resume/snapshot/blob/:id/download', requireApiKey, handleResumeSnapshotBlobDownload);
app.get('/resume/sync/blob/history', requireApiKey, handleResumeBlobHistoryList);
app.delete('/resume/snapshot/blob', requireApiKey, handleResumeSnapshotBlobDelete);

export default app;
