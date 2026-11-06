/**
 * A4 页面自适应缩放（auto-fit）的纯计算部分。
 *
 * 策略：把内容收进"最近的整页数"——
 *   - 内容略少（如 0.9 页）：放大填满一页，上限 FIT_MAX_SCALE；
 *   - 内容略溢出（如 1.15 页）：压缩收进一页，下限 FIT_MIN_SCALE；
 *   - 差距超出可读范围（明显半页 / 明显多页中段）：返回 1，保持自然分页。
 *
 * 应用侧（fit-to-page.tsx）用 CSS zoom 落地，并把宽 / 高按 1/zoom 补偿，
 * 保证视觉上仍是标准 A4。
 */

/** 可读性下限：再压就看不清了。 */
export const FIT_MIN_SCALE = 0.8;
/** 可读性上限：再放就破坏版式设计。 */
export const FIT_MAX_SCALE = 1.12;

/** 缩放差异小于该值视为不变，避免无意义的 zoom 抖动。 */
export const FIT_EPSILON = 0.01;

/** A4 @96dpi 像素尺寸，与 template-base.module.css 的 --resume-w / --resume-h 保持一致。 */
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

/**
 * 给出内容自然高度（zoom=1、无 min-height 干扰时的 scrollHeight）与页高，返回应施加的 zoom。
 * 返回 1 表示不缩放。
 */
export function computeFitScale(contentHeight: number, pageHeight: number): number {
  if (!(contentHeight > 0) || !(pageHeight > 0)) return 1;
  const pages = contentHeight / pageHeight;
  const target = Math.max(1, Math.round(pages));
  const scale = target / pages;
  if (scale < FIT_MIN_SCALE || scale > FIT_MAX_SCALE) return 1;
  if (Math.abs(scale - 1) <= FIT_EPSILON) return 1;
  return scale;
}
