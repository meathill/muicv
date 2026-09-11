import { randomUUID } from 'node:crypto';
import { type mkdir, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';

/**
 * `fs:write` IPC 的核心校验 + 落盘逻辑，抽出来便于单测。
 *
 * 安全模型：
 * - 必须在当前激活 profile 的 workspaceDir 下；先 `path.resolve` 折叠 `..`
 *   再做 `startsWith` 比较，防 `..` bypass
 * - `.claude/` 子树是 skill 内部资源（plugin / settings / agent runtime），
 *   编辑器不允许写
 * - 仅允许 `.md` / `.markdown` 扩展名（v1 范围只编辑简历素材）
 * - 单文件 1MB 上限，防止误粘大段二进制内容
 * - 原子写：先写临时文件 `.<basename>.tmp-<uuid>` 再 `rename` 到目标，
 *   同盘 rename 是原子的，避免半写状态
 */

const MAX_BYTES = 1_000_000;
// .json 加进白名单是为了 `*.resume.json`（预览 drawer 内"上传头像"会 patch 这种
// 文件的 photoUrl 字段）；其他 .json（conversation / config）都在 .claude/ 子树
// 被 isProtected 兜住，扩展面 limited。
const ALLOWED_EXTS = new Set(['.md', '.markdown', '.json']);

export type WriteResult = { ok: true } | { ok: false; error: WriteError };

export type WriteError =
  | 'bad-input'
  | 'no-workspace'
  | 'out-of-workspace'
  | 'protected-dir'
  | 'unsupported-ext'
  | 'too-large'
  | 'io-error';

export type WriteFileToWorkspaceDeps = {
  /** 注入 writeFile / rename / mkdir 给单测；线上走 node:fs/promises。 */
  writeFile?: typeof writeFile;
  rename?: typeof rename;
  mkdir?: typeof mkdir;
  randomUUID?: () => string;
};

function inWorkspace(workspaceDir: string, abs: string): boolean {
  const root = workspaceDir.endsWith(sep) ? workspaceDir : workspaceDir + sep;
  return abs === workspaceDir || abs.startsWith(root);
}

function isProtected(workspaceDir: string, abs: string): boolean {
  const claudeDir = join(workspaceDir, '.claude');
  return abs === claudeDir || abs.startsWith(claudeDir + sep);
}

export async function writeFileToWorkspace(
  workspaceDir: string | null | undefined,
  inputPath: unknown,
  content: unknown,
  deps: WriteFileToWorkspaceDeps = {},
): Promise<WriteResult> {
  if (typeof inputPath !== 'string' || !inputPath || typeof content !== 'string') {
    return { ok: false, error: 'bad-input' };
  }
  if (!workspaceDir) {
    return { ok: false, error: 'no-workspace' };
  }

  const abs = resolve(inputPath);
  if (!inWorkspace(workspaceDir, abs)) {
    return { ok: false, error: 'out-of-workspace' };
  }
  if (isProtected(workspaceDir, abs)) {
    return { ok: false, error: 'protected-dir' };
  }

  const ext = extname(abs).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return { ok: false, error: 'unsupported-ext' };
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) {
    return { ok: false, error: 'too-large' };
  }

  const _writeFile = deps.writeFile ?? writeFile;
  const _rename = deps.rename ?? rename;
  const _uuid = deps.randomUUID ?? randomUUID;

  const tmp = join(dirname(abs), `.${basename(abs)}.tmp-${_uuid()}`);
  try {
    await _writeFile(tmp, content, 'utf8');
    await _rename(tmp, abs);
    return { ok: true };
  } catch {
    return { ok: false, error: 'io-error' };
  }
}

/** 单测用：暴露常量 + 内部 helper。 */
export const __testing = { MAX_BYTES, ALLOWED_EXTS, inWorkspace, isProtected };
