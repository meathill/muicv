# DEV_NOTE

长期开发知识沉淀。记录决策依据、踩坑、框架/基建知识，避免日后重复。

最后更新：2026-09-13

---

## 浏览器扩展（任意页面提交岗位，2026-10-20 重做）

- **不再连接桌面端**：扩展独立工作，用户在 popup 填自己的 `mui_` API key（存 `chrome.storage.local`），直连 `api.muicv.com`。
  API CORS 放行 `chrome-extension://` / `moz-extension://`（Bearer 鉴权、不带 cookie）。桌面端的 loopback bridge / 配对 / `extension:*` IPC 已删除；桌面端只保留岗位导入流水线（`jd-pipeline.ts`，deep link `muicv://import-jd` 与岗位搜索面板共用，推送 `jobs:pipeline`）。
- 权限只有 `storage` / `activeTab` / `scripting`，无 host_permissions、无 content script。用户点开 popup 才注入 `inject.js`：
  Readability 正文 → turndown markdown（截断 20k 字符）+ 标题 + URL + 仅含 JobPosting 的 JSON-LD + 外链（≤200）。不上传整页 HTML。
- `POST /jobs/submit`（requireApiKey，`JOBS_SUBMIT_LIMITER` 每用户 6 次/分钟）流水线：
  JSON-LD JobPosting → 已知 ATS URL（Greenhouse / Lever / Ashby 单条公开接口，复用采集器映射）→ Workers AI
  `llama-3.1-8b-instruct-fast` 一次调用判别 + 抽取（可多岗位）→ 跟进 ≤3 条详情链接（必须出自提交的外链列表；
  `safe-fetch.ts` SSRF 防护：仅 http(s) 默认端口、拒私网 / 回环 / 链路本地 / 非常规 IP 写法、手动重定向逐跳校验、8s 超时、512KB 上限；
  `jobLinkCache` 缓存 6h）→ 地域解析（`parseLocationRestrictions`）。
- 入库：public → `communityJd`（去重：communityJd urlHash/contentHash + jobIndex urlKey/指纹，覆盖采集岗位）→ `indexCommunityJdById` 写 jobIndex + 向量；
  private → `savedJob`（userId 作用域，不进搜索），`GET /jobs/saved` 列表。
- 计费（`shared/jobs/submit.ts`）：按 markdown 长度预扣最坏情况（1 次判别 + 3 次链接抽取），余额不足 402；
  公共 + 识别到岗位全免（重复 / 入库失败也不扣），有新岗位发 `JOB_SUBMIT_REWARD`=2000 起（每多 1 条 +500，最多算 5 条，日封顶 8 次）；
  未识别 / 私藏按实际 AI 用量（输入 0.01、输出 0.08 显示 token / token，≈Workers AI 刊例 2 倍），不超过预扣额。
  流水 id `jobsub:<id>:hold|refund|reward` 幂等；`jobSubmission.status` held → settled/failed 只转一次；定时任务退回 30 分钟以上的残留预扣。
- 旧的 `/jobs/contribute`（`JD_CONTRIBUTE_REWARD`，ledger `jd_contribute`）保留给桌面端 / skill；扩展提交走新流水线，不重复发奖。
- 表：migration `0019_job_submit.sql`（jobSubmission / savedJob / jobLinkCache，纯新增）。

## 内容中心 / Skill 目录 / Payload CMS（Phase 17）

- **内容消费统一走 Payload**：`packages/shared/src/content-types.ts` 只放内容契约类型和 section metadata（原 `content-registry.ts` 的内联 seed 已随博客迁移删除），不再有静态兜底。website、api、app 通过 `@muicv/shared` 的 CMS helpers 读取 Payload；CMS 不可用时返回空内容，避免假装已发布。
- **第三方官方 skill 默认先做来源索引**：例如腾讯招聘官方校招 skill，Mui 只登记公开来源和边界说明，不复制 `SKILL.md`，不托管安装包，不给竞品导流。无法确认能稳定接入前，不写“在 MuiCV 使用 / 安装 / 接入”的文案；app catalog 打开 MuiCV 自有详情页，由详情页说明当前是否仅为来源索引。
- **自有/明确可分发 skill 才能安装**：`distributionMode='hosted' | 'external_direct'` 之后才允许 app 做真正安装；`built_in` 只展示“已内置”。
- **Payload 独立 Worker，复用存储**：`packages/cms` 单独跑 `cms.muicv.com`，不嵌进 `packages/website`；D1 复用现有 `muicv`，R2 media 复用现有 `muicv` bucket；CMS 不启用 OpenNext ISR cache。
- **CMS 数据分层**：`posts` 管 `/posts/<section>/<slug>`，`skillExtensions` 管 `/skills/<slug>` 和 app catalog，`changelog` 管产品更新，`media` 走 R2；Payload 自己维护表和 migration，不混入现有手写业务表。
- **CMS build 期不用真实 binding**：`payload.config.ts` 在 `NEXT_PHASE='phase-production-build'` 时使用 runtime-only 占位 binding，避免 Next build 的多个 route worker 同时启动 Miniflare D1 造成 SQLite lock；运行时仍由 `getCloudflareContext()` 读取真实 D1/R2。
- **CMS admin 必须使用 Payload RootLayout**：`packages/cms/app/layout.tsx` 要包 `@payloadcms/next/layouts` 的 `RootLayout` 并传入 `handleServerFunctions` / `importMap`。普通 Next layout 会让 admin 的 `PageConfigProvider` 拿不到 `ConfigProvider`，`/admin/create-first-user` 会报 `Cannot destructure property 'config' ... as it is undefined`。
- **CMS admin 必须导入官方 CSS**：同一个 layout 还要导入 `@payloadcms/next/css`。只依赖组件自身 bundle 会缺 `template-minimal`、主题变量、dashboard/login 基础布局，表现为 admin 能登录但像完全没加载 CSS。
- **CMS importMap 要提交**：Payload 插件的客户端组件（例如 R2 的 `R2ClientUploadHandler`）必须在 `app/(payload)/admin/importMap.js` 里注册；空 importMap 会让 admin 页面 200 但前端空白。修改 Payload config / 插件 / 自定义 admin 组件后运行 `pnpm --filter @muicv/cms generate:importmap` 并提交生成文件。
- **CMS 不启用 `sharp`**：Cloudflare Worker 不能可靠运行 native `sharp`，OpenNext 二次打包也会遇到 `sharp-<hash>` 虚拟 require 解析失败；当前 media collection 只做 R2 存储，不做服务端裁图。
- **CMS migration 流程**：本地生成 migration 用 `pnpm --filter @muicv/cms migrate:create <name> --skip-empty`，脚本会注入一次性本地 `PAYLOAD_SECRET` 和 `NEXT_PHASE='phase-production-build'`；应用到生产 D1 用 `pnpm --filter @muicv/cms migrate`，内部会读取 `payload_migrations`，只把 pending migration 转成 SQL 并通过 `wrangler d1 execute muicv --remote --file` 执行。
- **CMS MCP 只做本地 stdio 入口**：`packages/cms/mcp/server.ts` 通过现有 `cms.muicv.com/api/*` 写 posts / skillExtensions / changelog，不新增 Worker，也不要求新的 D1/R2。鉴权优先用 Payload Users 里生成的 `MUICV_CMS_API_KEY`，MCP client 会发 `Authorization: users API-Key <key>`；`MUICV_CMS_TOKEN` 和邮箱密码只作为兜底。
- **CMS MCP 工具集（三类内容各一组）**：每类内容都给 `create_*` / `upsert_*` / `get_*` 三个工具，slug 作主键（post 用 `${section}/${slug}` 复合键，避免不同 section 同名）。**写之前必查重**：`create_*` slug 存在直接报错，`upsert_*` 默认更新。Payload mutation 返回结构包到 `result.doc` 里，client 解析时若假设是裸 doc 会报 cannot read properties of undefined；统一在 `payload-client.ts` 兜底解构。changelog 还有专门的 `changelog-input.ts` 做 markdown → blocks 的转换 + 校验，留单测保护。
- **CMS 公开内容 read access 必须限 published**：`posts` / `skillExtensions` / `changelog` 的公开 REST 只返回 `status='published'`，登录用户仍可读全部。website 通过 `@muicv/shared` 的 `fetchCms*` helpers 读 Payload REST；CMS 不可用时返回空内容，不再 fallback 到 seed。
- **`.prose-mui` 列表 marker 必须显式声明**：Tailwind preflight 把 `ul / ol` 的
  `list-style` reset 成 `none`。CMS 渲染的 markdown 内容用 `.prose-mui` 作 wrapper，里面要
  显式 `list-style: disc / decimal outside` + `li::marker` 上品牌色加粗，否则文章详情页的
  bullet / 编号会全部消失。改 `.prose-mui` 时把 ul / ol / li / marker 同时校一遍。
- **SEO 路径约定**：求职博文从 `/posts/jobs` 起步；更细分类先用 tags / keywords，不提前拆更多 route。

### 博客多语言（locale 维度，2026-09）

- **一行一语言，不用 Payload 官方 localization**：`posts` 加 `locale` select 字段（值取 shared 的
  `CONTENT_LOCALES`），同一篇文章的各语言译文是独立文档。`Config.locale` 仍是 `null`——
  Payload 原生 i18n 会把译文塞进 JSON 列，D1 上查询/迁移都更绕，且本项目 `articles` 早已是
  「一行一语言」的建模，保持一致性。
- **slug 即翻译组键**：唯一约束从 `slug` 全局唯一下沉到 `(locale, slug)` 复合唯一，
  **不额外加 translationGroup 字段**。于是各语言 URL 形态对称（`/ja/posts/product/<slug>`），
  hreflang 按 slug 聚合即可，少一个字段少一处不一致。`articles` 的 `(site, locale, slug)` 是同一模式。
- **中文无前缀，其余 `/<locale>`**：`contentLocalePrefix()`（shared，给内容层）与
  `localizedHref()`（website，给页面链接）是各自的唯一来源，sitemap / 页面 / 面包屑都从它们取。
  注意 CMS 侧 locale 写 `zh-CN`、网站层 `Locale` 写 `zh`，两者靠 `toContentLocale` /
  `fromContentLocale`（`_i18n/locale.ts`）转换，别在各处手写。
- **路由用 `(locales)/[locale]` 动态子树承接**：`(zh)` / `(en)` 仍是静态子树，新增的
  `app/(locales)/[locale]/` 承接其余 7 种语言的营销页 + 博客。实测 Next 静态优先，
  `/posts`、`/en/*` 优先级不受影响；`generateStaticParams` 里显式排除 `zh`。
- **新增一种语言 = 三步**（详见 [[project_website_i18n]]）：
  1. `_i18n/<locale>.tsx` 导出 `dict` + `content`（`Dictionary` 字段全必填 = 编译期护栏）
  2. 在 `_i18n/bundles.ts` 的 `EXTRA_LOCALE_BUNDLES` 注册
  3. `_i18n/locale.ts` 的 `LOCALES` 加成员
  路由、sitemap、语言切换器、hreflang 全部自动生效。`about`/`contact`/`pricing`/`faq-items`
  四个消费端已接 `bundles.ts`；zh/en 暂留原有内联 Record，可择机迁到同形状。
- **链接三级回退**：`localizedHref` 按「本语言版 → 英文版 → 默认语言」解析。9 语言齐备的路径在
  `LOCALIZED_ROUTES`，只有英文版的在 `EN_ROUTES`（当前只有模板库——模板数据只有中英双语，
  本地化需另译 8 个模板内容，属独立内容工程）。所以 `/ja/templates` 是 404、链接指向 `/en/templates`，
  这是预期行为；**别把未本地化的路径写进 `LOCALIZED_ROUTES`**，否则链接会指向 404。
- **hreflang 从路由白名单推导**：`pageMetadata` / `alternateLanguages`（`_page-meta.ts`）按
  `LOCALIZED_ROUTES` / `EN_ROUTES` 决定列几种语言，zh/en 与新语言页共用同一函数，保证互指对称。
  文章详情页则用 `getPostAlternateLanguages()` 只列**确实有译文**的语言（按 slug 查各语言），
  避免指向 404。sitemap 里的 alternates 同源同规则（`lib/post-alternates.ts` 的
  `postAlternateLanguages()`，head 传相对 base、sitemap 传绝对域名；2026-09 修过一次
  sitemap 无条件列全 9 语言 + 相对 URL 的 bug，Ahrefs 报 56 个 `/:locale/posts/*` 404）。
- **详情页语言切换器只显示有译文的语言**：`localizedHref` 只知道“某类路径”的白名单，
  不知道“某篇文章”是否有译文——详情页由服务端从 `getPostAlternateLanguages()` 推导
  `availableLocales` 经 `MarketingShell → Footer → LangSwitch` 透传；列表页 / 营销页不传
  （默认全量）。缺译文不跳中文原文、不 301，保持 404 自然消退（软 404 比硬 404 更伤）。
- **博客与营销页共用 `MarketingShell`**：语言切换器（`LangSwitch`）已升级为 9 语言选择器，
  用 `usePathname()` 推导当前页各语言 URL 并自动回退，Footer 恒显示——所以页面不再传 `altHref`
  （该参数已删除）。早期博客用过独立的 `BlogShell`，营销站本地化完成后已合并删除。
- **内容只写 CMS，仓库不留 markdown 草稿**：文章直接在 Payload Admin 或 `packages/cms/mcp`
  的 `create_post` / `upsert_post` 里维护，`posts` 默认 draft，需显式 `status: published` 才公开。
  早期「`docs/marketing/<campaign>/*.md` 草稿 + `seed-marketing-posts.ts` 幂等 upsert」的本地
  发布通道已随博客迁移清理删除，不再维护 markdown 内容源与转换脚本。
- **没有静态兜底**：shared 不再内联 seed 文章，`packages/shared/src/content-types.ts` 只放内容契约
  类型和 section metadata；CMS 不可用时 `fetchCms*` 返回空（列表 `[]`、详情 `null`）。首页文章区 /
  `/posts` 显示空态，这是预期行为，也就不存在「把中文当译文渲染」的问题。

## 简历模板 + 在线预览（新）

- **两种数据模型并存**：
  - `versions/*.md` + frontmatter（老路径）→ `parseResume(marked)` → `default` 模板 CSS
  - `versions/*.resume.json`（`TemplateResumeData` schema，见 `packages/shared/src/domain/template-resume.ts`）→ `t1-classic` / `t2-minimal` / `t3-sidebar` / `t4-tech` / `t5-timeline` / `t6-academic` 任一
  - `/render` 端点 body 互斥：`{markdown}` 或 `{resumeJson}`；KV value 加 `kind: 'markdown' | 'json'` 给 SSR 分支
  - JSON 路径 puppeteer margin 设 0 + `preferCSSPageSize: true`（模板自带 A4 padding）；markdown 路径保留 14mm 边距
- **CSS Modules + `noUncheckedIndexedAccess`**：`styles.tN` 会返 `string | undefined`，所以 `TemplatePage` 的 `className` / `accent` 必须显式 `string | undefined`，否则 6 个模板都过不了 typecheck
- **6 个模板共用单一 `templates.module.css`**：BEM 命名 `.t1__head` / `.t2__top` 等不冲突；嵌套选择器 `.t3__skillGroup .name` 不要用——CSS module 会两边都 hash，descendant 失效，要么扁平命名（`.t3__skillName`）要么 JSX 里写 `styles.name`
- **在线预览页**：`packages/website/app/preview/[token]/page.tsx`，公开端点，**直读 D1**（OpenNext + `MUICV_DB` binding 已经能拿到 D1，不必走 API 转发）。SSR 完外面包 `<PreviewToolbar>` client component 跑下载 / 分享
- **预览 PDF 计费**：D1 `preview` 表 `pdfCredit` 字段记 owner 已扣过多少次 PDF_RENDER_COST。公开访客下载只有 `pdfCredit > 0` 才允许，避免 token 公开后被刷爆余额。逻辑见 `packages/api/src/routes/preview.ts`
- **R2 `MUICV_PHOTOS` 桶**：公开读，CNAME `i.muicv.com`（已绑定）。`/upload/photo` 不收费、不在服务端 resize（客户端先压到 600×800 内），key `<userId>/<uuid>.<ext>`，cache 31536000 + immutable。审计行写在 D1 `photoUpload` 表，按 userId 索引，过期清理留 Phase 3 做
- **Phase 2 入口三件套**：
  - skill：`POST /preview` + `muicv-render` 文档已写
  - Electron：`window.muicv.preview.{uploadPhoto,listPhotos,create}` 走主进程；preview-drawer 检测 `*.resume.json` 显示「在线预览」按钮；设置页加 `PhotosCard` 管理证件照（[settings/photos-card.tsx](packages/app/src/renderer/components/settings/photos-card.tsx)）
  - dashboard：`/dashboard/previews` 列出当前用户预览（生效 / 过期 / 撤销三态），支持复制 URL / 续期 / 改 share-mode / 撤销，外加证件照历史。dashboard 路径直接读 D1 + 自己的 `/api/previews/...` 内部路由（better-auth session），**不**绑 mui_ key
- **shareMode 'link' vs 'public' 的真正区别**：layout 不再统一塞 noindex；改到 [preview/[token]/page.tsx](packages/website/app/preview/[token]/page.tsx) 的 `generateMetadata` 里按记录决定——`public` 才 `robots: index/follow` + og/twitter meta，其它（link / 过期 / 撤销 / 损坏）一律 noindex。loadPreview 用 React.cache 包一层，generateMetadata 和 default 渲染共用一次 D1 查询。**没有公开 listings 页**——public 模式只是把单条 URL 暴露给搜索引擎抓，方便 SEO / 招聘平台爬虫，不做汇总目录

## Cloudflare Worker / OpenNext（packages/website）

- **部署走 Git 集成，禁止手动 deploy**：`muicv-web` 与 `muicv-cms` 两个 Worker 都在 Cloudflare
  Workers Builds 里接了本仓库，**push 到 master 后 1~2 分钟自动构建并部署**（实测：push 后
  每次都有一次非本机触发的 deployment）。所以改完代码/内容只需 commit + push，
  **不要跑 `pnpm --filter @muicv/website run deploy` / `... cms run deploy`**——
  手动部署会和自动部署并发竞争，且行为不一致（手动需显式带
  `CLOUDFLARE_ACCOUNT_ID`，非交互下会卡在账号选择）。
  值得注意的例外：**CMS 的 D1 migration 不会自动应用**，`pnpm --filter @muicv/cms migrate`
  仍要手动跑；顺序是「先 push（或至少先应用 migration）+ 迁移已应用」，
  否则 Worker 代码与库表结构会错配（曾出现：迁移已加 locale 列、Worker 还是旧版，
  查询直接 400 "The following path cannot be queried: locale"）。
- **必须 `export const dynamic = 'force-dynamic'`** 在用到 D1 的 SSR 页面顶部。
  否则 build 时 prerender 拿不到 Cloudflare bindings，构建直接失败。
  目前 `app/(marketing)/page.tsx` 因为 nav 要根据登录态切显，强制 SSR。
- `worker-configuration.d.ts`（14k+ 行，wrangler 自动生成）不要 review、不要手改；
  跑 `pnpm --filter @muicv/website cf-typegen` 重新生成即可。
- 本地开发两套：`pnpm dev` 是纯 Next.js，最快；`pnpm dev:cf` 走 Wrangler，更贴近生产 Worker 行为。
- **缓存栈（2026-10 恢复，额度危机解除）**：`open-next.config.ts` 用 R2（`site-cache`）
  + regional long-lived + DO Queue，并开 Workers Cache（`wrangler.jsonc` 顶层 `[cache]`）。
  TTL 分层：详情/营销静态页 `revalidate=604800`（1 周），列表页/sitemap `3600`，
  download 页 `300`；pricing 无 revalidate（构建期静态，s-maxage 一年，部署即换版）。
  Next 按 revalidate 自动下发 `s-maxage`，边缘直接吃——不要在 `next.config.ts` 手写
  页面级 Cache-Control，会盖掉精确值。动态页（dashboard/preview/auth/jobs/`/api/*`）
  自动 `private,no-store` 走 BYPASS。新部署换 Worker version，边缘 key 默认隔离，
  无需手动 purge。
- **缓存栈（2026-08，issue #14，历史）**：website 曾临时关闭 R2 incremental cache，保留 DO Queue + `enableCacheInterception`；
  - **时间型 revalidation（posts / sitemap 的 `revalidate=3600`）必须有 DO Queue**（`NEXT_CACHE_DO_QUEUE` binding + `new_sqlite_classes: ["DOQueueHandler"]` migration）才会后台排队执行——之前只配了 R2 没配 queue，revalidate 实际没生效。
  - 刻意不加 tag cache / cache purge：站点不用 `revalidateTag` / `revalidatePath`，按需失效链路用不到。
  - `deploy` 命令会跑 `populateCache` 把构建期预渲染数据写进 R2，所以纯静态页（如 pricing）改内容 = 部署即生效，不需要 revalidate 兜底。（这是 deploy 命令的机制说明；日常不要手动跑，见本节第 1 条——自动部署走的是同一套构建。）
- **静态资源 immutable 头**：`public/_headers` 配 `/_next/static/*` → `Cache-Control: public,max-age=31536000,immutable`。OpenNext 会把 public/ 拷进 `.open-next/assets`，Cloudflare Workers Assets 直接吃这份 `_headers`；`next.config.ts` 的 headers 对静态资源无效（Worker 不跑在 assets 前面）。website / cms 都要各放一份。
- **Pricing 页静态化（issue #14）**：跟首页同套路——静态壳 + 客户端动态区。动态数据（登录态 / 订阅 / 币种）由 `GET /api/pricing/state` 挂载后一次拿齐；币种切换走 `CurrencyToggle` 的可选 `onSwitch` prop（本地 state 更新，不再 router.refresh，dashboard 不传保持原行为）；interval 只维护本地 state 并 `history.replaceState` 同步 URL，**默认年付**（`?interval=monthly` 可覆盖）。价格未返回前显示占位符避免「先 $ 后 ¥」闪烁。订阅卡固定美元标价，¥ 视图的登录用户看到「人民币不支持订阅」提示 + 一键切回美元（走 `lib/currency-client.ts` 的 `postCurrencyPreference`）。
- **IndexNow（issue #13）**：key 文件 `public/<key>.txt`（内容 = key）随构建发布，`scripts/indexnow-submit.ts` 抓 sitemap 一次性提交全部 URL 到 api.indexnow.org，部署后手跑一次，不引入 cron。
- **CDN 层缓存（2026-10 改走 Workers Cache，不再用 Cache Rules）**：2026-08 曾评估给
  `/pricing*` 加 Cache Rules（`cache_everything` + edge_ttl 1h）但没做，原因是部署后边缘
  发旧版要手动 purge。现在开 Workers Cache（`[cache] enabled`）解决同一问题：key 默认带
  Worker version，新部署自动隔离，无需 purge；TTL 直接吃 Next 的 `s-maxage`。
  验证看 `cf-cache-status: HIT`。
- **API 路由统一 no-store**：Next 16 不会自动给 route handler 加 `Cache-Control`，`force-dynamic` 只保证 OpenNext 不缓存；防浏览器启发式缓存 / 未来加缓存规则时误缓存用户数据，在 `next.config.ts` 加 `/api/:path*` → `Cache-Control: no-store` 全局规则（已验证对 route handler 生效）。

## SEO / OG / 安全 headers（packages/website）

> SEO 基础设施 2026-05 一次性补齐：JSON-LD（Organization / WebSite / Article /
> BreadcrumbList）、metadata API、动态 OG 图、GA4 + Web Vitals 上报、HTTP 安全 headers。
> 这里只记关键决策和踩坑，常规 Next.js metadata API 不重复。

- **首页禁 `force-dynamic`，保留 ISR 语义**：登录态徽章拆到 `<Header>` 客户端 `useSession`，主体内容静态化；R2 ISR 当前临时停用，恢复后继续使用该缓存链路。`sitemap.ts` 同步 `revalidate = 3600`。
- **website 读 CMS 内容走 `force-cache`**：`packages/website/lib/cms-content.ts` 给 shared CMS helper 传缓存模式，让首页 / 文章 / skill / changelog 按各自 `revalidate` 刷新。API 内容端点不传该选项，继续沿用 shared 默认 `no-store`，避免公开 API 返回旧内容。
- **动态 OG（per-post / per-skill）—— Satori 在 edge runtime 的字体踩坑**：
  - Satori（next/og 内部）只认 **TTF / OTF / WOFF**，**不认 WOFF2**：WOFF2 需要 brotli 解压，Satori 没带；用 WOFF2 渲染时抛异常 → CF Worker 直接 1101。
  - Google Fonts CSS2 API 按 User-Agent 返回不同格式：现代 Chrome UA → woff2；不传 UA / CF Worker 默认 UA / curl 默认 → truetype；老 Firefox UA → woff。
  - **正确做法：fetch CSS 时不传 User-Agent**，让 CF Worker 默认 UA 拿到 truetype，Satori 直接吃。代码见 `packages/website/lib/og-font.ts`。
  - CJK 标题按文本子集化：CSS2 API 加 `text=` 参数只下载需要的字符，一张 OG ~30-50 KB。
- **ImageResponse 必须 eager render 才能 try/catch**：`new ImageResponse(...)` 返回的是 lazy stream，Satori 实际在 Worker 消费 body 时才跑——这时函数已经 return，外层 try/catch 接不住，Satori 抛错就是 1101。模式：
  ```ts
  try {
    const res = renderImage(...);          // 拿到 lazy Response
    const buf = await res.arrayBuffer();    // 这里把 Satori 拉跑完，能 catch
    return new Response(buf, { headers: ... });
  } catch { return fallbackImage(); }
  ```
- **fallback OG 必须是 ASCII**：兜底图用 `fontFamily: 'sans-serif'`、只渲染 `MuiCV` / `AI Job Search Platform` 这种 ASCII 文字，**绝不能塞 CJK**——一旦走兜底就意味着没字体可用，再渲染中文会再次抛错。
- **markdown heading 层级**：CMS 文章用 `##` 起算章节，页面外壳已经有 h1（post.title）。`markdown.tsx` 里 `new Marked()` 自定义 renderer 把 heading depth `Math.max(depth, 2)` 兜底到 h2，防止 markdown 出第二个 h1 / h1→h3 跳级。**不要做 +1 bump**——会把 `##` 推到 h3，反而制造 h1→h3 跳级。
- **HTTP 安全 headers 在 `next.config.ts` 的 `async headers()`**：OpenNext 透传到 Cloudflare Worker 响应。设了 HSTS / nosniff / Referrer / Permissions / X-XSS=0。**没设 CSP**——SSR + GA + 多源动态 OG，CSP 容易把自己锁出去，等专门文档再加。
- **统计接入（issue #13，2026-07~08）**：GA4（`NEXT_PUBLIC_GA_ID`，构建期内联）+ Web Vitals 上报（`components/analytics.tsx`，LCP/CLS/INP 走 `web-vitals` 事件，弥补 CrUX 长期 No Data）；GSC / Bing 验证 token 同前缀 env 写进 `layout.tsx` 的 `verification` meta。GA 脚本 `lazyOnload`，不和首页 LCP 抢资源。
- **渠道策略（issue #13）**：目标用户是中文求职人群，Google 上几乎没有自然流量（GSC / Bing 关键词全是品牌拼写 / 域名变体，0 点击）——**Bing / 百度收录为主，Google 佛系**；内容承接（“简历怎么写”类）走 CMS posts 频道，不批量造 SEO 页。海外英文落地页（/en/*）已存在但暂不主动投搜索。
- **GA4 + Web Vitals 上报**：客户端 `<Analytics>` 组件用 `next/script strategy="lazyOnload"`（首页 LCP 优化后从 `afterInteractive` 改成等 `load` 事件后再拉，避免和首屏抢网络/主线程）加载 gtag；`useReportWebVitals` 把 TTFB / FCP / LCP / CLS / INP 作为自定义 event 发到 GA4。`anonymize_ip: true`。生产没有 CrUX 数据时，RUM 替代。
- **GSC / Bing 验证 token 走 env**：root layout `metadata.verification.google` / `other.msvalidate.01` 读 `NEXT_PUBLIC_GSC_VERIFICATION` / `NEXT_PUBLIC_BING_VERIFICATION`，没设就跳过。预留位置，不强制现在做。

### 首页移动端 LCP / Speed Index 二次优化（Issue #11，2026-07-01）

> 第一轮（commit `5f8ac66` / `9e86147`）已经把 hydration 挡首屏的根因解决：Header
> 不再等 `useSession`、hero-showcase 改静态 SSR、字体/GA/preconnect 延后。这轮是
> 部署一周后复测发现 Speed Index 仍偏高，顺藤摸瓜找到的两个后续问题。

- **PSI API 配额是 0，不是限流**：`curl https://www.googleapis.com/pagespeedonline/v5/runPagespeed...`
  直接返回 `quota_limit_value: "0"`——这个项目从一开始就没有配额，重试没有意义。
  **替代方案**：本地 `npx lighthouse <url> --chrome-flags="--headless=new --no-sandbox"`
  （mobile 默认预设）+ `--preset=desktop`（desktop），Lighthouse 引擎和 PSI 是同一套，
  结果口径一致。注意：跑测的机器到目标站点的网络延迟会直接影响 FCP/LCP/TTI 这类
  时间型指标（曾观测到同一页面 desktop FCP 在 1.2s~1.6s 之间波动），但 unused-JS /
  文件体积这类字节型指标不受影响，更可信。当地网络条件不确定时，本地数据仅作方向性
  参考，最终结论建议用 https://pagespeed.web.dev/ 手动跑一次交叉验证。
- **favicon 不要拿 base64-PNG 包 SVG，也不要用远超展示尺寸的原图当 icon.png**：
  `app/icon.svg`（874 KB）解开后是 SVG 壳包了一张 948×613 的 base64 PNG；
  `app/icon.png`（491 KB）是同一张图直接合成到 1024×1024 画布。`metadata.icons`
  在 `layout.tsx` 把同一个 URL 写了 3 遍（`icon` 数组 2 条 + `shortcut` 1 条），
  Lighthouse 网络瀑布图能看到浏览器真的把 `/icon.svg` 拉了 3 次、每次 660 KB
  ——这是本轮 Speed Index / TTI 偏高的主因（mobile Speed Index 5.2s → 4.2s，
  TTI 6.9s → 3.4s，mobile score 93 → 95）。**根因在生成脚本**：`writeSvgIcons()` 之前直接把
  未缩放的原图塞进 base64，`writeIconPngs()` 网页端和 electron 端共用同一张 1024 高清图。
  已修：网页端图标单独出一份缩小版（SVG 内嵌图缩到 200px 宽、PNG 画布缩到 256×256），
  electron 端（多分辨率图标生成需要高清源图）保持不变。**注意**：当初生成资产的一次性脚本
  （硬编码个人 `~/Downloads` 路径）已随一次性工具清理删除，Phase 16 品牌形象重制需要重新生成
  资产时，按上面这套尺寸结论写新脚本即可，别重蹈覆辙。
- **i18n 词典（`_i18n/zh.tsx` / `en.tsx`）不要塞 JSX**：`FaqItem.a` 字段类型是
  `ReactNode`，词典里直接写 `<ul>/<strong>/<a>`——**类型设计上不好**（词典本该是纯
  可序列化数据），但**不是性能问题**：曾怀疑这会导致整份词典被 Turbopack 打进客户端
  bundle，用 `git worktree` 对比重构前后两版 `next build` 的
  `page_client-reference-manifest.js` 验证后证伪——两版都只有 `analytics.tsx` 一个
  真实 client 组件，词典内容在任何构建产物里都搜不到。Lighthouse 报告里那个看起来像
  "zh 词典" 的 `~zh` 命名 chunk，实际内容是 Next.js 自己的 `getAssetToken` /
  `getDeploymentId` 内部代码——**chunk 名带 "zh" 纯属 Turbopack 内容哈希巧合，与
  `_i18n/zh.tsx` 无关**。已经把 FAQ 手风琴的 JSX 内容搬到就近的
  `_sections/faq-items.tsx`（按 locale 拆分，`_home.tsx` 的 `faqPageSchema` 和
  `faq.tsx` 的渲染共用同一份数据），作为类型卫生改进保留，但不再当作性能修复的理由。
  真正的 unused-JS 大头是 Next.js 框架自身 chunk 和 GA `gtag.js`（162 KB，42% 未用），
  后者出于保留 RUM/Web Vitals 上报能力的考虑暂不进一步延迟加载。

## Cloudflare Browser Rendering（packages/api）

> 历史：原本是 Cloudflare Container（Node + Chromium + Puppeteer）+ Durable Object 单
> singleton。2026-04 切到 Browser Rendering（Workers Binding `@cloudflare/puppeteer`），
> 拆掉 Dockerfile / Container / DO，模板从 setContent(html string) 升级到
> `puppeteer.goto(URL)`，URL 指向 packages/website 的 React 组件 SSR 路由。

- **`/render` 调用链**：写一次性 token 到 `MUICV_KV` → `puppeteer.goto(${RENDER_BASE_URL}/r/render/${token})` →
  `await page.evaluateHandle('document.fonts.ready')` → `page.pdf({ format: 'A4' })` → 删 KV。
  详见 `packages/api/src/lib/render-pdf.ts`。
- **`/jobs/fetch`**：`puppeteer.goto(jdUrl)` → `addScriptTag` 注入 Readability + turndown
  → `page.evaluate` 在浏览器上下文跑 `Readability.parse()` + `turndown()` 一气呵成。
  Worker runtime 没有 DOM，所以**两个库都必须在 page 内跑**（原 container 是 turndown
  在 Node 侧跑，迁移后必须搬进 page）。详见 `packages/api/src/lib/fetch-jd.ts`。
  明确边界：**不**绕登录墙、**不**对抗 Turnstile / Captcha、**不**伪装 UA 规避 ToS。
- **本地 dev 必须 `wrangler dev --remote`**：Browser Rendering 跑在 Cloudflare 浏览器集群，
  本地 workerd 没有它，`wrangler dev` 默认 local 模式会报错。同理 `puppeteer.goto` 的目标
  URL（`RENDER_BASE_URL`）必须公网可达，所以 dev 期间走的是已部署到 muicv.com 的 prod
  packages/website。换句话说：本地改 packages/api 可以热重载联调；本地改 packages/website
  必须先 deploy 到 muicv.com 才能在 puppeteer 里看到效果。
- **字体策略**：`packages/website/app/r/render/[token]/templates/default.tsx` 通过 React
  19 自动 hoist 的 `<link>` 加载 Google Fonts 的 Noto Sans SC（替代原 container 里
  apt 装的 fonts-noto-cjk）。简历模板 CSS 颜色 / 字体全部绝对值，不依赖站点 globals.css 的
  brand 变量，避免被父层污染。如果 Google Fonts 出向被墙，回退方案是改 R2 自托管子集化字体。
- **KV token**：UUID v4，5 分钟 TTL，渲染完立即 delete。`MUICV_KV` namespace 由
  packages/website 拥有，packages/api 用同一个 namespace id 绑定。两包 wrangler.jsonc
  里 `kv_namespaces[0].id` 必须**完全一致**，否则 api 写的 token website 这边读不到。
- **wrangler text rule**：`{ type: 'Text', globs: ['**/Readability.js', '**/turndown.js'] }`
  让 fetch-jd.ts 能 `import readabilityJs from '@mozilla/readability/Readability.js'`
  把 .js 源码当字符串拿到。`fallthrough: true` 保留默认 .txt/.html/.sql 规则。
- **Workers / DOM lib 冲突**：page.evaluate 的回调跑在浏览器，需要 DOM 全局；Worker
  tsconfig 不含 DOM lib。fetch-jd.ts 用 file-scoped `declare const document/window/Readability/...`
  覆盖回调里实际用到的成员，避免在整个项目启用 DOM lib 污染 Worker 代码。
- **DO 删除迁移**：原 `BrowserContainer` DO 通过 `migrations` 追加 v2 `deleted_classes:
  ["BrowserContainer"]` 卸掉。Cloudflare 要求保留所有历史 migration，不能删 v1。

## packages/app（Electron）

- **fs.glob 启动崩溃**（commit b512f15）：
  早期版本依赖里某个包用了 Node 22 的实验 `fs.glob`，在 electron 主进程里被运行时
  当成 unstable API 直接 crash。解法是升级 packages/app 全部依赖到最新，
  让那个间接依赖换实现。以后再遇到 electron 启动 crash，先看是不是新 API 触发的。
- **muicv:// deep link**（Phase 8）：用 OAuth-style 自动登录。
  注册 `muicv://` URL scheme（macOS Info.plist），dashboard 登录成功后跳转
  `muicv://auth?token=mui_xxx`，electron 主进程拿到 token 写入本地 store，
  渲染进程进入 onboarding。完整流程见 `packages/app/src/main/deep-link.ts`。
- 电脑端通过 GitHub Releases 分发 .dmg / .zip，tag `v*` 自动触发
  `.github/workflows/release.yml`（electron-builder）。详见 DEPLOYMENT.md。
- **workspace 包必须从 externalizeDepsPlugin exclude 掉**：electron-vite 默认把所有
  dependencies 标 external，workspace 包（如 `@muicv/shared`）会被原样（含 .ts 源码）
  拷进 packaged app 的 `node_modules/`。Electron 内置 Node 拒绝 strip node_modules 下
  的 `.ts` → 启动直接 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` 崩溃。
  dev 模式不会暴露（vite 内联编译走另一条路径）。配置见
  `electron.vite.config.ts` 里 main / preload 的 `externalizeDepsPlugin({ exclude: [...] })`。
  以后新增任何 `@muicv/*` workspace 包到 main/preload 都得加进 exclude。
- **electron-builder ≥ 26.8.2 + pnpm ≥ 10.29.3 是绑定关系**：pnpm 10.29.3 起把
  `pnpm ls --json --depth Infinity --prod` 输出改成 dedup 形式（transitive 复用节点
  只输出 `{ deduped: true, dedupedDependenciesCount: N }` 不再展开子树，OOM 修复，
  pnpm 不会回滚）。electron-builder ≤ 26.8.1 的 `pnpmNodeModulesCollector` 假设永远
  完全展开，照旧递归 walk → dedup'd transitive 全漏 → asar 缺包，packaged app 启动报
  `Cannot find module 'fast-deep-equal'` / `'json-schema-traverse'` / `'ms'` 之类。
  electron-builder 26.8.2（2026-03-11）已修。以后升级 pnpm 同时记得 electron-builder
  也保持 ≥ 26.8.2。参见 [pnpm/pnpm#10601](https://github.com/pnpm/pnpm/issues/10601)。
  **不要走 `node-linker=hoisted` 绕**——它只把根 node_modules 扁平化，不解决 workspace
  子包的 transitive，治标不治本。
- **Node 26 下装不上 Electron 二进制 → `Error: Electron uninstall`**：electron 的
  postinstall（`install.js` 用 `extract-zip`/yauzl）在 Node 26 解压会**静默中途失败**——
  进程 exit 0，但 `dist/` 只解出 ~236K 半成品 `Electron.app`（无 `Frameworks/`、无
  `dist/version`、不写 `path.txt`），于是 electron-vite 的 `getElectronPath()` 读不到
  path.txt → `pnpm run dev` 崩在 `Error: Electron uninstall`。zip 本身是好的（缓存
  `~/Library/Caches/electron/<hash>/electron-v<ver>-darwin-arm64.zip` 大小正常、checksum
  对），`ditto` 能完整解出 268M，所以是 Node 26 与 electron 自带 JS 解压器不兼容，**不是
  网络 / pnpm 配置问题**（`ignore-scripts` 未开、electron 已在根 `pnpm.onlyBuiltDependencies`）。
  **别反复 `pnpm rebuild electron` / `node install.js`（同样残缺）**，用 macOS 原生补齐
  （替换 `<ver>`）：
  ```bash
  ELE="node_modules/.pnpm/electron@<ver>/node_modules/electron"
  ZIP=$(find ~/Library/Caches/electron -name "electron-v<ver>-darwin-arm64.zip")
  rm -rf "$ELE/dist" "$ELE/path.txt"; mkdir -p "$ELE/dist"
  ditto -x -k "$ZIP" "$ELE/dist"
  printf '%s' 'Electron.app/Contents/MacOS/Electron' > "$ELE/path.txt"
  ```
  验证 `cat $ELE/path.txt` + `ls $ELE/dist/Electron.app/Contents/Frameworks/`。升 electron
  版本后第一次 `pnpm install` 大概率复现。另：`dev` 脚本只在 packages/app（根目录没有），
  要 `pnpm --filter @muicv/app run dev` 或 `cd packages/app && pnpm run dev`。

## packages/app UI 架构（IDE 三栏 + 多 profile）

- **三栏布局**：左 navigator（profile 切换 + 对话列表 + 用户菜单）/ 中对话流 /
  右 artifact 区。三栏全部由 `useAppStore` (zustand) 单一真相源驱动；右栏
  collapsible 且宽度可拖拽（localStorage key `muicv:rightPanelWidth`，
  clamp 到 [320, 900] 像素）。
- **多 profile**：一个 muicv 账号下用户可建多份 "职业档案"（求职 / 跳槽 / 家人共用），
  每份对应硬盘上一个独立目录。**目录与 profile 强绑定，按 dir 去重**（`findByDir`），
  避免历史脏数据产生重复 profile。`ensureDefault` 用 in-flight promise 序列化，
  防止 bootstrap + onAutoLogin 并发竞争。
- **右栏 tree / preview 两个独立通道**：tree 是文件树根，preview 是当前预览路径，
  两者**不互斥** —— preview 以 overlay 形式盖在 tree 上面，关掉 preview 后
  tree 状态（展开的目录）原样保留。
- **artifact source 二分**：agent 工具调用 emit 的 artifact 分 `read`（参考资料）/
  `write`（产物）。read 类折叠到操作组里不打扰，write 类显眼卡片**自动开右栏**
  让用户看到结果。判断完全靠 `source` 字段，不靠 path 推断。
- **设置页三分组**：`settings-view.tsx` 是壳，左侧 nav 三分组（通用 / 模型 / Skill）+ 右
  侧分组面板，由 `activeSection` state 切。具体卡片仍在 `components/settings/` 子目录：
  - 通用：`plan-card`（会员档位 + 余额）/ `theme-card`（三态主题）/ footer 版本检查
  - 模型：`model-card`（4 model 选择）/ `muirouter-card`（绑定 / 余额 / fallback）/
    `custom-llm-card`（折叠 BYOK 配置 + Field 子件）/ `whisper-engine-card`（本地转写）
  - Skill：`skill-market-card`（内置能力 + 外部来源）
  - 公用：`bits.tsx`（Avatar / ExternalButton + DASHBOARD_URL / MUIROUTER_URL 常量）
  改设置页按卡定位文件，不要回写整个壳；加新分类记得同步 `SettingsSectionId` 联合类型和
  `SETTINGS_SECTIONS` 描述数组。

## 三态主题切换（light / auto / dark，website + app 共享）

> 2026-05 后接入。`globals.css` 同时提供 `:root`（light）/ `[data-theme="dark"]`（暗
> 色）/ `[data-theme="auto"]` 配 `@media (prefers-color-scheme: dark)` 三套 token。

- **同款 hook**：website `app/_theme/use-theme.ts` 和 electron `lib/use-theme.ts` 都用
  localStorage key `muicv-theme`，值是 `'light' | 'auto' | 'dark'`；不写表示 light，避免
  老用户 / 新装首次进来就有非空值。
- **避免 FOUC**：两端都在 React hydrate 之前同步写 `data-theme`——website 是 root layout
  里内联 `<script>`（`theme-init-script.tsx`），electron 是 `main.tsx` 的 `createRoot`
  前 `bootstrapTheme()`。**新增 theme 入口必须沿用这套同步初始化**，不能放进 effect 里。
- **暗色对比 guard**：暗色模式下 `--color-ink` / `--color-ink-soft` / `--color-mute` 都
  翻成浅色，但 `.bg-yellow` / `.bg-corgi` / `.bg-tongue` 这些亮底色不变，子节点继承翻转
  后的浅色 → 字糊掉。**用后代选择器** `.bg-yellow .text-ink` 而非同元素选择器
  `.bg-yellow.text-ink` 强制重写为固定深色（`--color-on-yellow*`、`--color-on-corgi*`、
  `--color-on-tongue*` 三套），覆盖 ink / ink-soft / mute 三档。父元素自身也要 force
  dark text 兜底，防子节点不带 `text-*` 直接继承。
- **toggle 挂载点**：website marketing header 桌面端 + dashboard 侧边栏底部各一份
  （dashboard 看不见 marketing header）；electron 在 settings → 通用 → `ThemeCard`。
- **token 修改成本**：暗色版只在两个 `globals.css` 维护——新增 token 时务必同时给出
  暗色覆盖，否则在 dark 下会撞回浅色 fallback。

## packages/app 内置 PDF 预览（muicv-pdf:// custom protocol）

> 简历 PDF 走 Chromium 内置 viewer 在右栏 iframe 渲染，不外开系统阅读器。

- **协议注册顺序**：`protocol.registerSchemesAsPrivileged([{ scheme: 'muicv-pdf',
  privileges: { standard: true, secure: true, stream: true } }])` 必须在
  `app.whenReady()` **之前**调用；handler 注册（`protocol.handle`）放在
  whenReady 里。顺序反了协议会失效。
- **plugins: true 必须开**：Chromium 内置 PDF viewer 是 plugin，BrowserWindow
  默认 `plugins: false` 时 `<iframe src="muicv-pdf://...">` 会**静默白屏**
  （响应 200、内容也对，但 viewer 不接管）。开 `plugins: true` 才能让 PDF
  在 iframe 渲染（commit 8489411）。
- **路径白名单**：handler 里强制校验 url.hostname === 'local'、文件路径
  必须以当前 profile 的 workspaceDir 开头、后缀必须 .pdf —— 三层 gate
  防止 renderer 通过协议读到工作目录之外的文件。
- **Buffer → ArrayBuffer**：返回 `Response(buf.buffer.slice(...))` 而不是
  `Response(buf)`，否则 Buffer 在某些环境下会被识别成 SharedArrayBuffer。

## STT / 录音架构（packages/app + packages/api，Phase 13 沉淀）

- **provider switch（local / cloud / local-preferred）**：本地 = whisper.cpp + 用户挑的
  model；云端 = `POST /audio/transcribe`（Cloudflare Workers AI Whisper-large-v3-turbo，
  25 MB / 10 min 上限，按分钟扣 `stt_transcribe` token）。`local-preferred` **不**自动
  fallback：本地失败直接报错——隐私优先（用户选了本地就别偷偷上传）。
- **whisper.cpp 走 plugin 模式 / 跟主 app 解耦升版**：独立 workflow
  [whisper-engine.yml](.github/workflows/whisper-engine.yml) 多平台 build + Developer ID 签 +
  Apple notarize → GitHub Release `whisper-engine-vX.Y.Z`；app 按需从 release + HuggingFace
  下载到 `<userData>/whisper-engine/`。设置页 `WhisperEngineCard` 管引擎 / 模型 / 偏好。
- **audio format**：renderer 用 `OfflineAudioContext` 把任意输入（mp3 / m4a / webm / ogg /
  flac / live MediaRecorder 流）解到 16 kHz mono PCM 再 WAV 编码——云端 / 本地共用一份格式，
  不在主进程跑 ffmpeg / lamejs。
- **macOS 麦克风**：Hardened Runtime + `NSMicrophoneUsageDescription` + manual TCC prompt。
  没这三件套发 dmg 上线后用户会"按了说话没声音"且控制台无报错。
- **MiMo ASR（小米开源中文 ASR）已调研排除**：8B PyTorch + CUDA-only，桌面端不可行；
  中文方言识别强但只能做云端 provider（待用户量上来再考虑接，P2）。
- **mimo-v2.5 跳过 STT，wav 直传音频**（commit 3c1df06，2026-05）：Xiaomi MiMo
  支持音频理解。检测到 `supportsAudioInput(defaultModel)`（目前只 `mimo-*` 全模态版命
  中）时，录音不走 transcribe，而是把 wav 裸 base64 灌进 Agents SDK 的
  `{ type: 'audio', audio, format: 'wav' }` content block；SDK 的 chat_completions
  converter 再转成上游 `input_audio`。**少一轮 Whisper 往返 + 模型直接听原音**。
  注意不要直接构造 `{ type: 'input_audio' }`，Agents SDK 会报 `Unknown content`。
  history.ts 的 `audioReader` 分支按 200 token/条估算预算。`AttachmentKind` 加
  `'audio'`，main/attachments classifier 接受 mp3/wav/flac/m4a/ogg。
  - 验证脚本：`scripts/verify-mimo-audio.ts`，`MIMO_API_KEY` 在手时一行 curl 验上游格
    式，避免悄悄回归。
  - 新增支持音频的 model：扩 `supportsAudioInput()` 白名单，UI 的 `ChatInputBar` 会自
    动按 `defaultModel` 切「能听」/「不能听」footer 文案。

## Agent 运行时上下文管理（packages/app/src/main/agent）

> OpenAI Agents SDK 0.9+ 的 `AgentInputItem[]` 是 agent loop 的内存表示。
> `runtime.ts` 在每次 `run()` 之前把持久化的 `ChatMessage[]` 经 `history.ts` 的
> `buildAgentInput` 转成 `AgentInputItem[]`，顺手做滑动窗口裁剪——长对话不会撞
> context_length。

- **预算**：所有模型走同一保守值 `MODEL_CONTEXT_LIMIT = 256_000` 显示 token，
  压缩阈值 `COMPACT_THRESHOLD = 0.8`，历史区预算 = 256K × 0.8 = 204.8K，留 20%
  给 system prompt + tool schema + 模型本轮输出。**不**做 per-model 表，因为 muicv
  后端可能随时上新模型，硬编码会过期；保守值在所有模型上都安全。改阈值改
  [history.ts](packages/app/src/main/agent/history.ts) 顶部两个常量即可，不必动 runtime。
- **token 估算**：`estimateTokens(text) = ceil(text.length / 2.5)`，**不**引 tiktoken
  （桌面端 main 进程要保持轻量）。中文场景偏保守（实际 ~1 token/汉字），代价是
  英文略低估——可接受，反正用得是软上限。
- **裁剪策略**：从最新往最早倒序贪心累加，超 budget 即停。**最后一条 user 永远保留**
  （即便它单条就超 budget——丢用户最新输入比保留 system 更糟）；中段被切断时，
  在保留段最前面插一条占位 `user` 消息「（已省略 N 条更早的对话）」让模型知道
  历史不完整。**不**重建 tool_call / tool_result 链：assistant.toolCalls 在送 LLM 时
  忽略，与 MVP 字符串拼接版语义一致。
- **context_length_exceeded 友好文案**：上游若仍报这个错（极端长附件 / 工具返回
  超大），`runtime.ts` 的 `isContextLengthError` 模糊匹配 `context_length_exceeded` /
  `maximum context length` / `too many tokens` 等中英文表述，统一替换成
  「本次对话历史超出模型上下文长度。已尝试自动裁剪，仍超出的话请新开一个对话。」
  原始 OpenAI 错码不再透出给用户。
- **thinking-mode reasoning_content 透传**（2026-05，issue #8）：mimo / DeepSeek 系
  thinking-mode 模型在多轮 tool calling 时，要求**每一条带 tool_calls 的 assistant
  message** 都伴随 `reasoning_content`，否则 400 `Param Incorrect`。`@openai/agents`
  SDK 0.9+ 走 chat_completions 路径时不识别这个非标准字段会直接丢掉。上游修复
  （[PR #792](https://github.com/openai/openai-agents-js/pull/792) /
  [#814](https://github.com/openai/openai-agents-js/pull/814)）只在 `agents-extensions`
  的 `aisdk()` 路径，gate 写死 `isDeepSeekModel`——伪装方案得改 provider 名 + 加 2
  个 deps，不可控。我们在 [runtime.ts](packages/app/src/main/agent/runtime.ts) 的
  `loggingFetch` 层自己拦截。**触发条件**：`isThinkingModeModel(modelId)` 白名单
  （当前 `mimo-*` / `deepseek-*`），同时控制 reasoning 透传开关和 watchdog timeout 长度。
  - **Response 侧**：thinking-mode streaming response → `body.tee()` 一份 SSE 流，
    后台累计 `delta.reasoning_content` 推入 `reasoningQueue` 末尾；同时通过模块级
    `reasoningDeltaListener` 把每个 delta 转发给 renderer，UI 实时展示思考过程
    替代原静态"思考中…"。
  - **Request 侧**：thinking-mode 下次请求出去前，从队尾对齐——`body.messages` 里最后
    N 条 assistant 对应 `reasoningQueue[0..N-1]`。FIFO 顺序：`queue[0]` 对应本轮第一个
    新生成的 assistant，依此类推。历史完成态 assistant（持久化重建无 tool_calls）
    不需要 reasoning_content。
  - **resetReasoningState()** 在每次 `runAgent` 起点清队列，避免跨 run 错位。

  **新增 thinking-mode 模型时**：把模型前缀加进 `isThinkingModeModel()`——本来就要在
  pricing.ts 的 LLM_DISPLAY_META 登记新模型，顺手维护这一处零成本，且避免对 GPT 这类
  没 `reasoning_content` 字段的模型做无用的 tee + JSON.parse。

  并发假设：SDK 在单次 `run()` 内严格串行调用 fetch（等本轮 stream 完 + tool 跑完
  才发下一轮），队列推入/读取无并发。

  上游若在 chat_completions 路径修了 reasoning_content 透传，删这层 revert 即可。
  跟踪：cron 周扫 `@openai/agents` release notes（设置：`/schedule list`）。

- **Endpoint 选择（chat_completions vs responses，2026-05-15）**：OpenAI gpt-5.x 系是
  reasoning 模型，function tools + `reasoning_effort` 在 `/v1/chat/completions` 端
  **不支持**（官方 400：「Please use /v1/responses instead」）；mimo / deepseek 系
  又必须走 chat_completions（reasoning_content 双向透传依赖 chat 端 SSE 解析）。
  `runtime.ts:selectOpenAIAPI(config)` 在每次 `runAgent` 起点决策一次：
  - 自带 `customLlmBase` 第三方代理（Groq / Together / OpenRouter 等）→ chat_completions
    （这些代理普遍没实现 /v1/responses）
  - `isThinkingModeModel(model)` 命中 → chat_completions
  - 其余 → responses

  之所以**每次 run 都调一次** `setOpenAIAPI(...)`：同一个 muicv key 可能在两次 run
  之间被用户切了 model，cache 不住。
- **agent run 起手先把 user msg 落盘**（commit `dc8a020`）：在 SDK 启动 stream 之前
  做一次 `getConversation → push lastUser → saveConversation`，按 id 幂等。这是兜
  `dev 重启 / 主进程崩 / 网络 stream 中段挂` 等场景：哪怕 stream 一个字符都没回，
  用户刚敲的这条至少不会丢；`flushConversation` 末尾再 push 时按 id 去重不会重复。

## Agent 交互提问 `ask_question`（2026-09）

让 agent 在需要用户决策时挂起等待前端回答，而不是在正文里写"请回复 1 或 2"。

- **工具定义**：[question-tools.ts](packages/app/src/main/agent/question-tools.ts) 用
  `@openai/agents` 的 `tool()` 定义唯一的 `ask_question(question, options?, multiSelect?)`，
  `execute` 返回一个**永不自动 resolve 的 Promise**，把 `resolve/reject` 存进模块级
  `pendingQuestions` Map + `pendingOrder` 队列，等 IPC 唤醒。
- **唤醒 / 取消**：`answerQuestion(toolCallId, payload)` 由 `agent:answerQuestion` IPC 调用，
  把答案格式化成人话（「用户选择了：A、B。用户补充说明：…」）后 resolve，作为 tool output
  回到 agent。run 结束（`finally`）和用户中止（`abortRun`）都调 `cancelPendingQuestions(reason)`。
- **watchdog 抑制**：等待期间 `isWaitingForQuestion = true`，runtime 的空转看门狗不判超时
  （用户思考多久都不算"上游卡住"）。
- **UI**：`chat-question-card.tsx` 从消息的 `toolCalls` 里按 `name === 'ask_question'` 取出
  渲染成交互卡片（气泡里其余工具仍收进 OpsGroup）。
  - 卡片只在**当前有活跃 run**（`store.activeChannel !== null`）时可提交。中断 / 重新打开后
    的历史里，未回答的提问仍留在落盘记录（abort 路径也会 `flushConversation`），但主进程已无
    pending——此时渲染"提问已失效"而不是让用户白点。
  - `answerQuestion` 返回 `false` 表示没匹配到 pending，卡片据此报错并恢复可提交，不把状态机
    押在 `tool-output` 事件必达上（提交成功另有本地 `submitted` 态）。
  - 回答提交后，run 继续流式产出，`tool-output` 事件最终让 `call.output` 落地，卡片切"已回答"。
- **已知边界**：`pendingQuestions` 是模块级全局、未按 channel 隔离；`answerQuestion` 的
  callId 兜底取最早入队项。当前架构用户不会同时跑两个 agent run，够用。将来要支持并发
  多窗口，必须把队列改成 per-channel（reasoning-capture 的模块级单 slot 有同样假设）。

## 对话分叉 / 回滚重新编辑（2026-09）

- **分叉** `forkConversation(profileId, convId, messageId, newTitle?)`：
  [conversations.ts](packages/app/src/main/conversations.ts) 找到 messageId 下标，
  `slice(0, idx+1)` 深拷贝截至该消息的历史，`randomUUID()` 建新会话，默认标题 `${title} (分支)`。
  UI 入口是 AI 消息反馈条上的「分叉此对话」→ `fork-conversation-dialog.tsx` 让用户改标题。
- **回滚** `rollbackConversation(profileId, convId, messageId)`：截断该条用户消息**及其之后**
  的全部记录，返回被截掉的原文本（已剥离附件 footer）与附件列表，renderer 填回输入框供改后重发。
- 分叉 / 回滚都只动该 conversation 的 JSON 文件，不动别的会话。

## 输入栏交互约定（2026-09）

- **发送键**：Enter 直接发送、Shift+Enter 换行、IME 合成中（`isComposing` / `keyCode 229`）不发送。
  判定集中在 `chat-utils.ts` 的 `isChatSubmitHotkey(e)`，组件不再各自写一套。
- **内联模型选择器** `chat-model-selector.tsx`（输入栏左下角）：读 `@muicv/shared` 的
  `SUPPORTED_LLM_MODELS` / `LLM_DISPLAY_META` / `REASONING_EFFORTS`，支持切模型与思考深度。
  **与设置页的 `ModelCard` 并存**：输入栏是快捷入口，设置页是完整体验，两者读同一份常量表，
  不重复维护数据。BYOK（自带 endpoint）时列表置灰，提示平台清单不生效。
- **附件 footer 格式统一**：`---\n[附件]\n` 的常量与 `stripAttachmentFooter()` 已下沉到
  [shared/src/attachments.ts](packages/shared/src/attachments.ts)，renderer（生成 + 剥离）和
  main（回滚剥离）共用一份。此前三处各写一遍字面量，「只发附件不打字」的消息（生成端去掉
  前导 `\n\n`）剥离会漏掉，已修并补回归用例。`chat-utils.ts` re-export 保持既有 import 路径。

## API Key / 鉴权（packages/api）

- `mui_xxx` 是桌面 app + skill 的统一凭据。在 web dashboard 创建/撤销，
  存到 D1 的 `apiKey` 表（hash 后的）。
- 中间件：
  - `requireApiKey`：缺/无效直接 401。**当前所有付费 / 计费端点都用它**：
    `/me`、`/llm/v1/*`、`/render`、`/jobs/fetch`、`/resume/*`。
  - `optionalApiKey`：保留备用；目前**没有**端点在用（早期 `/render`、`/jobs/fetch` 曾走过它，
    2026-05 切到 `requireApiKey` 配合 token 扣费）。
- `/llm/v1/*` 是**反向代理到 muirouter**（OpenAI 兼容），我们自己**不**直接发 LLM 请求。
  桌面 app 的 OpenAI Agent SDK 把 baseURL 配成 `https://api.muicv.com/llm/v1`，
  我们透传 + 计费 + 按用户 BYOK 路由到他们绑定的 muirouter key。

## Skill 鉴权与计费策略

- **2026-05-02 决策**：muicv API 全量收紧到 Bearer 强制鉴权（无匿名档）。
  原因：所有联网调用都按 token 计费（`/render` 扣 `PDF_RENDER_COST`、
  `/jobs/fetch` 扣 `JD_FETCH_COST`、`/llm/v1/*` 按真实用量），
  匿名用户没账户 → 没法计费 / 限流 / 监控用量 / 审计。
- 所有调 muicv API 的 skill 必须走 [docs/skill-api-key.md](docs/skill-api-key.md)
  的统一规范——前置 gate + 标准教育文案 + 错误映射表（含 401 / 402 / 429）。
- 写新 skill 时先判断"要不要联网"：要 → 套规范；不要 → 别加 gate 吓走免费用户。
- 标准文案改动统一改 `docs/skill-api-key.md`，再回写所有引用 skill
  （`grep -lr "docs/skill-api-key.md" skills/`）。

## Skills 分发

- 通过 Vercel `skills` CLI 分发：`npx skills add meathill/muicv`
  （兼容 Claude Code / Codex / Cursor / OpenCode 等 40+ agent）。
- skill 大段 prompt 放在 `skills/<name>/references/*.md`，SKILL.md 里靠
  `{{ reference: xxx }}` 引用，避免主文件臃肿。

## Better Auth / 账号系统（packages/website）

- 使用 Better Auth + 邮箱密码 + GitHub OAuth（M2，commit 2e90655）。
- session 存 D1，cookie 配置在 `lib/auth.ts`。
- dashboard 路由分组 `(dashboard)`；marketing 路由分组 `(marketing)`。
- 注意 Better Auth 的 trustedOrigins 要把生产域 + dev 域都写上，否则 OAuth 回跳被拒。

## 付费 token 钱包（M4，packages/website + packages/api）

> 我们没有"档位 + 月度配额"模型，是**统一 token 钱包**：注册送 10K，月卡每月续，
> 补充包随用随买。所有云端服务（LLM 按 model 分价、PDF 200、JD 300）按 token 扣。BYOK
> 用户的 LLM 走 muirouter 自己付，但 PDF / JD 仍扣 muicv tokens。

### 定价口径与毛利（2026-09 review）

数字只在 `packages/shared/src/pricing.ts`（`SUBSCRIPTION_PLANS` / `TOPUP_PACKS`），
Stripe price ID 只在 `packages/website/lib/stripe-prices.ts`。算法：

- 锚点 **1 显示 token = $1e-5**；上游价统一 `× 1.1`（`LLM_RATIO`）。
- 余额面值 = tokens × $1e-5；上游成本 = 面值 / 1.1；满载毛利 = 售价 − 上游成本。

**满载毛利（所有 token 用尽，未计手续费）**：

| SKU | 售价 | tokens | 满载毛利 | 毛利率 | $/M |
| --- | --- | --- | --- | --- | --- |
| Pro 月付 | $4.88 | 500K | +$0.33 | +6.8% | 9.76 |
| Pro 年付 | $48.88 | 5.5M | −$1.12 | −2.3% | 8.89 |
| Max 月付 | $15.88 | 1.7M | +$0.43 | +2.7% | 9.34 |
| Max 年付 | $158.88 | 18.8M | −$12.03 | −7.6% | 8.45 |
| topup small | $1.88 | 140K | +$0.61 | +32.4% | 13.43 |
| topup medium | $5.88 | 480K | +$1.52 | +25.8% | 12.25 |
| topup large | $19.88 | 1.75M | +$3.97 | +20.0% | 11.36 |

两个容易漏的点：

1. **必须叠加 Stripe 手续费**：约 2.9% + $0.30/笔（海外卡更高）。对 Pro 月付这种小额定单，
   手续费就吃掉约 9 个百分点 → 满载实为微亏。**补充包才是真利润中心**（扣费后仍有 13~18%）。
2. **年付折扣要克制**：年付售价 = 月付 × 10，token 若给到 ×12 就是「10 个月的钱买 12 个月的量」，
   满载亏 11~14%。2026-09 把年付 token 收到 **×11（Pro 5.5M / Max 18.8M）**，折扣从 17% 降到
   ≈9%，满载亏损收到 2~8%。订阅折扣的本质是**赌用户用不满**，不追求满载保本，但让利幅度要可控。

价格本身（金额 / currency / interval）在 Stripe Dashboard 维护；**改 token 数无需动 Stripe**
（recurring price 金额不变，token 由 webhook 从 `SUBSCRIPTION_PLANS` 反查入账）。存量年付订阅
下次续费自动用新 token 量，已发放的不回收。

- **D1 原子扣账：必须单 statement**。`UPDATE tokenBalance SET balance = balance - ?
  WHERE userId = ? AND balance >= ? RETURNING balance` —— SQLite 内部 page-level mutex
  保证原子，`first()` 返回 null 即余额不足。绝不允许"先 SELECT 再 UPDATE"两步走，
  并发场景会双扣。
- **D1 原子入账：INSERT…ON CONFLICT…DO UPDATE**。同语义；行不存在自动建。
- **ledger 写失败不阻塞业务**：`charge` 在 UPDATE 成功后 `INSERT INTO tokenLedger`
  写流水，失败 `.catch(() => {})` 吞掉。`lifetimeSpent` 字段是真值源，财务对账
  看余额表而不是流水表。
- **lazy init signup_bonus**：用 `INSERT OR IGNORE INTO tokenBalance ... RETURNING`，
  RETURNING 仅对真新建的行返回，conflict 时返回 null —— 借此判断是否要写 signup_bonus
  流水。三处入口（website /api/me、api worker /me、dashboard 首页）都调，并发安全。

## μtoken 内部存储单位 + 按 model 分价 LLM 计费（2026-05）

> 历史：原本 `tokenBalance.balance` 直接存「显示 token」整数，扣费按
> `ceil((prompt+completion) × 1.1)`，model-agnostic。新增 Xiaomi Mimo 上游 +
> 4 model 价差 60× 后，整数 ceil 在最便宜的 mimo-v2.5（input 0.008/上游 token）上
> 会让小请求被多扣 100×+，老公式必须替换。

- **存储单位 ×1e4**：`tokenBalance.balance` / `lifetimeEarned` / `lifetimeSpent` /
  `tokenLedger.delta` 都改成 **μtoken**（1 显示 token = 10_000 μ）。SQLite INTEGER
  64-bit，存量最大值 ×1e4 后远未触顶。Migration `0011_scale_tokens_to_micro.sql`
  一次性 `UPDATE … SET col = col * 10000`，无回滚路径，先 `--local` apply 后核对再发生产。
- **边界**：写路径在调 wallet 前 `displayToMicro`（PDF / JD / Stripe webhook）；
  读路径在 API response handler / SSR 渲染时 `microToDisplay`。**wallet.ts 内部
  统一 μtoken**，函数签名不再有 display/μ 混用。helpers 都在 `packages/shared/src/pricing.ts`。
- **按 model 分价**：`LLM_PRICING` 表给每个 model 一对 `inputRate`（显示 token / 上游 prompt token）
  和 `outputRate`（同口径，给 completion）。新公式
  `ceil((prompt × inputRate + completion × outputRate) × 1.1 × TOKEN_PRECISION)` 直接返 μtoken，
  取整在 μ 层（4 位精度），上面那个溢扣问题彻底没了。
- **当前支持 model**：`gpt-5.4` / `mimo-v2.5-pro`（默认）/ `mimo-v2.5`。
  锚点 1 显示 token = $1e-5（从 Pro 套餐 500k/$4.99 反推）。Xiaomi 价以 ¥7/USD 折算到
  USD 后再算 rate。表外 model（含老的 `gpt-5.5` / `gpt-4o-mini`）一律 400 `unsupported_model`，
  让客户端显式升级 `defaultModel`——不用 fallback rate 是为了避免悄悄按错价格扣。
- **下架 model 客户端静默回退**：app `main/store.ts:getConfig` 在 `customLlmBase` 为空
  （走平台路径）时用 `normalizeModel(storedModel)` 兜底，已下架的 id（如 `gpt-5.5`）回退
  到 `DEFAULT_LLM_MODEL`（当前 `mimo-v2.5-pro`），**不弹窗 / 不打断用户**；自带 BYOK
  endpoint 时不 normalize，用户可以填任意 model id。下架一个 model 的 checklist：
  `LLM_PRICING` / `LLM_DISPLAY_META` 删条目 → 调 `DEFAULT_LLM_MODEL` / `isDefault` →
  顺手扫 `routes.test.ts` / `pricing.test.ts` 里硬编码的旧 id → 文案里旧 id 提示。
- **平台第二上游**：`packages/api/src/routes/llm.ts` 在余额 > 0 路径里按 `model.startsWith('mimo-')`
  分流：`mimo-*` 走 Xiaomi（`https://token-plan-cn.xiaomimimo.com`，`MIMO_API_KEY`），
  其它走 OpenAI（`https://api.openai.com`，`OPENAI_API_KEY`）。muirouter fallback 路径
  不被本表约束（其 model 列表由 muirouter 端管理）。前缀分流的取舍：客户端零改动、
  未来加 deepseek/moonshot 一行 case 即可；缺点是 model id 命名空间冲突时会路由错
  （目前 `mimo-` / `gpt-` 前缀够独特）。
- **prompt cache 命中分价（issue #4，2026-05-08；2026-05-10 校准）**：`LLM_PRICING` 加 `cachedInputRate`，
  从 `usage.prompt_tokens_details.cached_tokens` 读出命中数。**OpenAI 约定 cached_tokens
  已计入 prompt_tokens**，所以 `computeLlmCharge` 内部 `fresh = prompt - cached` 后分别按
  `inputRate` / `cachedInputRate` 算价；OpenAI gpt-5 系上游按 90% off 给（input × 0.1），
  mimo 系上游目前不返 cached_tokens、`cachedInputRate=inputRate` 保守持平。
  原先按 50% off 配出 ~13.6% 净加价、超出设计 10%——验算 25,438.325 token / OpenAI $0.224
  时发现，2026-05-10 校到 90% off 把 margin 拉回 ~10%。`tokenLedger.meta` 多写一个
  `cachedTokens` 字段（JSON，无 schema 迁移），admin 详情页 cached>0 时展示。

## OpenAI LLM 代理：stream 注入 / usage 抽取 / 计费（packages/api）

> 平台路径同时反代 `/llm/v1/chat/completions` 和 `/llm/v1/responses`。`isLlmGeneration =
> isChatCompletions || isResponses` 是判断"是否要做 model 白名单校验 + 扣账"的总闸门。

- **chat_completions**：
  - 默认 stream 不返 usage，必须 `stream_options: { include_usage: true }`。
    平台路径（无 BYOK）**强制注入**这个字段。
  - 转发响应时如果 client 自己没声明 include_usage，把 "choices=[] + usage 非空"
    的最后那个 SSE block 吞掉（`stripUsageChunkFromSse`），保持 OpenAI SDK 流契约。
  - usage 抽取：`extractUsageFromSseStream`（流式扫尾）/ 顶层 JSON `usage.prompt_tokens`。
- **responses**（2026-05-15 加，see commit `5a15528`）：
  - mimo 上游不实现该端点，`pickPlatformProvider().name === 'xiaomi' && isResponses`
    直接 400 `unsupported_endpoint`，避免 404 + 计费混乱。
  - usage 抽在 SSE `event: response.completed` 事件内（不是最后一条 chunk）；
    字段名也不同：`input_tokens` / `output_tokens` / `input_tokens_details.cached_tokens`
    → 在 `extractUsageFromResponsesSseStream` 里映射回 LlmUsage 形态复用既有
    `computeLlmCharge`。
  - **不**做 stripUsageChunkFromSse —— `response.completed` 事件本来就是契约的一部分，
    客户端 SDK 依赖它结束 stream。
  - 不注入 `include_usage`（responses 默认就返）。
- **tee 上游 stream**：一份给 client，一份在 `waitUntil` 里聚合 usage 后扣账，
  不阻塞响应。tee 是 Web 标准，Workers 原生支持。
- **错误响应不扣账**：`upstream.status >= 400` 时 skip charge（可能 usage 字段都没有）。
- **接受单次过冲**：pre-check 只比对 `balance > 0`，不估算本次成本（estimate 不准
  会导致"差 100 token 被拒"客诉）。post-record 之后下次请求才会被 pre-check 拦下。

## Stripe 在 Cloudflare Workers（packages/website）

- **必须用 `Stripe.createFetchHttpClient()`**：默认 Node http 在 Workers 跑不了。
  stripe-node 22 + apiVersion `2026-04-22.dahlia`。
- **必须用 `webhooks.constructEventAsync`**（不是 `constructEvent`）：依赖 SubtleCrypto，
  Workers 原生支持；同步版需要 Node crypto 跑不了。
- **webhook 必须 `request.text()` 拿 raw body**，不能 `.json()` —— 签名校验基于
  原始字节算。Next 16 App Router 不会自动 body-parse POST，所以不需要 `bodyParser=false`，
  但**别在 middleware 里读这个 request 的 body**，否则下游拿不到。
- **getOrCreateStripeCustomer 必须幂等**：先查自家 subscription 表 → 没有就
  `customers.create({ metadata: { userId } })` → 立刻 INSERT 一条 status='incomplete'
  的占位行。**不立刻 INSERT 的话**用户连续点两次升级会创出两个 customer，从此该
  user 在 Stripe 那边永远是脏的。
- **双层幂等**：(1) `stripeEvent` 表对 evt_id 去重（`onConflictDoNothing().returning()`，
  affected rows=0 即已处理）；(2) `credit()` 用 `invoice_<id>` / `checkout_<sid>` 当
  ledgerId，重复触发不重复入账。两层独立，缺一不可。
- **price_id → token 映射放代码**：不查 Stripe API（每次 webhook 多一跳），直接查
  `packages/shared/src/stripe-prices.ts` 的常量表（`STRIPE_SUBSCRIPTION_PRICES` /
  `STRIPE_TOPUP_PRICES`，反查走 `SUBSCRIPTION_PRICE_META` / `TOPUP_PRICE_META`）。
  **website 与 api 两端共用这一份**，不在 wrangler.jsonc vars 里——priceId 是
  `plan × interval` 结构化数据，扁平 key-value 难维护、易漏改；两端各存一份更会漂移
  （曾导致 Pro 订阅在桌面 app 显示为免费版，见文末）。增减档位只改这个表和
  `packages/shared/src/pricing.ts`。
- **订阅只卖 USD，人民币只卖补充包**（2026-09 起）：Stripe 本账户不支持 CNY recurring
  （Alipay 进不了 subscription mode，WeChat Pay 全平台不支持 recurring），所以
  `STRIPE_SUBSCRIPTION_PRICES` 只有 usd 一份；`/api/checkout` 对 `currency=cny` 直接 400，
  引导切美元或买 `/api/topup`（微信/支付宝/卡）。曾用「CN 月包/年包」一次性 SKU +
  cooldown 模拟订阅（`CN_PACKS` / `lib/cn-pack.ts` / `api/cn-pack`），2026-09 已整体下线删除，
  `ledger.type='cn_pack'` 仅保留给历史流水。
  - **别删 `LEGACY_CNY_SUBSCRIPTION_PRICES`**：Stripe 在 CN 订阅上虽拒了 Alipay/WeChat 但**允许 card**，
    不能排除已有 CN 用户用国际卡订阅过。这 4 个 CNY recurring price 已从**可售表**摘除
    （Checkout 选不中），但保留在**反查表**里，让存量订阅续费仍能入账——
    否则就是对已付费用户静默少发 token。确认 Stripe 侧无 active 订阅后再删常量
    （原先的核查脚本已随一次性工具清理删除，需要时用 Stripe Dashboard 或临时脚本查）。
- **Hosted Checkout + Customer Portal**：不嵌入 Stripe Elements（省 80KB bundle）。
  取消 / 切档 / 看发票全交给 Stripe Portal，自己只写跳转。
- **Stripe API 2026-04 起 period 字段在 `subscription.items.data[0].current_period_*`**，
  不再在 subscription 顶层。webhook handler 取 period 时记得从 item 取。

## 云同步与持久化架构 (MuiCV Sync & Git)

Mui简历支持两种内容持久化策略（双通道并行，黑/白盒配对）：
- **黑盒：muicv-sync（云同步）**
  - **机制**：通过 `api.muicv.com` 提供的 API，将 `.claude/muicv/` 下的文件作为快照上传到 D1 (`resumeSnapshot` / `resumeSnapshotHistory`)。
  - **冲突策略**：Last-write-wins（以客户端最新 push 为准），自动将老版本归档进 history，最多保留 5 份历史。
  - **两类用户处理**：Client 用户（桌面端）通过 Deep Link 自动注入凭据，享有专门的 `sync_resume_to_cloud` 工具无感同步；Skill 用户则需先配置 `MUICV_API_KEY`，由 skill 引导获取并验证。
  - **预校验**：1MB / 500 文件上限检查统一放在 `packages/shared/src/resume-sync.ts`，供两端复用。

- **白盒：muicv-git**
  - **机制**：纯本地操作，通过 git 将内容存入用户自己的 GitHub / GitLab 仓库。
  - **边界**：不替用户隐式 commit，除非明确指示；教导用户使用 Git 而非掩盖 Git 的存在。避免 force push。

## 面试类 Skills 架构

面试辅导拆分为三个阶段的独立 Skill，避免单一 Agent 职责过重：
1. **模拟面试 (`muicv-interview`)**：面向面试前。采用「双输入轨设计」——如果检测到环境支持语音（如桌面 App），则开启全面反馈（内容+流利度+填充词）；如果是打字环境，则降级为仅评价内容。出题逻辑按 JD × 简历 × 轮次 × 级别动态推导。
2. **真实复盘 (`muicv-debrief`)**：面向真实面试后。属于“写文件”类型 skill，将用户口述内容落盘到 `debriefs/` 目录。Agent 明确保持中立，不下“过/挂”结论。
3. **经验反哺**：`muicv-interview` 的 P1a 阶段引入题目质量打分机制，将好题目回写到 `interviews/` 下。后续可通过聚合高分题目建立共有题库。

## muirouter OAuth 关联（packages/website + packages/api + packages/app）

> 历史：原本是「在 muirouter 自己生成 sk-gw key → 粘贴回 muicv dashboard」。2026-05 切到
> OAuth 风格：muicv 跳转去 muirouter 授权 → muirouter redirect 回 muicv 带 code →
> muicv 服务端用 code 换 access_token + refresh_token，**走 hsm.meathill.com 信封加密
> 存储**（不在本仓库做 HKDF / AES-GCM），D1 只留 metadata（过期时间、scope、defaultModel
> 等）。HSM path = `muicv/muirouter/<userId>`，value 是 JSON `{accessToken, refreshToken}`。

### muirouter 端协议（与 muirouter 仓库同步演进）

- 授权页：`GET https://muirouter.com/oauth/authorize?client_id=muicv&redirect_uri=...&state=...&scope=balance,llm&response_type=code`
- 换 token：`POST https://api.muirouter.com/oauth/token` body `{grant_type, code|refresh_token, redirect_uri?, client_id, client_secret}` → `{access_token, refresh_token, expires_in, scope, user:{id,email,username}}`
- 撤销：`POST https://api.muirouter.com/oauth/revoke` body `{token, client_id, client_secret}`
- LLM / 余额：沿用现有 `Authorization: Bearer <access_token>`（OAuth token 兼容历史的 sk-gw PAT）

### 数据流

```
dashboard 或 app 点关联
  → website /api/muirouter/oauth/start?from=web|app[&app_state=...]
  → state 写 KV（5min TTL，value={userId, from, appState?}），302 跳 muirouter authorize
  → 用户授权 → muirouter 302 回 /api/muirouter/oauth/callback?code=...&state=...
  → callback：删 KV state → POST /oauth/token 换 token → encrypt → upsert muirouterLink
  → web: 302 /dashboard/muirouter?linked=1
    app: 302 muicv://muirouter-linked?app_state=...&ok=1，OS 唤起 Electron
```

### LLM 分流（packages/api/src/routes/llm.ts）

- muicv `tokenBalance.balance > 0` → 走 OPENAI_API_KEY，扣 muicv 余额
- 余额=0 + 有 muirouterLink → 解密 access_token（必要时 refresh）走 muirouter，**不**扣 muicv；客户端没传 model 时注入 muirouterLink.defaultModel
- 余额=0 + 无 link → 402 insufficient_balance

### Token 存储 / 状态共享

- **token 走 HSM**：`hsm.meathill.com` 提供信封加密 + 客户端密钥分离（X-HSM-Secret），
  `packages/shared/src/hsm-client.ts` 是封装。muicv 仓库不再做 HKDF / AES-GCM——
  原 `lib/crypto.ts` 已删除。同一个 HSM secret 在 website 和 api worker 各 wrangler
  secret put 一份才能互通。
- 状态单一来源：D1 `muirouterLink` → `/api/me` 把 muirouter 字段（email / defaultModel /
  balance / 更新时间）一起返回，dashboard 与 Electron app renderer 都从这里读，无轮询无 SSE。
- Electron deep link：扩展现有 `muicv://callback`（自动登录）模式，新增
  `muicv://muirouter-linked?app_state=...`，main 进程的 pendingMuirouter map 校验
  app_state 后推 `muirouter:linked` IPC 给 renderer，renderer 重拉 `/api/me`。

### 环境变量

需 wrangler secret put（website + api 各一份，值相同）：

- `MUIROUTER_OAUTH_CLIENT_SECRET` — muirouter 注册 client 时拿到的 secret
- `HSM_SECRET` — hsm.meathill.com 的 X-HSM-Secret

可选覆盖：`MUIROUTER_OAUTH_AUTHORIZE_URL` / `MUIROUTER_OAUTH_TOKEN_URL` /
`MUIROUTER_OAUTH_REVOKE_URL` / `MUIROUTER_OAUTH_CLIENT_ID` / `MUICV_BASE_URL` /
`HSM_BASE_URL`，联调可指向 mock。

## packages/shared 跨端展示常量

> 所有跨包的展示文案 / 格式化 / 价目表都进 `@muicv/shared`，禁止在 app / website 各写一份。

- **格式化**：`formatCents(cents, currency?)` 在 `src/format.ts`；webside SSR 与 Electron
  renderer 都从这里 import。日期 / 时间故意不放这里——SSR 输出必须确定性（避免
  hydration mismatch），各端按自己的需求硬格式化（website 用 `YYYY-MM-DD HH:mm`、
  app 用 `toLocaleString()`）。
- **会员档位 label**：`getPlanLabel(plan)` 在 `src/pricing.ts`，含 free/pro/max 三档
  + 空值兜底 + 未知 plan 透传。**禁止在 UI 组件里 hardcode `PLAN_LABEL` map**——
  以后增减档位只在 pricing.ts 改一处。
- **LLM 元数据**：`LLM_DISPLAY_META` / `SUPPORTED_LLM_MODELS` / `DEFAULT_LLM_MODEL`
  也在 `src/pricing.ts`，模型选择 UI / 计费 / API 校验都从这里读。

## 测试

- **node:test + 默认 ts 直接跑**（`node --test`）；不要引 vitest / jest，除非有强需求。
- `packages/shared` 覆盖核心工具：pricing（含 getPlanLabel）/ format / resume-sync /
  hsm-client / muirouter-oauth + smoke test，46 个 case。
- `packages/api` 用 Hono 的 `app.request()` 测路由，不需要 wrangler / miniflare；
  覆盖入口校验、CORS 白名单、api-key middleware 各分支（共 21 个 case）。
- `packages/app` 测纯逻辑 helper（chat-utils 等），不测 React 组件 / IPC —— 投入
  比回报大，留给手测和 dogfood。
- D1 binding 在测试里用极简 mock（`prepare/bind/run/first` 全部返回 stub）。

## 提交前跑 biome（pre-commit hook）

**约定：每次提交前必须跑 biome**，已用 git hook 固化，不依赖人记。

- 格式化走 **biome**（不是 prettier / eslint）。命令：
  - `pnpm run format` = `biome format --write`（只格式化）
  - `pnpm run lint` = `biome check`（格式化 + 检查，看全量基线）
  - `pnpm run lint:fix` = `biome check --write`（格式化 + 安全自动修复）
- **hook 位置 `.githooks/pre-commit`**，由 `package.json` 的 `prepare` 脚本设
  `git config core.hooksPath .githooks`（`pnpm install` 时自动生效）。
  没有用 husky —— 一个 40 行的 sh 脚本够了，少一个依赖。
- hook 行为：只对**本次暂存的源码文件**（ts/tsx/js/jsx/mjs/cjs/json/css）跑
  `biome check --write`，改完自动重新 `git add`。只处理暂存文件是因为全仓 500+
  文件每次提交都扫太慢；未改动的文件在各自引入时已被规整过。
- **hook 刻意不阻断提交**：仓库有 127 个历史遗留、不可自动修复的 lint
  （`noArrayIndexKey` 49 个 / `useExhaustiveDependencies` 13 个 / a11y 等，
  分布在 52 个文件），拿 biome 的退出码卡提交会让这些文件永远提不了。
  所以 hook 只做「自动修复 + 打印提示」，修不了的留给人工。要收紧成阻断，
  得先把这些存量清了（`pnpm run lint:fix` 只能修掉其中可安全修复的一部分，
  其余需要重构）。
- 手动全仓规整一次：`pnpm run lint:fix`（2026-09 已跑过一次，提交 `5dee4c2`）。
- 绕开 hook（不推荐）：`git commit --no-verify`。

## packages/app macOS 签名 + 公证

> 不签 → 用户下载装完直接「已损坏」打不开。本节记录决策依据 + 凭据怎么拿、放哪、丢了怎么办。
> 实际配置见 `packages/app/electron-builder.yml` mac 段、`packages/app/build/entitlements.mac.plist`、
> `.github/workflows/release.yml` mac job。

- **三件套缺一不可**：codesign（盖章）→ notarize（让 Apple 扫描）→ staple（票据钉到 .app）。
  electron-builder 26 把 staple 自动做掉，前两步靠环境变量驱动。
- **identity 字段陷阱**：`mac.identity: null` 是「显式跳过签名」，**不是**「自动选」。
  要 auto-discover 必须**整个字段不存在**。多个 Developer ID Application 共存时，
  用 `CSC_NAME` 环境变量或 `identity: "Developer ID Application: 名字 (TEAMID)"` 显式锁定。
- **证书选 Developer ID Application**，不是 Mac App Distribution（那是上架 App Store 的）。
  Xcode → Settings → Accounts → Manage Certificates → + 一键装到 login keychain。
  `security find-identity -v -p codesigning` 能看到就行。
- **公证鉴权用 App Store Connect API Key**（不用 Apple ID + app-specific password）：
  CI 友好、不绑个人 2FA、可独立轮换。在 App Store Connect → Users and Access →
  Integrations → Team Keys 生成，角色 Developer 即够。**.p8 只能下载一次**，丢了重新生成。
- **凭据备份**：证书 .p12（导出时设密码）+ API Key .p8 都进密码管理器（1Password / 同等）。
  本机 keychain 重装系统会丢，没备份就只能重申请。
- **GitHub Secrets**（5 条）：`CSC_LINK`（.p12 base64）/ `CSC_KEY_PASSWORD` /
  `APPLE_API_KEY_BASE64`（.p8 base64）/ `APPLE_API_KEY_ID` / `APPLE_API_ISSUER`。
  Team ID 写死在 yml 里不算敏感。
- **hardenedRuntime + entitlements 的关系**：开 hardenedRuntime 是公证硬性要求，
  但开了之后默认禁用 JIT / 未签名可执行内存 / dyld 环境变量 / 网络访问。entitlements
  必须显式声明 `allow-jit` / `allow-unsigned-executable-memory` /
  `allow-dyld-environment-variables` / `network.client` 这 4 条，缺一项 Electron 启动直接 crash。
- **改 entitlements 必须重新公证**：ticket 是和文件哈希绑定的，entitlements 一变 hash 变，
  老 ticket 就废了。
- **本地手动验证**：
  ```bash
  codesign --verify --deep --strict --verbose=2 release/mac-arm64/Mui简历.app
  spctl -a -vvv -t install release/mac-arm64/Mui简历.app
  # 期望：accepted, source=Notarized Developer ID
  ```
- **公证排队**：第一次 5-15 分钟，之后通常 1-3 分钟。出错用
  `xcrun notarytool log <submission-id> --key ... --key-id ... --issuer ...` 查具体原因，
  也可以看 `~/Library/Logs/electron-builder/notarize.log`。
- **常见踩坑**：证书类型选错（Mac App Distribution 不能用于 dmg）/ entitlements 漏 JIT
  导致启动 crash / hardenedRuntime 没开导致公证拒绝 / dmg 复制 .app 后没 staple
  导致离线打开仍报错（electron-builder 自动 staple，不用手动）。
- **Windows / Linux**：Linux AppImage 不需要签名；Windows SmartScreen 是软警告（用户能点
  Run anyway），Authenticode 证书要钱（OV 便宜但要养信誉，EV 贵但秒生效），暂未做。

## LLM 供给切换：OpenCode Go 包月 + GPT-5.6 升级档（2026-08-27）

**决策背景**：早期没用户量，按 token 付 Xiaomi/OpenAI 费用扛不住；OpenCode Go（opencode.ai 的
$10/月订阅）提供 ~25 个开源模型的 OpenAI 兼容 REST（`https://opencode.ai/zen/go/v1`），包月内
边际成本≈0。量大之后计划切 **zen** 按量付费——切回时只需改 `shared/pricing.ts` 各条的
`upstream` + `api/routes/llm.ts` 的 base/key 映射，路由本身已是表驱动，没有前缀 if。

**模型换代（2026-09-23）：默认切 `mimo-v2.6-flash`，GPT-6 Sol/Luna 上线，Terra 下线**

- 新默认 `mimo-v2.6-flash`@oc-go：原生全模态（图文音视频直通），1M context，工具调用强。价格沿用 v2.5（input 0.008 / output 0.2，显示价 $0.08/$2.00 不变），用户无感。`supportsVision` 从 false 改为 true（v2.5 怕误发图炸 400 而关闭，v2.6 官方确认原生 vision）。
- `deepseek-v4.1-flash` 保留为包月主力（唯一保留的旧模型）。
- GPT-6（2026-09-22 发布）：`gpt-6-sol`（$2/$0.2/$10，rate 0.2/0.02/1.0）、`gpt-6-luna`（$0.10/$0.01/$0.50，rate 0.01/0.001/0.05），永久价。GPT-6 家族无 Terra，老 `gpt-5.6-terra` alias 并入 `gpt-6-sol`（价格最接近）。
- alias 全链：`mimo-v2.5(-pro)`→`mimo-v2.6-flash`；`gpt-5.6-luna`→`gpt-6-luna`；`gpt-5.6-sol/terra`、`gpt-5.4/5.5`→`gpt-6-sol`。老用户不断流。
- reasoning effort 仍是 UI 四档（low~xhigh，默认 xhigh），GPT-6 原生支持 none~max，我方四档是其子集，无需扩档。
- `getModelBudget` 不变：mimo 系 800k，其余 204.8k（GPT-6 虽有 1M context，仍按 256k 保守值防历史爆炸）。

**最终矩阵**：默认文本 `deepseek-v4.1-flash`@oc-go（原生多模态，2026-09 从 `deepseek-v4-flash`
升级）；语音理解 `mimo-v2.5`@oc-go（同 id 从 Xiaomi
直连迁过来，价格不变用户无感）；升级档 `gpt-5.6-luna/terra/sol`@OpenAI（luna 是便宜档
$0.2/$1.2 per 1M、terra $2/$12、sol 官方校准 $4/$20）。下架 gpt-5.4 /
mimo-v2.5-pro：normalizeModel 静默回退新默认。Xiaomi completion 直连退役，MIMO_API_KEY 只剩
TTS 在用。

**DeepSeek V4.1 Flash 升级（2026-09）**：4.1 起原生多模态，于是：
- 移除 `deepseek-v4-flash-vision-exp` 视觉实验变体——不再需要"带图时自动切 vision 模型"
  的分流逻辑（原先在 `runtime.ts` 按 `hasImage` 判断并改写 `effectiveModel`）。
- `deepseek-v4-flash` 与 `deepseek-v4-flash-vision-exp` 都进 `LLM_MODEL_ALIASES` 重定向到
  4.1。后者必须保留：**旧版本 app（≤0.5.8）带图时会主动发 vision-exp**，不加 alias 会 400。
- 计费沿用 v4-flash 现价（input 0.02 / cached 0.002 / output 0.08）。
- 模型"能否收图"的能力门 `modelSupportsVision` 保留——mimo 系仍不收图，只删了按输入内容
  分流，不是删能力门。

**OpenCode Go 关键事实 / 风险备忘**：
- 订阅是**单人共享配额**（月上限 $60 / 5h 窗口 $12）：当多租户生产上游会被打爆出 429；
  个人订阅条款用于商业产品也有灰度——这是**过渡方案**，量起来必须切 zen。
- 目录只承诺 `chat/completions`；`/v1/responses` worker 侧直接 400（unsupported_endpoint）。
  deepseek/mimo 系走 chat_completions + reasoning_content 双向透传层，逻辑复用现状。
- Secret：`OPENCODE_GO_API_KEY`（wrangler secret put）。缺失时 API 返回
  `{error:'opencode-go-key-missing'}`。
- 必须携带 `x-opencode-session`（缺失时报 400 "Request is missing x-opencode-session and cannot be routed efficiently"）：用于后端节点会话亲和与 prompt cache 路由。app 与 api 两端均已注入稳定的会话 ID 及定制 `User-Agent`。
- **落表前必须实探 model id**（2026-09 踩坑）：上游目录里的 id 是唯一真值，不能凭版本号推断。
  曾把默认模型改成 `deepseek-v4.1-flash`——当时该 id 在 OpenCode Go 上**不存在**，导致默认路径
  请求上游失败。这类不存在的 id 不需要专门加别名兜底：`normalizeModel` 对表外 id 会静默
  回落到 `DEFAULT_LLM_MODEL`，写盘的老配置读出来就自愈了。
  `scripts/opencode-go-probe.ts` 会拉真实 model 清单校验，新增 / 改默认模型前先跑它
  （需 `OPENCODE_GO_API_KEY`），别再跳过。
  （2026-09 复查：该 id 上游已上线且多模态，遂正式落表为默认。）

**GPT-6 家族（Sol/Luna，2026-09-22 发布；5.6 已下线）**：OpenAI 三档变体 Astra/Sol/Luna 中的后两者，走 `/v1/responses`，
reasoning.effort 支持 none..max 六级；平台 UI 只放 low/medium/high/xhigh（默认 xhigh）。
effort 由 app 端 Agent.modelSettings.providerData 注入：responses 用 `reasoning:{effort}`、
chat_completions 用平铺 `reasoning_effort`，字段名随 `configureLlmForRun` 选定的端点形态切换。
>272K input tokens 有 2×/1.5× 加价规则，长上下文注意。

**TTS（新增 /audio/tts）**：小米 MiMo-V2.5-TTS 系列**限时免费**（含 tts / voicedesign /
voiceclone 三款），走 OpenAI 兼容 chat/completions 形状而非 /audio/speech：
assistant 角色放待合成文本（放 user 不合成）、user 角色可选风格指令、`audio:{format:'wav',voice}`、
非流式响应 base64 在 `choices[0].message.audio.data`。限免到期要迁移（届时校准
TTS_RATE_PER_CHAR），账单在小米控制台可看。

**语音链路全景**（别混淆）：STT 转写 = Cloudflare Workers AI Whisper（AI binding，不花钱在
大模型侧）；对话音频直通 = mimo-v2.6-flash@oc-go input_audio（前代 v2.5 由 scripts/verify-mimo-audio.ts 验过，v2.6 官方全模态延续）；
朗读/TTS = /audio/tts → 小米直连。

**已知技术债**：packages/api 没有 typecheck script，手跑 `tsc --noEmit` 有 ~38 行存量报错
（llm-usage.ts / transcribe.ts / content.ts 的 exactOptionalPropertyTypes 类问题），本次只保证
改动文件零报错，欠账待还。

**已修（2026-09）：price 表下沉 `@muicv/shared`，两端不再漂移。**
`packages/api/src/routes/me.ts` 原先自维护 `env.STRIPE_PRICE_*` 反查 plan，与 website 的
price ID 代际不同步（Pro 月付 `price_1TRwa8…` vs `price_1TUjjp…`，Pro 年付同样对不上），
后果是 **Pro 订阅用户在桌面 app 里被显示成免费版**（Max 恰好一致所以没暴露）。
现在 price 注册表 + 反查函数放在 `packages/shared/src/stripe-prices.ts`，
website（`lib/stripe.ts` 只留需要 Stripe SDK / D1 的部分）与 api 都 import 同一份；
`packages/api/wrangler.jsonc` 的 4 个 env var 与 `worker-configuration.d.ts` 对应项已删。
api 单测补了 Pro 年付的回归用例（曾显示 free）。
教训：**同一份外部标识符不要在两处各存一份**——跨 worker 的常量要下沉到 shared，
否则代际更新时必然漏掉一边，而且症状是静默降级、很难发现。

**支付通道的现实约束（2026-09 学员反馈）**：中国大陆用户常见「只有银联信用卡」，
银联卡在 Stripe 上**通常既不能开人民币订阅（本账户不支持 CNY recurring），也完不成美元订阅扣款**
（银联卡对跨境美元定期扣款授权失败率高）。所以对国内用户的正确引导是
**买一次性补充包**（¥ 通道开微信 / 支付宝 / 国际卡，这几种都能付），而不是「切美元订阅」。
定价页 ¥ 视图提示、dashboard 文案、9 语言 FAQ 都按这个口径写；加了「支持哪些支付方式」FAQ。
如果你确认某类银联卡可用，需要再校准这段文案。

## 统一岗位频道 /jobs（2026-10-20）

- **合并而非新开频道**：采集岗位（CMS `opportunities`）与社区 JD（D1 `communityJd`）在 /jobs 同屏，来源 tab 区分；路由不变。
- **数据源**：Greenhouse / Lever / Ashby 公开岗位板（种子公司在 `packages/api/src/cron/seeds.ts`）+ Remotive。国内招聘站无合规 API，靠扩展贡献补位。
  - Remotive 条款：必须 via 署名并链回原帖、不得转投 Google Jobs 等 → 详情页 noindex、不进 sitemap、不输出 JobPosting 结构化数据（所有第三方岗位板同此处理）。
- **「近期」口径**：只收 `postedAt` 在 30 天内的岗位，超过即 expired（Ashby 部分常年挂着的岗位 publishedAt 很老，会被丢弃——有意为之）。
- **去重**：采集内按 `dedupeKey`（source:sourceId）幂等 + `fingerprint`（company+title 归一化）跨来源去重；与社区 JD 只在**展示层**按 company+title / url 折叠（`dedupeListings`），社区贡献照常入库、照常发积分。
- **搜索**：`GET|POST /jobs/search` 是唯一入口（桌面端 `search_jobs` 工具、website、扩展 / skill 都走它，客户端用 shared `searchJobs`）。
  - 过滤 = 显式参数 ∪ 规则从 q 抽取（workplace/region/category/country/utcOffset，`detectQueryFilters`）。
    响应带 `detected`，客户端把自动识别的条件显示为可删除标签，删除即带 `ignore=<key>` 重搜。
  - 向量 id：`collected:<cmsId>` / `community:<uuid>`。社区 JD 入库后 `waitUntil` 异步索引；采集岗位由 cron 索引，过期时删向量。
- **混合检索（2026-10-20 二期）**：
  - **jobIndex 镜像（api D1 表）**：两类岗位统一镜像进 D1 `jobIndex`（`packages/website/migrations/0018`），检索只查这一张表。
    为什么不在搜索时查 CMS：CMS 只能 REST + like，做不了 FTS / 结构化数组过滤 / 跨来源一次排序；镜像后一条 SQL 搞定，
    CMS 仍是编辑真源（cron 写 CMS 后同步 upsert jobIndex；过期置 `expired`；社区 JD 入库即 upsert、隐藏即置 `hidden`）。
    代价是两处数据，`POST /jobs/reindex` + backfill 脚本可随时从源头重建。
  - 三路召回、SQL 硬约束两路都套：① FTS5 `trigram`（中英文子串模糊、容忍拼写错误的部分匹配，bm25 加权 title>company>location>body）；
    ② 短于 3 字符的词（trigram 无法索引，如「Go」）走 LIKE；③ bge-m3 + Vectorize（metadata 只下推 kind/workplace/category/postedAt，
    国家 / 大区 / 时区在 hydrate 时由 `buildFilterSql` 过滤，保持向量原排序）。三路按 RRF（k=60）融合 → 展示层去重 → 分页。
    向量挂了 mode=`keyword`；没有 q 时 mode=`latest`。
  - FTS 是 external-content 表 + insert/delete/update 触发器；upsert 必须用 `ON CONFLICT DO UPDATE`（`REPLACE` 会删行，触发器链易错）。
  - 列表列存成 `,US,CA,` 包裹形式，用 `LIKE '%,CN,%'` 匹配；`isOpenLocation=1` 表示未声明限制。
- **垂直 / 远程岗位板（2026-10-20）**：每天 2 次（cron `0 0,12 * * *` = 北京 08:00 / 20:00，`event.cron` 分组），
  适配器在 `packages/api/src/cron/sources/niche.ts`，清单在 `seeds.ts` `NICHE_FEEDS`。一律用官方 feed，不抓页面。
  | 来源 | feed | 条款 / robots 结论 |
  |---|---|---|
  | VueJobs | `https://vuejobs.com/feed`（RSS） | ToS 无转载限制，robots 允许；注明来源 + 链回 |
  | LaraJobs | `https://larajobs.com/feed`（RSS，`job:*` 扩展） | 无 ToS 限制，robots 全放行；注明来源 + 链回 |
  | We Work Remotely | `/categories/remote-programming-jobs.rss`、`remote-devops-sysadmin-jobs.rss` | ToS 未限制 RSS 使用，robots 允许；注明来源 + 链回 |
  | Remote OK | `https://remoteok.com/api` | API 条款：**必须链回原帖（不带 nofollow）并写明 Remote OK**，不得用 logo |
  | Himalayas | `https://himalayas.app/jobs/api`（每页 20，cursor，取 3 页） | API 文档明确允许回填其他岗位板，须链回 + 注明来源 |
  | Jobicy | `https://jobicy.com/api/v2/remote-jobs?industry=engineering` | Fair use：保留原帖 URL、注明 Jobicy、申请跳原帖 |
  | Golangprojects | `https://www.golangprojects.com/rss.xml` | robots 仅屏蔽特定爬虫；无 ToS 限制；注明来源 + 链回 |
  - **Supabase（Ashby，`api.ashbyhq.com/posting-api/job-board/supabase`）**：移出 6 小时 ATS 组、放进每天 2 次组。
    岗位常年挂着（2026-10 实测 52 个，30 天内仅 14 个），故该种子 `maxAgeDays: 365`：不参与全局 30 天过期，
    改为「超过 365 天或已从岗位板下架」才过期（仅在本轮成功抓到其岗位板时执行，抓取失败不误杀）。
    其他公司要同样处理时给种子加 `maxAgeDays` 即可。
  - **跳过**：ElixirJobs（RSS 无公司字段，无法入库）、RustJobs.dev（feed 返回 429 反爬）、React Jobs Board / JS Remotely（无官方 feed，只能抓页面）、python.org Jobs（站点内容归 PSF 版权、无转载授权）。
  - 共同做法：applyUrl 用岗位板原帖（不直链雇主 ATS），「via 来源」署名；**只有雇主 ATS（Greenhouse / Lever / Ashby）可被收录**，
    第三方岗位板详情页一律 noindex、不进 sitemap（`isIndexableSource`）。外链 `rel="noreferrer"`，不加 nofollow。
  - 同一岗位在多个岗位板 / ATS 出现时，按 fingerprint（公司 + 标题）跨来源去重，先到先得。
- **采集并入 api worker（2026-10-20）**：不单独部署 cron worker，api 的 `export default { fetch, scheduled }` 每 6 小时跑
  `src/cron`。api 已有 D1 / Vectorize / AI 绑定，jobIndex 与向量直接写；CMS 仍经 REST + `CMS_API_KEY` 写（CMS 是编辑真源）。
  子请求预算由 `JOBS_SUBREQUEST_BUDGET` 控制（fetch 与 binding 调用都保守计入），超出部分留到下一轮。
- **地域限制**（`shared/jobs/location.ts`）：结构化字段 `workplace`、`allowedCountries[]`（ISO）、`allowedRegions[]`
  （worldwide/americas/north-america/latam/emea/europe/apac）、`utcOffsetMin/Max`、`officeLocations`。
  - 来源：ATS 的 location / offices / secondaryLocations / allLocations / workplaceType / isRemote + Remotive `candidate_required_location`
    + JD 正文「限制句」规则（must be based in / authorized to work in / within N hours of CET …）。
  - 规则没解析出、但正文有限制句的 remote 岗 → cron 调 Workers AI 小模型兜底（`llm-location.ts`），输出逐项校验。
    每个岗位只在首次入库处理一次（dedupeKey 幂等），所以不另设缓存；单次运行 ≤20 次。
  - 语义：坐班 / 混合岗的 `allowedCountries` = 办公地所在国；remote 岗 = 候选人须在的国家。**未声明 = 开放**（宁可多给，详情页提醒以原文为准）。
  - 资格判定：求职者 country 命中 allowedCountries，或其所属大区命中 allowedRegions，或岗位开放；
    时区按区间重叠（只给 country 时用该国时区范围）。「我在中国，UTC+8」会排掉仅限美国的远程岗。
- **限流**：Workers Rate Limiting，带 key 按 userId 60/min，匿名按 IP 20/min。website 走 service binding 时没有 `cf-connecting-ip`，此时才信任 `x-muicv-client-ip`（公网请求 CF 必注入 cf-connecting-ip，伪造不了）。
