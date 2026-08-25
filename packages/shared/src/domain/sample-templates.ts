import type { TemplateId, TemplateResumeData } from './template-resume.ts';

export type TemplateCategory = 'frontend' | 'backend' | 'fullstack' | 'ai' | 'product' | 'design' | 'data' | 'devops';

export type SampleResumeTemplate = {
  slug: string;
  category: TemplateCategory;
  templateId: Exclude<TemplateId, 'default'>;
  accent: string;
  name: { zh: string; en: string };
  role: { zh: string; en: string };
  summary: { zh: string; en: string };
  highlights: { zh: string[]; en: string[] };
  atsKeywords: string[];
  seoTitle: { zh: string; en: string };
  seoDescription: { zh: string; en: string };
  data: TemplateResumeData;
};

export const TEMPLATE_CATEGORIES: Array<{
  key: 'all' | TemplateCategory;
  label: { zh: string; en: string };
}> = [
  { key: 'all', label: { zh: '全部岗位', en: 'All Roles' } },
  { key: 'frontend', label: { zh: '前端开发', en: 'Frontend' } },
  { key: 'backend', label: { zh: '后端架构', en: 'Backend' } },
  { key: 'fullstack', label: { zh: '全栈开发', en: 'Full Stack' } },
  { key: 'ai', label: { zh: 'AI / 算法', en: 'AI & ML' } },
  { key: 'product', label: { zh: '产品经理', en: 'Product' } },
  { key: 'design', label: { zh: 'UI / UX 设计', en: 'UI/UX Design' } },
  { key: 'data', label: { zh: '数据科学', en: 'Data Science' } },
  { key: 'devops', label: { zh: 'DevOps / SRE', en: 'DevOps & SRE' } },
];

export const SAMPLE_RESUME_TEMPLATES: SampleResumeTemplate[] = [
  {
    slug: 'frontend-developer',
    category: 'frontend',
    templateId: 't4-tech',
    accent: '#0284c7',
    name: { zh: '资深前端开发工程师简历模板', en: 'Senior Frontend Engineer Resume Template' },
    role: { zh: '资深前端开发工程师', en: 'Senior Frontend Engineer' },
    summary: {
      zh: '专为中高级前端开发、Web 性能专家打造。突出 React 19 / Next.js 实战架构、微前端演进、Core Web Vitals 优化指标与 Design System 建设成果。',
      en: 'Designed for Senior Frontend Developers and Web Performance Specialists. Highlights React 19/Next.js architectures, micro-frontends, Core Web Vitals optimizations, and Design Systems.',
    },
    highlights: {
      zh: [
        '量化指标突出：量化呈现首屏加载耗时从 3.2s 降至 0.8s、打包体积减少 45% 等硬核数据',
        '架构深度结合：覆盖微前端 Module Federation 拆分、Turbopack 迁移与跨端组件库工程化',
        '高频 ATS 匹配：原生适配 React、TypeScript、Next.js、Tailwind CSS、CI/CD 等招聘关键词',
      ],
      en: [
        'Metric-driven impact: Highlights 75% faster LCP, 45% bundle reduction, and 99.9% web uptime',
        'Deep architectural scope: Covers Micro-frontends, Module Federation, Turbopack, and Design Systems',
        'High ATS keyword density: Pre-tuned for React, TypeScript, Next.js, Tailwind CSS, and Web Vitals',
      ],
    },
    atsKeywords: [
      'React 19',
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Core Web Vitals',
      'LCP / INP 优化',
      '微前端 (Micro-frontends)',
      'Module Federation',
      'Design System',
      'CI/CD 自动化',
      'GraphQL',
      'Zustand / Redux Toolkit',
    ],
    seoTitle: {
      zh: '前端开发工程师简历模板与范文（双语/可导出A4 PDF）- MuiCV',
      en: 'Senior Frontend Engineer Resume Template & Example (Bilingual / PDF) - MuiCV',
    },
    seoDescription: {
      zh: '免费使用资深前端工程师简历模板与优秀范文。包含 React/TypeScript/Next.js/性能优化量化案例，中英双语可在线预览、一键导出 A4 PDF。',
      en: 'Free Senior Frontend Engineer resume template & example. Features quantified React, TypeScript, Next.js, and Web Vitals achievements. Bilingual preview & clean A4 PDF export.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '林子轩', en: 'Alex Lin' },
      title: { zh: '资深前端开发工程师', en: 'Senior Frontend Engineer' },
      tagline: {
        zh: '专注于 React 架构演进、Web 核心性能指标与前端工程化建设',
        en: 'Specializing in React architecture, Web Vitals performance, and modern frontend tooling',
      },
      contact: {
        location: { zh: '上海 · 浦东新区', en: 'Shanghai, China' },
        email: 'alex.lin.frontend@example.com',
        phone: '+86 138-0000-1122',
        web: 'https://alexlin.dev',
        github: 'github.com/alexlin-dev',
      },
      summary: {
        zh: '6 年前端研发经验，深度主导过千万级日活商业化 SaaS 与高并发 Web 应用的前端架构演进。精通 React/Next.js 生态与 TypeScript 类型系统，对前端工程化、微前端治理、Core Web Vitals（LCP/INP）性能优化与 Design System 组件库建设有丰富落地经验。多次带领团队攻克复杂技术重构，追求代码效率与用户体验的极致平衡。',
        en: 'Senior Frontend Engineer with 6+ years of experience architecting high-traffic SaaS and web applications. Deep expertise in React/Next.js ecosystems and TypeScript. Proven track record in micro-frontends, Core Web Vitals (LCP/INP) optimization, and enterprise Design System governance.',
      },
      experience: [
        {
          org: { zh: '星云智联网络科技有限公司', en: 'Nebula Cloud Tech' },
          role: { zh: '前端技术负责人 / 资深架构师', en: 'Lead Frontend Architect' },
          period: '2023.04 - 至今',
          location: { zh: '上海', en: 'Shanghai' },
          bullets: {
            zh: [
              '主导企业级低代码数据看板平台的前端架构重构，采用 Next.js App Router + Turbopack，首屏 LCP 耗时由 3.4s 降至 0.82s，提升 76%',
              '基于 Web Components 与 Tailwind CSS 搭建统一 Design System 组件库，覆盖 12 个业务线，减少重复代码超过 40%，研发交付周期缩短 30%',
              '设计并落地微前端方案（Module Federation），实现 6 个大型独立子应用无缝整合与按需加载，热更新耗时由 45s 降至 3s',
              '制定全链路前端监控体系与 Sentry 异常上报规范，配合 Sentry + Performance API 实现白屏率从 0.18% 降至 0.01%',
            ],
            en: [
              'Led frontend architecture overhaul for enterprise analytics platform using Next.js & Turbopack, slashing LCP from 3.4s to 0.82s (76% improvement)',
              'Built unified Design System with Tailwind CSS & Web Components across 12 product lines, cutting duplicated code by 40% and shortening delivery cycles by 30%',
              'Architected Micro-frontend migration via Module Federation, enabling independent deployments across 6 apps and cutting HMR reload from 45s to 3s',
              'Implemented end-to-end frontend monitoring & telemetry, lowering runtime error rate from 0.18% to 0.01%',
            ],
          },
        },
        {
          org: { zh: '云腾互动信息技术有限公司', en: 'Yunteng Interactive' },
          role: { zh: '高级前端工程师', en: 'Senior Frontend Developer' },
          period: '2020.07 - 2023.03',
          location: { zh: '杭州', en: 'Hangzhou' },
          bullets: {
            zh: [
              '负责核心电商交易链路（商品详情、购物车、订单确认）的性能攻坚，利用 Virtual List 与 Service Worker 离线缓存，交互卡顿率下降 65%',
              '搭建 CI/CD 自动化检测流水线（Biome + Playwright + Bundle Analyzer），将生产构建体积压缩 42%，拦截 90% 以上的基础语法与类型隐患',
              '推进 TypeScript 严格模式全量覆盖，梳理重构 80+ 核心业务 API 契约定义，线上类型错误归零',
            ],
            en: [
              'Spearheaded core e-commerce checkout flow optimization, reducing interaction jank by 65% with virtualized lists and Service Worker caching',
              'Designed CI/CD quality gate with Biome, Playwright, and bundle analysis, reducing bundle size by 42% and preventing regression bugs',
              'Enforced strict TypeScript coverage across 80+ critical endpoints, eliminating client-side undefined type errors',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '同济大学', en: 'Tongji University' },
          degree: { zh: '计算机科学与技术 · 工学学士', en: 'B.S. in Computer Science' },
          period: '2016.09 - 2020.06',
          detail: {
            zh: '主修课程：数据结构、操作系统、计算机网络、编译原理。校级一等奖学金。',
            en: 'Focus on Data Structures, OS, Networking. University 1st Class Scholarship.',
          },
        },
      ],
      projects: [
        {
          name: { zh: 'NextFlow · 现代化富文本协同工作台', en: 'NextFlow · Collaborative Rich-Text Workbench' },
          stack: 'React 19, TypeScript, Tiptap, Yjs, WebSockets, Tailwind CSS',
          period: '2024.01 - 2024.08',
          desc: {
            zh: '基于 CRDT（Yjs）与 Tiptap 开发的多人实时协同编辑系统。实现毫秒级光标同步与冲突解决，单文档支持 50+ 人并发流畅编辑。开源获 2.8k GitHub Stars。',
            en: 'Real-time collaborative editing platform built on CRDT (Yjs) & Tiptap. Supports 50+ concurrent editors with sub-50ms latency. Over 2.8k GitHub stars.',
          },
        },
        {
          name: { zh: 'VitalsScan · Web 性能与无障碍诊断工具', en: 'VitalsScan · Web Vitals & A11y Diagnostics CLI' },
          stack: 'Node.js, Puppeteer, Lighthouse API, TypeScript',
          period: '2023.05 - 2023.11',
          desc: {
            zh: '自动化评测站点 LCP、INP、CLS 指标与 WCAG 2.1 无障碍规范的开源命令行工具，可嵌入 GitHub Actions 自动阻断性能劣化 PR。',
            en: 'Automated CLI for evaluating Core Web Vitals and WCAG 2.1 compliance. Integrates with CI/CD to prevent performance regression.',
          },
        },
      ],
      skills: {
        code: ['TypeScript', 'JavaScript (ESNext)', 'HTML5 / CSS3', 'Node.js', 'Rust (Basic)'],
        design: ['Figma', 'Design Tokens', 'Tailwind CSS', 'Responsive Layout', 'A11y (WCAG 2.1)'],
        research: {
          zh: [
            'React 19 / Next.js App Router',
            'Turbopack / Vite',
            '微前端架构',
            'Web Vitals 性能工程',
            'CI/CD 流水线',
          ],
          en: [
            'React 19 / Next.js',
            'Vite / Turbopack',
            'Micro-Frontends',
            'Core Web Vitals Engineering',
            'CI/CD Pipelines',
          ],
        },
      },
      languages: [
        { name: { zh: '中文', en: 'Chinese' }, level: { zh: '母语', en: 'Native' } },
        {
          name: { zh: '英语', en: 'English' },
          level: {
            zh: '熟练（CET-6 / 具备无障碍英文技术交流与文档编写能力）',
            en: 'Fluent (Professional Working Proficiency)',
          },
        },
      ],
    },
  },
  {
    slug: 'backend-architect',
    category: 'backend',
    templateId: 't1-classic',
    accent: '#0f766e',
    name: { zh: 'Go/Java 后端架构师简历模板', en: 'Backend Architect / Senior Go Engineer Resume Template' },
    role: { zh: '后端架构师 / 资深 Go 工程师', en: 'Backend Architect / Senior Go Engineer' },
    summary: {
      zh: '适用于分布式高并发后端、云原生微服务架构师。突出百万级 QPS 吞吐调优、海量数据分库分表与 99.999% 高可用架构设计。',
      en: 'Engineered for Distributed Systems Engineers and Cloud-Native Backend Architects. Focuses on million-QPS tuning, database sharding, and 99.999% SLA availability.',
    },
    highlights: {
      zh: [
        '高并发量化实操：承载 120,000+ QPS 峰值流量，核心接口 P99 延迟稳定在 15ms 内',
        '架构深度覆盖：涵盖 gRPC 微服务治理、Kafka 消息削峰、Redis 集群多级缓存与分布式事务',
        'ATS 关键词优化：深度契合 Go、Kubernetes、MySQL 分库分表、Docker、Prometheus 招聘规则',
      ],
      en: [
        'High-concurrency metric: Scaled core gateway to 120k+ peak QPS with sub-15ms P99 latency',
        'Architecture coverage: gRPC, Kafka event streaming, multi-tier Redis caching, and Saga transactions',
        'ATS match: Fully aligned with Go, Kubernetes, MySQL Sharding, Docker, and Prometheus criteria',
      ],
    },
    atsKeywords: [
      'Go / Golang',
      'Java / Spring Cloud',
      'Kubernetes (K8s)',
      'gRPC / Protobuf',
      'Kafka / RabbitMQ',
      'Redis 哨兵与集群',
      'MySQL 分库分表',
      '分布式事务 (Saga / Seata)',
      '高并发架构',
      'Prometheus & Grafana',
      'Docker',
      '微服务治理',
    ],
    seoTitle: {
      zh: '后端架构师/Go语言工程师简历模板与范文（双语/PDF导出）- MuiCV',
      en: 'Backend Architect / Senior Go Engineer Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '免费使用后端架构师与资深 Go 语言工程师简历模板。展示高并发、分布式系统、微服务与数据库调优真实项目经验，支持在线编辑与 A4 PDF 导出。',
      en: 'Free Backend Architect and Senior Go Engineer resume template. Highlights high-throughput distributed systems, microservices, and database tuning. Export A4 PDF.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '张博文', en: 'Bowen Zhang' },
      title: { zh: '后端架构师 / 资深 Go 工程师', en: 'Backend Architect / Senior Go Engineer' },
      tagline: {
        zh: '高并发分布式系统、云原生微服务治理与海量数据架构专家',
        en: 'Expert in high-throughput distributed systems, cloud-native microservices & database architecture',
      },
      contact: {
        location: { zh: '北京 · 海淀区', en: 'Beijing, China' },
        email: 'bowen.zhang.arch@example.com',
        phone: '+86 139-1122-3344',
        github: 'github.com/bowenzhang-backend',
      },
      summary: {
        zh: '8 年后端分布式系统设计与研发经验，长期深耕高并发交易系统、海量数据存储与微服务治理。精通 Go 与 Java 语言底层机理，深刻理解 Linux 内核网络 I/O、内存调度与分布式共识算法（Raft）。主导过多次核心系统架构演进，支撑千万级 DAU 峰值流量稳定平稳运行。',
        en: 'Backend Architect with 8+ years designing robust distributed systems and high-throughput transactional backends. Expert in Go, Java, Linux I/O internals, and distributed consensus (Raft). Successfully led cloud-native migrations supporting 10M+ DAU.',
      },
      experience: [
        {
          org: { zh: '万维流转金融科技集团', en: 'FinStream Global Tech' },
          role: { zh: '核心交易系统首席后端架构师', en: 'Principal Backend Architect' },
          period: '2022.01 - 至今',
          location: { zh: '北京', en: 'Beijing' },
          bullets: {
            zh: [
              '主导新一代实时结算中台架构设计，采用 Go + gRPC + Kafka，支撑核心交易 QPS 峰值 120,000+，P99 延迟由 85ms 降至 14ms',
              '针对海量账户流水设计 MySQL 分库分表（32 库 1024 表）与 ElasticSearch 异构索引同步方案，查询吞吐量提升 400%',
              '构建基于 Redis Cluster + 本地内存（BigCache）的多级防击穿缓存体系，缓存命中率达 99.4%，后端数据库负载降低 70%',
              '制定分布式事务 Saga 编排规范并落地自动化对账补偿引擎，日均处理 8000 万笔交易，实现资金零差错与 99.999% 系统可用性',
            ],
            en: [
              'Architected next-gen real-time settlement gateway with Go, gRPC, and Kafka, scaling peak throughput to 120k+ QPS with 14ms P99 latency',
              'Designed database sharding (32 DBs, 1024 tables) and ES near-real-time index pipeline for financial ledgers, boosting query throughput by 4x',
              'Implemented multi-tier caching with Redis Cluster & in-memory BigCache, reaching 99.4% cache hit rate and reducing DB load by 70%',
              'Devised Saga distributed transaction orchestrator with automated reconciliation, processing 80M daily transactions at 99.999% SLA',
            ],
          },
        },
        {
          org: { zh: '极客云帆网络科技有限公司', en: 'GeekSails Cloud' },
          role: { zh: '高级后端开发工程师', en: 'Senior Backend Engineer' },
          period: '2018.06 - 2021.12',
          location: { zh: '北京', en: 'Beijing' },
          bullets: {
            zh: [
              '主导微服务化改造（拆分单体应用为 18 个独立 Go 微服务），引入 Kubernetes 编排与 Istio 服务网格，部署频率从每周 1 次提升至每日 15+ 次',
              '设计基于 Raft 协议的分布式配置管理与动态限流熔断中心，成功抵御历年双十一大促 5 倍瞬时流量洪峰',
              '主导内存泄漏与 GC 停顿调优，通过 pprof 分析定位底层切片复用缺陷，Go 进程内存占用直降 38%',
            ],
            en: [
              'Migrated legacy monolithic service into 18 Go microservices on Kubernetes & Istio, increasing deployment velocity from 1/week to 15+/day',
              'Developed Raft-based distributed configuration & rate-limiting hub, flawlessly withstanding 5x holiday traffic spikes',
              'Conducted deep pprof memory & GC profiling to eliminate allocation bottlenecks, slashing process memory footprint by 38%',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '北京邮电大学', en: 'Beijing University of Posts and Telecommunications' },
          degree: { zh: '软件工程 · 工学硕士', en: 'M.S. in Software Engineering' },
          period: '2016.09 - 2018.06',
        },
        {
          school: { zh: '西安电子科技大学', en: 'Xidian University' },
          degree: { zh: '网络工程 · 工学学士', en: 'B.S. in Network Engineering' },
          period: '2012.09 - 2016.06',
        },
      ],
      projects: [
        {
          name: { zh: 'G-Mesh · 轻量级高性能 RPC 通信框架', en: 'G-Mesh · Ultra-low Latency RPC Framework' },
          stack: 'Go, Epoll / Netpoll, Protobuf, Zero-Copy',
          period: '2023.03 - 2023.12',
          desc: {
            zh: '自主实现的基于 Linux Epoll 与零拷贝（Zero-Copy）技术的 Go 网络库。单机支持 100 万并发长连接，吞吐量比标准 net/http 提升 2.8 倍。',
            en: 'High-performance Go networking framework powered by Linux Epoll & Zero-Copy. Handles 1M concurrent connections per node, 2.8x faster than net/http.',
          },
        },
      ],
      skills: {
        code: ['Go (Golang)', 'Java', 'SQL', 'C / C++', 'Shell / Bash', 'Python'],
        design: ['System Architecture', 'Database Sharding', 'Domain-Driven Design (DDD)', 'Microservices'],
        research: {
          zh: ['分布式系统设计', 'Kubernetes / 云原生', 'Kafka / 消息流处理', 'Redis / 高可用缓存', 'MySQL 性能调优'],
          en: [
            'Distributed Systems',
            'Kubernetes / Cloud Native',
            'Kafka Stream Processing',
            'Redis High Availability',
            'MySQL Optimization',
          ],
        },
      },
      awards: [{ year: '2023', title: { zh: '集团年度最佳技术架构领航奖', en: 'Annual Technology Excellence Award' } }],
    },
  },
  {
    slug: 'fullstack-developer',
    category: 'fullstack',
    templateId: 't3-sidebar',
    accent: '#4f46e5',
    name: { zh: '全栈开发工程师简历模板', en: 'Full-Stack Engineer Resume Template' },
    role: { zh: '全栈开发工程师', en: 'Full-Stack Software Engineer' },
    summary: {
      zh: '面向能独立交付从前端界面、后端 API、数据库到云端部署的端到端产品工程师。强调一人闭环与业务快速交付能力。',
      en: 'Tailored for end-to-end Product Engineers handling UI, backend services, relational databases, and serverless/cloud deployments.',
    },
    highlights: {
      zh: [
        '端到端闭环能力：覆盖 React/Next.js 前端、Node.js/Python 后端、PostgreSQL 数据库建模与 AWS/Cloudflare 边缘部署',
        '业务交付效率：主导从 0 到 1 打造多款百万级营收 SaaS 产品，兼顾用户体验与后端稳定性',
        '高密度关键词：全面覆盖 TypeScript、FastAPI、PostgreSQL、Docker、Tailwind、REST/GraphQL',
      ],
      en: [
        'End-to-end full lifecycle ownership: React/Next.js, Node.js/Python, PostgreSQL, and Cloudflare Workers/AWS',
        'Rapid product delivery: Built multiple 0-to-1 SaaS products generating $1M+ ARR with high customer satisfaction',
        'High keyword density: Covers TypeScript, FastAPI, PostgreSQL, Docker, Tailwind CSS, and REST/GraphQL',
      ],
    },
    atsKeywords: [
      'Full Stack',
      'TypeScript',
      'Node.js / Express / NestJS',
      'Python / FastAPI',
      'PostgreSQL / Prisma',
      'React & Next.js',
      'Tailwind CSS',
      'Docker & Containerization',
      'Cloudflare Workers / Edge',
      'Stripe Payment 支付集成',
      'RESTful API & GraphQL',
      'Git / GitHub Actions',
    ],
    seoTitle: {
      zh: '全栈开发工程师简历模板与范文（双语可导出PDF）- MuiCV',
      en: 'Full-Stack Software Engineer Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '免费全栈工程师简历模板，展示 Next.js、Node.js、PostgreSQL、云原生等端到端实战项目与量化成果。支持在线预览中英文并导出 A4 PDF。',
      en: 'Free Full-Stack Engineer resume template showcasing Next.js, Node.js, PostgreSQL, and cloud deployments. Bilingual preview and A4 PDF export.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '陈一鸣', en: 'Yiming Chen' },
      title: { zh: '全栈开发工程师', en: 'Full-Stack Software Engineer' },
      tagline: {
        zh: '兼具产品思维的端到端交付专家，精通 TypeScript、Next.js、FastAPI 与云原生架构',
        en: 'Product-minded full-stack engineer proficient in TypeScript, Next.js, FastAPI & modern cloud',
      },
      contact: {
        location: { zh: '深圳 · 南山区', en: 'Shenzhen, China' },
        email: 'yiming.chen.dev@example.com',
        phone: '+86 137-2233-4455',
        web: 'https://yiming.codes',
        github: 'github.com/yiming-fullstack',
      },
      summary: {
        zh: '5 年全栈软件开发经验，专注于从 0 到 1 构建高可用商业 SaaS 与现代 Web 应用。技术栈横跨 TypeScript、React/Next.js 前端体系、Node.js/Python 后端服务、PostgreSQL/Redis 数据库以及 Docker 与 CI/CD 自动化流水线。具备极强的独立攻坚与产品化交付能力。',
        en: 'Full-Stack Software Engineer with 5+ years of experience delivering 0-to-1 SaaS products and scalable web apps. Versatile across TypeScript, React/Next.js, Node.js, Python, PostgreSQL, and cloud deployments. Strong product instinct and agile execution.',
      },
      experience: [
        {
          org: { zh: '光年跃动创新实验室', en: 'Lightyear Motion SaaS' },
          role: { zh: '全栈技术负责人', en: 'Lead Full-Stack Engineer' },
          period: '2022.08 - 至今',
          location: { zh: '深圳', en: 'Shenzhen' },
          bullets: {
            zh: [
              '独立负责跨境电商营销工具 SaaS 产品的全栈架构与研发，上线 10 个月内获取 40,000+ 付费企业用户，实现 ARR 超 120 万美元',
              '采用 Next.js 14 + Tailwind CSS + FastAPI 构建前后端分离架构，配合 Cloudflare Pages & Workers 实现全球边缘节点平均响应延迟 < 80ms',
              '设计基于 PostgreSQL (Drizzle ORM) 的多租户数据隔离方案与 Stripe 订阅付费系统，实现 Webhook 零丢失与多币种自动结算',
              '搭建 Docker + GitHub Actions 自动化持续交付流水线，支持代码合并后 4 分钟内自动部署至 Staging 与 Production',
            ],
            en: [
              'Led full-stack engineering of an international B2B SaaS, acquiring 40k+ paying users and generating $1.2M+ ARR within 10 months',
              'Built responsive web interface (Next.js 14, Tailwind) and robust API (FastAPI), achieving sub-80ms global latency via Cloudflare edge',
              'Designed multi-tenant PostgreSQL schema (Drizzle ORM) and Stripe billing integration with fault-tolerant webhook handling',
              'Created automated CI/CD with Docker & GitHub Actions, enabling zero-downtime releases in under 4 minutes',
            ],
          },
        },
        {
          org: { zh: '智联先锋软件科技', en: 'Pioneer Software Lab' },
          role: { zh: '全栈软件工程师', en: 'Full-Stack Developer' },
          period: '2020.07 - 2022.07',
          location: { zh: '广州', en: 'Guangzhou' },
          bullets: {
            zh: [
              '负责企业协同看板的研发，使用 React + Node.js (NestJS) + Socket.io 实现实时任务拖拽协同与状态推送，支撑单房间 200+ 成员并发交互',
              '重构历史慢 SQL 与索引结构，将报表聚合查询响应时间从 4.8s 降低至 230ms，数据库 CPU 占用率下降 55%',
            ],
            en: [
              'Developed collaborative Kanban tool with React, NestJS, and WebSockets, supporting 200+ concurrent interactive users per workspace',
              'Optimized complex SQL queries and PostgreSQL indexes, slashing report analytics runtime from 4.8s to 230ms',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '华南理工大学', en: 'South China University of Technology' },
          degree: { zh: '软件工程 · 学士', en: 'B.S. in Software Engineering' },
          period: '2016.09 - 2020.06',
        },
      ],
      projects: [
        {
          name: { zh: 'DevPulse · 开发者指标全景监控看板', en: 'DevPulse · Developer Productivity Analytics' },
          stack: 'Next.js, TypeScript, PostgreSQL, Tailwind CSS, Docker',
          period: '2023.06 - 2024.02',
          desc: {
            zh: '聚合 GitHub PR、Jira 任务与 Sentry 报错数据的研发效能分析系统。通过图表直观洞察团队交付瓶颈，服务于 30+ 技术团队。',
            en: 'Engineering productivity intelligence dashboard aggregating GitHub PRs, Jira issues, and Sentry telemetry across 30+ teams.',
          },
        },
      ],
      skills: {
        code: ['TypeScript', 'JavaScript', 'Python', 'Node.js', 'SQL', 'HTML/CSS'],
        design: ['Next.js', 'React', 'FastAPI', 'NestJS', 'PostgreSQL', 'Tailwind CSS'],
        research: {
          zh: ['全栈敏捷开发', '多租户系统设计', 'Stripe 支付流', 'Docker 容器化', 'Cloudflare Workers 边缘计算'],
          en: [
            'Full-Stack Agility',
            'Multi-tenant Design',
            'Stripe Payments',
            'Docker Containerization',
            'Cloudflare Workers & Edge',
          ],
        },
      },
    },
  },
  {
    slug: 'ai-engineer',
    category: 'ai',
    templateId: 't4-tech',
    accent: '#7c3aed',
    name: { zh: '大模型与 AI 算法工程师简历模板', en: 'LLM & AI Application Engineer Resume Template' },
    role: { zh: '大模型与 AI 算法工程师', en: 'LLM & AI Application Engineer' },
    summary: {
      zh: '专为 RAG、Agent 智能体框架、模型微调与大模型应用落地工程师打造。突出高召回率知识库、提示词工程与端到端 Agentic Pipeline 成果。',
      en: 'Crafted for LLM Application Engineers, RAG Specialists, and AI Agent Architects. Highlights retrieval precision, prompt engineering, and agent workflows.',
    },
    highlights: {
      zh: [
        'RAG 与 Agent 深度实战：构建多路召回 + 重排（Rerank）流水线，企业知识库检索准确率达 94.8%',
        '模型工程化与微调：基于 LoRA / QLoRA 针对垂直领域模型进行微调，推理吞吐量提升 3.2 倍',
        '前沿 ATS 关键词匹配：精准命中 LLM、LangChain、LlamaIndex、PyTorch、Vector DB、vLLM',
      ],
      en: [
        'RAG & Agent expertise: Built multi-stage retrieval + reranking pipeline, lifting enterprise QA accuracy to 94.8%',
        'Model engineering: Fine-tuned domain models with LoRA/QLoRA and deployed high-throughput vLLM clusters',
        'ATS keyword alignment: Tuned for LLM, RAG, LangChain, LlamaIndex, PyTorch, Vector DB, and Agentic Workflows',
      ],
    },
    atsKeywords: [
      'Large Language Models (LLM)',
      'RAG (Retrieval-Augmented Generation)',
      'Agentic Workflows & Multi-Agent',
      'LangChain / LlamaIndex',
      'Vector Database (Milvus / Pinecone / Qdrant)',
      'PyTorch',
      'Prompt Engineering',
      'vLLM / Ollama 模型部署',
      'LoRA / QLoRA 模型微调',
      'Python',
      'Function Calling & Tool Use',
      'Embedding 模型优化',
    ],
    seoTitle: {
      zh: '大模型与AI算法工程师简历模板（双语/支持PDF导出）- MuiCV',
      en: 'LLM & AI Application Engineer Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '专为大模型应用研发、RAG 知识库与 AI Agent 工程师设计的简历模板与优秀范文。展示 LLM 微调、向量数据库实战经验，支持在线预览与 A4 PDF 导出。',
      en: 'Resume template for LLM and AI Application Engineers. Demonstrates RAG architectures, multi-agent pipelines, and model deployment achievements.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '高宇恒', en: 'David Gao' },
      title: { zh: '大模型与 AI 算法工程师', en: 'LLM & AI Application Engineer' },
      tagline: {
        zh: '深耕 RAG 检索增强架构、Multi-Agent 智能体协作与垂直领域模型轻量化微调',
        en: 'Specializing in enterprise RAG systems, multi-agent frameworks, and lightweight LLM fine-tuning',
      },
      contact: {
        location: { zh: '北京 · 朝阳区', en: 'Beijing, China' },
        email: 'david.gao.ai@example.com',
        phone: '+86 136-8899-0011',
        github: 'github.com/davidgao-ai',
      },
      summary: {
        zh: '4 年人工智能与 NLP/LLM 工程化经验。深入理解 Transformer 架构原理、主流开源大模型（Llama、Qwen、DeepSeek）生态与提示词工程（Prompt Engineering）。主导构建过企业级 RAG 混合检索问答引擎与自动化 Multi-Agent 智能体平台，兼具算法理论深度与工业级工程落地能力。',
        en: 'AI Application Engineer with 4+ years of experience in NLP and LLMs. Deep understanding of Transformer architectures, open-source model ecosystems (Qwen, Llama, DeepSeek), and RAG pipelines. Proven track record building enterprise AI agents and fine-tuned domain models.',
      },
      experience: [
        {
          org: { zh: '智元未来人工智能研究院', en: 'Cognitive Future AI Lab' },
          role: { zh: '资深大模型算法研发工程师', en: 'Senior LLM Research & Dev Engineer' },
          period: '2023.03 - 至今',
          location: { zh: '北京', en: 'Beijing' },
          bullets: {
            zh: [
              '主导企业级智能知识库 RAG 架构升级，结合 Hybrid Search（BM25 + Dense Embedding）与 BGE-Reranker 重排模型，问答准确率从 78.5% 跃升至 94.8%，幻觉率降低 62%',
              '构建基于 LangGraph 的 Multi-Agent 复杂代码生成与校验工作流，实现需求拆解、代码编写、单元测试生成的全自动流转，任务完成率提升 45%',
              '基于 vLLM + Triton 部署高并发模型推理集群，引入 PagedAttention 与 FP8 量化技术，单卡推理并发数提升 3.4 倍，平均首字延迟（TTFT）降低至 180ms',
              '采用 LoRA/QLoRA 对 Qwen-72B 进行金融/法律垂直领域微调，针对 20,000+ 标注样本进行指令对齐，在业务评测集上的表现超越基线模型 28%',
            ],
            en: [
              'Architected enterprise RAG system with Hybrid Search (BM25 + Dense) and BGE-Reranker, boosting QA precision from 78.5% to 94.8% and reducing hallucinations by 62%',
              'Developed multi-agent code generation workflow with LangGraph, automating task planning, coding, and unit test verification with 45% higher completion rate',
              'Deployed high-concurrency inference cluster via vLLM with PagedAttention & FP8 quantization, multiplying per-GPU throughput by 3.4x and cutting TTFT to 180ms',
              'Fine-tuned Qwen-72B for vertical domain using LoRA on 20k curated instruction pairs, outperforming base model by 28% on domain benchmarks',
            ],
          },
        },
        {
          org: { zh: '海量数智算法科技', en: 'DeepData Intelligence' },
          role: { zh: 'NLP 算法工程师', en: 'NLP Algorithm Engineer' },
          period: '2021.07 - 2023.02',
          location: { zh: '北京', en: 'Beijing' },
          bullets: {
            zh: [
              '负责千万级海量文本的数据清洗、分词、实体识别（NER）与情感分析分类模型训练，服务于核心舆情监控系统',
              '基于 BERT 与 Faiss 构建海量商品智能问答召回系统，实现千万级向量毫秒级近似最近邻（ANN）检索',
            ],
            en: [
              'Trained entity extraction (NER) and sentiment classification models processing 10M+ daily documents for brand sentiment monitoring',
              'Built vector similarity retrieval system using BERT & Faiss, achieving sub-10ms nearest neighbor search over 10M vectors',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '中国科学院大学', en: 'University of Chinese Academy of Sciences' },
          degree: { zh: '模式识别与智能系统 · 硕士', en: 'M.S. in Pattern Recognition & Intelligent Systems' },
          period: '2018.09 - 2021.06',
        },
        {
          school: { zh: '北京航空航天大学', en: 'Beihang University' },
          degree: { zh: '自动化 · 学士', en: 'B.S. in Automation' },
          period: '2014.09 - 2018.06',
        },
      ],
      projects: [
        {
          name: { zh: 'OpenAgentic · 开源多模态 Agent 执行框架', en: 'OpenAgentic · Multi-Modal Agent Engine' },
          stack: 'Python, LangChain, OpenAI API, Milvus, FastAPI',
          period: '2023.09 - 2024.04',
          desc: {
            zh: '支持自主环境感知、浏览器操作与 API 调用的开源 Agent 框架，内置记忆持久化与自我反思机制。GitHub 获 3.5k Stars。',
            en: 'Open-source autonomous agent framework with browser automation, memory persistence, and tool invocation. 3.5k GitHub stars.',
          },
        },
      ],
      skills: {
        code: ['Python', 'C++', 'SQL', 'TypeScript', 'Shell'],
        design: ['PyTorch', 'Transformers / HuggingFace', 'LangChain / LangGraph', 'vLLM', 'Milvus / Qdrant'],
        research: {
          zh: ['RAG 检索增强', '大模型微调 (LoRA)', 'Multi-Agent 协作', '提示词工程', '模型推理加速'],
          en: [
            'RAG Systems',
            'LLM Fine-tuning (LoRA)',
            'Multi-Agent Collaboration',
            'Prompt Engineering',
            'Inference Acceleration',
          ],
        },
      },
    },
  },
  {
    slug: 'product-manager',
    category: 'product',
    templateId: 't2-minimal',
    accent: '#d97706',
    name: { zh: '资深技术产品经理简历模板', en: 'Senior Product Manager Resume Template' },
    role: { zh: '资深技术产品经理', en: 'Senior Technical Product Manager' },
    summary: {
      zh: '适合 B 端 SaaS、AI 产品化、平台型与用户增长产品经理。突出从需求洞察、PRD 撰写、敏捷迭代到商业化增长的数据指标。',
      en: 'Ideal for B2B SaaS, AI-native Products, and Growth PMs. Highlights PRD specs, agile delivery, user research, and revenue metrics.',
    },
    highlights: {
      zh: [
        '商业与增长指标量化：主导产品从 0 到 1 迭代，实现 ARR 增长 210%，客户流失率降低 40%',
        '需求与技术平衡：深度掌握技术架构原理，能高效与技术/设计团队无缝沟通并制定清晰的敏捷 Roadmap',
        '高分 ATS 词汇：涵盖 Product Roadmap、PRD、A/B Testing、User Journey、B2B SaaS、SQL 数据分析',
      ],
      en: [
        'Measurable business growth: Scaled SaaS product to 210% ARR growth and reduced churn by 40%',
        'Technical & product balance: Bridges customer pain points and engineering tradeoffs with clear roadmap execution',
        'Top ATS keywords: Product Roadmap, PRD, A/B Testing, User Journey, B2B SaaS, SQL Analytics',
      ],
    },
    atsKeywords: [
      'Product Management (PM)',
      'PRD 需求文档撰写',
      'Product Roadmap 产品路线图',
      '数据分析 (SQL / Mixpanel / GA4)',
      '用户增长与漏斗分析 (Funnel Analysis)',
      'A/B Testing 实验设计',
      'B2B SaaS 商业化',
      '敏捷开发 (Agile / Scrum)',
      '用户调研与旅程图 (User Journey)',
      'GTM 市场进入策略',
    ],
    seoTitle: {
      zh: '资深产品经理简历模板与范文（双语/ATS优化）- MuiCV',
      en: 'Senior Technical Product Manager Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '免费资深技术产品经理简历模板与优秀范文。展示 B端 SaaS、AI 产品落地、需求拆解与增长量化案例，支持在线预览与 A4 PDF 导出。',
      en: 'Free Senior Technical Product Manager resume template. Features B2B SaaS, AI product management, PRDs, and growth metrics. Export A4 PDF.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '王若曦', en: 'Rosie Wang' },
      title: { zh: '资深技术产品经理', en: 'Senior Technical Product Manager' },
      tagline: {
        zh: '深耕 B 端 SaaS 与 AI 工具产品化，以数据洞察驱动核心业务持续增长',
        en: 'Specializing in B2B SaaS & AI product management with data-driven growth',
      },
      contact: {
        location: { zh: '杭州 · 滨江区', en: 'Hangzhou, China' },
        email: 'rosie.wang.pm@example.com',
        phone: '+86 135-6677-8899',
        web: 'https://rosiewang.pm',
      },
      summary: {
        zh: '6 年互联网产品规划与商业化落地经验。主导过企业级协同协作与 AI 提效工具的 0-1 产品定义及后续高速增长。精通用户痛点调研、复杂业务场景抽象、PRD 规范撰写与 A/B 测试数据分析。擅长跨部门协同推进敏捷迭代，以卓越的产品体验驱动商业转化。',
        en: 'Product Manager with 6+ years of experience leading 0-to-1 product strategies and scaling B2B SaaS products. Skilled in customer discovery, PRD drafting, roadmap prioritization, and data-driven A/B experimentation. Strong track record aligning engineering, UX, and go-to-market teams.',
      },
      experience: [
        {
          org: { zh: '云瀚智能协作科技', en: 'Yunhan Smart Collaboration' },
          role: { zh: '高级产品经理 / 核心产品线负责人', en: 'Senior Product Manager · Core Product Line' },
          period: '2022.05 - 至今',
          location: { zh: '杭州', en: 'Hangzhou' },
          bullets: {
            zh: [
              '负责 AI 智能文档与工作流中台的产品规划与落地，上线 1 年内吸引 1,200+ 家企业客户签约，带动年度经常性收入（ARR）增长 210%',
              '深度优化新用户 Onboarding 旅程与自助试用漏斗，将注册至首次核心功能激活率（Activation Rate）从 24% 提升至 58%',
              '设计全生命周期的客户留存与升级策略，结合用户行为埋点（Mixpanel），将付费客户季度流失率由 6.8% 降至 2.9%',
              '主导跨部门敏捷研发节奏，制定季度 OKR 与产品 Release Roadmap，需求按期交付率保持在 92% 以上',
            ],
            en: [
              'Spearheaded AI Smart Document workspace product from 0 to 1, securing 1,200+ enterprise accounts and driving 210% ARR growth within 12 months',
              'Revamped self-serve onboarding funnel, boosting user activation rate from 24% to 58%',
              'Designed data-informed retention interventions using Mixpanel, cutting quarterly paid user churn from 6.8% to 2.9%',
              'Orchestrated cross-functional agile sprints and quarterly product roadmap with a 92%+ on-time feature release rate',
            ],
          },
        },
        {
          org: { zh: '鼎创先锋数智科技', en: 'Dingchuang Enterprise Solutions' },
          role: { zh: '产品经理', en: 'Product Manager' },
          period: '2019.07 - 2022.04',
          location: { zh: '上海', en: 'Shanghai' },
          bullets: {
            zh: [
              '负责低代码表单与审批流引擎的产品设计，累计支撑 80,000+ 员工日常流程审批，审批流平均流转耗时缩短 45%',
              '主导 15 组核心页面 A/B 测试，优化 CTA 转化链路，试用申请提交率提升 33%',
            ],
            en: [
              'Designed low-code workflow engine for 80k+ enterprise users, reducing internal process approval turnaround by 45%',
              'Conducted 15+ A/B experiments across conversion landing pages, improving trial request conversions by 33%',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '浙江大学', en: 'Zhejiang University' },
          degree: { zh: '信息管理与信息系统 · 学士', en: 'B.S. in Information Management & Systems' },
          period: '2015.09 - 2019.06',
        },
      ],
      projects: [
        {
          name: { zh: 'AI-Copilot 智能辅助决策工作流', en: 'AI-Copilot Decision Support Suite' },
          stack: 'LLM, Prompt Engineering, Mixpanel, Figma, PRD',
          period: '2023.08 - 2024.03',
          desc: {
            zh: '在现有 SaaS 中嵌入 AI 生成与摘要能力，月活跃使用率超过 68%，用户单周工时节省预估 4.2 小时。',
            en: 'Embedded generative AI assistant into existing SaaS platform, reaching 68% monthly feature adoption and saving 4.2 hours/user/week.',
          },
        },
      ],
      skills: {
        code: ['SQL', 'Python (Data Analysis)', 'HTML / CSS (Basic)'],
        design: ['PRD Writing', 'Figma Wireframing', 'User Journey Mapping', 'Information Architecture'],
        research: {
          zh: ['用户调研与访谈', 'A/B 测试实验', '增长漏斗分析', '敏捷 Scrum 管理', 'B2B 商业化策略'],
          en: [
            'User Research & Interviews',
            'A/B Testing',
            'Growth Funnel Analytics',
            'Scrum & Agile Management',
            'B2B GTM Strategy',
          ],
        },
      },
    },
  },
  {
    slug: 'ui-ux-designer',
    category: 'design',
    templateId: 't3-sidebar',
    accent: '#db2777',
    name: { zh: 'UI/UX 体验设计师简历模板', en: 'Senior UI/UX Designer Resume Template' },
    role: { zh: '资深 UI/UX 体验设计师', en: 'Senior UI/UX & Product Designer' },
    summary: {
      zh: '适合 UI/UX 设计师、体验架构师与产品设计师。突出 Design System 搭建规范、用户体验旅程调研与高保真交互原型设计。',
      en: 'Tailored for Product Designers and UI/UX Architects. Highlights Design Systems, Design Tokens, UX research, and high-conversion prototyping.',
    },
    highlights: {
      zh: [
        '设计体系与提效量化：从零构建覆盖 80+ 组件的 Figma Design System，设计交付效率提升 50%',
        '体验改善可衡量：主导核心结算流体验重构，用户任务完成度提升 38%，报错率降低 42%',
        'ATS 关键词优化：涵盖 UI/UX Design、Figma、Design Tokens、Wireframing、WCAG 2.1 无障碍',
      ],
      en: [
        'Design System scalability: Built enterprise design system with 80+ components, speeding up delivery by 50%',
        'Measurable UX gains: Overhauled checkout interaction flow, raising task completion by 38% and cutting errors by 42%',
        'ATS match: Figma, Design Tokens, User Journey Mapping, Wireframing, WCAG 2.1 A11y',
      ],
    },
    atsKeywords: [
      'UI/UX Design',
      'Figma & FigJam',
      'Design System 设计规范',
      'Design Tokens',
      '用户调研与可用性测试 (Usability Testing)',
      '交互原型制作 (Prototyping)',
      '无障碍设计 (A11y / WCAG 2.1)',
      '移动端与响应式设计 (Responsive Design)',
      '设计交付与走查',
    ],
    seoTitle: {
      zh: 'UI/UX体验设计师简历模板与范文（双语可导出PDF）- MuiCV',
      en: 'Senior UI/UX Designer Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '免费 UI/UX 与产品设计师简历模板，展示 Design System、用户体验调研、高保真原型与转化提升实战案例。支持在线预览与 A4 PDF 导出。',
      en: 'Free Senior UI/UX & Product Designer resume template. Showcases Design Systems, UX research, prototyping, and accessibility. Export A4 PDF.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '赵思琪', en: 'Stella Zhao' },
      title: { zh: '资深 UI/UX 体验设计师', en: 'Senior UI/UX & Product Designer' },
      tagline: {
        zh: '构建规范化企业级设计系统，打造兼具美感与高转化率的数字化产品体验',
        en: 'Crafting scalable design systems and high-conversion digital experiences',
      },
      contact: {
        location: { zh: '上海 · 静安区', en: 'Shanghai, China' },
        email: 'stella.zhao.design@example.com',
        phone: '+86 138-1199-2233',
        web: 'https://stellazhao.design',
      },
      summary: {
        zh: '6 年数字化产品体验与 UI/UX 设计经验。主导过多个百万级用户量 Web SaaS 及移动端 App 的设计系统搭建与体验升级。精通 Figma、Design Tokens 规范、可用性测试与无障碍（WCAG 2.1）标准。擅长将复杂的业务逻辑转化为优雅、简洁且高效的用户界面。',
        en: 'Senior UI/UX Designer with 6+ years designing intuitive SaaS and mobile products. Expert in Figma, Design Tokens, usability testing, and accessibility (WCAG 2.1). Proven ability to translate complex business workflows into seamless, elegant user experiences.',
      },
      experience: [
        {
          org: { zh: '灵动极光交互体验工作室', en: 'Aurora UX Studio' },
          role: { zh: '首席产品设计师 / 设计规范负责人', en: 'Lead Product Designer' },
          period: '2022.03 - 至今',
          location: { zh: '上海', en: 'Shanghai' },
          bullets: {
            zh: [
              '主导企业级 Design System 2.0 体系搭建，梳理并封装 90+ 基础与业务组件变体，统一 5 条产品线视觉风格，研发还原度由 70% 提升至 95%',
              '主导电商结账结算流程全面体验重塑，通过眼动仪与可用性走查优化关键交互步骤，结账转化率提升 18.5%，用户误点击率下降 40%',
              '推动全站 WCAG 2.1 AA 级无障碍适配，重构色彩对比度与键盘焦点态规范，获得海外客户高度评价',
              '定期组织 Design Sprint 与用户访谈，输出高质量交互原型与动画演示，缩短产品概念验证周期 40%',
            ],
            en: [
              'Architected enterprise Design System 2.0 with 90+ flexible components, aligning 5 product lines and improving design implementation fidelity from 70% to 95%',
              'Redesigned checkout funnel via eye-tracking and usability testing, increasing conversion rate by 18.5% and reducing user error clicks by 40%',
              'Led WCAG 2.1 AA accessibility overhaul across all web properties, establishing high-contrast color palettes and focus states',
              'Facilitated weekly Design Sprints and user interviews, accelerating prototype validation timelines by 40%',
            ],
          },
        },
        {
          org: { zh: '光合交互科技', en: 'Photosynthesis Interactive' },
          role: { zh: 'UI/UX 设计师', en: 'UI/UX Designer' },
          period: '2019.07 - 2022.02',
          location: { zh: '上海', en: 'Shanghai' },
          bullets: {
            zh: [
              '负责移动端金融理财 App（iOS & Android）的核心界面设计，主导重构资产总览与图表可视化看板，用户满意度（CSAT）从 74 分提升至 91 分',
              '与前端工程师紧密协作，建立基于 JSON 的 Design Token 自动同步机制，实现设计修改一键同步至代码库',
            ],
            en: [
              'Designed mobile banking app UI/UX for iOS & Android, improving user CSAT score from 74 to 91',
              'Collaborated with frontend engineers to establish JSON-based Design Token automated pipelines for seamless theme updates',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '江南大学', en: 'Jiangnan University' },
          degree: { zh: '工业设计 / 视觉传达 · 学士', en: 'B.A. in Industrial & Interaction Design' },
          period: '2015.09 - 2019.06',
        },
      ],
      projects: [
        {
          name: { zh: 'Aurora UI · 开源现代暗黑设计规范', en: 'Aurora UI · Modern Dark-Mode Design System' },
          stack: 'Figma, Design Tokens, Auto-Layout, A11y',
          period: '2023.04 - 2023.11',
          desc: {
            zh: '专注于暗黑模式与暖色系微质感的开源 Figma 设计组件库。Figma 社区获得 12,000+ Duplicates 与五星好评。',
            en: 'Open-source dark-mode design system on Figma Community with over 12k duplicates and 5-star ratings.',
          },
        },
      ],
      skills: {
        code: ['HTML5 / CSS3', 'Figma Plugin API', 'SVG / Canvas (Basic)'],
        design: ['Figma', 'Protopie', 'Illustrator', 'Design Systems', 'Design Tokens'],
        research: {
          zh: ['可用性测试 (Usability Testing)', '用户旅程分析', '无障碍设计 (WCAG 2.1)', '信息架构', '微交互动效'],
          en: [
            'Usability Testing',
            'User Journey Mapping',
            'A11y (WCAG 2.1)',
            'Information Architecture',
            'Micro-interactions',
          ],
        },
      },
    },
  },
  {
    slug: 'data-scientist',
    category: 'data',
    templateId: 't5-timeline',
    accent: '#2563eb',
    name: { zh: '数据科学家 / 机器学习工程师简历模板', en: 'Data Scientist / Machine Learning Resume Template' },
    role: { zh: '数据科学家 / 机器学习工程师', en: 'Data Scientist / Machine Learning Engineer' },
    summary: {
      zh: '适合数据分析师、数据科学家与机器学习工程师。突出特征工程、预测建模、A/B 实验设计与商业智能（BI）决策支撑。',
      en: 'Designed for Data Scientists, ML Engineers, and BI Analysts. Highlights predictive modeling, statistical testing, and ROI impact.',
    },
    highlights: {
      zh: [
        '算法驱动业务增收：构建精准用户流失预测与推荐模型，挽回流失用户提升留存率 22%，贡献额外营收超 300 万元',
        '实验严谨可信：主导建立因果推断（Causal Inference）与严谨 A/B 测试评估框架，杜绝虚假显著性',
        '高匹配 ATS 词库：Python、SQL、Pandas、Scikit-learn、A/B Testing、XGBoost、Tableau、特征工程',
      ],
      en: [
        'Revenue impact: Built churn prediction & recommendation models, boosting user retention by 22% and generating $500k+ in recovered revenue',
        'Rigorous experimentation: Established causal inference and A/B test methodologies to prevent sample ratio mismatch',
        'ATS keyword richness: Python, SQL, Pandas, Scikit-learn, A/B Testing, XGBoost, Tableau, Feature Engineering',
      ],
    },
    atsKeywords: [
      'Data Science',
      'Machine Learning (ML)',
      'Python (Pandas / NumPy / Scikit-learn)',
      'Advanced SQL',
      'A/B Testing & 因果推断',
      '特征工程 (Feature Engineering)',
      'XGBoost / LightGBM',
      'Tableau / PowerBI 数据看板',
      '用户画像与流失预测模型',
      '时间序列预测 (Time Series)',
    ],
    seoTitle: {
      zh: '数据科学家与机器学习工程师简历模板（双语/PDF）- MuiCV',
      en: 'Data Scientist & Machine Learning Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '免费数据科学家与机器学习工程师简历模板。包含特征工程、预测建模、A/B 实验设计与数据决策成果，支持在线预览中英文并导出 A4 PDF。',
      en: 'Free Data Scientist and ML Engineer resume template. Features feature engineering, predictive models, and A/B testing achievements.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '宋清雅', en: 'Claire Song' },
      title: { zh: '数据科学家 / 机器学习工程师', en: 'Data Scientist / Machine Learning Engineer' },
      tagline: {
        zh: '运用统计建模、机器学习与严谨 A/B 实验洞察复杂数据，驱动业务科学决策与增长',
        en: 'Leveraging statistical modeling, ML, and rigorous experimentation to drive growth and product decisions',
      },
      contact: {
        location: { zh: '深圳 · 福田区', en: 'Shenzhen, China' },
        email: 'claire.song.data@example.com',
        phone: '+86 137-5566-7788',
        github: 'github.com/clairesong-data',
      },
      summary: {
        zh: '5 年数据科学与机器学习算法落地经验。精通 Python、SQL、统计学推断与主流机器学习算法（XGBoost、LightGBM、随机森林）。深度参与过用户画像构建、智能推荐系统、客户流失预警及大规模 A/B 测试实验体系设计，善于将数据模型转化为实际业务增长成果。',
        en: 'Data Scientist with 5+ years of experience applying statistical modeling and machine learning to solve critical business problems. Expert in Python, SQL, predictive modeling (XGBoost/LightGBM), user lifetime value prediction, and causal inference.',
      },
      experience: [
        {
          org: { zh: '数维洞见智能科技', en: 'DataInsight AI Global' },
          role: { zh: '高级数据科学家 / 算法组长', en: 'Senior Data Scientist · Team Lead' },
          period: '2022.04 - 至今',
          location: { zh: '深圳', en: 'Shenzhen' },
          bullets: {
            zh: [
              '构建高精度客户流失预警与召回推荐模型（LightGBM + 特征交叉），AUC 达 0.892，使高危客户挽回率提升 22%，年化挽回收入逾 320 万元',
              '设计并落地全自动 A/B 实验分析平台，覆盖样本量估算、方差缩减（CUPED）与 SRM 检测，实验分析周期从 5 天缩短至 2 小时',
              '搭建基于 RFM 与行为图谱的用户分层画像体系，支持精准定向营销，营销点击率（CTR）提升 35%，ROI 达到 1:4.8',
            ],
            en: [
              'Engineered customer churn prediction model (LightGBM + feature engineering) with 0.892 AUC, lifting retention by 22% and recovering $500k+ annually',
              'Built automated A/B experimentation platform with CUPED variance reduction, reducing experiment turnaround from 5 days to 2 hours',
              'Established dynamic RFM user segmentation framework for marketing campaigns, increasing CTR by 35% with 4.8x ROI',
            ],
          },
        },
        {
          org: { zh: '腾云数智信息咨询', en: 'Tengyun Data Solutions' },
          role: { zh: '数据分析工程师', en: 'Data Analyst' },
          period: '2020.07 - 2022.03',
          location: { zh: '广州', en: 'Guangzhou' },
          bullets: {
            zh: [
              '负责核心业务指标监控体系搭建，开发 20+ 款 Tableau / PowerBI 自动化数据看板，日均服务 200+ 业务决策人',
              '通过归因分析（Attribution Modeling）定位获客渠道 ROI 异常，优化广告投放预算分配，获客成本（CAC）降低 19%',
            ],
            en: [
              'Created 20+ automated Tableau/PowerBI executive dashboards serving 200+ daily decision makers',
              'Conducted multi-touch attribution analysis to reallocate marketing budgets, reducing customer acquisition cost (CAC) by 19%',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '中山大学', en: 'Sun Yat-sen University' },
          degree: { zh: '应用统计学 · 理学硕士', en: 'M.S. in Applied Statistics' },
          period: '2018.09 - 2020.06',
        },
        {
          school: { zh: '华南农业大学', en: 'South China Agricultural University' },
          degree: { zh: '数学与应用数学 · 学士', en: 'B.S. in Mathematics' },
          period: '2014.09 - 2018.06',
        },
      ],
      projects: [
        {
          name: {
            zh: 'CausalLab · 自动化因果推断与 A/B 检验库',
            en: 'CausalLab · Causal Inference & A/B Testing Toolkit',
          },
          stack: 'Python, Statsmodels, Scipy, Pandas',
          period: '2023.05 - 2023.12',
          desc: {
            zh: '集成了倾向得分匹配（PSM）、双重差分法（DID）与 CUPED 方差缩减算法的开源 Python 数据分析工具包。',
            en: 'Open-source Python package implementing PSM, DID, and CUPED variance reduction for empirical data analysis.',
          },
        },
      ],
      skills: {
        code: ['Python', 'SQL (PostgreSQL / Hive / ClickHouse)', 'R', 'Shell'],
        design: ['Pandas / NumPy', 'Scikit-learn', 'LightGBM / XGBoost', 'Tableau / PowerBI', 'Airflow'],
        research: {
          zh: ['统计学推断', 'A/B 测试实验设计', '特征工程', '用户画像建模', '因果推断 (Causal Inference)'],
          en: [
            'Statistical Inference',
            'A/B Testing Design',
            'Feature Engineering',
            'User Segmentation',
            'Causal Inference',
          ],
        },
      },
    },
  },
  {
    slug: 'devops-sre',
    category: 'devops',
    templateId: 't6-academic',
    accent: '#059669',
    name: { zh: 'DevOps / SRE 运维工程师简历模板', en: 'DevOps & SRE Engineer Resume Template' },
    role: { zh: 'DevOps & SRE 云原生工程师', en: 'DevOps & Site Reliability Engineer' },
    summary: {
      zh: '适合云原生运维、SRE 稳定性专家与平台工程架构师。突出 Kubernetes 集群运维、Terraform 基础设施代码化、CI/CD 与 99.99% 可用性保障。',
      en: 'Engineered for SREs, Cloud-Native Architects, and DevOps Leads. Highlights Kubernetes, Terraform (IaC), GitOps, and 99.99% SLO governance.',
    },
    highlights: {
      zh: [
        '稳定性与可用性指标：主导混合云多活架构演进，系统年度可用性达到 99.995%，故障平均恢复时间（MTTR）降低 75%',
        '自动化与降本增效：通过 K8s HPA/KEDA 弹性扩缩容与 Spot 实例调度，云资源账单节省 34%',
        'ATS 关键词优化：深度适配 Kubernetes、Terraform、Docker、Prometheus、Grafana、GitOps、CI/CD',
      ],
      en: [
        'Reliability & SLA track record: Architected multi-region Kubernetes cluster reaching 99.995% uptime and cutting MTTR by 75%',
        'Cloud cost reduction: Implemented KEDA autoscaling and spot instances, lowering AWS cloud infrastructure costs by 34%',
        'ATS alignment: Kubernetes, Terraform, Docker, Prometheus, Grafana, GitOps, CI/CD pipelines',
      ],
    },
    atsKeywords: [
      'DevOps / SRE',
      'Kubernetes (K8s)',
      'Terraform / OpenTofu (IaC)',
      'Docker 容器化',
      'CI/CD (GitHub Actions / ArgoCD)',
      'Prometheus & Grafana 监控告警',
      'AWS / Cloudflare / GCP',
      'Linux 内核与网络调优',
      'SLO / SLA 稳定性保障',
      'Shell / Python / Go 自动化运维',
    ],
    seoTitle: {
      zh: 'DevOps与SRE运维工程师简历模板与范文（双语/PDF）- MuiCV',
      en: 'DevOps & SRE Engineer Resume Template & Example - MuiCV',
    },
    seoDescription: {
      zh: '免费 DevOps 与 SRE 工程师简历模板与范文。涵盖 Kubernetes、Terraform、自动化 CI/CD 与云成本优化项目实战，支持在线预览与 A4 PDF 导出。',
      en: 'Free DevOps and Site Reliability Engineer (SRE) resume template. Showcases Kubernetes, Terraform, CI/CD, and cost optimization achievements.',
    },
    data: {
      schemaVersion: 1,
      name: { zh: '陆天宇', en: 'Lucas Lu' },
      title: { zh: 'DevOps & SRE 云原生工程师', en: 'DevOps & Site Reliability Engineer' },
      tagline: {
        zh: '专注于基础设施即代码 (IaC)、Kubernetes 生产集群治理与 99.99% 系统高可用性',
        en: 'Specializing in Infrastructure as Code (IaC), Kubernetes operations, and 99.99% system reliability',
      },
      contact: {
        location: { zh: '北京 · 海淀区', en: 'Beijing, China' },
        email: 'lucas.lu.sre@example.com',
        phone: '+86 139-4455-6677',
        github: 'github.com/lucaslu-ops',
      },
      summary: {
        zh: '6 年云原生运维与站点可靠性工程（SRE）经验。深度主导过数百节点大规模 Kubernetes 集群的跨可用区建设与稳定性保障。精通 Terraform、Docker、ArgoCD、Prometheus/Grafana 监控体系及 Linux 网络性能调优。擅长通过自动化与平台工程消除运维琐事（Toil），提升交付效能。',
        en: 'DevOps & SRE Engineer with 6+ years managing multi-region Kubernetes clusters. Deep expertise in Terraform, GitOps (ArgoCD), Prometheus observability, and Linux kernel networking. Proven track record reducing operational toil and maintaining 99.99%+ SLA.',
      },
      experience: [
        {
          org: { zh: '极光云联基础设施科技', en: 'Aurora Cloud Infrastructure' },
          role: { zh: '资深 SRE 架构师 / 平台工程主管', en: 'Senior SRE Architect' },
          period: '2022.06 - 至今',
          location: { zh: '北京', en: 'Beijing' },
          bullets: {
            zh: [
              '主导跨地域多活 Kubernetes 集群（300+ 物理节点、2,000+ Pods）架构演进，全站可用性提升至 99.995%，故障 MTTR 从 45 分钟降至 8 分钟',
              '推行 100% 基础设施即代码（Terraform + GitOps ArgoCD），实现云资源创建与配置变更的可审计与版本化，变更故障率下降 80%',
              '构建基于 Prometheus + Grafana + VictoriaMetrics 的多维立体可观测体系，统一告警策略，有效压制 70% 无效报警风暴',
              '通过引入 KEDA 弹性扩缩容与 Spot 竞价实例调度，在业务峰值平稳度过的同时将年度云基础设施成本削减 34%',
            ],
            en: [
              'Architected multi-region Kubernetes clusters (300+ nodes, 2k+ pods), elevating platform uptime to 99.995% and lowering MTTR from 45m to 8m',
              'Enforced 100% Infrastructure as Code via Terraform & ArgoCD GitOps, reducing misconfiguration incidents by 80%',
              'Built centralized observability pipeline with Prometheus & VictoriaMetrics, cutting alert noise by 70%',
              'Optimized cloud spend by 34% through KEDA-driven event autoscaling and spot instance scheduling',
            ],
          },
        },
        {
          org: { zh: '星云数智互联科技', en: 'Nebula Internet Tech' },
          role: { zh: 'DevOps 运维工程师', en: 'DevOps Engineer' },
          period: '2019.07 - 2022.05',
          location: { zh: '北京', en: 'Beijing' },
          bullets: {
            zh: [
              '负责全公司 CI/CD 流水线（GitLab CI + Docker）标准化建设，支持 60+ 微服务的自动化构建与镜像发布，构建耗时平均缩短 55%',
              '主导生产环境容器镜像瘦身与漏洞扫描（Trivy），将镜像平均体积由 850MB 压缩至 120MB，CVE 漏洞归零',
            ],
            en: [
              'Standardized CI/CD pipelines across 60+ microservices using GitLab CI & Docker, speeding up build workflows by 55%',
              'Implemented container vulnerability scanning with Trivy and Alpine multi-stage builds, reducing average image size from 850MB to 120MB',
            ],
          },
        },
      ],
      education: [
        {
          school: { zh: '北京工业大学', en: 'Beijing University of Technology' },
          degree: { zh: '计算机网络工程 · 学士', en: 'B.S. in Computer Network Engineering' },
          period: '2015.09 - 2019.06',
        },
      ],
      projects: [
        {
          name: { zh: 'AutoKubeOps · K8s 自动化诊断与巡检机器人', en: 'AutoKubeOps · Kubernetes Diagnostic Robot' },
          stack: 'Go, Kubernetes Client-go, Helm, Prometheus API',
          period: '2023.07 - 2024.01',
          desc: {
            zh: '自动检测 K8s 集群 OOMKilled、CrashLoopBackOff 与证书过期的巡检 Agent。可联动飞书/Slack 自动排障。',
            en: 'Automated Kubernetes cluster health checker detecting OOMKilled, pod crashloops, and certificate expiration.',
          },
        },
      ],
      skills: {
        code: ['Go', 'Python', 'Shell / Bash', 'YAML / HCL', 'SQL'],
        design: [
          'Kubernetes (K8s)',
          'Terraform',
          'Docker',
          'ArgoCD / GitOps',
          'Prometheus / Grafana',
          'AWS / Cloudflare',
        ],
        research: {
          zh: ['SRE 稳定性保障', '基础设施即代码 (IaC)', 'CI/CD 流水线工程', '容器网络与存储', '云成本优化'],
          en: [
            'SRE & Reliability',
            'Infrastructure as Code',
            'CI/CD Pipeline Engineering',
            'Container Networking',
            'Cloud Cost Optimization',
          ],
        },
      },
    },
  },
];

export function getSampleTemplates(category?: TemplateCategory | 'all'): SampleResumeTemplate[] {
  if (!category || category === 'all') {
    return SAMPLE_RESUME_TEMPLATES;
  }
  return SAMPLE_RESUME_TEMPLATES.filter((item) => item.category === category);
}

export function getSampleTemplateBySlug(slug: string): SampleResumeTemplate | null {
  return SAMPLE_RESUME_TEMPLATES.find((item) => item.slug === slug) ?? null;
}
