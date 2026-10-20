import { extractPage } from './extract/page.ts';

/**
 * 点击扩展按钮时经 chrome.scripting 注入当前标签页（activeTab 授权），只在用户点击后运行。
 * 注入后把抽取函数挂到全局，popup 再调用一次拿结果。
 */
(globalThis as { __muicvExtractPage?: () => ReturnType<typeof extractPage> }).__muicvExtractPage = () =>
  extractPage(document, location.href);
