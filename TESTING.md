# TESTING

## 环境要求

- Node.js >= 24
- pnpm（见根目录 `package.json` 的 `packageManager`）
- Cloudflare 账号（Workers Paid Plan + Browser Rendering 已启用，跑 `packages/api` dev / e2e 需要）

## 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

## 运行测试

测试统一使用 Node 内置 test runner（`node --test`，TS 直接跑），三个包各自维护自己的
`test/*.test.ts`：

| 包 | 覆盖范围 | 文件 |
|---|---|---|
| `packages/shared` | pricing / format / resume-sync / hsm-client / muirouter-oauth + smoke（核心跨端工具） | format / hsm-client / muirouter-oauth / pricing / resume-sync / smoke |
| `packages/api` | Hono `app.request()` 测路由、CORS 白名单、api-key middleware、wallet 扣账原子性、llm 用量统计、transcribe | llm-usage / routes / transcribe / wallet |
| `packages/app` | 纯逻辑 helper（chat-utils / 附件解析 / 滑动窗口 history / slash-command / filler-count / 扩展 bridge 协议）；**不**测 React 组件和 IPC | attachments / chat-utils / filler-count / history / slash-command / extension-bridge |
| `packages/extension` | JD 抽取器 + html→markdown；不测真实招聘站 | extractors |
| `packages/cms` | Payload admin / migrations 暂以 build + 手测为主 | 待补 |
| `packages/website` | 纯逻辑 helper（post alternates 过滤）；**不**测 React 组件 | post-alternates |

只跑某个包：

```bash
pnpm --filter @muicv/shared test
pnpm --filter @muicv/api test
pnpm --filter @muicv/app test
pnpm --filter @muicv/cms build
```

类型检查（`packages/app`）：

```bash
pnpm --filter @muicv/app typecheck
```

## 测试方针

覆盖核心工具 / API 路由 / 纯 helper；**有意不测** React 组件、Electron IPC、wrangler /
miniflare 集成——投入比回报大，留给手测和 dogfood。决策依据见
[DEV_NOTE.md > 测试](./DEV_NOTE.md#测试)。

## 启动开发服务器

Web 主体（landing + 未来 dashboard）：

```bash
# 纯 Next.js dev（最快）
pnpm dev

# OpenNext / Wrangler 本地预览（贴近生产 Worker 环境）
pnpm dev:cf
```

API（PDF 渲染 + JD 抓取 + waitlist）：

```bash
# Browser Rendering 跑在 Cloudflare 浏览器集群，本地 workerd 没有它，必须 --remote
pnpm --filter @muicv/api dev
```

详见 [DEPLOYMENT.md](./DEPLOYMENT.md#packagesapipdf-渲染-api) 的本地开发节。

## 验证 Cloudflare 部署

`packages/website` 和 `packages/api` 都已接入 wrangler，本地可 dry-run：

```bash
# website：先在本地 D1 跑 migrations（M2 起会有 users 等表）
pnpm --filter @muicv/website cf-typegen

# website：构建 Worker bundle（不部署）
pnpm --filter @muicv/website cf:build

# api：dry-run 检查 wrangler bundle
pnpm --filter @muicv/api build
```

## 说明

- 端到端测试待补齐
- `packages/api` 本地 dev 必须 `wrangler dev --remote`（Browser Rendering 不支持纯本地）
- `puppeteer.goto` 必须能访问公网 URL，本地 localhost 够不到；dev 期间走的是已部署到 muicv.com 的 prod packages/website（改 website 必须先 deploy 才能在 puppeteer 里看到效果）
