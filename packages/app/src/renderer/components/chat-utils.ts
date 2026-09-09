import type { AttachmentKind, AttachmentRef } from '../../shared/types.ts';

/**
 * agent runtime 上来的错误分三类，决定 UI 怎么展示：
 *   - ai-not-configured：让用户去 settings 接 AI（402 / muirouter 没绑）
 *   - no-profile：让用户去新建 profile
 *   - plain：当成普通错误打到红条
 */
export function classifyError(raw: string): 'ai-not-configured' | 'no-profile' | 'plain' {
  if (!raw) return 'plain';
  if (raw === 'NOT_LOGGED_IN') return 'plain';
  if (raw === 'NO_PROFILE') return 'no-profile';
  if (/no-muirouter-link|402|muirouter|byok/i.test(raw)) return 'ai-not-configured';
  return 'plain';
}

export function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

export function cryptoRandomId(): string {
  return crypto.randomUUID();
}

/**
 * 剥掉对话标题前面的 emoji 前缀（含 ZWJ / VS-16 组合）+ 紧随的空格。
 * 历史 schema 默认标题是「[emoji] [label] · MM-DD」直接写盘的，新版本默认
 * 标题已经不带 emoji（类型图标在 UI 层独立渲染），这个函数只是兼容旧数据，
 * 不动磁盘 —— 用户改名想保留任何前导符号都不会被误剥。
 */
export function stripLeadingEmoji(s: string): string {
  // \p{Extended_Pictographic} 主体 + ️ (VS-16) + ‍ (ZWJ)
  return s.replace(/^(?:[\p{Extended_Pictographic}️‍]+\s*)+/u, '');
}

/**
 * 把 markdown 里出现的相对路径（如 "versions/xxx.md"）拼成绝对路径，
 * 配合 openRightPanel 在右栏打开预览。已经是绝对路径就直接返回。
 */
export function resolveWorkspacePath(workspaceDir: string | null, p: string): string {
  if (!p) return p;
  if (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)) return p;
  if (!workspaceDir) return p;
  const sep = workspaceDir.includes('\\') ? '\\' : '/';
  return workspaceDir.replace(/[/\\]+$/, '') + sep + p.replace(/^[/\\]+/, '');
}

const KIND_LABEL: Record<AttachmentKind, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  markdown: 'Markdown',
  text: '纯文本',
  image: '图像',
  audio: '音频',
};

/**
 * 把附件列表拼成 user message footer。agent 拿到后 `read_file` 这些路径即可。
 *
 * - PDF / DOCX：已经在 main 进程提取出 sidecar，明确告知 agent 走哪个 .txt
 * - 图像：分支处理——
 *     supportsVision=true：本条消息已经把图 base64 进 input_image，agent 直接看图
 *     supportsVision=false：模型看不到图（如 mimo 系），请用户用文字描述图片内容
 *   两种情况下 agent 都**禁止 read_file 二进制图片**——会拿到一堆乱码。
 *   简历用的证件照上传走"预览 drawer → 上传头像"UI 路径，agent 不参与。
 */
export function formatAttachmentsFooter(
  refs: AttachmentRef[],
  opts: { supportsVision: boolean; supportsAudioInput?: boolean },
): string {
  if (refs.length === 0) return '';
  const lines = refs.map((r) => {
    const head = `- ${r.path}（${KIND_LABEL[r.kind]}`;
    if (r.kind === 'image') {
      return opts.supportsVision
        ? `${head}，已随消息附图，agent 直接看图，不要 read_file）`
        : `${head}，当前模型不支持 vision，看不到图；请用户用文字描述图片内容。不要 read_file）`;
    }
    if (r.kind === 'audio') {
      return opts.supportsAudioInput
        ? `${head}，已随消息附音频，模型直接听原音，不要 read_file）`
        : `${head}，当前模型不支持音频，请切到 mimo-v2.5 再发，或先做语音转写。不要 read_file）`;
    }
    return r.textPath ? `${head}，已提取文本：${r.textPath}）` : `${head}）`;
  });
  return `\n\n---\n[附件]\n${lines.join('\n')}`;
}

export const MAX_ATTACHMENTS_PER_SEND = 5;
export const MAX_IMAGES_PER_SEND = 4;

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
export function isImageFile(file: { name: string; type?: string }): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(ext);
}

export type FileUploadFilterResult = {
  accepted: File[];
  errors: string[];
};

export function filterFilesForUpload(
  files: File[],
  options: {
    pendingAttachments: AttachmentRef[];
    acceptImage?: boolean;
    maxAttachments?: number;
    maxImages?: number;
  },
): FileUploadFilterResult {
  const {
    pendingAttachments,
    acceptImage = true,
    maxAttachments = MAX_ATTACHMENTS_PER_SEND,
    maxImages = MAX_IMAGES_PER_SEND,
  } = options;
  const errors: string[] = [];

  // 单批次内按 name + size 粗粒度去重
  const seen = new Set<string>();
  let list = files.filter((f) => {
    const key = `${f.name}:${f.size}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!acceptImage) {
    const blocked = list.filter(isImageFile);
    if (blocked.length > 0) {
      errors.push(`当前模型不支持图片（${blocked.map((f) => f.name).join('、')}），请切到支持 vision 的模型`);
    }
    list = list.filter((f) => !isImageFile(f));
  }

  // 严格限制图片数量：最多 maxImages 张图片
  const pendingImageCount = pendingAttachments.filter((a) => a.kind === 'image').length;
  let imageRemaining = Math.max(0, maxImages - pendingImageCount);
  const filtered: File[] = [];
  let excessImageCount = 0;

  for (const file of list) {
    if (isImageFile(file)) {
      if (imageRemaining > 0) {
        filtered.push(file);
        imageRemaining--;
      } else {
        excessImageCount++;
      }
    } else {
      filtered.push(file);
    }
  }

  if (excessImageCount > 0) {
    errors.push(`单次最多上传 ${maxImages} 张图片，多余的 ${excessImageCount} 张已略过`);
  }

  list = filtered;

  const remaining = maxAttachments - pendingAttachments.length;
  if (remaining <= 0) {
    if (list.length > 0) {
      errors.push(`一次最多 ${maxAttachments} 个附件，先发一轮再传`);
    }
    return { accepted: [], errors };
  }

  const accepted = list.slice(0, remaining);
  if (list.length > remaining) {
    errors.push(`一次最多 ${maxAttachments} 个附件，多余的 ${list.length - remaining} 个跳过`);
  }

  return { accepted, errors };
}
