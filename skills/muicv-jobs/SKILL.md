---
name: muicv-jobs
description: 目标岗位的搜索、获取、匹配分析、投递辅助。四个子任务：`search`（在 Mui简历岗位库里按自然语言 + 地域限制搜岗位）、`fetch`（给一个 JD URL，调 Mui简历 API 抓下来并清洗成 markdown 写到 `targets/`）、`match`（对比目标 JD 与用户本地素材的覆盖度，给关键词差距清单）、`apply`（基于素材和 JD 生成 cover letter 到 `applications/`）。使用场景：用户说「帮我找远程后端岗」「我在中国，有哪些能投的海外岗位」「抓这个岗位」「分析这份 JD 的匹配度」「我要投这个公司，帮我准备一下」「帮我写求职信」等。search / fetch 依赖网络 API（search 无需 key）；match / apply 是纯本地 agent 分析。
---

# muicv-jobs

围绕「目标岗位」的四件事：找岗位（search）、拿到 JD（fetch）、评估能不能投（match）、准备投递材料（apply）。

**边界（很重要）**：
- **不自动投递**。无论是 LinkedIn 还是直聘网站，自动投递都涉及站点 ToS、反爬、账号安全；我们只帮用户准备好材料，投递由用户自己手动完成。
- **不编造事实**。match 分析和 cover letter 都严格限定在素材已有事实。

---

## 前置检查

1. 素材库根是否存在（prelude 探查过）？不存在 → 让 `muicv-core` 先初始化
2. 子任务需要的目录：
   - `fetch` 需要 `targets/`（muicv-core init 已创建）
   - `apply` 需要 `applications/`（muicv-core init 已创建）
3. 调 API 的地址按 `muicv-render` 一样的优先级解析：
   1. 对话内明确指定
   2. 环境变量 `MUICV_API_BASE`
   3. 默认 `https://api.muicv.com`

4. **API key gate（仅 `fetch` 子任务需要）**

   - `fetch` 调远端 API 抓 JD，**强制** Bearer 鉴权 + 按 `JD_FETCH_COST` 扣 token。
     按 [docs/skill-api-key.md](../../docs/skill-api-key.md) 校验 `MUICV_API_KEY`：
     - 没设 → 别调 API，发标准教育流程文案给用户（占位符替换：
       "{{这个 skill 干的事}}" → "抓取 JD"，"{{这个动作}}" → "抓 JD"）
     - 格式不合法（不匹配 `/^mui_[A-Za-z0-9]{32}$/`）→ 别调 API，发格式异常文案
     - 合法 → 继续 fetch 流程
   - `search` 是公开接口，**无需 key**（带上 key 限流额度更高：登录用户 60 次/分钟，匿名 20 次/分钟）。
   - `match` / `apply` 是本地 agent 分析，**无需 key**，跳过这条。

---

## 子任务：search

**触发**：用户说「帮我找工作 / 看看有什么远程岗位 / 欧洲的前端岗」「我在中国 UTC+8，能投哪些海外远程岗」。

岗位库 = 每日采集的国际 / 远程技术岗（Greenhouse / Lever / Ashby / Remotive）+ 社区贡献 JD，服务端做
**关键词（FTS5 trigram，中英文模糊 / 错别字容忍）+ 语义（向量）混合检索**，地域条件是**硬约束**。

### 流程

1. **先确定用户所在地**：国家（ISO alpha-2，如 `CN`）和时区（UTC 偏移小时，如 `8`）。
   - 来源优先级：本次对话 > 素材库 `profile.md` / 简历里的所在城市 > 问用户一句。
   - 不知道就不传——但要提醒用户「没限定所在地，结果里可能有仅限某国的远程岗」。
2. 调 API（GET 或 POST JSON 都行）：
   ```bash
   curl -G "${MUICV_API_BASE}/jobs/search" \
     ${MUICV_API_KEY:+-H "Authorization: Bearer ${MUICV_API_KEY}"} \
     --data-urlencode "q=资深后端 Go 远程" \
     --data-urlencode "country=CN" \
     --data-urlencode "utcOffset=8" \
     --data-urlencode "pageSize=10"
   ```
   可选参数：
   | 参数 | 取值 | 含义 |
   |---|---|---|
   | `q` | 自然语言 | 中英文皆可；会自动识别「远程」「欧洲」「我在中国」「UTC+8」「后端」等 |
   | `workplace` | `remote` / `hybrid` / `onsite` | 办公方式 |
   | `region` | `worldwide` / `americas` / `north-america` / `latam` / `emea` / `europe` / `apac` | 岗位覆盖的大区 |
   | `category` | `engineering` / `data` / `design` / `product` / `devops` / `security` / `qa` | 职能 |
   | `country` | ISO alpha-2 | **求职者**所在国：排除不接受该国候选人的岗位（如仅限美国的远程岗） |
   | `utcOffset` | -12 ~ 14（可 5.5） | **求职者**时区：排除时区要求不重叠的岗位 |
   | `kind` | `collected` / `community` | 来源 |
   | `ignore` | 逗号分隔的上面的 key | 不要从 q 自动识别这些条件（用户说「别限定地区」时用） |
   | `page` / `pageSize` | 1.. / 1..50 | 分页 |
3. 返回 `{ items, page, hasMore, mode, filters, detected }`：
   - `filters` 是实际生效的条件，`detected` 是其中从 q 自动识别的 key——**要告诉用户识别出了什么**，
     识别错了就带 `ignore=<key>` 重搜。
   - `mode`：`hybrid`（正常）/ `keyword`（语义暂不可用，只有关键词）/ `latest`（没给 q，按时间）。
   - 每个 item 有 `workplace`、`allowedCountries`、`allowedRegions`、`utcOffsetMin/Max`、`officeLocations`：
     列表展示时把地域限制说清楚（如「远程 · 仅限 欧洲 · UTC-1 ~ UTC+3」）；全空 = 未声明限制，提醒用户投前看原文。
4. 用户挑中某个岗位 → 用它的 `url` 走 `fetch` 子任务落盘到 `targets/`，再 `match`。

### 注意

- 只列结果、给建议，**不替用户投递**。
- 地域限制是从原文规则 + 模型抽取的，可能有误；关键限制（签证、工作许可）提醒用户以原 JD 为准。

---

## 子任务：fetch

**触发**：用户说「抓这个岗位」「把这个 JD 存下来」，或者 `muicv-generate` 需要 target 但用户只有 URL。

### 流程

1. 从用户消息里拿 URL（比如「https://www.linkedin.com/jobs/view/...」）
2. 调 API：
   ```bash
   curl -X POST "${MUICV_API_BASE}/jobs/fetch" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ${MUICV_API_KEY}" \
     -d '{"url": "<the url>"}'
   ```
3. API 返回 `{ markdown, meta: { title, company, source_url, fetched_at, description } }`
4. 写入 `targets/<slug>.md`：
   - slug 规则：`<company-slug>-<title-slug>`，小写 kebab-case，去特殊字符
   - 例：`google-software-engineer-l5.md`
   - 如果文件已存在 → 问用户"已有这个 target，要覆盖吗？"
5. 文件格式：
   ```markdown
   ---
   type: target
   company: Google
   title: Software Engineer L5
   source_url: https://www.linkedin.com/jobs/view/...
   fetched_at: 2026-04-24T10:15:00Z
   ---

   ## JD 正文

   <API 返回的 markdown，原样放这里>
   ```
6. 告诉用户：已保存到 `targets/xxx.md`，问"要不要立刻做 match 分析？"

### 常见失败

- **`401 missing-api-key` / `401 unauthorized`**：你的 `MUICV_API_KEY` 没带 / 被拒。按下方「错误处理小抄」处理；**不要重试**
- **`402 insufficient-balance`**：余额不够。把响应里的 balance/required 念给用户，让他去 https://muicv.com/dashboard 充值
- **`200` 但 markdown < 120 字 / 含登录提示**：JD 站点本身要登录才看（LinkedIn 部分岗位、内推链接等）。建议用户手动复制 JD 正文，让 skill 直接写到 `targets/<slug>.md`（跳过 API）
- **超时**：重试一次；仍失败就换 URL
- **抓到的内容有很多站点菜单/页脚噪音**：Readability 不完美，可以让用户确认 md 文件后手动清理

---

## 子任务：match

**触发**：用户说「分析这份 JD 和我的匹配度」「评估一下我能投这个岗位吗」「跟我素材比比」。

### 流程（纯本地，无 API）

1. 确认目标：问用户用哪个 target（如果没指定就列出 `targets/*.md`）
2. Read target md 的正文，抽取关键词（技术栈、职责、软技能、年限要求等）
3. Glob `{experience,projects,skills.md,education.md,achievements.md}/**/*.md` 全扫（相对素材库根），抽出"用户有什么"
4. 做比对：
   - **覆盖的关键词**（素材里明确提到）
   - **未覆盖的关键词**（JD 要但素材里找不到）— 这是关键产出
   - **素材里相关度高但没进核心岗位描述的**（潜力点）
5. **必须用 `write_file` 工具**写到 `match/<target-slug>-<YYYY-MM-DD>.md`
   （相对素材库根，公约见 prelude）。**不要在对话里粘整份报告**——
   只给结论一句话 + 路径，详情让用户去右栏预览。

   文件内容用这个结构：

   ```markdown
   ---
   type: match
   target: targets/google-swe.md
   generated_at: <ISO>
   ---

   # Match 报告：targets/google-swe.md

   **结论**：🟢 大部分匹配 / 🟡 部分匹配 / 🔴 差距明显

   ## JD 要求 vs 素材覆盖

   | JD 要求 | 覆盖？ | 来源素材 |
   |---|---|---|
   | TypeScript | ✅ | experience/acme-2023.md, skills.md |
   | Kubernetes | ❌ | 素材里未找到 |
   | 5 年以上经验 | ✅ | experience/acme-2023.md + startup-2021.md 累计 5.5 年 |
   | ...

   ## 建议

   ### P0 补素材
   - Kubernetes — JD 里出现 4 次。如果你有相关经验，用 `muicv-core` 补一段
   - <...>

   ### P1 高潜力但 JD 没明说
   - 你素材里有"设计系统"经验，JD 虽然没列但这类公司都重视，generate 时值得强调

   ## 下一步

   - 如需生成针对这个 JD 的简历：`muicv-generate`
   - 如需补素材：`muicv-core` 的 add-experience / add-project
   - 如果匹配度太低，考虑换岗位
   ```

### 原则

- **不建议用户"编造"来覆盖 JD**：缺就是缺，如实告诉
- **和 muicv-critique 的区别**：match 是 "能不能投"（JD vs 素材），critique 是 "简历写得好不好"（version vs 标准）

---

## 子任务：apply

**触发**：用户说「帮我准备投递」「写个 cover letter」「我要投这份，帮我准备材料」。

### 流程（纯本地，无 API）

1. 确认目标 target（同 match）
2. Read 所有 `profile.md`、相关的 experience / project 素材
3. 如果之前跑过 match，优先用 match 结论；否则简单过一遍关键字覆盖
4. **必须用 `write_file` 工具**生成 cover letter 草稿到 `applications/<company-slug>-<YYYY-MM-DD>.md`（相对素材库根）。**不要把 cover letter 整段贴进对话**——产物落盘才能在右栏预览、迭代、导出：

   ```markdown
   ---
   type: application
   target: targets/google-swe.md
   company: Google
   title: Software Engineer L5
   prepared_at: 2026-04-24T10:30:00Z
   ---

   ## Cover Letter

   <3~5 段的求职信。核心原则：
   - 用素材里真实的经历和数字，不编造
   - 对齐 JD 的关键要求，把最匹配的 2~3 个经历讲清楚
   - 语气专业但不僵硬；避免套话>

   ## 投递 Checklist

   - [ ] 简历版本已生成（建议跑 `muicv-generate` + `muicv-render`）
   - [ ] Cover letter 已定稿（就是上面这段）
   - [ ] LinkedIn / 个人网站链接已更新
   - [ ] 如果 JD 要求作品集，准备好 3-5 个最强项目的链接
   - [ ] 投递前最后检查：联系方式（邮箱、电话）是否正确
   - [ ] （如果岗位是英文 JD）英文版简历和 cover letter 是否都准备了

   ## 备注

   <任何给用户自己的提醒，比如"JD 明确要 Kubernetes，你素材里没有，投的时候心里有数">
   ```

5. 如果目录 `applications/` 不存在（理论上 muicv-core 已经建，但保险）→ Write 前先 mkdir
6. 告诉用户路径，问是否要调整 cover letter

### 原则

- **不自动投递**。生成完 cover letter，任务就结束。
- **cover letter 语言跟 JD 一致**（英文 JD → 英文信；中文 JD → 中文信）
- **禁止站点自动化**。用户如果说"帮我直接投到 LinkedIn"，明确拒绝，告诉他要自己来做

---

## 与其他 skill 的协作

```
muicv-jobs:fetch  ──→  targets/xxx.md
                          │
                          ▼
muicv-jobs:match  ──→  报告（评估是否值得投）
                          │
          不足 → muicv-core（补素材）
          够 → 下一步
                          │
                          ▼
muicv-generate    ──→  versions/xxx-date.md
                          │
                          ▼
muicv-critique    ──→  评审报告
                          │
          需要改 → 回 muicv-generate 或改素材
          OK   → 下一步
                          │
                          ▼
muicv-render      ──→  versions/xxx-date.pdf
                          │
                          ▼
muicv-jobs:apply  ──→  applications/xxx-date.md（cover letter）
                          │
                          ▼
                     用户手动投递
```

---

## 错误处理小抄（仅 `fetch` 适用）

每条响应都尽量翻译成"用户能直接行动"的话，不要原样抛 HTTP 状态码。规范见 [docs/skill-api-key.md](../../docs/skill-api-key.md)。

| 现象 | 给用户怎么说 |
|---|---|
| `MUICV_API_KEY` 没 export | 走前置检查里的 API key 教育流程，五步详细发给用户 |
| `MUICV_API_KEY` 格式异常（不匹配 `/^mui_[A-Za-z0-9]{32}$/`）| "你这个 key 看起来不像 muicv 发的。可能复制时漏了字符或多了空格、引号；去 https://muicv.com/dashboard/api-keys 重新发一份再 export 试试。" |
| `401 missing-api-key` / `401 unauthorized` | "muicv 拒了这个 key（可能在 dashboard 撤销过、或者过期）。去 https://muicv.com/dashboard/api-keys 重新发一份，更新 shell rc 后 `source` 一下再来。" **不要重试**。 |
| `402 insufficient-balance` | 把响应里的 `balance` / `required` 念给用户："你的余额不够这次抓 JD（需 X，剩 Y）。去 https://muicv.com/dashboard 充值后重试。" |
| `429 rate-limited` | "调太频了，等 60s 再试。" |
| `502` / 网络错 / 超时 | 重试一次；仍失败提示去 https://status.muicv.com 看服务状态，或换 URL |
