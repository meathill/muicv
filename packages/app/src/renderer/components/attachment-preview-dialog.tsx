import { FolderOpenIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { AttachmentRef } from '../../shared/types.ts';
import { pathToMuicvPdfUrl } from '../lib/muicv-pdf-url';
import { useAppStore } from '../lib/store';
import { useEnterAnimation } from '../lib/use-enter-animation';
import { resolveWorkspacePath } from './chat-utils';
import { MarkdownView } from './markdown-view';

type Props = {
  attachment: AttachmentRef | null;
  onClose: () => void;
};

/**
 * 点击附件 chip 弹出的预览 modal。复用 muicv-pdf:// 协议看 PDF；图像走
 * `fs:readAsDataUrl` IPC 拿 data URL；md / txt / docx 的 sidecar 走
 * `fs:read` 读 utf8。点 backdrop / 按 ESC / 点关闭按钮都会关闭。
 *
 * 跟 PreviewDrawer 区别：drawer 是右侧滑入的常驻预览（agent 写文件时自动打开），
 * 这里是点 chip 主动触发的 modal，居中、有 backdrop、ESC 关闭，更短平快。
 */
export function AttachmentPreviewDialog({ attachment, onClose }: Props) {
  const activeProfile = useAppStore((s) => s.activeProfile);

  const { mounted, visible } = useEnterAnimation(attachment, 180);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const absPath = resolveWorkspacePath(activeProfile?.dir ?? null, mounted.path);
  const absTextPath = mounted.textPath ? resolveWorkspacePath(activeProfile?.dir ?? null, mounted.textPath) : null;

  return createPortal(
    // titlebar-no-drag：避免 TitleBar 的 -webkit-app-region: drag 在顶部 44px
    // 吃掉 dialog 内的 backdrop / 关闭按钮 click（参见 preview-drawer.tsx 同名注释）。
    <div className="titlebar-no-drag fixed inset-0 z-[100] flex items-center justify-center px-6 py-8">
      <div
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[3px] transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`预览 ${mounted.name}`}
        className={`relative flex max-h-[85vh] w-full max-w-[900px] flex-col overflow-hidden rounded-xl border-2 border-ink bg-paper shadow-[0_6px_0_0_var(--color-ink)] transition-all duration-200 ease-out ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'
        }`}
      >
        <PreviewHeader name={mounted.name} kind={mounted.kind} onClose={onClose} />
        <div className="flex-1 overflow-y-auto bg-cream/40">
          <PreviewBody attachment={mounted} absPath={absPath} absTextPath={absTextPath} />
        </div>
        <PreviewFooter absPath={absPath} />
      </div>
    </div>,
    document.body,
  );
}

const KIND_LABEL: Record<AttachmentRef['kind'], string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  markdown: 'Markdown',
  text: '纯文本',
  image: '图像',
  audio: '音频',
};

function PreviewHeader({ name, kind, onClose }: { name: string; kind: AttachmentRef['kind']; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-rule bg-cream px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[12px] uppercase tracking-wider text-mute">{KIND_LABEL[kind]}</p>
        <p className="truncate text-[14px] font-bold text-ink" title={name}>
          {name}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        title="关闭"
        aria-label="关闭"
        className="flex shrink-0 items-center justify-center rounded-md px-2 py-1 text-mute hover:bg-fluff hover:text-ink"
      >
        <XIcon size={14} weight="bold" />
      </button>
    </header>
  );
}

function PreviewFooter({ absPath }: { absPath: string }) {
  return (
    <footer className="flex shrink-0 items-center gap-2 border-t border-rule bg-cream px-4 py-2 text-[12px] text-mute">
      <button
        type="button"
        onClick={() => void window.muicv.fs.showInFolder(absPath)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-fluff hover:text-ink"
      >
        <FolderOpenIcon size={12} />
        <span>在文件管理器</span>
      </button>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(absPath)}
        className="rounded px-2 py-1 hover:bg-fluff hover:text-ink"
      >
        复制路径
      </button>
    </footer>
  );
}

function PreviewBody({
  attachment,
  absPath,
  absTextPath,
}: {
  attachment: AttachmentRef;
  absPath: string;
  absTextPath: string | null;
}) {
  if (attachment.kind === 'image') return <ImagePreview absPath={absPath} name={attachment.name} />;
  if (attachment.kind === 'pdf') return <PdfPreview absPath={absPath} name={attachment.name} />;
  if (attachment.kind === 'audio') return <AudioPreview absPath={absPath} name={attachment.name} />;
  // markdown / text 直接读 utf8；docx 读它的 .txt sidecar（main 上传时已经提取）
  const textPath = attachment.kind === 'docx' ? absTextPath : absPath;
  return <TextPreview absPath={textPath} kind={attachment.kind} />;
}

function AudioPreview({ absPath, name }: { absPath: string; name: string }) {
  // 走 muicv-pdf:// 协议让 Chromium 直接 stream，不读 base64 一次性塞 data URL，
  // 大文件（10MB+ wav）友好。
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      {/* biome-ignore lint/a11y/useMediaCaption: 用户自录音频，没有字幕轨道 */}
      <audio key={absPath} controls src={pathToMuicvPdfUrl(absPath)} className="w-full max-w-lg" title={name} />
    </div>
  );
}

function ImagePreview({ absPath, name }: { absPath: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);
    void window.muicv.fs.readAsDataUrl(absPath).then((url) => {
      if (cancelled) return;
      if (!url) setError('读不到这张图，可能已被删 / 路径越界 / 不是支持的图像格式');
      else setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [absPath]);

  if (error) return <ErrorBlock message={error} />;
  if (!src) return <Loading />;
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <img src={src} alt={name} className="max-h-[70vh] max-w-full rounded-lg border border-rule object-contain" />
    </div>
  );
}

function PdfPreview({ absPath, name }: { absPath: string; name: string }) {
  // 复用 PreviewDrawer 同款：muicv-pdf:// 协议在 main 注册，URL 编码逻辑见 ../lib/muicv-pdf-url。
  return (
    <iframe key={absPath} title={name} src={pathToMuicvPdfUrl(absPath)} className="h-[70vh] w-full border-0 bg-white" />
  );
}

function TextPreview({ absPath, kind }: { absPath: string | null; kind: AttachmentRef['kind'] }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMarkdown = kind === 'markdown';

  useEffect(() => {
    if (!absPath) {
      setError('没有可预览的文本（DOCX 还没提取出 sidecar？重新上传一次）');
      return;
    }
    let cancelled = false;
    setContent(null);
    setError(null);
    void window.muicv.fs.read(absPath).then((text) => {
      if (cancelled) return;
      if (text === null) setError('读不到这个文件，可能已被删 / 路径越界');
      else setContent(text);
    });
    return () => {
      cancelled = true;
    };
  }, [absPath]);

  if (error) return <ErrorBlock message={error} />;
  if (content === null) return <Loading />;
  return (
    <div className="px-4 py-4">
      {isMarkdown ? (
        <MarkdownView source={content} />
      ) : (
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-[1.55] text-ink-soft">
          {content}
        </pre>
      )}
    </div>
  );
}

function Loading() {
  return <div className="px-4 py-6 text-[12px] text-mute">读取中…</div>;
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="mx-4 my-4 rounded-lg border-2 border-tongue/60 bg-tongue/10 px-3 py-2 text-[12px] text-tongue">
      {message}
    </div>
  );
}
