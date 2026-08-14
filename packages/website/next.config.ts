import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  transpilePackages: ['@muicv/shared', '@muicv/ui'],
  // 关掉 X-Powered-By 头：不暴露技术栈，省一点字节
  poweredByHeader: false,
  // i.muicv.com 是证件照 R2 CDN；允许 next/image 在需要时优化它
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.muicv.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // 把 barrel re-export 自动拆成 per-symbol import，根治 phosphor 这种 17MB
    // barrel 在客户端 chunk 里裹胁 unused icon 的问题。Next.js 自带白名单里
    // 已经覆盖 lucide-react 等，但 phosphor 要手动加。
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  compiler: {
    // 生产环境去掉 console.*，开发保留；console.error/warn 仍然保留方便排查。
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  /**
   * 全站安全/隐私 headers。
   * OpenNext 会把 next.config 的 headers 透传到 Cloudflare Worker 响应。
   *
   * 设计原则：
   * - 不上 CSP——SSR + GA + 多个第三方资源会非常容易把自己锁出去，按当前
   *   产品形态先不做。等有专门的 CSP 文档再加。
   * - 不上 X-Frame-Options，用 frame-ancestors 才是现代做法；既然没 CSP 就先
   *   都不加，浏览器 referrer-policy + same-origin 已经覆盖大半。
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 浏览器 2 年内强制 HTTPS，子域统一，且申请 Chrome HSTS preload 列表的门槛
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // 禁止浏览器按 sniffed MIME 解释响应——降低 JS/HTML 混淆类攻击
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 同源完整 referrer，跨源只发 origin；登录态 / token 不会泄到第三方分析
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 显式关掉默认不用的浏览器 API；用到时单页面再放
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
          },
          // 关掉旧版 XSS Auditor——现代浏览器都已经移除，留着会引入额外漏洞
          { key: 'X-XSS-Protection', value: '0' },
        ],
      },
      {
        // API 一律 no-store：Next 16 不会自动给 route handler 加 Cache-Control，
        // force-dynamic 只保证 OpenNext 不缓存。显式声明防止浏览器启发式缓存 /
        // 未来加 CDN 缓存规则时误缓存用户数据（登录态 / 订阅 / 支付等）。
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
