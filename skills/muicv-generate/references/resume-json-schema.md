# `*.resume.json` schema

> 给 6 套新模板（t1-classic / t2-minimal / t3-sidebar / t4-tech / t5-timeline / t6-academic）渲染用的**结构化双语**简历数据。schema 来自 [`@muicv/shared`](../../../packages/shared/src/domain/template-resume.ts)，本文件是面向 skill 的人类版本。

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schemaVersion` | `1` | ✅ | 写死 `1`，将来加字段会升 version |
| `lang` | `"zh"` / `"en"` | ✅ | **简历主语言**。模板标题排版语言和预览页语言切换都靠它；目标语言 = 用户明示 > JD 语言 > 素材语言。缺省会被当成中文渲染，英文简历会配中文标题 |
| `name` | `Bilingual` | ✅ | 中英姓名 |
| `title` | `Bilingual` | ✅ | 一行职业 tag，对齐 target JD |
| `tagline` | `Bilingual?` | | 可选的座右铭/价值主张（仅 t5 用） |
| `photoUrl` | `string?` | | R2 上传后拿到的 https URL。**agent 不要碰这个字段**——用户在桌面端预览 drawer 里上传头像时会自动填回。生成阶段留空 / 缺字段即可，绝不能 fabricate |
| `contact` | `Contact` | ✅ | 见下 |
| `summary` | `Bilingual` | ✅ | 2~4 句自我介绍，对齐 target |
| `experience` | `Experience[]` | ✅ | 工作经历 |
| `education` | `Education[]` | ✅ | 教育背景 |
| `projects` | `Project[]` | ✅ | 项目 |
| `publications` | `Publication[]?` | | 发表论文（t6 学术 CV 强相关） |
| `skills` | `Skills` | ✅ | 见下 |
| `languages` | `Language[]?` | | 语言能力 |
| `awards` | `Award[]?` | | 荣誉奖项 |
| `interests` | `Bilingual<string[]>?` | | 兴趣（可选） |

**空 section 语义**：`experience` / `education` / `projects` / `skills` 虽必填，但可以是空数组
`[]`——模板对空 section **整体不渲染**（连标题都不出），不会出现"有标题没内容"的空洞版式；
可选数组（publications / languages / awards / interests）同理。所以素材缺什么就写 `[]` 或省略，放心。

### `Bilingual` 的两种写法

- **单语**：`"产品设计师"` —— 中英两边都用同一份
- **双语**：`{ "zh": "产品设计师", "en": "Product Designer" }`

任何字段两种形式都接受。**素材库只有中文**就写单语字符串，渲染时 `pickLang('zh')` 会拿到对应内容；`pickLang('en')` 也会 fallback 回中文（不会渲出空字符串）。

## 嵌套结构

```jsonc
// Contact
{
  "location": "上海 · 中国" | { "zh": "上海", "en": "Shanghai" },  // 可选
  "email": "you@example.com",        // 可选
  "phone": "+86 138 0000 1234",      // 可选
  "web": "you.studio",               // 可选，纯文本展示，不要 https://
  "github": "github.com/you"         // 可选
}

// Experience（必填字段加 ✅）
{
  "org": "字节跳动" | { "zh": "...", "en": "..." },     // ✅
  "role": "产品设计实习生",                              // ✅
  "period": "2025.06 — 2025.12",                       // ✅ 任意格式字符串
  "location": "上海",                                   // 可选
  "bullets": ["量化成就 1", "成就 2"]                   // ✅ string[] 或 { zh: [...], en: [...] }
}

// Education
{
  "school": "清华大学",         // ✅
  "degree": "硕士 · CS",        // ✅
  "period": "2023 — 2026",     // ✅
  "detail": "GPA 3.92/4.0"    // 可选
}

// Project
{
  "name": "Vela 可视化框架",      // ✅
  "stack": "TS · D3 · WebGL",   // 可选
  "period": "2024 — present",   // 可选
  "desc": "一句话讲清影响。"     // ✅
}

// Publication（仅 t6 学术 CV 用得到）
{
  "title": "「论文标题」",
  "venue": "CHI 2025",
  "authors": "Wei, L., Zhang, M.",
  "year": "2025"    // 可选；不写则模板不渲染年份
}

// Skills
{
  "design": ["Figma", "Sketch"],      // 可选
  "code": ["TypeScript", "Python"],   // 可选
  "research": ["User Interviews"]     // 可选，可双语
}

// Language
{ "name": "中文", "level": "母语" }

// Award
{ "year": "2025", "title": "国家奖学金" }
```

## 最小可用 JSON（拷过去改字段就能跑）

```json
{
  "schemaVersion": 1,
  "lang": "zh",
  "name": "李 凌",
  "title": "前端工程师",
  "contact": {
    "location": "上海",
    "email": "lingwei@example.com"
  },
  "summary": "5 年 web 前端经验，2 段大厂 + 1 段创业，做过 1 亿 DAU 产品的关键链路。",
  "experience": [
    {
      "org": "字节跳动",
      "role": "高级前端工程师",
      "period": "2023.06 — 2025.10",
      "bullets": [
        "主导抖音商家后台改版，关键路径转化 +23%",
        "搭建 12 个核心组件的设计规范，跨 4 个产品线复用"
      ]
    }
  ],
  "education": [
    {
      "school": "清华大学",
      "degree": "计算机科学 · 硕士",
      "period": "2021 — 2023"
    }
  ],
  "projects": [],
  "skills": {
    "code": ["TypeScript", "React", "Node.js"]
  }
}
```

## 跟 markdown 版本的关系

- markdown 版（`versions/<slug>.md`）继续是**主输出**，给老 default 模板和阅读用
- JSON 版（`versions/<slug>.resume.json`）是**同名 sibling**，给 t1~t6 新模板用
- 两份**共享一份事实**——从同一批 source_files 提取，content 必须一致；只是格式不同
- 用户挑模板的时候，render skill 看哪个文件存在：
  - 优先 `*.resume.json`（如果存在）→ JSON 路径 + t1~t6 模板
  - 否则 `*.md` → markdown 路径 + default 模板

## P0 自检对 JSON 同样适用

SPEECH / FAB / KW-MISS 规则跟 markdown 版一模一样跑。命中条目在 JSON 里改的位置就是 `experience[].bullets` / `summary` / `projects[].desc`。
