# WIP：Mui简历开发计划

最后更新：2026-11-06

## 当前进行中

### 简历模版：内容自适应 + 英文简历支持（2026-11-06）

背景：模版对内容形状的硬性假设导致渲染效果差（截断丢内容、空 section 渲染空标题、t6 年份硬编码、排版失衡）；英文简历链路断裂（模版标签已双语，断在生成端不写 lang、API 默认 zh、api-tools 不传 lang）。

- [x] shared schema：`TemplateResumeData.lang?`、`TemplateResumePublication.year?`、校验、`hasBilingualSide()` + 单测
- [x] template-meta 收敛到 shared（preview-toolbar / app tools 统一引用；营销页 styleLabel 是本地化文案，保留）
- [x] t1~t6 渲染健壮化：移除全部静默截断、空 section 整体不渲染、t4 `[0]` 计数、t6 publication.year
- [x] fit 自动排版：`computeFitScale` 纯函数 + 单测、`FitToPage` 组件、接入渲染页与预览页、render-pdf 等待 fitDone
- [x] API lang 解析：render.ts / preview.ts 改为 payload.lang > resumeJson.lang > 'zh'（桌面端零改动生效）
- [x] 预览页「中/EN」切换器（`hasBilingualSide` 为 true 且 owner 登录时显示）
- [x] skill 文档：muicv-generate 语言规则（用户明示 > JD 语言 > 素材语言）+ 写 lang 字段 + schema 文档 + muicv-render 说明
- [x] 回归：642 测试全绿、biome 0 诊断、website/app 构建通过；fit 三处实测问题修复后浏览器三场景验证收敛 794×1123
- [ ] **用户**：线上英文简历端到端跑一遍（生成 → 预览 → 切语言 → PDF）；fit 在真实简历上的观感
- 决策与踩坑已沉淀 [DEV_NOTE.md](./DEV_NOTE.md)「简历模版渲染：fit 自动排版与 lang 链路」

### coss ui 接入 + 全站按钮统一（2026-11-04）

- [x] 事实核查：仓库从未有 radix（lockfile / node_modules 双零）；coss ui 与 @base-ui/react 同底座
- [x] packages/ui 换血：Button（+loading）/ Input / Popover 换 coss 当前版，press/press-ink 变体移植，
      Spinner 换 phosphor；--radius 统一 6px
- [x] 地基：app 接变量层 styles.css + @source 扫 ui 包 + body isolate relative
- [x] 19 文件约 60 颗手写按钮 → <Button>（press/press-ink/outline/ghost 映射，4 处有意保留原生）；
      chat-model-selector 外壳换 coss Popover
- [x] app 206 测试 / typecheck / build 全绿（coss 样式确认进产物），其余包回归通过，lint 0 诊断
- [ ] 用户 dev 冒烟：按钮逐个过视觉（重点：xs 高度收窄、press 字重变 extrabold、
      聊天工具条芯片边框变深出硬阴影、登录 CTA 变矮）、chat-model-selector 弹层、暗色模式
- [ ] 后续项在 TODO.md「UI 组件化后续」：website 按钮组件化 / app 弹层组件化 / Menu·ToggleGroup

### 发版前依赖升级（2026-10-24）

- [x] 第一批 `pnpm up -r`（semver 内）：next 16.4.3、payload 3.92、openai 7.43、vite 8.3.5、
      wrangler 4.152、react 19.3.1、biome 2.6.3 等；全部包 typecheck / 测试 / 构建通过（55a521e）
- [x] 第二批跨版本：@openai/agents 0.21（SDK 不再透传工具报错原文，测试断言已同步）、
      electron-store 12、electron-vite 6（顺带解决 vite 8 peer 警告）、@types/chrome 0.3（6ccd658）
- [x] electron 44→45（0f9f9b3），等用户手工冒烟
- [x] biome.json migrate 到 2.6.3 schema；biome 2.6 格式化漂移一次性收口（14 个文件纯格式）
- [ ] 暂缓项记入 TODO.md「依赖升级跟进」：stripe 23（CN 支付迁移需实测）

### 统一岗位频道 /jobs + 自然语言搜索（2026-10-20，分支 feat/opportunities）

目标：采集国际 / 远程技术岗进 CMS，与社区贡献 JD 合并为一个 /jobs 频道；
基于 Workers AI（bge-m3）+ Vectorize 提供自然语言搜索，作为稳定公开 API 给桌面端 / 扩展 / skill 用。

- [x] shared：jobs 领域类型、分类规则、query 过滤抽取、向量工具、CMS fetcher、`searchJobs` 客户端 + 单测
- [x] cms：`opportunities` collection + migration
- [x] cron：采集 worker（Greenhouse / Lever / Ashby / Remotive）+ CMS upsert + 过期 + 向量索引 + 单测
- [x] api：`GET /jobs/search`（向量 + 结构化过滤 + 关键词降级 + 速率限制）、社区 JD 入库即索引、去重标记、重建索引端点 + 单测
- [x] app：agent 工具 `search_jobs`
- [x] website：/jobs 合并展示（来源 tab + 搜索）、采集岗位详情页、sitemap
- [x] 文档：DEPLOYMENT（Vectorize / secret / migration）、DEV_NOTE
- [x] app：桌面端岗位库面板（左栏入口，搜索 / 筛选 / 无限滚动 / 详情 / 导入 / 投递）
- [x] 地域限制：结构化字段（workplace / allowedCountries / allowedRegions / utcOffset / officeLocations）+ 规则解析 + LLM 兜底（cron）
- [x] 按求职者国家 / 时区排除不可投岗位；API / shared client / 桌面端（可删除的自动识别标签）/ website /jobs 全链路
- [x] 混合检索：D1 jobIndex 镜像 + FTS5 trigram + 短词 LIKE + 向量，SQL 硬约束，RRF 融合 + 各路与融合单测
- [x] 索引：jobIndex 过滤列 / 唯一去重键 / FTS 触发器；CMS opportunities workplace / source / category 索引
- [x] skill：muicv-jobs 新增 search 子任务；agent `search_jobs` 增加 country / utcOffset / workplace
- [x] Cloudflare：Vectorize `muicv-jobs` + metadata index 已建；D1 0018 已远端执行
- [x] CMS 迁移已远端执行；采集并入 api worker（scheduled），去掉独立 cron worker
- [x] 垂直 / 远程岗位板采集（7 个官方 feed，每天 2 次，第三方来源 noindex）
- [ ] **用户**：CMS 采集账号 + api 的 `CMS_API_KEY`、`JOBS_REINDEX_TOKEN`；可选手动触发 / 回填
- [ ] 后续：多语言 /jobs

### 插队任务：模型换代：默认切 mimo-v2.6-flash + GPT-6 Sol/Luna 上线 + Terra 下线（2026-09-23）

- [x] 定价表 / 注释 / 测试 / 文档全链路（详见 git 8 月-9 月提交记录）
- [x] 博客已发布并修复表格渲染；IndexNow 已提交
- [ ] 有 key 时跑 `scripts/opencode-go-probe.ts` 实探 `mimo-v2.6-flash` 在目录里
- [ ] **用户**：`wrangler secret` 无需新增（复用 OPENCODE_GO / OPENAI），部署 api + 发版 app

### 插队任务：修复 Ahrefs 报的 56 个 `/:locale/posts/*` 404（2026-09-14）

- [x] sitemap alternates 只列真实译文 + 绝对 URL；详情页切换器过滤；测试全绿
- [x] push（aa2e675）后自动部署，线上已验；IndexNow 已提交
- [ ] **用户**：GSC 重交 sitemap → Ahrefs 重新 audit（56 条随重抓自然消除）

### 插队任务：LLM 供给切换 OpenCode Go + TTS 端点（2026-08-27）

- [x] 定价表 / 分流 / TTS 端点 / 计费 / 朗读按钮（详见提交记录）
- [ ] **用户**：`wrangler secret put OPENCODE_GO_API_KEY` + 部署 packages/api
- [ ] `node scripts/api-smoke.ts --full` 线上验证三路对话 + TTS 出声 + 扣账

### 插队任务：多站点博客 CMS（taomenu / dyqr 共用 articles 集合）

- [x] articles collection + migration + seed 工具 + dyqr/taomenu 接入
- [ ] 用户在 Payload 后台建 API key 后跑 seed（`MUICV_CMS_API_KEY=xxx node packages/cms/scripts/seed-blog-articles.ts`）
- [ ] `pnpm --filter @muicv/cms migrate` 应用迁移到生产 D1，然后部署 cms

### 插队任务：Pricing 缓存化 + 缓存栈补全 + 统计/IndexNow（issue #14 + #13）

- [x] 全部代码层落地（见提交记录）
- [ ] 部署 website + cms（DO migration 随部署应用）
- [ ] 部署后 curl 验证 immutable 头 + 跑 indexnow 脚本 + 关闭两个 issue

### 插队任务：连接授权页简化

- [ ] 默认视图只保留账号、连接对象和一个主按钮。
- [ ] 授权成功后只提示"已连接"，把手动 key 复制作为问题排查兜底隐藏起来。
- [ ] 保留安全与错误状态，不暴露不必要的底层概念。
- [ ] 跑 website 构建验证。

### Phase 15：云同步隐私改造

- [x] skill 端（加密 zip / pull 探测 / 图片类型 / 50MB·1000 文件 / 密码不持久化）+ muicv-git init 询问 public/private
- [x] 服务端（R2 binding / D1 0013 / blob 5 handler / dashboard 面板 / next 代理）
- [x] R2 bucket `muicv` 已建好（公开域名 i.muicv.com）
- [ ] `pnpm --filter @muicv/website db:migrate`（应用 0013_resume_snapshot_blob.sql 到 D1 生产库）
- [ ] `pnpm --filter @muicv/api deploy` + `pnpm --filter @muicv/website deploy`（两个 worker 都要更新，因为都新增了 R2 binding）

### Phase 16：姆伊品牌形象重制（暂缓）

目标：基于姆伊真实照片重做 app / website 的 icon、logo、mascot 和求职场景形象；原始照片只作为本地参考，不提交进仓库。

产品方向：

- 姆伊的核心气质是"安静、可靠、陪伴"，不是搞笑 mascot。
- 基础形象要保留图1里的大耳朵、白色鼻梁竖纹、暖金色毛发、趴着睡的松弛感。
- 求职场景可以扩展为：叼来 `Offer`、旁边放简历、对话气泡、放大镜评审、空状态等待。
- 小尺寸 icon 优先识别度；大尺寸场景图优先情感和产品语义。

本轮结论：第一版矢量尝试不够好看，尤其需要避免脸部竖向过长；后续应先做视觉稿/多方案评审，再进入代码替换。

## 方向

把核心业务能力封装成 **Claude Code Skills + 轻量 API + Electron 桌面端**，用户在自己熟悉的
AI agent（Claude Code / Codex / Cursor 等）里直接调用；简历素材作为 **Markdown + YAML
frontmatter** 存在 `.claude/muicv/`，由用户用 git 自己管理。完整背景见 README.md。

> 已完结的 Phase 13（muicv-interview + STT 集成）/ Phase 14（首次体验设计改版）、Artifacts
> 分栏常驻、biome lint 清零、扩展重做、岗位库匹配对话类型等历史任务的决策与教训已沉淀到
> [DEV_NOTE.md](./DEV_NOTE.md) 对应章节。

## 下一步

按 [TODO.md](./TODO.md)：

- 成为面试官 skill（角色互换，让用户练习当面试官）
- 入职辅导 / 理解保险 类职场辅导 skill
- 多语言 /jobs
