/**
 * OpenCode Go（https://opencode.ai/zen/go/v1）实探：
 * 拉真实 model 清单，验证 muicv 平台路径依赖的四个能力——
 * chat_completions 基础对话、function tools、SSE 流式 usage、/responses 与 reasoning.effort。
 * 可选带一个 wav 路径时再验音频直通（mimo 系）。
 *
 * 用法：
 *   OPENCODE_GO_API_KEY=xxx node scripts/opencode-go-probe.ts [path/to/sample.wav]
 *
 * 会产生少量配额消耗（几次小请求）。退出码非 0 = 关键能力缺失，落表前需要人工看输出。
 */

const BASE = 'https://opencode.ai/zen/go/v1';

function pickModel(ids: string[], pattern: RegExp, prefer?: RegExp): string | null {
  const matched = ids.filter((id) => pattern.test(id));
  if (matched.length === 0) return null;
  if (prefer) {
    const preferred = matched.find((id) => prefer.test(id));
    if (preferred) return preferred;
  }
  return matched[0];
}

async function main() {
  const apiKey = process.env.OPENCODE_GO_API_KEY;
  if (!apiKey) {
    console.error('缺 OPENCODE_GO_API_KEY 环境变量。例：OPENCODE_GO_API_KEY=xxx node scripts/opencode-go-probe.ts');
    process.exit(2);
  }
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
  let criticalFailure = false;

  // ── 1. models 列表 ──────────────────────────────────────────────
  const modelsRes = await fetch(`${BASE}/models`, { headers });
  if (!modelsRes.ok) {
    console.error(`GET /models 失败：HTTP ${modelsRes.status} ${await modelsRes.text()}`);
    process.exit(1);
  }
  const modelsJson = (await modelsRes.json()) as { data?: Array<{ id?: string }> };
  const ids = (modelsJson.data ?? []).map((m) => m.id ?? '').filter(Boolean);
  console.log(`\n== models（${ids.length} 个）==`);
  for (const id of ids) console.log(`  ${id}`);

  const deepseek = pickModel(ids, /deepseek/i, /flash/i);
  const mimo = pickModel(ids, /^mimo/i, /audio|omni|multimodal/i);
  console.log(`\n选型：deepseek(文本默认候选)=${deepseek}；mimo(语音理解候选)=${mimo}`);

  // ── 2. chat_completions + function tools ────────────────────────
  if (!deepseek) {
    console.error('❌ 没有 deepseek 系 model，落表选型必须人工确认');
    criticalFailure = true;
  } else {
    const toolsRes = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: deepseek,
        messages: [{ role: 'user', content: '帮我算一下 21*2 是多少，必须调用工具。' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'calc',
              description: '计算数学表达式',
              parameters: { type: 'object', properties: { expr: { type: 'string' } }, required: ['expr'] },
            },
          },
        ],
        tool_choice: 'auto',
        stream: false,
        max_tokens: 256,
      }),
    });
    const toolsText = await toolsRes.text();
    if (!toolsRes.ok) {
      console.error(`❌ chat_completions(tools) HTTP ${toolsRes.status}: ${toolsText.slice(0, 300)}`);
      criticalFailure = true;
    } else {
      const parsed = JSON.parse(toolsText) as { choices?: Array<{ message?: { tool_calls?: unknown[]; content?: string } }> };
      const toolCalls = parsed.choices?.[0]?.message?.tool_calls;
      console.log(`✅ chat_completions 对话 OK；tool_calls=${toolCalls ? '有（function tools 可用）' : '无（检查 agent 兼容性）'}`);
    }
  }

  // ── 3. SSE 流式 usage ───────────────────────────────────────────
  if (deepseek) {
    const streamRes = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: deepseek,
        messages: [{ role: 'user', content: '数到 3，逗号分隔。' }],
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 64,
      }),
    });
    if (!streamRes.ok || !streamRes.body) {
      console.error(`❌ 流式请求 HTTP ${streamRes.status}`);
      criticalFailure = true;
    } else {
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sawUsage = false;
      let chunkCount = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          chunkCount++;
          try {
            const chunk = JSON.parse(payload) as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
            if (chunk.usage?.prompt_tokens != null) {
              sawUsage = true;
              console.log(`   usage: prompt=${chunk.usage.prompt_tokens} completion=${chunk.usage.completion_tokens ?? '?'}`);
            }
          } catch {
            // 忽略非法行
          }
        }
      }
      console.log(`${sawUsage ? '✅' : '⚠️'} SSE 流式收到 ${chunkCount} 个 chunk，usage chunk ${sawUsage ? '存在（可计费）' : '缺失！include_usage 未生效'}`);
      if (!sawUsage) criticalFailure = true;
    }
  }

  // ── 4. /responses 与 reasoning.effort ───────────────────────────
  if (deepseek) {
    const baseBody = { model: deepseek, input: 'ping', max_output_tokens: 64 };
    const responsesRes = await fetch(`${BASE}/responses`, { method: 'POST', headers, body: JSON.stringify(baseBody) });
    console.log(
      `${responsesRes.ok ? '✅' : '⚠️'} /responses HTTP ${responsesRes.ok ? 200 : responsesRes.status}${responsesRes.ok ? '' : ` ${await responsesRes.text().then((t) => t.slice(0, 200))}`}`,
    );

    const effortBody = { ...baseBody, reasoning: { effort: 'xhigh' } };
    const effortRes = await fetch(`${BASE}/responses`, { method: 'POST', headers, body: JSON.stringify(effortBody) });
    console.log(
      `${effortRes.ok ? '✅' : '⚠️'} /responses + reasoning.effort=xhigh HTTP ${effortRes.ok ? 200 : effortRes.status}${effortRes.ok ? '' : ` ${await effortRes.text().then((t) => t.slice(0, 200))}`}`,
    );
  }

  // ── 5. 音频直通（可选）───────────────────────────────────────────
  const wavPath = process.argv[2];
  if (wavPath) {
    if (!mimo) {
      console.error('⚠️ 提供 了音频但没有 mimo 系 model，无法验证音频直通');
    } else {
      const { readFileSync } = await import('node:fs');
      const audioBase64 = readFileSync(wavPath).toString('base64');
      const audioRes = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: mimo,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: '请把这段语音转成文字。' },
                { type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } },
              ],
            },
          ],
          max_tokens: 512,
        }),
      });
      console.log(`${audioRes.ok ? '✅' : '❌'} 音频直通(${mimo}) HTTP ${audioRes.ok ? 200 : audioRes.status}`);
      if (!audioRes.ok) console.error((await audioRes.text()).slice(0, 300));
    }
  } else {
    console.log('\n（未提供 wav 路径，跳过音频直通验证。语音理解上线前补跑：node scripts/opencode-go-probe.ts foo.wav）');
  }

  if (criticalFailure) {
    console.error('\n=> 存在关键能力缺失，禁止直接落表');
    process.exit(1);
  }
  console.log('\n=> ✅ 实探完成');
}

void main();
