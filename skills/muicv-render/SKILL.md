---
name: muicv-render
description: 把 `versions/` 下的简历 Markdown 渲染成 PDF，调 Mui简历后端 API 完成渲染（后端跑 Cloudflare Container + Puppeteer）。使用场景：用户说「把简历导出 PDF」「渲染简历」「把这份版本变成 PDF」「下载一版投递用的 PDF」等。依赖 `muicv-generate` 生成的 version 文件；依赖网络（要调 HTTP API）。
---

# muicv-render

把一份已经生成的简历 Markdown 渲染成 PDF 文件，保存到同名路径（`versions/foo.md` → `versions/foo.pdf`）。

**这是 skill 里唯一需要联网的核心能力**（抓 JD 在 muicv-jobs）。调用 API **必须**配 `MUICV_API_KEY`（在 https://muicv.com/dashboard/api-keys 创建）；鉴权 / 计费 / 错误处理统一规范见 [docs/skill-api-key.md](../../docs/skill-api-key.md)。

## 前置检查

1. 素材库根下 `versions/` 里是否有简历？没有 → 提示先调 `muicv-generate`（路径相对素材库根）
2. 用户指定了哪份？
   - 明确指定（文件名或路径）→ 用它
   - 没指定 → 列出最近 3 个 version 让用户选（按 mtime 排序）
3. **选数据源**：一份 version 实际上有 `.md` 和 `.resume.json` 一对兄弟文件。
   - 用户没指定模板 / 指定了 `default` → 用 `.md` markdown 路径
   - 用户指定 t1~t6 任一模板 → 用 `.resume.json` JSON 路径；JSON 不存在就提示用户调 `muicv-generate` 重新生成（老版本可能只产 `.md`）
   - 用户问"哪个模板好"→ 简单建议：投递大公司 t1，工程岗 t4，申请学术 t6，其它默认 t2
3. 确认 API 地址。**按以下顺序**解析：
   1. 用户在本次对话明确指定的 URL（"渲染到 localhost:8787"）
   2. 环境变量 `MUICV_API_BASE`（如果用户在 shell 里 export 了）
   3. 默认值 `https://api.muicv.com`

4. **API key gate**（强制；规范详见 [docs/skill-api-key.md](../../docs/skill-api-key.md)）

   `/render` 端点强制 Bearer 鉴权，且按 `PDF_RENDER_COST` 扣 token。读 `MUICV_API_KEY` 环境变量：

   - **没设 / 为空** → 别调 API，原文发下面这段教育文案给用户：

     > 还没看到你配置 muicv API key。渲染 PDF 需要 key 来识别身份和计费。
     > 一次性配好就行，以后 skill 自己读：
     >
     > 1. 浏览器打开 **https://muicv.com/dashboard/api-keys**
     >    （还没注册先去 muicv.com 注册——注册赠 10K token）
     > 2. 点「创建 key」，给它起个名（比如"我的 mac"），复制弹出来的
     >    **`mui_xxxxxxxx...`**（只显示一次，错过就只能撤销重发）
     > 3. 写到 shell rc 里：
     >    ```bash
     >    # macOS / Linux
     >    echo 'export MUICV_API_KEY="mui_刚才复制的那串"' >> ~/.zshrc
     >    source ~/.zshrc
     >    # bash 用户把 .zshrc 换成 .bashrc / .bash_profile
     >
     >    # Windows (PowerShell)
     >    setx MUICV_API_KEY "mui_刚才复制的那串"
     >    # 然后重开终端
     >    ```
     > 4. 验证：`echo $MUICV_API_KEY`（Windows: `echo %MUICV_API_KEY%`）
     >    看到 `mui_` 开头 36 字符 → 配好了
     > 5. 回来跟我说"重试渲染"

   - **格式不合法**（不匹配 `/^mui_[A-Za-z0-9]{32}$/`）→ 别调 API，回：

     > 你这个 key 看起来不像 muicv 发的。可能复制时漏了字符或多了空格、引号；
     > 去 https://muicv.com/dashboard/api-keys 重新发一份再 export 试试。

   - **合法** → 继续渲染流程。

## 渲染流程

### 1. 读取 version 文件

按上面"选数据源"的结果二选一：

- **markdown 路径**：用 Read 读 `versions/<file>.md` 的完整内容（含 frontmatter，API 那边也会解析）
- **JSON 路径**：用 Read 读 `versions/<file>.resume.json`，解析成对象后塞到 `/render` body 的 `resumeJson` 字段。**直接传整份对象**，不要 stringify 两层
- 二者**不要混着读**——比如调 markdown 路径但其实读了 JSON 文件，body 校验会 400

### 2. 调用 API

**两种 payload 形态**（互斥），根据用户的素材选其一：

```bash
# A. markdown 路径（兼容老 versions/*.md，目前只有 default 模板）
curl -X POST "${MUICV_API_BASE}/render" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MUICV_API_KEY}" \
  -d '{"markdown": "<整个 .md 文件内容>", "template": "default"}' \
  --output "<version 文件同名的 .pdf>"

# B. JSON 路径（versions/*.resume.json 双语结构化资料，配 t1~t6 视觉模板）
curl -X POST "${MUICV_API_BASE}/render" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MUICV_API_KEY}" \
  -d '{
        "resumeJson": <整个 .resume.json 内容>,
        "template": "t3-sidebar",
        "lang": "zh"
      }' \
  --output "<.resume.json 同名的 .pdf>"
```

参数：
- `markdown`（A 路径必填）：version md 文件的**完整内容**（含 frontmatter）
- `resumeJson`（B 路径必填）：`TemplateResumeData` 结构化对象，schema 定义见 `@muicv/shared` 的 `domain/template-resume.ts`
- `template`：
  - A 路径默认 `default`
  - B 路径必传 `t1-classic` / `t2-minimal` / `t3-sidebar` / `t4-tech` / `t5-timeline` / `t6-academic` 之一
- `lang`（B 路径可选）：`'zh'` 或 `'en'`。不传时服务端自动用 `resumeJson.lang`（生成端会写），
  都没有才默认 `'zh'`——所以英文简历只要内容里写了 `lang: "en"`，不用额外传参
- `accent`（B 路径可选）：覆盖模板默认主色，CSS 颜色字符串（如 `oklch(0.42 0.08 270)`）

响应：
- `200` + `application/pdf`：直接是 PDF 二进制
- `400` + JSON：参数错误（例如 markdown 为空）
- `401` + JSON `{"error":"missing-api-key" | ...}`：key 没带 / 被拒。**不要重试**，按下方「错误处理小抄」处理
- `402` + JSON `{"error":"insufficient-balance", "balance":..., "required":...}`：余额不够。把 balance/required 念给用户，让他去 https://muicv.com/dashboard 充值
- `502` + JSON：container 侧异常
- 网络错误 / 超时：告诉用户可能是首次调用 Container 冷启动（5-10s），让用户重试一次

### 3. 保存文件

PDF 路径：把 `.md` 后缀换成 `.pdf`，和 version 同目录。
- 例：`versions/google-swe-2026-04-23.md` → `versions/google-swe-2026-04-23.pdf`
- 如果目标文件已存在 → 问用户要不要覆盖；不要默默覆盖

### 4. 告诉用户路径 + 尺寸

```
✓ versions/google-swe-2026-04-23.pdf (148 KB, 2 页)
```

能读到页数就顺便告诉用户（可从 PDF 头部解析，或粗略按"每页约 N KB"估算；不必精确）。

## 模板矩阵

| id            | 风格                                 | 适合谁                                 | 字体     |
| ------------- | ------------------------------------ | -------------------------------------- | -------- |
| `default`     | A4 单栏 markdown 直接出              | 老 versions/\*.md，兼容路径            | Noto SC  |
| `t1-classic`  | 经典商务·居中衬线·深海军蓝           | 大公司投递、传统行业                   | serif    |
| `t2-minimal`  | 现代极简·瑞士留白·暖沙               | 设计/产品岗、注重排版                  | sans     |
| `t3-sidebar`  | 双栏侧边·深绿侧栏·圆角方照           | 想突出技能矩阵、有头像                 | sans     |
| `t4-tech`     | 技术工程·mono 点缀+项目卡片·雾青     | 工程师 / 开发岗                        | sans+mono |
| `t5-timeline` | 时间线·垂直轨道串经历·靛蓝           | 经历较多、想强调路径                   | sans     |
| `t6-academic` | 学术 CV·论文编号·密集衬线·墨红       | 申请学术 / 研究岗、带 publications     | serif    |

挑选规则：
- 用户没指定 → 默认 `default`（向下兼容）
- 用户素材是 `versions/*.resume.json` → 默认 `t2-minimal`，根据职位类型可主动建议（投技术岗换 `t4-tech`，投学术换 `t6-academic`）
- 用户明确说"换个模板 X" → 用 X
- 模板都是 A4，跨页能力一致，不必担心溢出

## 调用示例

```
用户：把我刚才生成的那份 google 简历导出 PDF

Claude：
  1. Glob versions/google-*.md
  2. 找到 versions/google-swe-2026-04-23.md
  3. Read 全文
  4. Bash curl → versions/google-swe-2026-04-23.pdf
  5. 告诉用户：✓ versions/google-swe-2026-04-23.pdf (148 KB, 2 页)
```

## 注意事项

- **首次调用可能慢（5-10s）**：Container 冷启动，属于 MVP 已知限制。用户第二次调用会快很多（<1s，热请求）
- **网络异常时的提示**：如果 curl 超时或连接错，先建议用户检查网络 / API 地址；不要重试 >2 次
- **不要对 PDF 做后处理**：拿到就存，不要改文件名以外的任何事
- **保留源 md**：渲染 PDF 不删除源 md；用户可能想再渲染一次

## 生成在线预览链接（可选）

当用户说"生成一个能发给 HR 看的链接"、"在浏览器里看一下"、"分享给我朋友"等场景，
**不要走 `/render`**（那是直接拿 PDF），而是走 `POST /preview`：

```bash
curl -X POST "${MUICV_API_BASE}/preview" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MUICV_API_KEY}" \
  -d '{
        "resumeJson": <.resume.json 内容>,
        "template": "t3-sidebar",
        "lang": "zh",
        "shareMode": "link",
        "ttlDays": 7
      }'
```

参数：
- `resumeJson` / `template` / `lang` / `accent`：同 `/render` 的 JSON 路径
- `shareMode`：`'link'`（默认，noindex 仅持链接者可见）或 `'public'`（全网公开 / 可被搜索抓取）
- `ttlDays`：1 / 7 / 30，默认 7

响应（201）：
```json
{
  "token": "uuid-v4",
  "url": "https://muicv.com/preview/<token>",
  "template": "t3-sidebar",
  "lang": "zh",
  "shareMode": "link",
  "expiresAt": 1700000000000
}
```

把 `url` 直接打给用户。**第一次有人点页面上的「下载 PDF」时按 `PDF_RENDER_COST` 扣 owner 余额**，
之后访客复用同一份记录免扣（防 token 被刷爆余额）。

撤销 / 续期：
- `POST /preview/<token>/revoke`（Bearer key）— 立刻失效
- `POST /preview/<token>/extend` body `{ "ttlDays": 30 }` — 把 expiresAt 往后推

## 与其他 skill 的协作

- `muicv-generate` → 产出 version md → `muicv-render` 导出 PDF
- `muicv-critique` 评审完用户满意 → 再 render
- 如果用户渲染后发现排版问题，**建议去调 API 团队改模板**，不要自己在 md 里加 HTML 尝试绕过（会被 API 的模板覆盖）

## 错误处理小抄

每条响应都尽量翻译成"用户能直接行动"的话，不要原样抛 HTTP 状态码。规范见 [docs/skill-api-key.md](../../docs/skill-api-key.md)。

| 现象 | 给用户怎么说 |
|---|---|
| `MUICV_API_KEY` 没 export | 走前置检查里的 API key 教育流程，五步详细发给用户 |
| `MUICV_API_KEY` 格式异常（不匹配 `/^mui_[A-Za-z0-9]{32}$/`）| "你这个 key 看起来不像 muicv 发的。可能复制时漏了字符或多了空格、引号；去 https://muicv.com/dashboard/api-keys 重新发一份再 export 试试。" |
| `401 missing-api-key` / `401 unauthorized` | "muicv 拒了这个 key（可能在 dashboard 撤销过、或者过期）。去 https://muicv.com/dashboard/api-keys 重新发一份，更新 shell rc 后 `source` 一下再来。" **不要重试**。 |
| `402 insufficient-balance` | 把响应里的 `balance` / `required` 念给用户："你的余额不够这次渲染（需 X，剩 Y）。去 https://muicv.com/dashboard 充值后重试。" |
| `429 rate-limited` | "调太频了，等 60s 再试。" |
| `502` / 网络错 / 超时 | 首次冷启动 5-10s 属正常，重试一次；连续失败提示去 https://status.muicv.com 看服务状态 |
