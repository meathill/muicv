import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { type CapturedJd, EXTENSION_BRIDGE_MAGIC, EXTENSION_BRIDGE_PORTS } from '@muicv/shared';

type PairRecord = { status: 'pending' | 'approved' | 'rejected'; token?: string; createdAt: number };

const pending = new Map<string, PairRecord>();
let pairedTokens: string[] = [];
const PAIR_TTL_MS = 5 * 60 * 1000;

type TokenPersist = { load: () => string[]; save: (tokens: string[]) => void };
let tokenPersist: TokenPersist = { load: () => [], save: () => {} };

export function setTokenPersist(persist: TokenPersist): void {
  tokenPersist = persist;
  pairedTokens = persist.load();
}

let notifyRenderer: (channel: string, payload: unknown) => void = () => {};

export function setBridgeNotifier(fn: (channel: string, payload: unknown) => void): void {
  notifyRenderer = fn;
}

type JobHandlers = {
  ingest: (jd: CapturedJd) => Promise<{ jobId: string; targetPath?: string; status: string }>;
  get: (jobId: string) => { jd?: unknown; [k: string]: unknown } | undefined;
  contribute: (jobId: string) => Promise<{ awarded: number; duplicate: boolean; id?: string }>;
  generate: (jobId: string) => Promise<{ jobId: string; status: string; conversationId?: string }>;
};

let jobHandlers: JobHandlers | null = null;

export function setBridgeJobHandlers(handlers: JobHandlers): void {
  jobHandlers = handlers;
}

/** 测试用：清空配对状态。 */
export function resetBridgeAuthForTest(): void {
  pending.clear();
  pairedTokens = [];
}

export type BridgeReq = {
  method: string;
  pathname: string;
  search: URLSearchParams;
  origin: string | null;
  authorization: string | null;
  body: unknown;
};

export type BridgeRes = { status: number; json: unknown };

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return '*';
  if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) return origin;
  return null;
}

function isPaired(authorization: string | null): boolean {
  const m = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');
  const token = m?.[1];
  if (!token) return false;
  return pairedTokens.includes(token);
}

function prunePending(): void {
  const now = Date.now();
  for (const [k, v] of pending) {
    if (now - v.createdAt > PAIR_TTL_MS) pending.delete(k);
  }
}

export function decidePair(nonce: string, approved: boolean): boolean {
  const rec = pending.get(nonce);
  if (!rec || rec.status !== 'pending') return false;
  if (approved) {
    const token = randomBytes(24).toString('base64url');
    rec.status = 'approved';
    rec.token = token;
    pairedTokens = [...pairedTokens, token].slice(-20);
    tokenPersist.save(pairedTokens);
  } else {
    rec.status = 'rejected';
  }
  return true;
}

function isCapturedJd(value: unknown): value is CapturedJd {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.url === 'string' && typeof o.markdown === 'string' && o.markdown.length > 0;
}

export async function handleBridgeRequest(req: BridgeReq): Promise<BridgeRes> {
  prunePending();
  const origin = allowedOrigin(req.origin);
  if (req.origin && origin === null) return { status: 403, json: { error: 'origin-not-allowed' } };

  if (req.method === 'OPTIONS') return { status: 204, json: null };
  if (req.method === 'GET' && req.pathname === '/health') {
    return { status: 200, json: { ok: true, magic: EXTENSION_BRIDGE_MAGIC, version: '0.1.0' } };
  }

  if (req.method === 'POST' && req.pathname === '/pair/begin') {
    const nonce = (req.body as { nonce?: unknown } | null)?.nonce;
    if (typeof nonce !== 'string' || nonce.length < 8) return { status: 400, json: { error: 'nonce 不合法' } };
    pending.set(nonce, { status: 'pending', createdAt: Date.now() });
    notifyRenderer('extension:pairRequest', { nonce });
    return { status: 200, json: { ok: true } };
  }

  if (req.method === 'GET' && req.pathname === '/pair/status') {
    const nonce = req.search.get('nonce') ?? '';
    const rec = pending.get(nonce);
    if (!rec) return { status: 404, json: { error: 'unknown-nonce' } };
    return { status: 200, json: { status: rec.status, token: rec.token } };
  }

  if (!isPaired(req.authorization)) return { status: 401, json: { error: 'unpaired' } };
  if (!jobHandlers) return { status: 503, json: { error: 'bridge-not-ready' } };

  if (req.method === 'POST' && req.pathname === '/jd') {
    const jd = (req.body as { capturedJd?: unknown } | null)?.capturedJd;
    if (!isCapturedJd(jd)) return { status: 400, json: { error: 'capturedJd 不合法' } };
    try {
      const job = await jobHandlers.ingest(jd);
      return { status: 200, json: { jobId: job.jobId, targetPath: job.targetPath, status: job.status } };
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      return { status, json: { error: err instanceof Error ? err.message : 'ingest-failed' } };
    }
  }

  const jdMatch = req.pathname.match(/^\/jd\/([^/]+)(?:\/(contribute|generate))?$/);
  if (jdMatch) {
    const jobId = decodeURIComponent(jdMatch[1] ?? '');
    const action = jdMatch[2];
    if (req.method === 'GET' && !action) {
      const job = jobHandlers.get(jobId);
      if (!job) return { status: 404, json: { error: 'job-not-found' } };
      const { jd: _jd, ...rest } = job;
      return { status: 200, json: rest };
    }
    if (req.method === 'POST' && action === 'contribute') {
      try {
        const result = await jobHandlers.contribute(jobId);
        return { status: 200, json: result };
      } catch (err) {
        const status = (err as { status?: number }).status ?? 500;
        return { status, json: { error: err instanceof Error ? err.message : 'contribute-failed' } };
      }
    }
    if (req.method === 'POST' && action === 'generate') {
      try {
        const job = await jobHandlers.generate(jobId);
        return { status: 200, json: { jobId: job.jobId, status: job.status, conversationId: job.conversationId } };
      } catch (err) {
        const status = (err as { status?: number }).status ?? 500;
        return { status, json: { error: err instanceof Error ? err.message : 'generate-failed' } };
      }
    }
  }

  return { status: 404, json: { error: 'not-found' } };
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => {
      chunks.push(c);
      if (chunks.reduce((n, b) => n + b.length, 0) > 1_000_000) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host ?? '127.0.0.1';
  const url = new URL(req.url ?? '/', `http://${host}`);
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : null;
  const allow = allowedOrigin(originHeader);
  const cors = {
    'access-control-allow-origin': allow ?? 'null',
    'access-control-allow-headers': 'content-type,authorization,x-muicv-extension',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  };
  if (allow === null && originHeader) {
    res.writeHead(403, { 'content-type': 'application/json', ...cors });
    res.end(JSON.stringify({ error: 'origin-not-allowed' }));
    return;
  }
  const result = await handleBridgeRequest({
    method: (req.method ?? 'GET').toUpperCase(),
    pathname: url.pathname,
    search: url.searchParams,
    origin: originHeader,
    authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
    body: req.method === 'POST' ? await readBody(req) : null,
  });
  res.writeHead(result.status, { 'content-type': 'application/json', ...cors });
  res.end(result.json == null ? '' : JSON.stringify(result.json));
}

let listeningPort: number | null = null;

export function getExtensionBridgePort(): number | null {
  return listeningPort;
}

export function startExtensionBridge(): void {
  const server = createServer((req, res) => {
    void onRequest(req, res);
  });
  server.on('error', (err) => {
    console.warn('[extension-bridge]', err);
  });

  function tryListen(index: number): void {
    const port = EXTENSION_BRIDGE_PORTS[index];
    if (port == null) {
      console.warn('[extension-bridge] 端口都被占用，扩展将无法连接');
      return;
    }
    const onErr = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server.off('error', onErr);
        tryListen(index + 1);
      }
    };
    server.on('error', onErr);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', onErr);
      listeningPort = port;
      console.log(`[extension-bridge] http://127.0.0.1:${port}`);
    });
  }
  tryListen(0);
}
