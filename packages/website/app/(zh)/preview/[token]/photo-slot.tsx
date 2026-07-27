'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ConfirmDialog } from './confirm-dialog';
import { compressImage, MAX_H, MAX_W } from './image-compress';
import styles from './preview.module.css';
import { UploadZone } from './upload-zone';

type PhotoItem = {
  id: number;
  r2Key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: number;
};

type Props = {
  token: string;
  /** 当前 preview 是否已有 photoUrl。决定渲染 "+" 占位还是 hover overlay。 */
  hasPhoto: boolean;
};

/**
 * 模板 slots.photo 注入的可点击控件。
 * - hasPhoto=false → 撑满 photo container 的 "+ 添加照片" 占位
 * - hasPhoto=true → 绝对定位、hover 出现的 "换照片" 蒙层
 * 共用同一 modal：上传新图（前端 canvas 压缩）/ 选历史照片。
 */
export function PhotoSlotButton({ token, hasPhoto }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PhotoItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/photos', { credentials: 'same-origin' });
      if (res.status === 401) {
        setError('需要拥有者登录');
        return;
      }
      if (!res.ok) throw new Error(`列照片失败 (HTTP ${res.status})`);
      const body = (await res.json()) as { items: PhotoItem[] };
      setItems(body.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && confirmDelete == null) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, confirmDelete]);

  const pickExisting = useCallback(
    async (url: string) => {
      if (saving) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/previews/${token}/photo`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ photoUrl: url }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [router, saving, token],
  );

  const deletePhoto = useCallback(
    async (id: number) => {
      if (deletingId != null) return;
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(`/api/photos/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setItems((prev) => prev.filter((it) => it.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingId(null);
        setConfirmDelete(null);
      }
    },
    [deletingId],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (uploading) return;
      setUploading(true);
      setError(null);
      try {
        const blob = await compressImage(file);
        const form = new FormData();
        form.append('file', blob, 'avatar.jpg');
        const upRes = await fetch('/api/photos', {
          method: 'POST',
          body: form,
          credentials: 'same-origin',
        });
        if (!upRes.ok) {
          const body = (await upRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `上传失败 (HTTP ${upRes.status})`);
        }
        const uploaded = (await upRes.json()) as PhotoItem;
        await pickExisting(uploaded.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [pickExisting, uploading],
  );

  const trigger = hasPhoto ? (
    <button type="button" className={styles.photoSlotChange} onClick={() => setOpen(true)} aria-label="换头像">
      换照片
    </button>
  ) : (
    <button type="button" className={styles.photoSlotButton} onClick={() => setOpen(true)} title="点击上传或选择头像">
      <span aria-hidden>＋</span>
      <span className={styles.photoSlotLabel}>添加照片</span>
    </button>
  );

  return (
    <>
      {trigger}
      {open ? (
        <div className={styles.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <strong>选择或上传头像</strong>
              <button type="button" className={styles.modalClose} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <UploadZone
                accept="image/jpeg,image/png,image/webp"
                busy={uploading}
                hint={
                  <>
                    JPEG / PNG / WebP。我会在你浏览器里自动压到最长边 ≤ {MAX_W}×{MAX_H}。
                  </>
                }
                onPick={(f) => void handleUpload(f)}
              />

              {error ? <p className={styles.modalError}>{error}</p> : null}

              <div className={styles.modalSubHead}>历史照片</div>
              {loading ? (
                <p className={styles.modalHint}>加载中…</p>
              ) : items.length === 0 ? (
                <p className={styles.modalHint}>还没上传过，先在上面拖入或点击选一张图。</p>
              ) : (
                <div className={styles.photoGrid}>
                  {items.map((it) => {
                    const isDeleting = deletingId === it.id;
                    return (
                      <div key={it.id} className={styles.photoThumbWrap}>
                        <button
                          type="button"
                          className={styles.photoThumb}
                          onClick={() => void pickExisting(it.url)}
                          disabled={saving || isDeleting}
                          title={it.originalName ?? it.r2Key}
                        >
                          {/* biome-ignore lint/performance/noImgElement: 简单缩略图，next/image 在 cf workers 反而要额外配置 */}
                          <img src={it.url} alt="" width={200} height={266} loading="lazy" decoding="async" />
                        </button>
                        <button
                          type="button"
                          className={styles.photoThumbDelete}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(it);
                          }}
                          disabled={isDeleting || saving}
                          aria-label="删除这张照片"
                          title="删除这张照片"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {confirmDelete ? (
        <ConfirmDialog
          title="删除这张照片？"
          body={<>删除后不可恢复。已经把这张照片用作 photoUrl 的预览/PDF 会显示破损图片。</>}
          confirmLabel="删除"
          danger
          busy={deletingId === confirmDelete.id}
          onConfirm={() => void deletePhoto(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </>
  );
}
