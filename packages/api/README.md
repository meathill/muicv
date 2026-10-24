# @muicv/api

Mui简历 skill 背后的 Cloudflare Worker。对外承担本地 / agent 做不了的事：PDF 渲染、JD 抓取、模板库、未来的账号 / 订阅。

## 架构

```
skill / website → POST /<path>
                    ↓
                  Hono Worker (src/app.ts)
                    ├─ POST /waitlist   → D1 (waitlist 表)
                    ├─ GET  /me          → D1 (user 表)
                    ├─ ALL  /llm/v1/*    → muirouter 反代
                    ├─ POST /render      ↓
                    │   1. 写一次性 token 进 MUICV_KV (5min TTL)
                    │   2. puppeteer.launch(env.BROWSER)  // Cloudflare Browser Rendering
                    │   3. page.goto(${RENDER_BASE_URL}/r/render/${token})
                    │      └─ packages/website 的 SSR 路由读 KV → React 模板渲染 HTML
                    │   4. await document.fonts.ready
                    │   5. page.pdf({ format: 'A4' })
                    │   6. 删 KV、关 browser
                    │   ↓ 返回 PDF bytes
                    │
                    └─ POST /jobs/fetch  ↓
                        1. puppeteer.goto(jdUrl)
                        2. addScriptTag 注入 Readability + turndown
                        3. page.evaluate：Readability.parse → turndown.turndown
                        4. 返回 markdown + meta
```

历史：原本是 `Worker → DurableObject(BrowserContainer) → Cloudflare Container (Node + Puppeteer + Chromium)`。Container 价值是托管 Chromium + 中文字体，但 Docker 构建链路 + DO 代理样板很重。2026-04 迁移到 Cloudflare Browser Rendering：托管 Chromium 由 Cloudflare 提供，Workers Binding 形态调用，砍掉 Dockerfile + DO 整套。中文字体改成 packages/website 的 React 模板用 Google Fonts 加载。

## 目录

- `src/app.ts` — Hono 路由总入口
- `src/index.ts` — Worker entry，导出 default app
- `src/lib/render-pdf.ts` — `/render` 实际逻辑（写 KV + puppeteer.goto + page.pdf）
- `src/lib/fetch-jd.ts` — `/jobs/fetch` 实际逻辑（goto + addScriptTag + evaluate + turndown-in-page）
- `src/middleware/api-key.ts` — `mui_` key 鉴权
- `src/routes/me.ts`、`waitlist.ts`、`llm.ts` — 其他业务路由
- `migrations/*.sql` — D1 schema 迁移
- `test/routes.test.ts` — 入口校验路径单测（`node --test`）

## 本地开发

**前置**：

- Cloudflare Workers Paid Plan（Browser Rendering 仅付费可用）
- 已建好 `MUICV_KV` namespace 并把 id 填进两边 wrangler.jsonc（packages/api + packages/website 必须**完全一致**）
- packages/website 已部署到 muicv.com（`puppeteer.goto` 要可达的公网 URL）—— 见根目录 [DEPLOYMENT.md](../../DEPLOYMENT.md)

```bash
pnpm install

# Browser Rendering 必须 --remote（本地 workerd 没有 Browser Rendering）；本包 dev 脚本默认带 --remote
pnpm --filter @muicv/api dev
```

测试 /render：

```bash
curl -X POST http://localhost:8787/render \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# 张伟\n\n上海 · 高级前端工程师 · 2020 至今\n\n## Summary\n\n一段测试。"}' \
  --output /tmp/test.pdf
open /tmp/test.pdf
```

测试 /jobs/fetch：

```bash
curl -X POST http://localhost:8787/jobs/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://jobs.ashbyhq.com/anthropic"}' | jq .
```

测试 /waitlist（要求本地 D1 已 migrate）：

```bash
pnpm --filter @muicv/api exec wrangler d1 migrations apply muicv --local
curl -X POST http://localhost:8787/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"dev"}'
```

## 单元测试

```bash
pnpm --filter @muicv/api test
```

只覆盖入口校验路径（content-type / 字段 schema / D1 mock）。真实 PDF / JD 抓取走 prod e2e（直接 deploy 后 curl）。

## 部署

详见根目录 [DEPLOYMENT.md](../../DEPLOYMENT.md)。

## 添加新简历模板

模板从 2026-04 起改为 React 组件，**位置在 packages/website**，不在本包：

1. `packages/website/app/r/render/[token]/templates/<name>.tsx` 新建组件，签名同 `default.tsx`：`(props: { resume: ParsedResume }) => JSX.Element`
2. 在 `templates/registry.ts` 的 `templates` map 里注册并加到 `TemplateName` 联合类型
3. 重新部署 packages/website
4. Skill 调 `/render` 时传 `template: "<name>"`

## 环境变量 / 配置

| 名称                 | 类型   | 来源                  | 说明                                                                             |
| -------------------- | ------ | --------------------- | -------------------------------------------------------------------------------- |
| `RENDER_BASE_URL`    | var    | wrangler.jsonc        | packages/website 的公网 base（`https://muicv.com`），`puppeteer.goto` 用它拼 URL |
| `BETTER_AUTH_SECRET` | secret | `wrangler secret put` | 与 packages/website 同值，用来 HKDF 解密 muirouterLink                           |
| `OPENAI_API_KEY`     | secret | `wrangler secret put` | 用户没绑 BYOK 时走平台默认 key（M2 起做月度配额）                                |
