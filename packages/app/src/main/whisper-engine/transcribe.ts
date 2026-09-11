import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getEngineBinPath, getModelPath, type ModelName } from './state.ts';

/**
 * 本地 whisper-cli 转写（issue #1 M3）。
 *
 * 输入：renderer 端已经转好的 16kHz mono PCM WAV（base64）
 * 流程：写到 tmp/<uuid>/audio.wav → spawn whisper-cli → 解析 audio.wav.json → 删 tmp
 *
 * 不在 main 端做 webm → wav 转码（Node 没有 WebAudio，要 ffmpeg-static 太重）。
 * renderer 用 OfflineAudioContext 转好直接喂过来。
 */

export type LocalTranscribeResult = {
  transcript: string;
  durationMs: number;
  language: string;
  segments?: Array<{ start: number; end: number; text: string }>;
};

export class LocalTranscribeError extends Error {
  constructor(
    message: string,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = 'LocalTranscribeError';
  }
}

export async function transcribeLocal(opts: {
  wavBase64: string;
  modelName: ModelName;
  /** 默认 'auto'，让 whisper.cpp 自动检测（中英文混说也能识别）。 */
  language?: string;
  /** Apple Silicon 默认走 Metal，关掉只跑 CPU（省电 / 调试用）。 */
  noGpu?: boolean;
}): Promise<LocalTranscribeResult> {
  const binPath = getEngineBinPath();
  const modelPath = getModelPath(opts.modelName);

  const work = await mkdtemp(join(tmpdir(), 'muicv-stt-'));
  const wavPath = join(work, 'audio.wav');
  const jsonPath = `${wavPath}.json`;

  try {
    const audio = Buffer.from(opts.wavBase64, 'base64');
    await writeFile(wavPath, audio);

    const args = [
      '-m',
      modelPath,
      '-f',
      wavPath,
      '-l',
      opts.language ?? 'auto',
      '-oj', // output JSON to <wav>.json
      '--no-prints', // 安静模式，stdout 给 progress / 别的输出
    ];
    if (opts.noGpu) args.push('-ng');

    const stderr = await runCli(binPath, args);

    let parsed: WhisperCliJson;
    try {
      const text = await readFile(jsonPath, 'utf8');
      parsed = JSON.parse(text) as WhisperCliJson;
    } catch (err) {
      throw new LocalTranscribeError(
        `whisper-cli 没生成 JSON 输出：${err instanceof Error ? err.message : String(err)}`,
        stderr,
      );
    }

    return mapResult(parsed);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

function runCli(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (c) => {
      stderr += c.toString();
    });
    proc.on('error', (err) => {
      reject(new LocalTranscribeError(`spawn whisper-cli 失败：${err.message}`));
    });
    proc.on('exit', (code) => {
      if (code === 0) resolve(stderr);
      else reject(new LocalTranscribeError(`whisper-cli 退出码 ${code}`, stderr));
    });
  });
}

/** whisper-cli -oj 的 JSON 输出 schema（部分字段，按需取） */
type WhisperCliJson = {
  result?: { language?: string };
  transcription?: Array<{
    timestamps?: { from: string; to: string };
    offsets?: { from: number; to: number };
    text: string;
  }>;
};

function mapResult(j: WhisperCliJson): LocalTranscribeResult {
  const segments = (j.transcription ?? []).map((s) => ({
    start: (s.offsets?.from ?? 0) / 1000,
    end: (s.offsets?.to ?? 0) / 1000,
    text: (s.text ?? '').trim(),
  }));

  const transcript = segments
    .map((s) => s.text)
    .join('')
    .trim();

  const lastEnd = segments.length > 0 ? segments[segments.length - 1]!.end : 0;

  const result: LocalTranscribeResult = {
    transcript,
    durationMs: Math.round(lastEnd * 1000),
    language: j.result?.language ?? 'unknown',
  };
  if (segments.length > 0) result.segments = segments;
  return result;
}
