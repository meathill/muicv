'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useReportWebVitals } from 'next/web-vitals';
import { useEffect } from 'react';

import { classifyClick, isTemplateDetailPath } from '@/lib/clarity-events';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !GA_ID) return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) return;
  window.gtag('event', name, params ?? {});
}

/**
 * 上报 Clarity 自定义事件。Clarity 的 API events 会自动出现在面板 Smart events 列表，
 * 不需要先在后台注册；没配置 CLARITY_ID 时静默跳过。
 */
export function trackClarityEvent(name: string): void {
  if (typeof window === 'undefined' || !CLARITY_ID) return;
  window.clarity?.('event', name);
}

/**
 * 关键行为埋点（发给 Clarity）：
 * - template_detail_view：进入 /templates/{slug} 模板详情页
 * - apply_click：点击「套用制作」类按钮（跳转 /download）
 * - download_click：其它下载入口点击
 * - signup_click：点击注册入口
 *
 * 为什么用代码而不是 Clarity 后台的 Button clicks：后台自动检测只收录真实发生过的点击，
 * 站点流量太小时列表为空，无法预先配置。事件名与分类规则见 lib/clarity-events.ts。
 */
function useClarityEvents() {
  const pathname = usePathname();

  useEffect(() => {
    if (!CLARITY_ID || !pathname) return;
    if (isTemplateDetailPath(pathname)) trackClarityEvent('template_detail_view');
  }, [pathname]);

  useEffect(() => {
    if (!CLARITY_ID) return;
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const name = classifyClick(anchor.getAttribute('href') ?? '', anchor.textContent ?? '');
      if (name) trackClarityEvent(name);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

/**
 * 站点分析 + Web Vitals 上报。
 *
 * - 没有 NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_CLARITY_ID 时对应脚本不渲染，dev / preview 默认安静。
 * - gtag.js 等页面 load 后再加载，不和首页 LCP 抢网络 / 主线程；
 *   Clarity 走内联注入 + 异步下载 tag 脚本，afterInteractive 即可。
 * - useReportWebVitals 把 LCP / CLS / INP / FCP / TTFB / FID 全部按 GA4 推荐方式发到
 *   "web-vitals" 事件，弥补 muicv.com 当前流量太小、CrUX 长期 No Data 的问题。
 */
export function Analytics() {
  useReportWebVitals(reportWebVitalsToGtag);
  useClarityEvents();

  if (!GA_ID && !CLARITY_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
          </Script>
        </>
      )}
      {CLARITY_ID && <ClarityScript clarityId={CLARITY_ID} />}
    </>
  );
}

function ClarityScript({ clarityId }: { clarityId: string }) {
  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${clarityId}");`}
    </Script>
  );
}

type WebVitalMetric = {
  name: string;
  value: number;
  id: string;
  delta?: number;
};

function reportWebVitalsToGtag(metric: WebVitalMetric) {
  if (typeof window === 'undefined' || !window.gtag) return;
  // GA4 推荐：CLS 是单位 1 的小数，乘 1000 转成整数。
  const value = metric.name === 'CLS' ? Math.round(metric.value * 1000) : Math.round(metric.value);
  window.gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value,
    non_interaction: true,
  });
}
