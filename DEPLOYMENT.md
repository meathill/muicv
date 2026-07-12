# DEPLOYMENT

最后更新：2026-05-16

Mui简历的**运行时代码**（service deploy 的部分）只有这几个独立部署单元：

| 单元 | 技术栈 | 用途 | 状态 |
|---|---|---|---|
| [`packages/api`](./packages/api) | Cloudflare Worker + Browser Rendering + D1 + KV | `/render` PDF 渲染、`/jobs/fetch` JD 抓取、`/waitlist` 收邮箱 | ✅ MVP 可部署 |
| [`packages/website`](./packages/website) | Next.js 16 + OpenNext + Cloudflare Worker | Web app 本体：landing 页 + dashboard + `/r/render/[token]` 简历渲染 SSR | ✅ MVP 可部署 |
| [`packages/cms`](./packages/cms) | Payload CMS + Next.js 16 + OpenNext + D1 + R2 | 内容后台：skill 目录、求职博文、更新日志 | 🟡 脚手架已落地，复用现有 D1/R2 |

Skill 本身（`skills/*/`）**不是**运行时产物——不需要部署，用户通过 `npx skills add meathill/muicv` 直接从公共仓库拉。

`packages/app` 是 electron 桌面端，**不**走 Cloudflare service deploy；它通过
GitHub Releases 分发 .dmg / .zip 给用户下载。详见下文「桌面 app 发布」一节。

---

## 前置准备

- **Cloudflare 账号**（Workers Paid Plan，`$5/月起`；**Browser Rendering 仅付费可用**）
- **Browser Rendering 已开通**：Cloudflare Dashboard → Workers & Pages → Browser Rendering，
  确认账号已启用。免费档每天 10 分钟可能不够生产
- **wrangler CLI**：已在 `devDependencies` 里（`wrangler@4.54+`），走 `pnpm` 调即可
- Cloudflare 账号 ID：已硬编码在各 `wrangler.jsonc` 里（`account_id: fdc63eeea83ae8f5234357308b9a638b`）。换账号时记得同步改
- **域名**：生产用 `muicv.com` 作为产品根域：
  - `muicv.com` / `www.muicv.com` — landing + dashboard + 简历渲染 SSR（`packages/website`）
  - `api.muicv.com` — API（`packages/api`）

  开发阶段不分 staging，直接迭代 prod。改完 deploy 再回归。

---

## packages/api（PDF 渲染 API）

### 架构

```
skill → POST https://<api-host>/<path>
         ↓
       Hono Worker (src/app.ts)
         ├─ POST /render      ↓
         │     1. 写一次性 token 到 MUICV_KV (5min TTL)
         │     2. puppeteer.launch(env.BROWSER)  // Cloudflare Browser Rendering
         │     3. page.goto(${RENDER_BASE_URL}/r/render/${token})
         │           └─ packages/website 的 SSR 路由读 KV → React 模板渲染 HTML
         │     4. await document.fonts.ready
         │     5. page.pdf({ format: 'A4' })
         │     6. 删 KV、关 browser
         │     ↓ 返回 PDF bytes
         │
         ├─ POST /jobs/fetch  ↓
         │     1. puppeteer.goto(jdUrl)
         │     2. addScriptTag 注入 Readability + turndown 源码
         │     3. page.evaluate：Readability.parse → turndown.turndown
         │     ↓ 返回 markdown + meta JSON
         │
         ├─ POST /waitlist    → D1 (waitlist 表)
         ├─ GET  /me          → D1 (user 表)
         └─ ALL  /llm/v1/*    → muirouter 反代
```

历史：曾经是 `Worker → DurableObject(BrowserContainer) → Cloudflare Container (Node + Chromium + Puppeteer)`。2026-04 切到 Browser Rendering，砍掉 Dockerfile + Container + DO，详见 [DEV_NOTE.md](./DEV_NOTE.md#cloudflare-browser-renderingpackagesapi)。

中文字体不再来自 container 系统包，改为 packages/website 的简历模板用 React `<link>` 加载 Google Fonts 的 Noto Sans SC（`puppeteer.goto` 后等 `document.fonts.ready`）。

### 本地开发

**前置**：

- packages/website 已部署到 muicv.com（puppeteer.goto 必须能访问公网 URL；localhost 够不到）
- `MUICV_KV` namespace 已建好，两边 wrangler.jsonc 的 `kv_namespaces[0].id` 完全一致

```bash
pnpm install

# Browser Rendering 跑在 Cloudflare 浏览器集群，本地 workerd 没有它，必须 --remote
pnpm --filter @muicv/api dev   # 等同于 wrangler dev --remote
```

测试：

```bash
curl -X POST http://localhost:8787/render \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# 张三\n\n资深前端工程师 · 北京\n\n## Summary\n\n一段测试简历。"}' \
  --output /tmp/test.pdf
open /tmp/test.pdf

curl -X POST http://localhost:8787/jobs/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://jobs.ashbyhq.com/anthropic"}' | jq .
```

调试 SSR 渲染（不依赖 puppeteer）：手动 `wrangler kv key put resume:test '{"markdown":"# Hi","template":"default"}' --binding MUICV_KV`，然后浏览器打开 `https://muicv.com/r/render/test` 看效果。

### 部署到 Cloudflare

**首次部署前准备**：

```bash
# 1. 建 KV namespace（prod 一个就够）
pnpm --filter @muicv/api exec wrangler kv namespace create MUICV_KV
# 把返回的 id 同时填到：
#   - packages/api/wrangler.jsonc 的 kv_namespaces[0].id
#   - packages/website/wrangler.jsonc 的 kv_namespaces[0].id（必须**完全一致**）

# 2. 建 D1 数据库（如果还没建过）
pnpm --filter @muicv/api exec wrangler d1 create muicv-api
# 把返回的 database_id 填到 packages/api/wrangler.jsonc 的 d1_databases[0].database_id

# 3. 把本地 migration 推到生产 D1
pnpm --filter @muicv/api db:migrate
```

本地 dev 环境同步 schema：

```bash
pnpm --filter @muicv/api db:migrate:local
```

其他常用命令：

| 脚本 | 作用 |
|---|---|
| `db:migrate` | apply 所有未应用的 migration 到生产 D1 |
| `db:migrate:local` | 同上，但作用于本地 wrangler dev 的 D1 |
| `db:migrate:list` | 列出生产 D1 已应用的 migration |
| `db:console -- "SELECT * FROM waitlist"` | 在生产 D1 执行任意 SQL（注意 `--` 后是参数） |
| `db:console:local -- "..."` | 同上，本地 D1 |

**部署节奏（必须按序）**：

```bash
# 1. website 先发：api 那边 puppeteer.goto 依赖 muicv.com 的 /r/render/[token] 已上线
pnpm --filter @muicv/website deploy

# 2. api 后发：第一次发版会触发 v2 deleted_classes 把 BrowserContainer DO 卸掉
pnpm --filter @muicv/api exec wrangler deploy

# 3. e2e 验证（中文字体、JD 抓取）
curl -X POST https://api.muicv.com/render \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# 张三\n\n上海 · 高级前端\n\n## Summary\n\n一段测试。"}' \
  --output /tmp/test.pdf
pdftotext /tmp/test.pdf -
```

**绑定域名**：

`packages/api/wrangler.jsonc` 已有 `routes: [{ "pattern": "api.muicv.com/*", "zone_name": "muicv.com" }]`，前提是 Cloudflare DNS 里 `api` 已建 proxied 记录。

`packages/website/wrangler.jsonc` 的生产 routes 仍是注释状态，启用前确认 muicv.com / www.muicv.com 的 DNS。

**速率限制**（MVP 建议）：

在 Cloudflare Dashboard → 该 Worker → WAF / Rate Limiting 配：

- `/render`：每 IP 每分钟 ≤ 3 次
- `/jobs/fetch`：每 IP 每分钟 ≤ 10 次
- `/waitlist`：每 IP 每分钟 ≤ 3 次（防刷）

代码层没做这些，靠 Cloudflare 层更便宜、规则可随时调。

### 环境变量

| 名称 | 类型 | 来源 | 说明 |
|---|---|---|---|
| `RENDER_BASE_URL` | var | wrangler.jsonc | packages/website 的公网 base（`https://muicv.com`） |
| `BETTER_AUTH_SECRET` | secret | `wrangler secret put` | 与 packages/website 同值 |
| `OPENAI_API_KEY` | secret | `wrangler secret put` | 平台 OpenAI key（model 为 `gpt-*` 时使用） |
| `MIMO_API_KEY` | secret | `wrangler secret put` | 平台 Xiaomi Mimo key（model 为 `mimo-*` 时使用），上游 `https://token-plan-cn.xiaomimimo.com/v1` |

> 平台路径（余额 > 0）只接受 `gpt-5.5` / `gpt-5.4` / `mimo-v2.5-pro` / `mimo-v2.5` 四个 model，
> 表外（如老的 `gpt-4o-mini`）会拿到 400 `unsupported_model`。详见 `packages/shared/src/pricing.ts` 的 `LLM_PRICING`。

### 添加新简历模板

模板从 2026-04 起改为 React 组件，**位置在 packages/website**：

1. `packages/website/app/r/render/[token]/templates/<name>.tsx` 新建组件，签名同 `default.tsx`
2. 在 `templates/registry.ts` 的 `templates` map 注册并加到 `TemplateName` 联合类型
3. 重新部署 packages/website
4. Skill 调 `/render` 时传 `template: "<name>"`

---

## packages/website（Web app 本体）

Worker name `muicv-web`。承载：

- `app/(marketing)/page.tsx` — landing + waitlist UI
- `app/(auth)/sign-in` `/sign-up` — Better Auth 邮箱密码登录注册
- `app/(dashboard)/dashboard` — 登录后看到的占位页（M3+ 接入余额 / API key）
- `app/api/auth/[...all]/route.ts` — Better Auth catch-all

### 现有绑定（声明在 `wrangler.jsonc`）

- D1：`MUICV_DB`，database `muicv`（和 `packages/api` 共用同一个 D1）
- KV：`MUICV_KV`
- R2：`NEXT_INC_CACHE_R2_BUCKET`（bucket `site-cache`）—— OpenNext ISR 缓存
- Self service binding：`WORKER_SELF_REFERENCE`
- Vars：`BETTER_AUTH_URL`（生产 `https://muicv.com`，本地 `.dev.vars` 改）

### Secrets（必须 put）

```bash
# 生成 32+ 字节 secret
SECRET=$(openssl rand -base64 32)

# 1) website 用它给 Better Auth 签 session + AES-GCM 加密 muirouter key
echo -n "$SECRET" | pnpm --filter @muicv/website exec wrangler secret put BETTER_AUTH_SECRET

# 2) api 用同一个值解密 muirouter key（/llm/* 反向代理时要用）
echo -n "$SECRET" | pnpm --filter @muicv/api exec wrangler secret put BETTER_AUTH_SECRET
```

**两个 worker 的 secret 必须是同一个值**，否则 api 解不开 website 加密的 muirouter key，桌面 app 调 /llm/* 会拿到 `decrypt-failed` 错。

本地 dev 需要在 `packages/website/.dev.vars`（gitignored）加：

```
BETTER_AUTH_SECRET=<同上的随机串>
BETTER_AUTH_URL=http://localhost:3070

# GitHub OAuth（可选，下文）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### GitHub OAuth（可选）

注册页和登录页会**自动检测** secret 是否配齐——配齐了显示"用 GitHub 登录"按钮，没配就只显示邮箱密码。

**步骤**：

1. 在 https://github.com/settings/developers → New OAuth App 创建：
   - Application name: `Mui简历`
   - Homepage URL: `https://muicv.com`
   - Authorization callback URL: `https://muicv.com/api/auth/callback/github`
2. 拿到 **Client ID** 和 **Client secret**
3. 把 Client ID 填到 `packages/website/wrangler.jsonc` 的 `vars.GITHUB_CLIENT_ID`（公开，可入 git）
4. Client secret 用 secret 命令存：
   ```bash
   pnpm --filter @muicv/website exec wrangler secret put GITHUB_CLIENT_SECRET
   ```
5. `pnpm --filter @muicv/website deploy`

**本地 dev** 需要单独建一个 GitHub OAuth App（callback URL `http://localhost:3070/api/auth/callback/github`），把 client id / secret 填到 `.dev.vars`。

### 数据库 migration

`packages/website` 的 migrations 是 Better Auth schema（`0002_better_auth.sql`）。
和 `packages/api/migrations/0001_waitlist.sql` 共用同一个 D1（database name `muicv`），
编号已分开：api = 0001，website = 0002 起。

```bash
# 部署前推 schema 到生产 D1
pnpm --filter @muicv/website exec wrangler d1 migrations apply muicv --remote

# 本地 dev D1
pnpm --filter @muicv/website exec wrangler d1 migrations apply muicv --local
```

> **0011_scale_tokens_to_micro.sql**（2026-05）：把 tokenBalance 和 tokenLedger 的数值列
> ×10_000，进入 μtoken 内部单位（1 显示 token = 10_000 μ）。配合新的按 model 分价计费表。
> **代码上线和 migration 必须同次部署**——旧代码看到 ×1e4 的数值会显示错乱、扣费翻倍。
> CI 走 `wrangler d1 migrations apply`，无回滚路径，先 `--local` apply 后核对一行 `SELECT
> userId, balance FROM tokenBalance LIMIT 1` 再发生产。

### 本地开发

```bash
# 纯 Next.js dev（最快，但不走 Worker 环境）
pnpm --filter @muicv/website dev

# OpenNext / Wrangler 本地预览（最贴近生产）
pnpm --filter @muicv/website dev:cf
```

### 部署

首次部署前在 Cloudflare DNS 给 `muicv.com` 和 `www.muicv.com` 加 proxied 记录指向本 Worker，然后解开 `wrangler.jsonc` 里 routes 节的注释。

```bash
pnpm --filter @muicv/website cf:build
pnpm --filter @muicv/website cf:deploy
```

### Stripe（M4：付费 token 钱包）

我们用一个统一的 token 钱包（`tokenBalance` 表）+ Stripe 月卡订阅 + 一次性补充包付款。
所有 Stripe 通信代码只放 `packages/website`（webhook / checkout / portal）。
api worker 只读 token 余额、写流水，零 stripe 依赖。

#### 一次性建好 Stripe 后台

1. 注册 [Stripe](https://dashboard.stripe.com)（个人或企业，先用 **test mode**）
2. **Products → 创建 4 个 product**：
   - "Mui Pro 月卡"：recurring monthly，金额对齐 `SUBSCRIPTION_PLANS.pro.priceCnyDisplay`（默认 ¥30）
   - "Mui Max 月卡"：recurring monthly，对齐 `SUBSCRIPTION_PLANS.max.priceCnyDisplay`（¥98）
   - "Mui 补充包 small"：one-time，10K tokens（¥10）
   - "Mui 补充包 medium"：one-time，35K tokens（¥30）
   - "Mui 补充包 large"：one-time，130K tokens（¥100）
3. 每个 product 各有一个 `price_xxx` 内部 ID，记下来
4. **Customer Portal → Settings**：开启 cancel subscription / switch plan / update payment method / view invoices
5. **Developers → API keys**：拿 `sk_test_...`
6. **Developers → Webhooks → Add endpoint** `https://muicv.com/api/stripe/webhook`，选事件：
   - `checkout.session.completed`
   - `customer.subscription.created` / `updated` / `deleted`
   - `invoice.paid` / `invoice.payment_failed`
   - 创建后 **Reveal signing secret** 拿 `whsec_test_...`

#### wrangler 配置（生产）

```bash
# Stripe secret key（test 阶段用 sk_test_，跑稳后切 sk_live_）
echo -n "sk_test_xxxxxxxxxxxxxxxx" | pnpm --filter @muicv/website exec wrangler secret put STRIPE_SECRET_KEY

# Stripe webhook secret（每次切 mode 都要重新拿 + 重发）
echo -n "whsec_test_xxxxxxxxxxxxx" | pnpm --filter @muicv/website exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

把 `packages/website/wrangler.jsonc` 的 `vars.STRIPE_PRICE_*` 全改成上面记下的 5 个 price ID（这些是公开标识符，可以入 git；切 live mode 时改成 live price ID）。

#### 本地 dev

```ini
# packages/website/.dev.vars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_local_...   # 由 stripe CLI listen 给出，见下
```

```bash
# 一个 terminal：跑 wrangler dev
pnpm --filter @muicv/website dev:cf

# 另一个 terminal：转发 Stripe webhook 到本地
stripe login
stripe listen --forward-to http://localhost:8788/api/stripe/webhook
# 输出会有 "Ready! ... whsec_xxx" —— 把这个 whsec 写到 .dev.vars 的 STRIPE_WEBHOOK_SECRET
```

#### 切到 live mode（test 跑稳后）

1. Stripe Dashboard 右上切到 live mode
2. 重建 4 个 product / 5 个 price（test 和 live 数据完全隔离）
3. 改 `wrangler.jsonc` 的 5 个 `STRIPE_PRICE_*` 为 live price IDs
4. live mode 重新 Add webhook endpoint，拿新 `whsec_live_...`
5. `wrangler secret put STRIPE_SECRET_KEY` 替换为 `sk_live_...`
6. `wrangler secret put STRIPE_WEBHOOK_SECRET` 替换为 `whsec_live_...`
7. `pnpm --filter @muicv/website deploy` 重新部署
8. 用真实银行卡走一遍最小金额验证（建议先创个 ¥1 的 small 补充包做 smoke test）

**绝不要一上来就用 sk_live**：live mode 不能删 customer，初期数据脏一次就再也清不干净。

#### 端到端手测脚本（test mode）

跑过这套再切 live：

1. 注册新用户 → `/api/me` 返回 `balance: 10000`，dashboard 流水有一条 `signup_bonus`
2. 调用 `/render` 一次 → 余额 9800，流水 +1 (`pdf_render`, -200)
3. SQL `UPDATE tokenBalance SET balance = 100 WHERE userId = ?` → 调用 `/render` → 402 `insufficient_balance`
4. 跳 Pro 月卡 checkout，用 4242 4242 4242 4242 测试卡 → webhook `customer.subscription.created` + `invoice.paid`
   → user.balance 多 100K，流水一条 `subscription`，subscription 表 status='active'
5. dashboard 点"管理订阅" → Customer Portal → Cancel subscription → webhook `customer.subscription.updated` → subscription 表 cancelAtPeriodEnd=true
6. 跳 medium 补充包 checkout → 付款 → webhook `checkout.session.completed (mode=payment)` → balance +35K，流水一条 `topup`
7. `stripe trigger invoice.payment_failed` → status 进 past_due（余额不动）
8. 同一个 webhook event 在 dashboard 重发一次 → 第二次返回 200 deduped，流水不重复入条

- 对接 muirouter.com（类 openrouter 的 LLM 代理 + 付费余额）
- Dashboard UI（用量、API Key、订阅状态）
- 未来上 Stripe 做订阅或直接充值 muirouter 额度

---

## packages/cms（Payload 内容后台）

Worker name `muicv-cms`。承载：

- `/admin`：Payload admin，用来管理 posts / skillExtensions / changelog / media
- `/api/*`：Payload REST / GraphQL API
- D1：`MUICV_CMS_DB` binding 指向现有 database `muicv`
- R2：`MUICV_CMS_MEDIA` binding 指向现有 bucket `muicv`
- OpenNext cache：`NEXT_INC_CACHE_R2_BUCKET` 复用现有 bucket `site-cache`

首次部署前不新建 D1 / R2，只需要确认 `packages/cms/wrangler.jsonc` 里的 id / bucket name
与 `packages/website`、`packages/api` 保持一致。然后配置 Payload secret：

```bash
pnpm --filter @muicv/cms exec wrangler secret put PAYLOAD_SECRET
```

然后：

```bash
pnpm --filter @muicv/cms migrate:create <migration-name> --skip-empty
pnpm --filter @muicv/cms migrate:status
pnpm --filter @muicv/cms migrate
pnpm --filter @muicv/cms deploy
```

`migrate` 会读取 `packages/cms/migrations` 和生产 D1 的 `payload_migrations` 表，只执行未应用的 migration。

当前 website / api / app 已先通过 `@muicv/shared` 的 seed registry 消费同一份内容形状。
等 CMS 上线后，把 registry 数据源切到 Payload API 即可，不需要改公开路由和 app IPC。

### 本地 MCP 写作入口

`packages/cms` 还提供一个本地 stdio MCP server，给 Codex / Claude Desktop / Cursor
这类 AI Agent 写文章用。它**不是新的 Worker**，不会新增部署单元；Agent 在本机启动
`pnpm --filter @muicv/cms mcp`，再通过现有的 `https://cms.muicv.com/api/*` 写入 Payload。

MCP tools：

| Tool | 作用 |
|---|---|
| `create_post` | 创建 posts 文档；slug 已存在会报错 |
| `upsert_post` | 按 slug 创建或更新 posts 文档；默认更新已有文章 |
| `get_post` | 按 slug 查询文章，用于写作前查重 |
| `create_skill` | 创建 skillExtensions 文档；slug 已存在会报错 |
| `upsert_skill` | 按 slug 创建或更新 skillExtensions 文档；默认更新已有 skill |
| `get_skill` | 按 slug 查询 skill，用于写作前查重 |

所有写入默认都是 `status: "draft"`；只有调用方明确传 `status: "published"` 才会发布。
文章的 `section` 默认是 `jobs`，对应公开路径 `/posts/jobs/<slug>`；skill 对应公开路径
`/skills/<slug>`。

推荐在 Payload Admin 的 Users 里给专用用户生成 API Key，然后传给 MCP。Payload API Key
的请求头格式是 `Authorization: users API-Key <key>`，MCP client 会根据
`MUICV_CMS_API_KEY` 自动拼好这个 header。

Agent 配置示例：

```json
{
  "mcpServers": {
    "muicv-cms": {
      "command": "pnpm",
      "args": ["--filter", "@muicv/cms", "mcp"],
      "cwd": "/Users/meathill/Documents/GitHub/muicv",
      "env": {
        "MUICV_CMS_URL": "https://cms.muicv.com",
        "MUICV_CMS_API_KEY": "<Payload Users 里生成的 API Key>"
      }
    }
  }
}
```

也可以用 `MUICV_CMS_TOKEN` 传短期 Bearer token，或用 `MUICV_CMS_EMAIL` /
`MUICV_CMS_PASSWORD` 登录后换 token；这两种只作为兜底。不要把这些值写进仓库文件，
放在本机 MCP client 的私有配置或系统密码管理器里。

---

## packages/app（桌面端 electron app）

不部署到任何服务，通过 GitHub Releases 给用户下载 `.dmg` / `.zip`。

### 本地开发 / 自测（dogfood + 找 bug）

> 这一节是给 meathill 自己测、找问题给 Claude 让他修用的。**所有 dev
> 时间都在自己机器上跑，不影响生产。**

#### 1. 前置一次性准备

```bash
# 仓库根
pnpm install
```

第一次会下载 electron 二进制（~500 MB），会比较慢；以后 install 走缓存就快了。

需要的钥匙（事先准备好）：

| 配置项 | 哪里拿 | 说明 |
|---|---|---|
| **muicv API key** | [muicv.com/dashboard](https://muicv.com/dashboard) 登录 → "API Keys" → 生成 `mui_...` | 桌面 app **唯一登录凭证**（必需） |
| **muirouter API key** | [muirouter.com](https://muirouter.com) sign up → 复制 `sk-gw-...`，**贴到 muicv dashboard "muirouter 余额" 绑定**（不是粘到桌面端） | BYOK 必需，让 LLM 走你自己的余额 |
| **工作目录** | 在本地任选一个目录，例如 `~/muicv-test/`（先建好或让 app 引导你选） | 所有产物落这里 |

> 桌面端**只**需要 mui_ key + 工作目录。LLM 调用 / 余额 / 档位 / BYOK 都由 muicv 后端按你账号状态决定，前端不直连 muirouter。

#### 2. 启动 dev 模式

```bash
pnpm --filter @muicv/app dev
```

- electron-vite 起 Vite dev server + 启动 electron 窗口
- HMR：改 renderer (React) 立即生效；改 main / preload 会重启窗口
- 默认右侧打开 DevTools（Console / Network / React tree 都能看）

打开后流程（三段式）：

1. **Login**（第一屏）— 大按钮"打开 muicv.com 登录" → 浏览器打开 dashboard → 你登录 / 注册 → 复制 mui_ key → 回 app 粘进框 → "登录"
2. **Onboarding**（登录后）— ① 选工作目录；② 提示去 dashboard 绑 muirouter（v1 必须，否则 LLM 调不通）。绑好回 app 点"我绑好了，刷新"
3. **Chat** — 跟 Mui 说话；在顶部右上角 "设置" 随时切档位 / BYOK / 工作目录 / 退出登录

随时切换：
- **升级订阅档位**：Settings → "订阅档位" 卡 → 点链接去 dashboard（M4 起开放 Pro/Max）
- **绑定 / 解绑 muirouter (BYOK)**：Settings → "muirouter (BYOK)" 卡 → dashboard 操作 → 回 app 点 "我刚改了，刷新"
- **退出登录**：Settings 顶部 → 清 mui_ key 回登录页（工作目录保留）

**前提**：muicv 账号 + dashboard 绑过 muirouter（v1 BYOK 必须；M4 起 Pro/Max 可免）。否则 LLM 调用拿到 402 / no-muirouter-link。

#### 3. 跑一遍端到端流程（最简版）

按下面 4 句话依次发，用对话流验证 8 个工具是否都能动：

```
帮我准备简历
我叫张三，前端工程师，2023 年至今在 ACME 做 dashboard 重构，把 LCP 从 3.1s 降到 1.4s
抓这个 JD: https://jobs.ashbyhq.com/anthropic
针对它生成一版简历然后导出 PDF
```

期望的 agent 行为（对应 8 个工具）：

| 你说的 | agent 大概会调 |
|---|---|
| 帮我准备简历 | `list_dir` → `write_file` 创建 `.claude/muicv/profile.md` 等骨架 |
| 加经历 | `write_file` 写 `experience/acme-2023.md` |
| 抓 JD | `fetch_jd` → `targets/anthropic-...md` |
| 生成简历 | `read_file` ×N + `write_file` `versions/...md` |
| 导出 PDF | `render_resume_pdf` → `versions/...pdf` |

#### 4. 验证产物

工作目录现在应该有：

```
~/muicv-test/.claude/muicv/
├── profile.md
├── experience/acme-2023.md
├── targets/anthropic-...md
└── versions/anthropic-...md + .pdf
```

也可以点 app 顶部的 📁 路径按钮，直接在 Finder 打开看。

#### 5. 找 bug 的常见入口 + 反馈给我

- **agent 答非所问 / 不会用工具** → 打开 DevTools → Console 看 `[agent:chat] ...` 报错；问题大概率在 prompt 里某段表达不清，把"对话原文 + agent 调了什么工具 + 没调什么工具"贴给我
- **muirouter 401 / 模型不存在** → settings 里把 model id 换成 muirouter 实际支持的；告诉我哪个 model id 在哪个场景下能跑
- **`render_resume_pdf` 失败** → 看 DevTools Network 里 POST 到 api.muicv.com/render 的响应；如果没部署 packages/api，把响应贴出来
- **`fetch_jd` 拿不到内容** → 同上，把 URL 和报错贴出来
- **窗口/UI 错乱** → 截图 + 说明在哪个步骤
- **进程崩溃 / "白屏"** → 在终端看 `pnpm dev` 输出的 main 进程 stderr，把整段 log 贴过来

> 反馈格式：**截图 + 复现步骤 + 实际表现 + 预期表现**，能给我什么我就改什么。可以放在 GitHub Issue 里，也可以直接发我对话。

#### 6. 重启 / 清状态

- **清配置**（清掉粘过的 key、选过的目录）：
  ```bash
  rm -rf ~/Library/Application\ Support/@muicv/app/
  ```
  （或者直接重选 Settings 覆盖）
- **清工作目录**：删 `~/muicv-test/.claude/muicv/` 整个目录，让 agent 重新引导初始化
- **彻底重启**：关 app → 重新 `pnpm --filter @muicv/app dev`

#### 7. 想看完整 production 行为（不打 .dmg）

```bash
pnpm --filter @muicv/app build && pnpm --filter @muicv/app preview
```

这跑的是 build 后的 main / preload / renderer bundle（不带 HMR），最贴近用户拿到 .dmg 后的实际体验。

---

### 自动 release（推荐）

`.github/workflows/release.yml` 监听 `v*` tag，**matrix 三平台并行**跑：

| Runner | 产物 |
|---|---|
| `macos-latest` | `Mui简历-x.x.x-{arm64,x64}.{dmg,zip}` + `latest-mac.yml` |
| `windows-latest` | `Mui简历-x.x.x-x64.exe`（NSIS 安装包）+ `latest.yml` |
| `ubuntu-latest` | `Mui简历-x.x.x-x64.AppImage` + `latest-linux.yml` |

每台 runner 走相同步骤：

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @muicv/app package:${target}`（target = `mac` / `win` / `linux`）
3. 把对应平台产物上传到同一个 GitHub Release（`softprops/action-gh-release@v2` 默认 append assets）

`fail-fast: false`：某一平台失败不连累另两个 in-progress 的 build。

发布步骤：

```bash
# 改 packages/app/package.json 的 version
# 然后 commit，打 tag
git tag v0.1.0
git push origin v0.1.0
# GitHub Actions 跑 ~12 分钟（windows runner 通常最慢），完成后 release 页面有 4 个安装包
```

> Windows / Linux 暂只发 x64。arm64 Windows（Surface Pro X）和 arm64 Linux 用户极少，
> 看反馈再补。

### 本地手动 build

```bash
pnpm --filter @muicv/app package          # 当前主机架构（mac）
pnpm --filter @muicv/app package:mac:arm  # 强制 Apple Silicon
pnpm --filter @muicv/app package:mac:x64  # 强制 Intel
pnpm --filter @muicv/app package:win      # NSIS .exe（需要 win runner 或 wine）
pnpm --filter @muicv/app package:linux    # AppImage（需要 linux runner）
```

跨平台 build 限制：在 mac 上跑 `package:win` 需要装 wine（`brew install --cask wine-stable`）；
跑 `package:linux` 通常 mac 上能直接出 AppImage。**实际发版走 GitHub Actions**，本地这两个
脚本只是开发期 smoke test 用。

产物在 `packages/app/release/`。

### 图标生成

`pnpm --filter @muicv/app build:icons` 跨平台：

- 任何平台都生成 `build/icon.png`（1024 通用）和 `build/icon.ico`（Windows，借 `png-to-ico` 多分辨率拼）
- 只在 macOS 上跑 `iconutil` 输出 `build/icon.icns`（macOS-only 命令）
- `build/icon.icns` 已 commit 到仓库，所以非 darwin runner 直接用 cached 文件

改完 `build/icon.svg` 后在 mac 上跑一次 `build:icons`，连同新的 `.icns` / `.ico` / `.png` 一起 commit。

### 签名 / 公证

- **macOS**：已签名 + 公证 + staple。证书 `Developer ID Application`、entitlements、
  GitHub Actions secrets（`CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_API_KEY_BASE64` /
  `APPLE_API_KEY_ID` / `APPLE_API_ISSUER`）配置详见
  [DEV_NOTE.md > packages/app macOS 签名 + 公证](./DEV_NOTE.md#packagesapp-macos-签名--公证)。
- **Windows**：仍 unsigned。首次启动撞 SmartScreen，要点 "更多信息 → 仍要运行"。
  未来上 Authenticode 证书：DigiCert / SSL.com 买 EV 证书 → GH secrets 加
  `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` → `electron-builder.yml` 的 `win` 段加
  `signAndEditExecutable: true`。
- **Linux**：AppImage 不签名（本身格式不要求）。

### 用户首次安装注意

- **macOS**：已公证，正常拖入 Applications 即可，不用解 quarantine。
- **Windows**：双击 .exe → SmartScreen 蓝屏 → 点 "更多信息" → 点 "仍要运行" → 选安装路径
- **Linux**：

  ```bash
  chmod +x Mui简历-*.AppImage
  ./Mui简历-*.AppImage
  ```

---

## Skill 分发（不需要部署）

`skills/muicv-*/` 跟着仓库推 master 就是"发布"——用户通过：

```bash
npx skills add meathill/muicv -g
```

一条命令就装到 `~/.claude/skills/`（或团队项目 `./.claude/skills/`）。

见 [README.md > 安装](./README.md#安装) 章节。

---

## CI / CD（暂缺，Phase 5 再补）

目前所有部署都是**手动**跑 `pnpm --filter <pkg> deploy`。未来规划：

- GitHub Actions：main 分支 merge 时自动部署 `packages/api` 到 prod
- PR 自动部署 preview 环境（`wrangler deploy --env preview`）

---

## 可能的坑

- **Browser Rendering 必须 Workers Paid Plan**：免费账号会部署失败 / 调用 401。
- **本地 dev 必须 `--remote`**：Browser Rendering 跑在 Cloudflare 浏览器集群，本地 workerd 没有它。`wrangler dev` 默认 local 模式会报错。
- **`puppeteer.goto` 目标必须公网可达**：localhost:3070 的 packages/website 够不到，dev 期间用的是已部署到 muicv.com 的 prod website。
- **Worker CPU 时限 30s**：当前 page load timeout 设为 20s 留出余量。
- **KV namespace id 必须 api/website 一致**：两边 `kv_namespaces[].id` 不一致 → website 的 `/r/render/[token]` 取不到 token，puppeteer 拿到 404 页面 → PDF 是空的。
- **Google Fonts 出向**：简历模板字体走 fonts.googleapis.com / gstatic.com。Cloudflare Browser Rendering 默认能访问，国内私有部署或自建 Workers AI Gateway 时若被墙，需切到 R2 自托管子集化字体。
- **DO 删除迁移不可回退**：`migrations` 里 v2 `deleted_classes: ["BrowserContainer"]` deploy 后 class 就没了。回退方案是 git revert 到 Container 版本 + 重新 deploy；本地保留 Container 镜像的话恢复较快。

---

## Electron OAuth-style 自动登录（Phase 8）

桌面端登录默认走 `muicv://` 自定义 URL scheme，避免用户手动复制 API key。

### 流程

1. 用户在 LoginView 点 **"用 muicv 账号登录"**
2. main 进程 `beginConnect()` 生成随机 `state`（base64url，24 字节），缓存到内存 5 分钟
3. `shell.openExternal('https://muicv.com/connect?state=...&redirect=muicv://callback&app=...')`
4. 用户在网页登录（已登录直接跳过）→ 看到授权 UI → 点"授权"
5. `POST /api/connect/approve` 验 better-auth session → 生成 `mui_` key 入 `apiKey` 表 → 返回 `redirectUrl`
6. 浏览器 `location.href = muicv://callback?state=...&key=mui_...`
7. macOS：`app.on('open-url')`；Windows/Linux：`app.requestSingleInstanceLock()` + `second-instance` argv → 都汇聚到 `handleDeepLink()`
8. main 验 `state`、调 `loginWithKey(key)`（其内部 `GET /me` 校验）→ `webContents.send('session:autoLogin', result)`
9. renderer 在 `onAutoLogin` 收到结果 → `setSession` → router 自动切到 onboarding/chat

### 安全要点

- **state**：renderer 随机生成（main 侧），仅存在 main 内存。重启失效（重启后接受任何 callback 都没意义）
- **redirect**：`/connect` 页和 `/api/connect/approve` 都校验 `redirect` 必须以 `muicv://` 开头，防 open-redirect
- **key 配额**：每用户最多 10 个 active key（和 dashboard 手动生成共享）
- **撤销**：用户在 dashboard `/dashboard` API Keys 区域可一键撤销任意 key

### 开发调试

- macOS dev 模式下，scheme 生效需要先 build 一次（`pnpm --filter @muicv/app build` + `electron-builder --mac --dir`）让 `Info.plist` 注册到 LaunchServices；纯 `pnpm --filter @muicv/app dev` 启动的 electron 不会被 OS 当成 muicv:// 的 handler
- 调试 deep-link 流：build 出 `release/mac-arm64/Mui简历.app` → `open /tmp/some.app` 一次后，浏览器里 `open "muicv://callback?state=test&key=mui_xxx"` 就会唤起
- 本地测 connect 页：把 muicvApiBase 改成 `http://localhost:8787` 后 main 会推导出 `http://localhost:3000` 作为 webBase（`packages/website` dev 默认端口）

### 常见问题

- **点了"授权"浏览器没唤起 app**：检查 macOS 系统设置 → 默认 → 自定义 URL scheme 是否正确指向 Mui简历.app；或者用 paste fallback
- **state 不匹配**：用户在浏览器停留太久（>5 分钟）/ 多次发起 connect 后用了旧链接 → 重新点登录按钮
- **app 已开但浏览器在另一台机器**：scheme 仅本机有效，跨机器场景必须 fallback paste
