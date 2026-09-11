import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { describeCause } from './error-format.ts';
import {
  getEngineBinDir,
  getEngineBinPath,
  getEngineRoot,
  getModelPath,
  getModelsDir,
  MODEL_CATALOG,
  type ModelName,
} from './state.ts';

/**
 * 引擎 + 模型的下载 / 解压 / 校验 / 卸载（issue #1 M3）。
 *
 * 引擎二进制：从 GitHub Release `whisper-engine-vX.Y.Z` 拉对应平台的 .tar.gz +
 * .sha256，解压到 <userData>/whisper-engine/engine/，写一份 .version 标记。
 *
 * 模型：从 HuggingFace ggerganov/whisper.cpp 拉，存到 <userData>/whisper-engine/models/。
 *
 * fetch 下载的文件不会带 com.apple.quarantine 扩展属性（不是 LaunchServices 路径），
 * Gatekeeper 不会触发，binary 即便 staple 不可用也能直接 spawn。
 */

export type ProgressEvent = {
  phase: 'download' | 'extract' | 'verify' | 'done';
  /** 0~1，下载阶段是按字节算；其他阶段没法估，按 phase 切换 */
  fraction: number;
  /** 当前已传字节 / 总字节，仅 download 阶段 */
  receivedBytes?: number;
  totalBytes?: number;
};

export type ProgressCallback = (event: ProgressEvent) => void;

const ENGINE_RELEASE_OWNER = 'meathill';
const ENGINE_RELEASE_REPO = 'muicv';

function platformTarget(): string {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  if (process.platform === 'darwin') return `darwin-${arch}`;
  if (process.platform === 'win32') return 'win-x64';
  return 'linux-x64';
}

function engineAssetName(): string {
  return `whisper-engine-${platformTarget()}.tar.gz`;
}

function engineAssetUrl(engineVersion: string): string {
  // engineVersion 形如 '1.0.0'，跟 workflow inputs 对齐；release tag 是 whisper-engine-v1.0.0
  return `https://github.com/${ENGINE_RELEASE_OWNER}/${ENGINE_RELEASE_REPO}/releases/download/whisper-engine-v${engineVersion}/${engineAssetName()}`;
}

function engineSha256Url(engineVersion: string): string {
  return `${engineAssetUrl(engineVersion)}.sha256`;
}

async function fetchToFile(
  url: string,
  dest: string,
  onProgress?: (received: number, total: number | null) => void,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    throw new Error(`下载失败（连接 ${url}）：${describeCause(err)}`);
  }
  if (!res.ok || !res.body) {
    const status = res.statusText ? `${res.status} ${res.statusText}` : String(res.status);
    throw new Error(`下载失败（HTTP ${status}）：${url}`);
  }
  const totalHeader = res.headers.get('content-length');
  const total = totalHeader ? Number(totalHeader) : null;
  let received = 0;

  const sink = createWriteStream(dest);
  const reader = Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>);
  reader.on('data', (chunk: Buffer) => {
    received += chunk.length;
    onProgress?.(received, total);
  });
  try {
    await pipeline(reader, sink);
  } catch (err) {
    throw new Error(`下载失败（写入 ${dest}）：${describeCause(err)}`);
  }
}

async function sha256OfFile(path: string): Promise<string> {
  const { createReadStream } = await import('node:fs');
  return await new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

/** sha256 文件格式：`<hex>  <filename>`（GNU sha256sum / shasum 的标准格式） */
function parseSha256Doc(text: string): string | null {
  const m = text.trim().split(/\s+/);
  return m[0] && /^[0-9a-f]{64}$/i.test(m[0]) ? m[0].toLowerCase() : null;
}

async function extractTarGz(archive: string, dest: string): Promise<void> {
  // 用系统 tar：macOS / Linux 自带；Windows 10+ 自带 BSD tar 也支持 .tar.gz
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('tar', ['-xzf', archive, '-C', dest], { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`tar 解压退出码 ${code}`))));
  });
}

export async function installEngine(opts: { engineVersion: string; onProgress?: ProgressCallback }): Promise<void> {
  await mkdir(getEngineBinDir(), { recursive: true });

  const tmpFile = join(tmpdir(), `muicv-${engineAssetName()}`);
  const sha256Url = engineSha256Url(opts.engineVersion);
  const assetUrl = engineAssetUrl(opts.engineVersion);

  try {
    // 1) 下载 .tar.gz（带进度）
    opts.onProgress?.({ phase: 'download', fraction: 0 });
    await fetchToFile(assetUrl, tmpFile, (received, total) => {
      const ev: ProgressEvent = {
        phase: 'download',
        fraction: total ? received / total : 0,
        receivedBytes: received,
      };
      if (total != null) ev.totalBytes = total;
      opts.onProgress?.(ev);
    });

    // 2) 校验 sha256（拉远端 sha256 文档对比）
    opts.onProgress?.({ phase: 'verify', fraction: 0 });
    let shaDoc: string;
    try {
      const r = await fetch(sha256Url);
      if (!r.ok) throw new Error(`HTTP ${r.status}${r.statusText ? ` ${r.statusText}` : ''}`);
      shaDoc = await r.text();
    } catch (err) {
      throw new Error(`下载 sha256 文档失败（${sha256Url}）：${describeCause(err)}`);
    }
    const remoteSha = parseSha256Doc(shaDoc);
    if (!remoteSha) throw new Error(`sha256 文档格式不对：${sha256Url}`);
    const localSha = await sha256OfFile(tmpFile);
    if (localSha !== remoteSha) {
      throw new Error(`sha256 校验失败：本地 ${localSha} ≠ 远端 ${remoteSha}（可能下载损坏，请重试）`);
    }

    // 3) 解压到 <userData>/whisper-engine/engine/
    opts.onProgress?.({ phase: 'extract', fraction: 0 });
    await extractTarGz(tmpFile, getEngineBinDir());

    // 4) chmod +x（macOS / Linux 必需，Windows 不需要也无害）
    if (process.platform !== 'win32') {
      await chmod(getEngineBinPath(), 0o755);
    }

    // 5) 写 .version 标记
    await writeFile(join(getEngineBinDir(), '.version'), opts.engineVersion, 'utf8');

    opts.onProgress?.({ phase: 'done', fraction: 1 });
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

export async function installModel(opts: { name: ModelName; onProgress?: ProgressCallback }): Promise<void> {
  await mkdir(getModelsDir(), { recursive: true });

  const dest = getModelPath(opts.name);
  const url = MODEL_CATALOG[opts.name].downloadUrl;
  const tmp = `${dest}.partial`;

  opts.onProgress?.({ phase: 'download', fraction: 0 });
  try {
    await fetchToFile(url, tmp, (received, total) => {
      const ev: ProgressEvent = {
        phase: 'download',
        fraction: total ? received / total : 0,
        receivedBytes: received,
      };
      if (total != null) ev.totalBytes = total;
      opts.onProgress?.(ev);
    });
    // 模型从 HuggingFace 直接拉，没有 sha256 文档；用 size 兜底校验（>= 9/10 catalog size 视为 OK）
    const { stat } = await import('node:fs/promises');
    const s = await stat(tmp);
    const expected = MODEL_CATALOG[opts.name].sizeBytes;
    if (s.size < expected * 0.9) {
      throw new Error(`模型文件大小异常（${s.size} bytes，预期 ~${expected}），可能下载中断`);
    }
    const { rename } = await import('node:fs/promises');
    await rename(tmp, dest);
    opts.onProgress?.({ phase: 'done', fraction: 1 });
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

export async function uninstallEngine(): Promise<void> {
  await rm(getEngineBinDir(), { recursive: true, force: true });
}

export async function uninstallModel(name: ModelName): Promise<void> {
  await rm(getModelPath(name), { force: true });
}

/** 整体卸载（删 <userData>/whisper-engine/）。 */
export async function uninstallAll(): Promise<void> {
  await rm(getEngineRoot(), { recursive: true, force: true });
}
