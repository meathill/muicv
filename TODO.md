# TODO

## Skills

### 内容同步

- ~~云同步 skill（muicv 平台）：把全部职业内容上传到 muicv 平台~~ — Phase 10 完整落地（DB / API / dashboard / muicv-sync skill），见 WIP.md
- ~~云同步 skill（GitHub）：把全部职业内容上传到 GitHub~~ — Phase 11 落地为 [muicv-git skill](skills/muicv-git/SKILL.md)（init / sync / clone / status）

### 面试相关

- ~~模拟面试 skill~~ — Phase 13 P0 重写完成：[muicv-interview](skills/muicv-interview/SKILL.md) 按 JD × 简历 × 轮次 × 级别 × 类别 × 输入方式动态推导题目；3 个 references 拆 + 双输入轨设计。**P1 待做**：client 端 STT + 录像集成（独立 phase）
- ~~录音复盘 skill：上传录音文件 → 提取文本 → 复盘~~ — 落地为 [muicv-audio-review](skills/muicv-audio-review/SKILL.md)（[issue #1](https://github.com/meathill/muicv/issues/1) M4），写到 `audio-reviews/<source>-<date>.md`
- ~~面试复盘 skill（真实面试后回放分析，跟 muicv-interview 配对）~~ — 落地为 [muicv-debrief](skills/muicv-debrief/SKILL.md)，写到 `debriefs/<company>-<date>.md`
- 成为面试官 skill（角色互换，让用户练习当面试官）

### 职场辅导

- 入职辅导 skill：劳动纪律介绍、员工手册解读等
- 理解保险 skill：五险一金、年轻人的第一份保险等
- offer 分析 skill：解读 offer letter（薪资结构、期权、福利、竞业条款等），横向对比多个 offer，给出风险点和谈判建议

## 浏览器扩展

- Chrome Web Store 上架（图标、隐私政策、审核材料）
- Firefox 适配（协议已预留 `moz-extension://`）
- 站点 DOM 改版后补抽取器（脉脉 / Workday / 牛客等目前走 JSON-LD 通用解析）

## 待复现 / 跨平台

- **Windows 下下载 whisper 出错**：本期已把 install.ts 的 fetch / sha256 / pipeline 错误细化成 URL + 阶段 + cause 链（v0.4.0），等用户提供新的详细错误日志再针对性修。

## 待手工验证

- **t2 模板"下方一大块色块"**：bullet 已修（disc + accent ::marker），色块来源不明，跑通完整渲染流程复测。
- **证件照上传完整流程**：代码 review 无明显 bug，需 pick → upload → R2 → 复制 URL → 用到 .resume.json 一遍。

## 上游跟踪

- **`@openai/agents` chat_completions 路径的 reasoning_content 修复**：理想是每周扫一次
  release notes，关键词 `reasoning_content` / `thinking` / `deepseek` / 关联 [issue #791](https://github.com/openai/openai-agents-js/issues/791)。
  一旦上游覆盖 chat_completions 路径，可以拆掉
  [runtime.ts loggingFetch](packages/app/src/main/agent/runtime.ts) 里的
  reasoning 拦截层。本来 `/schedule` 配了，但远端账号问题先用 TODO 兜底，
  方便时手动重跑 `/schedule` 起 cron。

## 依赖升级跟进（2026-10-24 升级时暂缓的项）

- **stripe 22 → 23**：v23 强制 apiVersion `2026-09-30.endive`，该版本移除了 Checkout
  `payment_method_types`（[topup 路由](packages/website/app/api/topup/route.ts) 的 CN
  三方支付 `wechat_pay / alipay / card` + `client: 'web'` 靠它）。迁移 = 改 automatic
  payment methods + Dashboard 配置 + 实测微信/支付宝收单，单独立项做。
- ~~electron 44 → 45~~ — 已升级到 45，等用户手工冒烟（升级器 / 附件 / whisper / 托盘）。
- ~~biome lint 存量欠账~~ — 2026-10-24 已清零（实际规模 195 处，远超早前"约 20 处"的截断误报；
  决策记录见 DEV_NOTE.md biome 小节）。

## UI 组件化后续（2026-11-04 coss ui 接入后剩下的）

- **website 按钮组件化**：website 的按钮仍是 `.btn-press` / `.press` CSS 工具类（globals.css），
  未消费 @muicv/ui。接入 = marketing 区块逐个换 `<Button>`，需整站视觉回归，单独立项。
- **app 弹层组件化**：confirm-dialog / edit-drawer / fork-conversation-dialog 的外层弹层是
  手写 div，可换 coss ui 的 Dialog / AlertDialog / Sheet（变量层已就位）。
- **菜单/分段控制**：chat-model-selector 里的模型列表与思考深度分段、slash-command-menu，
  语义是菜单/分段而非按钮，后续走 coss 的 Menu / Select / ToggleGroup。
