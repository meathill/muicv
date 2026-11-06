/**
 * A4 页面自适应缩放（auto-fit）的纯计算部分。
 *
 * 策略：把内容收进"最近的整页数"——
 *   - 内容略少（约 0.76~1 页）：放大填满一页，上限 FIT_MAX_SCALE；
 *   - 内容略溢出（1~1.75 页）：压缩收进一页，下限 FIT_MIN_SCALE；
 *   - 多页同理向最近的整页数对齐；
 *   - 差距超出可读范围（明显半页 / 明显多页中段）：返回 1，保持自然分页。
 *
 * 关键建模：CSS zoom 放大时列宽按 1/s 变窄（折行更多）+ 字号 ×s，
 * 内容视觉高度按 ~s^2.5 复合增长，不是线性。所以初值 / 迭代校正都用
 * target/visual 的 0.4 次幂（≈ 1/2.5）阻尼，浏览器侧再用实测视觉高度迭代收敛
 * （fit-to-page.tsx）。本函数只给初值和窗口判定。
 *
 * 应用侧把宽 / 高按 1/zoom 补偿，保证视觉上仍是标准 A4。
 */

/** 可读性下限：再压就看不清了。 */
export const FIT_MIN_SCALE = 0.8;
/** 可读性上限：再放就破坏版式设计。 */
export const FIT_MAX_SCALE = 1.12;

/** 缩放差异小于该值视为不变（纯噪声护栏）。注意不能设大：1.005 页这种
 *  边缘溢出需要 0.998 的微小 zoom 才能收进整页、消灭孤行页，设 0.01 会把它吃掉。 */
export const FIT_EPSILON = 0.001;

/** zoom 高度复合增长指数：visual ≈ h0 · s^FIT_HEIGHT_EXP，迭代阻尼取其倒数。 */
export const FIT_HEIGHT_EXP = 2.5;

/** A4 @96dpi 像素尺寸，与 template-base.module.css 的 --resume-w / --resume-h 保持一致。 */
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

/**
 * 给出内容自然高度（zoom=1、min-height=0 时的 scrollHeight）与页高，返回初始 zoom。
 * 返回 1 表示不缩放（内容在窗口外或已对齐）。
 */
export function computeFitScale(contentHeight: number, pageHeight: number): number {
  if (!(contentHeight > 0) || !(pageHeight > 0)) return 1;
  const pages = contentHeight / pageHeight;
  const target = Math.max(1, Math.round(pages));
  const scale = (target / pages) ** (1 / FIT_HEIGHT_EXP);
  if (scale < FIT_MIN_SCALE || scale > FIT_MAX_SCALE) return 1;
  if (Math.abs(scale - 1) <= FIT_EPSILON) return 1;
  return scale;
}
