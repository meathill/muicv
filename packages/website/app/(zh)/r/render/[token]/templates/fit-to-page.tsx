'use client';

import { useEffect } from 'react';

import { computeFitScale, PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/fit';

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
      // 重置到 zoom=1、min-height=0，量自然内容高度。
      root.style.removeProperty('zoom');
      root.style.removeProperty('width');
      root.style.removeProperty('min-height');
      const contentHeight = root.scrollHeight;
      const scale = computeFitScale(contentHeight, PAGE_HEIGHT);
      if (scale === 1) {
        document.documentElement.dataset.fitScale = '1';
      } else {
        root.style.zoom = String(scale);
        root.style.width = `${PAGE_WIDTH / scale}px`;
        root.style.minHeight = `${PAGE_HEIGHT / scale}px`;
        document.documentElement.dataset.fitScale = scale.toFixed(3);
      }
      document.documentElement.dataset.fitDone = '1';
    };

    const scheduleRefit = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void apply(), 80);
    };

    void apply();
    // 内容变化（预览页切模板 / 切语言 / 传头像）后重排。自身写样式也会触发一轮，
    // 但稳定状态下尺寸不再变化，观察器随之静默，不会死循环。
    const observer = new ResizeObserver(scheduleRefit);
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
