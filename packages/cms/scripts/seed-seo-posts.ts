#!/usr/bin/env node
/**
 * 把 SEO 核心技术博文 seed 到 muicv CMS 的 posts 集合（幂等，可重复执行）。
 *
 * 用法：
 *   MUICV_CMS_API_KEY=xxx node scripts/seed-seo-posts.ts            # 正式写入
 *   node scripts/seed-seo-posts.ts --dry-run                        # 只看会写什么
 */

import { type CreatePostRawInput, normalizeUpsertPostInput } from '../mcp/post-input.ts';
import { CmsClient } from '../mcp/payload-client.ts';

export const SEO_POSTS: CreatePostRawInput[] = [
  {
    title: 'AI 写简历的 7 个实战技巧：程序员如何用 AI 改出一份拿大厂 Offer 的硬核简历',
    slug: 'ai-resume-tips-for-developers',
    section: 'jobs',
    status: 'published',
    summary:
      '很多程序员用 AI 改简历，结果往往是「满篇假大空的形容词」或「千篇一律的套话」。本文系统拆解如何用 AI 挖掘深层技术难点、量化业务指标、提炼 STAR 项目亮点，并给出真实修改前后对比。',
    tags: ['求职攻略', '简历技巧', 'AI工具', '程序员'],
    keywords: ['AI写简历技巧', '程序员简历优化', 'AI简历修改', 'STAR原则', '大厂简历模板', 'ATS优化'],
    author: 'Mui简历',
    publishedAt: '2026-08-25T00:00:00.000Z',
    seoTitle: 'AI 写简历的 7 个实战技巧：程序员如何用 AI 改出高通过率硬核简历 - MuiCV',
    seoDescription:
      '程序员如何正确用 AI 优化简历？从 STAR 原则、技术深度挖掘、量化指标提炼到 ATS 关键词对齐，7 个实战技巧与真实案例对比，助你拿到更多面试。',
    bodyMarkdown: `在 AI 时代，越来越多的程序员开始使用大语言模型（如 ChatGPT、Claude、DeepSeek 或 MuiCV）来辅助修改简历。然而，很多人得到的反馈却是：**「这篇简历一看就是 AI 写的，充满了空话套话，毫无技术细节。」**

HR 和技术面试官每天看上百份简历，对「显著提升了系统性能」「极大优化了用户体验」这种 AI 常见的车轱辘话早已免疫。

那么，程序员究竟该**如何正确利用 AI**，改出一份既有**深度技术硬核细节**、又有**严谨量化结果**的高通过率简历？以下是经过数百位开发者验证的 7 个实战技巧。

---

## 技巧 1：拒绝直接让 AI「帮我美化」，改用「技术采访者」角色

最差的 Prompt 往往是：*「请帮我美化这段简历：负责后端接口开发，优化了数据库查询。」* 这样出来的结果必然是一堆华而不实的形容词堆砌。

**正确的做法是让 AI 扮演严苛的架构师或技术面试官，通过追问帮你想起遗忘的技术细节：**

> **推荐 Prompt：**
> 「请你扮演一位资深后端技术面试官。我将提供一段简要的项目经历，请不要直接帮我润色，而是向我提出 3~4 个关键技术追问（例如：遇到了什么瓶颈？并发量与数据量是多少？采用了什么具体架构与排查工具？指标提升了多少？），直到我补充完细节后再帮我提炼。」

通过这种「对话式追问」，AI 能帮你把原本干瘪的一句话，扩展成有上下文、有架构选型、有压测数据的硬核经历。

---

## 技巧 2：严格遵循 STAR 法则与量化公式（XYZ Formula）

Google 招聘团队推荐的简历黄金公式是：**Accomplished [X] as measured by [Y], by doing [Z]**（通过做了 [Z]，达成了 [X] 成果，其衡量指标为 [Y]）。

| 维度 | 普通描述（AI 常见泛化生成） | 优秀硬核描述（结合公式微调） |
| :--- | :--- | :--- |
| **前端** | 优化了前端首屏加载速度，提升了用户体验。 | 针对 10 万+ 日活看板，采用 Next.js App Router 结合 Turbopack 拆分微前端，使首屏 LCP 耗时从 **3.4s 降至 0.82s（提升 76%）**。 |
| **后端** | 负责高并发下单系统的性能调优与重构。 | 针对秒杀场景重构交易中台，引入 Go + gRPC + Redis 多级缓存与 Kafka 削峰，支撑 **12 万 QPS 峰值流量**，P99 延迟稳定在 **14ms 以内**。 |
| **数据/AI** | 训练了分类模型，改善了推荐召回效果。 | 搭建企业级 RAG 混合检索与 BGE-Rerank 重排流水线，检索问答准确率从 **78.5% 提升至 94.8%**，回答幻觉率降低 **62%**。 |

---

## 技巧 3：让 AI 从目标岗位 JD 中提炼关键词并对齐

很多优秀的工程师简历之所以初筛被刷，是因为没有命中招聘系统（ATS）或 HR 搜索的关键词。

**实操流程：**
1. 收集 3~5 个心仪公司的目标岗位 JD（Job Description）；
2. 把 JD 粘贴给 AI，要求：*「请提取出以下岗位 JD 中的核心技术栈、架构要求、高频业务词与加分项。」*
3. 对比自己的技能库与经历，让 AI 针对性地在简历的项目 Bullet 中自然嵌入这些词汇（例如：将模糊的「分布式缓存」具体化为「Redis Cluster 哨兵模式与 BigCache 本地多级缓存」）。

---

## 技巧 4：用「强动词（Action Verbs）」替代弱动词

中文简历中常见的大量弱动词（如「负责」「参与」「协助」）会极大地削弱技术主导力。

让 AI 强制使用**高技术密度的动词**开篇：
- 架构设计类：**主导架构演进、重构、抽象、解耦、设计**
- 性能攻坚类：**排查、定位、调优、压测、压缩、削峰**
- 效率交付类：**落地、搭建、推行、规范、自动化**

---

## 技巧 5：控制 AI 生成的长度与信息密度

简历的核心是**信息密度**，而不是字数。一份优秀的单页技术简历，每个经历点的长度应当控制在 **1.5 行 ~ 2 行**（中文约 40~70 字）。

让 AI 润色时务必加上约束限制：
> 「请将每条经历精炼为 50~65 字以内的单个 Bullet，严禁使用『众所周知』『在此过程中』等废话，保证每句话都包含：**动词 + 技术方案 + 业务场景 + 量化收益**。」

---

## 技巧 6：警惕 AI 编造虚假数据与虚空架构

大模型很容易在润色时「过度发挥」，替你加上从未用过的技术或虚构的业务指标。
- **牢记底线**：面试官一定会深挖简历上的每一个技术名词和数字！
- 让 AI 生成后，必须逐条对照：这个指标我有证据/日志支撑吗？这个开源库的底层原理我能讲清楚吗？如果不能，坚决换成自己真正掌握的技术。

---

## 技巧 7：借助结构化 AI 简历工作台（如 MuiCV）进行闭环管理

单纯在网页聊天框里复制粘贴，很容易导致格式崩坏、排版不对齐、以及中英文难以同步维护。

使用 **MuiCV** 这类专为开发者打造的 AI 简历工作台，你可以：
1. **素材存本地**：把经历与项目作为原子素材保存在本地，隐私安全；
2. **针对不同 JD 一键派生**：同一个素材库，一键针对前端架构师、全栈或海外岗位派生出不同版本的量化简历；
3. **专业 A4 渲染引擎**：内置极客科技、经典双栏等 6 套设计模板，保证导出的 PDF 100% 符合 ATS 机器解析与打印排版标准。
`,
  },
  {
    title: '中国程序员如何写出一份地道的英文简历？外企与 Remote 远程求职避坑指南',
    slug: 'english-resume-for-chinese-developers',
    section: 'jobs',
    status: 'published',
    summary:
      '中文简历直翻英文最容易踩的坑：动词无力（Responsible for 泛滥）、中式英语表达、版式不符合欧美 ATS 标准。本文梳理强动词库（Action Verbs）、单页规范与外企 HR 偏好。',
    tags: ['英文简历', '外企求职', 'Remote', '程序员'],
    keywords: [
      '程序员英文简历',
      '外企简历模板',
      '英文简历Action Verbs',
      'Remote求职简历',
      'ATS英文简历',
      '英文简历在线制作',
    ],
    author: 'Mui简历',
    publishedAt: '2026-08-25T00:00:00.000Z',
    seoTitle: '中国程序员如何写出地道英文简历？外企与 Remote 求职避坑指南 - MuiCV',
    seoDescription:
      '中国程序员写英文简历指南：告别 Responsible for，掌握 50+ 强力 Action Verbs 与量化表达公式，符合欧美 ATS 筛选标准，助你顺利斩获外企与远程工作 Offer。',
    bodyMarkdown: `随着海外外企（如 Microsoft、Google、Amazon、Apple）国内研发中心以及全球 Remote（远程办公）岗位的普及，越来越多的国内程序员开始准备英文简历。

然而，很多技术实力极其过硬的工程师，投递海外岗位时却频频石沉大海。查看他们的英文简历，最常见的问题并不是「语法错误」，而是**「中式直翻味过浓、动词乏力、版式不符合欧美 ATS 规范」**。

本文将手把手拆解中国程序员写英文简历的核心要点与避坑法则。

---

## 一、三大最致命的英文简历硬伤

### 1. 滥用 "Responsible for..." 或 "Participated in..."
很多国内程序员的第一反应是将「负责系统架构设计」直翻为 *“Responsible for system architecture design.”*
在英文招聘语境中，*Responsible for* 是非常消极的弱表达，它只说明了这是你的职责范围，却没有说明你**具体做了什么、做出了什么成果**。

### 2. 带有个人隐私信息的「国内版式」
欧美外企与海外招聘极其注重反歧视法案（Anti-Discrimination Laws）：
- **绝对不要放**：照片（除非德国等特殊地区）、年龄/出生日期、性别、婚姻状况、政治面貌、具体家庭住址。
- **只需保留**：姓名、求职岗位 Title、所在地（城市/国家即可，如 *Shanghai, China*）、工作邮箱、电话、GitHub / 个人技术博客链接。

### 3. 中式英语直翻（Chinglish）
- ❌ *“Under the leadership of the leader...”*（中式客套话，在英文简历中是严重扣分项）
- ❌ *“Made big contribution to the project...”*（毫无量化信息）
- ✅ *“Spearheaded the migration of 18 microservices to Kubernetes, reducing release cycles from 7 days to 4 hours.”*

---

## 二、程序员必背：50 个核心 Action Verbs 分类速查

在英文简历中，每个 Bullet Point 都必须以**过去式强动词（Past-Tense Action Verb）**开头：

### 1. 架构设计与系统重构 (Architecture & System Design)
- **Architected**（架构设计）: *Architected a multi-tenant SaaS backend with Go & PostgreSQL.*
- **Spearheaded**（带头主导）: *Spearheaded the micro-frontends transition using Module Federation.*
- **Overhauled**（全面重构升级）: *Overhauled the core checkout pipeline, reducing latency by 45%.*
- **Decoupled**（解耦）: *Decoupled monolithic services into 12 autonomous gRPC microservices.*
- **Devised**（设计出方案）: *Devised a multi-tier caching strategy achieving 99.4% hit rate.*

### 2. 性能攻坚与高可用保障 (Performance & Optimization)
- **Slashed / Reduced**（大幅降低）: *Slashed LCP load time from 3.2s to 0.8s via asset preloading.*
- **Scaled**（水平扩展）: *Scaled real-time notification engine to handle 100k+ concurrent WebSockets.*
- **Eliminated**（彻底消除）: *Eliminated memory leaks in Node.js processes using Chrome DevTools heap profiling.*
- **Benchmarked**（基准压测）: *Benchmarked database query plans, cutting slow query occurrences by 80%.*

### 3. 工程化与自动化交付 (Engineering & Automation)
- **Automated**（自动化）: *Automated end-to-end regression testing with Playwright & GitHub Actions.*
- **Standardized**（标准化）: *Standardized TypeScript linting rules across 15 engineering repositories.*
- **Deployed**（部署上线）: *Deployed multi-region Kubernetes clusters with zero-downtime rolling updates.*

---

## 三、Bullet Point 黄金撰写范例（中英对照）

### 前端工程师 (Frontend)
- **中文原稿**：负责重构了前端页面，把加载速度提升了很多，组件库也统一了。
- **地道英文**：*“Led frontend architectural redesign using Next.js 14 and Tailwind CSS, improving Core Web Vitals (LCP) by 76% and reducing code duplication by 40% across 12 product modules.”*

### 后端/架构师 (Backend/Architect)
- **中文原稿**：优化了订单数据库，解决了双十一高并发卡顿问题。
- **地道英文**：*“Architected distributed database sharding (32 DBs, 1024 tables) and Kafka event buffering, scaling transaction throughput to 120k peak QPS at 99.999% SLA.”*

### 全栈与 AI 算法工程师 (Full Stack / AI)
- **中文原稿**：做了基于大模型的知识库问答，效果比之前好。
- **地道英文**：*“Engineered enterprise RAG pipeline combining hybrid search (BM25 + Dense) and BGE-Reranker, increasing QA retrieval precision to 94.8% and cutting hallucinations by 62%.”*

---

## 四、海外求职 ATS 解析与版式规范

1. **单页原则（One-Page Rule）**：工作年限在 7 年以内的工程师，英文简历务必压缩在 **标准 1 页 A4** 纸内。
2. **文本可读性与字体**：使用标准清晰字体（如 Inter、Helvetica、Roboto），避免花哨的非标图标与图片式文本框。
3. **双语版本同步维护**：推荐使用 MuiCV 双语模板引擎，原生支持同一份数据在 \`zh\` 与 \`en\` 视图间自由切换并一键导出标准 A4 PDF。
`,
  },
  {
    title: '程序员如何针对 ATS 招聘筛选系统优化简历？从算法解析到 100% 关键字匹配实操',
    slug: 'how-to-optimize-resume-for-ats',
    section: 'guide',
    status: 'published',
    summary:
      '超过 85% 的大厂和外企使用 ATS 招聘系统进行简历机器初筛。本文深度拆解 ATS 的解析机制、文本框/双栏排版陷阱、关键词匹配算法以及如何通过 MuiCV 提升通过率。',
    tags: ['ATS系统', '简历优化', '求职指南', '面试求职'],
    keywords: ['ATS简历优化', '什么是ATS筛选', '程序员简历ATS', 'ATS关键词匹配', '简历通过率', 'AI简历生成器'],
    author: 'Mui简历',
    publishedAt: '2026-08-25T00:00:00.000Z',
    seoTitle: '程序员如何针对 ATS 招聘系统优化简历？算法解析与关键字匹配实操 - MuiCV',
    seoDescription:
      '深度解析 ATS（Applicant Tracking System）机器初筛原理，避免排版格式雷区，教你科学提取目标岗位 JD 关键词并实现自然高匹配度。',
    bodyMarkdown: `在今天的招聘流程中，当你向腾讯、字节、阿里巴巴、微软、亚马逊或外企投递简历时，**你的第一位读者几乎 100% 不是人类 HR，而是 ATS 系统（Applicant Tracking System，求职者追踪系统）**。

据统计，知名科技公司的每一个技术岗位通常会收到 300~1000 份简历，其中 **超过 75% 的简历在到达招聘官桌前就被 ATS 机器算法直接过滤淘汰**。

很多明明技术非常硬核的候选人，只因为简历格式不兼容或关键词缺失，就被系统误判为「不匹配」。本文将带你透视 ATS 的底层运作机理，并给出清晰可执行的优化清单。

---

## 一、ATS 是如何解析与评估你的简历的？

ATS 的核心处理流水线分为三个步骤：

\x60\x60\x60mermaid
flowchart LR
    A[PDF/Word 文件] --> B[文本抽取 Text Extraction]
    B --> C[实体与分段解析 Section Parsing]
    C --> D[JD 关键词语义加权匹配 Keyword Scoring]
    D --> E[生成候选人匹配度打分 Rank Score]
\x60\x60\x60



1. **文本抽取 (Text Extraction)**：ATS 会将 PDF 还原为纯文本流。如果你的简历使用了复杂的 Canvas 渲染、浮动文本框、不可复制的图片文字，抽取出来的就会是一堆乱码或空白！
2. **段落与实体识别 (Section Parsing)**：算法会寻找标准命名，如 *Work Experience*, *Education*, *Skills*, *Projects*。如果使用了非标小标题（如「我的极客之旅」「曾经战斗过的地方」），系统就无法归类你的工作经历。
3. **关键词语义加权计算 (Scoring & Ranking)**：系统将你提取出的技能与目标职位的 JD 进行匹配打分。只有 Rank 处于前 15%~20% 的候选人，HR 才会点开人工查看。

---

## 二、六大导致 ATS 瞬间把简历判死刑的「排版雷区」

| 排版雷区 | 产生后果 | 正确规范做法 |
| :--- | :--- | :--- |
| **使用 Word/PS 的浮动文本框 (Floating Textbox)** | ATS 的文本抽取器常常直接跳过文本框内容，导致核心项目经历丢失 | 采用标准流式文档排版，依靠 CSS/标准的表格对齐 |
| **将技能写在图标或图片里** | 机器无法读取图片内的技术栈 | 必须使用真实的纯文本格式罗列技能 |
| **使用非标标题（如「技术武器库」）** | ATS 无法识别这是 Skills 段落，直接遗漏整段技能 | 使用国际标准标题：*Skills / 技能清单*、*Experience / 工作经历* |
| **生僻的特殊字符与评分进度条** | 「精通度 80%」这类进度条在解析后变成乱码 | 直接用文本列出技能与分类，不放图形化进度条 |
| **页眉/页脚中放关键联系方式** | 部分老旧 ATS 系统会直接丢弃 Header/Footer 区域的文本 | 姓名、电话、邮箱必须放在正文最上方的 Header 区域 |
| **导出非标准编码的 PDF** | 字符集丢失，在机器端解析出来全是方块乱码 | 使用标准 UTF-8 编码且具备文字图层的矢量 PDF |

---

## 三、如何科学提取 JD 关键词并实现 90%+ 匹配度？

要让 ATS 给你的简历打出高分，关键在于**自然、高密度地覆盖岗位核心关键词**。

### 第一步：词频与技术词提取
将目标岗位的 JD 粘贴到词频工具或 AI 中，提取两类词：
1. **硬技能词（Hard Skills）**：如 *TypeScript*, *Next.js*, *Kubernetes*, *PostgreSQL*, *gRPC*, *CI/CD*, *Microservices*。
2. **领域场景词（Domain Keywords）**：如 *B2B SaaS*, *High Concurrency*, *Core Web Vitals*, *Multi-tenant*, *Data Pipeline*。

### 第二步：关键词同义词与全称/缩写双写
很多 ATS 的分词词典比较机械。为了确保命中，**缩写与全称最好至少同时出现一次**：
- ✅ *RAG (Retrieval-Augmented Generation)*
- ✅ *Kubernetes (K8s)*
- ✅ *CI/CD (Continuous Integration / Continuous Deployment)*
- ✅ *Design Tokens & Design System*

### 第三步：将关键词与量化成果（Metrics）结合
切忌在简历底部粗暴堆砌关键词（这会被现代 ATS 的反作弊模型标记并降权）。必须将关键词融入真实的 Project Bullets 中：
> ❌ 粗暴堆砌：*Skills: React, Next.js, Web Vitals.*
> ✅ 自然结合：*“Architected web analytics platform using **React 19** and **Next.js**, optimizing **Core Web Vitals (LCP)** from 3.2s to 0.8s.”*

---

## 四、为什么使用 MuiCV 生成的简历天生具备 ATS 极高通过率？

MuiCV 在设计之初，就将 **ATS 机器友好性** 与 **人类视觉美感** 深度统一：

1. **标准语义化 DOM 结构**：所有模板均采用标准的 header, article, section, ul, li 语义结构，保证文本抽取器 100% 正确还原层级。
2. **纯矢量文字 A4 渲染**：导出的每一份 PDF 都具备完整可复制的高保真文字图层与标准 UTF-8 字体嵌入，绝无图片伪装或文本框错位。
3. **AI 智能 JD 契合度分析**：内置 AI 对话式助手，能一键读取目标岗位的 JD，自动扫描你的简历素材库，标出缺失的关键高频词，并协助你以真实项目量化改写。
`,
  },
];

function parseArgs(argv: string[]): { dryRun: boolean } {
  return { dryRun: argv.includes('--dry-run') };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2));

  process.stdout.write(`共 ${SEO_POSTS.length} 篇 SEO 核心文章待同步${dryRun ? '（dry run，不写入）' : ''}\n`);
  for (const post of SEO_POSTS) {
    process.stdout.write(`  [${post.section}] ${post.slug} · ${post.title}\n`);
  }

  if (dryRun) {
    return;
  }

  const apiKey = process.env.MUICV_CMS_API_KEY?.trim();
  if (!apiKey) {
    process.stdout.write(
      '提示：未检测到 MUICV_CMS_API_KEY。如需正式写入远端 Payload CMS，请提供环境变量 MUICV_CMS_API_KEY=xxx。\n',
    );
    return;
  }

  const cmsBaseUrl = process.env.MUICV_CMS_URL?.trim();
  const client = new CmsClient({ ...(cmsBaseUrl ? { baseUrl: cmsBaseUrl } : {}), apiKey });
  let created = 0;
  let updated = 0;

  for (const post of SEO_POSTS) {
    const normalized = normalizeUpsertPostInput({ ...post, onConflict: 'update' });
    const existing = await client.findPostBySlug(normalized.payload.slug);
    if (!existing) {
      await client.createPost(normalized.payload);
      created += 1;
      process.stdout.write(`  ✓ 新建: ${post.slug}\n`);
    } else {
      await client.updatePost(existing.id, normalized.payload);
      updated += 1;
      process.stdout.write(`  ✓ 更新: ${post.slug}\n`);
    }
  }

  process.stdout.write(`完成：新建 ${created} 篇，更新 ${updated} 篇。\n`);
}

main().catch((error) => {
  process.stderr.write(`执行失败: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
