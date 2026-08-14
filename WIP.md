# WIP：Mui简历开发计划

最后更新：2026-05-17

## 当前进行中

> 已完成的插队任务（设置页三分组重构 / 腾讯校招内容降级 / Changelog 工作流 / Payload
> 用户 API Key / Skill 目录 + Payload CMS / 腾讯校招内容落地 / Issue 11 首页移动端
> LCP）的决策和约束已沉淀进 [DEV_NOTE.md](./DEV_NOTE.md)，不再保留勾选列表。

### 插队任务：Pricing 缓存化 + 缓存栈补全 + 统计/IndexNow（issue #14 + #13）

目标：中英文 Pricing 从每次完整 SSR 改为构建期静态化（动态数据走客户端 API），静态资源加 immutable 头，补 DO Queue 让时间型 ISR revalidation 真正生效；接入 IndexNow 提升 Bing 收录。

- [x] `GET /api/pricing/state` 聚合登录态 / 订阅 / 币种 / CN cooldown（issue #14）
- [x] PricingView 拆静态壳 + `_pricing-client.tsx` 客户端动态区，两个 pricing page 去掉 `force-dynamic`
- [x] `CurrencyToggle` 加可选 `onSwitch`（dashboard 行为不变）
- [x] website / cms `public/_headers`：`/_next/static/*` immutable
- [x] website：regional cache + DO Queue + `enableCacheInterception`；cms：regional cache + interception
- [x] IndexNow key 文件 + `scripts/indexnow-submit.ts`（issue #13）
- [x] website / cms build + dev 手测通过
- [x] 验收补充：/api/* 全局 no-store（next.config）；Pricing CDN 缓存规则评估后不做（见 DEV_NOTE）
- [ ] 部署 website + cms（DO migration 随部署应用）
- [ ] 部署后 curl 验证 immutable 头 + 跑 indexnow 脚本 + 关闭两个 issue

### 插队任务：连接授权页简化

目标：把浏览器授权页从“解释 API key / dashboard / callback”改成普通用户能立刻理解的“确认连接并回到桌面端继续”。

- [ ] 默认视图只保留账号、连接对象和一个主按钮。
- [ ] 授权成功后只提示“已连接”，把手动 key 复制作为问题排查兜底隐藏起来。
- [ ] 保留安全与错误状态，不暴露不必要的底层概念。
- [ ] 跑 website 构建验证。

### Phase 15：云同步隐私改造

目标：用户对"上云"的信任成本降到最低——服务端默认看不到明文素材；用户对 GitHub 仓库可见性有完整控制权。威胁模型：防 muicv 自己脱库 / 内部员工偷看，不是防 AI provider。

skill 端（已落地）：

- [x] [skills/muicv-sync/SKILL.md](skills/muicv-sync/SKILL.md) 大改：
  - [x] push 加 zip 加密分支（用户给密码 → `zip -e` 打包加密上传到 blob 端点；不给密码 → 走老明文 JSON）
  - [x] pull 先探 blob 端点，404 fallback 明文端点；解压前向用户要密码
  - [x] 文件类型从仅 `.md` 扩到 `.md` + 常见图片（`.jpg/.jpeg/.png/.webp/.gif/.svg`），`.pdf` 排除
  - [x] 单库上限 1 MB → **50 MB**，文件数 500 → **1000**
  - [x] 密码不持久化（不写文件 / env，bash 进程结束即丢；skill 报告里不回显字面值）
- [x] [skills/muicv-git/SKILL.md](skills/muicv-git/SKILL.md) 小改：
  - [x] init 流程加 public/private 询问步骤，去掉硬编码 `--private`
  - [x] init 前加 >50 MB / >1000 文件软提醒，建议把大照片 / `versions/*.pdf` 塞 `.gitignore`

服务端（packages/api + packages/website，已落地代码层）：

- [x] R2 bucket binding `MUICV_RESUME_BLOB` —— [packages/api/wrangler.jsonc](packages/api/wrangler.jsonc) + [packages/website/wrangler.jsonc](packages/website/wrangler.jsonc) 各加一份
- [x] D1 schema + migration —— [packages/website/lib/schema.ts:236-263](packages/website/lib/schema.ts:236) + [packages/website/migrations/0013_resume_snapshot_blob.sql](packages/website/migrations/0013_resume_snapshot_blob.sql)
- [x] [packages/api/src/routes/resume-sync-blob.ts](packages/api/src/routes/resume-sync-blob.ts) —— 5 个 handler：push (multipart) / get / download / history / delete
- [x] [packages/api/src/app.ts](packages/api/src/app.ts) 注册 5 个新路由
- [x] [packages/shared/src/resume-sync.ts](packages/shared/src/resume-sync.ts) 加 `validateBlobSummary` + 4 个新常量；老明文上限 1 MB → 50 MB / 500 → 1000（仍仅 `.md`）
- [x] [packages/api/test/routes.test.ts](packages/api/test/routes.test.ts) 加 11 个 blob 路径测试（68 全 pass）
- [x] dashboard `/dashboard/sync` 加密版面板（活动版 + 历史 + 下载 / 删除 / 清空）—— [packages/website/app/(dashboard)/dashboard/sync/page.tsx](packages/website/app/(dashboard)/dashboard/sync/page.tsx) + [sync-actions.tsx](packages/website/app/(dashboard)/dashboard/sync/sync-actions.tsx)
- [x] next.js 代理路由：`/api/resume/sync/blob` (DELETE 清空) / `[id]/download` (GET 下载) / `history/[id]` (DELETE 单条)

部署前操作（用户自己跑）：

- [x] R2 bucket `muicv` 已建好（公开域名 i.muicv.com）
- [ ] `pnpm --filter @muicv/website db:migrate`（应用 0013_resume_snapshot_blob.sql 到 D1 生产库）
- [ ] `pnpm --filter @muicv/api deploy` + `pnpm --filter @muicv/website deploy`（两个 worker 都要更新，因为都新增了 R2 binding）

验证清单：加密 push/pull 端到端字节级一致；明文兜底走老路；照片场景；PDF 自动忽略；密码错给出友好提示且不重试；muicv-git 双路径 + 软提醒。

### Phase 16：姆伊品牌形象重制（暂缓）

目标：基于姆伊真实照片重做 app / website 的 icon、logo、mascot 和求职场景形象；原始照片只作为本地参考，不提交进仓库。

产品方向：

- 姆伊的核心气质是“安静、可靠、陪伴”，不是搞笑 mascot。
- 基础形象要保留图1里的大耳朵、白色鼻梁竖纹、暖金色毛发、趴着睡的松弛感。
- 求职场景可以扩展为：叼来 `Offer`、旁边放简历、对话气泡、放大镜评审、空状态等待。
- 小尺寸 icon 优先识别度；大尺寸场景图优先情感和产品语义。

本轮结论：第一版矢量尝试不够好看，尤其需要避免脸部竖向过长；后续应先做视觉稿/多方案评审，再进入代码替换。


## 方向

把核心业务能力封装成 **Claude Code Skills + 轻量 API + Electron 桌面端**，用户在自己熟悉的
AI agent（Claude Code / Codex / Cursor 等）里直接调用；简历素材作为 **Markdown + YAML
frontmatter** 存在 `.claude/muicv/`，由用户用 git 自己管理。完整背景见 README.md。

> 已完结的 Phase 13（muicv-interview + STT 集成）/ Phase 14（首次体验设计改版）
> 决策与教训已沉淀到 [DEV_NOTE.md](./DEV_NOTE.md) 对应章节。

## 下一步

按 [TODO.md](./TODO.md)：

- 云同步 skill（muicv 平台 / GitHub 双通道）— **server 端 + skill 端均已落地；Phase 15 在做加密改造（见上方）**
- 成为面试官 skill（角色互换，让用户练习当面试官）
- 入职辅导 / 理解保险 类职场辅导 skill
