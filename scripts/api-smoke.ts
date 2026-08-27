/**
 * api.muicv.com 线上冒烟：公开端点总是跑；shell 里有 MUICV_API_KEY 时追加鉴权端点
 * （/me、/llm/v1 小对话、--full 时含 /audio/tts 真实合成）。
 *
 * 用法：
 *   node scripts/api-smoke.ts                 # 只测公开端点
 *   MUICV_API_KEY=mui_xxx node scripts/api-smoke.ts          # + 鉴权端点（会消耗少量余额）
 *   MUICV_API_KEY=mui_xxx node scripts/api-smoke.ts --full   # 再加 /audio/tts（合成一句）
 *
 * 退出码：0 = 公开端点全过且鉴权项（若跑了）无失败；非 0 = 有失败。
 */

const BASE = process.env.MUICV_API_BASE?.replace(/\/$/, '') || 'https://api.muicv.com';

type CheckResult = { name: string; ok: boolean; detail: string };

const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function timedFetch(url: string, init?: RequestInit): Promise<{ res: Response; ms: number }> {
  const t0 = Date.now();
  const res = await fetch(url, init);
  return { res, ms: Date.now() - t0 };
}

async function checkPublic(path: string): Promise<void> {
  try {
    const { res, ms } = await timedFetch(`${BASE}/${path}`);
    const text = await res.text();
    record(`GET /${path}`, res.ok, `HTTP ${res.status} ${ms}ms ${(text.length / 1024).toFixed(1)}KB`);
  } catch (err) {
    record(`GET /${path}`, false, err instanceof Error ? err.message : String(err));
  }
}

async function checkMe(key: string): Promise<void> {
  const { res } = await timedFetch(`${BASE}/me`, { headers: { authorization: `Bearer ${key}` } });
  const text = await res.text();
  const ok = res.ok;
  record('GET /me', ok, ok ? text.slice(0, 160) : `HTTP ${res.status} ${text.slice(0, 120)}`);
}

/**
 * 鉴权小对话。model 不传时先发一次，若被 unsupported_model 拒就按响应里的
 * supported 列表自动换第一个重试——迁移模型后不用改这个脚本。
 */
async function checkLlmChat(key: string): Promise<void> {
  async function attempt(model: string): Promise<Response> {
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user' as const, content: '只回复两个字：好的' }],
      max_completion_tokens: 32,
      stream: false,
    });
    const { res } = await timedFetch(`${BASE}/llm/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body,
    });
    return res;
  }

  let res = await attempt('');
  let text = await res.text();

  // 老表外 model / 空 model 会拿到 400 + supported 数组，用列表第一个重试一次
  try {
    const json = JSON.parse(text) as { error?: string; supported?: string[] };
    if (res.status === 400 && json.error === 'unsupported_model' && Array.isArray(json.supported) && json.supported[0]) {
      console.log(`ℹ️ 默认 model 不在平台表里，按服务端建议改用 ${json.supported[0]} 重试`);
      res = await attempt(json.supported[0]);
      text = await res.text();
    }
  } catch {
    // 非 JSON 直接走下面的判定
  }

  record(
    'POST /llm/v1/chat/completions',
    res.ok,
    res.ok ? `HTTP ${res.status} ${text.slice(0, 140)}` : `HTTP ${res.status} ${text.slice(0, 180)}`,
  );
}

async function checkTts(key: string): Promise<void> {
  const body = JSON.stringify({ text: '你好，这是 mui 简历的语音测试。', voice: 'mimo_default' });
  const { res, ms } = await timedFetch(`${BASE}/audio/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body,
  });
  const ct = res.headers.get('content-type') ?? '';
  const ok = res.ok && ct.includes('audio/');
  const sizeHeader = Number(res.headers.get('content-length') ?? 0);
  record(
    'POST /audio/tts',
    ok,
    ok ? `HTTP ${res.status} ${ms}ms ${ct} ≥${sizeHeader}B` : `HTTP ${res.status} ${ct} ${await res.text().then((t) => t.slice(0, 140))}`,
  );
}

async function main() {
  console.log(`冒烟目标：${BASE}\n`);

  await checkPublic('health');
  await checkPublic('skills/catalog');
  await checkPublic('posts');
  await checkPublic('changelog');

  const key = process.env.MUICV_API_KEY;
  if (key) {
    console.log('\n检测到 MUICV_API_KEY，追加鉴权端点：');
    await checkMe(key);
    await checkLlmChat(key);
    if (process.argv.includes('--full')) {
      await checkTts(key);
    }
  } else {
    console.log('\n未配置 MUICV_API_KEY，跳过鉴权端点。');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  process.exit(failed.length > 0 ? 1 : 0);
}

void main();
