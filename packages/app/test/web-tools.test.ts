import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWebTools, parseMcpResponseBody } from '../src/main/agent/web-tools.ts';

test('buildWebTools 返回 fetch_url 与 web_search 两个工具', () => {
  const tools = buildWebTools();
  assert.equal(tools.length, 2);
  const names = tools.map((t) => t.name);
  assert.ok(names.includes('fetch_url'));
  assert.ok(names.includes('web_search'));
});

test('parseMcpResponseBody 解析标准 JSON-RPC 响应', () => {
  const json = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    result: {
      content: [
        {
          type: 'text',
          text: 'Title: Example\nURL: https://example.com',
        },
      ],
    },
  });

  const parsed = parseMcpResponseBody(json);
  assert.equal(parsed, 'Title: Example\nURL: https://example.com');
});

test('parseMcpResponseBody 解析 SSE 流式响应', () => {
  const sse = [
    'event: message',
    'data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Search result content"}]}}',
    '',
  ].join('\n');

  const parsed = parseMcpResponseBody(sse);
  assert.equal(parsed, 'Search result content');
});

test('parseMcpResponseBody 当存在 error 字段时返回 null', () => {
  const json = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    error: {
      code: -32600,
      message: 'Invalid Request',
    },
  });

  const parsed = parseMcpResponseBody(json);
  assert.equal(parsed, null);
});

interface InvokableTool {
  invoke: (agent: unknown, input: string) => Promise<string>;
}

function asInvokable(toolInstance: unknown): InvokableTool {
  return toolInstance as InvokableTool;
}

test('fetch_url 拒绝非法 URL', async () => {
  const [fetchUrlTool] = buildWebTools();
  const res1 = await asInvokable(fetchUrlTool).invoke(null, JSON.stringify({ url: 'ftp://example.com' }));
  assert.match(res1, /URL 不合法/);

  const res2 = await asInvokable(fetchUrlTool).invoke(null, JSON.stringify({ url: 'file:///etc/passwd' }));
  assert.match(res2, /URL 不合法/);
});

test('fetch_url 抓取 HTML 转换为干净的 Markdown 并移除无用标签', async () => {
  const [fetchUrlTool] = buildWebTools();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <style>body { color: red; }</style>
          <script>console.log('secret');</script>
        </head>
        <body>
          <h1>技术分享</h1>
          <p>请访问 <a href="https://muicv.com">MuiCV 官网</a> 了解详情。</p>
          <ul>
            <li>功能一</li>
            <li>功能二</li>
          </ul>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      },
    );
  };

  try {
    const output = await asInvokable(fetchUrlTool).invoke(null, JSON.stringify({ url: 'https://example.com/blog' }));

    assert.ok(!output.includes('<script>'));
    assert.ok(!output.includes('<style>'));
    assert.ok(!output.includes('console.log'));
    assert.match(output, /# 技术分享/);
    assert.match(output, /\[MuiCV 官网\]\(https:\/\/muicv\.com\)/);
    assert.match(output, /功能一/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetch_url 支持 format=text 提取纯文本', async () => {
  const [fetchUrlTool] = buildWebTools();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response('<h1>主标题</h1><p>测试段落内容</p>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  };

  try {
    const output = await asInvokable(fetchUrlTool).invoke(
      null,
      JSON.stringify({ url: 'https://example.com', format: 'text' }),
    );
    assert.ok(!output.includes('<h1>'));
    assert.ok(!output.includes('#'));
    assert.match(output, /主标题/);
    assert.match(output, /测试段落内容/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetch_url 处理 HTTP 错误与网络异常', async () => {
  const [fetchUrlTool] = buildWebTools();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response('Not Found', { status: 404, statusText: 'Not Found' });
  };

  try {
    const output = await asInvokable(fetchUrlTool).invoke(
      null,
      JSON.stringify({ url: 'https://example.com/not-found' }),
    );
    assert.match(output, /HTTP 404 Not Found/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('web_search 空查询拦截', async () => {
  const [, webSearchTool] = buildWebTools();
  const output = await asInvokable(webSearchTool).invoke(null, JSON.stringify({ query: '   ' }));
  assert.match(output, /搜索关键词不能为空/);
});

test('web_search 优先调用 Exa 端点成功解析', async () => {
  const [, webSearchTool] = buildWebTools();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input);
    if (urlStr.includes('mcp.exa.ai')) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: 'Exa Search: MuiCV 简历生成器' }],
          },
        }),
        { status: 200 },
      );
    }
    return new Response('fail', { status: 500 });
  };

  try {
    const output = await asInvokable(webSearchTool).invoke(null, JSON.stringify({ query: 'muicv' }));
    assert.equal(output, 'Exa Search: MuiCV 简历生成器');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('web_search Exa 失败自动降级到 Parallel', async () => {
  const [, webSearchTool] = buildWebTools();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input);
    if (urlStr.includes('mcp.exa.ai')) {
      return new Response('Exa rate limited', { status: 429 });
    }
    if (urlStr.includes('search.parallel.ai')) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: 'Parallel Search: MuiCV Fallback Results' }],
          },
        }),
        { status: 200 },
      );
    }
    return new Response('not found', { status: 404 });
  };

  try {
    const output = await asInvokable(webSearchTool).invoke(null, JSON.stringify({ query: 'muicv fallback' }));
    assert.equal(output, 'Parallel Search: MuiCV Fallback Results');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
