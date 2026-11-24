/**
 * Clarity 自定义事件的分类规则（纯函数，便于测试）。
 *
 * 点击监听与事件上报在 `components/analytics.tsx`；这里只负责：
 * - 判定当前路径是否为模板详情页（用于 page view 事件）
 * - 根据被点击链接的 href / 文案判定点击事件名
 *
 * 事件命名走英文短横线风格，与 Clarity 面板展示一致：
 * template_detail_view / apply_click / download_click / signup_click
 */

export type ClarityClickEvent = 'apply_click' | 'download_click' | 'signup_click';

/** /templates/{slug} 与 /{locale}/templates/{slug}；不含列表页 /templates */
export function isTemplateDetailPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?templates\/[^/?#]+$/.test(pathname);
}

/**
 * 判定一次点击对应的 Clarity 事件；不关心的点击返回 null。
 *
 * - 指向下载页的链接：文案含「套用制作」（模板卡按钮）记为 apply_click，否则 download_click
 * - 指向注册页的链接：signup_click（/sign-up 与 /{locale}/sign-up 都算）
 */
export function classifyClick(href: string, text: string): ClarityClickEvent | null {
  if (!href) return null;
  const path = href.split(/[?#]/)[0] ?? '';
  if (/(?:^|\/)download(?:\/|$)/.test(path)) {
    return text.includes('套用制作') ? 'apply_click' : 'download_click';
  }
  if (/(?:^|\/)sign-up(?:\/|$)/.test(path)) {
    return 'signup_click';
  }
  return null;
}
