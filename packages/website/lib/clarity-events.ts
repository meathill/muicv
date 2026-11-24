/**
 * Clarity 自定义事件的分类规则（纯函数，便于测试）。
 *
 * 点击监听与事件上报在 `components/analytics.tsx`；这里只负责：
 * - 判定当前路径是否为模板详情页（用于 page view 事件）
 * - 根据被点击链接的 href 与所在页面判定点击事件名
 *
 * 事件命名走英文短横线风格，与 Clarity 面板展示一致：
 * template_detail_view / apply_click / download_click / signup_click
 *
 * 为什么用「所在页面」而不是按钮文案判定 apply_click：站点是多语言的，
 * 同一个「套用/导入模板」CTA 在 9 种语言下文案完全不同；且详情页文案是
 * 「在 App 中使用」「一键导入此模板」而非「套用制作」。按页面路径判定稳定得多。
 */

export type ClarityClickEvent = 'apply_click' | 'download_click' | 'signup_click';

/** 模板详情页：/templates/{slug} 与 /{locale}/templates/{slug}（不含列表页） */
export function isTemplateDetailPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?templates\/[^/?#]+$/.test(pathname);
}

/** 模板相关页面：列表页 /templates 或详情页（含语言前缀）——在此页点下载视为「套用模板」意图 */
export function isTemplateSurfacePath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?templates(?:\/|$)/.test(pathname);
}

/**
 * 判定一次点击对应的 Clarity 事件；不关心的点击返回 null。
 *
 * - 指向下载页的链接：所在页面是模板列表/详情页 → apply_click，否则 download_click
 * - 指向注册页的链接：signup_click（/sign-up 与 /{locale}/sign-up 都算）
 */
export function classifyClick(href: string, currentPathname: string): ClarityClickEvent | null {
  if (!href) return null;
  const path = href.split(/[?#]/)[0] ?? '';
  if (/(?:^|\/)download(?:\/|$)/.test(path)) {
    return isTemplateSurfacePath(currentPathname) ? 'apply_click' : 'download_click';
  }
  if (/(?:^|\/)sign-up(?:\/|$)/.test(path)) {
    return 'signup_click';
  }
  return null;
}
