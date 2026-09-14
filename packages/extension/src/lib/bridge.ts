import {
  type CapturedJd,
  canonicalizeUrl,
  EXTENSION_BRIDGE_MAGIC,
  EXTENSION_BRIDGE_PORTS,
  type ExtensionJobState,
} from '@muicv/shared';

const TOKEN_KEY = 'pairingToken';
const QUEUE_KEY = 'pendingJds';

type PairBegin = { nonce: string };
type PairStatus = { status: 'pending' | 'approved' | 'rejected'; token?: string };
type Health = { ok: boolean; magic: string; port: number; version?: string };

export type BridgeConnection =
  | { ok: true; port: number; token: string }
  | { ok: false; reason: 'app-offline' | 'unpaired' | 'rejected' };

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = { 'content-type': 'application/json', 'x-muicv-extension': '1' };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

async function getToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(TOKEN_KEY);
  const token = stored[TOKEN_KEY];
  return typeof token === 'string' && token.length > 8 ? token : null;
}

async function setToken(token: string | null): Promise<void> {
  if (token) await chrome.storage.local.set({ [TOKEN_KEY]: token });
  else await chrome.storage.local.remove(TOKEN_KEY);
}

export async function discoverPort(): Promise<number | null> {
  for (const port of EXTENSION_BRIDGE_PORTS) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { method: 'GET' });
      if (!res.ok) continue;
      const body = (await res.json()) as Health;
      if (body.ok && body.magic === EXTENSION_BRIDGE_MAGIC) return port;
    } catch {
      /* 端口没人听 */
    }
  }
  return null;
}

export async function pairIfNeeded(port: number): Promise<BridgeConnection> {
  const existing = await getToken();
  if (existing) {
    const probe = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: headers(existing),
    }).catch(() => null);
    if (probe?.ok) return { ok: true, port, token: existing };
    await setToken(null);
  }

  const nonce = crypto.randomUUID();
  const begin = await fetch(`http://127.0.0.1:${port}/pair/begin`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ nonce } satisfies PairBegin),
  }).catch(() => null);
  if (!begin?.ok) return { ok: false, reason: 'app-offline' };

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const st = await fetch(`http://127.0.0.1:${port}/pair/status?nonce=${encodeURIComponent(nonce)}`).catch(() => null);
    if (!st?.ok) continue;
    const body = (await st.json()) as PairStatus;
    if (body.status === 'rejected') return { ok: false, reason: 'rejected' };
    if (body.status === 'approved' && body.token) {
      await setToken(body.token);
      return { ok: true, port, token: body.token };
    }
  }
  return { ok: false, reason: 'unpaired' };
}

export async function connect(): Promise<BridgeConnection> {
  const port = await discoverPort();
  if (port == null) return { ok: false, reason: 'app-offline' };
  return pairIfNeeded(port);
}

export async function postJd(
  conn: Extract<BridgeConnection, { ok: true }>,
  jd: CapturedJd,
): Promise<{ jobId: string; targetPath?: string }> {
  const res = await fetch(`http://127.0.0.1:${conn.port}/jd`, {
    method: 'POST',
    headers: headers(conn.token),
    body: JSON.stringify({ capturedJd: jd }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`桌面端拒收 JD（${res.status}）${text.slice(0, 160)}`);
  }
  return (await res.json()) as { jobId: string; targetPath?: string };
}

export async function getJob(conn: Extract<BridgeConnection, { ok: true }>, jobId: string): Promise<ExtensionJobState> {
  const res = await fetch(`http://127.0.0.1:${conn.port}/jd/${encodeURIComponent(jobId)}`, {
    headers: headers(conn.token),
  });
  if (!res.ok) throw new Error(`查询失败 ${res.status}`);
  return (await res.json()) as ExtensionJobState;
}

export async function contributeJob(
  conn: Extract<BridgeConnection, { ok: true }>,
  jobId: string,
): Promise<{ awarded: number; duplicate: boolean; id?: string }> {
  const res = await fetch(`http://127.0.0.1:${conn.port}/jd/${encodeURIComponent(jobId)}/contribute`, {
    method: 'POST',
    headers: headers(conn.token),
    body: '{}',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`贡献失败（${res.status}）${text.slice(0, 160)}`);
  }
  return (await res.json()) as { awarded: number; duplicate: boolean; id?: string };
}

export async function generateJob(conn: Extract<BridgeConnection, { ok: true }>, jobId: string): Promise<void> {
  const res = await fetch(`http://127.0.0.1:${conn.port}/jd/${encodeURIComponent(jobId)}/generate`, {
    method: 'POST',
    headers: headers(conn.token),
    body: '{}',
  });
  if (!res.ok) throw new Error(`生成失败 ${res.status}`);
}

export async function enqueueJd(jd: CapturedJd): Promise<void> {
  const stored = await chrome.storage.local.get(QUEUE_KEY);
  const list = Array.isArray(stored[QUEUE_KEY]) ? (stored[QUEUE_KEY] as CapturedJd[]) : [];
  const next = [...list.filter((x) => canonicalizeUrl(x.url) !== jd.canonicalUrl), jd].slice(-20);
  await chrome.storage.local.set({ [QUEUE_KEY]: next });
}

export async function drainQueue(conn: Extract<BridgeConnection, { ok: true }>): Promise<number> {
  const stored = await chrome.storage.local.get(QUEUE_KEY);
  const list = Array.isArray(stored[QUEUE_KEY]) ? (stored[QUEUE_KEY] as CapturedJd[]) : [];
  if (list.length === 0) return 0;
  const remain: CapturedJd[] = [];
  let sent = 0;
  for (const jd of list) {
    try {
      await postJd(conn, jd);
      sent += 1;
    } catch {
      remain.push(jd);
    }
  }
  await chrome.storage.local.set({ [QUEUE_KEY]: remain });
  return sent;
}

export function wakeApp(): void {
  chrome.tabs.create({ url: 'muicv://extension-wake', active: false }).catch(() => {
    /* 没装桌面端时 tabs.create 会失败，popup 自己提示 */
  });
}
