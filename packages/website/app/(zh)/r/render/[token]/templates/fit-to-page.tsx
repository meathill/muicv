'use client';

import { useEffect } from 'react';

import { computeFitScale, FIT_HEIGHT_EXP, FIT_MAX_SCALE, FIT_MIN_SCALE, PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/fit';

const VISUAL_TOLERANCE_PX = 24;
const MAX_ITERATIONS = 4;

function clampScale(scale: number): number {
  return Math.min(FIT_MAX_SCALE, Math.max(FIT_MIN_SCALE, scale));
}

/**
 * 模板自动排版（auto-fit）：测量内容自然高度，用 CSS zoom 把简历收进最近的整页。
 *
 * 只对 t1~t6 生效——挂在 TemplatePage 内部，default（markdown）模板没有 data-fit-root。
 * 应用 zoom 的同时把宽 / 高按 1/zoom 补偿，视觉上仍是标准 A4（794×1123 @96dpi）。
 *
 * 结束后设置 `document.documentElement.dataset.fitDone = '1'`，
 * render-pdf.ts（puppeteer）据此等待排版稳定再出 PDF。
 */
export default function FitToPage() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-fit-root]');
    if (!root) return;
    let timer: number | undefined;

    const apply = async () => {
      // 字体就绪后再测量，否则行高不准。
      await document.fonts.ready.catch(() => {});
      if (!root.isConnected) return;
      // 测量自然内容高度：必须 inline 覆盖 min-height 为 0——removeProperty 会让
      // CSS 的 1123px 重新生效，偏少的内容会量出"正好一页"，放大路径永不触发。
      root.style.removeProperty('zoom');
      root.style.removeProperty('width');
      root.style.minHeight = '0';
      const natural = root.scrollHeight;
      let scale = computeFitScale(natural, PAGE_HEIGHT);
      if (scale === 1) {
        root.style.removeProperty('min-height');
        document.documentElement.dataset.fitScale = '1';
        document.documentElement.dataset.fitDone = '1';
        return;
      }

      const targetPages = Math.max(1, Math.round(natural / PAGE_HEIGHT));
      const targetVisual = targetPages * PAGE_HEIGHT;
      const applyZoom = (s: number) => {
        root.style.zoom = String(s);
        root.style.width = `${PAGE_WIDTH / s}px`;
        root.style.minHeight = '0';
      };

      // zoom 高度按 ~s^2.5 复合增长（列宽变窄折行 + 字号变大），初值只是近似，
      // 用实测视觉高度做阻尼不动点迭代收敛到目标页高。
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        applyZoom(scale);
        const visual = root.scrollHeight * scale;
        if (Math.abs(visual - targetVisual) <= VISUAL_TOLERANCE_PX) break;
        const next = clampScale(scale * (targetVisual / visual) ** (1 / FIT_HEIGHT_EXP));
        if (Math.abs(next - scale) < 0.005) break; // 已收敛到边界或极值附近
        scale = next;
      }

      root.style.minHeight = `${PAGE_HEIGHT / scale}px`;
      document.documentElement.dataset.fitScale = scale.toFixed(3);
      document.documentElement.dataset.fitDone = '1';
    };

    const scheduleRefit = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void apply(), 80);
    };

    void apply();
    // 内容变化（预览页切模板 / 切语言 / 传头像）后重排。
    // 注意不能用 ResizeObserver：.page 有 min-height 1123px，内容变短时盒子尺寸不变，
    // RO 不触发；MutationObserver 监听 DOM 内容变化（不监听 style 属性，自身写样式不会触发）。
    const observer = new MutationObserver(scheduleRefit);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
