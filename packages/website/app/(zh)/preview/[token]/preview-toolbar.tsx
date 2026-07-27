'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from './preview.module.css';

export type PreviewToolbarProps = {
  token: string;
  shareUrl: string;
  shareMode: 'link' | 'public';
  expiresAt: number;
  /** 当前登录用户是否是 preview 的拥有者。决定能不能改 share-mode / 设默认模板。 */
  isOwner: boolean;
  /** 当前生效的模板 id（来自 D1）。 */
  currentTemplate: string;
  /** 可选模板列表（JSON_TEMPLATE_IDS）。 */
  templateOptions: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.muicv.com';

/**
 * 精确到分钟。预览 TTL 较短，分钟级展示足够直观。
 *
 * 注意：toLocaleString 在 Workers SSR 跟浏览器 client 上输出可能不同（Workers
 * 默认 Intl 数据有限）—— 直接在初次 render 调用会触发 React #418 hydration
 * mismatch。所以 server 出一份稳定的 ISO 字符串（YYYY-MM-DD HH:mm），客户端
 * mount 之后再用 toLocaleString 替换成本地化。
 */
function isoMinute(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
function formatExpiresLocal(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 中文模板标签，跟桌面端 TemplateSelect 保持一致。
 * 改名要同时改桌面端 packages/app/src/renderer/components/preview-drawer.tsx。
 */
const TEMPLATE_META: Record<string, { label: string; tagline: string }> = {
  't1-classic': { label: 't1 经典', tagline: '深海军蓝 · 大公司 / 传统行业' },
  't2-minimal': { label: 't2 极简', tagline: '瑞士留白 · 设计 / 产品' },
  't3-sidebar': { label: 't3 双栏', tagline: '深绿侧栏 · 突出技能矩阵' },
  't4-tech': { label: 't4 技术', tagline: '雾青 · 工程 / 开发岗' },
  't5-timeline': { label: 't5 时间线', tagline: '靛蓝 · 经历较多' },
  't6-academic': { label: 't6 学术', tagline: '墨红 · 学术 / 研究' },
};

export default function PreviewToolbar({
  token,
  shareUrl,
  shareMode: initialShareMode,
  expiresAt,
  isOwner,
  currentTemplate,
  templateOptions,
}: PreviewToolbarProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareMode, setShareMode] = useState(initialShareMode);
  const [shareSaving, setShareSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  // SSR-stable 文案，mount 后才切到本地时间格式，避免 toLocaleString hydration mismatch (#418)
  const [expiresStr, setExpiresStr] = useState(() => isoMinute(expiresAt));
  useEffect(() => {
    setExpiresStr(formatExpiresLocal(expiresAt));
  }, [expiresAt]);
  const inputRef = useRef<HTMLInputElement>(null);
  const shareWrapperRef = useRef<HTMLDivElement>(null);
  const templateWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!shareOpen && !templateOpen) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (shareOpen && shareWrapperRef.current && !shareWrapperRef.current.contains(target)) {
        setShareOpen(false);
      }
      if (templateOpen && templateWrapperRef.current && !templateWrapperRef.current.contains(target)) {
        setTemplateOpen(false);
      }
    }
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [shareOpen, templateOpen]);

  /**
   * 点击就下载——每次都向 owner 扣费（已去掉 isOwner 前置拦截）。
   * 失败一律走 toast，不预先劝退。
   */
  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setToast(null);
    try {
      const res = await fetch(`${API_BASE}/preview/${token}/pdf`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        const reason = body.message ?? body.error ?? `HTTP ${res.status}`;
        throw new Error(reason);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${token.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }, [downloading, token]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      inputRef.current?.select();
    }
  }, [shareUrl]);

  const handleTemplateChange = useCallback(
    async (next: string) => {
      setTemplateOpen(false);
      if (next === currentTemplate || templateSaving) return;
      setTemplateSaving(true);
      try {
        const res = await fetch(`/api/previews/${token}/template`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ template: next }),
        });
        if (res.status === 401) {
          setToast('需要拥有者登录才能切换并保存模板');
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (err) {
        setToast(err instanceof Error ? err.message : String(err));
      } finally {
        setTemplateSaving(false);
      }
    },
    [currentTemplate, router, templateSaving, token],
  );

  const handleShareModeChange = useCallback(
    async (next: 'link' | 'public') => {
      if (next === shareMode || shareSaving) return;
      setShareSaving(true);
      try {
        const res = await fetch(`/api/previews/${token}/share-mode`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ shareMode: next }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setShareMode(next);
        router.refresh();
      } catch (err) {
        setToast(err instanceof Error ? err.message : String(err));
      } finally {
        setShareSaving(false);
      }
    },
    [router, shareMode, shareSaving, token],
  );

  function handleSetAsDefault() {
    const url = `muicv://set-default-template?template=${encodeURIComponent(currentTemplate)}`;
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setToast('已触发；如未唤起桌面 app，请在 app 内对 AI 说"以后默认用此模板"');
  }

  const currentMeta = TEMPLATE_META[currentTemplate] ?? { label: currentTemplate, tagline: '' };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <span className={styles.toolbarBadge}>Resume preview</span>
        <span className={styles.toolbarMeta} suppressHydrationWarning>
          将于 {expiresStr} 过期
        </span>
        <div className={styles.dropdownWrapper} ref={templateWrapperRef}>
          <button
            type="button"
            className={`${styles.button} ${styles.dropdownTrigger}`}
            disabled={templateSaving}
            onClick={() => setTemplateOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={templateOpen}
          >
            <span>模板：{currentMeta.label}</span>
            <span className={styles.caret} aria-hidden>
              ▾
            </span>
          </button>
          {templateOpen ? (
            <div className={styles.dropdownMenu} role="listbox">
              {templateOptions.map((id) => {
                const meta = TEMPLATE_META[id] ?? { label: id, tagline: '' };
                const active = id === currentTemplate;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ''}`}
                    onClick={() => void handleTemplateChange(id)}
                    role="option"
                    aria-selected={active}
                  >
                    <span className={styles.dropdownItemTitle}>{meta.label}</span>
                    {meta.tagline ? <span className={styles.dropdownItemTagline}>{meta.tagline}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        {isOwner ? (
          <button
            type="button"
            className={styles.button}
            onClick={handleSetAsDefault}
            title="把当前模板设为该桌面 app 的默认模板，后续 AI 导出 PDF 不再走预览"
          >
            设为默认
          </button>
        ) : null}
      </div>
      <div className={styles.toolbarRight}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? '生成中…' : '下载 PDF'}
        </button>
        <div className={styles.shareWrapper} ref={shareWrapperRef}>
          <button type="button" className={styles.button} onClick={() => setShareOpen((v) => !v)}>
            分享
          </button>
          {shareOpen ? (
            <div className={styles.shareMenu}>
              <strong>分享链接</strong>
              <div className={styles.shareMenuRow}>
                <input
                  ref={inputRef}
                  className={styles.shareMenuInput}
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button type="button" className={styles.button} onClick={handleCopy}>
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              {isOwner ? (
                <div className={`${styles.shareMenuRow} ${styles.segmented}`}>
                  <span className={styles.segmentedLabel}>访问范围</span>
                  <button
                    type="button"
                    className={`${styles.segmentedButton} ${shareMode === 'link' ? styles.segmentedActive : ''}`}
                    disabled={shareSaving}
                    onClick={() => void handleShareModeChange('link')}
                    aria-pressed={shareMode === 'link'}
                  >
                    仅持链接
                  </button>
                  <button
                    type="button"
                    className={`${styles.segmentedButton} ${shareMode === 'public' ? styles.segmentedActive : ''}`}
                    disabled={shareSaving}
                    onClick={() => void handleShareModeChange('public')}
                    aria-pressed={shareMode === 'public'}
                  >
                    全网公开
                  </button>
                </div>
              ) : null}
              <div className={styles.shareModeNote}>
                {shareMode === 'public'
                  ? '当前：全网公开 · 任何人都能搜到这份简历。'
                  : '当前：仅持链接者可见 · 不会被搜索引擎收录。'}
                {isOwner ? null : ' 仅拥有者可修改。'}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {toast ? (
        <div
          className={styles.shareModeNote}
          style={{
            position: 'absolute',
            right: 16,
            top: 'calc(100% + 8px)',
            maxWidth: 360,
            background: '#fff',
            padding: '8px 12px',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
