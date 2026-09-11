import type { Currency } from '@muicv/shared';

/**
 * 写入用户的展示币种偏好（cookie `muicv_currency`，一年有效）。
 *
 * 抽出来是因为有两个触发点：CurrencyToggle 的手动切换，以及定价页「人民币不支持订阅，
 * 改用美元订阅」按钮——后者要在提示的同时把币种切回 USD，否则用户点了按钮还是 ¥ 视图。
 *
 * 失败不抛：cookie 写入失败最多是下次仍是旧币种，刷新即可，不该阻断购买流程。
 */
export async function postCurrencyPreference(currency: Currency): Promise<void> {
  try {
    await fetch('/api/billing/currency', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currency }),
    });
  } catch {
    // 网络失败静默：币种偏好不是关键路径
  }
}
