# Skill 调用 muicv API 的规范

> 本文档是 muicv skill 体系下「联网 skill 鉴权与计费」的**单一来源**。任何调
> `https://api.muicv.com` 的 skill 都必须遵守。修改本文档需同步所有引用 skill。

最后更新：2026-08-27

---

## 适用范围

- **调远端 muicv API** 的 skill（`api.muicv.com`，或本地 `wrangler dev` 的 8787）：必须遵守。
- **纯本地 agent 分析** 的 skill（不发任何网络请求）：**不要**加 key gate——会吓走免费用户。

判断办法：grep 一下 SKILL.md 是否出现 `curl ... ${MUICV_API_BASE}` 或类似 fetch 调用。有就算"联网"。

当前已知联网 skill：

- `muicv-render`（`POST /render`）
- `muicv-jobs`（仅 `fetch` 子任务，`POST /jobs/fetch`；`match`/`apply` 是本地分析）
- `muicv-sync`（`POST /resume/sync` / `GET /resume/snapshot` / `/resume/sync/history/*` 明文路径；`POST /resume/sync/blob` / `GET /resume/snapshot/blob` / `GET /resume/snapshot/blob/:id/download` / `GET /resume/sync/blob/history` / `DELETE /resume/snapshot/blob` 加密路径）

可用的其他计费端点（当前无 skill 引用，skill 需要时按标准 gate 直接调）：

- `POST /audio/tts`：文本转语音。Body `application/json` `{ text ≤2000 字符, voice?, style? }`
  （voice 预置音色如 `mimo_default`；style 是"亲切一点"这类自然语言风格指令），
  成功返回 **`audio/wav` 二进制**，直接写文件即可播放。
  按 text 字符数 × 3 显示 token 扣账。上游 Xiaomi MiMo-V2.5-TTS（限时免费）。

---

## 总则

1. **强制 Bearer 鉴权**：所有 muicv API 端点强制 `Authorization: Bearer ${MUICV_API_KEY}`，
   **无匿名 / IP 限速档**。
2. **前置 gate 早于网络调用**：skill 必须在「前置检查」段落、调任何 API 之前
   完成"key 存在 + 格式合法"两件事。**禁止**先发请求等服务端报 401 再补救。
3. **教育优先**：未配 key 的用户**先看到引导**，不直接看到 HTTP 错误码。
4. **统一文案**：所有 skill 用本文档下方的标准文案，**逐字 copy**；不要自己改写。
   仅替换文案里的两个占位符（见下）。

---

## 标准文案（直接复制到 SKILL.md「前置检查」段落）

### A. API key 教育流程（key 没设 / 为空）

> 还没看到你配置 muicv API key。{{这个 skill 干的事}}需要 key 来识别身份和计费。
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
> 5. 回来跟我说"重试 {{这个动作}}"

`{{这个 skill 干的事}}` / `{{这个动作}}` 是仅有的两个占位符，按 skill 上下文替换：

| skill | `{{这个 skill 干的事}}` | `{{这个动作}}` |
|---|---|---|
| muicv-render | 渲染 PDF | 渲染 |
| muicv-jobs（fetch） | 抓取 JD | 抓 JD |
| muicv-sync | 云同步 | 同步 |

其它字句不要改。

### B. 格式校验

合法格式：

```js
/^mui_[A-Za-z0-9]{32}$/
```

不匹配 → 不要发请求，给用户：

> 你这个 key 看起来不像 muicv 发的。可能复制时漏了字符或多了空格、引号；
> 去 https://muicv.com/dashboard/api-keys 重新发一份再 export 试试。

### C. 标准 curl 写法

```bash
curl -X POST "${MUICV_API_BASE}/<endpoint>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MUICV_API_KEY}" \
  -d '{...}'
```

**禁止**：

- 写成 `${MUICV_API_KEY:+-H "Authorization: ..."}` 条件式（暗示可选，会让用户以为不配也行）
- 不带 `Authorization` 头
- key 直接拼到 URL query string（会进 server log）

### D. 错误映射表（每个联网 skill 都要带这张表，原文复制）

每条响应都尽量翻译成"用户能直接行动"的话，不要原样抛 HTTP 状态码。

| 现象 | 给用户怎么说 |
|---|---|
| `MUICV_API_KEY` 没 export | 走「A. API key 教育流程」 |
| `MUICV_API_KEY` 格式异常 | 走「B. 格式校验」文案 |
| `401 missing-api-key` / `401 unauthorized` | "muicv 拒了这个 key（可能在 dashboard 撤销过、或者过期）。去 https://muicv.com/dashboard/api-keys 重新发一份，更新 shell rc 后 `source` 一下再来。" **不要重试**。 |
| `402 insufficient-balance` | "你的 token 余额不够这次调用。去 https://muicv.com/dashboard 充值后重试。" 把响应 body 里的 `balance` / `required` 字段念给用户更直观。 |
| `429 rate-limited` | "调太频了，等 60s 再试。" |
| 网络错 / 超时 | "试一次没通常就别再硬试，先看看 https://status.muicv.com 或检查本地网络（dashboard 能正常打开吗？）" |

skill 业务特有的错误（例如 sync 的 `404 no-snapshot`、`400 路径/超限`）放在通用映射表**之后**，标注"业务特有"。

---

## API 地址解析（标准优先级）

每个联网 skill 的「前置检查」必须显式列出这三档：

```
1. 用户对话明确指定的 URL（例："用 localhost:8787"）
2. 环境变量 MUICV_API_BASE
3. 默认 https://api.muicv.com
```

---

## SKILL.md 段落结构（推荐模板）

```markdown
## 前置检查

1. {{素材库根 / 输入文件等业务校验}}
2. **API 地址**：见 [docs/skill-api-key.md](../../docs/skill-api-key.md)「API 地址解析」
3. **API key gate**：见 [docs/skill-api-key.md](../../docs/skill-api-key.md)「A. 教育流程」+「B. 格式校验」
   - 没设 → 发标准教育文案，**不**调 API
   - 格式不合法 → 发格式异常文案，**不**调 API
   - 合法 → 进入主流程
```

skill 文档末尾建议加一节「错误处理小抄」直接 copy 错误映射表 D + skill 业务特有错误。

---

## 何时该改本文档

- muicv API 鉴权方式变化（例如换 OAuth、加二级 scope）
- 错误码语义变化（例如 401 拆成 missing/expired/revoked）
- 计费 / 扣费策略变化（新增按用量扣费的端点、改 cost）
- key 格式变化（例如换前缀、长度）

改完后，全仓库 grep 一遍引用本文档的 skill，**逐一回写**：

```bash
grep -lr "docs/skill-api-key.md" skills/
```

---

## 决策记录

- **2026-05-02**：API 全量收紧到 Bearer 强制鉴权。原因：未来按 token 计费，匿名用户没账户 → 没法计费 / 限流 / 监控用量。详见 [DEV_NOTE.md](../DEV_NOTE.md)「Skill 鉴权与计费策略」一节。
