import { tool } from '@openai/agents';
import TurndownService from 'turndown';
import { z } from 'zod';

import type { AppConfig } from '../../shared/types.ts';

const MAX_CONTENT_LENGTH = 60_000;
const FETCH_TIMEOUT_MS = 30_000;
const SEARCH_TIMEOUT_MS = 20_000;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

const EXA_MCP_BASE = 'https://mcp.exa.ai/mcp';
const PARALLEL_MCP_BASE = 'https://search.parallel.ai/mcp';

interface McpTextContent {
  type: string;
  text: string;
}

interface McpResponsePayload {
  result?: {
    content?: McpTextContent[];
  };
  error?: {
    code?: number;
    message?: string;
  };
}

function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });
  service.remove(['script', 'style', 'meta', 'link', 'noscript', 'iframe']);
  return service;
}

function truncateContent(content: string, limit: number): string {
  if (content.length <= limit) return content;
  return `${content.slice(0, limit)}\n\n...[内容过长已截断，共 ${content.length} 字符，已展示前 ${limit} 字符]`;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMcpPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const data = JSON.parse(trimmed) as McpResponsePayload;
    if (data.error?.message) {
      return null;
    }
    const textItem = data.result?.content?.find((item) => item.type === 'text' && item.text);
    return textItem?.text ?? null;
  } catch {
    return null;
  }
}

export function parseMcpResponseBody(body: string): string | null {
  const direct = parseMcpPayload(body);
  if (direct) return direct;

  const lines = body.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const parsed = parseMcpPayload(line.slice(6));
      if (parsed) return parsed;
    }
  }
  return null;
}

async function searchWithExa(query: string, numResults: number): Promise<string | null> {
  const apiKey = process.env.EXA_API_KEY;
  const url = apiKey ? `${EXA_MCP_BASE}?exaApiKey=${encodeURIComponent(apiKey)}` : EXA_MCP_BASE;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'web_search_exa',
        arguments: {
          query,
          type: 'auto',
          numResults,
          livecrawl: 'fallback',
          contextMaxCharacters: 10_000,
        },
      },
    }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    return null;
  }
  const text = await res.text();
  return parseMcpResponseBody(text);
}

async function searchWithParallel(query: string, numResults: number): Promise<string | null> {
  const apiKey = process.env.PARALLEL_API_KEY;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(PARALLEL_MCP_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'web_search',
        arguments: {
          objective: query,
          search_queries: [query],
          numResults,
        },
      },
    }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    return null;
  }
  const text = await res.text();
  return parseMcpResponseBody(text);
}

export function buildWebTools(_config?: AppConfig) {
  const turndownService = createTurndownService();

  const fetchUrl = tool({
    name: 'fetch_url',
    description:
      '从给定的公开 URL 抓取网页内容，在本地清洗为 Markdown 格式返回。可用于查阅开发文档、GitHub 仓库、公司官网、新闻博文等公开信息。',
    parameters: z.object({
      url: z.string().describe('公开可访问的网页 URL，必须以 http:// 或 https:// 开头'),
      format: z
        .enum(['markdown', 'text', 'html'])
        .optional()
        .describe('期望的返回格式：markdown（默认）、text（纯文本）或 html（原始 HTML）'),
    }),
    execute: async ({ url, format = 'markdown' }) => {
      const trimmedUrl = url.trim();
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        return 'URL 不合法：必须以 http:// 或 https:// 开头';
      }

      let acceptHeader = '*/*';
      if (format === 'markdown') {
        acceptHeader = 'text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1';
      } else if (format === 'text') {
        acceptHeader = 'text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1';
      } else if (format === 'html') {
        acceptHeader = 'text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, */*;q=0.1';
      }

      let res: Response;
      try {
        res = await fetch(trimmedUrl, {
          method: 'GET',
          headers: {
            'user-agent': DEFAULT_USER_AGENT,
            accept: acceptHeader,
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch (err) {
        return `抓取网页失败：${err instanceof Error ? err.message : String(err)}`;
      }

      if (!res.ok) {
        return `抓取网页失败：HTTP ${res.status} ${res.statusText}`;
      }

      let content = '';
      try {
        content = await res.text();
      } catch (err) {
        return `读取网页内容失败：${err instanceof Error ? err.message : String(err)}`;
      }

      if (!content.trim()) {
        return '抓取成功，但网页内容为空。';
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const isHtml = contentType.includes('text/html') || /<html\b|<body\b/i.test(content);

      if (!isHtml) {
        return truncateContent(content.trim(), MAX_CONTENT_LENGTH);
      }

      if (format === 'html') {
        return truncateContent(content.trim(), MAX_CONTENT_LENGTH);
      }

      if (format === 'text') {
        const text = stripHtmlTags(content);
        return truncateContent(text, MAX_CONTENT_LENGTH);
      }

      // 默认格式：转换为 markdown
      try {
        const markdown = turndownService.turndown(content).trim();
        return truncateContent(markdown || stripHtmlTags(content), MAX_CONTENT_LENGTH);
      } catch (_err) {
        // turndown 异常兜底提取纯文本
        const text = stripHtmlTags(content);
        return truncateContent(text, MAX_CONTENT_LENGTH);
      }
    },
  });

  const webSearch = tool({
    name: 'web_search',
    description:
      '联网搜索信息。当需要了解未知的专有名词、公司技术栈背景、行业最新动态或检索外部开源项目时调用。返回包含标题、链接及摘要的搜索结果。',
    parameters: z.object({
      query: z.string().describe('搜索关键词或查询语句'),
      numResults: z.number().int().min(1).max(20).optional().describe('期望返回的结果条数，默认 8 条'),
    }),
    execute: async ({ query, numResults = 8 }) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return '搜索关键词不能为空';
      }

      // 1. 优先尝试 Exa 搜索端点
      try {
        const exaResult = await searchWithExa(trimmedQuery, numResults);
        if (exaResult?.trim()) {
          return exaResult.trim();
        }
      } catch {
        // Exa 失败，平滑降级
      }

      // 2. 降级尝试 Parallel 搜索端点
      try {
        const parallelResult = await searchWithParallel(trimmedQuery, numResults);
        if (parallelResult?.trim()) {
          return parallelResult.trim();
        }
      } catch {
        // Parallel 也失败
      }

      return `搜索「${trimmedQuery}」未获取到有效结果。可能是网络连接受限或服务暂不可用，请稍后重试或尝试更换搜索词。`;
    },
  });

  return [fetchUrl, webSearch];
}
