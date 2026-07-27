/**
 * 客户端把 File 用 canvas 压到最长边 ≤ MAX_W/H，输出 image/jpeg，质量 0.85。
 * 后端依然校验 ≤ 2MB / mime 白名单。
 *
 * 头像不需要透明，统一吐 JPEG 简化（带 alpha 的 PNG 会得到白底，可接受）。
 */
export const MAX_W = 600;
export const MAX_H = 800;
const QUALITY = 0.85;

export async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('图片解码失败'));
      el.src = url;
    });
    const ratio = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d 不可用');
    // 白底兜 PNG / WebP alpha
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('canvas toBlob 返回 null');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
