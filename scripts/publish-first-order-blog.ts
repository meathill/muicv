import { readFile } from 'node:fs/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

const MCP_URL = 'https://meathill.com/api/mcp';
const SOURCE_PATH = new URL('../docs/marketing-first-order-campaign.md', import.meta.url);
const COVER_IMAGE_PATH = new URL('../docs/marketing/first-order/blog-hero-first-order.png', import.meta.url);

type JsonRpcResponse<T = unknown> = {
  id?: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

async function promptSecret(question: string): Promise<string> {
  if (!input.isTTY) {
    throw new Error('需要 TTY 来安全输入 bearer token');
  }

  output.write(question);
  input.setRawMode(true);

  let value = '';
  await new Promise<void>((resolve) => {
    function onData(buffer: Buffer): void {
      const char = buffer.toString('utf8');
      if (char === '\r' || char === '\n') {
        input.off('data', onData);
        input.setRawMode(false);
        output.write('\n');
        resolve();
        return;
      }
      if (char === '\u0003') {
        input.setRawMode(false);
        process.exit(130);
      }
      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    }

    input.on('data', onData);
  });

  return value.trim();
}

async function callMcp<T>(token: string, id: number, method: string, params?: unknown): Promise<T> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 20_000);
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
    signal: abortController.signal,
  });

  const text = await readMcpResponse(response);
  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const jsonText = text.startsWith('event:')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice('data: '.length)
    : text;

  if (!jsonText) {
    throw new Error(`无法解析 MCP 响应：${text}`);
  }

  const payload = JSON.parse(jsonText) as JsonRpcResponse<T>;
  if (payload.error) {
    throw new Error(`MCP ${method} 失败：${payload.error.message}`);
  }
  return payload.result as T;
}

async function readMcpResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    return response.text();
  }

  if (!response.body) {
    throw new Error('MCP SSE 响应没有 body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.includes('\n\n') && text.includes('data: ')) {
      await reader.cancel();
      return text;
    }
  }

  text += decoder.decode();
  return text;
}

function extractBlogDraft(source: string): string {
  const start = source.indexOf('```markdown\n# Mui 简历出了第一单，虽然钱没收到');
  if (start < 0) {
    throw new Error('没有找到博客 markdown 草稿起点');
  }
  const contentStart = start + '```markdown\n'.length;
  const end = source.indexOf('\n```', contentStart);
  if (end < 0) {
    throw new Error('没有找到博客 markdown 草稿终点');
  }
  return source.slice(contentStart, end).trim();
}

function buildPostPayload(markdown: string, coverImage: string | null): Record<string, unknown> {
  return {
    title: 'Mui 简历出了第一单，虽然钱没收到',
    slug: 'muicv-first-order',
    status: 'draft',
    excerpt:
      '第一笔订单最重要的不是收入，而是信号：有人真的需要一个从简历制作、模拟面试、面试复盘到入职辅导都能陪跑的 AI 求职平台。',
    tags: ['Mui 简历', '独立产品', 'AI 求职', 'Build in Public'],
    categories: ['产品日志'],
    markdown,
    coverImage,
  };
}

function scoreTool(tool: McpTool): number {
  const haystack = `${tool.name} ${tool.description ?? ''}`.toLowerCase();
  let score = 0;
  for (const keyword of ['post', 'blog', 'article', 'create', 'upsert', 'publish']) {
    if (haystack.includes(keyword)) score += 1;
  }
  return score;
}

function findUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    if (value.startsWith('https://')) {
      return value;
    }
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return findUrl(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    return null;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
    return null;
  }

  for (const [key, item] of Object.entries(value)) {
    if (key.toLowerCase().includes('url') && typeof item === 'string' && item.startsWith('https://')) {
      return item;
    }
    const found = findUrl(item);
    if (found) return found;
  }
  return null;
}

async function uploadCoverImage(token: string): Promise<string | null> {
  const data = await readFile(COVER_IMAGE_PATH);
  const result = await callMcp(token, 3, 'tools/call', {
    name: 'upload_image',
    arguments: {
      data: data.toString('base64'),
      contentType: 'image/png',
      filename: 'muicv-first-order-blog-hero.png',
    },
  });

  const url = findUrl(result);
  if (!url) {
    console.log('没有从 upload_image 响应中解析出 URL，文章会先不设置 coverImage。');
  }
  return url;
}

async function main(): Promise<void> {
  const token = process.env.BLOG_MCP_TOKEN?.trim() || (await promptSecret('Blog MCP bearer token: '));
  const existingPostId = process.env.BLOG_POST_ID?.trim();
  const source = await readFile(SOURCE_PATH, 'utf8');
  const content = extractBlogDraft(source);

  await callMcp(token, 1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'codex-muicv-blog-publisher', version: '1.0.0' },
  });

  const toolsResult = await callMcp<{ tools: McpTool[] }>(token, 2, 'tools/list');
  const tools = toolsResult.tools ?? [];

  if (existingPostId) {
    const coverImage = tools.some((tool) => tool.name === 'upload_image') ? await uploadCoverImage(token) : null;
    if (!coverImage) {
      throw new Error('上传头图后没有拿到 URL，未更新文章');
    }

    const result = await callMcp(token, 4, 'tools/call', {
      name: 'update_blog_post',
      arguments: {
        id: existingPostId,
        patch: { coverImage },
      },
    });

    console.log('\n头图更新结果：');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const candidates = tools
    .map((tool) => ({ tool, score: scoreTool(tool) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  console.log('\n可用 tools:');
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.description ?? ''}`);
  }

  const selected = candidates[0]?.tool;
  if (!selected) {
    throw new Error('没有找到看起来能创建博客文章的 MCP tool');
  }

  console.log(`\n准备调用 tool: ${selected.name}`);
  const rl = createInterface({ input, output });
  const answer = await rl.question('确认创建 draft 文章？输入 yes 继续：');
  rl.close();
  if (answer.trim() !== 'yes') {
    console.log('已取消。');
    return;
  }

  const coverImage = tools.some((tool) => tool.name === 'upload_image') ? await uploadCoverImage(token) : null;
  const payload = buildPostPayload(content, coverImage);
  const result = await callMcp(token, 4, 'tools/call', {
    name: selected.name,
    arguments: payload,
  });

  console.log('\n发布结果：');
  console.log(JSON.stringify(result, null, 2));
}

await main();
