---
name: muicv-generate
description: 针对某个目标岗位，从本地素材库生成一份定制化的简历 Markdown，落到 `versions/` 下。使用场景：用户说「帮我针对这个岗位写简历」「给 Google SWE 生成一版」「根据这份 JD 定制简历」「基于 targets/xxx 生成」「做一版投递用的简历」等。前置依赖 `muicv-core` 维护的素材库；如果还没有素材或 target，应该先提示用户去 muicv-core 初始化 / 添加素材。
---

# muicv-generate

针对某个目标岗位（`targets/*.md` 里的 JD），从用户本地素材库挑选、排序、改写得到一份投递用的简历 Markdown。输出到 `versions/<target-slug>-<YYYY-MM-DD>.md`。

> 路径都相对**素材库根**（prelude 探查到的 `profile.md` 父目录）。

**核心约束：只能使用素材里已有的事实，不得编造、不得推断。** 缺信息就留空或问用户。

## 前置检查

1. 素材库根是否存在（prelude 探查过）？不存在 → 提示用户调用 `muicv-core` 初始化，不自己动手
2. `profile.md` 是否包含 `name`？缺失 → 提示先完善 profile
3. 用户指定的 target 是否在 `targets/` 下？
   - 如果用户提了具体 target 文件或 JD URL：用它
   - 如果用户只说"帮我生成简历"但没指定：列出 `targets/*.md` 让用户选；如果一个都没有，询问是要生成"通用版"（无 target）还是先补一个 JD（让用户切到 `muicv-jobs` 抓 JD 或手工粘贴到 `targets/` 下）

## 生成流程

### 1. 输入采集

用 Read 加载：

- `profile.md` — 姓名、标题、联系方式、summary
- `experience/*.md` — 所有工作经历
- `projects/*.md` — 所有项目
- `education.md`、`skills.md`、`achievements.md`
- 指定的 `targets/<slug>.md`（如有）

用 Glob 枚举 `experience/` 和 `projects/`，不要假设只有示例里列的那几个。

### 2. 针对 target 的处理

当 target 存在时：

- 从 JD 正文里抽关键词（技术栈、职责、软技能）
- 遍历素材，对每段 experience / project / skill 按"对 JD 的相关度"打个非正式分（高/中/低）
- 排序：相关度高的在前；时间近的在前
- **在每个输出段落前，都确保保留"源文件 + 源 highlight 原文"的可追溯性**（内部思考用；不写到输出里）
- 裁剪：低相关度的段落要么放到后半部分、要么整段略过
- 高亮挑选：每段 experience 选 2~4 条最相关 highlight；每个项目选 2~3 条

当没有 target 时：生成通用版，按时间倒序，保留最具代表性的亮点。

### 3. 改写

- **动词开头**、主动语态
- **按 TASK 法组织每条 highlight**：每条 bullet 至少要覆盖 **A（Action：你具体做了
  什么）**；最好附 **K（Key Result：可量化结果）**；**T（Task：背景）** 可以隐含、
  **S（Skill：技术栈）** 可以融进 A。仅写 T 或仅罗列 S 是空话，会被第 4 步 SPEECH
  自检卡住。完整定义和示例见 [references/prompts.md](references/prompts.md#task-法每条-highlight-的内在结构)
- **可量化则量化**：用户素材里有 outcome 数字（% / 倍数 / 前后对比 / 收益金额变化 / 排名等成果指标）就保留；**素材里没有 outcome 数字，就不要编**。**注意 scope 数字（"3 个站点"、"4 人团队"）不算量化**——保留事实但写进 Action 里，不要单独升格为"量化"成果。详见 [docs/quantification-guideline.md](../../docs/quantification-guideline.md)。
- **避免空话**：把"负责 X"改成"做了 X 的什么动作，产生了什么结果"（前提是素材里有动作和结果）
- 术语对齐 target 的措辞（例如素材写"提升首屏速度"，JD 里叫"improve Core Web Vitals"，可以兼顾两者表达）
- 保持简洁：每条 highlight 一行，不超过两行

### 4. 自检 + 局部修正（write_file 之前必跑）

按 [docs/p0-rules.md](../../docs/p0-rules.md) 的三类规则，逐条 highlight 自检。这是
generate 自己保住 baseline 的关键环节，不依赖用户事后调 critique。

**第 1 轮（首生后）**：

1. **SPEECH 检测**：扫每条 highlight，命中以下任一即标记 `[SPEECH]`：
   - 空心动词开头（"负责"、"参与"、"协助"、"帮忙"、"支持"、"配合"、
     "Responsible for"、"Participated in" 等）且没有具体动作或结果
   - **TASK 法残缺**：只交代背景任务 / 系统是什么（只有 T），没说自己的动作（A）和结果（K）；
     或者只罗列技术栈（只有 S），没动作没结果
   - 纯形容词描述（"一个关键的项目"、"复杂的业务"）
2. **FAB 检测**：把生成里所有数字（% / 倍数 / 前后对比 / 金额 / 排名）和能力声称
   ("精通 X"、"主导 Y") 跟 `source_files` 里的素材逐个比对，对不上的标记 `[FAB]`。
   特别注意：素材里的 scope 数字（"3 个站点"、"4 人团队"）被升格成 outcome 量化
   ("提速 3 倍") 也算 FAB
3. **KW-MISS 检测**（仅有 target 时）：从 target JD 抽核心关键词（标题、Requirements
   前 3 项、正文出现 ≥ 2 次的），对照简历正文 grep，全无的标记 `[KW-MISS]`

**修正动作**：

- `[SPEECH]` / `[FAB]`：回到改写阶段，**只重写命中的那一条** highlight
  （不要重生成整段，避免引入新问题）。SPEECH 用 [docs/p0-rules.md](../../docs/p0-rules.md)
  里的实动词替换表；FAB 删数字回退定性、删虚标技术栈
- `[KW-MISS]`：先回素材库 grep 关键词，可能是 generate 时被裁掉了；找到就把对应
  highlight 补回简历。**真的找不到** → 不要编造，frontmatter 加
  `missing_keywords: [...]`，交付摘要诚实告诉用户

**第 2 轮（修正后再扫一次）**：

- 全部清干净 → frontmatter 写 `self_check: passed`
- 仍有命中 → **不要继续修改**（防止幻觉螺旋）
  - frontmatter 写 `self_check: partial`
  - 在交付摘要里**明确列出**仍未通过的 highlight + 命中的规则名
  - 让用户决定：补素材 / 接受现状 / 手工改

> 设计原则：P0 规则机械化（动词前缀、数字字符串比对、关键词覆盖），不靠主观感觉，
> 把"自己评审自己"的 bias 影响降到最低。P1（量化比例、STAR 完整度）和 P2（长度、
> 排版）仍由 muicv-critique 检查，不进 generate 自检循环。

### 5. 输出结构

**必须用 `write_file` 工具**写两份文件（同 slug + 同日期，一对兄弟）：

1. `versions/<target-slug>-<YYYY-MM-DD>.md` —— markdown 版，旧 default 模板 / 阅读用
2. `versions/<target-slug>-<YYYY-MM-DD>.resume.json` —— 结构化双语版，新 t1~t6 模板用

两份从**同一批 source_files** 提取，事实必须一致；只是格式不同。
JSON 的 schema 看 [references/resume-json-schema.md](references/resume-json-schema.md)（必读，里面有最小可用骨架可以直接抄）。

> 为什么必须双写？markdown 给老 default 模板 + 用户文本阅读；JSON 给 6 套新视觉模板
> （经典商务 / 现代极简 / 双栏侧边 / 技术工程 / 时间线 / 学术 CV）。用户没法预判
> 想用哪套模板，所以 generate 阶段就两个都吐出来，让 render / preview 按需挑。

> **不要把整份简历内容在对话里粘出来给用户看**——那样产物只是聊天记录，没法
> 在右栏预览、没法导出 PDF、没法进入 critique / render 后续流程。整份内容
> 落盘，对话里只摘要要点。

> ⚠️ **frontmatter 必须用 2-space 缩进，禁止任何 tab 字符。** YAML spec 不允许
> tab 作为缩进，js-yaml 会直接抛 `YAMLException`，render 渲染 PDF 时整页会变成
> 「This page couldn't load」错误页（虽然渲染端做了兜底，但 frontmatter 里的
> `target` / `generated_at` / `source_files` 等字段就丢了，影响后续追溯）。
> 写完之后 quick-check：每行 `key:` 之前是 2 个空格，不是 `\t`。

- `target-slug`：target frontmatter 的 company+title，小写 kebab-case；没有 target 时用 `general`
- `YYYY-MM-DD`：当日日期（UTC 或本地都可，保持一致）
- 如果当天同一 target 已生成过：在文件名后加 `-2`、`-3`（不要覆盖历史，让用户决定删哪个）

文件格式（**注意：所有 YAML 缩进都是 2-space，绝不是 tab**）：

```markdown
---
type: version
target: targets/google-swe.md        # 无 target 时省略
generated_at: 2026-04-23T12:00:00Z
self_check: passed                   # passed | partial（第 4 步自检结果，必填）
missing_keywords:                    # 仅 self_check: partial 且 KW-MISS 时出现
  - Golang
source_files:                         # 用到的素材文件（追溯用）
  - profile.md
  - experience/acme-2023.md
  - experience/startup-2021.md
  - projects/mui-cms.md
---

# 张三

Senior Frontend Engineer · 北京 · zhang@example.com · https://github.com/zhang

## Summary

<2~4 句，突出目标岗位需要的核心能力与核心经历>

## 工作经历

### Senior Frontend Engineer — ACME Corp
2023-03 — 至今 · 北京 (Remote) · TypeScript, React, Next.js

- 动词开头的 highlight，1~2 行
- …

### Frontend Engineer — Startup Inc
2021-06 — 2023-02 · 上海 · Vue, Nuxt

- …

## 项目

### Mui CMS · Tech Lead
2024-01 — 2024-06 · Node.js, PostgreSQL · https://example.com

- …

## 教育

### 某大学 · 计算机科学 · 本科
2017-09 — 2021-06

- （若素材里有相关项目/获奖才写 highlight）

## 技能

- 编程语言：TypeScript, JavaScript
- 框架/工具：React, Next.js, Vue
- 领域：前端性能优化、设计系统
```

字段留空规则：缺的字段就省略该行，**不要写"未填写"或"N/A"**。

#### 配套的 `.resume.json` 长这样（最小示例）

```json
{
  "schemaVersion": 1,
  "lang": "zh",
  "name": "张三",
  "title": "Senior Frontend Engineer",
  "contact": {
    "location": "北京",
    "email": "zhang@example.com",
    "github": "github.com/zhang"
  },
  "summary": "Summary 段落，2~4 句。",
  "experience": [
    {
      "org": "ACME Corp",
      "role": "Senior Frontend Engineer",
      "period": "2023-03 — 至今",
      "location": "北京 (Remote)",
      "bullets": [
        "动词开头的 highlight 1",
        "动词开头的 highlight 2"
      ]
    }
  ],
  "education": [
    {
      "school": "某大学",
      "degree": "计算机科学 · 本科",
      "period": "2017-09 — 2021-06"
    }
  ],
  "projects": [
    {
      "name": "Mui CMS",
      "stack": "Node.js · PostgreSQL",
      "period": "2024-01 — 2024-06",
      "desc": "一句话讲清项目影响。"
    }
  ],
  "skills": {
    "code": ["TypeScript", "JavaScript"]
  }
}
```

**详细字段（含双语形式、可选字段、publications / awards / languages 等）**：
[references/resume-json-schema.md](references/resume-json-schema.md)

- `schemaVersion` 写死 `1`
- **`lang` 必写**：`"zh"` / `"en"`，即简历语言（目标语言 = 用户明示 > JD 语言 > 素材语言，
  详见 prompts.md「简历语言」段）。模板标题排版语言和在线预览都靠它，
  缺省会被当成中文渲染，英文简历会配中文标题
- 中英双语字段（如果素材里只有中文）写成纯字符串即可，`pickLang` 会兜底；
  写成 `{ zh: "...", en: "..." }` 是显式双语（内容双语时用户可在预览页一键切换语言）
- bullets 跟 markdown 输出**完全同一批**（已经经过第 4 步自检），不要单独再改

### 6. 交付

两次 write_file 完成后（一份 `.md`、一份 `.resume.json`）：

1. 告诉用户**两个**文件路径（host 会自动在右栏给 markdown 预览卡片；JSON 的也会列出）
2. 简短摘要："相关度最高的 3 条 highlight 是 ..."（这只是摘要，整份在文件里）
3. **报告自检结果**：
   - `self_check: passed` → 一句话："P0 自检通过（无空话 / 无编造 / 关键词覆盖到位）"
   - `self_check: partial` → 列出仍未通过的条目和命中规则名，例如：
     - "1 条 SPEECH 未修正：experience/acme-2023.md 的『负责前端开发工作』，素材里就只有这一句，建议用 muicv-core 补具体动作和结果"
     - "KW-MISS: Golang，素材里未找到，未在简历中虚构。建议补素材或评估岗位匹配度"
4. 建议下一步：
   - `self_check: passed`：可直接用 `muicv-render` 渲染 PDF（markdown 走 default 模板；JSON 可挑 t1~t6 任一模板）；
     或者跟 muicv-render 说"生成在线预览链接"会用 JSON + 默认 `t2-minimal` 出一个 https URL 投递给 HR。
     如需更深度审查（量化比例、STAR 完整度、表达套话等 P1/P2 维度），再调 `muicv-critique`
   - `self_check: partial`：建议先按上面的提示补素材或确认接受现状，再 render；
     调 `muicv-critique` 可拿到完整 P1/P2 清单

## 反例（不要做）

- ❌ 素材里没写数字，输出加上"提升 30%"
- ❌ 素材没说"带团队"，输出写"领导 5 人团队"
- ❌ target 要求 Golang，素材没 Golang，输出硬塞一条"了解 Golang"
- ❌ 覆盖同一天的历史版本（应该加后缀）
- ❌ 一次生成就把所有 experience 全塞进去（应该按相关度裁剪）
- ❌ frontmatter 用 tab 缩进（必须 2-space），会让 PDF 渲染走兜底路径丢字段
- ❌ 跳过第 4 步自检直接 write_file（必跑；这是把简历从"勉强能看"变成"baseline 合格"的关键）
- ❌ 自检命中后陷入 3 轮、5 轮的修正循环（最多 1 轮；改不动就标 `partial` 让用户决定，不要硬撑）
- ❌ 只写 `.md` 不写 `.resume.json`（两份都必须，新模板靠 JSON）
- ❌ `.resume.json` 跟 `.md` 内容对不上（必须用同一份事实，bullets / summary 完全一致；只是格式差异）
- ❌ JSON 里编 `photoUrl` URL（agent 不要碰这个字段；用户在桌面端预览 drawer 里上传后会自动填回，绝不能 fabricate）

## Prompt 细节参考

核心 prompt 在 `references/prompts.md`（生成时加载），里面是更细的措辞、语气、排版规则。
