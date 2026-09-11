import { EXTRA_LOCALE_BUNDLES } from './bundles';
import { en } from './en';
import { DEFAULT_LOCALE, type Locale, localizedHref } from './locale';
import type { Dictionary } from './types';
import { zh } from './zh';

/** zh / en 之外语言的词典由 bundles.ts 汇总，避免本文件堆 9 个 import。 */
const EXTRA_DICTS = Object.fromEntries(
  Object.entries(EXTRA_LOCALE_BUNDLES).map(([locale, bundle]) => [locale, bundle.dict]),
) as Record<string, Dictionary>;

const DICTS: Record<Locale, Dictionary> = { zh, en, ...EXTRA_DICTS } as Record<Locale, Dictionary>;

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale];
}

export type { FaqItem, KeyFeature, WorkflowStep } from './types';
export type { Dictionary, Locale };
export { DEFAULT_LOCALE, localizedHref };
