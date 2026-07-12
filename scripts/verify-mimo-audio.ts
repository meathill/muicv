/**
 * 验证 Xiaomi MiMo 上游是否接受 OpenAI 兼容的 `input_audio` content part。
 *
 * 用法：
 *
 *   MIMO_API_KEY=sk-xxxx node scripts/verify-mimo-audio.ts path/to/sample.wav
 *
 * 退出码 0 = 上游接受 + 返回非空文本（可以做音频直通了，去 packages/shared/src/pricing.ts
 * 的 mimo-v2.5 加 supportsAudioInput: true）；非 0 = 上游不支持 / key 错 / 网络挂，按错误码
 * 决定要不要继续 STT 老路径。
 *
 * 不依赖项目其它代码，便于零依赖独立验真。
 */

import { readFileSync } from 'node:fs';

const XIAOMI_BASE = 'https://token-plan-cn.xiaomimimo.com/v1';

async function main() {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    console.error('缺 MIMO_API_KEY 环境变量。例：MIMO_API_KEY=sk-xxxx node scripts/verify-mimo-audio.ts foo.wav');
    process.exit(2);
  }

  const wavPath = process.argv[2];
  if (!wavPath) {
    console.error('缺音频文件路径。例：node scripts/verify-mimo-audio.ts ~/Desktop/test.wav（建议 5–10s 中文清晰说话）');
    process.exit(2);
  }

  let wav: Buffer;
  try {
    wav = readFileSync(wavPath);
  } catch (err) {
    console.error(`读不到 ${wavPath}：`, err);
    process.exit(2);
  }

  const audioBase64 = wav.toString('base64');
  console.log(`音频 ${wavPath} 读取成功，${(wav.byteLength / 1024).toFixed(1)} KB，转 base64 后 ${audioBase64.length} 字节。`);

  const body = {
    model: 'mimo-v2.5',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请把这段语音的内容转成文字，并简单评价说话人语气。' },
          { type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } },
        ],
      },
    ],
  };

  const res = await fetch(`${XIAOMI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`上游响应 HTTP ${res.status}`);
  console.log('响应体：');
  console.log(text);

  if (!res.ok) {
    console.error('\n=> 上游拒绝。可能原因：');
    console.error('  1. mimo 不支持 OpenAI input_audio 规范 → 维持 STT 老路径，不要加 supportsAudioInput');
    console.error('  2. key 无效 / 没开通 mimo-v2.5 → 找小米支持核对');
    console.error('  3. 文件格式不对 → 用 16k mono PCM WAV 再试');
    process.exit(1);
  }

  try {
    const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content ?? '';
    if (reply.trim().length === 0) {
      console.error('\n=> 上游 200 但 content 为空，慎重——再换个清晰一点的音频试试。');
      process.exit(1);
    }
    console.log('\n=> ✅ 上游接受音频且回复非空。可以加 supportsAudioInput: true 然后接前端线了。');
    process.exit(0);
  } catch (err) {
    console.error('响应解析失败：', err);
    process.exit(1);
  }
}

void main();
