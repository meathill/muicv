# MuiCV CMS MCP Server

这是专为 **Mui 简历 Payload CMS** 定制开发的 Model Context Protocol (MCP) Server，供 AI 编码助手（如 Antigravity IDE、Claude Desktop、Cursor 等）直接读写管理内容。

---

## 🛠️ 提供的 MCP Tools

| Tool 名称 | 说明 | 适用集合 (Collection) |
| :--- | :--- | :--- |
| `create_post` | 创建求职/产品/教程类文章（默认 `draft`） | `posts` |
| `upsert_post` | 按 `slug` 幂等创建或更新文章（支持 `onConflict=update`） | `posts` |
| `get_post` | 按 `slug` 检索文章文档及发布状态 | `posts` |
| `create_skill` | 创建第三方/官方求职 Skill 详情页 | `skillExtensions` |
| `upsert_skill` | 按 `slug` 创建或更新 Skill | `skillExtensions` |
| `get_skill` | 按 `slug` 检索 Skill 详情 | `skillExtensions` |
| `create_changelog` | 创建版本更新日志 | `changelog` |
| `upsert_changelog` | 按 `slug` 创建或更新更新日志 | `changelog` |
| `get_changelog` | 按 `slug` 检索更新日志 | `changelog` |
| `create_article` | 创建多站点博客文章 (`dyqr` / `muicv`) | `articles` |
| `upsert_article` | 按 `site` + `locale` + `slug` 创建或更新博客文章 | `articles` |
| `get_article` | 检索指定站点与语言的多站点文章 | `articles` |

---

## 🚀 启动与运行

### 1. 本地启动 MCP Server（Stdio 模式）
```bash
# 从项目根目录或 packages/cms 目录执行
node packages/cms/mcp/server.ts
```

### 2. 环境变量配置
```env
MUICV_CMS_URL=https://cms.muicv.com
MUICV_CMS_API_KEY=你的CMS_API_Key
# 或者本地调试时：
# MUICV_CMS_URL=http://localhost:3072
```

---

## ⚙️ IDE / Agent 接入配置 (`mcp_config.json`)

在 Antigravity IDE 或 Claude 配置文件中加入：

```json
{
  "mcpServers": {
    "muicv-cms": {
      "command": "node",
      "args": [
        "/Users/meathill/Documents/GitHub/muicv/packages/cms/mcp/server.ts"
      ],
      "env": {
        "MUICV_CMS_URL": "https://cms.muicv.com",
        "MUICV_CMS_API_KEY": "xxx",
        "NODE_PATH": "/Users/meathill/Documents/GitHub/muicv/packages/cms/node_modules"
      }
    }
  }
}
```
