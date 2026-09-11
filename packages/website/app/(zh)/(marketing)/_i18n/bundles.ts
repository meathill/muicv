import { content as deContent, dict as deDict } from './de';
import { content as esContent, dict as esDict } from './es';
import { content as frContent, dict as frDict } from './fr';
import { content as jaContent, dict as jaDict } from './ja';
import type { LocaleContent } from './locale-content';
import { content as ptContent, dict as ptDict } from './pt';
import { content as thContent, dict as thDict } from './th';
import type { Dictionary } from './types';
import { content as viContent, dict as viDict } from './vi';

/**
 * 新增语言的注册点。每种语言一个 `_i18n/<locale>.tsx`，同时导出 `dict`（营销站词典）
 * 与 `content`（关于/联系/定价/FAQ 文案）。
 *
 * 为什么拆文件：Dictionary 字段全必填、一份约 250 行，9 语言挤在一个 Record 里会到 2000+ 行，
 * 无法维护。拆开后「加一种语言 = 加一个文件 + 在此注册」。
 *
 * zh / en 保留原有结构（zh.tsx / en.tsx + 各页内联 Record），由各消费端与本文件合并；
 * 后续可把 zh/en 也迁到同形状，届时本文件成为唯一注册点。
 */
export type LocaleBundle = { dict: Dictionary; content: LocaleContent };

/** zh / en 之外的已翻译语言。 */
export const EXTRA_LOCALE_BUNDLES = {
  ja: { dict: jaDict, content: jaContent },
  de: { dict: deDict, content: deContent },
  fr: { dict: frDict, content: frContent },
  es: { dict: esDict, content: esContent },
  pt: { dict: ptDict, content: ptContent },
  th: { dict: thDict, content: thContent },
  vi: { dict: viDict, content: viContent },
} satisfies Record<string, LocaleBundle>;

export type ExtraLocale = keyof typeof EXTRA_LOCALE_BUNDLES;

export const EXTRA_LOCALES = Object.keys(EXTRA_LOCALE_BUNDLES) as ExtraLocale[];
