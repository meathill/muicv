---
name: muicv-core
description: 管理本地 Markdown 简历素材库。帮用户在工作目录下收集、更新、整理简历原始材料（工作经历、项目、教育、技能、亮点）。使用场景：当用户提到「简历」「CV」「resume」「求职」「工作经历」「我在 X 公司做过」「我做过一个项目」「整理我的素材」等；或者用户希望把零散的职业信息结构化地存到本地 Markdown 以便后续生成不同版本的简历。**第一次在一个项目里被调用时会自动检测并引导用户初始化目录结构，用户无需显式调用 init**。
---

# muicv-core

这个 skill 帮用户在**工作目录**下维护一个简历素材库，所有数据以 Markdown + YAML frontmatter 的形式直接存在工作目录里（`profile.md`、`experience/`、`projects/` 等顶层），由用户用 git 自己管理。Skill 只做"引导收集 / 追加 / 整理"，不替用户管版本。

> **路径约定（重要）**：本文档里所有 `profile.md` / `experience/` / `versions/` 等路径，都是相对**素材库根**的。素材库根 = prelude 探查到的 `profile.md` 父目录；新建项目时 = 工作目录本身。**不要凭空在 `.claude/muicv/` 或 `muicv/` 下面再嵌一层**。

配套的生成、评审、渲染、抓 JD、云同步等工作由以下 skills 完成：
- `muicv-generate` — 针对某个目标岗位生成特定版本简历
- `muicv-critique` — 对已生成的版本做 STAR / 关键词 / 长度评审
- `muicv-render` — 调服务端 API 把 markdown 渲染成 PDF
- `muicv-jobs` — 抓 JD、匹配、辅助投递
- `muicv-sync` — 把整个素材库同步到 muicv 云端 / 从云端拉回来（黑盒、自动化）
- `muicv-git` — 把素材库放进自己的 git repo（GitHub / GitLab / 自建），白盒版本管理；可以和 muicv-sync 并用
- `muicv-interview` — 模拟面试（面试**前**练习）：题目按 JD × 简历 × 轮次 × 级别 × 类别 × 输入方式动态推导。支持同对话串多轮（hiring-manager → hr）+ 即时复盘 + review 子模式。语音输入（client）走完整反馈维度，打字（skill）走降级反馈
- `muicv-debrief` — 真实面试复盘（面试**后**回顾，写到 `debriefs/<company>-<date>.md`）
- `muicv-coaching` — 就业辅导：跳槽 / offer / 转方向 / 薪资谈判等开放式咨询

---

## 前置检查（prelude 已替你做）

新对话第一次工具调用一定是 `glob_files("**/profile.md")` 探查素材库。
按 prelude 的分支处理：
- 没匹配 → 走下面的「初始化流程」
- 有匹配 → profile.md 父目录 = 素材库根，继续执行用户的实际意图（添加经历 / 项目 / 更新 / 整理）

## 初始化流程（自动触发）

当探查到没有任何 `profile.md` 时：

### 1. 简要说明（一句话）

告诉用户："看起来这是你第一次在这个项目里维护简历素材。我会在工作目录下建立一份本地简历素材库，数据就是 Markdown 文件，你可以用 git 自己管。"

### 2. 一次性问清基础信息（不要挤牙膏）

用一轮问话收集：
- **姓名**（必填）
- **目标岗位方向**（例如"前端工程师"/"产品经理"；可留空，后面补）
- **所在城市**（可留空）
- **邮箱、电话、主要链接**（可留空，用户可以说"先不填"）

不要追问次要字段。用户提供多少就用多少。

### 3. 创建素材骨架

生成以下核心文件（用 Write 工具，路径都**相对工作目录根**——不要嵌 `muicv/` 或 `.claude/muicv/` 子目录）：

> 注意：不要为了占位写 `.gitkeep`。桌面端 `write_file` 会自动创建父目录；Claude Code / Codex 等环境也应在真正有产物时再创建对应目录。`.gitkeep` 会制造大量无意义工具调用，不利于稳定性。

```
<工作目录>/
├── profile.md            # 用第 2 步收集的信息填 frontmatter + summary 占位
├── experience/           # 工作经历素材；有内容时写 experience/<company-slug>-<year>.md
├── projects/             # 项目素材；有内容时写 projects/<slug>.md
├── targets/              # muicv-jobs:fetch 或手工粘贴的 JD
├── versions/             # muicv-generate 产出的简历版本（.md + 同名 .pdf）
├── applications/         # muicv-jobs:apply 产出的 cover letter
├── critiques/            # muicv-critique 产出的评审报告
├── debriefs/             # muicv-debrief 产出的真实面试复盘
├── interviews/           # muicv-interview 产出的模拟面试题目反馈（👍/👎 题库迭代）
├── audio-reviews/        # muicv-audio-review 产出的录音复盘（STT 转写 + 分析）
├── match/                # muicv-jobs:match 产出的匹配度报告
├── education.md          # 带占位说明的骨架
├── skills.md             # 带占位说明的骨架
└── achievements.md       # 带占位说明的骨架
```

`profile.md` 模板（示例，实际字段由用户输入决定）：

```markdown
---
type: profile
name: 张三
title: 资深前端工程师
location: 北京
email:
phone:
links: []
---

## Summary

<2~4 句自我介绍，后续可以随时让 muicv-core 帮你补。>
```

`education.md` / `skills.md` / `achievements.md` 骨架示例：

```markdown
---
type: education
---

## 学历

- 学校 / 专业 / 学位 / 起止
```

```markdown
---
type: skills
---

## 技能

- 编程语言：
- 框架/工具：
- 领域专长：
```

```markdown
---
type: achievements
---

## 亮点 / 作品 / 奖项

- （每一条 1~2 行，后面在生成简历时会挑选使用。）
```

### 4. 引导下一步

告诉用户："骨架已就绪。接下来你可以这样继续：

- 「加一段在 X 公司做 Y 的经历」— 我会创建 `experience/x-xxxx.md`
- 「我做过一个项目叫 Z」— 我会创建 `projects/z.md`
- 「整理一下我的素材」— 我会去重、合并、让描述更具体（但不会编造）
- 素材差不多了之后，可以说「抓这个岗位」（`muicv-jobs`）、「针对这个 JD 生成简历」（`muicv-generate`）
- 想换机器或备份时，说「同步到云端」/「从云端恢复」（`muicv-sync`，黑盒）；或「推到 GitHub」/「git clone 我的简历」（`muicv-git`，白盒）

或者你也可以直接打开工作目录里的 `profile.md` 自己编辑，我会读最新内容。"

### 5. 提示 .gitignore（可选）

如果工作目录里有 `.gitignore`，问一次："这些素材文件（profile.md 等）要入仓库还是 ignore？"然后按用户选择处理（入仓库 = 什么都不做；ignore = 追加相关条目到 `.gitignore`）。不强求用户现在回答。

---

## 子任务：import-resume（用户上传现成简历）

**触发**：

- user message 末尾出现 prelude 描述的 `[附件]` block 且至少一个附件是 PDF / DOCX / Markdown / 文本 / **图像**（路径在 `inbox/` 下），**或**
- 用户明说 "我上传了一份简历你帮我导入"、"按这个简历建素材库"、"解析这个 PDF / 截图" 等等。

**流程**：

### 1. 把附件读完

- PDF / DOCX：`read_file` 那个 `.txt` sidecar（路径就在 `[附件]` block 里写明了）
- Markdown / 文本：`read_file` 原文件
- **图像**：已经作为 `input_image` 直接附在 user message 里，你 vision 直接看图，**不要 `read_file` 图像文件**——内容就在你眼前。把图里看到的人名 / 公司 / 时间 / 经历明确摘出来。
- 多个附件全部读完（看完）再开始分析，不要边读边写

### 2. 抽取结构化字段

按下面这个 schema 在心里把简历内容拆开：

- profile：姓名、目标岗位方向、城市、邮箱、电话、链接
- experience[]：每段经历的 company / title / start / end / location / stack / 职责 / 亮点
- projects[]：每个项目的 name / role / start / end / stack / url / 描述 / 亮点
- education：学校 / 专业 / 学历 / 起止
- skills：分类整理
- achievements：奖项 / 证书 / 公开作品

**绝不编造**：解析不出来的字段宁可空着或在 frontmatter 里写 `?`，等用户后面补。日期解析模糊（比如只有 "2023" 没月份）就保留原值并标记 `start: 2023-?`。

### 3. 跟现有素材库比对

- `glob_files("**/profile.md")` 已经在 prelude 跑过，知道有没有素材库
- 已有素材库：再 `glob_files("experience/*.md")` / `glob_files("projects/*.md")` 看看有没有同名/同公司同年份的条目，**避免覆盖**
- 没素材库：第一次用，等下要走完整 init

### 4. 给用户一份"行动清单"等他点头

**这一步是硬规则：没拿到用户明确确认前，禁止 `write_file`。**

清单格式示例：

```
准备改这些（请确认 / 调整 / 跳过）：

新建：
✚ profile.md
✚ experience/acme-2023.md（ACME Corp · Senior Frontend · 2023-03 ~ present）
✚ experience/foobar-2021.md（FooBar · Frontend · 2021-08 ~ 2023-02）
✚ projects/mui-cms.md（Mui CMS · Tech Lead）
✚ education.md
✚ skills.md
✚ achievements.md

可能冲突（已存在，需要你决定）：
⚠ experience/acme-2023.md 已存在，要 [覆盖] / [合并] / [跳过]？
```

把待写文件路径 + 关键字段（公司 / 职位 / 时间）一起列，让用户能一眼看明白。

### 5. 用户确认后再 write_file

- 全部确认 → 按 add-experience / add-project 的 frontmatter schema 一一 `write_file`
- 部分跳过 → 只写用户确认那几个
- 全部取消 → 啥也不写，提示"附件已经在 inbox/，你随时可以让我重新解析"

### 6. 收尾

- 列出最终落盘的文件路径（host 自动出工件卡片）
- 告诉用户："导入完了。建议你打开 profile.md 检查日期 / 联系方式有没有偏差，
  也可以让我『整理一下我的素材』（organize 子任务）做去重和润色。"

---

## 子任务：add-experience

**触发**：用户说"加一段工作经历"、"我在 X 公司做过"、"我 2023 年在 Y 做前端"等。

1. 先确认 prelude 已经探查过素材库且根存在；不存在就先走初始化流程。
2. 收集以下字段（缺哪个问哪个，但也要一次问清，不要挤牙膏）：
   - `company`（必填）
   - `title`（必填，例如 "Senior Frontend Engineer"）
   - `start`（ISO 年月，例如 "2023-03"）
   - `end`（ISO 年月 或 `'present'`）
   - `location`（可选）
   - `stack`（技术栈数组，可选）
   - 职责（多条）
   - 亮点（动词开头；如果有 **outcome 量化指标**——成果/效率/收益的变化——就补上；
     仅有"3 个站点"这类 scope 数字时，**不要单独标"量化"**，写进 Action 描述里就行。可选）

> **「量化」= Action 之后产出的 outcome 指标**（成果/效率/收益变化），不是 scope/编制/时长/件数。
> ✅ 转化率 +12% · 退货率 8%→3% · P75 800ms→320ms · GMV ¥80k→¥260k · 排名 #1（绑结果）
> ❌ "覆盖 3 个站点" · "带 4 人团队" · "维护 30+ 仓库" · "做了 3 年"——这些是 scope，写进 Action，**不要单独标"量化"**
> 素材里没有 outcome 数字时，保留定性描述，**不要为了凑量化而编数字、也不要把 scope 升格成量化**。
> 完整定义见 [docs/quantification-guideline.md](../../docs/quantification-guideline.md)。

3. 生成文件名：`experience/<company-slug>-<start-year>.md`
   - company-slug：公司英文名小写 kebab-case；如果只有中文名则用拼音
   - 例：`ACME Corp` + 2023-03 → `experience/acme-2023.md`
4. 文件内容：

   ```markdown
   ---
   type: experience
   company: ACME Corp
   title: Senior Frontend Engineer
   start: 2023-03
   end: present
   location: 北京 (Remote)
   stack: [TypeScript, React, Next.js]
   ---

   ## 职责
   - ...

   ## 亮点
   - ...（STAR：情境/任务/动作/结果；R 优先写 outcome 量化（成果/效率/收益变化），没有就保留定性描述，不要把 scope 数字升格成"量化"）
   ```

5. 告诉用户文件路径，问要不要继续加下一段。

## 子任务：add-project

**触发**：用户说"我做过一个项目叫 Z"、"加个项目"等。

类似 add-experience。文件路径 `projects/<slug>.md`，frontmatter：

```yaml
---
type: project
name: Mui CMS
role: Tech Lead
start: 2024-01
end: 2024-06
stack: [Node.js, PostgreSQL]
url: https://example.com
---
```

正文结构：
```markdown
## 背景 / 问题
## 我的角色与动作
## 结果 / 影响
```

## 子任务：update

**触发**：用户说"改下 X 的经历"、"把 acme 那段里的 ... 改成 ..."。

1. 用 Glob 匹配 `**/*.md`（在素材库根范围内），用 Grep 搜 frontmatter 的 `company` / `name` 字段找到目标文件。
2. Read 文件，用 Edit **精确修改**（不要整段重写）。
3. 改完给用户 diff 摘要。

## 子任务：organize

**触发**：用户说"整理一下素材"、"帮我去重"，或执行 generate 前发现素材凌乱。

原则（摘自 `references/organize-prompt.md`，迁移后填充）：

- **只用已出现的事实**：可以合并、改写表达，但不能新增、推断、编造
- **去重**：同一事实的重复表达不保留多份
- **关联**：把同主题的零散记录合并成更完整的一条
- **具体**：优先"可写进简历"的表述，包含时间、对象、技术栈、结果/影响

执行步骤：

1. Glob + Read 扫描所有素材文件
2. 列出发现的问题（重复 / 碎片 / 不完整）给用户看
3. 一组一组和用户确认合并方案，经用户同意后再 Edit 落盘

---

## 数据契约（frontmatter schema 摘要）

完整 TypeScript 类型见 `@muicv/shared` 里的 `MuiCvFrontmatter`（在 `packages/shared/src/schemas/resume-md.ts`）。这里列关键字段。

| 文件 | `type` | 必填字段 | 可选字段 |
|---|---|---|---|
| `profile.md` | `profile` | `name` | `title`, `email`, `phone`, `location`, `links[]` |
| `experience/*.md` | `experience` | `company`, `title`, `start`, `end` | `location`, `stack[]` |
| `projects/*.md` | `project` | `name` | `role`, `start`, `end`, `stack[]`, `url` |
| `education.md` | `education` | — | — |
| `skills.md` | `skills` | — | — |
| `achievements.md` | `achievements` | — | — |
| `targets/*.md` | `target` | `company`, `title` | `source_url`, `fetched_at` |
| `versions/*.md` | `version` | `generated_at` | `target` |
| `applications/*.md` | `application` | `target`, `company`, `title`, `prepared_at` | — |
| `debriefs/*.md` | `debrief` | `company`, `title`, `date` | `round`, `round_label`, `interviewer`, `outcome`, `duration_min` |
| `interviews/*.md` | `interview_feedback` | `company`, `title`, `round`, `level`, `category`, `date`, `mode` | `round_label`, `target`, `version` |
| `audio-reviews/*.md` | `audio_review` | `scenario`, `source`, `duration_min`, `date` | `language`, `related_target`, `related_version` |

日期格式：`start` / `end` 用 `YYYY-MM`，`end` 也可以是 `'present'`。其他时间戳用 ISO-8601。

---

## 原则

- **不要编造**：只能用用户明确说过的事实；不确定就追问或留空，**绝不自行填充**
- **一次问清**：避免挤牙膏式多轮追问，初始化时 / 加一段经历时都是一轮问完
- **文件即真相**：Skill 不在对话里缓存用户信息，每次操作都基于对素材库文件的 Read
- **中文友好**：默认用户讲中文就用中文；用户切英文则跟着切
- **不污染用户 git**：目录下是用户数据，由用户决定入不入库；skill 不主动 `git add/commit`
