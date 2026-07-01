import type { Dictionary } from './types';

// 中文词典：现有营销站文案原样抽出。改文案改这里。
// FAQ 手风琴问答（含 JSX）不放在这里，见 _sections/faq-items.tsx 的注释。

export const zh: Dictionary = {
  brand: { name: 'Mui简历', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: '文章', href: '/posts/jobs' },
      { label: 'Skill', href: '/skills' },
      { label: '价格', href: '/pricing' },
      { label: '下载', href: '/download' },
    ],
    console: '进入控制台',
    signIn: '登录',
    signUp: '创建账号',
  },
  footer: {
    tagline: '一站式 AI 求职平台。简历、找岗位、模拟面试、就业辅导——帮你拿到更好的 offer。',
    curatedBy: '由柯基 Mui 监修',
    cols: [
      {
        label: '产品',
        links: [
          { label: '重点特性', href: '/#features' },
          { label: '定价', href: '/pricing' },
          { label: '桌面 app', href: '/download' },
          { label: 'Skill 目录', href: '/skills' },
          { label: '控制台', href: '/dashboard' },
        ],
      },
      {
        label: '内容',
        links: [
          { label: '求职博文', href: '/posts/jobs' },
          { label: '全部文章', href: '/posts' },
          { label: '更新日志', href: '/changelog' },
        ],
      },
      {
        label: '公司',
        links: [
          { label: '关于我们', href: '/about' },
          { label: '联系我们', href: '/contact' },
        ],
      },
      {
        label: '法律',
        links: [
          { label: '服务条款', href: '/terms' },
          { label: '隐私政策', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · Mui简历 · 保留所有权利',
    madeIn: 'Made with 🐾 in 中国',
  },
  hero: {
    badge: '桌面 app 已上线，先从一份素材开始',
    titleA: '把简历和经历',
    titleHighlight: '交给 Mui 整理',
    titleEnd: '。',
    lede: '下载桌面 app，导入现有简历或粘贴一段经历。Mui 会先帮你整理成可复用的职业素材库，再针对不同岗位生成、评审和导出简历。',
    ctaDownload: '下载桌面 app',
    ctaSteps: '看 3 步怎么开始',
    accountSignedIn: '进入个人中心',
    accountSignedOut: '创建账号',
    agentNote: '已经熟悉 Claude Code、Codex 或 Cursor？首页后面保留 skill 安装方式，可以继续走你习惯的工具链。',
  },
  heroShowcase: {
    tabsAria: '演示切换',
    slides: { import: '导入素材', library: '素材库', resume: '定制简历' },
    caption: '先整理，再针对岗位迭代',
    importHeader: 'Mui简历 · 第一步',
    importTitle: '先放进来一份真实材料',
    importDesc: '上传简历、粘贴经历，或者直接说“我想从零整理”。Mui 会从你已经有的内容开始。',
    importItems: [
      { title: '现有简历.pdf', desc: '解析成可编辑素材' },
      { title: '一段项目经历', desc: '补齐背景、动作、结果' },
      { title: '目标岗位链接', desc: '之后用来生成版本' },
    ],
    libraryHeader: '职业素材库',
    libraryNavLabel: '导航',
    libraryNav: ['经历', '项目', '技能', '岗位'],
    libraryListLabel: '可复用素材',
    libraryItems: [
      { title: '负责会员增长实验平台', match: '已量化' },
      { title: '重构前端发布链路', match: '可投递' },
      { title: '跨团队推进埋点规范', match: '待补充' },
    ],
  },
  features: {
    eyebrow: '能做什么',
    titleA: '先把素材理顺，',
    titleHighlight: '再处理投递',
    titleEnd: '。',
    lede: 'Mui 的核心不是替你编故事，而是把真实经历整理成可复用素材，再根据不同岗位调整表达。',
    statusLive: '已上线',
    statusSoon: '即将推出',
    items: [
      {
        id: 'organize',
        title: '整理职业素材',
        desc: '把现有简历、项目经历、技能和亮点拆成可复用素材。以后每次投递都从同一份底稿出发。',
        status: 'live',
        highlights: ['导入简历', '补齐经历', '本地文件管理'],
      },
      {
        id: 'generate',
        title: '针对岗位生成',
        desc: '给 Mui 一个目标岗位，它会从素材库挑选、排序、改写内容，生成一份更对得上的简历版本。',
        status: 'live',
        highlights: ['岗位抓取', '匹配度评估', '版本化管理'],
      },
      {
        id: 'review',
        title: '评审与导出',
        desc: '按 STAR、量化、关键词、篇幅等维度检查草稿，再导出 A4 PDF，减少临投前的手忙脚乱。',
        status: 'live',
        highlights: ['7 维度评审', '修改建议', 'PDF 导出'],
      },
      {
        id: 'practice',
        title: '继续练习求职',
        desc: '素材稳定之后，可以继续做模拟面试、求职信和投递 checklist。高级能力会在你需要时出现。',
        status: 'soon',
        highlights: ['模拟面试', '求职信', '投递 checklist'],
      },
    ],
  },
  workflow: {
    eyebrow: '怎么开始',
    titleA: '第一次打开，',
    titleHighlight: '只做三件事',
    titleEnd: '。',
    aside: '先完成第一份职业素材，不急着理解所有功能。后面的简历版本、岗位匹配和导出都会从这里长出来。',
    steps: [
      {
        title: '导入现有简历或粘贴经历',
        desc: '不用先学概念。把你已经有的 PDF、文档或一段项目经历放进来，Mui 从真实材料开始整理。',
      },
      {
        title: '整理成可复用素材库',
        desc: '经历、项目、技能会被拆成 Markdown 文件，存在你自己的电脑里。以后每次改简历都不用从头来。',
      },
      {
        title: '针对岗位生成、评审、导出',
        desc: '有了素材库，再贴岗位链接或描述，Mui 会生成版本、检查问题，并导出可以投递的 PDF。',
      },
    ],
  },
  desktopApp: {
    badge: '桌面 App · 已上线',
    titleA: '不熟悉 AI agent？',
    titleHighlight: '下载就能开始',
    titleEnd: '。',
    lede: '全平台桌面 app，打开后先带你导入简历或记录第一段经历。等素材整理好，再继续做岗位匹配、 简历评审和 PDF 导出。',
    ctaDownload: '下载桌面 app',
    ctaAdvanced: '已经在用 AI agent？走高级入口 ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · NSIS 安装包' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: '下载',
    noteBefore: '版本号、安装包大小由 ',
    noteLink: '下载页',
    noteAfter: ' 自动从 GitHub Releases 拉最新。首次运行如果被系统拦截，下载页后半部分有放行说明。',
  },
  install: {
    badge: '高级入口 · 给熟悉 AI 工具的人',
    titleA: '已经在用 Claude Code / Codex？',
    titleHighlight: '直接装 skill',
    titleEnd: '。',
    lede: '这是高级路径，适合已经习惯在 AI agent 里工作的用户。普通求职者直接下载桌面 app 会更顺。',
    noteBefore: '不熟悉 AI agent？ ',
    noteLink: '下载桌面 app',
    noteAfter: ' 直接开始，macOS / Windows / Linux 全平台可用。',
    cardMeta: '多 agent 通用 / 40+ 兼容',
  },
  faq: {
    eyebrow: '常见问题',
    titleA: '想问的',
    titleHighlight: '大概率',
    titleEnd: '在这里。',
    articlesEyebrow: '求职文章',
    articlesTitle: '简历、面试和 offer，遇到问题时翻一篇。',
    articlesLede: '这里整理找工作时常见的卡点：怎么改简历、怎么准备面试、怎么判断机会值不值得去。',
    articlesCta: '去内容中心',
    articlesEmpty: '文章还在准备中。你可以先去内容中心看看已经开放的栏目。',
  },
  download: {
    eyebrow: '桌面 app',
    title: '下载 Mui简历',
    lede: '不用装 Claude Code，也不用先理解 skill。打开 app 后先导入简历或记录第一段经历，Mui 会带你整理出一份可继续迭代的职业素材库。',
    firstMinuteLabel: '下载后第一分钟',
    firstMinuteSteps: [
      { title: '登录 muicv 账号', desc: '用浏览器完成授权，app 会自动回到已登录状态。' },
      { title: '导入简历或从零记录', desc: '上传现有简历，或直接说一段你做过的项目和经历。' },
      { title: '开始第一段整理对话', desc: 'Mui 会先帮你把材料拆成可复用素材，之后再针对岗位生成版本。' },
    ],
    releasedAt: '发布于',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'x64 旧机型', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · NSIS 安装包', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote: '全平台都未做代码签名，首次运行需要按下方说明手动放行；后续版本接入开发者证书后会去掉这一步。',
    noArch: '本版本未提供该架构产物',
    downloadLabel: '下载',
    noReleaseLead: '🐾 桌面 app 暂时拉不到发布版本。在那之前你可以：',
    noReleaseSkill: '已经在用 Claude Code、Codex、Cursor 等 AI agent 的话，回首页看 skill 安装命令，5 秒就能接入',
    noReleaseContactBefore: '有问题或想反馈，',
    noReleaseContactLink: '联系我们',
    firstRunTitle: '⚠️ 首次打开需要解除限制',
    firstRunLede: '三平台都没做代码签名，操作系统会拦一下。按下面的步骤放行一次，之后双击 / 命令行直接用。',
    firstRunMacSteps: [
      '下载 .dmg 拖到 /Applications',
      <>
        <strong>右键</strong>（或 control-click）该 app → <strong>打开</strong>
      </>,
      '弹窗提示后再次点 “打开”，之后双击就能直接用',
    ],
    firstRunMacCliLabel: '命令行版（无需 GUI 操作）：',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      '双击下载的 .exe',
      <>
        撞上 SmartScreen 蓝屏 → 点 <strong>更多信息</strong> → 点 <strong>仍要运行</strong>
      </>,
      '选安装路径，默认装到当前用户目录，不需要管理员密码',
    ],
    firstRunLinuxLede: '下载 .AppImage 后给执行权限，直接跑：',
  },
  meta: {
    home: {
      title: 'Mui简历 MuiCV — AI 简历生成与优化，找到更好工作',
      description:
        'Mui简历是一站式 AI 求职平台：用 AI 生成、优化、润色简历，按目标岗位定制版本，导出 A4 PDF。素材存本地、数据由你掌控，还能模拟面试、写求职信。',
    },
    download: {
      title: '下载 Mui简历桌面 app（macOS / Windows / Linux）',
      description:
        '下载 Mui简历（MuiCV）桌面 app，支持 macOS、Windows、Linux。导入简历或粘贴经历，本地整理职业素材，再针对岗位用 AI 生成、评审并导出 PDF 简历。免费下载，素材存本地。',
    },
  },
};
