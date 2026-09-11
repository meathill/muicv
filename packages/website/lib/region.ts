import type { Currency } from '@muicv/shared';

/**
 * 用户币种偏好。
 *
 * 判定顺序（短路）：
 *   1. cookie `muicv_currency` 显式值（usd | cny），用户手动 toggle 后写入
 *   2. 兜底 usd
 *
 * **默认一律 USD**：不再按 IP 自动切人民币。订阅只卖 USD，人民币只用于一次性补充包；
 * 中国大陆用户需要微信 / 支付宝时应手动切到 ¥ CN（美元通道只有信用卡）。
 * 不按 IP 自动切换，是为了避免「海外华人 / VPN / 出差」被强行推入只有补充包可买的视图，
 * 也让定价页默认展示与主售商品（USD 订阅）一致。
 *
 * cookie 优先级最高，保证临时切换能锁住选择。
 * 该函数 server 端 / API route / Next server component 共用，
 * 入参 shape 兼容标准 `Request` 与 Next `headers()` 返回的对象。
 */
export const CURRENCY_COOKIE = 'muicv_currency';

const COOKIE_RE = /(?:^|;\s*)muicv_currency=(usd|cny)/;

export function getRequestCurrency(request: Request | { headers: Headers }): Currency {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(COOKIE_RE);
  if (match) return match[1] as Currency;
  return 'usd';
}

/**
 * 用户网络是否在中国大陆。只看 Cloudflare 注入的真实地理位置 `cf-ipcountry`，
 * 不读币种 cookie——下载路由要的是网络位置，与账单偏好解耦：海外华人即使把币种切到 ¥，
 * GitHub 直连通常更快，不该被强行代理。
 */
export function isMainlandChina(request: Request | { headers: Headers }): boolean {
  return request.headers.get('cf-ipcountry')?.toUpperCase() === 'CN';
}
