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
