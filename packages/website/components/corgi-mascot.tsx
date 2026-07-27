/** Mui 柯基 mascot —— meathill 的狗，本品牌精神图腾。共用组件。
 *
 * 性能注记：
 * - 源 PNG 320×207，~91 KiB；显示尺寸最大也就 80×52（about 页的 h-20）。
 * - 给浏览器写明 intrinsic 尺寸 + decoding=async，避免布局跳动 / 主线程长解码。
 * - 首屏（Header、Hero）传 priority=true 走 eager + fetchpriority=high；其它默认 lazy。
 */
type Props = {
  className?: string;
  /** 首屏关键位置传 true，确保不延迟首屏渲染。其它位置走 lazy。 */
  priority?: boolean;
};

export function CorgiMascot({ className = 'h-9 w-9', priority = false }: Props) {
  return (
    <span className={`relative inline-flex items-center justify-center overflow-visible ${className}`} aria-hidden>
      {/* biome-ignore lint/performance/noImgElement: 已经手动管理 dimensions/loading；next/image 在 cf workers 上额外配置不值。 */}
      <img
        src="/brand/mui-logo.png"
        alt="MuiCV"
        width={320}
        height={207}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-full w-[155%] max-w-none object-contain"
      />
    </span>
  );
}
