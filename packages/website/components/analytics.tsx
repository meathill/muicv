'use client';

import Script from 'next/script';
import { useReportWebVitals } from 'next/web-vitals';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * 站点分析 + Web Vitals 上报。
 *
 * - 没有 NEXT_PUBLIC_GA_ID 时本组件返回 null，dev / preview 默认安静。
 * - gtag.js 等页面 load 后再加载，不和首页 LCP 抢网络 / 主线程。
 * - useReportWebVitals 把 LCP / CLS / INP / FCP / TTFB / FID 全部按 GA4 推荐方式发到
 *   "web-vitals" 事件，弥补 muicv.com 当前流量太小、CrUX 长期 No Data 的问题。
 */
export function Analytics() {
  useReportWebVitals(reportWebVitalsToGtag);

  if (!GA_ID) return null;

  return (
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
