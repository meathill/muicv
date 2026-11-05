import { FolderOpenIcon, ImageSquareIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { pathToMuicvPdfUrl } from '../../lib/muicv-pdf-url';
import { useAppStore } from '../../lib/store';
import { MarkdownView } from '../markdown-view';
import { ChangeTemplateButton } from './change-template-button';
import { ResumeJsonPreviewButton } from './resume-preview-button';
import { TemplateSelect } from './template-select';
import {
  ALLOWED_PHOTO_MIME,
  type JsonTemplateId,
  MAX_PHOTO_BYTES,
  patchPhotoUrlInResumeJson,
  readPhotoUrlFromJson,
  readTemplateFromJson,
} from './tools';

/**
 * 单个工件/文件预览的核心渲染组件。
 *
 * 既可在右栏分栏（SidebarRight）中常驻展示，也可在临时全屏抽屉（PreviewDrawer）中展示。
 */
export function PreviewContent({ path, onEdit }: { path: string; onEdit: (path: string) => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 用户在 footer 切换的预览模板。null = 跟随 JSON 里的 _template 字段 / 兜底 t2-minimal。
  // path 变化时重置，避免上一份 .resume.json 的选择"穿透"到下一份。
  const [overrideTemplate, setOverrideTemplate] = useState<JsonTemplateId | null>(null);
  // EditDrawer 保存的时间戳，用于触发 PreviewContent 重新读取文件
  const editorLastSavedAt = useAppStore((s) => s.editorLastSavedAt);
  const editorOpenPath = useAppStore((s) => s.editorOpenPath);
  // 头像上传：仅 .resume.json 显示。成功后直接 patch 文件，setContent 触发预览刷新。
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fileName = path.split(/[/\\]/).pop() ?? path;
  const isPdf = /\.pdf$/i.test(path);
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp|avif|heic|heif)$/i.test(path);
  const isResumeJson = /\.resume\.json$/i.test(path);
  const isMarkdown = /\.(md|markdown)$/i.test(path);
  const isEditable = isMarkdown || isResumeJson;
  // PDF / 图片走 muicv-pdf:// 让 Chromium 内置 viewer 直接 stream，不能走 fs.read
  // （fs.read 是 utf-8 解码，二进制文件会变乱码）。
  const isBinaryAsset = isPdf || isImage;

  const jsonTemplate = useMemo<JsonTemplateId>(() => {
    if (!isResumeJson) return 't2-minimal';
    return overrideTemplate ?? readTemplateFromJson(content) ?? 't2-minimal';
  }, [isResumeJson, overrideTemplate, content]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: path 变化是"换文件"信号，重置本地编辑态
  useEffect(() => {
    setOverrideTemplate(null);
    setPhotoError(null);
  }, [path]);

  const currentPhotoUrl = useMemo(() => readPhotoUrlFromJson(content), [content]);

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同一文件再选也能触发 change
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const mime = file.type.toLowerCase();
      if (!ALLOWED_PHOTO_MIME.has(mime)) {
        setPhotoError(`只支持 jpeg / png / webp，当前是 ${file.type || '未知'}`);
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`不超过 ${MAX_PHOTO_BYTES / 1024 / 1024} MB（当前 ${(file.size / 1024 / 1024).toFixed(2)} MB）`);
        return;
      }
      if (!content) {
        setPhotoError('简历内容未加载，稍后再试');
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const upload = await window.muicv.preview.uploadPhoto({ name: file.name, mimeType: mime, bytes });
      if (!upload.ok) {
        setPhotoError(upload.message);
        return;
      }
      const patch = await patchPhotoUrlInResumeJson(path, content, upload.url);
      if (!patch.ok) {
        setPhotoError(patch.reason);
        return;
      }
      setContent(patch.newContent);
    } finally {
      setPhotoUploading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: editorLastSavedAt / editorOpenPath 是"外部已保存"信号，触发重新 read
  useEffect(() => {
    // PDF / 图片走 muicv-pdf:// 让 Chromium 内置 viewer 直接渲染，不能走 fs.read
    // （fs.read 是 utf-8 解码，二进制内容会变乱码）。
    if (isBinaryAsset) {
      setContent(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    void window.muicv.fs.read(path).then((text) => {
      if (cancelled) return;
      setLoading(false);
      if (text === null) setError('读不到这个文件，可能已被删 / 路径越界');
      else setContent(text);
    });
    return () => {
      cancelled = true;
    };
    // editorLastSavedAt 变化（且当前文件正在被 EditDrawer 编辑）→ 重新 read 让预览同步。
  }, [path, isBinaryAsset, editorLastSavedAt, editorOpenPath]);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-rule bg-cream px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] uppercase tracking-wider text-mute">预览</p>
          <p className="truncate text-[14px] font-bold text-ink" title={path}>
            {fileName}
          </p>
        </div>
        {isEditable && (
          <button
            type="button"
            onClick={() => onEdit(path)}
            title="编辑（在叠加层打开 CodeMirror）"
            aria-label="编辑文件"
            className="flex shrink-0 items-center gap-1 rounded-md border-2 border-rule-strong bg-paper px-2 py-1 text-[12px] font-bold text-ink hover:bg-fluff"
          >
            <PencilSimpleIcon size={12} weight="bold" />
            编辑
          </button>
        )}
        {isResumeJson && content !== null && (
          <ChangeTemplateButton kind="resume-json" content={content} template={jsonTemplate} />
        )}
        {isPdf && <ChangeTemplateButton kind="pdf" pdfPath={path} />}
      </header>

      <div
        className={`flex-1 ${
          isPdf
            ? 'flex flex-col'
            : isImage
              ? 'flex items-center justify-center overflow-auto p-4'
              : 'overflow-y-auto px-4 py-4'
        }`}
      >
        {loading && !isBinaryAsset && <div className="text-[12px] text-mute">读取中…</div>}
        {error && !isBinaryAsset && (
          <div className="rounded-lg border-2 border-tongue/60 bg-tongue/10 px-3 py-2 text-[12px] text-tongue">
            {error}
          </div>
        )}
        {content !== null && !error && !isBinaryAsset && /\.md$/i.test(path) && <MarkdownView source={content} />}
        {content !== null && !error && !isBinaryAsset && !/\.md$/i.test(path) && (
          <pre className="select-text overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-[1.55] text-ink-soft">
            {content}
          </pre>
        )}
        {isPdf && (
          // muicv-pdf:// 协议在 main 进程注册（src/main/index.ts），URL 编码细节见
          // ../../lib/muicv-pdf-url：跨平台兼容 Windows 盘符。
          <iframe
            key={path}
            title={fileName}
            src={pathToMuicvPdfUrl(path)}
            className="border-0 bg-white"
            style={{ width: '100%', height: '100%', flex: 1 }}
          />
        )}
        {isImage && (
          // 图片走同一个 muicv-pdf:// 协议（main 端协议白名单含 PNG/JPEG/WebP 等）。
          // <img> 而不是 <iframe>：避免 chromium 把图片包一层默认背景 / viewer chrome。
          <img
            key={path}
            src={pathToMuicvPdfUrl(path)}
            alt={fileName}
            className="max-h-full max-w-full select-text rounded-md border border-rule bg-paper object-contain shadow-[0_2px_0_0_var(--color-rule)]"
          />
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-rule bg-cream px-4 py-2 text-[12px] text-mute">
        <button
          type="button"
          onClick={() => void window.muicv.fs.showInFolder(path)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-fluff hover:text-ink"
        >
          <FolderOpenIcon size={12} />
          <span>在文件管理器</span>
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(path)}
          className="rounded px-2 py-1 hover:bg-fluff hover:text-ink"
        >
          复制路径
        </button>
        {isResumeJson && content !== null && (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handlePhotoPick(e)}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              title={
                currentPhotoUrl
                  ? '更换简历头像（覆盖 .resume.json 的 photoUrl）'
                  : '上传简历头像（写回 .resume.json 的 photoUrl）'
              }
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-fluff hover:text-ink disabled:opacity-60"
            >
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt=""
                  className="h-5 w-4 shrink-0 rounded-sm border border-rule object-cover"
                  onError={(e) => {
                    // R2 公开 URL 临时挂掉就降级到 icon，不阻断 UI
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <ImageSquareIcon size={12} />
              )}
              <span>{photoUploading ? '上传中…' : currentPhotoUrl ? '更换头像' : '上传头像'}</span>
            </button>
            {photoError && (
              <span className="max-w-[220px] truncate text-[12px] text-tongue" title={photoError}>
                {photoError}
              </span>
            )}
            <TemplateSelect value={jsonTemplate} onChange={setOverrideTemplate} />
            <ResumeJsonPreviewButton content={content} template={jsonTemplate} />
          </>
        )}
      </footer>
    </>
  );
}
