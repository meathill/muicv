/**
 * 服务端跟进抓取候选链接的 SSRF 防护：
 *   - 只允许 http(s)、默认端口（80 / 443），不带用户名密码
 *   - 拒绝 IP 字面量里的私网 / 回环 / 链路本地 / CGNAT / 组播 / 保留段（v4 + v6），以及 localhost / .local / .internal 等
 *   - 手动跟随重定向（≤3 跳），每一跳重新校验
 *   - 超时 + 读取字节上限（流式截断）
 * 注：Workers 的 fetch 本身无法访问 RFC1918 内网，DNS 解析到私网的域名也会被平台拦截；这里是纵深防御。
 */

export type FetchLike = typeof fetch;

export type SafeFetchResult = { status: number; contentType: string; body: string; finalUrl: string };

export const SAFE_FETCH_TIMEOUT_MS = 8000;
export const SAFE_FETCH_MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

const BLOCKED_HOST = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|arpa)$/i;

function ipv4Parts(host: string): number[] | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  const parts = host.split('.').map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

function isPrivateIpv4([a = 0, b = 0]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '::' || h === '::1') return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (mapped?.[1]) {
    const v4 = ipv4Parts(mapped[1]);
    return !v4 || isPrivateIpv4(v4);
  }
  return /^(fc|fd|fe[89ab]|ff)/.test(h) || h.startsWith('::ffff:') || h.startsWith('64:ff9b:');
}

/** 校验 URL 是否允许服务端抓取；不允许返回 null。 */
export function toPublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== '80' && url.port !== '443') return null;
  const host = url.hostname.toLowerCase();
  if (!host || BLOCKED_HOST.test(host) || !host.includes('.')) return null;
  if (host.includes(':') || host.startsWith('[')) return isPrivateIpv6(host) ? null : url;
  const v4 = ipv4Parts(host);
  if (v4) return isPrivateIpv4(v4) ? null : url;
  // 十进制 / 十六进制整数 IP 等非常规写法：一律拒绝
  if (/^[\d.x]+$/i.test(host)) return null;
  url.hash = '';
  return url;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const merged = new Uint8Array(Math.min(size, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.max(merged.length - offset, 0));
    merged.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(merged);
}

export async function safeFetch(
  fetchImpl: FetchLike,
  raw: string,
  options: { timeoutMs?: number; maxBytes?: number; accept?: string } = {},
): Promise<SafeFetchResult> {
  let current = toPublicUrl(raw);
  const signal = AbortSignal.timeout(options.timeoutMs ?? SAFE_FETCH_TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!current) return { status: 0, contentType: '', body: '', finalUrl: raw };
    const res = await fetchImpl(current.toString(), {
      redirect: 'manual',
      signal,
      headers: {
        accept: options.accept ?? 'text/html,application/json;q=0.9,*/*;q=0.5',
        'user-agent': 'muicv-jobs-bot/1.0 (+https://muicv.com/jobs)',
      },
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = toPublicUrl(new URL(location, current).toString());
      continue;
    }
    const contentType = res.headers.get('content-type') ?? '';
    const textual = /text\/|json|xml/i.test(contentType) || contentType === '';
    const body = textual ? await readCapped(res, options.maxBytes ?? SAFE_FETCH_MAX_BYTES) : '';
    return { status: res.status, contentType, body, finalUrl: current.toString() };
  }
  return { status: 0, contentType: '', body: '', finalUrl: raw };
}
